"use client";

import { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { NumberInputWithUnit } from "@/components/ui/NumberInputWithUnit";
import { PeriodInputPair } from "@/components/ui/PeriodInputPair";
import { ProfitMethodSelector } from "@/components/ui/ProfitMethodSelector";
import { IndustryTypeSelector } from "@/components/ui/IndustryTypeSelector";
import { BasicInfo, Financials } from "@/types/valuation";
import { calculateCompanySizeAndL, calculateOwnDataComplete, IndustryType, splitDividend, combineDividend } from "@/lib/valuation-logic";
import { MedicalCorporationBadge } from "@/components/ui/MedicalCorporationBadge";
import { parseNumericInput } from "@/lib/format-utils";
import { getTaxationMonth } from "@/lib/date-utils";
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
          ? splitDividend(defaultFinancials.industryDividends).yen.toString()
          : "",
        industryDividendsSen: defaultFinancials?.industryDividends
          ? splitDividend(defaultFinancials.industryDividends).sen.toString()
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

  const taxationMonth = getTaxationMonth(formData.taxationPeriod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: 基礎情報
    const capital = parseNumericInput(formData.capital);
    const issuedShares = parseNumericInput(formData.issuedShares);

    // Step 2: 会社規模（千円を円に変換）
    const employees = parseNumericInput(formData.employees);
    const totalAssets = parseNumericInput(formData.totalAssets) * 1000;
    const sales = parseNumericInput(formData.sales) * 1000;

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

    const divPrev = Number(formData.ownDividendPrev);
    const div2Prev = Number(formData.ownDividend2Prev);
    const div3Prev = Number(formData.ownDividend3Prev);
    const p1 = Number(formData.ownTaxableIncomePrev);
    const l1 = Number(formData.ownCarryForwardLossPrev);
    const p2 = Number(formData.ownTaxableIncome2Prev);
    const l2 = Number(formData.ownCarryForwardLoss2Prev);
    const p3 = Number(formData.ownTaxableIncome3Prev);
    const l3 = Number(formData.ownCarryForwardLoss3Prev);
    const cap1 = Number(formData.ownCapitalPrev);
    const re1 = Number(formData.ownRetainedEarningsPrev);
    const cap2 = Number(formData.ownCapital2Prev);
    const re2 = Number(formData.ownRetainedEarnings2Prev);

    const ownData = calculateOwnDataComplete({
      divPrev, div2Prev, div3Prev,
      p1, l1, p2, l2, p3, l3,
      cap1, re1, cap2, re2,
      shareCount50, profitMethodC, profitMethodC1, profitMethodC2,
    });

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

    const industryDividends = combineDividend(Number(formData.industryDividendsYen), Number(formData.industryDividendsSen));

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
      ownDividends: ownData.ownDividends,
      ownProfit: ownData.ownProfit,
      ownBookValue: ownData.ownBookValue,
      ownDividendsB1: ownData.ownDividendsB1,
      ownDividendsB2: ownData.ownDividendsB2,
      ownProfitC1: ownData.ownProfitC1,
      ownProfitC2: ownData.ownProfitC2,
      ownBookValueD1: ownData.ownBookValueD1,
      ownBookValueD2: ownData.ownBookValueD2,
      isZeroElementCompany: ownData.isZeroElementCompany,
      isOneElementCompany: ownData.isOneElementCompany,
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
              <NumberInputWithUnit
                id="capital"
                name="capital"
                value={formData.capital}
                onChange={handleChange}
                unit="千円"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuedShares">発行済株式数</Label>
              <NumberInputWithUnit
                id="issuedShares"
                name="issuedShares"
                value={formData.issuedShares}
                onChange={handleChange}
                unit="株"
                required
              />
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
            <IndustryTypeSelector value={formData.industryType} onChange={handleIndustryChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employees">従業員数</Label>
              <NumberInputWithUnit
                id="employees"
                name="employees"
                value={formData.employees}
                onChange={handleChange}
                unit="人"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalAssets">総資産価額（帳簿価額）</Label>
              <NumberInputWithUnit
                id="totalAssets"
                name="totalAssets"
                value={formData.totalAssets}
                onChange={handleChange}
                unit="千円"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales">直前期の売上高</Label>
              <NumberInputWithUnit
                id="sales"
                name="sales"
                value={formData.sales}
                onChange={handleChange}
                unit="千円"
                required
              />
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
                <MedicalCorporationBadge />
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ownDividendPrev" className="text-xs">
                  直前期
                </Label>
                <NumberInputWithUnit
                  id="ownDividendPrev"
                  name="ownDividendPrev"
                  onChange={handleChange}
                  value={formData.ownDividendPrev}
                  unit="千円"
                  required
                  disabled={formData.industryType === "MedicalCorporation"}
                  className={formData.industryType !== "MedicalCorporation" ? "bg-white" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownDividend2Prev" className="text-xs">
                  2期前
                </Label>
                <NumberInputWithUnit
                  id="ownDividend2Prev"
                  name="ownDividend2Prev"
                  onChange={handleChange}
                  value={formData.ownDividend2Prev}
                  unit="千円"
                  required
                  disabled={formData.industryType === "MedicalCorporation"}
                  className={formData.industryType !== "MedicalCorporation" ? "bg-white" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownDividend3Prev" className="text-xs">
                  3期前
                </Label>
                <NumberInputWithUnit
                  id="ownDividend3Prev"
                  name="ownDividend3Prev"
                  onChange={handleChange}
                  value={formData.ownDividend3Prev}
                  unit="千円"
                  required
                  disabled={formData.industryType === "MedicalCorporation"}
                  className={formData.industryType !== "MedicalCorporation" ? "bg-white" : ""}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
            <Label>利益金額 (c)</Label>

            <ProfitMethodSelector label="c の選択:" value={profitMethodC} onChange={setProfitMethodC} hint="(自動: 低いほう)" />
            <ProfitMethodSelector label="c1 の選択:" value={profitMethodC1} onChange={setProfitMethodC1} color="green" hint="(自動: 高いほう)" />
            <ProfitMethodSelector label="c2 の選択:" value={profitMethodC2} onChange={setProfitMethodC2} color="green" c1Label="2期前" hint="(自動: 高いほう)" />

            <div className="space-y-3">
              <PeriodInputPair periodLabel="直前期" onChange={handleChange} required
                left={{ name: "ownTaxableIncomePrev", label: "利益", value: formData.ownTaxableIncomePrev }}
                right={{ name: "ownCarryForwardLossPrev", label: "繰越欠損金の控除額", value: formData.ownCarryForwardLossPrev }}
              />
              <PeriodInputPair periodLabel="2期前" onChange={handleChange} required
                left={{ name: "ownTaxableIncome2Prev", label: "利益", value: formData.ownTaxableIncome2Prev }}
                right={{ name: "ownCarryForwardLoss2Prev", label: "繰越欠損金の控除額", value: formData.ownCarryForwardLoss2Prev }}
              />
              <PeriodInputPair periodLabel="3期前" onChange={handleChange} required
                left={{ name: "ownTaxableIncome3Prev", label: "利益", value: formData.ownTaxableIncome3Prev }}
                right={{ name: "ownCarryForwardLoss3Prev", label: "繰越欠損金の控除額", value: formData.ownCarryForwardLoss3Prev }}
              />
            </div>
          </div>

          <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
            <Label>純資産価額 (d)</Label>

            <div className="space-y-3">
              <PeriodInputPair periodLabel="直前期" onChange={handleChange} required
                left={{ name: "ownCapitalPrev", label: "資本金", value: formData.ownCapitalPrev }}
                right={{ name: "ownRetainedEarningsPrev", label: "繰越利益剰余金", value: formData.ownRetainedEarningsPrev }}
              />
              <PeriodInputPair periodLabel="2期前" onChange={handleChange} required
                left={{ name: "ownCapital2Prev", label: "資本金", value: formData.ownCapital2Prev }}
                right={{ name: "ownRetainedEarnings2Prev", label: "繰越利益剰余金", value: formData.ownRetainedEarnings2Prev }}
              />
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
                <NumberInputWithUnit
                  name="industryStockPricePrevYearAverage"
                  value={formData.industryStockPricePrevYearAverage}
                  onChange={handleChange}
                  unit="円"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  {taxationMonth
                    ? `課税時期の月（${taxationMonth}月）`
                    : "課税時期の月"}
                </Label>
                <NumberInputWithUnit
                  name="industryStockPriceCurrent"
                  value={formData.industryStockPriceCurrent}
                  onChange={handleChange}
                  unit="円"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">前月</Label>
                <NumberInputWithUnit
                  name="industryStockPrice1MonthBefore"
                  value={formData.industryStockPrice1MonthBefore}
                  onChange={handleChange}
                  unit="円"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">前々月</Label>
                <NumberInputWithUnit
                  name="industryStockPrice2MonthsBefore"
                  value={formData.industryStockPrice2MonthsBefore}
                  onChange={handleChange}
                  unit="円"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>B: 配当金額</Label>
                {formData.industryType === "MedicalCorporation" && (
                  <MedicalCorporationBadge />
                )}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <NumberInputWithUnit
                    name="industryDividendsYen"
                    value={formData.industryDividendsYen}
                    onChange={handleChange}
                    unit="円"
                    disabled={formData.industryType === "MedicalCorporation"}
                  />
                </div>
                <div className="w-20">
                  <NumberInputWithUnit
                    name="industryDividendsSen"
                    value={formData.industryDividendsSen}
                    onChange={handleChange}
                    unit="銭"
                    disabled={formData.industryType === "MedicalCorporation"}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industryProfit">C: 利益金額</Label>
              <NumberInputWithUnit
                id="industryProfit"
                name="industryProfit"
                value={formData.industryProfit}
                onChange={handleChange}
                unit="円"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industryBookValue">D: 簿価純資産価額</Label>
              <NumberInputWithUnit
                id="industryBookValue"
                name="industryBookValue"
                value={formData.industryBookValue}
                onChange={handleChange}
                unit="円"
              />
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
                <NumberInputWithUnit
                  id="assetsInheritanceValue"
                  name="assetsInheritanceValue"
                  value={formData.assetsInheritanceValue}
                  onChange={handleChange}
                  unit="千円"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="landFairValueAddition"
                  className="text-sm font-bold"
                >
                  土地の時価を加算（相続税評価額*0.25）
                </Label>
                <NumberInputWithUnit
                  id="landFairValueAddition"
                  name="landFairValueAddition"
                  value={formData.landFairValueAddition}
                  onChange={handleChange}
                  unit="千円"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetsBookValue" className="text-sm">
                  帳簿価額
                </Label>
                <NumberInputWithUnit
                  id="assetsBookValue"
                  name="assetsBookValue"
                  value={formData.assetsBookValue}
                  onChange={handleChange}
                  unit="千円"
                  required
                />
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
                <NumberInputWithUnit
                  id="liabilitiesInheritanceValue"
                  name="liabilitiesInheritanceValue"
                  value={formData.liabilitiesInheritanceValue}
                  onChange={handleChange}
                  unit="千円"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liabilitiesBookValue" className="text-sm">
                  帳簿価額
                </Label>
                <NumberInputWithUnit
                  id="liabilitiesBookValue"
                  name="liabilitiesBookValue"
                  value={formData.liabilitiesBookValue}
                  onChange={handleChange}
                  unit="千円"
                  required
                />
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
