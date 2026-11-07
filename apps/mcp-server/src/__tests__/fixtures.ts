/**
 * テスト用の辞書と、株式評価明細書の代わりになる受け口。
 *
 * 辞書は実物（apps/stock-valuation-form/server/fieldCatalog.ts）から必要なぶんだけ
 * 写したもの。実物との突き合わせは向こうのテストが様式の定義に対して行っているので、
 * ここでは「辞書をどう使うか」だけを見る。
 *
 * 欄は4つの様式から少しずつ取ってある。`1-2:G09` と `4-1:G09` を両方入れているのは、
 * 識別記号が様式ごとに振り直されていること（略号なしでは欄が決まらないこと）を
 * 実物と同じ形で再現するため。
 */
import type { CaseSummary, CaseUpdate, SvfApi } from '../api.js';
import type { CaseData, FieldCatalog } from '../catalog.js';

export const catalog: FieldCatalog = {
  version: 3,
  rules: ['金額の単位は千円'],
  formats: {
    integer: { numeric: true, groupSeparator: ',' },
    text: { numeric: false },
    enum: { numeric: false },
    signedInteger: { numeric: true, groupSeparator: ',', negativeMark: '△' },
  },
  fields: [
    {
      code: '1-2:G09',
      symbol: 'G09',
      form: '第1表の2',
      table: 'table1_2',
      field: 'f22',
      label: '直前期末の総資産価額（帳簿価額）',
      unit: '千円',
      kind: 'integer',
      required: true,
    },
    {
      code: '4-1:G01',
      symbol: 'G01',
      form: '第4表の1',
      table: 'table4',
      field: '①',
      label: '① 直前期末の資本金等の額',
      unit: '千円',
      kind: 'integer',
      required: true,
    },
    {
      code: '4-1:G04',
      symbol: 'G04',
      form: '第4表の1',
      table: 'table4',
      field: 'f28',
      label: '⑥ 年配当金額',
      period: '直前期',
      unit: '千円',
      kind: 'integer',
      required: true,
    },
    {
      code: '4-1:G09',
      symbol: 'G09',
      form: '第4表の1',
      table: 'table4',
      field: 'f37',
      label: '⑦ 左のうち非経常的な配当金額',
      period: '直前々期の前期',
      unit: '千円',
      kind: 'integer',
    },
    {
      code: '4-1:G10',
      symbol: 'G10',
      form: '第4表の1',
      table: 'table4',
      field: 'e18',
      label: '⑪ 法人税の課税所得金額',
      period: '直前期',
      unit: '千円',
      kind: 'signedInteger',
      required: true,
    },
  ],
  rowTables: [
    {
      id: 'balanceSheet',
      form: '第5表',
      table: 'table5',
      mainRows: 15,
      contRows: 23,
      maxRows: 15 + 23 * 9,
      pages: { field: '_pages', base: 1, max: 10 },
      sides: [
        { key: 'asset', label: '資産', prefix: 'a', options: { note: ['株式等', '土地等'] } },
        { key: 'liability', label: '負債', prefix: 'l' },
      ],
      columns: [
        { name: 'name', key: '1', label: '科目', kind: 'text', required: true },
        { name: 'evaluated', key: '2', label: '相続税評価額', kind: 'signedInteger', unit: '千円' },
        { name: 'book', key: '3', label: '帳簿価額', kind: 'signedInteger', unit: '千円' },
        { name: 'note', key: '4', label: '備考', kind: 'enum' },
      ],
    },
    {
      id: 'shareholders',
      form: '第1表の1',
      table: 'table1_1',
      mainRows: 5,
      contRows: 13,
      maxRows: 5 + 13 * 10,
      pages: { field: '_shpages', base: 0, max: 10 },
      sides: [{ key: 'shareholder', label: '株主', prefix: 'sh' }],
      columns: [
        { name: 'name', key: '1', label: '氏名又は名称', kind: 'text', required: true },
        { name: 'shares', key: '4', label: '㋑ 株式数', kind: 'integer', unit: '株' },
        { name: 'undivided', key: '7', label: '㋺ 未分割の株式の株式数', kind: 'integer', unit: '株' },
        { name: 'votes', key: '5', label: '㋩ 議決権数', kind: 'integer', unit: '個' },
      ],
    },
  ],
  caseIdentity: {
    form: '第1表の1',
    table: 'table1_1',
    companyName: { symbol: 'E01', field: 'f12' },
    dates: [
      { key: 'taxPeriod', label: '課税時期', symbol: 'N01', prefix: 'f14', required: true },
      { key: 'fiscalYearFrom', label: '直前期（自）', symbol: 'N02', prefix: 'f15_from', required: false },
      { key: 'fiscalYearTo', label: '直前期（至）', symbol: 'N03', prefix: 'f15_to', required: false },
    ],
    parts: [
      { part: 'era', keySuffix: '_g', labelSuffix: '' },
      { part: 'year', keySuffix: '_y', labelSuffix: '年' },
      { part: 'month', keySuffix: '_m', labelSuffix: '月' },
      { part: 'day', keySuffix: '_d', labelSuffix: '日' },
    ],
    eras: [
      { name: '令和', base: 2018, lastYear: 64, start: '2019-05-01' },
      { name: '平成', base: 1988, lastYear: 31, start: '1989-01-08', end: '2019-04-30' },
    ],
    defaultEra: '令和',
  },
};

export interface FakeApi extends SvfApi {
  /** putCase が呼ばれた回数と中身。試算のときに書かれていないことを確かめるのに使う。 */
  readonly writes: { id: number; body: CaseUpdate }[];
  /** postCase が呼ばれた回数と中身（同じく、試算では作られていないことを見る）。 */
  readonly creates: CaseUpdate[];
  /** 一覧が返す案件。既にある案件・ゴミ箱の案件を置きたいテストから書き換える。 */
  readonly cases: CaseSummary[];
}

/**
 * delayMs を入れると 取得 と 書き戻し の間に隙間ができる。
 * 同時に呼ばれたときの取り合いを実際に起こすために使う。
 */
export function createFakeApi(data: CaseData = {}, delayMs = 0): FakeApi {
  const writes: { id: number; body: CaseUpdate }[] = [];
  const creates: CaseUpdate[] = [];
  const wait = () =>
    delayMs === 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, delayMs));
  const summary: CaseSummary = {
    id: 1,
    companyName: 'テスト商事',
    taxPeriod: '令和7年3月31日',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
  const cases: CaseSummary[] = [summary];
  let nextId = 2;
  let current: CaseData = data;

  return {
    writes,
    creates,
    cases,
    async getCatalog() {
      return catalog;
    },
    async listCases(includeArchived = false) {
      return includeArchived ? cases : cases.filter((c) => c.archivedAt === null);
    },
    async getCase() {
      await wait();
      return { ...summary, data: current };
    },
    async putCase(id, body) {
      await wait();
      writes.push({ id, body });
      current = body.data;
      return summary;
    },
    async postCase(body) {
      await wait();
      creates.push(body);
      const created: CaseSummary = {
        id: nextId++,
        companyName: body.companyName,
        taxPeriod: body.taxPeriod,
        archivedAt: null,
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
      };
      cases.push(created);
      return created;
    },
  };
}

/** 一覧に置く案件（既にある案件・ゴミ箱の案件を作るため）。 */
export function caseRow(
  id: number,
  companyName: string,
  taxPeriod: string,
  archivedAt: string | null = null,
): CaseSummary {
  return {
    id,
    companyName,
    taxPeriod,
    archivedAt,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  };
}
