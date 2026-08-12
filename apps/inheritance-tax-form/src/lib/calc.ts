/**
 * 第1表・第1表（続）・第2表・第11表の自動計算。
 *
 * 【単位の扱い】
 * 様式には末尾の「000」「00」があらかじめ印字されている欄がある（⑥・Ⓑ・⑦・⑰・⑳・㉑・㉔）。
 * これらは切り捨て後の上位桁だけを記入する欄なので、状態にも上位桁だけを保持し、
 * 計算に使うときだけ SCALE 倍して円に戻す。表示と保存が様式の記載どおりに揃う。
 *
 * 【様式間の転記】
 * 第1表のⒷ・⑦・法定相続人の数は第2表からの転記欄。手入力させず totals（'t.' スコープ）に置き、
 * 両様式の同じキーを参照させることで転記のずれが起きないようにしている。
 * 第1表①は第11表2③からの転記欄。こちらは人ごとの欄なので相続人の値（'h0.' スコープ）に
 * 置き、第11表を使用する間だけ ① を ③ で上書きして読み取り専用にする。
 * 第11表2①は付表（財産の明細書）からの転記欄。付表の「分割が確定した財産」を
 * 「財産を取得した人の番号」ごとに合計する。番号は第11表の項番＝入力順の通し番号。
 */

import { RATE_BRACKETS } from '../forms/table2';

export type Values = Record<string, string>;

/** 上位桁のみ記入する欄（値 × SCALE ＝ 円） */
export const SCALE: Record<string, number> = {
  v6: 1000,      // ⑥ 課税価格（1,000円未満切捨て）
  tB: 1000000,   // Ⓑ 遺産に係る基礎控除額
  t7: 100,       // ⑦ 相続税の総額 ＝ 第2表⑧
  t11: 100,      // 第2表⑪ 相続税の総額（農業投資価格による）
  v17: 100,      // ⑰ 相続時精算課税分の贈与税額控除額
  v20: 100,      // ⑳ 納税猶予税額
  v21: 100,      // ㉑ 申告期限までに納付すべき税額
  v24: 100,      // ㉔ 納税猶予税額（この修正前の）
  // 第2表①②③欄
  k2: 1000,      // ㋭ 第3表の課税価格の合計額
  k4: 10000,     // ㋩ 遺産に係る基礎控除額（万円単位で記入する）
  k5: 1000,      // ㋥ 課税遺産総額
  k6: 1000,      // ㋬ 農業投資価格による課税遺産総額
};

/** 文字列（カンマ・△付き）を数値に。空欄は 0。 */
export function num(v: string | undefined): number {
  if (!v) return 0;
  const raw = v.replace(/,/g, '').replace(/△/g, '-').trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** 数値を欄の保存形式（符号なし整数文字列）に。0 は空欄のままにせず 0 を表示する。 */
function str(n: number): string {
  return String(Math.trunc(n));
}

/** 還付欄など △ を許す欄の保存形式 */
function signed(n: number): string {
  const t = Math.trunc(n);
  return t < 0 ? `△${Math.abs(t)}` : String(t);
}

/** 円に戻した値を取り出す（上位桁のみの欄は SCALE 倍） */
export function yen(values: Values, key: string): number {
  return num(values[key]) * (SCALE[key] ?? 1);
}

/** 「入力されているか」— 0 と未入力を区別する（⑩の有無で⑯の算式が変わるため） */
function filled(values: Values, key: string): boolean {
  return (values[key] ?? '').trim() !== '';
}

/** 100円未満切捨て（黒字のときのみ。赤字はそのまま） */
function truncHundred(n: number): number {
  return n > 0 ? Math.floor(n / 100) * 100 : n;
}

/**
 * 相続人1人分の計算。手入力欄はそのままに、算出欄だけを上書きした新しい値を返す。
 * @param total7 ⑦相続税の総額（円）
 * @param totalA Ⓐ課税価格の合計額（円）
 * @param table11 第11表を使用する（＝第1表①を第11表2③から転記して読み取り専用にする）
 */
export function computeHeir(h: Values, total7: number, totalA: number, table11 = false): Values {
  const out: Values = { ...h };
  const has = (...vals: (string | undefined)[]) => vals.some((v) => (v ?? '').trim() !== '');
  /** 算式に使う欄が1つも埋まっていない行は、0ではなく空欄のままにする（白紙の様式を0で埋めない） */
  const show = (n: number, present: boolean) => (present ? str(n) : '');

  // 第11表2 ③ 取得財産の価額（①＋②）。第11表を使う場合は第1表①がこれの転記欄になる。
  const hasT11 = has(h.t11v1, h.t11v2);
  out.t11v3 = show(num(h.t11v1) + num(h.t11v2), hasT11);
  if (table11) out.v1 = out.t11v3;

  // ④ 純資産価額（①＋②−③）（赤字のときは0）
  const v4 = Math.max(0, num(out.v1) + num(h.v2) - num(h.v3));
  out.v4 = show(v4, has(out.v1, h.v2, h.v3));

  // ⑥ 課税価格（④＋⑤）（1,000円未満切捨て） — 様式の「000」に合わせ千円単位で保持
  const v6yen = Math.floor((v4 + num(h.v5)) / 1000) * 1000;
  out.v6 = show(v6yen / 1000, has(out.v4, h.v5));

  // ⑧ あん分割合（各人の⑥／Ⓐ）— 端数調整のため手入力での上書きを許す（v8m が立っている間は触らない）
  if (!h.v8m) out.v8 = totalA > 0 && has(out.v6) ? (v6yen / totalA).toFixed(2) : '';
  const v8 = num(out.v8);

  // ⑨ 算出税額（⑦×各人の⑧）— 円未満切捨て
  out.v9 = show(Math.floor(total7 * v8), total7 > 0 && has(out.v8));

  // ⑮ 計（⑫＋⑬＋⑭）
  const v15 = num(h.v12) + num(h.v13) + num(h.v14);
  out.v15 = show(v15, has(h.v12, h.v13, h.v14));

  // ⑯ 差引税額（⑨＋⑪−⑮）又は（⑩＋⑪−⑮）（赤字のときは0）
  //    ⑩（農地等納税猶予の適用を受ける場合の算出税額）が記入されていればそちらを使う
  const base = filled(h, 'v10') ? num(h.v10) : num(out.v9);
  const v16 = Math.max(0, base + num(h.v11) - v15);
  out.v16 = show(v16, has(out.v9, h.v10, h.v11, out.v15));

  // ⑲ 小計（⑯−⑰−⑱）（黒字のときは100円未満切捨て）
  const v19 = truncHundred(v16 - yen(h, 'v17') - num(h.v18));
  out.v19 = show(v19, has(out.v16, h.v17, h.v18));

  // ㉑ 申告期限までに納付すべき税額／㉒ 還付される税額（⑲−⑳）
  const payable = v19 - yen(h, 'v20');
  const hasPayable = has(out.v19, h.v20);
  out.v21 = hasPayable && payable > 0 ? str(payable / 100) : '';
  out.v22 = hasPayable && payable < 0 ? str(-payable) : '';

  // ㉖ 小計の増加額（⑲−㉓）
  out.v26 = show(v19 - num(h.v23), has(out.v19, h.v23));

  // ㉗ この申告により納付すべき税額又は還付される税額（（㉑又は㉒）−㉕）
  //    還付は頭に△。黒字のときは100円未満切捨て（記載要領等 修正申告の場合 3）
  out.v27 = has(out.v21, out.v22, h.v25) ? signed(truncHundred(payable - num(h.v25))) : '';

  return out;
}

/** 「各人の合計」列に横計で集計する欄（Ⓐ＝⑥は千円単位のまま合計してよい） */
const TOTAL_ROWS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24', 'v25', 'v26'] as const;

/** △表示のまま合計する欄（還付額・差引額） */
const SIGNED_TOTAL_ROWS = ['v27'] as const;

/**
 * 相続税の速算表で税額（円）を求める。
 * @param thousand 法定相続分に応ずる取得金額（千円単位）
 */
export function rateTax(thousand: number): number {
  if (thousand <= 0) return 0;
  const bracket = RATE_BRACKETS.find((b) => thousand <= b.limit)!;
  return Math.max(0, Math.floor(thousand * 1000 * bracket.rate) - bracket.deduction * 1000);
}

/** 第2表の計算結果 */
interface Table2 {
  /** 法定相続人ごとの⑥⑦⑨⑩ */
  lawful: Values[];
  /** ㋺㋩㋥㋬・Ⓐ・⑧・⑪ と、第1表へ転記するⒷ・⑦ */
  totals: Values;
}

/**
 * 第2表（相続税の総額の計算書）。
 * @param totalAThousand ㋑ 課税価格の合計額（＝第1表Ⓐ・千円単位）
 */
function computeTable2(common: Values, lawful: Values[], totalAThousand: number): Table2 {
  const named = lawful.filter((l) => (l.name ?? '').trim() !== '').length;
  const totals: Values = {};

  // ㋺ 法定相続人の数 ／ ㋩ 遺産に係る基礎控除額（3,000万円＋600万円×法定相続人の数・万円単位）
  const deduction = named > 0 ? 3000 + 600 * named : 0;
  totals.heirCount = named > 0 ? str(named) : '';
  totals.k4 = named > 0 ? str(deduction) : '';
  // Ⓑ（第1表）は百万円単位で記入する欄なので㋩（万円）を100で割る
  totals.tB = named > 0 ? str(deduction / 100) : '';

  // ㋥（㋑−㋩）／ ㋬（㋭−㋩）。基礎控除以下なら課税遺産は生じないので0とする。
  const gross3 = num(common.k2);
  const net = Math.max(0, totalAThousand - deduction * 10);
  const net3 = Math.max(0, gross3 - deduction * 10);
  totals.k5 = totalAThousand > 0 || named > 0 ? str(net) : '';
  totals.k6 = gross3 > 0 ? str(net3) : '';

  let sum7 = 0;
  let sum10 = 0;
  const rows = lawful.map((l): Values => {
    const den = num(l.den);
    const share = den > 0 ? num(l.num) / den : 0;
    const active = (l.name ?? '').trim() !== '' && share > 0;
    // ⑥⑨ 法定相続分に応ずる取得金額（1,000円未満切捨て） → ⑦⑩ 速算表による税額
    const v6 = active ? Math.floor(net * share) : 0;
    const v7 = active ? rateTax(v6) : 0;
    const farm = active && gross3 > 0;
    const v9 = farm ? Math.floor(net3 * share) : 0;
    const v10 = farm ? rateTax(v9) : 0;
    sum7 += v7;
    sum10 += v10;
    return {
      ...l,
      v6: active ? str(v6) : '',
      v7: active ? str(v7) : '',
      v9: farm ? str(v9) : '',
      v10: farm ? str(v10) : '',
    };
  });

  // ⑧⑪ 相続税の総額（100円未満切捨て）— 様式の「00」に合わせ百円単位で保持
  totals.t7 = sum7 > 0 ? str(Math.floor(sum7 / 100)) : '';
  totals.t11 = sum10 > 0 ? str(Math.floor(sum10 / 100)) : '';

  return { lawful: rows, totals };
}

/** 付表（財産の明細書）の1明細で、1つの財産を分けられる人数 */
const DETAIL_SHARES = [0, 1, 2] as const;

/**
 * 付表の「分割が確定した財産」を、財産を取得した人の番号ごとに合計する（円）。
 * 添字は番号そのもの（1始まり）。番号が空欄の明細は分割が確定していないので集計しない。
 */
function sumDetails(details: Values[]): number[] {
  const byNumber: number[] = [];
  for (const item of details) {
    for (const i of DETAIL_SHARES) {
      const no = num(item[`who${i}`]);
      if (no <= 0) continue;
      byNumber[no] = (byNumber[no] ?? 0) + num(item[`amount${i}`]);
    }
  }
  return byNumber;
}

export interface Computed {
  /** 相続人ごとの算出済みの値（入力順） */
  heirs: Values[];
  /** 第2表の法定相続人ごとの算出済みの値 */
  lawful: Values[];
  /** 「各人の合計」列と、第2表から転記されるⒷ・⑦・法定相続人の数 */
  totals: Values;
}

/**
 * 全体を計算する。⑧の按分にはⒶ（＝⑥の合計）を、⑨には⑦（＝第2表⑧）を使うため、
 * ⑥→Ⓐ→（第2表）⑧→⑨ の順に第1表を2周する。循環はしない。
 * @param used 使用する様式のID。第11表・付表を使うかどうかで第1表①・第11表2①の扱いが変わる。
 * @param details 付表の明細（様式IDごと）。使用する付表の分だけ第11表2①へ合計する。
 */
export function computeAll(
  common: Values, heirs: Values[], lawful: Values[], used: string[] = [], details: Record<string, Values[]> = {},
): Computed {
  const table11 = used.includes('table11');

  // 第11表2① ← 付表の「分割が確定した財産」。使用する付表だけを合計する。
  const detailForms = used.filter((id) => (details[id]?.length ?? 0) > 0);
  const detailTotals = sumDetails(detailForms.flatMap((id) => details[id]!));
  const inputs = detailForms.length === 0 ? heirs : heirs.map((h, i): Values => {
    const sum = detailTotals[i + 1] ?? 0;
    return { ...h, t11v1: sum === 0 ? '' : str(sum) };
  });

  // 1周目: Ⓐ（⑥の合計）を確定させる
  const firstPass = inputs.map((h) => computeHeir(h, 0, 0, table11));
  const totalA = firstPass.reduce((s, h) => s + yen(h, 'v6'), 0);

  // 第2表: Ⓐと法定相続人から相続税の総額⑧（＝第1表⑦）を求める
  const table2 = computeTable2(common, lawful, totalA / 1000);
  const total7 = yen(table2.totals, 't7');

  // 2周目: 確定したⒶ・⑦で⑧以降を計算する。第11表の項番は入力順の通し番号。
  const computed: Values[] = inputs.map((h, i) => ({ ...computeHeir(h, total7, totalA, table11), t11no: str(i + 1) }));

  const totals: Values = { ...table2.totals };
  for (const key of TOTAL_ROWS) {
    const sum = computed.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : str(sum);
  }
  for (const key of SIGNED_TOTAL_ROWS) {
    const sum = computed.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : signed(sum);
  }
  // ⑧ 合計欄は様式にあらかじめ「1.00」と印字されている
  totals.v8 = '1.00';

  return { heirs: computed, lawful: table2.lawful, totals };
}
