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
    expect(parsed.rowTables).toHaveLength(catalog.rowTables.length);
    expect(parsed.formats.signedInteger.negativeMark).toBe('△');
  });

  it('様式で絞れる', async () => {
    const api = createFakeApi();
    const table5 = JSON.parse(await tools.describeFields(api, { form: '第5表' }));
    expect(table5.fields).toHaveLength(0);
    expect(table5.rowTables).toHaveLength(1);
    expect(table5.rowTables[0].id).toBe('balanceSheet');

    // 第1表の1 は明細行の表（株主）だけが載っている様式
    const table1_1 = JSON.parse(await tools.describeFields(api, { form: '第1表の1' }));
    expect(table1_1.rowTables[0].id).toBe('shareholders');

    const table4 = JSON.parse(await tools.describeFields(api, { form: '第4表の1' }));
    expect(table4.rowTables).toHaveLength(0);
    expect(table4.fields.length).toBeGreaterThan(0);
  });

  it('無い様式を指定したら、あるものを挙げて弾く', async () => {
    const api = createFakeApi();
    await expect(tools.describeFields(api, { form: '第3表' })).rejects.toThrow(
      '第1表の2 / 第4表の1 / 第5表 / 第1表の1',
    );
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
  it('辞書の欄の現在値と明細行の表を返す', async () => {
    const api = createFakeApi({
      table4: { f28: '1,000', 使わない欄: 'x' },
      table5: { a_1_1: '現金及び預金', a_1_2: '1,000' },
      table1_1: { sh_1_1: '山田太郎', sh_1_4: '6,000' },
    });
    const parsed = JSON.parse(await tools.getCase(api, { caseId: 1 }));

    expect(parsed.caseId).toBe(1);
    expect(parsed.fields.find((f: { code: string }) => f.code === '4-1:G04').value).toBe('1,000');
    // 辞書に無い欄は外へ出さない
    expect(JSON.stringify(parsed.fields)).not.toContain('使わない欄');

    const balanceSheet = parsed.rowTables.find((t: { rowTable: string }) => t.rowTable === 'balanceSheet');
    expect(balanceSheet.sides[0].rows).toHaveLength(1);
    expect(balanceSheet.sides[1].rows).toHaveLength(0);

    const shareholders = parsed.rowTables.find((t: { rowTable: string }) => t.rowTable === 'shareholders');
    expect(shareholders.sides[0].rows[0]).toMatchObject({ row: 1, name: '山田太郎' });
  });

  // 行は入っているのに続紙の枚数が足りない案件は、画面を見ても行が出ないので
  // 気づけない。現在値に枚数も出しておく。
  it('続紙の枚数も返す', async () => {
    const api = createFakeApi({ table5: { _pages: '2', a_20_1: '土地' } });
    const parsed = JSON.parse(await tools.getCase(api, { caseId: 1 }));
    const balanceSheet = parsed.rowTables.find((t: { rowTable: string }) => t.rowTable === 'balanceSheet');
    expect(balanceSheet.pages).toBe('2');

    const shareholders = parsed.rowTables.find((t: { rowTable: string }) => t.rowTable === 'shareholders');
    // 入っていなければ本表のみ（株主の表は 0 が本表のみ）
    expect(shareholders.pages).toBe('0');
  });
});

describe('set_fields', () => {
  it('既定では書き込まず、差分だけ返す', async () => {
    const api = createFakeApi({ table4: { f28: '1,000' } });
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
    });

    expect(api.writes).toHaveLength(0);
    expect(text).toContain('これは試算です');
    expect(text).toContain('1,000 → 2,500');
    expect(text).toContain(AUTOSAVE_WARNING);
  });

  it('commit で書き込む。会社名と事業年度は取得したものを返す', async () => {
    const api = createFakeApi({ table4: { f28: '1,000', other: 'そのまま' } });
    const text = await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '4-1:G04', value: 2500 }],
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

  it('別の様式の欄も同じ道具で書ける', async () => {
    const api = createFakeApi();
    await tools.setFields(api, {
      caseId: 1,
      values: [{ code: '1-2:G09', value: 120000 }],
      commit: true,
    });
    expect(api.writes[0]!.body.data.table1_2?.f22).toBe('120,000');
  });

  it('弾かれたときは書き込まない', async () => {
    const api = createFakeApi();
    await expect(
      tools.setFields(api, { caseId: 1, values: [{ code: '4-1:G99', value: 1 }], commit: true }),
    ).rejects.toThrow(/describe_fields/);
    expect(api.writes).toHaveLength(0);
  });
});

describe('import_rows', () => {
  const rows = [
    { name: '現金及び預金', evaluated: 1000, book: 1000 },
    { name: '土地', evaluated: 8000, book: 5000, note: '土地等' },
  ];

  it('既定では書き込まず、消える行まで見せる', async () => {
    const api = createFakeApi({ table5: { a_1_1: '古い科目' } });
    const text = await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
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
    await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
      sides: [{ side: 'asset', rows }],
      commit: true,
    });

    const data = api.writes[0]!.body.data;
    expect(data.table5?.a_1_1).toBe('現金及び預金');
    expect(data.table5?.a_2_4).toBe('土地等');
    expect(data.table5?.l_1_1).toBe('買掛金');
  });

  it('株主の表も同じ道具で入れられる', async () => {
    const api = createFakeApi();
    const text = await tools.importRows(api, {
      caseId: 1,
      rowTable: 'shareholders',
      sides: [{ side: 'shareholder', rows: [{ name: '山田太郎', shares: 6000, votes: 6000 }] }],
      commit: true,
    });

    expect(text).toContain('第1表の1の明細を入れ替えました');
    expect(text).toContain('㋑ 株式数 6,000');
    expect(api.writes[0]!.body.data.table1_1?.sh_1_4).toBe('6,000');
  });

  // 行だけ増やして枚数を足し忘れると、入れた行が画面にも印刷にも出ない。
  it('続紙が要る行数なら枚数も直して、そう言う', async () => {
    const api = createFakeApi();
    const text = await tools.importRows(api, {
      caseId: 1,
      rowTable: 'balanceSheet',
      sides: [
        { side: 'asset', rows: Array.from({ length: 16 }, (_, i) => ({ name: `科目${i + 1}` })) },
      ],
      commit: true,
    });

    expect(text).toContain('続紙の枚数（_pages）: 1 → 2');
    expect(api.writes[0]!.body.data.table5?._pages).toBe('2');
  });

  it('無い表は、指定できるものを挙げて弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importRows(api, { caseId: 1, rowTable: 'table5', sides: [{ side: 'asset', rows }] }),
    ).rejects.toThrow('指定できるのは balanceSheet（第5表） / shareholders（第1表の1）');
  });

  it('知らない側は、指定できるものを挙げて弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'balanceSheet',
        sides: [{ side: '資産', rows }],
      }),
    ).rejects.toThrow(/asset（資産）/);
  });

  // 第5表の側を株主の表へ渡すと、黙って別の表へ書かれるのがいちばん困る。
  it('その表に無い側は弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'shareholders',
        sides: [{ side: 'asset', rows }],
      }),
    ).rejects.toThrow(/shareholder（株主）/);
    expect(api.writes).toHaveLength(0);
  });

  it('同じ側を2回指定したら弾く', async () => {
    const api = createFakeApi();
    await expect(
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'balanceSheet',
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
      tools.setFields(api, { caseId: 1, values: [{ code: '4-1:G04', value: 1234 }], commit: true }),
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'balanceSheet',
        sides: [{ side: 'asset', rows: [{ name: '土地', evaluated: 8000, book: 5000 }] }],
        commit: true,
      }),
    ]);

    expect(api.writes).toHaveLength(2);
    const last = api.writes[1]!.body.data;
    expect(last.table4?.f28).toBe('1,234');
    expect(last.table5?.a_1_1).toBe('土地');
  });

  // 第5表と第1表の1 は別の表だが、どちらも同じ案件の data をまるごと置き換える。
  it('別の明細の表どうしでも消し合わない', async () => {
    const api = createFakeApi({}, 5);

    await Promise.all([
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'balanceSheet',
        sides: [{ side: 'asset', rows: [{ name: '土地' }] }],
        commit: true,
      }),
      tools.importRows(api, {
        caseId: 1,
        rowTable: 'shareholders',
        sides: [{ side: 'shareholder', rows: [{ name: '山田太郎' }] }],
        commit: true,
      }),
    ]);

    const last = api.writes[1]!.body.data;
    expect(last.table5?.a_1_1).toBe('土地');
    expect(last.table1_1?.sh_1_1).toBe('山田太郎');
  });

  it('別の案件は待たされない', async () => {
    const api = createFakeApi({}, 5);
    const results = await Promise.all([
      tools.setFields(api, { caseId: 1, values: [{ code: '4-1:G04', value: 1 }], commit: true }),
      tools.setFields(api, { caseId: 2, values: [{ code: '4-1:G04', value: 2 }], commit: true }),
    ]);
    expect(results).toHaveLength(2);
    expect(api.writes.map((w) => w.id).sort()).toEqual([1, 2]);
  });
});
