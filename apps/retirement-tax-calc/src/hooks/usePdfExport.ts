import { useCallback, useState, type RefObject } from "react";

export const usePdfExport = (containerRef: RefObject<HTMLDivElement | null>) => {
    const [isExporting, setIsExporting] = useState(false);

    const handlePdf = useCallback(async () => {
        const element = containerRef.current;
        if (!element || isExporting) return;
        setIsExporting(true);
        element.classList.add("pdf-generating");
        try {
            const html2pdf = (await import("html2pdf.js")).default;
            await html2pdf()
                .set({
                    margin: 8,
                    filename: "退職金税額計算.pdf",
                    image: { type: "jpeg", quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                })
                .from(element)
                .save();
        } finally {
            element.classList.remove("pdf-generating");
            setIsExporting(false);
        }
    }, [containerRef, isExporting]);

    return { handlePdf, isExporting };
};
