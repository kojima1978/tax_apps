import { PrintSection } from "./print/PrintSection";

export interface ComparisonDetail {
  name: string;
  value: number;
}

export interface StepResult {
  finalValue: number;
  comparableValue: number;
  netAssetPerShare: number;
  lRatio: number;
  comparisonDetails: ComparisonDetail[];
}

interface PrintValuationStepProps {
  title: string;
  result: StepResult;
  /** シミュレーション条件など追加表示 */
  extraHeader?: React.ReactNode;
}

/** PrintAllSteps の Step 6/7/8 で共通の評価結果表示パターン */
export function PrintValuationStep({ title, result, extraHeader }: PrintValuationStepProps) {
  return (
    <PrintSection title={title}>
      <div className="space-y-4">
        {extraHeader}

        <div className="border border-gray-300 p-2">
          <div className="mb-1">採用した評価方式</div>
          <div className="font-bold">
            {result.comparisonDetails.length > 0
              ? result.comparisonDetails[0].name
              : ""}
          </div>
        </div>

        <div className="border border-gray-300 p-2 space-y-3">
          <h3 className="font-bold border-b pb-2">評価方式の比較</h3>
          {result.comparisonDetails.map((detail, index) => (
            <div
              key={index}
              className={`p-2 ${index === 0 ? "border-2 border-gray-300" : "border border-gray-300"}`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{detail.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{detail.value.toLocaleString()}円</div>
                  {index === 0 && (
                    <div className="font-semibold mt-1">
                      ← 最有利（採用）
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-300 p-2">
            <div className="mb-1">類似業種比準価額 (S)</div>
            <div className="font-bold">
              {result.comparableValue.toLocaleString()}円
            </div>
          </div>
          <div className="border border-gray-300 p-2">
            <div className="mb-1">純資産価額 (N)</div>
            <div className="font-bold">
              {result.netAssetPerShare.toLocaleString()}円
            </div>
          </div>
        </div>

        <div className="border border-gray-300 p-2 space-y-2">
          <h3 className="font-bold border-b pb-2">Lの割合</h3>
          <div className="flex justify-between items-center">
            <span>適用されるLの割合:</span>
            <span className="font-bold">{result.lRatio}</span>
          </div>
        </div>

        <div className="border-2 border-gray-300 p-4">
          <div className="text-center space-y-3">
            <div>
              {title.includes("シミュレーション")
                ? "シミュレーション評価額（1株あたり）"
                : title.includes("法人税")
                  ? "法人税法上の時価（1株あたり）"
                  : "相続税評価額（1株あたり）"}
            </div>
            <div className="font-black">
              {result.finalValue.toLocaleString()}円
            </div>
          </div>
        </div>
      </div>
    </PrintSection>
  );
}
