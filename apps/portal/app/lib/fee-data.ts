type Item = { type: 'item'; label: string; fee: string };
type Sub = { type: 'sub'; label: string; fee: string };
type Desc = { type: 'desc'; text: string };
type Note = { type: 'note'; text: string };

export type FeeRow = Item | Sub | Desc | Note;

export type FeeSection = {
  title: string;
  subtitle?: string;
  rows: FeeRow[];
};

export const FEE_SECTIONS: FeeSection[] = [
  {
    title: '税務・会計業務',
    subtitle: '顧問料',
    rows: [
      { type: 'item', label: '年商１億未満', fee: '35,000円' },
      { type: 'item', label: '年商３億未満', fee: '45,000円' },
      { type: 'item', label: '年商５億未満', fee: '55,000円' },
      { type: 'item', label: '年商１０億未満', fee: '70,000円' },
      { type: 'item', label: '年商１０億以上', fee: '100,000円～' },
      { type: 'note', text: '但し、事業所1か所増加する毎に月額20,000円' },
    ],
  },
  {
    title: '記帳代行業務',
    rows: [
      { type: 'desc', text: '事務処理量に応じて見積' },
    ],
  },
  {
    title: '決算申告業務',
    rows: [
      { type: 'desc', text: '（月額顧問料＋記帳代行料）×５ヶ月' },
    ],
  },
  {
    title: '消費税申告業務',
    rows: [
      { type: 'item', label: '簡易課税', fee: '30,000円' },
      { type: 'item', label: '本則課税９５％以上', fee: '50,000円' },
      { type: 'item', label: '本則課税９５％未満', fee: '70,000円' },
      { type: 'note', text: '軽減税率適用時は上記報酬に30,000円加算' },
    ],
  },
  {
    title: '還付申告業務',
    rows: [
      { type: 'desc', text: '50,000円＋還付額の５％（上限２０万円）' },
    ],
  },
  {
    title: '年一',
    rows: [
      { type: 'desc', text: '月額顧問料×５ヶ月＋記帳代行料' },
    ],
  },
  {
    title: '確定申告業務',
    rows: [
      { type: 'item', label: '青色申告', fee: '基本50,000＋青50,000×事業数＋記帳代行料50,000' },
      { type: 'item', label: '白色申告', fee: '基本50,000＋白30,000×事業数＋記帳代行料30,000' },
      { type: 'note', text: '青色申告は65万円控除適用' },
    ],
  },
  {
    title: '中間申告業務',
    rows: [
      { type: 'item', label: '仮決算を組まない場合', fee: '' },
      { type: 'sub', label: '法人税', fee: '5,000円' },
      { type: 'sub', label: '消費税', fee: '5,000円' },
      { type: 'sub', label: '住民税（１部に付き）', fee: '10,000円' },
      { type: 'item', label: '仮決算を組む場合', fee: '規定決算料の半額' },
    ],
  },
  {
    title: '修正申告業務',
    rows: [
      { type: 'desc', text: '１期分に付き、決算料の２５％' },
    ],
  },
  {
    title: '譲渡申告業務',
    rows: [
      { type: 'item', label: '株式譲渡', fee: '30,000円' },
      { type: 'item', label: '不動産譲渡', fee: '80,000円～（１物件に付き）' },
      { type: 'item', label: '特例適用', fee: '50,000円（１件に付き）' },
    ],
  },
  {
    title: '年末調整',
    rows: [
      { type: 'item', label: '合計表', fee: '20,000円' },
      { type: 'item', label: '給与支払報告書', fee: '2,000円（１名に付き）' },
    ],
  },
  {
    title: '償却資産申告',
    rows: [
      { type: 'desc', text: '15,000円（１市町村に付き）' },
    ],
  },
  {
    title: '税務相談報酬',
    rows: [
      { type: 'item', label: '口頭', fee: '' },
      { type: 'sub', label: '１時間以内', fee: '10,000円（初回無料）' },
      { type: 'sub', label: '１時間超ごと', fee: '5,000円' },
      { type: 'item', label: '書面によるもの', fee: '50,000円' },
      { type: 'item', label: '書面により特別な研究を要するもの', fee: '150,000円' },
    ],
  },
  {
    title: '調査日当',
    rows: [
      { type: 'desc', text: '50,000円（１日に付き）' },
    ],
  },
  {
    title: 'その他の日当',
    rows: [
      { type: 'desc', text: '50,000円（１日に付き）' },
    ],
  },
  {
    title: '設立届一式',
    rows: [
      { type: 'desc', text: '30,000円' },
    ],
  },
  {
    title: '社会保険',
    rows: [
      { type: 'item', label: '社会保険新規適用', fee: '30,000円' },
      { type: 'item', label: '労働保険新規適用', fee: '30,000円' },
      { type: 'item', label: '算定基礎届', fee: '20,000円' },
      { type: 'item', label: 'その他社会保険手続き', fee: '5,000円（１件に付き）' },
    ],
  },
  {
    title: '相続税の申告',
    rows: [
      { type: 'desc', text: '【基本報酬】' },
      { type: 'desc', text: '遺産総額×0.8％' },
      { type: 'note', text: '基本報酬算定の基礎となる遺産総額は、プラス財産の総額のことであり、債務・葬式費用、小規模宅地の特例、生命保険非課税枠等の控除を行う前の金額となります。' },
      { type: 'desc', text: '【加算報酬】' },
      { type: 'item', label: '①土地の評価（１利用区分につき）', fee: '' },
      { type: 'sub', label: '路線価地域', fee: '10,000円' },
      { type: 'sub', label: '倍率地域', fee: '3,000円' },
      { type: 'item', label: '②非上場株式の評価（１社につき）', fee: '100,000円' },
      { type: 'note', text: '会社所有等の土地評価は、上記①に準じて算定します。' },
      { type: 'item', label: '③相続人が複数の場合（２名以上）', fee: '50,000円×（相続人の数ー１人）' },
      { type: 'note', text: '５名以上は加算対象となりません。' },
    ],
  },
  {
    title: '贈与税の申告',
    rows: [
      { type: 'desc', text: '【基本報酬】' },
      { type: 'desc', text: '10,000円＋贈与を受けた財産の価額×0.8％' },
      { type: 'note', text: '基本報酬算定の基礎となる贈与を受けた財産の価額は、基礎控除額110万円を差し引く前の金額となります。' },
      { type: 'desc', text: '【加算報酬】' },
      { type: 'item', label: '①土地の評価（１利用区分につき）', fee: '' },
      { type: 'sub', label: '路線価地域', fee: '10,000円' },
      { type: 'sub', label: '倍率地域', fee: '3,000円' },
      { type: 'item', label: '②非上場株式の評価（１社につき）', fee: '' },
      { type: 'sub', label: '原則的評価方式', fee: '200,000円' },
      { type: 'sub', label: '特例的評価方式（配当還元方式）', fee: '30,000円' },
      { type: 'note', text: '会社所有等の土地評価は、上記①に準じて算定します。' },
      { type: 'desc', text: '【特別加算報酬】' },
      { type: 'sub', label: '贈与税の配偶者控除', fee: '30,000円' },
      { type: 'sub', label: '相続時精算課税制度', fee: '30,000円' },
      { type: 'sub', label: '住宅取得資金等の贈与', fee: '30,000円' },
    ],
  },
  {
    title: 'その他',
    rows: [
      { type: 'desc', text: '要相談' },
    ],
  },
];
