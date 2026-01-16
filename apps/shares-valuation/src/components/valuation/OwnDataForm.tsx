"use client";

import { useState } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { NumberInput } from "@/components/ui/NumberInput";

interface OwnDataFormProps {
  basicInfo: BasicInfo | Partial<BasicInfo>;
  onBack: () => void;
  onNext: (data: Partial<Financials>) => void;
  defaultValues?: Partial<Financials>;
}

// 計算結果の型定義
interface CalculationResult {
  shareCount50: number;
  ownDividends: number;
  ownProfit: number;
  ownBookValue: number;
  ownDividendsB1: number;
  ownDividendsB2: number;
  ownProfitC1: number;
  ownProfitC2: number;
  ownBookValueD1: number;
  ownBookValueD2: number;
  isZeroElementCompany: boolean;
  isOneElementCompany: boolean;
  profitC1Val: number;
  profitC2Val: number;
  p1Val: number;
  p2Val: number;
  p3Val: number;
}

export function OwnDataForm({
  basicInfo,
  onBack,
  onNext,
  defaultValues,
}: OwnDataFormProps) {
  const isMedicalCorporation = basicInfo.industryType === "MedicalCorporation";

  const [profitMethodC, setProfitMethodC] = useState<"auto" | "c1" | "c2">(
    defaultValues?.profitMethodC || "auto",
  );
  const [profitMethodC1, setProfitMethodC1] = useState<"auto" | "c1" | "c2">(
    defaultValues?.profitMethodC1 || "auto",
  );
  const [profitMethodC2, setProfitMethodC2] = useState<"auto" | "c1" | "c2">(
    defaultValues?.profitMethodC2 || "auto",
  );
  const [formData, setFormData] = useState({
    ownDividendPrev: isMedicalCorporation
      ? "0"
      : defaultValues?.ownDividendPrev?.toString() || "",
    ownDividend2Prev: isMedicalCorporation
      ? "0"
      : defaultValues?.ownDividend2Prev?.toString() || "",
    ownDividend3Prev: isMedicalCorporation
      ? "0"
      : defaultValues?.ownDividend3Prev?.toString() || "",
    ownTaxableIncomePrev: defaultValues?.ownTaxableIncomePrev?.toString() || "",
    ownCarryForwardLossPrev:
      defaultValues?.ownCarryForwardLossPrev?.toString() || "",
    ownTaxableIncome2Prev:
      defaultValues?.ownTaxableIncome2Prev?.toString() || "",
    ownCarryForwardLoss2Prev:
      defaultValues?.ownCarryForwardLoss2Prev?.toString() || "",
    ownTaxableIncome3Prev:
      defaultValues?.ownTaxableIncome3Prev?.toString() || "",
    ownCarryForwardLoss3Prev:
      defaultValues?.ownCarryForwardLoss3Prev?.toString() || "",
    ownCapitalPrev: defaultValues?.ownCapitalPrev?.toString() || "",
    ownCapital2Prev: defaultValues?.ownCapital2Prev?.toString() || "",
    ownRetainedEarningsPrev:
      defaultValues?.ownRetainedEarningsPrev?.toString() || "",
    ownRetainedEarnings2Prev:
      defaultValues?.ownRetainedEarnings2Prev?.toString() || "",
  });

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 共通の計算ロジック
  const calculateValues = (): CalculationResult => {
    const issuedShares = basicInfo.issuedShares || 1;
    const capPrev =
      Number(formData.ownCapitalPrev) > 0
        ? Number(formData.ownCapitalPrev)
        : basicInfo.capital || 0;
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

    // 配当計算
    const avgDivTotal = ((divPrev + div2Prev) * 1000) / 2;
    const ownDividends = Math.floor((avgDivTotal / shareCount50) * 10) / 10;
    const ownDividendsB1 = ownDividends;
    const avgDivTotalB2 = ((div2Prev + div3Prev) * 1000) / 2;
    const ownDividendsB2 = Math.floor((avgDivTotalB2 / shareCount50) * 10) / 10;

    // 利益計算
    const profitPrevAmount = (p1 + l1) * 1000;
    const profit2PrevAmount = (p2 + l2) * 1000;
    const profit3PrevAmount = (p3 + l3) * 1000;
    const profitPerSharePrev = profitPrevAmount / shareCount50;
    const profitPerShareAvg =
      (profitPrevAmount + profit2PrevAmount) / 2 / shareCount50;

    // c2用の計算: 2期前と(2期前+3期前)/2
    const profitPerShare2Prev = profit2PrevAmount / shareCount50;
    const profitPerShareAvg2And3 =
      (profit2PrevAmount + profit3PrevAmount) / 2 / shareCount50;

    const profitC1Val = Math.floor(Math.max(0, profitPerSharePrev));
    const profitC2Val = Math.floor(Math.max(0, profitPerShareAvg));
    const profitC2_2PrevVal = Math.floor(Math.max(0, profitPerShare2Prev));
    const profitC2_AvgVal = Math.floor(Math.max(0, profitPerShareAvg2And3));

    let ownProfit: number;
    if (profitMethodC === "c1") {
      ownProfit = profitC1Val;
    } else if (profitMethodC === "c2") {
      ownProfit = profitC2Val;
    } else {
      ownProfit = Math.floor(
        Math.max(0, Math.min(profitPerSharePrev, profitPerShareAvg)),
      );
    }

    let ownProfitC1: number;
    if (profitMethodC1 === "c1") {
      ownProfitC1 = profitC1Val;
    } else if (profitMethodC1 === "c2") {
      ownProfitC1 = profitC2Val;
    } else {
      // 自動: 直前期と2年平均の高いほう
      ownProfitC1 = Math.max(profitC1Val, profitC2Val);
    }

    let ownProfitC2: number;
    if (profitMethodC2 === "c1") {
      // c1を選択: 2期前
      ownProfitC2 = profitC2_2PrevVal;
    } else if (profitMethodC2 === "c2") {
      // c2を選択: 2期前と3期前の平均
      ownProfitC2 = profitC2_AvgVal;
    } else {
      // 自動: 2期前と(2期前+3期前)/2の高いほう
      ownProfitC2 = Math.max(profitC2_2PrevVal, profitC2_AvgVal);
    }

    // 純資産計算
    const netAssetPrev = (cap1 + re1) * 1000;
    const ownBookValue = Math.floor(netAssetPrev / shareCount50);
    const ownBookValueD1 = ownBookValue;
    const netAsset2Prev = (cap2 + re2) * 1000;
    const ownBookValueD2 = Math.floor(netAsset2Prev / shareCount50);

    // 評価方法判定
    const isZeroElementCompany =
      ownDividendsB1 === 0 && ownProfitC1 === 0 && ownBookValueD1 === 0;
    const countZeroInB1C1D1 = [
      ownDividendsB1,
      ownProfitC1,
      ownBookValueD1,
    ].filter((v) => v === 0).length;
    const countZeroInB2C2D2 = [
      ownDividendsB2,
      ownProfitC2,
      ownBookValueD2,
    ].filter((v) => v === 0).length;
    const isOneElementCompany =
      !isZeroElementCompany && countZeroInB1C1D1 >= 2 && countZeroInB2C2D2 >= 2;

    return {
      shareCount50,
      ownDividends,
      ownProfit,
      ownBookValue,
      ownDividendsB1,
      ownDividendsB2,
      ownProfitC1,
      ownProfitC2,
      ownBookValueD1,
      ownBookValueD2,
      isZeroElementCompany,
      isOneElementCompany,
      profitC1Val,
      profitC2Val,
      p1Val: profitPrevAmount,
      p2Val: profit2PrevAmount,
      p3Val: profit3PrevAmount,
    };
  };

  // 共通のデータ準備関数
  const prepareFormData = () => {
    const calculated = calculateValues();

    return {
      ownDividends: calculated.ownDividends,
      ownProfit: calculated.ownProfit,
      ownBookValue: calculated.ownBookValue,
      ownDividendsB1: calculated.ownDividendsB1,
      ownDividendsB2: calculated.ownDividendsB2,
      ownProfitC1: calculated.ownProfitC1,
      ownProfitC2: calculated.ownProfitC2,
      ownBookValueD1: calculated.ownBookValueD1,
      ownBookValueD2: calculated.ownBookValueD2,
      isZeroElementCompany: calculated.isZeroElementCompany,
      isOneElementCompany: calculated.isOneElementCompany,
      profitMethodC,
      profitMethodC1,
      profitMethodC2,
      ownDividendPrev: Number(formData.ownDividendPrev),
      ownDividend2Prev: Number(formData.ownDividend2Prev),
      ownDividend3Prev: Number(formData.ownDividend3Prev),
      ownTaxableIncomePrev: Number(formData.ownTaxableIncomePrev),
      ownCarryForwardLossPrev: Number(formData.ownCarryForwardLossPrev),
      ownTaxableIncome2Prev: Number(formData.ownTaxableIncome2Prev),
      ownCarryForwardLoss2Prev: Number(formData.ownCarryForwardLoss2Prev),
      ownTaxableIncome3Prev: Number(formData.ownTaxableIncome3Prev),
      ownCarryForwardLoss3Prev: Number(formData.ownCarryForwardLoss3Prev),
      ownCapitalPrev: Number(formData.ownCapitalPrev),
      ownRetainedEarningsPrev: Number(formData.ownRetainedEarningsPrev),
      ownCapital2Prev: Number(formData.ownCapital2Prev),
      ownRetainedEarnings2Prev: Number(formData.ownRetainedEarnings2Prev),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(prepareFormData());
  };

  const handleCopyFromPrev = () => {
    setFormData((prev) => ({
      ...prev,
      // Dividends
      ownDividend2Prev: prev.ownDividendPrev,
      ownDividend3Prev: prev.ownDividendPrev,
      // Taxable Income
      ownTaxableIncome2Prev: prev.ownTaxableIncomePrev,
      ownTaxableIncome3Prev: prev.ownTaxableIncomePrev,
      // Carry Forward Loss
      ownCarryForwardLoss2Prev: prev.ownCarryForwardLossPrev,
      ownCarryForwardLoss3Prev: prev.ownCarryForwardLossPrev,
      // Capital
      ownCapital2Prev: prev.ownCapitalPrev,
      // Retained Earnings
      ownRetainedEarnings2Prev: prev.ownRetainedEarningsPrev,
    }));
  };

  const handleBack = () => {
    // Save data before going back
    onNext(prepareFormData());
    // Navigate back
    onBack();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-primary">
          自社の実績データ入力 (Step 3/8)
        </h2>
        <p className="text-muted-foreground">
          自社の配当と、利益、純資産を入力してください。
        </p>
      </div>

      <Card className="p-6 border-secondary/20 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    ✎
                  </div>
                  <h3 className="text-lg font-bold text-blue-900">
                    入力：自社のデータ
                  </h3>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyFromPrev}
                  className="text-xs"
                >
                  直前期データを複写
                </Button>
              </div>

              {/* Dividends */}
              <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label>配当金額 (b)</Label>
                  {isMedicalCorporation && (
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
                        disabled={isMedicalCorporation}
                        className={`pr-12 text-right ${isMedicalCorporation ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
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
                        disabled={isMedicalCorporation}
                        className={`pr-12 text-right ${isMedicalCorporation ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
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
                        disabled={isMedicalCorporation}
                        className={`pr-12 text-right ${isMedicalCorporation ? "bg-gray-100 cursor-not-allowed" : "bg-white"}`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                        千円
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit */}
              <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                <Label>利益金額 (c)</Label>

                {/* Selection for c */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-[80px]">
                    c の選択:
                  </span>
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
                  <span className="text-muted-foreground w-[80px]">
                    c1 の選択:
                  </span>
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
                  <span className="text-muted-foreground w-[80px]">
                    c2 の選択:
                  </span>
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

              {/* Book Value */}
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

            {/* Real-time Preview */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-green-300">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                  📊
                </div>
                <h3 className="text-lg font-bold text-green-900">
                  計算結果：リアルタイムプレビュー (1株50円換算)
                </h3>
              </div>
              <div className="space-y-3 bg-white p-4 rounded-lg text-sm">
                {(() => {
                  const calculated = calculateValues();
                  const { shareCount50, p1Val, p2Val, p3Val } = calculated;
                  const b = calculated.ownDividends;
                  const b1 = calculated.ownDividendsB1;
                  const b2 = calculated.ownDividendsB2;
                  const c = calculated.ownProfit;
                  const c1 = calculated.ownProfitC1;
                  const c2 = calculated.ownProfitC2;
                  const d = calculated.ownBookValue;
                  const d1 = calculated.ownBookValueD1;
                  const d2 = calculated.ownBookValueD2;

                  const cMethod =
                    profitMethodC === "c1"
                      ? "直前"
                      : profitMethodC === "c2"
                        ? "2年平均"
                        : "自動";
                  const c1Method =
                    profitMethodC1 === "c1"
                      ? "直前"
                      : profitMethodC1 === "c2"
                        ? "2年平均"
                        : "自動";
                  const c2Method =
                    profitMethodC2 === "c1"
                      ? "2期前"
                      : profitMethodC2 === "c2"
                        ? "2年平均"
                        : "自動";

                  return (
                    <div className="space-y-4">
                      {/* 上段: b, c, d */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground whitespace-nowrap">
                            1株当たりの配当金額 (b)
                          </span>

                          <div className="text-[10px] text-muted-foreground px-2 text-right flex-1">
                            ({Number(formData.ownDividendPrev).toLocaleString()}{" "}
                            +{" "}
                            {Number(formData.ownDividend2Prev).toLocaleString()}
                            )千円 ÷ 2 ÷ {shareCount50.toLocaleString()}株 =
                          </div>

                          <div className="text-right whitespace-nowrap">
                            <span className="font-bold">
                              {b.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                            </span>
                            <span className="text-xs ml-1 text-muted-foreground">
                              円
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground whitespace-nowrap">
                            1株当たりの利益金額 (c)
                          </span>

                          <div className="text-[10px] text-muted-foreground px-2 text-right flex-1">
                            {cMethod}: 直前:{(p1Val / 1000).toLocaleString()},
                            2年平均:{((p1Val + p2Val) / 2000).toLocaleString()}
                            千円 ÷ {shareCount50.toLocaleString()}株 =
                          </div>

                          <div className="text-right whitespace-nowrap">
                            <span className="font-bold">
                              {c.toLocaleString()}
                            </span>
                            <span className="text-xs ml-1 text-muted-foreground">
                              円
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground whitespace-nowrap">
                            1株当たりの純資産価額 (d)
                          </span>

                          <div className="text-[10px] text-muted-foreground px-2 text-right flex-1">
                            ({Number(formData.ownCapitalPrev).toLocaleString()}{" "}
                            +{" "}
                            {Number(
                              formData.ownRetainedEarningsPrev,
                            ).toLocaleString()}
                            )千円 ÷ {shareCount50.toLocaleString()}株 =
                          </div>

                          <div className="text-right whitespace-nowrap">
                            <span className="font-bold">
                              {d.toLocaleString()}
                            </span>
                            <span className="text-xs ml-1 text-muted-foreground">
                              円
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 下段: b1, b2, c1, c2, d1, d2 */}
                      <div className="border-t border-dashed border-primary/20 pt-3 space-y-2">
                        <h5 className="text-xs font-semibold text-black mb-2">
                          比準要素数1の会社・比準要素数0の会社の判定要素
                        </h5>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの配当金額）b1:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              (
                              {Number(
                                formData.ownDividendPrev,
                              ).toLocaleString()}{" "}
                              +{" "}
                              {Number(
                                formData.ownDividend2Prev,
                              ).toLocaleString()}
                              )千円 ÷ 2 ÷ {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${b1 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {b1.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              円
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの配当金額）b2:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              (
                              {Number(
                                formData.ownDividend2Prev,
                              ).toLocaleString()}{" "}
                              +{" "}
                              {Number(
                                formData.ownDividend3Prev,
                              ).toLocaleString()}
                              )千円 ÷ 2 ÷ {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${b2 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {b2.toLocaleString(undefined, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              円
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-green-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの利益金額）c1:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              {c1Method}: 直前:{(p1Val / 1000).toLocaleString()}
                              , 2年平均:
                              {((p1Val + p2Val) / 2000).toLocaleString()}千円 ÷{" "}
                              {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${c1 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {c1.toLocaleString()}円
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-green-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの利益金額）c2:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              {c2Method}: 2期前:
                              {(p2Val / 1000).toLocaleString()}, 2年平均:
                              {((p2Val + p3Val) / 2000).toLocaleString()}千円 ÷{" "}
                              {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${c2 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {c2.toLocaleString()}円
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-purple-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの純資産価額）d1:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              (
                              {Number(formData.ownCapitalPrev).toLocaleString()}{" "}
                              +{" "}
                              {Number(
                                formData.ownRetainedEarningsPrev,
                              ).toLocaleString()}
                              )千円 ÷ {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${d1 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {d1.toLocaleString()}円
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-purple-50/50 p-2 rounded text-xs">
                            <span className="text-black whitespace-nowrap">
                              （1株当たりの純資産価額）d2:
                            </span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">
                              (
                              {Number(
                                formData.ownCapital2Prev,
                              ).toLocaleString()}{" "}
                              +{" "}
                              {Number(
                                formData.ownRetainedEarnings2Prev,
                              ).toLocaleString()}
                              )千円 ÷ {shareCount50.toLocaleString()}株 =
                            </div>
                            <span
                              className={`font-semibold whitespace-nowrap ${d2 === 0 ? "text-red-600" : "text-black"}`}
                            >
                              {d2.toLocaleString()}円
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 評価方法の判定と警告表示（優先順位: 比準要素数0 → 比準要素数1 → 一般） */}
                      {(() => {
                        // 比準要素数0の会社の判定（切り捨て後の表示値を使用して判定）
                        const isZeroElem = b1 <= 0 && c1 <= 0 && d1 <= 0;

                        if (isZeroElem) {
                          return (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 mt-3">
                              <p className="text-xs font-bold text-amber-900">
                                ⚠️ 比準要素数0の会社 (b1=0, c1=0, d1=0)
                              </p>
                              <p className="text-[10px] text-amber-800 mt-1">
                                純資産価額
                              </p>
                            </div>
                          );
                        }

                        // 比準要素数1の会社の判定（比準要素数0に該当しない場合のみ）
                        // 切り捨て後の表示値を使用して判定
                        const zeroCountB1C1D1 = [b1, c1, d1].filter(
                          (v) => v <= 0,
                        ).length;
                        const zeroCountB2C2D2 = [b2, c2, d2].filter(
                          (v) => v <= 0,
                        ).length;
                        const isOneElem =
                          zeroCountB1C1D1 >= 2 && zeroCountB2C2D2 >= 2;

                        if (isOneElem) {
                          return (
                            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mt-3">
                              <p className="text-xs font-bold text-orange-900">
                                ⚠️ 比準要素数1の会社
                              </p>
                              <p className="text-[10px] text-orange-800 mt-1">
                                b1, c1, d1のいずれか2つが「0」かつ b2, c2,
                                d2の2以上が「0」
                              </p>
                              <p className="text-[10px] text-orange-800 mt-2">
                                次のうちいずれか低い方の金額
                              </p>
                              <p className="text-[10px] text-orange-800 pl-3">
                                イ　純資産価格
                              </p>
                              <p className="text-[10px] text-orange-800 pl-3">
                                ロ　（ 類似業種比準価格 × 0.25 ）＋（ 純資産価格
                                × 0.75 ）
                              </p>
                            </div>
                          );
                        }

                        // 一般の評価会社（該当する場合は表示）
                        return (
                          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mt-3">
                            <p className="text-xs font-bold text-blue-900">
                              ✓ 一般の評価会社
                            </p>
                            <p className="text-[10px] text-blue-800 mt-1">
                              標準的な類似業種比準方式で評価します
                            </p>
                          </div>
                        );
                      })()}

                      <div className="text-[10px] text-right text-muted-foreground pt-2 border-t border-dashed border-primary/10">
                        ※ {shareCount50.toLocaleString()}株 (50円換算) で計算
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleBack}
            >
              戻る
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-[2] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              次へ進む
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
