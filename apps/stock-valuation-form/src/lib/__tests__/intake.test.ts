import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/form';
import { buildFieldCatalog } from '../../../server/fieldCatalog';
import {
  INTAKE_TABLE,
  type IntakeMark,
  confirmIntakeMarks,
  describeIntakeKey,
  dropChangedIntakeMarks,
  encodeIntakeMark,
  hasIntakeMarks,
  intakeKey,
  intakeTooltip,
  lookupIntakeMark,
  parseIntakeMark,
  readIntakeMarks,
  reviewRows,
} from '../intake';

const CATALOG = buildFieldCatalog();

/** 控えつきの案件データを組み立てる */
function withMarks(
  marks: Readonly<Record<string, IntakeMark>>,
  tables: Partial<FormData> = {},
): FormData {
  const bucket: Record<string, string> = {};
  for (const [key, mark] of Object.entries(marks)) bucket[key] = encodeIntakeMark(mark);
  return { ...initialFormData, ...tables, [INTAKE_TABLE]: bucket };
}

describe('控えの読み書き', () => {
  it('辞書が配るバケット名と置き場所が一致する', () => {
    expect(CATALOG.intake.table).toBe(INTAKE_TABLE);
  });

  it('書いた控えをそのまま読み戻せる', () => {
    const mark: IntakeMark = {
      source: '決算書.pdf',
      page: 3,
      note: '別表五(一)より',
      uncertain: true,
      at: '2026-11-07T00:00:00.000Z',
    };
    expect(parseIntakeMark(encodeIntakeMark(mark))).toEqual(mark);
  });

  it('出典（source）が無い控えは受け付けない', () => {
    expect(parseIntakeMark(JSON.stringify({ page: 1 }))).toBeNull();
    expect(parseIntakeMark(JSON.stringify({ source: '  ' }))).toBeNull();
  });

  it('壊れた控えは無かったことにする（画面を落とさない）', () => {
    expect(parseIntakeMark('{壊れている')).toBeNull();
    expect(parseIntakeMark('[1,2]')).toBeNull();
    expect(parseIntakeMark('"文字列"')).toBeNull();
    expect(parseIntakeMark('')).toBeNull();
    expect(parseIntakeMark(undefined)).toBeNull();
  });

  it('余計な鍵・型違いは落として読む', () => {
    const mark = parseIntakeMark(
      JSON.stringify({ source: 'a.pdf', page: '3', uncertain: 'true', あやしい: 1 }),
    );
    expect(mark).toEqual({ source: 'a.pdf' });
  });

  it('読めた控えだけを鍵つきで返す', () => {
    const data: FormData = {
      ...initialFormData,
      [INTAKE_TABLE]: {
        'table4.f28': encodeIntakeMark({ source: 'a.pdf' }),
        'table4.f32': '壊れている',
      },
    };
    expect(Object.keys(readIntakeMarks(data))).toEqual(['table4.f28']);
    expect(hasIntakeMarks(data)).toBe(true);
    expect(hasIntakeMarks(initialFormData)).toBe(false);
  });

  it('鍵は入力欄の name 属性と同じ形', () => {
    expect(intakeKey('table5', 'a_1_2')).toBe('table5.a_1_2');
  });
});

describe('欄に出す印', () => {
  it('その欄の控えを引ける', () => {
    const marks = readIntakeMarks(withMarks({ 'table4.f28': { source: 'a.pdf' } }));
    expect(lookupIntakeMark(marks, 'table4', 'f28')?.source).toBe('a.pdf');
    expect(lookupIntakeMark(marks, 'table4', 'f32')).toBeNull();
    expect(lookupIntakeMark(marks, 'table5', 'f28')).toBeNull();
    expect(lookupIntakeMark(marks, 'table4', undefined)).toBeNull();
  });

  it('確認済みの欄には印を出さない', () => {
    const marks = readIntakeMarks(
      withMarks({ 'table4.f28': { source: 'a.pdf', confirmed: true } }),
    );
    expect(lookupIntakeMark(marks, 'table4', 'f28')).toBeNull();
  });

  it('日付欄は4つの保存キーのどれかに控えがあれば印が出る', () => {
    const marks = readIntakeMarks(withMarks({ 'table1_1.f14_m': { source: 'a.pdf' } }));
    expect(lookupIntakeMark(marks, 'table1_1', 'f14')?.source).toBe('a.pdf');
    // 前置きが同じでも別の欄（f14 と f140）には及ばない
    expect(lookupIntakeMark(marks, 'table1_1', 'f1')).toBeNull();
  });

  it('ツールチップに出典とページと注意書きが出る', () => {
    const tip = intakeTooltip({ source: '申告書.pdf', page: 12, note: '別表四', uncertain: true });
    expect(tip).toContain('自動入力（要確認）: 申告書.pdf 12ページ');
    expect(tip).toContain('別表四');
    expect(tip).toContain('確認済み');
    expect(intakeTooltip({ source: 'a.pdf' })).toContain('自動入力: a.pdf');
  });
});

describe('印が消える条件', () => {
  it('値が変わった欄の控えは落ちる（直した欄も、連動して変わった欄も）', () => {
    const before = withMarks(
      { 'table4.r1gyonum': { source: 'a.pdf' }, 'table4.r1gyo': { source: 'a.pdf' } },
      { table4: { ...initialFormData.table4, r1gyonum: '1', r1gyo: '旧名称' } },
    );
    const after: FormData = {
      ...before,
      table4: { ...before.table4, r1gyonum: '2', r1gyo: '新名称' },
    };
    expect(dropChangedIntakeMarks(before, after)[INTAKE_TABLE]).toBeUndefined();
  });

  it('値が変わっていない欄の控えは残る', () => {
    const before = withMarks(
      { 'table4.f28': { source: 'a.pdf' }, 'table4.f32': { source: 'a.pdf' } },
      { table4: { ...initialFormData.table4, f28: '1,000', f32: '900' } },
    );
    const after: FormData = { ...before, table4: { ...before.table4, f28: '1,100' } };
    expect(Object.keys(dropChangedIntakeMarks(before, after)[INTAKE_TABLE] ?? {})).toEqual([
      'table4.f32',
    ]);
  });

  it('控えが無ければ何もしない', () => {
    const after: FormData = { ...initialFormData, table4: { f28: '1' } };
    expect(dropChangedIntakeMarks(initialFormData, after)).toBe(after);
  });

  it('確認済みにすると印は消えるが出典は残る', () => {
    const data = withMarks({ 'table4.f28': { source: 'a.pdf', page: 2 } });
    const next = confirmIntakeMarks(data, ['table4.f28']);
    const mark = parseIntakeMark((next[INTAKE_TABLE] ?? {})['table4.f28']);
    expect(mark).toEqual({ source: 'a.pdf', page: 2, confirmed: true });
    expect(lookupIntakeMark(readIntakeMarks(next), 'table4', 'f28')).toBeNull();
    // 控えは消えないので「取込のあった案件」であることは残る
    expect(hasIntakeMarks(next)).toBe(true);
  });

  it('知らない鍵・すでに確認済みの鍵では作り直さない', () => {
    const data = withMarks({ 'table4.f28': { source: 'a.pdf', confirmed: true } });
    expect(confirmIntakeMarks(data, ['table4.f28', 'table4.f99'])).toBe(data);
    expect(confirmIntakeMarks(initialFormData, ['table4.f28'])).toBe(initialFormData);
  });
});

describe('控えの鍵を様式の言葉に直す', () => {
  it('辞書に載っている欄は様式名と欄名で出る', () => {
    const field = CATALOG.fields.find((f) => f.table === 'table4' && f.period !== undefined);
    expect(field, '事業年度で分かれる欄が辞書にありません').toBeDefined();
    const described = describeIntakeKey(CATALOG, intakeKey(field!.table, field!.field));
    expect(described.title).toBe(`${field!.form} ${field!.label}（${field!.period}）`);
  });

  it('第4表の欄は第4表の1へ飛ぶ（1つのバケットを2画面で使う）', () => {
    const field = CATALOG.fields.find((f) => f.form === '第4表の1');
    expect(field, '第4表の1 の欄が辞書にありません').toBeDefined();
    expect(describeIntakeKey(CATALOG, intakeKey('table4', field!.field)).tab).toBe('table4_1');
  });

  it('会社名と課税時期の日付は案件の見出しの欄として読める', () => {
    const id = CATALOG.caseIdentity;
    expect(describeIntakeKey(CATALOG, intakeKey(id.table, id.companyName.field))).toEqual({
      title: `${id.form} 会社名`,
      tab: 'table1_1',
    });
    expect(describeIntakeKey(CATALOG, intakeKey(id.table, 'f14_g')).title)
      .toBe(`${id.form} 課税時期の元号`);
    expect(describeIntakeKey(CATALOG, intakeKey(id.table, 'f14_d')).title)
      .toBe(`${id.form} 課税時期の日`);
  });

  it('明細行は「n行目の列名」で読める', () => {
    expect(describeIntakeKey(CATALOG, 'table5.a_12_3')).toEqual({
      title: '第5表 資産12行目の帳簿価額',
      tab: 'table5',
    });
    expect(describeIntakeKey(CATALOG, 'table1_1.sh_2_4').title).toBe('第1表の1 株主2行目の㋑ 株式数');
  });

  it('辞書に無い鍵は鍵のまま出す（読めなくても一覧から落とさない）', () => {
    expect(describeIntakeKey(CATALOG, 'table4.なぞの欄').title).toBe('table4.なぞの欄');
    expect(describeIntakeKey(CATALOG, 'こわれた鍵').title).toBe('こわれた鍵');
  });
});

describe('人が確認・入力する欄の一覧', () => {
  it('辞書が無ければ何も出さない（読み込み中）', () => {
    expect(reviewRows(null, withMarks({ 'table4.f28': { source: 'a.pdf' } }))).toEqual([]);
  });

  it('自信なし → 自動入力 → 未入力の必須欄 → 人が入れる欄 の順に並ぶ', () => {
    const rows = reviewRows(
      CATALOG,
      withMarks({
        'table4.f28': { source: 'a.pdf' },
        'table4.f32': { source: 'a.pdf', uncertain: true },
      }),
    );
    const kinds = [...new Set(rows.map((r) => r.kind))];
    expect(kinds).toEqual(['uncertain', 'auto', 'required', 'manual']);
  });

  it('自動入力の行は出典を detail に出し、確認済みにできる', () => {
    const rows = reviewRows(
      CATALOG,
      withMarks({ 'table4.f28': { source: '決算書.pdf', page: 4, note: '剰余金の配当' } }),
    );
    const row = rows.find((r) => r.id === 'intake:table4.f28');
    expect(row?.kind).toBe('auto');
    expect(row?.name).toBe('table4.f28');
    expect(row?.intakeKey).toBe('table4.f28');
    expect(row?.detail).toBe('決算書.pdf 4ページ / 剰余金の配当');
  });

  it('確認済みの控えは一覧から消える', () => {
    const rows = reviewRows(
      CATALOG,
      withMarks({ 'table4.f28': { source: 'a.pdf', confirmed: true } }),
    );
    expect(rows.some((r) => r.id === 'intake:table4.f28')).toBe(false);
  });

  it('未入力の必須欄が出る。埋めると消える', () => {
    const empty = reviewRows(CATALOG, withMarks({ 'table4.f28': { source: 'a.pdf' } }));
    const required = CATALOG.fields.filter((f) => f.required === true);
    expect(required.length).toBeGreaterThan(0);
    // f28 は自動入力として並ぶので必須欄としては重ねない
    expect(empty.filter((r) => r.kind === 'required')).toHaveLength(required.length - 1);

    const filled = withMarks(
      { 'table4.f28': { source: 'a.pdf' } },
      Object.fromEntries(
        [...new Set(required.map((f) => f.table))].map((table) => [
          table,
          Object.fromEntries(
            required.filter((f) => f.table === table).map((f) => [f.field, '1']),
          ),
        ]),
      ) as Partial<FormData>,
    );
    expect(reviewRows(CATALOG, filled).filter((r) => r.kind === 'required')).toHaveLength(0);
  });

  it('必須欄の行は辞書の手がかりを detail に出す', () => {
    const field = CATALOG.fields.find((f) => f.required === true && f.hint !== undefined);
    expect(field, '手がかりつきの必須欄が辞書にありません').toBeDefined();
    const row = reviewRows(CATALOG, withMarks({ 'table4.f28': { source: 'a.pdf' } }))
      .find((r) => r.id === `required:${intakeKey(field!.table, field!.field)}`);
    expect(row?.detail).toBe(field!.hint);
  });

  it('人が入れる欄は、埋まっていれば消える（欄を持たない項目は残る）', () => {
    const marks = { 'table4.f28': { source: 'a.pdf' } };
    const before = reviewRows(CATALOG, withMarks(marks)).filter((r) => r.kind === 'manual');
    expect(before.map((r) => r.id)).toContain('manual:employees');
    // 欄が無い項目（続柄・役職の判定）は確かめようがないので毎回出す
    expect(before.map((r) => r.id)).toContain('manual:shareholderRelation');

    const after = reviewRows(
      CATALOG,
      withMarks(marks, {
        table1_2: { ...initialFormData.table1_2, emp_regular: '20', emp_hours: '18,000' },
      }),
    ).filter((r) => r.kind === 'manual');
    expect(after.map((r) => r.id)).not.toContain('manual:employees');
    expect(after.map((r) => r.id)).toContain('manual:shareholderRelation');
  });

  it('第5表の相続税評価額は「科目が入っていて評価額が空の行」を数える', () => {
    const rows = reviewRows(
      CATALOG,
      withMarks({ 'table5.a_1_3': { source: 'a.pdf' } }, {
        table5: {
          ...initialFormData.table5,
          a_1_1: '現金預金', a_1_2: '1,000', a_1_3: '1,000',
          a_2_1: '土地', a_2_3: '5,000',
          l_1_1: '買掛金', l_1_3: '300',
          // 科目が空の行は数えない
          a_3_3: '999',
        },
      }),
    );
    const row = rows.find((r) => r.id === 'manual:inheritanceValue');
    expect(row?.detail.startsWith('2行が未入力 / ')).toBe(true);
    expect(row?.tab).toBe('table5');
    // 行を1つに絞れないので欄へは飛ばさず表だけ開く
    expect(row?.name).toBeNull();
  });

  it('業種目番号は第4表の2 へ飛ぶ', () => {
    const row = reviewRows(CATALOG, withMarks({ 'table4.f28': { source: 'a.pdf' } }))
      .find((r) => r.id === 'manual:industryCode');
    expect(row?.tab).toBe('table4_2');
    expect(row?.name).toBe('table4.r1gyonum');
  });
});
