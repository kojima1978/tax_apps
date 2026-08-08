import { useId } from "react";
import RateTable from "./RateTable";

type RemarksBoxProps = {
    /** 省略すると手書き用の空枠（印刷のみ）になる */
    value?: string;
    onChange?: (value: string) => void;
};

/**
 * 印刷物の下端に置く備考欄。
 *
 * 中身の量は入力次第で変わるので、そのままだと用紙の下半分が空くことがある。
 * 残りの高さをこの枠で吸収して、余白ではなく記入欄として見えるようにする。
 *
 * 未入力のときは枠もラベルも印刷しない（プレースホルダが印刷物に出てしまうため）。
 * 代わりに、空きが足りていれば税率一覧を刷り込む。足りるかどうかの判定は
 * コンテナクエリに任せてある（`.print-fill` / globals.css）。
 */
const RemarksBox = ({ value, onChange }: RemarksBoxProps) => {
    const id = useId();

    if (!onChange) {
        return (
            <div className="print-remarks print-only">
                <span className="print-remarks-label">備考</span>
            </div>
        );
    }

    const isEmpty = value?.trim() === "";

    return (
        <div className={`print-remarks${isEmpty ? " print-remarks-empty" : ""}`}>
            <label className="print-remarks-label" htmlFor={id}>備考</label>
            <textarea
                id={id}
                className="print-remarks-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="印刷物に反映されます"
            />

            {isEmpty && (
                <div className="print-fill-slot" aria-hidden="true">
                    <div className="print-fill">
                        <h3>参考: 税率一覧</h3>
                        <RateTable />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemarksBox;
