"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";
import { BasicInfo, Financials } from "@/types/valuation";
import { calculateCompanySizeAndL, IndustryType } from "@/lib/valuation-logic";
import { DUMMY_DATA_PATTERNS, DummyDataPatternKey } from "@/lib/dummy-data";

import { Loader2 } from "lucide-react";

interface ValuationBulkInputProps {
  onSubmit: (basicInfo: BasicInfo, financials: Financials) => void;
  onBack?: () => void;
  defaultBasicInfo?: BasicInfo | null;
  defaultFinancials?: Financials | null;
}

export function ValuationBulkInput({
  onSubmit,
  onBack,
  defaultBasicInfo,
  defaultFinancials,
}: ValuationBulkInputProps) {
  const [isPending, startTransition] = useTransition();
  const [profitMethodC, setProfitMethodC] = useState<"auto" | "c1" | "c2">(
    "auto",
  );
  const [profitMethodC1, setProfitMethodC1] = useState<"auto" | "c1" | "c2">(
    "auto",
  );
  const [profitMethodC2, setProfitMethodC2] = useState<"auto" | "c1" | "c2">(
    "auto",
  );

  const [formData, setFormData] = useState({
    // Step 1: 基礎情報
    companyName: "",
    taxationPeriod: "",
    previousPeriod: "",
    capital: "",
    issuedShares: "",

    // Step 2: 会社規模
    employees: "",
    totalAssets: "",
    sales: "",
    industryType: "Wholesale" as IndustryType,

    // Step 3: 自社データ（千円）
    ownDividendPrev: "",
    ownDividend2Prev: "",
    ownDividend3Prev: "",
    ownTaxableIncomePrev: "",
    ownCarryForwardLossPrev: "",
    ownTaxableIncome2Prev: "",
    ownCarryForwardLoss2Prev: "",
    ownTaxableIncome3Prev: "",
    ownCarryForwardLoss3Prev: "",
    ownCapitalPrev: "",
    ownRetainedEarningsPrev: "",
    ownCapital2Prev: "",
    ownRetainedEarnings2Prev: "",

    // Step 4: 類似業種データ
    industryStockPriceCurrent: "",
    industryStockPrice1MonthBefore: "",
    industryStockPrice2MonthsBefore: "",
    industryStockPricePrevYearAverage: "",
    industryDividendsYen: "",
    industryDividendsSen: "",
    industryProfit: "",
    industryBookValue: "",

    // Step 5: 純資産データ（千円）
    assetsBookValue: "",
    assetsInheritanceValue: "",
    landFairValueAddition: "",
    liabilitiesBookValue: "",
    liabilitiesInheritanceValue: "",
  });

  // Update formData when props change
  useEffect(() => {
    if (defaultBasicInfo || defaultFinancials) {
      // Update profit method selections if available
      if (defaultFinancials?.profitMethodC)
        setProfitMethodC(defaultFinancials.profitMethodC);
      if (defaultFinancials?.profitMethodC1)
        setProfitMethodC1(defaultFinancials.profitMethodC1);
      if (defaultFinancials?.profitMethodC2)
        setProfitMethodC2(defaultFinancials.profitMethodC2);

      setFormData({
        // Step 1: 基礎情報
        companyName: defaultBasicInfo?.companyName || "",
        taxationPeriod: defaultBasicInfo?.taxationPeriod || "",
        previousPeriod: defaultBasicInfo?.previousPeriod || "",
        capital: defaultBasicInfo?.capital?.toString() || "",
        issuedShares: defaultBasicInfo?.issuedShares?.toString() || "",

        // Step 2: 会社規模
        employees: defaultBasicInfo?.employees?.toString() || "",
        totalAssets: defaultBasicInfo?.totalAssets
          ? (defaultBasicInfo.totalAssets / 1000).toString()
          : "",
        sales: defaultBasicInfo?.sales
          ? (defaultBasicInfo.sales / 1000).toString()
          : "",
        industryType: (defaultBasicInfo?.industryType ||
          "Wholesale") as IndustryType,

        // Step 3: 自社データ（千円）
        ownDividendPrev: defaultFinancials?.ownDividendPrev?.toString() || "",
        ownDividend2Prev: defaultFinancials?.ownDividend2Prev?.toString() || "",
        ownDividend3Prev: defaultFinancials?.ownDividend3Prev?.toString() || "",
        ownTaxableIncomePrev:
          defaultFinancials?.ownTaxableIncomePrev?.toString() || "",
        ownCarryForwardLossPrev:
          defaultFinancials?.ownCarryForwardLossPrev?.toString() || "",
        ownTaxableIncome2Prev:
          defaultFinancials?.ownTaxableIncome2Prev?.toString() || "",
        ownCarryForwardLoss2Prev:
          defaultFinancials?.ownCarryForwardLoss2Prev?.toString() || "",
        ownTaxableIncome3Prev:
          defaultFinancials?.ownTaxableIncome3Prev?.toString() || "",
        ownCarryForwardLoss3Prev:
          defaultFinancials?.ownCarryForwardLoss3Prev?.toString() || "",
        ownCapitalPrev: defaultFinancials?.ownCapitalPrev?.toString() || "",
        ownRetainedEarningsPrev:
          defaultFinancials?.ownRetainedEarningsPrev?.toString() || "",
        ownCapital2Prev: defaultFinancials?.ownCapital2Prev?.toString() || "",
        ownRetainedEarnings2Prev:
          defaultFinancials?.ownRetainedEarnings2Prev?.toString() || "",

        // Step 4: 類似業種データ
        industryStockPriceCurrent:
          defaultFinancials?.industryStockPriceCurrent?.toString() || "",
        industryStockPrice1MonthBefore:
          defaultFinancials?.industryStockPrice1MonthBefore?.toString() || "",
        industryStockPrice2MonthsBefore:
          defaultFinancials?.industryStockPrice2MonthsBefore?.toString() || "",
        industryStockPricePrevYearAverage:
          defaultFinancials?.industryStockPricePrevYearAverage?.toString() ||
          "",
        industryDividendsYen: defaultFinancials?.industryDividends
          ? Math.floor(defaultFinancials.industryDividends).toString()
          : "",
        industryDividendsSen: defaultFinancials?.industryDividends
          ? ((defaultFinancials.industryDividends % 1) * 10).toString()
          : "",
        industryProfit: defaultFinancials?.industryProfit?.toString() || "",
        industryBookValue:
          defaultFinancials?.industryBookValue?.toString() || "",

        // Step 5: 純資産データ（千円）
        assetsBookValue: defaultFinancials?.assetsBookValue
          ? (defaultFinancials.assetsBookValue / 1000).toString()
          : "",
        assetsInheritanceValue: defaultFinancials?.assetsInheritanceValue
          ? (defaultFinancials.assetsInheritanceValue / 1000).toString()
          : "",
        landFairValueAddition: defaultFinancials?.landFairValueAddition
          ? (defaultFinancials.landFairValueAddition / 1000).toString()
          : "",
        liabilitiesBookValue: defaultFinancials?.liabilitiesBookValue
          ? (defaultFinancials.liabilitiesBookValue / 1000).toString()
          : "",
        liabilitiesInheritanceValue:
          defaultFinancials?.liabilitiesInheritanceValue
            ? (defaultFinancials.liabilitiesInheritanceValue / 1000).toString()
            : "",
      });
    }
  }, [defaultBasicInfo, defaultFinancials]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIndustryChange = (type: IndustryType) => {
    setFormData((prev) => ({
      ...prev,
      industryType: type,
      // 医療法人の場合は配当金額を0にする
      ...(type === "MedicalCorporation" && {
        ownDividendPrev: "0",
        ownDividend2Prev: "0",
        ownDividend3Prev: "0",
        industryDividendsYen: "0",
        industryDividendsSen: "0",
      }),
    }));
  };

  const loadDummyData = (patternKey: DummyDataPatternKey) => {
    const pattern = DUMMY_DATA_PATTERNS[patternKey];
    setFormData({
      companyName: pattern.companyName,
      taxationPeriod: pattern.taxationPeriod,
      previousPeriod: pattern.previousPeriod,
      capital: pattern.capital.toString(),
      issuedShares: pattern.issuedShares.toString(),
      employees: pattern.employees.toString(),
      totalAssets: pattern.totalAssets.toString(),
      sales: pattern.sales.toString(),
      industryType: pattern.industryType,
      ownDividendPrev: pattern.ownDividendPrev.toString(),
      ownDividend2Prev: pattern.ownDividend2Prev.toString(),
      ownDividend3Prev: pattern.ownDividend3Prev.toString(),
      ownTaxableIncomePrev: pattern.ownTaxableIncomePrev.toString(),
      ownCarryForwardLossPrev: pattern.ownCarryForwardLossPrev.toString(),
      ownTaxableIncome2Prev: pattern.ownTaxableIncome2Prev.toString(),
      ownCarryForwardLoss2Prev: pattern.ownCarryForwardLoss2Prev.toString(),
      ownTaxableIncome3Prev: pattern.ownTaxableIncome3Prev.toString(),
      ownCarryForwardLoss3Prev: pattern.ownCarryForwardLoss3Prev.toString(),
      ownCapitalPrev: pattern.ownCapitalPrev.toString(),
      ownRetainedEarningsPrev: pattern.ownRetainedEarningsPrev.toString(),
      ownCapital2Prev: pattern.ownCapital2Prev.toString(),
      ownRetainedEarnings2Prev: pattern.ownRetainedEarnings2Prev.toString(),
      industryStockPriceCurrent: pattern.industryStockPriceCurrent.toString(),
      industryStockPrice1MonthBefore:
        pattern.industryStockPrice1MonthBefore.toString(),
      industryStockPrice2MonthsBefore:
        pattern.industryStockPrice2MonthsBefore.toString(),
      industryStockPricePrevYearAverage:
        pattern.industryStockPricePrevYearAverage.toString(),
      industryDividendsYen: pattern.industryDividendsYen.toString(),
      industryDividendsSen: pattern.industryDividendsSen.toString(),
      industryProfit: pattern.industryProfit.toString(),
      industryBookValue: pattern.industryBookValue.toString(),
      assetsBookValue: pattern.assetsBookValue.toString(),
      assetsInheritanceValue: pattern.assetsInheritanceValue.toString(),
      landFairValueAddition: "0",
      liabilitiesBookValue: pattern.liabilitiesBookValue.toString(),
      liabilitiesInheritanceValue:
        pattern.liabilitiesInheritanceValue.toString(),
    });
  };

  // Extract month from taxationPeriod
  const getTaxationMonth = () => {
    if (!formData.taxationPeriod) return "";
    const match = formData.taxationPeriod.match(/(\d+)月/);
    return match ? match[1] : "";
  };

  const taxationMonth = getTaxationMonth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: 基礎情報
    const capital = Number(formData.capital.replace(/,/g, ""));
    const issuedShares = Number(formData.issuedShares.replace(/,/g, ""));

    // Step 2: 会社規模（千円を円に変換）
    const employees = Number(formData.employees.replace(/,/g, ""));
    const totalAssets = Number(formData.totalAssets.replace(/,/g, "")) * 1000;
    const sales = Number(formData.sales.replace(/,/g, "")) * 1000;

    const { size, lRatio, sizeMultiplier } = calculateCompanySizeAndL({
      employees,
      sales,
      totalAssets,
      industryType: formData.industryType,
    });

    const basicInfo: BasicInfo = {
      companyName: formData.companyName,
      taxationPeriod: formData.taxationPeriod,
      previousPeriod: formData.previousPeriod,
      capital,
      issuedShares,
      employees,
      totalAssets,
      sales,
      industryType: formData.industryType,
      size,
      lRatio,
      sizeMultiplier,
    };

    // Step 3: 自社データの計算
    const capPrev =
      Number(formData.ownCapitalPrev) > 0
        ? Number(formData.ownCapitalPrev)
        : capital;
    const shareCount50 =
      capPrev * 1000 > 0 ? Math.floor((capPrev * 1000) / 50) : issuedShares;

    // 配当（b）
    const divPrev = Number(formData.ownDividendPrev);
    const div2Prev = Number(formData.ownDividend2Prev);
    const div3Prev = Number(formData.ownDividend3Prev);
    const avgDivTotal = ((divPrev + div2Prev) * 1000) / 2;
    const rawOwnDividends = avgDivTotal / shareCount50;
    const ownDividends = Math.floor(rawOwnDividends * 10) / 10;

    // 利益（c）
    const p1 = Number(formData.ownTaxableIncomePrev);
    const l1 = Number(formData.ownCarryForwardLossPrev);
    const p2 = Number(formData.ownTaxableIncome2Prev);
    const l2 = Number(formData.ownCarryForwardLoss2Prev);
    const p3 = Number(formData.ownTaxableIncome3Prev);
    const l3 = Number(formData.ownCarryForwardLoss3Prev);

    const profitPrevAmount = (p1 + l1) * 1000;
    const profit2PrevAmount = (p2 + l2) * 1000;

    const profitPerSharePrev = profitPrevAmount / shareCount50;
    const profitPerShareAvg =
      (profitPrevAmount + profit2PrevAmount) / 2 / shareCount50;

    // Calculate individual profit values
    const profitC1Value = Math.floor(Math.max(0, profitPerSharePrev)); // 単年
    const profitC2Value = Math.floor(Math.max(0, profitPerShareAvg)); // 2年平均

    // c: Main profit value based on selection
    let ownProfit: number;
    if (profitMethodC === "c1") {
      ownProfit = profitC1Value;
    } else if (profitMethodC === "c2") {
      ownProfit = profitC2Value;
    } else {
      // auto: 最も低い値を自動選択
      ownProfit = Math.floor(
        Math.max(0, Math.min(profitPerSharePrev, profitPerShareAvg)),
      );
    }

    // 純資産価額（d）
    const cap1 = Number(formData.ownCapitalPrev);
    const re1 = Number(formData.ownRetainedEarningsPrev);
    const cap2 = Number(formData.ownCapital2Prev);
    const re2 = Number(formData.ownRetainedEarnings2Prev);

    const netAssetPrev = (cap1 + re1) * 1000;
    const rawOwnBookValue = netAssetPrev / shareCount50;
    const ownBookValue = Math.floor(rawOwnBookValue);

    // Additional calculations for b1, b2, c1, c2, d1, d2
    // b1: (直前期 + 2期前) ÷ 2 (same as ownDividends)
    const ownDividendsB1 = ownDividends;

    // b2: (2期前 + 3期前) ÷ 2
    const avgDivTotalB2 = ((div2Prev + div3Prev) * 1000) / 2;
    const rawOwnDividendsB2 = avgDivTotalB2 / shareCount50;
    const ownDividendsB2 = Math.floor(rawOwnDividendsB2 * 10) / 10;

    // c1: Based on user selection
    let ownProfitC1: number;
    if (profitMethodC1 === "c1") {
      ownProfitC1 = profitC1Value;
    } else if (profitMethodC1 === "c2") {
      ownProfitC1 = profitC2Value;
    } else {
      // auto: デフォルトでc1（直前期）
      ownProfitC1 = profitC1Value;
    }

    // c2: Based on user selection
    let ownProfitC2: number;
    if (profitMethodC2 === "c1") {
      ownProfitC2 = profitC1Value;
    } else if (profitMethodC2 === "c2") {
      ownProfitC2 = profitC2Value;
    } else {
      // auto: デフォルトでc2（2年平均）
      ownProfitC2 = profitC2Value;
    }

    // d1: 直前期の純資産価額 (same as ownBookValue)
    const ownBookValueD1 = ownBookValue;

    // d2: 2期前の純資産価額
    const netAsset2Prev = (cap2 + re2) * 1000;
    const rawOwnBookValueD2 = netAsset2Prev / shareCount50;
    const ownBookValueD2 = Math.floor(rawOwnBookValueD2);

    // 比準要素数0の会社の判定: b1, c1, c2 がすべて0の場合
    const isZeroElementCompany =
      ownDividendsB1 === 0 && ownProfitC1 === 0 && ownProfitC2 === 0;

    // Step 4: 類似業種データ
    const industryStockPriceCurrent = Number(
      formData.industryStockPriceCurrent,
    );
    const industryStockPrice1MonthBefore = Number(
      formData.industryStockPrice1MonthBefore,
    );
    const industryStockPrice2MonthsBefore = Number(
      formData.industryStockPrice2MonthsBefore,
    );
    const industryStockPricePrevYearAverage = Number(
      formData.industryStockPricePrevYearAverage,
    );

    const divYen = Number(formData.industryDividendsYen);
    const divSen = Number(formData.industryDividendsSen);
    const industryDividends = divYen + divSen * 0.1;

    const industryProfit = Number(formData.industryProfit);
    const industryBookValue = Number(formData.industryBookValue);

    // Step 5: 純資産データ（千円を円に変換）
    const assetsBookValue = Number(formData.assetsBookValue) * 1000;
    const assetsInheritanceValue = formData.assetsInheritanceValue
      ? Number(formData.assetsInheritanceValue) * 1000
      : undefined;
    const landFairValueAddition = formData.landFairValueAddition
      ? Number(formData.landFairValueAddition) * 1000
      : undefined;
    const liabilitiesBookValue = Number(formData.liabilitiesBookValue) * 1000;
    const liabilitiesInheritanceValue = formData.liabilitiesInheritanceValue
      ? Number(formData.liabilitiesInheritanceValue) * 1000
      : undefined;

    const financials: Financials = {
      // 自社データの結果
      ownDividends,
      ownProfit,
      ownBookValue,
      // Additional Results (b1, b2, c1, c2, d1, d2)
      ownDividendsB1,
      ownDividendsB2,
      ownProfitC1,
      ownProfitC2,
      ownBookValueD1,
      ownBookValueD2,
      // Special classification
      isZeroElementCompany,
      // Profit calculation method selections
      profitMethodC,
      profitMethodC1,
      profitMethodC2,

      // 自社データの保存用
      ownDividendPrev: divPrev,
      ownDividend2Prev: div2Prev,
      ownDividend3Prev: div3Prev,
      ownTaxableIncomePrev: p1,
      ownCarryForwardLossPrev: l1,
      ownTaxableIncome2Prev: p2,
      ownCarryForwardLoss2Prev: l2,
      ownTaxableIncome3Prev: p3,
      ownCarryForwardLoss3Prev: l3,
      ownCapitalPrev: cap1,
      ownRetainedEarningsPrev: re1,
      ownCapital2Prev: cap2,
      ownRetainedEarnings2Prev: re2,

      // 類似業種データ
      industryStockPriceCurrent,
      industryStockPrice1MonthBefore,
      industryStockPrice2MonthsBefore,
      industryStockPricePrevYearAverage,
      industryDividends,
      industryProfit,
      industryBookValue,

      // 純資産データ
      assetsBookValue,
      assetsInheritanceValue,
      landFairValueAddition,
      liabilitiesBookValue,
      liabilitiesInheritanceValue,
    };

    startTransition(() => {
      onSubmit(basicInfo, financials);
    });
  };

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2 text-primary">一覧入力</h2>
          <p className="text-muted-foreground mb-4">
            すべての情報を一度に入力してください。単位はステップバイステップと同じです。
          </p>

          {/* ダミーデータ読み込みボタン */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-900">
                テスト用ダミーデータ
              </span>
              <span className="text-xs text-amber-700">
                （動作確認用のサンプルデータを自動入力）
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadDummyData("pattern1")}
                className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
              >
                パターン1: 中会社（製造業）
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => loadDummyData("pattern2")}
                className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
              >
                パターン2: 小会社（小売業）
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => loadDummyData("pattern3")}
                className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
              >
                パターン3: 大会社（卸売業）
              </Button>
            </div>
          </div>
        </div>

        {/* Step 1: 基礎情報 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-primary pb-2">
            Step 1: 基礎情報
          </h3>

          <div className="space-y-2">
            <Label htmlFor="companyName">会社名</Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="例: 株式会社サンプル"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxationPeriod">課税時期</Label>
              <Input
                id="taxationPeriod"
                name="taxationPeriod"
                type="date"
                value={formData.taxationPeriod}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previousPeriod">直前期末</Label>
              <Input
                id="previousPeriod"
                name="previousPeriod"
                type="date"
                value={formData.previousPeriod}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capital">資本金等の額</Label>
              <div className="relative">
                <NumberInput
                  id="capital"
                  name="capital"
                  value={formData.capital}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="pr-12 text-right"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  千円
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuedShares">発行済株式数</Label>
              <div className="relative">
                <NumberInput
                  id="issuedShares"
                  name="issuedShares"
                  value={formData.issuedShares}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="pr-12 text-right"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  株
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: 会社規模 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-primary pb-2">
            Step 2: 会社規模
          </h3>

          <div className="space-y-2">
            <Label>業種区分</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleIndustryChange("Wholesale")}
                className={`p-3 rounded-lg border-2 transition-all font-bold ${
                  formData.industryType === "Wholesale"
                    ? "border-primary bg-white text-primary shadow-sm"
                    : "border-transparent bg-muted text-muted-foreground hover:bg-white hover:text-primary"
                }`}
              >
                卸売業
              </button>
              <button
                type="button"
                onClick={() => handleIndustryChange("RetailService")}
                className={`p-3 rounded-lg border-2 transition-all font-bold ${
                  formData.industryType === "RetailService"
                    ? "border-primary bg-white text-primary shadow-sm"
                    : "border-transparent bg-muted text-muted-foreground hover:bg-white hover:text-primary"
                }`}
              >
                小売・サービス業
              </button>
              <button
                type="button"
                onClick={() => handleIndustryChange("MedicalCorporation")}
                className={`p-3 rounded-lg border-2 transition-all font-bold ${
                  formData.industryType === "MedicalCorporation"
                    ? "border-primary bg-white text-primary shadow-sm"
                    : "border-transparent bg-muted text-muted-foreground hover:bg-white hover:text-primary"
                }`}
              >
                医療法人
              </button>
              <button
                type="button"
                onClick={() => handleIndustryChange("Other")}
                className={`p-3 rounded-lg border-2 transition-all font-bold ${
                  formData.industryType === "Other"
                    ? "border-primary bg-white text-primary shadow-sm"
                    : "border-transparent bg-muted text-muted-foreground hover:bg-white hover:text-primary"
                }`}
              >
                それ以外
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employees">従業員数</Label>
              <div className="relative">
                <NumberInput
                  id="employees"
                  name="employees"
                  value={formData.employees}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="pr-12 text-right"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  人
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAssets">総資産価額（帳簿価額）</Label>
              <div className="relative">
                <NumberInput
                  id="totalAssets"
                  name="totalAssets"
                  value={formData.totalAssets}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="pr-12 text-right"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  千円
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales">直前期の売上高</Label>
              <div className="relative">
                <NumberInput
                  id="sales"
                  name="sales"
                  value={formData.sales}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="pr-12 text-right"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                  千円
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: 自社データ */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-primary pb-2">
            Step 3: 自社データ
          </h3>

          <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <Label>配当金額 (b)</Label>
              {formData.industryType === "MedicalCorporation" && (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  医療法人は配当不可
                </span>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ownDividendPrev" className="text-xs">
                  直前期
                </Label>
                <div className="relative">
                  <NumberInput
                    id="ownDividendPrev"
                    name="ownDividendPrev"
                    placeholder="0"
                    onChange={handleChange}
                    value={formData.ownDividendPrev}
                    required
                    disabled={formData.industryType === "MedicalCorporation"}
                    className={`pr-12 text-right ${formData.industryType === "MedicalCorporation" ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    千円
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownDividend2Prev" className="text-xs">
                  2期前
                </Label>
                <div className="relative">
                  <NumberInput
                    id="ownDividend2Prev"
                    name="ownDividend2Prev"
                    placeholder="0"
                    onChange={handleChange}
                    value={formData.ownDividend2Prev}
                    required
                    disabled={formData.industryType === "MedicalCorporation"}
                    className={`pr-12 text-right ${formData.industryType === "MedicalCorporation" ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    千円
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownDividend3Prev" className="text-xs">
                  3期前
                </Label>
                <div className="relative">
                  <NumberInput
                    id="ownDividend3Prev"
                    name="ownDividend3Prev"
                    placeholder="0"
                    onChange={handleChange}
                    value={formData.ownDividend3Prev}
                    required
                    disabled={formData.industryType === "MedicalCorporation"}
                    className={`pr-12 text-right ${formData.industryType === "MedicalCorporation" ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                    千円
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
            <Label>利益金額 (c)</Label>

            {/* Selection for c */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-[80px]">c の選択:</span>
              <div className="flex gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setProfitMethodC("auto")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC === "auto"
                      ? "bg-primary text-white"
                      : "bg-white text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  自動
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC("c1")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC === "c1"
                      ? "bg-primary text-white"
                      : "bg-white text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  直前
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC("c2")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC === "c2"
                      ? "bg-primary text-white"
                      : "bg-white text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  2年平均
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                (自動: 低いほう)
              </span>
            </div>

            {/* Selection for c1 */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-[80px]">c1 の選択:</span>
              <div className="flex gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setProfitMethodC1("auto")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC1 === "auto"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  自動
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC1("c1")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC1 === "c1"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  直前
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC1("c2")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC1 === "c2"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  2年平均
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                (自動: 高いほう)
              </span>
            </div>

            {/* Selection for c2 */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-[80px]">c2 の選択:</span>
              <div className="flex gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => setProfitMethodC2("auto")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC2 === "auto"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  自動
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC2("c1")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC2 === "c1"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  2期前
                </button>
                <button
                  type="button"
                  onClick={() => setProfitMethodC2("c2")}
                  className={`px-3 py-1 text-xs rounded transition-colors min-w-[60px] ${
                    profitMethodC2 === "c2"
                      ? "bg-green-600 text-white"
                      : "bg-white text-muted-foreground hover:bg-green-100"
                  }`}
                >
                  2年平均
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                (自動: 高いほう)
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">直前期</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownTaxableIncomePrev"
                      className="text-[10px] text-muted-foreground"
                    >
                      利益
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownTaxableIncomePrev"
                        name="ownTaxableIncomePrev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownTaxableIncomePrev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownCarryForwardLossPrev"
                      className="text-[10px] text-muted-foreground"
                    >
                      繰越欠損金の控除額
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownCarryForwardLossPrev"
                        name="ownCarryForwardLossPrev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownCarryForwardLossPrev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">2期前</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownTaxableIncome2Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      利益
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownTaxableIncome2Prev"
                        name="ownTaxableIncome2Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownTaxableIncome2Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownCarryForwardLoss2Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      繰越欠損金の控除額
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownCarryForwardLoss2Prev"
                        name="ownCarryForwardLoss2Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownCarryForwardLoss2Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">3期前</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownTaxableIncome3Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      利益
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownTaxableIncome3Prev"
                        name="ownTaxableIncome3Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownTaxableIncome3Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownCarryForwardLoss3Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      繰越欠損金の控除額
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownCarryForwardLoss3Prev"
                        name="ownCarryForwardLoss3Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownCarryForwardLoss3Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
            <Label>純資産価額 (d)</Label>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">直前期</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownCapitalPrev"
                      className="text-[10px] text-muted-foreground"
                    >
                      資本金
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownCapitalPrev"
                        name="ownCapitalPrev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownCapitalPrev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownRetainedEarningsPrev"
                      className="text-[10px] text-muted-foreground"
                    >
                      繰越利益剰余金
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownRetainedEarningsPrev"
                        name="ownRetainedEarningsPrev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownRetainedEarningsPrev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">2期前</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownCapital2Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      資本金
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownCapital2Prev"
                        name="ownCapital2Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownCapital2Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="ownRetainedEarnings2Prev"
                      className="text-[10px] text-muted-foreground"
                    >
                      繰越利益剰余金
                    </Label>
                    <div className="relative">
                      <NumberInput
                        id="ownRetainedEarnings2Prev"
                        name="ownRetainedEarnings2Prev"
                        placeholder="0"
                        onChange={handleChange}
                        value={formData.ownRetainedEarnings2Prev}
                        required
                        className="pr-12 text-right bg-white"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: 類似業種データ */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-primary pb-2">
            Step 4: 類似業種データ
          </h3>

          <div className="space-y-2">
            <Label>A: 株価（円）</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  前年平均
                </Label>
                <div className="relative">
                  <NumberInput
                    name="industryStockPricePrevYearAverage"
                    value={formData.industryStockPricePrevYearAverage}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-8 text-right"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    円
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {taxationMonth
                    ? `課税時期の月（${taxationMonth}月）`
                    : "課税時期の月"}
                </Label>
                <div className="relative">
                  <NumberInput
                    name="industryStockPriceCurrent"
                    value={formData.industryStockPriceCurrent}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-8 text-right"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    円
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">前月</Label>
                <div className="relative">
                  <NumberInput
                    name="industryStockPrice1MonthBefore"
                    value={formData.industryStockPrice1MonthBefore}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-8 text-right"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    円
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">前々月</Label>
                <div className="relative">
                  <NumberInput
                    name="industryStockPrice2MonthsBefore"
                    value={formData.industryStockPrice2MonthsBefore}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-8 text-right"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    円
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>B: 配当金額</Label>
                {formData.industryType === "MedicalCorporation" && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    医療法人は配当不可
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <NumberInput
                    name="industryDividendsYen"
                    value={formData.industryDividendsYen}
                    onChange={handleChange}
                    placeholder="0"
                    disabled={formData.industryType === "MedicalCorporation"}
                    className={`pr-8 text-right ${formData.industryType === "MedicalCorporation" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    円
                  </span>
                </div>
                <div className="w-20 relative">
                  <NumberInput
                    name="industryDividendsSen"
                    value={formData.industryDividendsSen}
                    onChange={handleChange}
                    placeholder="0"
                    disabled={formData.industryType === "MedicalCorporation"}
                    className={`pr-8 text-right ${formData.industryType === "MedicalCorporation" ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                    銭
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industryProfit">C: 利益金額</Label>
              <div className="relative">
                <NumberInput
                  id="industryProfit"
                  name="industryProfit"
                  value={formData.industryProfit}
                  onChange={handleChange}
                  placeholder="0"
                  className="pr-8 text-right"
                />
                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                  円
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industryBookValue">D: 簿価純資産価額</Label>
              <div className="relative">
                <NumberInput
                  id="industryBookValue"
                  name="industryBookValue"
                  value={formData.industryBookValue}
                  onChange={handleChange}
                  placeholder="0"
                  className="pr-8 text-right"
                />
                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                  円
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5: 純資産データ */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold border-b-2 border-primary pb-2">
            Step 5: 純資産データ
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4 p-4 rounded-lg bg-primary/5">
              <Label className="font-bold underline">資産の部（千円）</Label>
              <div className="space-y-2">
                <Label
                  htmlFor="assetsInheritanceValue"
                  className="text-sm font-bold"
                >
                  相続税評価額
                </Label>
                <div className="relative">
                  <NumberInput
                    id="assetsInheritanceValue"
                    name="assetsInheritanceValue"
                    value={formData.assetsInheritanceValue}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-12 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                    千円
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="landFairValueAddition"
                  className="text-sm font-bold"
                >
                  土地の時価を加算（相続税評価額*0.25）
                </Label>
                <div className="relative">
                  <NumberInput
                    id="landFairValueAddition"
                    name="landFairValueAddition"
                    value={formData.landFairValueAddition}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-12 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                    千円
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetsBookValue" className="text-sm">
                  帳簿価額
                </Label>
                <div className="relative">
                  <NumberInput
                    id="assetsBookValue"
                    name="assetsBookValue"
                    value={formData.assetsBookValue}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    className="pr-12 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                    千円
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-lg bg-primary/5">
              <Label className="font-bold underline">負債の部（千円）</Label>
              <div className="space-y-2">
                <Label
                  htmlFor="liabilitiesInheritanceValue"
                  className="text-sm font-bold"
                >
                  相続税評価額
                </Label>
                <div className="relative">
                  <NumberInput
                    id="liabilitiesInheritanceValue"
                    name="liabilitiesInheritanceValue"
                    value={formData.liabilitiesInheritanceValue}
                    onChange={handleChange}
                    placeholder="0"
                    className="pr-12 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                    千円
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="liabilitiesBookValue" className="text-sm">
                  帳簿価額
                </Label>
                <div className="relative">
                  <NumberInput
                    id="liabilitiesBookValue"
                    name="liabilitiesBookValue"
                    value={formData.liabilitiesBookValue}
                    onChange={handleChange}
                    placeholder="0"
                    required
                    className="pr-12 text-right"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                    千円
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          {onBack && (
            <Button type="button" variant="outline" size="lg" onClick={onBack}>
              トップに戻る
            </Button>
          )}
          <Button type="submit" size="lg" className="min-w-[200px] ml-auto" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                計算中...
              </>
            ) : (
              "評価額を算出"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
