import { BasicInfo } from "@/types/valuation";
import { getCompanySizeLabel, getIndustryTypeLabel } from "@/lib/valuation-logic";
import { PrintSection } from "./PrintSection";

interface PrintStep2CompanySizeProps {
  basicInfo: BasicInfo;
}

export function PrintStep2CompanySize({ basicInfo }: PrintStep2CompanySizeProps) {
  return (
    <PrintSection title="Step 2: 会社規模の判定">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-sm text-black">従業員数</div>
          <div className="font-semibold">
            {(basicInfo.employees || 0).toLocaleString()}人
          </div>
        </div>
        <div>
          <div className="text-sm text-black">総資産価額</div>
          <div className="font-semibold">
            {((basicInfo.totalAssets || 0) / 1000).toLocaleString()}千円
          </div>
        </div>
        <div>
          <div className="text-sm text-black">売上高</div>
          <div className="font-semibold">
            {((basicInfo.sales || 0) / 1000).toLocaleString()}千円
          </div>
        </div>
        <div>
          <div className="text-sm text-black">業種区分</div>
          <div className="font-semibold">
            {getIndustryTypeLabel(basicInfo.industryType)}
          </div>
        </div>
        <div>
          <div className="text-sm text-black">会社規模判定</div>
          <div className="font-semibold text-black">
            {getCompanySizeLabel(basicInfo.size)}
          </div>
        </div>
        <div>
          <div className="text-sm text-black">斟酌率</div>
          <div className="font-semibold text-black">
            {basicInfo.sizeMultiplier || 0.7}
          </div>
        </div>
      </div>
    </PrintSection>
  );
}
