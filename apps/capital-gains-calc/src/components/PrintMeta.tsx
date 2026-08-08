import { COMPANY_INFO, getFullAddress } from "@/lib/company";

/** 事務所情報・担当者・作成日。印刷専用（画面では上部ヘッダーに出す） */
const PrintMeta = ({ staff, today }: { staff: string; today: string }) => (
    <div className="print-meta">
        <div className="print-meta-company">
            <p className="company-name">{COMPANY_INFO.name}</p>
            <p>{getFullAddress()}</p>
            <p>TEL: {COMPANY_INFO.phone}</p>
        </div>
        <div className="print-meta-side">
            {/* 未入力なら手書きできるよう下線だけ残す */}
            <p>担当: <span className="staff-value">{staff}</span></p>
            <p className="print-date">作成日: {today}</p>
        </div>
    </div>
);

export default PrintMeta;
