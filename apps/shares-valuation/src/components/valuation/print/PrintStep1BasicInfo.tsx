import { BasicInfo } from "@/types/valuation";
import { PrintSection } from "./PrintSection";

interface PrintStep1BasicInfoProps {
  basicInfo: BasicInfo;
}

export function PrintStep1BasicInfo({ basicInfo }: PrintStep1BasicInfoProps) {
  return (
    <PrintSection title="Step 1: 基本情報">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-black">会社名:</span>
          <span className="font-semibold ml-1">{basicInfo.companyName}</span>
        </div>
        <div>
          <span className="text-black">課税時期:</span>
          <span className="font-semibold ml-1">{basicInfo.taxationPeriod}</span>
        </div>
        <div>
          <span className="text-black">直前期末:</span>
          <span className="font-semibold ml-1">{basicInfo.previousPeriod}</span>
        </div>
        <div>
          <span className="text-black">資本金:</span>
          <span className="font-semibold ml-1">{(basicInfo.capital || 0).toLocaleString()}千円</span>
        </div>
        <div>
          <span className="text-black">発行済株式数:</span>
          <span className="font-semibold ml-1">{(basicInfo.issuedShares || 0).toLocaleString()}株</span>
        </div>
      </div>

      {/* 計算結果プレビュー */}
      <div className="border border-gray-300 p-2 mt-2 space-y-2">
        <h3 className="font-bold border-b border-gray-300 pb-1 mb-1">計算結果：リアルタイムプレビュー</h3>

        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-black">1株当たりの資本金額</span>
            <span className="font-semibold">
              {((basicInfo.capital || 0) * 1000 / (basicInfo.issuedShares || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}円
            </span>
          </div>
          <div className="text-xs text-black">
            計算式: {(basicInfo.capital || 0).toLocaleString()}千円 ÷ {(basicInfo.issuedShares || 1).toLocaleString()}株
          </div>
        </div>

        <div className="space-y-1 border-t border-gray-300 pt-1">
          <div className="flex justify-between">
            <span className="text-black">1株50円とした場合の発行済株式数</span>
            <span className="font-semibold">
              {(((basicInfo.capital || 0) * 1000) / 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}株
            </span>
          </div>
          <div className="text-xs text-black">
            計算式: {(basicInfo.capital || 0).toLocaleString()}千円 ÷ 50円
          </div>
        </div>

        <div className="space-y-1 border-t border-gray-300 pt-1">
          <div className="flex justify-between">
            <span className="text-black">50円株での換算係数</span>
            <span className="font-semibold">
              {((basicInfo.issuedShares || 1) / (((basicInfo.capital || 0) * 1000) / 50)).toLocaleString(undefined, { maximumFractionDigits: 3 })}
            </span>
          </div>
          <div className="text-xs text-black">
            計算式: {(basicInfo.issuedShares || 1).toLocaleString()}株 ÷ {(((basicInfo.capital || 0) * 1000) / 50).toLocaleString(undefined, { maximumFractionDigits: 0 })}株
          </div>
        </div>
      </div>
    </PrintSection>
  );
}
