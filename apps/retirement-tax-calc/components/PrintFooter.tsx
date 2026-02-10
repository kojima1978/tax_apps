"use client";

import { useState, useEffect, useId } from "react";
import { formatJapaneseDate } from "@/lib/utils";

const PrintFooter = () => {
    const [staff, setStaff] = useState("");
    const [today, setToday] = useState("");
    const staffId = useId();

    useEffect(() => {
        setToday(formatJapaneseDate(new Date()));
    }, []);

    return (
        <footer className="print-footer">
            <div className="print-footer-content">
                <div className="print-footer-company">
                    <p className="company-name">税理士法人 マスエージェント</p>
                    <p>〒770-0002 徳島県徳島市春日２丁目３−３３</p>
                    <p>TEL: 088-632-6228</p>
                </div>
                <div className="print-footer-meta">
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
        </footer>
    );
};

export default PrintFooter;
