import { useState, useId } from "react";
import { formatJapaneseDate } from "@/lib/utils";
import { COMPANY_INFO, getFullAddress } from "@/lib/company";

/**
 * 事務所名・担当者・作成日。印刷物ではタイトル直下のヘッダー帯として出す。
 * 以前は用紙の最下部に置いていたが、下端は備考欄で埋めるため上に移した。
 */
const PrintMeta = () => {
    const [staff, setStaff] = useState("");
    const [today] = useState(() => formatJapaneseDate(new Date()));
    const staffId = useId();

    return (
        <div className="print-meta">
            <div className="print-meta-company">
                <p className="company-name">{COMPANY_INFO.name}</p>
                <p>{getFullAddress()}</p>
                <p>TEL: {COMPANY_INFO.phone}</p>
            </div>
            <div className="print-meta-side">
                <div className="staff-input-wrapper">
                    <label htmlFor={staffId}>担当:</label>
                    <input
                        type="text"
                        id={staffId}
                        value={staff}
                        onChange={(e) => setStaff(e.target.value)}
                        placeholder="担当者名"
                        className="staff-input"
                    />
                </div>
                <p className="print-date">作成日: {today}</p>
            </div>
        </div>
    );
};

export default PrintMeta;
