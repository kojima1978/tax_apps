/**
 * 印刷時に本文が必ず A4横1枚（本文領域 281mm × 194mm）へ収まるようにする。
 *
 * レイアウト自体は横向き前提で組んであり、通常の入力量なら等倍で1枚に収まる。
 * ここは「土地・建物を両方入力した」等で想定より縦に伸びたときの保険で、
 * 溢れる分だけ zoom を下げる（拡大はしない）。
 *
 * beforeprint が発火する時点ではまだ画面用のレイアウトなので、そのまま測っても
 * 印刷時の高さにはならない。@media print の中身を一時的に無条件ルールとして流し込み、
 * 印刷と同じ幅に固定して測ってから元に戻す。注入・実測・撤去を同じタスク内で
 * 完結させるので、その間にブラウザの描画は挟まらない（画面はちらつかない）。
 */

const PAGE_WIDTH_MM = 281;
const PAGE_HEIGHT_MM = 194;
const MM_TO_PX = 96 / 25.4;

/** これ以上縮めても読めないので下限を切る（溢れる場合は2枚目に送る） */
const MIN_SCALE = 0.55;

let printRulesCache: string | null = null;

/** スタイルシートから @media print の中身だけを取り出す */
const collectPrintRules = (): string => {
    if (printRulesCache !== null) return printRulesCache;

    const collected: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
            rules = sheet.cssRules;
        } catch {
            continue; // 他オリジンのCSSは読めないので飛ばす
        }
        for (const rule of Array.from(rules)) {
            if (!(rule instanceof CSSMediaRule)) continue;
            if (!rule.media.mediaText.includes('print')) continue;
            for (const inner of Array.from(rule.cssRules)) {
                if (inner instanceof CSSPageRule) continue; // @page は高さの実測に関係しない
                collected.push(inner.cssText);
            }
        }
    }

    printRulesCache = collected.join('\n');
    return printRulesCache;
};

/** 印刷時と同じ条件（印刷用ルール適用・幅281mm・縮小なし）で本文の高さを測る */
const measureContentHeight = (): number => {
    const main = document.querySelector<HTMLElement>('.app-main');
    if (!main) return 0;

    const probe = document.createElement('style');
    probe.textContent = [
        collectPrintRules(),
        `html{width:${PAGE_WIDTH_MM}mm!important;height:auto!important;min-height:0!important;overflow:visible!important}`,
        'body{width:100%!important;height:auto!important;min-height:0!important;overflow:visible!important;zoom:1!important}',
    ].join('\n');

    document.head.appendChild(probe);
    const height = main.getBoundingClientRect().height; // ここで同期レイアウトが走る
    probe.remove();

    return height;
};

const applyPrintScale = () => {
    const height = measureContentHeight();
    if (height <= 0) return;

    const budget = PAGE_HEIGHT_MM * MM_TO_PX;
    // 切り上げでページ境界を跨がないよう、常に切り捨てる
    const fitted = Math.floor(Math.min(1, budget / height) * 1000) / 1000;

    document.documentElement.style.setProperty('--print-scale', String(Math.max(MIN_SCALE, fitted)));
};

const clearPrintScale = () => {
    document.documentElement.style.removeProperty('--print-scale');
};

export const registerPrintFit = () => {
    window.addEventListener('beforeprint', applyPrintScale);
    window.addEventListener('afterprint', clearPrintScale);
};
