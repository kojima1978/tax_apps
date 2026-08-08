import { useEffect, useRef, useState } from "react";
import { PRINT_OPTIONS, type PrintOptionKey, type PrintOptions } from "@/lib/print-options";

type PrintMenuProps = {
    options: PrintOptions;
    onOptionChange: (key: PrintOptionKey, value: boolean) => void;
    onPrint: () => void;
};

const PrintMenu = ({ options, onOptionChange, onPrint }: PrintMenuProps) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // 外側を押したとき・Escキーで閉じる
    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (e: PointerEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const handlePrint = () => {
        setOpen(false);
        // window.print() は同期的に画面を止めるので、閉じた状態を描画してから呼ぶ
        requestAnimationFrame(onPrint);
    };

    return (
        <div className="relative flex-shrink-0" ref={wrapperRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="dialog"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
            >
                印刷
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="印刷する内容"
                    className="absolute right-0 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
                >
                    <p className="text-xs font-bold text-slate-500 mb-2">印刷する内容</p>

                    <p className="text-sm text-slate-700 mb-2">計算結果（1枚目）</p>

                    {PRINT_OPTIONS.map((option) => (
                        <label
                            key={option.key}
                            className="flex items-start gap-2 rounded-md p-1.5 hover:bg-slate-50 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={options[option.key]}
                                onChange={(e) => onOptionChange(option.key, e.target.checked)}
                                className="mt-0.5"
                            />
                            <span>
                                <span className="block text-sm text-slate-700">{option.label}</span>
                                <span className="block text-xs text-slate-500">{option.hint}</span>
                            </span>
                        </label>
                    ))}

                    <button
                        onClick={handlePrint}
                        className="mt-3 w-full rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                        印刷する
                    </button>
                </div>
            )}
        </div>
    );
};

export default PrintMenu;
