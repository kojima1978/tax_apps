"use client";

import { useState, useMemo } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { Card } from "@/components/ui/Card";
import { FormNavigationButtons } from "@/components/ui/FormNavigationButtons";
import { Label } from "@/components/ui/Label";
import { NumberInputWithUnit } from "@/components/ui/NumberInputWithUnit";
import { TrendArrow } from "@/components/ui/TrendArrow";
import {
  getTaxationMonth,
  getPreviousYear,
  getMonthOffset,
} from "@/lib/date-utils";

import { calculateDetailedSimilarIndustryMethod, getMultiplier, splitDividend, combineDividend } from "@/lib/valuation-logic";
import { FormSectionHeader } from "@/components/ui/FormSectionHeader";
import { MedicalCorporationBadge } from "@/components/ui/MedicalCorporationBadge";
import { ResultPreviewHeader } from "@/components/ui/ResultPreviewHeader";

interface IndustryDataFormProps {
  basicInfo: BasicInfo;
  onBack: () => void;
  onNext: (data: Partial<Financials>) => void;
  defaultValues?: Partial<Financials>;
}

export function IndustryDataForm({
  basicInfo,
  onBack,
  onNext,
  defaultValues,
}: IndustryDataFormProps) {
  const isMedicalCorporation = basicInfo.industryType === "MedicalCorporation";

  // Initializer to split dividend into yen and sen if it exists
  const initDiv = defaultValues?.industryDividends || 0;
  const { yen: initDivYen, sen: initDivSen } = splitDividend(initDiv);

  const [formData, setFormData] = useState(() => ({
    // Industry (A) - 4 Indicators
    industryStockPriceCurrent:
      defaultValues?.industryStockPriceCurrent?.toString() || "",
    industryStockPrice1MonthBefore:
      defaultValues?.industryStockPrice1MonthBefore?.toString() || "",
    industryStockPrice2MonthsBefore:
      defaultValues?.industryStockPrice2MonthsBefore?.toString() || "",
    industryStockPricePrevYearAverage:
      defaultValues?.industryStockPricePrevYearAverage?.toString() || "",

    // Industry (B) - Split into Yen and Sen (1 decimal place) - 医療法人の場合は0
    industryDividendsYen: isMedicalCorporation
      ? "0"
      : initDiv > 0
        ? initDivYen.toString()
        : "",
    industryDividendsSen: isMedicalCorporation
      ? "0"
      : initDiv > 0
        ? initDivSen.toString()
        : "",

    // Industry (C, D)
    industryProfit: defaultValues?.industryProfit?.toString() || "",
    industryBookValue: defaultValues?.industryBookValue?.toString() || "",
  }));

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 共通のデータ準備関数
  const prepareFormData = () => {
    // Parse Inputs
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

    return {
      industryStockPriceCurrent,
      industryStockPrice1MonthBefore,
      industryStockPrice2MonthsBefore,
      industryStockPricePrevYearAverage,
      industryDividends,
      industryProfit,
      industryBookValue,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(prepareFormData());
  };

  const handleBack = () => {
    // Save data before going back
    onNext(prepareFormData());
    // Navigate back
    onBack();
  };

  // 採用株価（最小値）のメモ化
  const minStockPrice = useMemo(() => {
    const values = [
      Number(formData.industryStockPriceCurrent),
      Number(formData.industryStockPrice1MonthBefore),
      Number(formData.industryStockPrice2MonthsBefore),
      Number(formData.industryStockPricePrevYearAverage),
    ].filter((v) => v > 0);
    return values.length === 0 ? 0 : Math.min(...values);
  }, [formData.industryStockPriceCurrent, formData.industryStockPrice1MonthBefore, formData.industryStockPrice2MonthsBefore, formData.industryStockPricePrevYearAverage]);

  // 類似業種比準価額のメモ化
  const details = useMemo(() => {
    if (minStockPrice === 0) return null;

    const B_ind = combineDividend(Number(formData.industryDividendsYen), Number(formData.industryDividendsSen));
    const C_ind = Number(formData.industryProfit);
    const D_ind = Number(formData.industryBookValue);

    if (C_ind === 0 || D_ind === 0) return null;
    if (!isMedicalCorporation && B_ind === 0) return null;

    const b_own = defaultValues?.ownDividends || 0;
    const c_own = defaultValues?.ownProfit || 0;
    const d_own = defaultValues?.ownBookValue || 0;

    return calculateDetailedSimilarIndustryMethod(
      minStockPrice, B_ind, C_ind, D_ind, b_own, c_own, d_own, getMultiplier(basicInfo), basicInfo,
    );
  }, [minStockPrice, formData.industryDividendsYen, formData.industryDividendsSen, formData.industryProfit, formData.industryBookValue, isMedicalCorporation, defaultValues, basicInfo]);

  const taxationMonth = getTaxationMonth(basicInfo.taxationPeriod);
  const oneMonthBefore = getMonthOffset(basicInfo.taxationPeriod, 1);
  const twoMonthsBefore = getMonthOffset(basicInfo.taxationPeriod, 2);
  const prevYear = getPreviousYear(basicInfo.taxationPeriod);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-primary">
          類似業種データの入力 (Step 4/8)
        </h2>
        <p className="text-muted-foreground">
          国税庁公表の類似業種比準価額算定上の数値を入力します。
        </p>
      </div>

      <div className="text-center">
        <a
          href="https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/r07/2506/pdf/list_all.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          令和7年分の類似業種比準価額計算上の業種目及び業種目別株価等について（法令解釈通達）
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      <Card className="p-6 border-secondary/20 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Comparable Company Data */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200 space-y-4">
              <FormSectionHeader title="入力：同業者のデータ (国税庁公表値)" />

              {/* A: Stock Price */}
              <div className="space-y-2 bg-primary/5 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <Label>A: 株価</Label>
                  {minStockPrice > 0 && (
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      採用株価: {minStockPrice.toLocaleString()}円
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label
                      htmlFor="industryStockPricePrevYearAverage"
                      className="text-xs text-muted-foreground"
                    >
                      {prevYear ? `前年平均（${prevYear}）` : "前年平均"}
                    </Label>
                    <NumberInputWithUnit
                      id="industryStockPricePrevYearAverage"
                      name="industryStockPricePrevYearAverage"
                      value={formData.industryStockPricePrevYearAverage}
                      onChange={handleChange}
                      unit="円"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="industryStockPrice2MonthsBefore"
                      className="text-xs text-muted-foreground"
                    >
                      {twoMonthsBefore
                        ? `前々月（${twoMonthsBefore}月）`
                        : "前々月"}
                    </Label>
                    <NumberInputWithUnit
                      id="industryStockPrice2MonthsBefore"
                      name="industryStockPrice2MonthsBefore"
                      value={formData.industryStockPrice2MonthsBefore}
                      onChange={handleChange}
                      unit="円"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="industryStockPrice1MonthBefore"
                      className="text-xs text-muted-foreground"
                    >
                      {oneMonthBefore ? `前月（${oneMonthBefore}月）` : "前月"}
                    </Label>
                    <NumberInputWithUnit
                      id="industryStockPrice1MonthBefore"
                      name="industryStockPrice1MonthBefore"
                      value={formData.industryStockPrice1MonthBefore}
                      onChange={handleChange}
                      unit="円"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="industryStockPriceCurrent"
                      className="text-xs text-muted-foreground"
                    >
                      {taxationMonth
                        ? `課税時期の月（${taxationMonth}月）`
                        : "課税時期の月"}
                    </Label>
                    <NumberInputWithUnit
                      id="industryStockPriceCurrent"
                      name="industryStockPriceCurrent"
                      value={formData.industryStockPriceCurrent}
                      onChange={handleChange}
                      unit="円"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 bg-primary/5 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label>B: 配当</Label>
                    {isMedicalCorporation && <MedicalCorporationBadge />}
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <NumberInputWithUnit
                        name="industryDividendsYen"
                        value={formData.industryDividendsYen}
                        onChange={handleChange}
                        unit="円"
                        disabled={isMedicalCorporation}
                        className={isMedicalCorporation ? "" : "bg-white"}
                      />
                    </div>
                    <div className="w-24">
                      <NumberInputWithUnit
                        name="industryDividendsSen"
                        value={formData.industryDividendsSen}
                        onChange={handleChange}
                        unit="銭"
                        disabled={isMedicalCorporation}
                        className={isMedicalCorporation ? "" : "bg-white"}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 bg-primary/5 p-4 rounded-lg">
                  <Label htmlFor="industryProfit">C: 利益</Label>
                  <NumberInputWithUnit
                    id="industryProfit"
                    name="industryProfit"
                    value={formData.industryProfit}
                    onChange={handleChange}
                    unit="円"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2 bg-primary/5 p-4 rounded-lg">
                  <Label htmlFor="industryBookValue">D: 純資産</Label>
                  <NumberInputWithUnit
                    id="industryBookValue"
                    name="industryBookValue"
                    value={formData.industryBookValue}
                    onChange={handleChange}
                    unit="円"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Result Preview */}
          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
            <ResultPreviewHeader title="計算結果：比準価額の計算結果 (リアルタイムプレビュー)" className="mb-4 pb-2 border-b border-green-400" />

            {details ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div
                    className={`bg-white/50 p-2 rounded relative overflow-hidden ${isMedicalCorporation ? "opacity-50" : ""}`}
                  >
                    <div className="text-muted-foreground">
                      配当比準 (b/B)
                      {isMedicalCorporation && (
                        <div className="text-[9px] text-amber-700">
                          (医療法人は除外)
                        </div>
                      )}
                    </div>
                    <div className="font-bold flex items-center justify-center gap-1">
                      {details.ratios.b.toFixed(1)} /{" "}
                      {details.ratios.B.toFixed(1)} ={" "}
                      {details.ratios.ratioB.toFixed(2)}
                      {!isMedicalCorporation && (
                        <TrendArrow ratio={details.ratios.ratioB} />
                      )}
                    </div>
                  </div>
                  <div className="bg-white/50 p-2 rounded relative overflow-hidden">
                    <div className="text-muted-foreground">利益比準 (c/C)</div>
                    <div className="font-bold flex items-center justify-center gap-1">
                      {details.ratios.c.toFixed(0)} /{" "}
                      {details.ratios.C.toFixed(0)} ={" "}
                      {details.ratios.ratioC.toFixed(2)}
                      <TrendArrow ratio={details.ratios.ratioC} />
                    </div>
                  </div>
                  <div className="bg-white/50 p-2 rounded relative overflow-hidden">
                    <div className="text-muted-foreground">
                      純資産比準 (d/D)
                    </div>
                    <div className="font-bold flex items-center justify-center gap-1">
                      {details.ratios.d.toFixed(0)} /{" "}
                      {details.ratios.D.toFixed(0)} ={" "}
                      {details.ratios.ratioD.toFixed(2)}
                      <TrendArrow ratio={details.ratios.ratioD} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <span>
                    比準割合: {details.ratios.avgRatio.toFixed(2)}
                    {isMedicalCorporation && (
                      <span className="text-amber-700 ml-1">
                        （利益比準 + 純資産比準）÷ 2
                      </span>
                    )}
                    {!isMedicalCorporation && (
                      <span className="ml-1">
                        （配当比準 + 利益比準 + 純資産比準）÷ 3
                      </span>
                    )}
                  </span>
                </div>

                {/* 会社規模に応じた斟酌率の表示 */}
                <div className="mt-3 mb-2 p-3 bg-white/50 rounded-lg border border-primary/10">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 text-center">
                    会社規模に応じた斟酌率
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {([["Big", "大会社", "0.7"], ["Medium", "中会社", "0.6"], ["Small", "小会社", "0.5"]] as const).map(([sizeKey, label, rate]) => (
                      <div
                        key={sizeKey}
                        className={`p-2 rounded text-center transition-colors ${basicInfo.size === sizeKey ? "bg-primary/20 text-primary font-semibold border border-primary/30" : "bg-white/30 text-gray-400 border border-gray-200"}`}
                      >
                        <div className="font-normal text-xs">{label}</div>
                        <div className="mt-1">{rate}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 原株換算 */}
                <div className="mb-2 p-3 bg-white/50 rounded-lg border border-primary/10">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 text-center">
                    原株換算
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span className="font-bold text-black">
                      {(
                        ((basicInfo.capital || 0) * 1000) /
                        (basicInfo.issuedShares || 1)
                      ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      円
                    </span>
                    <span className="text-black">（1株当たりの資本金額）</span>
                    <span className="text-black">/</span>
                    <span className="font-bold text-black">50円</span>
                    <span className="text-black">=</span>
                    <span className="font-bold text-black">
                      {details.conversion.ratio.toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-primary/20 pt-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      類似業種比準価額
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {details.A.toLocaleString()}(株価) ×{" "}
                      {details.ratios.avgRatio.toFixed(2)}(比準割合) ×{" "}
                      {details.multiplier}(斟酌率) ×{" "}
                      {details.conversion.ratio.toLocaleString(undefined, {
                        maximumFractionDigits: 3,
                      })}
                      (原株換算)
                    </p>
                  </div>
                  <p className="text-2xl font-black text-primary">
                    {details.value.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      円
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-4">
                必要な数値を全て入力すると計算結果が表示されます
              </div>
            )}
          </div>
          {/* ... */}

          <FormNavigationButtons onBack={handleBack} />
        </form>
      </Card>
    </div>
  );
}
