"use client";

import { useState, useMemo } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormNavigationButtons } from "@/components/ui/FormNavigationButtons";
import { Label } from "@/components/ui/Label";
import { NumberInputWithUnit } from "@/components/ui/NumberInputWithUnit";
import { PeriodInputPair } from "@/components/ui/PeriodInputPair";
import { ProfitMethodSelector } from "@/components/ui/ProfitMethodSelector";
import { FormSectionHeader } from "@/components/ui/FormSectionHeader";
import { MedicalCorporationBadge } from "@/components/ui/MedicalCorporationBadge";
import { ResultPreviewHeader } from "@/components/ui/ResultPreviewHeader";
import { calculateOwnDataComplete } from "@/lib/valuation-logic";

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
  const [formData, setFormData] = useState(() => ({
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
  }));

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 計算結果のメモ化
  const calculated = useMemo((): CalculationResult => {
    const issuedShares = basicInfo.issuedShares || 1;
    const capPrev =
      Number(formData.ownCapitalPrev) > 0
        ? Number(formData.ownCapitalPrev)
        : basicInfo.capital || 0;
    const shareCount50 =
      capPrev * 1000 > 0 ? Math.floor((capPrev * 1000) / 50) : issuedShares;

    const result = calculateOwnDataComplete({
      divPrev: Number(formData.ownDividendPrev),
      div2Prev: Number(formData.ownDividend2Prev),
      div3Prev: Number(formData.ownDividend3Prev),
      p1: Number(formData.ownTaxableIncomePrev),
      l1: Number(formData.ownCarryForwardLossPrev),
      p2: Number(formData.ownTaxableIncome2Prev),
      l2: Number(formData.ownCarryForwardLoss2Prev),
      p3: Number(formData.ownTaxableIncome3Prev),
      l3: Number(formData.ownCarryForwardLoss3Prev),
      cap1: Number(formData.ownCapitalPrev),
      re1: Number(formData.ownRetainedEarningsPrev),
      cap2: Number(formData.ownCapital2Prev),
      re2: Number(formData.ownRetainedEarnings2Prev),
      shareCount50,
      profitMethodC,
      profitMethodC1,
      profitMethodC2,
    });

    return { shareCount50, ...result };
  }, [formData, basicInfo, profitMethodC, profitMethodC1, profitMethodC2]);

  // 共通のデータ準備関数
  const prepareFormData = () => {
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

  // プレビュー用の短縮変数
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
  const cMethod = profitMethodC === "c1" ? "直前" : profitMethodC === "c2" ? "2年平均" : "自動";
  const c1Method = profitMethodC1 === "c1" ? "直前" : profitMethodC1 === "c2" ? "2年平均" : "自動";
  const c2Method = profitMethodC2 === "c1" ? "2期前" : profitMethodC2 === "c2" ? "2年平均" : "自動";

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
              <FormSectionHeader
                title="入力：自社のデータ"
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyFromPrev}
                    className="text-xs"
                  >
                    直前期データを複写
                  </Button>
                }
              />

              {/* Dividends */}
              <div className="space-y-2 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <Label>配当金額 (b)</Label>
                  {isMedicalCorporation && <MedicalCorporationBadge />}
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ownDividendPrev" className="text-xs">
                      直前期
                    </Label>
                    <NumberInputWithUnit
                      id="ownDividendPrev"
                      name="ownDividendPrev"
                      value={formData.ownDividendPrev}
                      onChange={handleChange}
                      unit="千円"
                      required
                      disabled={isMedicalCorporation}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownDividend2Prev" className="text-xs">
                      2期前
                    </Label>
                    <NumberInputWithUnit
                      id="ownDividend2Prev"
                      name="ownDividend2Prev"
                      value={formData.ownDividend2Prev}
                      onChange={handleChange}
                      unit="千円"
                      required
                      disabled={isMedicalCorporation}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownDividend3Prev" className="text-xs">
                      3期前
                    </Label>
                    <NumberInputWithUnit
                      id="ownDividend3Prev"
                      name="ownDividend3Prev"
                      value={formData.ownDividend3Prev}
                      onChange={handleChange}
                      unit="千円"
                      required
                      disabled={isMedicalCorporation}
                    />
                  </div>
                </div>
              </div>

              {/* Profit */}
              <div className="space-y-3 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                <Label>利益金額 (c)</Label>

                <ProfitMethodSelector
                  label="c の選択:"
                  value={profitMethodC}
                  onChange={setProfitMethodC}
                  hint="(自動: 低いほう)"
                />
                <ProfitMethodSelector
                  label="c1 の選択:"
                  value={profitMethodC1}
                  onChange={setProfitMethodC1}
                  color="green"
                  hint="(自動: 高いほう)"
                />
                <ProfitMethodSelector
                  label="c2 の選択:"
                  value={profitMethodC2}
                  onChange={setProfitMethodC2}
                  color="green"
                  c1Label="2期前"
                  hint="(自動: 高いほう)"
                />

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

              {/* Book Value */}
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

            {/* Real-time Preview */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300 space-y-4">
              <ResultPreviewHeader title="計算結果：リアルタイムプレビュー (1株50円換算)" icon="📊" large className="pb-2 border-b border-green-300" />
              <div className="space-y-3 bg-white p-4 rounded-lg text-sm">
                <div className="space-y-4">
                  {/* 上段: b, c, d */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground whitespace-nowrap">
                        1株当たりの配当金額 (b)
                      </span>
                      <div className="text-[10px] text-muted-foreground px-2 text-right flex-1">
                        ({Number(formData.ownDividendPrev).toLocaleString()}{" "}
                        + {Number(formData.ownDividend2Prev).toLocaleString()}
                        )千円 ÷ 2 ÷ {shareCount50.toLocaleString()}株 =
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-bold">
                          {b.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs ml-1 text-muted-foreground">円</span>
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
                        <span className="font-bold">{c.toLocaleString()}</span>
                        <span className="text-xs ml-1 text-muted-foreground">円</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground whitespace-nowrap">
                        1株当たりの純資産価額 (d)
                      </span>
                      <div className="text-[10px] text-muted-foreground px-2 text-right flex-1">
                        ({Number(formData.ownCapitalPrev).toLocaleString()}{" "}
                        + {Number(formData.ownRetainedEarningsPrev).toLocaleString()}
                        )千円 ÷ {shareCount50.toLocaleString()}株 =
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="font-bold">{d.toLocaleString()}</span>
                        <span className="text-xs ml-1 text-muted-foreground">円</span>
                      </div>
                    </div>
                  </div>

                  {/* 下段: b1, b2, c1, c2, d1, d2 */}
                  <div className="border-t border-dashed border-primary/20 pt-3 space-y-2">
                    <h5 className="text-xs font-semibold text-black mb-2">
                      比準要素数1の会社・比準要素数0の会社の判定要素
                    </h5>

                    {([
                      { bgClass: "bg-blue-50/50", items: [
                        { label: "（1株当たりの配当金額）b1:", calc: `(${Number(formData.ownDividendPrev).toLocaleString()} + ${Number(formData.ownDividend2Prev).toLocaleString()})千円 ÷ 2 ÷ ${shareCount50.toLocaleString()}株 =`, value: b1, decimal: true },
                        { label: "（1株当たりの配当金額）b2:", calc: `(${Number(formData.ownDividend2Prev).toLocaleString()} + ${Number(formData.ownDividend3Prev).toLocaleString()})千円 ÷ 2 ÷ ${shareCount50.toLocaleString()}株 =`, value: b2, decimal: true },
                      ]},
                      { bgClass: "bg-green-50/50", items: [
                        { label: "（1株当たりの利益金額）c1:", calc: `${c1Method}: 直前:${(p1Val / 1000).toLocaleString()}, 2年平均:${((p1Val + p2Val) / 2000).toLocaleString()}千円 ÷ ${shareCount50.toLocaleString()}株 =`, value: c1, decimal: false },
                        { label: "（1株当たりの利益金額）c2:", calc: `${c2Method}: 2期前:${(p2Val / 1000).toLocaleString()}, 2年平均:${((p2Val + p3Val) / 2000).toLocaleString()}千円 ÷ ${shareCount50.toLocaleString()}株 =`, value: c2, decimal: false },
                      ]},
                      { bgClass: "bg-purple-50/50", items: [
                        { label: "（1株当たりの純資産価額）d1:", calc: `(${Number(formData.ownCapitalPrev).toLocaleString()} + ${Number(formData.ownRetainedEarningsPrev).toLocaleString()})千円 ÷ ${shareCount50.toLocaleString()}株 =`, value: d1, decimal: false },
                        { label: "（1株当たりの純資産価額）d2:", calc: `(${Number(formData.ownCapital2Prev).toLocaleString()} + ${Number(formData.ownRetainedEarnings2Prev).toLocaleString()})千円 ÷ ${shareCount50.toLocaleString()}株 =`, value: d2, decimal: false },
                      ]},
                    ]).map((group, gi) => (
                      <div key={gi} className="space-y-2">
                        {group.items.map((item) => (
                          <div key={item.label} className={`flex justify-between items-center ${group.bgClass} p-2 rounded text-xs`}>
                            <span className="text-black whitespace-nowrap">{item.label}</span>
                            <div className="text-[9px] text-muted-foreground px-2 text-right flex-1">{item.calc}</div>
                            <span className={`font-semibold whitespace-nowrap ${item.value === 0 ? "text-red-600" : "text-black"}`}>
                              {item.decimal
                                ? item.value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                : item.value.toLocaleString()}円
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* 評価方法の判定と警告表示 */}
                  {b1 <= 0 && c1 <= 0 && d1 <= 0 ? (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 mt-3">
                      <p className="text-xs font-bold text-amber-900">
                        ⚠️ 比準要素数0の会社 (b1=0, c1=0, d1=0)
                      </p>
                      <p className="text-[10px] text-amber-800 mt-1">純資産価額</p>
                    </div>
                  ) : [b1, c1, d1].filter((v) => v <= 0).length >= 2 &&
                    [b2, c2, d2].filter((v) => v <= 0).length >= 2 ? (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mt-3">
                      <p className="text-xs font-bold text-orange-900">⚠️ 比準要素数1の会社</p>
                      <p className="text-[10px] text-orange-800 mt-1">
                        b1, c1, d1のいずれか2つが「0」かつ b2, c2, d2の2以上が「0」
                      </p>
                      <p className="text-[10px] text-orange-800 mt-2">次のうちいずれか低い方の金額</p>
                      <p className="text-[10px] text-orange-800 pl-3">イ　純資産価格</p>
                      <p className="text-[10px] text-orange-800 pl-3">
                        ロ　（ 類似業種比準価格 × 0.25 ）＋（ 純資産価格 × 0.75 ）
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mt-3">
                      <p className="text-xs font-bold text-blue-900">✓ 一般の評価会社</p>
                      <p className="text-[10px] text-blue-800 mt-1">標準的な類似業種比準方式で評価します</p>
                    </div>
                  )}

                  <div className="text-[10px] text-right text-muted-foreground pt-2 border-t border-dashed border-primary/10">
                    ※ {shareCount50.toLocaleString()}株 (50円換算) で計算
                  </div>
                </div>
              </div>
            </div>
          </div>

          <FormNavigationButtons onBack={handleBack} />
        </form>
      </Card>
    </div>
  );
}
