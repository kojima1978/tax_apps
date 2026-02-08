import { StepResult } from "@/components/valuation/PrintValuationStep";
import { PrintSection } from "./PrintSection";

interface PrintComparisonTableProps {
  step6Result: StepResult;
  step7Result: StepResult;
  step8Result: StepResult;
  totalShares: number;
}

export function PrintComparisonTable({ step6Result, step7Result, step8Result, totalShares }: PrintComparisonTableProps) {
  return (
    <PrintSection title="評価額比較表">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 px-4 font-bold">項目</th>
              <th className="text-center py-3 px-4">
                <div className="font-bold text-black">相続税評価額</div>
                <div className="text-xs font-normal text-black">Step 6</div>
              </th>
              <th className="text-center py-3 px-4">
                <div className="font-bold text-black">法人税法上の時価</div>
                <div className="text-xs font-normal text-black">Step 7</div>
              </th>
              <th className="text-center py-3 px-4">
                <div className="font-bold text-black">シミュレーション</div>
                <div className="text-xs font-normal text-black">Step 8</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3 px-4 font-semibold">評価額（1株）</td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {step6Result.finalValue.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {step7Result.finalValue.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {step8Result.finalValue.toLocaleString()}円
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4 font-semibold">評価額（総額）</td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {(step6Result.finalValue * totalShares).toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {(step7Result.finalValue * totalShares).toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4 font-bold text-black">
                {(step8Result.finalValue * totalShares).toLocaleString()}円
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4 font-semibold">類似業種比準価額</td>
              <td className="text-center py-3 px-4">
                {step6Result.comparableValue.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4">
                {step7Result.comparableValue.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4">
                {step8Result.comparableValue.toLocaleString()}円
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-3 px-4 font-semibold">純資産価額</td>
              <td className="text-center py-3 px-4">
                {step6Result.netAssetPerShare.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4">
                {step7Result.netAssetPerShare.toLocaleString()}円
              </td>
              <td className="text-center py-3 px-4">
                {step8Result.netAssetPerShare.toLocaleString()}円
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 font-semibold">Lの割合</td>
              <td className="text-center py-3 px-4">{step6Result.lRatio}</td>
              <td className="text-center py-3 px-4">{step7Result.lRatio}</td>
              <td className="text-center py-3 px-4">{step8Result.lRatio}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PrintSection>
  );
}
