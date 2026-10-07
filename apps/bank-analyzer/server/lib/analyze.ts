// 多額取引と資金移動の判定（Django 版 analyzer/lib/analyzer.py）。
//
// 資金移動: 出金ごとに、別の口座の入金で「金額が許容誤差以内・日付が期間内・まだ相手が
// 決まっていない」ものを探し、金額差の小さい方 → 日付差の小さい方を相手にする。
// 出金は日付順に見る。同じ日付どうしは (日付, id) の順 ── Django 版は pandas の
// 不安定ソートだったので、同じ日の候補が競るときだけ結果が違いうる（正解の記録では出ない）。

export type AnalysisSettings = {
  largeAmountThreshold: number;
  transferTolerance: number;
  transferDaysWindow: number;
  transferDateMode: 'after_only' | 'both';
};

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  largeAmountThreshold: 500_000,
  transferTolerance: 1000,
  transferDaysWindow: 3,
  transferDateMode: 'after_only',
};

// 負の値・不正なモードは既定値へ（Django 版の _load_analysis_settings と同じ）
export function resolveAnalysisSettings(s: Partial<Record<keyof AnalysisSettings, unknown>> = {}): AnalysisSettings {
  const d = DEFAULT_ANALYSIS_SETTINGS;
  const num = (v: unknown, def: number) => {
    const n = v === undefined || v === null ? def : Math.trunc(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : def;
  };
  return {
    largeAmountThreshold: num(s.largeAmountThreshold, d.largeAmountThreshold),
    transferTolerance: num(s.transferTolerance, d.transferTolerance),
    transferDaysWindow: num(s.transferDaysWindow, d.transferDaysWindow),
    transferDateMode: s.transferDateMode === 'both' ? 'both' : 'after_only',
  };
}

export const isLargeAmount = (amountOut: number, amountIn: number, threshold: number): boolean =>
  amountOut >= threshold || amountIn >= threshold;

export type TransferInput = {
  id: number;
  accountNumber: string;
  date: string; // 'YYYY-MM-DD'
  amountOut: number;
  amountIn: number;
};

// partnerId は判定で実際に組んだ相手の取引（出金側なら入金、入金側なら出金）
export type TransferMatch = { id: number; transferTo: string; partnerId: number };

const DAY_MS = 86_400_000;
const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const fmtYen = (n: number) => n.toLocaleString('en-US');

// 資金移動と判定した取引だけを返す（出金側・入金側の両方）。
// 判定されなかった取引の印は呼び出し側で消さない ── Django 版は付けるだけで外さなかった。
export function detectTransfers(
  transactions: readonly TransferInput[],
  settings: Pick<AnalysisSettings, 'transferTolerance' | 'transferDaysWindow' | 'transferDateMode'>,
): TransferMatch[] {
  const rows = [...transactions]
    .map((t) => ({ ...t, day: dayNumber(t.date) }))
    .sort((a, b) => a.day - b.day || a.id - b.id);
  const matchedIn = new Set<number>();
  const result = new Map<number, { transferTo: string; partnerId: number }>();

  for (const out of rows) {
    if (!(out.amountOut > 0)) continue;
    let best: { row: (typeof rows)[number]; amountDiff: number; dateDiff: number } | null = null;
    for (const cand of rows) {
      if (!(cand.amountIn > 0) || cand.accountNumber === out.accountNumber || matchedIn.has(cand.id)) continue;
      const amountDiff = Math.abs(cand.amountIn - out.amountOut);
      if (amountDiff > settings.transferTolerance) continue;
      const days = cand.day - out.day;
      const inWindow =
        settings.transferDateMode === 'after_only'
          ? days >= 0 && days <= settings.transferDaysWindow
          : Math.abs(days) <= settings.transferDaysWindow;
      if (!inWindow) continue;
      const dateDiff = Math.abs(days);
      if (!best || amountDiff < best.amountDiff || (amountDiff === best.amountDiff && dateDiff < best.dateDiff)) {
        best = { row: cand, amountDiff, dateDiff };
      }
    }
    if (!best) continue;
    const fee = Math.trunc(out.amountOut - best.row.amountIn);
    const feeInfo = fee > 0 ? ` 手数料${fmtYen(fee)}円` : '';
    result.set(out.id, { transferTo: `${best.row.accountNumber} (${best.row.date})${feeInfo}`, partnerId: best.row.id });
    result.set(best.row.id, { transferTo: `${out.accountNumber} (${out.date})${feeInfo}`, partnerId: out.id });
    matchedIn.add(best.row.id);
  }
  return [...result].map(([id, m]) => ({ id, ...m }));
}
