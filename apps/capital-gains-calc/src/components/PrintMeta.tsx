import { COMPANY_INFO, getFullAddress } from "@/lib/company";

/** 事務所情報・担当者・作成日。印刷専用（画面では上部ヘッダーに出す） */
const PrintMeta = ({ staff, today }: { staff: string; today: string }) => (
    <address className="print-meta">
        <p className="company-name">{COMPANY_INFO.name}</p>
        {/* 電話番号は住所と同じ行に置いてヘッダーの行数を減らす */}
        <p>{getFullAddress()}{"　"}TEL: {COMPANY_INFO.phone}</p>
        <p>
            {/* 未入力なら手書きできるよう下線だけ残す */}
            担当: <span className="staff-value">{staff}</span>{"　"}作成日: {today}
        </p>
    </address>
);

export default PrintMeta;
