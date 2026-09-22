/**
 * 第1表と全体の組み立て。各様式の計算を呼び、様式間の転記をつなぐ。
 *
 * 第1表①は第11表2③からの転記欄。人ごとの欄なので相続人の値（'h0.' スコープ）に
 * 置き、第11表を使用する間だけ ① を ③ で上書きして読み取り専用にする。
 */

import { DETAIL_KINDS } from '../../data/detailCodes';
import { TABLE10_DETAIL_FORM, TABLE10_ROWS } from '../../forms/table10';
import { TABLE15_KEYS, TABLE15_KEY_BY_MARK, table15Key } from '../../forms/table15';
import { TABLE9_DETAIL_FORM, TABLE9_ROWS } from '../../forms/table9';
import {
  computeNonTaxableLimit, computeTable1112f1, computeTable1112f1b, computeTable112, computeTable13, computeTable14,
  computeTable15, derivedTable11f4, sumTable15, table15Transferred,
} from './assets';
import {
  ageAtInheritanceStart, computeTable4, computeTable42, computeTable5, computeTable6, computeTable7, computeTable88,
  spouseIndex,
} from './credits';
import { computeUnsplit, resolveDetail, sumDetails } from './detail';
import { computeTable2, deriveCivil, deriveLawful } from './lawful';
import { table10Pages, table14Pages, table42Pages, table4Pages, table88Pages, table9Pages } from './pages';
import { type Values, filled, num, signed, str, truncHundred, yen } from './values';

/** どの様式を使っているか（使う様式によって第1表の転記欄が変わる） */
export interface UsedForms {
  /** 第11表を使用する（＝第1表①を第11表2③から転記して読み取り専用にする） */
  table11?: boolean;
  /** 第11の2表を使用する（＝第1表②⑰を第11の2表1⑧⑨から転記して読み取り専用にする） */
  table112?: boolean;
  /** 第13表を使用する（＝第1表③を第13表3⑦から転記して読み取り専用にする） */
  table13?: boolean;
}

/**
 * 相続人1人分の計算。手入力欄はそのままに、算出欄だけを上書きした新しい値を返す。
 * @param total7 ⑦相続税の総額（円）
 * @param totalA Ⓐ課税価格の合計額（円）
 */
export function computeHeir(h: Values, total7: number, totalA: number, forms: UsedForms = {}): Values {
  const out: Values = { ...h, ...computeTable112(h) };
  const has = (...vals: (string | undefined)[]) => vals.some((v) => (v ?? '').trim() !== '');
  /** 算式に使う欄が1つも埋まっていない行は、0ではなく空欄のままにする（白紙の様式を0で埋めない） */
  const show = (n: number, present: boolean) => (present ? str(n) : '');

  // 第11表2 ③ 取得財産の価額（①＋②）。第11表を使う場合は第1表①がこれの転記欄になる。
  // 代償財産を支払う人は①が負数になり得る（記載例62ページ）ので △ を保てる形式で持つ。
  const hasT11 = has(h.t11v1, h.t11v2);
  out.t11v3 = hasT11 ? signed(num(h.t11v1) + num(h.t11v2)) : '';
  if (forms.table11) out.v1 = out.t11v3;

  // 第1表② ← 第11の2表1⑧（円）／ 第1表⑰ ← 同⑨（⑰は百円単位の欄なので100で割る）
  if (forms.table112) {
    out.v2 = out.t112v8;
    out.v17 = out.t112v9 === '' ? '' : str(num(out.t112v9) / 100);
  }

  // 第13表3 ③計（①＋②）・⑥計（④＋⑤）・⑦合計（③＋⑥）。①④は1・2の明細からの転記。
  out.t13v3 = show(num(h.t13v1) + num(h.t13v2), has(h.t13v1, h.t13v2));
  out.t13v6 = show(num(h.t13v4) + num(h.t13v5), has(h.t13v4, h.t13v5));
  out.t13v7 = show(num(out.t13v3) + num(out.t13v6), has(out.t13v3, out.t13v6));
  // 第1表③ ← 第13表3⑦
  if (forms.table13) out.v3 = out.t13v7;

  // 第15表㉛ ← 第11の2表1⑧ ／ ㉝ ← 第13表3③ ／ ㉞ ← 第13表3⑥
  if (forms.table112) out[table15Key(31)] = out.t112v8 ?? '';
  if (forms.table13) {
    out[table15Key(33)] = out.t13v3;
    out[table15Key(34)] = out.t13v6;
  }
  Object.assign(out, computeTable15(out));

  // ④ 純資産価額（①＋②−③）（赤字のときは0）
  const v4 = Math.max(0, num(out.v1) + num(out.v2) - num(out.v3));
  out.v4 = show(v4, has(out.v1, out.v2, out.v3));

  // ⑥ 課税価格（④＋⑤）（1,000円未満切捨て） — 様式の「000」に合わせ千円単位で保持
  const v6yen = Math.floor((v4 + num(h.v5)) / 1000) * 1000;
  out.v6 = show(v6yen / 1000, has(out.v4, h.v5));

  // ⑧ あん分割合（各人の⑥／Ⓐ）。全員の合計が1.00になる端数調整値が渡された場合はそれを使う。
  // v8a は computeAll 内だけで使う一時値で、保存データの旧手入力値（v8/v8m）は計算に採用しない。
  out.v8 = totalA > 0 && has(out.v6)
    ? h.v8a ?? (v6yen / totalA).toFixed(2)
    : '';
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
  const v19 = truncHundred(v16 - yen(out, 'v17') - num(h.v18));
  out.v19 = show(v19, has(out.v16, out.v17, h.v18));

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
const TOTAL_ROWS: readonly string[] = [
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24', 'v25', 'v26',
  // 第13表3の「各人の合計」列
  't13v1', 't13v2', 't13v3', 't13v4', 't13v5', 't13v6', 't13v7',
  // 第15表の「各人の合計」列（①〜㊳。㊳は千円単位のまま合計してよい）
  ...TABLE15_KEYS,
];

/** △表示のまま合計する欄（還付額・差引額） */
const SIGNED_TOTAL_ROWS = ['v27'] as const;

export interface Computed {
  /** 相続人ごとの算出済みの値（入力順） */
  heirs: Values[];
  /** 第2表の法定相続人ごとの算出済みの値 */
  lawful: Values[];
  /** 「各人の合計」列と、第2表から転記されるⒷ・⑦・法定相続人の数 */
  totals: Values;
  /** 他の様式から転記される明細（様式IDごと）。保存した明細の後ろに続けて表示する */
  derived: Record<string, Values[]>;
}

/**
 * 全体を計算する。⑧の按分にはⒶ（＝⑥の合計）を、⑨には⑦（＝第2表⑧）を使うため、
 * ⑥→Ⓐ→（第2表）⑧→⑨ の順に第1表を2周する。循環はしない。
 * @param used 使用する様式のID。第11表・付表を使うかどうかで第1表①・第11表2①の扱いが変わる。
 * @param details 付表の明細（様式IDごと）。使用する付表の分だけ第11表2①へ合計する。
 */
function computeAllWithRatios(
  common: Values, heirs: Values[], used: string[] = [], details: Record<string, Values[]> = {},
  ratios?: readonly number[],
): Computed {
  const forms: UsedForms = {
    table11: used.includes('table11'),
    table112: used.includes('table112'),
    table13: used.includes('table13'),
  };

  // 第2表④は「財産を取得した人」のうち法定相続人の印が付いた人。行として別に持たず毎回作る
  const linkedLawful = deriveLawful(heirs);
  // 未分割財産の按分に使う民法上の相続分（放棄を反映し、養子の数の制限は受けない）
  const linkedCivil = deriveCivil(heirs, linkedLawful);

  // 付表4 ← 第9表・第10表（生命保険金等・退職手当金等のうち課税される部分）。
  // 保存した明細の後ろに続け、以降の集計はこの継ぎ足した明細を見る
  const f4 = derivedTable11f4(details, heirs, linkedLawful.length);
  const withDerived = f4.length === 0
    ? details
    : { ...details, table11f4: [...(details.table11f4 ?? []), ...f4] };

  // 第11表2① ← 付表の「分割が確定した財産」。財産の明細書（付表1〜4）だけを合計する
  // ＝ 明細を配列で持つ様式は他にもあるので、コード表を持つ様式だけに絞る。
  const detailForms = used.filter((id) => id in DETAIL_KINDS && (withDerived[id]?.length ?? 0) > 0);
  const detailItems = detailForms.flatMap((id) => withDerived[id]!.map((item) => resolveDetail(id, item)));
  const detailTotals = sumDetails(detailItems);
  // 第11表2② ← 付表の未分割の明細を民法上の相続分で按分したもの
  const unsplitTotals = computeUnsplit(detailItems, linkedCivil);
  // 第13表3①④ ← 同表1・2の明細の「負担する金額」
  const t13 = computeTable13(details);
  // 第15表①〜㉘ ← 付表の細目ごとの合計。転記になる欄は手入力の残りを混ぜないよう毎回空に戻す。
  const t15 = sumTable15(used, withDerived);
  // 第1表⑫ ← 第4表の2㉕。この様式は自分の入力だけで完結するので、第1表を1周する前に確定させる
  // （配偶者の⑫は第5表㋺で引かれるため、2周目より後では間に合わない）。
  // 名前を選び直したときに古い値が読み取り専用のまま残らないよう、使用中は全員分を上書きする。
  const t42 = computeTable42(common, table42Pages(common));
  const t42Used = used.includes('table42');
  // 第1表⑤・第15表㊲ ← 第14表1④。⑤は⑥→Ⓐ→⑦→⑨… の入口なので、これも1周する前に確定させる。
  const t14 = computeTable14(common, details, table14Pages(common, details));
  const t14Used = used.includes('table14');
  const t15Blank = Object.fromEntries(
    table15Transferred(used).flatMap((mark) => {
      const key = TABLE15_KEY_BY_MARK[mark];
      return key === undefined ? [] : [[key, '']];
    }),
  ) as Values;
  const inputs = heirs.map((h, i): Values => {
    const detail = detailTotals[i + 1] ?? 0;
    const unsplit = unsplitTotals[i + 1] ?? 0;
    const debt = t13.debt[i + 1] ?? 0;
    const funeral = t13.funeral[i + 1] ?? 0;
    const age = ageAtInheritanceStart(common, h);
    return {
      ...h,
      age: age === undefined ? '' : str(age),
      ...(ratios === undefined ? {} : { v8a: ratios[i]!.toFixed(2) }),
      ...(t42Used ? { v12: t42.v12.get(i) ?? '' } : {}),
      // 第11表2①②は（注）2・3のとおり付表1〜4からの導出しかないので、
      // 付表が空でも手入力に戻さず空欄のままにする（欄そのものが入力不可）
      t11v1: detail === 0 ? '' : signed(detail),
      t11v2: unsplit === 0 ? '' : str(unsplit),
      t13v1: debt === 0 ? '' : str(debt),
      t13v4: funeral === 0 ? '' : str(funeral),
      ...t15Blank,
      ...Object.fromEntries(Object.entries(t15).map(([key, byNo]) => {
        const amount = byNo[i + 1] ?? 0;
        return [key, amount === 0 ? '' : signed(amount)];
      })),
      // 第14表を使う間は、名前を選び直したときに古い値が残らないよう全員分を上書きする
      ...(t14Used ? { v5: t14.v5.get(i) ?? '', [table15Key(37)]: t14.v5.get(i) ?? '' } : {}),
    };
  });

  // 1周目: Ⓐ（⑥の合計）を確定させる
  const firstPass = inputs.map((h) => computeHeir(h, 0, 0, forms));
  const totalA = firstPass.reduce((s, h) => s + yen(h, 'v6'), 0);

  // 第2表: Ⓐと法定相続人から相続税の総額⑧（＝第1表⑦）を求める
  const table2 = computeTable2(linkedLawful, totalA / 1000);
  const total7 = yen(table2.totals, 't7');

  // 2周目以降は他の様式からの転記を重ねて第1表を計算し直す。第11表の項番は入力順の通し番号。
  const pass = (patches: Values[]): Values[] => inputs.map((h, i) => ({
    ...computeHeir({ ...h, ...patches[i] }, total7, totalA, forms), t11no: str(i + 1),
  }));
  const none: Values[] = inputs.map(() => ({}));

  // 2周目: 確定したⒶ・⑦で⑧以降を計算する
  const pass2 = pass(none);

  // 第5表: 2周目で確定した配偶者の⑨⑫を使って軽減額㋩（㋬）を求める
  const spouse = spouseIndex(heirs);
  const spouseName = (heirs[spouse]?.name ?? '').trim();
  const spouseLawful = linkedLawful.find((row) => row.source === String(spouse))
    ?? linkedLawful.find((row) => spouseName !== '' && (row.name ?? '').trim() === spouseName);
  const table5 = computeTable5(common, pass2[spouse], spouseLawful, totalA, total7);
  const t5v13 = used.includes('table5')
    ? filled(common, 't5a3') || filled(common, 't5v17') ? table5.t5s2ha : table5.t5s1ha
    : '';
  // 第4表: 2周目で確定した⑨と①②⑤から加算金額⑥を求める（⑨は⑪に依存しないので循環しない）
  const table4 = computeTable4(common, pass2, table4Pages(common));
  const t4v11 = used.includes('table4') ? table4.v11 : new Map<number, string>();

  // 3周目: 第5表㋩を配偶者の⑬へ、第4表⑥を各人の⑪へ転記して⑮⑯以降を計算し直す
  const patch3: Values[] = inputs.map((_h, i) => ({
    ...(i === spouse ? { v13: t5v13 ?? '' } : {}),
    ...(t4v11.has(i) ? { v11: t4v11.get(i)! } : {}),
  }));
  const computed = pass(patch3);

  // 第6表・第7表: 3周目で確定した第1表の⑨〜⑬（＝③⑤の元）と④から控除額を求める
  const t6 = computeTable6(common, computed);
  const t7 = computeTable7(common, computed, computed.reduce((s, h) => s + num(h.v4), 0));
  // 第8の8表: 1⑤→第1表⑭、2⑧→第1表⑳。①②③の元が第6表・第7表なのでここまで下りてくる。
  // ⑭⑳は第6表③⑤・第7表④のどちらにも影響しないので循環はしない。
  const t88 = computeTable88(common, table88Pages(common), t6, t7, used.includes('table6'), used.includes('table7'));

  // 4周目: 第8の8表の合計を各人の⑭⑳へ転記して⑮〜㉗を計算し直す
  const final = used.includes('table88')
    ? pass(patch3.map((p, i) => ({ ...p, v14: t88.v14.get(i) ?? '', v20: t88.v20.get(i) ?? '' })))
    : computed;

  const totals: Values = { ...table2.totals, ...table5 };
  for (const key of TOTAL_ROWS) {
    const sum = final.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : str(sum);
  }
  for (const key of SIGNED_TOTAL_ROWS) {
    const sum = final.reduce((s, h) => s + num(h[key]), 0);
    totals[key] = sum === 0 ? '' : signed(sum);
  }
  // ⑧ 合計欄は様式にあらかじめ「1.00」と印字されている
  totals.v8 = '1.00';
  // 第13表1・2の合計（負担する人が決まっていない分も含む「金額」列の合計）
  totals.t13dTotal = t13.debtTotal === 0 ? '' : str(t13.debtTotal);
  totals.t13fTotal = t13.funeralTotal === 0 ? '' : str(t13.funeralTotal);
  // 第9表（生命保険金など）・第10表（退職手当金など）。どちらもⒶは第2表の法定相続人の数から決まる
  const heirCount = num(table2.totals.heirCount);
  Object.assign(
    totals,
    computeNonTaxableLimit(
      details[TABLE9_DETAIL_FORM] ?? [], heirs, 't9', table9Pages(common, details), TABLE9_ROWS, heirCount,
    ),
    computeNonTaxableLimit(
      details[TABLE10_DETAIL_FORM] ?? [], heirs, 't10', table10Pages(common, details), TABLE10_ROWS, heirCount,
    ),
  );
  // 第4表（相続税額の加算金額）。⑥は上で求めた各人の⑪への転記元
  Object.assign(totals, table4.totals);
  // 第4表の2（暦年課税分の贈与税額控除額）。㉕は第1表を1周する前に各人の⑫へ入れてある
  Object.assign(totals, t42.totals);
  Object.assign(totals, t14.totals);
  // 第6表（未成年者控除・障害者控除）・第7表（相次相続控除）と、その合計を集める第8の8表
  Object.assign(totals, t6.totals, t7.totals, t88.totals);
  // 第11・11の2表の付表1（小規模宅地等）と、その別表1
  const f1Sheets = details.table1112f1b ?? [];
  Object.assign(totals, computeTable1112f1b(f1Sheets), computeTable1112f1(details.table1112f1 ?? [], f1Sheets));

  // 第2表④の行はその人自身の欄なので、⑤⑥⑦⑨⑩をその人の値として持たせる
  // （様式側は `h{n}.lawNum` … を参照する。分数は手入力があればそれ、無ければ自動候補）
  const byHeir = new Map(table2.lawful.map((row) => [Number(row.source), row]));
  // 民法上の相続分は様式に印刷しないが、自動候補を登録画面に出すのでその人の値として持たせる
  const civilByHeir = new Map(linkedCivil.map((row) => [Number(row.source), row]));
  const withLawful = final.map((heir, i): Values => {
    const civil = civilByHeir.get(i);
    const withCivil: Values = civil === undefined ? heir : {
      ...heir,
      civilNum: civil.num ?? '', civilDen: civil.den ?? '', civilOverride: civil.override ?? '',
    };
    const row = byHeir.get(i);
    return row === undefined ? withCivil : {
      ...withCivil,
      lawNum: row.num ?? '', lawDen: row.den ?? '', lawOverride: row.override ?? '',
      lawV6: row.v6 ?? '', lawV7: row.v7 ?? '', lawV9: row.v9 ?? '', lawV10: row.v10 ?? '',
    };
  });

  return {
    heirs: withLawful, lawful: table2.lawful, totals,
    derived: f4.length === 0 ? {} : { table11f4: f4 },
  };
}

/** ⑧の端数調整後に比較する税負担。⑲は税額控除後・納税猶予前なので、猶予を節税と誤認しない。 */
function apportionedTaxBurden(computed: Computed): number {
  return computed.heirs.reduce((sum, heir) => sum + num(heir.v19), 0);
}

/**
 * 相続税法基本通達17－1に従い、各人の⑧を小数第2位で調整して合計を1.00にする。
 * 各人は正確な割合の切捨て値または切上げ値のどちらかとし、不足する0.01を、
 * ⑲の合計税負担への増分が小さい人から配る。同額なら正確な割合の端数が大きい人を優先する。
 */
export function computeAll(
  common: Values, heirs: Values[], used: string[] = [], details: Record<string, Values[]> = {},
): Computed {
  const preliminary = computeAllWithRatios(common, heirs, used, details);
  const totalA = preliminary.heirs.reduce((sum, heir) => sum + yen(heir, 'v6'), 0);
  if (totalA <= 0) return preliminary;

  const exactUnits = preliminary.heirs.map((heir) => (yen(heir, 'v6') * 100) / totalA);
  const floorUnits = exactUnits.map((units) => Math.floor(units + 1e-10));
  const missingUnits = Math.max(0, 100 - floorUnits.reduce((sum, units) => sum + units, 0));
  const floorRatios = floorUnits.map((units) => units / 100);
  if (missingUnits === 0) return computeAllWithRatios(common, heirs, used, details, floorRatios);

  const floorResult = computeAllWithRatios(common, heirs, used, details, floorRatios);
  const floorTax = apportionedTaxBurden(floorResult);
  const candidates = exactUnits.flatMap((units, index) => {
    const remainder = units - floorUnits[index]!;
    if (remainder <= 1e-10) return [];
    const trial = [...floorRatios];
    trial[index] = (floorUnits[index]! + 1) / 100;
    const tax = apportionedTaxBurden(computeAllWithRatios(common, heirs, used, details, trial));
    return [{ index, taxIncrease: tax - floorTax, remainder }];
  });
  candidates.sort((a, b) => (
    a.taxIncrease - b.taxIncrease || b.remainder - a.remainder || a.index - b.index
  ));

  const optimized = [...floorRatios];
  for (const candidate of candidates.slice(0, missingUnits)) {
    optimized[candidate.index] = (floorUnits[candidate.index]! + 1) / 100;
  }
  return computeAllWithRatios(common, heirs, used, details, optimized);
}
