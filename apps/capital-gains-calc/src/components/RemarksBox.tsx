/**
 * 印刷物の下端に置く備考欄（手書き用）。
 *
 * 中身の量は入力次第で変わるので、そのままだと用紙の下半分が空くことがある。
 * 残りの高さをこの枠で吸収して、余白ではなく記入欄として見えるようにする。
 * 画面では使わない（print-only）。
 */
const RemarksBox = () => (
    <div className="print-remarks print-only">
        <span className="print-remarks-label">備考</span>
    </div>
);

export default RemarksBox;
