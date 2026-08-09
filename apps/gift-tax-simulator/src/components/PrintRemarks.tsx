import { useState } from 'react';

/**
 * 印刷物の最後に1行だけ載せる備考。
 * 担当者名と違って案件ごとに変わるものなので保存はしない
 * （前の案件の備考が次の見積に載ったまま印刷される事故を避ける）。
 */
const PrintRemarks = () => {
    const [remarks, setRemarks] = useState('');
    const text = remarks.trim();

    return (
        <section className="print-remarks">
            <label className="print-remarks-field no-print">
                <span>備考</span>
                <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="印刷物に1行で載ります（例: 〇〇様 二次相続を前提とした試算）"
                />
            </label>
            {/* 未入力なら紙に何も出さない */}
            {text && <p className="print-only print-remarks-line">備考: {text}</p>}
        </section>
    );
};

export default PrintRemarks;
