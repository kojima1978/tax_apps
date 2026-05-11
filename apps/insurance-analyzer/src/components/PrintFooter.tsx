import { useState, useEffect, useId } from "react";
import { formatJapaneseDate } from "@/lib/utils";
import { COMPANY_INFO, getFullAddress } from "@/lib/company";

const PrintFooter = () => {
    const [staff, setStaff] = useState("");
    const [today, setToday] = useState("");
    const staffId = useId();

    useEffect(() => {
        setToday(formatJapaneseDate(new Date()));
    }, []);

    return (
        <footer className="mt-8 p-4 border-t border-gray-300 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-8">
                <div className="flex-1">
                    <p className="font-bold text-base text-green-800 my-1">{COMPANY_INFO.name}</p>
                    <p className="text-sm my-1">{getFullAddress()}</p>
                    <p className="text-sm my-1">TEL: {COMPANY_INFO.phone}</p>
                </div>
                <div className="sm:text-right">
                    <div className="flex items-center gap-2 mb-2">
                        <label htmlFor={staffId} className="text-sm text-gray-500">担当:</label>
                        <input
                            type="text"
                            id={staffId}
                            value={staff}
                            onChange={(e) => setStaff(e.target.value)}
                            placeholder="担当者名"
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-36"
                        />
                    </div>
                    <p className="text-sm text-gray-500 m-0">作成日: {today}</p>
                </div>
            </div>
        </footer>
    );
};

export default PrintFooter;
