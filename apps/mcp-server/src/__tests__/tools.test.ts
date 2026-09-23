/**
 * 道具ごとの振る舞い。いちばん大事なのは「試算のときは絶対に書かない」こと ──
 * 差分を確かめずに確定できてしまうと、既定を試算にしている意味が無くなる。
 */
import { describe, expect, it } from 'vitest';
import { AUTOSAVE_WARNING } from '../render.js';
import * as tools from '../tools.js';
import { catalog, createFakeApi } from './fixtures.js';

describe('describe_fields', () => {
  it('辞書をそのまま返す', async () => {
    const api = createFakeApi();
    const text = await tools.describeFields(api, {});
    const parsed = JSON.parse(text);
    expect(parsed.fields).toHaveLength(catalog.fields.length);
    expect(parsed.rowTables).toHaveLength(1);
    expect(parsed.formats.signedInteger.negativeMark).toBe('△');
  });

  it('様式で絞れる', async () => {
    const api = createFakeApi();
    const parsed = JSON.parse(await tools.describeFields(api, { form: '第5表' }));
    expect(parsed.fields).toHaveLength(0);
    expect(parsed.rowTables[0].table).toBe('table5');
  });

  it('無い様式を指定したら、あるものを挙げて弾く', async () => {
    const api = createFakeApi();
    await expect(tools.describeFields(api, { form: '第3表' })).rejects.toThrow(/第4表の1 \/ 第5表/);
  });
});

describe('list_cases', () => {
  it('案件を返す', async () => {
    const api = createFakeApi();
    const parsed = JSON.parse(await tools.listCases(api, {}));
    expect(parsed[0]).toMatchObject({ caseId: 1, companyName: 'テスト商事', archived: false });
  });
});

describe('get_case', () => {
  it('辞書の欄の現在値と第5表の明細を返す', async () => {
    const api = createFakeApi({
      table4: { f28: '1,000', 使わない欄: 'x' },
      table5: { a_1_1: '現金及び預金', a_1_2: '1,000' },
    });
    const parsed = JSON.parse(await tools.getCase(api, { caseId: 1 }));

    expect(parsed.caseId).toBe(1);
    expect(parsed.fields.find((f: { code: string }) => f.code === 'G04').value).toBe('1,000');
    // 辞書に無い欄は外へ出さない
    expect(JSON.stringify(parsed.fields)).not.toContain('使わない欄');
    expect(parsed.rowTables[0].sides[0].rows).toHaveLength(1);
    expect(parsed.rowTables[0].sides[1].rows).toHaveLength(0);
  });
});

describe('set_fields', () => {
  it('既定では書き込まず、差分だけ返す', async () => {
    const api = createFakeApi({ table4: { f28: '1,000' } });
    const text = await tools.setFields(api, { caseId: 1, values: [{ code: 'G04', value: 2500 }] });

    expect(api.writes).toHaveLength(0);
    expect(text).toContain('これは試算です');
    expect(text).toContain('1,000 → 2,500');
    expect(text).toContain(AUTOSAVE_WARNING);
  });

  it('commit で書き込む。会社名と事業年度は取得したものを返す', async () => {
    const api = createFakeApi({ table4: { f28: '1,000', other: 'そのまま' } });
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: 'G04', value: 2500 }],
      commit: true,
    });

    expect(api.writes).toHaveLength(1);
    const body = api.writes[0]!.body;
    expect(body.companyName).toBe('テスト商事');
    expect(body.taxPeriod).toBe('令和7年3月31日');
    expect(body.data.table4?.f28).toBe('2,500');
    // PUT は data をまるごと置き換えるので、触っていない欄も載っていないといけない
    expect(body.data.table4?.other).toBe('そのまま');
    expect(text).toContain('書き込みました');
  });

  it('弾かれたときは書き込まない', async () => {
    const api = createFakeApi();
    await expect(
      tools.setFields(api, { caseId: 1, values: [{ code: 'G99', value: 1 }], commit: true }),
    ).rejects.toThrow(/describe_fields/);
    expect(api.writes).toHaveLength(0);
  });
});

describe('import_balance_sheet', () => {
  const rows = [
    { name: '現金及び預金', evaluated: 1000, book: 1000 },
    { name: '土地', evaluated: 8000, book: 5000, note: '土地等' },
  ];

  it('既定では書き込まず、消える行まで見せる', async () => {
    const api = createFakeApi({ table5: { a_1_1: '古い科目' } });
    const text = await tools.importBalanceSheet(api, {
      caseId: 1,
      sides: [{ side: 'asset', rows }],
    });

    expect(api.writes).toHaveLength(0);
    expect(text).toContain('これは試算です');
    expect(text).toContain('取込前（すべて消えます）: 古い科目');
    expect(text).toContain('土地');
    expect(text).toContain(AUTOSAVE_WARNING);
  });

  it('commit で書き込む', async () => {
    const api = createFakeApi({ table5: { a_1_1: '古い科目', l_1_1: '買掛金' } });
    await tools.importBalanceSheet(api, {
      caseId: 1,
      sides: [{ side: 'asset', rows }],
      commit: true,
    });

    const data = api.writes[0]!.body.data;
    expect(data.table5?.a_1_1).toBe('現金及び預金');
    expect(data.table5?.a_2_4).toBe('土地等');
    expect(data.table5?.l_1_1).toBe('買掛金');
  });

  it('知らない側は、指定できるものを挙げて弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importBalanceSheet(api, { caseId: 1, sides: [{ side: '資産', rows }] }),
    ).rejects.toThrow(/asset（資産）/);
  });

  it('同じ側を2回指定したら弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importBalanceSheet(api, {
        caseId: 1,
        sides: [
          { side: 'asset', rows },
          { side: 'asset', rows: [] },
        ],
      }),
    ).rejects.toThrow(/2回指定されています/);
  });
});

// 「書き込みました」と言いながら片方が消えるのが、いちばん気づけない壊れ方。
// MCP クライアントは道具を並行して呼べるので、実際に同時に呼んで確かめる。
describe('同時に書き込んだとき', () => {
  it('後の書き込みが先の結果を消さない', async () => {
    const api = createFakeApi({}, 5);

    await Promise.all([
      tools.setFields(api, { caseId: 1, values: [{ code: 'G04', value: 1234 }], commit: true }),
      tools.importBalanceSheet(api, {
        caseId: 1,
        sides: [{ side: 'asset', rows: [{ name: '土地', evaluated: 8000, book: 5000 }] }],
        commit: true,
      }),
    ]);

    expect(api.writes).toHaveLength(2);
    const last = api.writes[1]!.body.data;
    expect(last.table4?.f28).toBe('1,234');
    expect(last.table5?.a_1_1).toBe('土地');
  });

  it('別の案件は待たされない', async () => {
    const api = createFakeApi({}, 5);
    const results = await Promise.all([
      tools.setFields(api, { caseId: 1, values: [{ code: 'G04', value: 1 }], commit: true }),
      tools.setFields(api, { caseId: 2, values: [{ code: 'G04', value: 2 }], commit: true }),
    ]);
    expect(results).toHaveLength(2);
    expect(api.writes.map((w) => w.id).sort()).toEqual([1, 2]);
  });
});
