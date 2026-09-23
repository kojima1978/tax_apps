/**
 * テスト用の辞書と、株式評価明細書の代わりになる受け口。
 *
 * 辞書は実物（apps/stock-valuation-form/server/fieldCatalog.ts）から必要なぶんだけ
 * 写したもの。実物との突き合わせは向こうのテストが様式の定義に対して行っているので、
 * ここでは「辞書をどう使うか」だけを見る。
 */
import type { CaseSummary, CaseUpdate, SvfApi } from '../api.js';
import type { CaseData, FieldCatalog } from '../catalog.js';

export const catalog: FieldCatalog = {
  version: 1,
  rules: ['金額の単位は千円'],
  formats: {
    integer: { numeric: true, groupSeparator: ',' },
    signedInteger: { numeric: true, groupSeparator: ',', negativeMark: '△' },
    text: { numeric: false },
    enum: { numeric: false },
  },
  fields: [
    {
      code: 'G01',
      form: '第4表の1',
      table: 'table4',
      field: '①',
      label: '① 直前期末の資本金等の額',
      unit: '千円',
      kind: 'integer',
      required: true,
    },
    {
      code: 'G04',
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
      code: 'G10',
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
      form: '第5表',
      table: 'table5',
      mainRows: 15,
      contRows: 23,
      maxPages: 10,
      maxRows: 15 + 23 * 9,
      sides: [
        { key: 'asset', label: '資産', prefix: 'a', noteOptions: ['株式等', '土地等'] },
        { key: 'liability', label: '負債', prefix: 'l', noteOptions: [] },
      ],
      columns: [
        { index: 1, label: '科目', kind: 'text' },
        { index: 2, label: '相続税評価額', kind: 'signedInteger', unit: '千円' },
        { index: 3, label: '帳簿価額', kind: 'signedInteger', unit: '千円' },
        { index: 4, label: '備考', kind: 'enum' },
      ],
    },
  ],
};

export interface FakeApi extends SvfApi {
  /** putCase が呼ばれた回数と中身。試算のときに書かれていないことを確かめるのに使う。 */
  readonly writes: { id: number; body: CaseUpdate }[];
}

/**
 * delayMs を入れると 取得 と 書き戻し の間に隙間ができる。
 * 同時に呼ばれたときの取り合いを実際に起こすために使う。
 */
export function createFakeApi(data: CaseData = {}, delayMs = 0): FakeApi {
  const writes: { id: number; body: CaseUpdate }[] = [];
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
  let current: CaseData = data;

  return {
    writes,
    async getCatalog() {
      return catalog;
    },
    async listCases() {
      return [summary];
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
  };
}
