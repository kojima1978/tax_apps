import type { TableId, TableProps } from '@/types/form';
import { readWarekiDate } from '@/lib/wareki';
import { calcTable4 } from '@/components/tables/table4/calcTable4';
import { calcTable5Detail, isNonEvaluableAsset } from '@/components/tables/table5/Table5Grid';
import { table5RowCount } from '@/lib/table5Rows';
import { RETIREMENT_AMOUNT_FIELD } from '@/lib/retirementSimulation';
import { formatAmount, stripAmountFormatting } from '@/lib/numberFormat';

/**
 * 入力値どうしの食い違い（1件）。
 * エラーではなく「確認事項」として出す ── 計算は止めず、様式どおりの記載ならそのままで構わない。
 */
export interface ConsistencyIssue {
  /** 移動先の表（表示上のタブ。データの保存先バケットとは別） */
  tab: TableId;
  /** 移動先の入力欄（手で直せる欄を指す。自動計算欄は指さない） */
  field: string;
  /** どの欄の話か（一覧に出す見出し） */
  where: string;
  /** 何が食い違っているか */
  message: string;
}

const parseNum = (value: string): number | null => {
  const text = stripAmountFormatting(value);
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};

/** 空欄（判定不能）は false。両方そろっているときだけ比べる */
const over = (a: number | null, b: number | null): boolean => a !== null && b !== null && a > b;

/**
 * 「大きく違う」の線引き。差が大きい方の半分を超えたとき（＝片方がもう片方の2倍以上）。
 *
 * 突き合わせる相手はどれも直前期末の金額で、第5表は課税時期現在の金額。仮決算の有無・
 * 課税時期までの増減・税務簿価との差で1〜3割動くのは様式どおりなので、そこまで拾うと
 * 毎回出て読まれなくなる。桁と単位（千円）の取り違えだけが残る幅にしてある。
 */
const farApart = (a: number, b: number): boolean => {
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return scale > 0 && Math.abs(a - b) / scale > 0.5;
};

const sen = (value: number): string => `${formatAmount(value)}千円`;

/** 第5表の負債で科目に「退職」を含む最初の行（無ければ0）。 */
function retirementLiabilityRow(getField: TableProps['getField']): number {
  const rows = table5RowCount(getField);
  for (let row = 1; row <= rows; row++) {
    if (getField('table5', `l_${row}_1`).includes('退職')) return row;
  }
  return 0;
}

/** 「問題なし」を出してよいか（＝チェック対象の欄に何か入っているか）の判定に使う欄 */
const WATCHED: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', '①'], ['table1_1', '③'], ['table1_1', '⑤'], ['table1_1', '⑥'], ['table1_1', 'f63'],
  ['table1_1', 'f14_y'], ['table1_1', 'f15_from_y'], ['table1_1', 'f15_to_y'],
  ['table2', 'f85_y'],
  ['table4', 'f28'], ['table4', 'f29'], ['table4', 'f32'], ['table4', 'f33'], ['table4', 'f36'], ['table4', 'f37'],
  ['table4', 'e18'], ['table4', 'e25'],
  ['table1_2', 'f22'], ['table4', '①'], ['table4', 'n53'], ['table5', 'a_1_1'], ['table5', 'l_1_1'],
];

/** 年配当金額（⑥）と非経常的な配当金額（⑦）の3期分。⑦は⑥のうちの金額なので⑥を超えない */
const DIVIDEND_ROWS = [
  { period: '直前期', total: 'f28', extra: 'f29' },
  { period: '直前々期', total: 'f32', extra: 'f33' },
  { period: '直前々期の前期', total: 'f36', extra: 'f37' },
] as const;

/**
 * 入力値の整合チェック。様式の記載を妨げないよう、あくまで「確認事項」の一覧を返す。
 * 移動先には手入力できる欄を指定する（自動計算欄へ飛ばしても直せないため）。
 * 表示は「第４表の１」でもデータは table4 に入るので、読み出しはバケット側で行う。
 */
export function consistencyIssues(getField: TableProps['getField']): ConsistencyIssue[] {
  const num = (table: TableId, field: string) => parseNum(getField(table, field));
  const issues: ConsistencyIssue[] = [];
  const add = (tab: TableId, field: string, where: string, message: string) =>
    issues.push({ tab, field, where, message });

  // ── 第1表の1：議決権数・株式数 ──
  const votes1 = num('table1_1', '①');       // 納税義務者グループの議決権数（株主行からの自動集計）
  const votes3 = num('table1_1', '③');       // 筆頭株主グループの議決権数（手入力）
  const shares5 = num('table1_1', '⑤');      // 発行済株式数
  const votes6 = num('table1_1', '⑥');       // 議決権の総数
  const selfShares = num('table1_1', 'f63'); // 自己株式数

  if (over(votes1, votes6)) {
    add('table1_1', '⑥', '第１表の１ ⑥ 議決権の総数',
      '納税義務者グループの議決権数（①）が議決権の総数（⑥）を超えています。');
  }
  if (over(votes3, votes6)) {
    add('table1_1', '③', '第１表の１ ③ 筆頭株主グループの議決権数',
      '筆頭株主グループの議決権数（③）が議決権の総数（⑥）を超えています。');
  }
  if (over(votes1, votes3)) {
    add('table1_1', '③', '第１表の１ ③ 筆頭株主グループの議決権数',
      '納税義務者グループの議決権数（①）が筆頭株主グループ（③）を上回っています。納税義務者のグループが筆頭であれば、③には①と同じ数を入れます。');
  }
  if (over(selfShares, shares5)) {
    add('table1_1', 'f63', '第１表の１ 自己株式の株式数',
      '自己株式数が発行済株式数（⑤）を超えています。');
  }
  if (shares5 !== null && over(votes6, shares5 - (selfShares ?? 0))) {
    add('table1_1', '⑥', '第１表の１ ⑥ 議決権の総数',
      '議決権の総数（⑥）が「発行済株式数（⑤）－自己株式数」を超えています。自己株式に議決権はありません。');
  }

  // ── 日付の前後関係（直前期は課税時期の直前に終了した事業年度） ──
  const t1 = (field: string) => getField('table1_1', field);
  const taxDate = readWarekiDate(t1, 'f14');
  const prevFrom = readWarekiDate(t1, 'f15_from');
  const prevTo = readWarekiDate(t1, 'f15_to');
  const openDate = readWarekiDate((field) => getField('table2', field), 'f85');

  if (prevFrom && prevTo && prevFrom.getTime() > prevTo.getTime()) {
    add('table1_1', 'f15_from_y', '第１表の１ 直前期（自）',
      '直前期の「自」が「至」より後になっています。');
  }
  if (taxDate && prevTo && prevTo.getTime() >= taxDate.getTime()) {
    add('table1_1', 'f15_to_y', '第１表の１ 直前期（至）',
      '直前期の末日が課税時期以後になっています。直前期は課税時期の直前に終了した事業年度です。');
  }
  if (taxDate && openDate && openDate.getTime() > taxDate.getTime()) {
    add('table2', 'f85_y', '第２表 開業年月日',
      '開業年月日が課税時期より後になっています。');
  }

  // ── 第4表の1：非経常的な配当金額（⑦）は年配当金額（⑥）のうちの金額 ──
  for (const row of DIVIDEND_ROWS) {
    if (over(num('table4', row.extra), num('table4', row.total))) {
      add('table4_1', row.extra, `第４表の１ ⑦ 非経常的な配当金額（${row.period}）`,
        `${row.period}の非経常的な配当金額（⑦）が年配当金額（⑥）を超えています。⑦は⑥のうちの金額です。`);
    }
  }

  // ── 第4表の1：Ⓒ（比準要素）とⒸ₁（判定要素）で年利益金額の採り方が違う ──
  // 用途が違う欄なので別々に選べる（連動規定は無い）。ただし完成した明細書の上では
  // どちらを採ったか分からなくなるため、意図した組み合わせかを一度確認できるよう残す。
  const t4 = calcTable4(getField);
  if (t4.cvSide !== undefined && t4.c1baseSide !== undefined && t4.cvSide !== t4.c1baseSide) {
    const how = (side: 'left' | 'right') => (side === 'left' ? '直前期の利益金額' : '直前期末以前2年間の平均額');
    add('table4_1', 'e18', '第４表の１ １株（50円）当たりの年利益金額',
      `Ⓒは「${how(t4.cvSide)}」、Ⓒ₁は「${how(t4.c1baseSide)}」を基にしています。`
      + 'Ⓒ（類似業種比準価額の比準要素）とⒸ₁（比準要素数１の会社の判定要素）は納税義務者が別々に選べるため'
      + '誤りではありませんが、意図した組み合わせかご確認ください。');
  }

  // ── 第5表と他表のつながり ──
  //
  // 第5表は課税時期現在の資産・負債だが、課税時期に仮決算を行わない場合は直前期末の
  // 資産・負債を基に計算して差し支えない（第5表の記載要領）。実務ではそちらが通例なので、
  // 直前期末の金額を書く他表の欄と近い値になる。一致を求めるものではないため、
  // 桁や単位を取り違えたときだけ出す。
  const t5 = calcTable5Detail(getField);

  const totalAssetsBook = num('table1_2', 'f22');
  if (t5.hasAssetInput && t5.assetBook > 0 && totalAssetsBook !== null && totalAssetsBook > 0
    && farApart(t5.assetBook, totalAssetsBook)) {
    add('table1_2', 'f22', '第１表の２ 直前期末の総資産価額（帳簿価額）',
      `第５表の②（資産の帳簿価額の合計）${sen(t5.assetBook)}と、`
      + `直前期末の総資産価額（帳簿価額）${sen(totalAssetsBook)}が大きく違います。`
      + '課税時期に仮決算を行わず直前期末の資産・負債で第５表を作成した場合は一致します。'
      + '桁や単位（千円）の取り違えがないかご確認ください。');
  }

  // ⑲（⑰資本金等の額＋⑱利益積立金額）は直前期末の税務上の純資産価額。
  // 第5表の②－④も同じ貸借対照表から来るので、桁が合っていれば近い値になる。
  const netBook5 = t5.assetBook - t5.liabilityBook;
  if (t5.hasAssetInput && t5.hasLiabilityInput && netBook5 > 0 && t4.t1 !== null && t4.t1 > 0
    && farApart(netBook5, t4.t1)) {
    add('table4_1', 'n53', '第４表の１ ⑱ 利益積立金額（直前期）',
      `第４表の１の⑲（⑰資本金等の額＋⑱利益積立金額）${sen(t4.t1)}と、`
      + `第５表の②－④（帳簿価額の資産合計－負債合計）${sen(netBook5)}が大きく違います。`
      + 'ただし第５表の負債からは引当金・準備金・繰延税金負債を除いており（記載方法等 第５表 2⑶）、'
      + '税務上の簿価との差もあるため、一致しなくて構いません。');
  }

  // ── 第5表：現物出資等受入れ資産の価額の合計額（㋥㋭） ──
  // ①に占める割合が20％以下のときは記載しない（記載方法等 第5表 2⑴（注））。
  // 20％以下なら差額を加算しない（評価通達186－2注3）ので株価には効かないが、
  // 様式の上では書かない欄なので、消してよいことを出す。
  if (t5.inKindEval > 0 && t5.assetEval > 0 && t5.inKindRatio <= 20) {
    add('table5', 'ニ', '第５表 現物出資等受入れ資産の価額の合計額',
      `現物出資等受入れ資産の相続税評価額が「相続税評価額」の合計（①）の${t5.inKindRatio.toFixed(1)}％（20％以下）です。`
      + 'この場合は「現物出資等受入れ資産の価額の合計額」欄を記載しません（記載方法等 第５表 2⑴（注））。');
  }

  // ── 第5表：評価の対象とならない資産（記載方法等 第5表 2⑴ホ） ──
  // 財産性があるかどうかは科目名では決まらないので、自動では外さず確認だけ促す。
  for (let row = 1, rows = table5RowCount(getField); row <= rows; row++) {
    const assetName = getField('table5', `a_${row}_1`).trim();
    if (assetName !== '' && isNonEvaluableAsset(assetName)) {
      add('table5', `a_${row}_1`, `第５表 資産の部 ${assetName}`,
        `「${assetName}」に財産性が無ければ評価の対象とならないため、資産の部に記載しません`
        + '（記載方法等 第５表 2⑴ホ。財産性のない創立費・新株発行費等の繰延資産、繰延税金資産）。');
    }
  }

  // ── 退職金試算と第5表の二重反映 ──
  // 試算の入力欄は「帳票にまだ反映していない金額」を入れるところなので、
  // 第5表に退職金の負債が載っているなら、その分が二重に引かれた株価になっている。
  const retirementPay = parseNum(getField('table1_1', RETIREMENT_AMOUNT_FIELD));
  if (retirementPay !== null && retirementPay > 0) {
    const row = retirementLiabilityRow(getField);
    if (row > 0) {
      const name = getField('table5', `l_${row}_1`).trim();
      add('table5', `l_${row}_1`, `第５表 負債の部 ${name}`,
        `退職金支給後のシミュレーションに${sen(retirementPay)}が入っていますが、`
        + `第５表の負債にも「${name}」が計上されています。`
        + 'シミュレーションの欄は帳票にまだ反映していない金額を入れるところなので、'
        + '両方にあると退職金が二重に引かれた株価になります。');
    }
  }

  return issues;
}

/** チェック対象の欄に1つでも入力があるか（空の帳票に「問題なし」を出さないための判定） */
export function hasCheckableInput(getField: TableProps['getField']): boolean {
  return WATCHED.some(([table, field]) => getField(table, field).trim() !== '');
}
