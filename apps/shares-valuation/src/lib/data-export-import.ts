import { BasicInfo, Financials } from "@/types/valuation";

interface ValuationData {
  basicInfo: BasicInfo;
  financials: Financials;
  exportDate: string;
  version: string;
}

/**
 * Export valuation data as JSON file
 */
export function exportValuationData(
  basicInfo: BasicInfo,
  financials: Financials,
): void {
  const data: ValuationData = {
    basicInfo,
    financials,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement("a");
  link.href = url;

  // Generate filename with company name and date
  const companyName = basicInfo.companyName || "評価会社";
  const date = new Date().toISOString().split("T")[0];
  link.download = `${companyName}_株価評価データ_${date}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import valuation data from JSON file
 */
export function importValuationData(
  file: File,
): Promise<ValuationData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ValuationData;

        // Validate data structure
        if (!data.basicInfo || !data.financials) {
          throw new Error("無効なデータ形式です");
        }

        resolve(data);
      } catch {
        reject(new Error("JSONファイルの読み込みに失敗しました"));
      }
    };

    reader.onerror = () => {
      reject(new Error("ファイルの読み込みに失敗しました"));
    };

    reader.readAsText(file);
  });
}

/**
 * Save data to sessionStorage
 */
export function saveToSessionStorage(
  basicInfo: BasicInfo,
  financials: Financials,
): void {
  sessionStorage.setItem("valuationBasicInfo", JSON.stringify(basicInfo));
  sessionStorage.setItem("valuationFinancials", JSON.stringify(financials));
}

/**
 * Load data from sessionStorage
 */
export function loadFromSessionStorage(): {
  basicInfo: BasicInfo | null;
  financials: Financials | null;
} {
  const savedBasic = sessionStorage.getItem("valuationBasicInfo");
  const savedFinancials = sessionStorage.getItem("valuationFinancials");

  return {
    basicInfo: savedBasic ? JSON.parse(savedBasic) : null,
    financials: savedFinancials ? JSON.parse(savedFinancials) : null,
  };
}
