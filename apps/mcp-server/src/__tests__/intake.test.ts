/**
 * 取込の控え（どの欄を外から入れたか）。
 *
 * ここで見たいのは2つ。**画面が読める形で残ること**（鍵の形・JSON の中身）と、
 * **嘘が残らないこと**（空にした欄・出典なしで上書きした欄・入れ替えで消えた行の
 * 控えが落ちること）。控えが実物と食い違うと、画面が「この数字は決算書から入った」と
 * 言い続けることになる。
 */
import { describe, expect, it } from 'vitest';
import type { CaseData, FieldCatalog } from '../catalog.js';
import type { IntakeSourceInput } from '../intake.js';
import {
  applyIntake,
  buildIntakeRecord,
  describeIntakeRecord,
  intakeOf,
  readIntake,
} from '../intake.js';
import * as tools from '../tools.js';
import { catalog, createFakeApi } from './fixtures.js';

const BUCKET = catalog.intake!.table;
const now = new Date('2026-11-07T12:00:00.000Z');

function marks(data: CaseData): Record<string, string> {
  return data[BUCKET] ?? {};
}

describe('出典の読み取り', () => {
  it('省略したら控えを付けない（人の指示で直すだけのとき）', () => {
    expect(buildIntakeRecord(undefined)).toBeNull();
  });

  it('ファイル名だけで足りる。時刻はこちらで付ける', () => {
    expect(buildIntakeRecord({ source: '決算書.pdf' }, now)).toEqual({
      source: '決算書.pdf',
      at: '2026-11-07T12:00:00.000Z',
    });
  });

  it('ページ・メモ・自信なしを受ける', () => {
    expect(
      buildIntakeRecord(
        { source: '法人税申告書.pdf', page: 4, note: '別表四の所得金額', uncertain: true },
        now,
      ),
    ).toMatchObject({
      source: '法人税申告書.pdf',
      page: 4,
      note: '別表四の所得金額',
      uncertain: true,
    });
  });

  it('ページを文字列で渡しても数字に直す', () => {
    expect(buildIntakeRecord({ source: 'a.pdf', page: ' 12 ' }, now)?.page).toBe(12);
  });

  it('自信ありは印を持たせない（控えを小さく保つ）', () => {
    const record = buildIntakeRecord({ source: 'a.pdf', uncertain: false }, now);
    expect(record).not.toHaveProperty('uncertain');
  });

  it('ファイル名が空なら弾く', () => {
    expect(() => buildIntakeRecord({ source: '   ' })).toThrow(/ファイル名/);
    expect(() => buildIntakeRecord({ page: 1 })).toThrow(/source/);
  });

  it('改行を含む値は弾く（控えは1行で読む）', () => {
    expect(() => buildIntakeRecord({ source: '決算\n書.pdf' })).toThrow(/改行/);
    expect(() => buildIntakeRecord({ source: 'a.pdf', note: '1行目\n2行目' })).toThrow(/改行/);
  });

  it('ページは1以上の整数だけ', () => {
    expect(() => buildIntakeRecord({ source: 'a.pdf', page: 0 })).toThrow(/1以上の整数/);
    expect(() => buildIntakeRecord({ source: 'a.pdf', page: 1.5 })).toThrow(/1以上の整数/);
    expect(() => buildIntakeRecord({ source: 'a.pdf', page: '4ページ' })).toThrow(/1以上の整数/);
  });

  it('確認済みの印は外から渡せない（人が画面で立てるもの）', () => {
    expect(() => buildIntakeRecord({ source: 'a.pdf', confirmed: true } as IntakeSourceInput)).toThrow(/confirmed/);
  });

  it('知らない項目は、指定できるものを挙げて弾く', () => {
    expect(() => buildIntakeRecord({ source: 'a.pdf', pages: 3 } as IntakeSourceInput)).toThrow(
      /source \/ page \/ note \/ uncertain/,
    );
  });

  it('長すぎるファイル名・メモは弾く', () => {
    expect(() => buildIntakeRecord({ source: 'あ'.repeat(121) })).toThrow(/120文字/);
    expect(() => buildIntakeRecord({ source: 'a.pdf', note: 'あ'.repeat(201) })).toThrow(/200文字/);
  });
});

describe('控えの置き場所', () => {
  it('辞書に無ければ書きに行かない', () => {
    const old: FieldCatalog = { ...catalog, intake: undefined };
    expect(() => intakeOf(old)).toThrow(/manage.sh build stock-valuation-form/);
  });

  it('辞書の言うバケットへ、画面が読める形で入れる', () => {
    const record = buildIntakeRecord({ source: '決算書.pdf', page: 4 }, now)!;
    const { data, added } = applyIntake(catalog, {}, [{ key: 'table4.f28', filled: true }], record);

    expect(added).toEqual(['table4.f28']);
    expect(Object.keys(data)).toEqual([BUCKET]);
    expect(JSON.parse(marks(data)['table4.f28']!)).toEqual({
      source: '決算書.pdf',
      page: 4,
      at: '2026-11-07T12:00:00.000Z',
    });
  });

  it('元のデータは変えない', () => {
    const before: CaseData = { table4: { f28: '1,000' } };
    const record = buildIntakeRecord({ source: 'a.pdf' }, now)!;
    const { data } = applyIntake(catalog, before, [{ key: 'table4.f28', filled: true }], record);

    expect(before[BUCKET]).toBeUndefined();
    expect(data.table4).toEqual({ f28: '1,000' });
  });

  it('空にした欄の控えは落とす', () => {
    const start: CaseData = { [BUCKET]: { 'table4.f28': '{"source":"決算書.pdf"}' } };
    const record = buildIntakeRecord({ source: '決算書.pdf' }, now)!;
    const { data, added, removed } = applyIntake(
      catalog,
      start,
      [{ key: 'table4.f28', filled: false }],
      record,
    );

    expect(added).toEqual([]);
    expect(removed).toEqual(['table4.f28']);
    expect(data[BUCKET]).toBeUndefined();
  });

  it('出典なしで上書きしたら前の控えを落とす（古い出典が嘘になる）', () => {
    const start: CaseData = {
      [BUCKET]: { 'table4.f28': '{"source":"決算書.pdf"}', 'table4.①': '{"source":"決算書.pdf"}' },
    };
    const { data, removed } = applyIntake(
      catalog,
      start,
      [{ key: 'table4.f28', filled: true }],
      null,
    );

    expect(removed).toEqual(['table4.f28']);
    expect(Object.keys(marks(data))).toEqual(['table4.①']);
  });

  it('控えが1件も無くなったらバケットごと消す（空の置き場所を残さない）', () => {
    const start: CaseData = { table4: { f28: '' }, [BUCKET]: { 'table4.f28': '{"source":"a"}' } };
    const { data } = applyIntake(catalog, start, [{ key: 'table4.f28', filled: false }], null);
    expect(BUCKET in data).toBe(false);
    expect(data.table4).toEqual({ f28: '' });
  });

  it('読み出しは壊れた控えを飛ばす', () => {
    const start: CaseData = {
      [BUCKET]: { ok: '{"source":"a.pdf"}', broken: '{壊れた', array: '[1,2]' },
    };
    expect(readIntake(catalog, start)).toEqual({ ok: { source: 'a.pdf' } });
  });
});

describe('文面に出す出典', () => {
  it('ファイル名・ページ・メモ・自信なしを1行にする', () => {
    expect(describeIntakeRecord(buildIntakeRecord({ source: 'a.pdf' }, now)!)).toBe('a.pdf');
    expect(
      describeIntakeRecord(
        buildIntakeRecord({ source: '決算書.pdf', page: 4, note: '剰余金の配当' }, now)!,
      ),
    ).toBe('決算書.pdf 4ページ / 剰余金の配当');
    expect(
      describeIntakeRecord(buildIntakeRecord({ source: 'a.pdf', uncertain: true }, now)!),
    ).toBe('a.pdf / 自信なし');
  });
});

describe('道具から書いたとき', () => {
  const source = { source: '決算書.pdf', page: 4 };

  it('set_fields: commit で欄と控えが一緒に入る', async () => {
    const api = createFakeApi({ table4: { f28: '1,000' } });
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
      source,
      commit: true,
    });

    const data = api.writes[0]!.body.data;
    expect(data.table4?.f28).toBe('2,500');
    expect(JSON.parse(marks(data)['table4.f28']!)).toMatchObject({
      source: '決算書.pdf',
      page: 4,
    });
    expect(text).toContain('出典: 決算書.pdf 4ページ');
  });

  it('set_fields: 試算では控えも書かない', async () => {
    const api = createFakeApi();
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
      source,
    });
    expect(api.writes).toHaveLength(0);
    expect(text).toContain('出典: 決算書.pdf 4ページ');
  });

  it('set_fields: 出典を付け忘れたら、そう言う', async () => {
    const api = createFakeApi();
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
      commit: true,
    });
    expect(text).toContain('「取込の確認」に出ません');
    expect(api.writes[0]!.body.data[BUCKET]).toBeUndefined();
  });

  it('set_fields: 自信なしは文面でも知らせる', async () => {
    const api = createFakeApi();
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
      source: { source: '株主資本等変動計算書.pdf', uncertain: true },
      commit: true,
    });
    expect(text).toContain('自信なし');
    expect(JSON.parse(marks(api.writes[0]!.body.data)['table4.f28']!).uncertain).toBe(true);
  });

  it('set_fields: 欄を空にすると控えも落ちる', async () => {
    const api = createFakeApi({
      table4: { f28: '1,000' },
      [BUCKET]: { 'table4.f28': '{"source":"決算書.pdf"}' },
    });
    await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: '' }],
      source,
      commit: true,
    });
    expect(api.writes[0]!.body.data[BUCKET]).toBeUndefined();
  });

  it('import_rows: 控えは行の先頭列に1つだけ付く', async () => {
    const api = createFakeApi();
    await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
      sides: [
        {
          side: 'asset',
          rows: [
            { name: '現金及び預金', book: 1000 },
            { name: '土地', book: 5000 },
          ],
        },
      ],
      source,
      commit: true,
    });

    expect(Object.keys(marks(api.writes[0]!.body.data)).sort()).toEqual([
      'table5.a_1_1',
      'table5.a_2_1',
    ]);
  });

  it('import_rows: 入れ替えで消えた行の控えは落ちる', async () => {
    const api = createFakeApi({
      table5: { a_1_1: '現金', a_2_1: '売掛金', a_3_1: '土地' },
      [BUCKET]: {
        'table5.a_1_1': '{"source":"前回.pdf"}',
        'table5.a_2_1': '{"source":"前回.pdf"}',
        'table5.a_3_1': '{"source":"前回.pdf"}',
        'table1_1.f12': '{"source":"謄本.pdf"}',
      },
    });
    await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
      sides: [{ side: 'asset', rows: [{ name: '現金及び預金' }] }],
      source,
      commit: true,
    });

    const data = api.writes[0]!.body.data;
    // 3行 → 1行。2・3行目の控えは消え、別の表の控えには触らない
    expect(Object.keys(marks(data)).sort()).toEqual(['table1_1.f12', 'table5.a_1_1']);
    expect(JSON.parse(marks(data)['table5.a_1_1']!).source).toBe('決算書.pdf');
  });

  it('import_rows: 出典なしの入れ替えは、消えた行も残る行も控えを落とす', async () => {
    const api = createFakeApi({
      table5: { a_1_1: '現金', a_2_1: '売掛金' },
      [BUCKET]: {
        'table5.a_1_1': '{"source":"前回.pdf"}',
        'table5.a_2_1': '{"source":"前回.pdf"}',
      },
    });
    await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
      sides: [{ side: 'asset', rows: [{ name: '現金及び預金' }] }],
      commit: true,
    });
    expect(api.writes[0]!.body.data[BUCKET]).toBeUndefined();
  });

  it('create_case: 作った見出しの欄にも控えが付く', async () => {
    const api = createFakeApi();
    const text = await tools.createCase(api, {
      companyName: '控え商事株式会社',
      taxPeriod: '令和8年3月15日',
      source: { source: '相続開始の通知.pdf', page: 1 },
      commit: true,
    });

    const data = api.creates[0]!.data;
    const keys = Object.keys(marks(data));
    expect(keys).toContain('table1_1.f12');
    expect(keys).toContain('table1_1.f14_y');
    // 入らなかった欄（事業年度は未指定）に控えは付かない
    expect(keys.some((k) => k.startsWith('table1_1.f15'))).toBe(false);
    expect(text).toContain('出典: 相続開始の通知.pdf 1ページ');
  });

  it('get_case: 控えと「人が入れるもの」を返す', async () => {
    const api = createFakeApi({
      table4: { f28: '1,000' },
      [BUCKET]: { 'table4.f28': '{"source":"決算書.pdf","page":4}' },
    });
    const parsed = JSON.parse(await tools.getCase(api, { caseId: 1 }));

    expect(parsed.intake['table4.f28']).toEqual({ source: '決算書.pdf', page: 4 });
    expect(parsed.manualItems.map((m: { key: string }) => m.key)).toEqual([
      'employees',
      'inheritanceValue',
    ]);
  });

  it('控えのバケットは辞書に載っている欄として扱わない', async () => {
    const api = createFakeApi({ [BUCKET]: { 'table4.f28': '{"source":"a.pdf"}' } });
    const parsed = JSON.parse(await tools.getCase(api, { caseId: 1 }));
    expect(parsed.fields.every((f: { value: string }) => f.value === '')).toBe(true);
  });
});
