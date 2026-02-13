"use client";

import { useState, useMemo } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { NumberInputWithUnit } from "@/components/ui/NumberInputWithUnit";
import { FormNavigationButtons } from "@/components/ui/FormNavigationButtons";
import { FormSectionHeader } from "@/components/ui/FormSectionHeader";
import { ResultPreviewHeader } from "@/components/ui/ResultPreviewHeader";

interface NetAssetFormProps {
  basicInfo: BasicInfo;
  onBack: () => void;
  onNext: (data: Partial<Financials>) => void;
  defaultValues?: Partial<Financials>;
}

export function NetAssetForm({
  basicInfo,
  onBack,
  onNext,
  defaultValues,
}: NetAssetFormProps) {
  const [formData, setFormData] = useState(() => ({
    // Convert Yen to Thousand Yen for display if values exist
    assetsBookValue: defaultValues?.assetsBookValue
      ? (defaultValues.assetsBookValue / 1000).toString()
      : "",
    assetsInheritanceValue: defaultValues?.assetsInheritanceValue
      ? (defaultValues.assetsInheritanceValue / 1000).toString()
      : "",
    landFairValueAddition: defaultValues?.landFairValueAddition
      ? (defaultValues.landFairValueAddition / 1000).toString()
      : "",
    liabilitiesBookValue: defaultValues?.liabilitiesBookValue
      ? (defaultValues.liabilitiesBookValue / 1000).toString()
      : "",
    liabilitiesInheritanceValue: defaultValues?.liabilitiesInheritanceValue
      ? (defaultValues.liabilitiesInheritanceValue / 1000).toString()
      : "",
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
    // Convert Thousand Yen inputs back to Yen for storage
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

    return {
      assetsBookValue,
      assetsInheritanceValue,
      landFairValueAddition,
      liabilitiesBookValue,
      liabilitiesInheritanceValue,
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

  const handleCopyInheritanceToBook = () => {
    setFormData((prev) => ({
      ...prev,
      assetsBookValue: prev.assetsInheritanceValue,
      liabilitiesBookValue: prev.liabilitiesInheritanceValue,
    }));
  };

  // プレビュー計算を一元化
  const preview = useMemo(() => {
    const assetsInh = Number(formData.assetsInheritanceValue);
    const liabInh = Number(formData.liabilitiesInheritanceValue);
    const netInh = Math.max(0, assetsInh - liabInh);

    const assetsBook = Number(formData.assetsBookValue);
    const liabBook = Number(formData.liabilitiesBookValue);
    const netBook = Math.max(0, assetsBook - liabBook);

    const diff = netInh - netBook;
    const tax = diff > 0 ? Math.floor(diff * 0.37) : 0;
    const netAfterTax = netInh - tax;

    const shares = basicInfo.issuedShares || 1;
    const perShare = Math.floor((netAfterTax * 1000) / shares);

    return { assetsInh, liabInh, netInh, assetsBook, liabBook, netBook, diff, tax, netAfterTax, perShare };
  }, [formData, basicInfo.issuedShares]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-primary">
          純資産価額の入力 (Step 5/8)
        </h2>
        <p className="text-muted-foreground">
          帳簿価額および相続税評価額を入力します。
        </p>
      </div>

      <Card className="p-6 border-secondary/20 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Net Assets Data */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-t-lg border-2 border-b-0 border-blue-200">
              <FormSectionHeader
                title="入力：純資産価額の計算要素"
                action={
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyInheritanceToBook}
                    className="text-xs"
                  >
                    相続税評価額を帳簿価格に複写
                  </Button>
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 border-t-0">
                <Label className="font-bold underline">資産の部</Label>

                {/* Order: Inheritance Value (Top), Book Value (Bottom) */}
                <div className="space-y-2">
                  <Label htmlFor="assetsInheritanceValue" className="text-sm font-bold">
                    相続税評価額
                  </Label>
                  <NumberInputWithUnit
                    id="assetsInheritanceValue"
                    name="assetsInheritanceValue"
                    value={formData.assetsInheritanceValue}
                    onChange={handleChange}
                    unit="千円"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landFairValueAddition" className="text-sm font-bold">
                    土地の時価を加算（相続税評価額*0.25）
                  </Label>
                  <NumberInputWithUnit
                    id="landFairValueAddition"
                    name="landFairValueAddition"
                    value={formData.landFairValueAddition}
                    onChange={handleChange}
                    unit="千円"
                    className="bg-white"
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
                    className="bg-white"
                  />
                </div>
              </div>

              {/* Liabilities */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 border-t-0">
                <Label className="font-bold underline">負債の部</Label>

                {/* Order: Inheritance Value (Top), Book Value (Bottom) */}
                <div className="space-y-2">
                  <Label htmlFor="liabilitiesInheritanceValue" className="text-sm font-bold">
                    相続税評価額
                  </Label>
                  <NumberInputWithUnit
                    id="liabilitiesInheritanceValue"
                    name="liabilitiesInheritanceValue"
                    value={formData.liabilitiesInheritanceValue}
                    onChange={handleChange}
                    unit="千円"
                    className="bg-white"
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
                    className="bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Result Preview */}
          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
            <ResultPreviewHeader title="計算結果：純資産価額の計算結果 (リアルタイムプレビュー)" className="mb-3" />
            <div className="space-y-2">
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    相続税評価額ベースの純資産
                  </span>
                  <span className="font-bold">
                    {preview.netInh.toLocaleString()} 千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({preview.assetsInh.toLocaleString()} - {preview.liabInh.toLocaleString()})千円
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    帳簿価額ベースの純資産
                  </span>
                  <span className="font-bold">
                    {preview.netBook.toLocaleString()} 千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({preview.assetsBook.toLocaleString()} - {preview.liabBook.toLocaleString()})千円
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    評価差額に相当する金額
                  </span>
                  <span className="font-bold">
                    {Math.max(0, preview.diff).toLocaleString()} 千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({preview.netInh.toLocaleString()} - {preview.netBook.toLocaleString()})千円
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    評価差額に対する法人税額等 (37%)
                  </span>
                  <span className="font-bold text-red-500">
                    ▲ {preview.tax.toLocaleString()} 千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {preview.diff <= 0
                    ? "(0 * 37%)千円"
                    : `(${preview.diff.toLocaleString()} * 37%)千円`}
                </div>
              </div>

              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    （法人税額控除後）相続税評価額ベースの純資産
                  </span>
                  <span className="font-bold text-foreground">
                    {preview.netAfterTax.toLocaleString()} 千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({preview.netInh.toLocaleString()} - {preview.tax.toLocaleString()})千円
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    1株あたりの純資産価額
                  </p>
                  <p className="text-xs text-muted-foreground">
                    相続税評価額ベースの純資産（法人税額控除後）÷発行済株式数
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (発行済株式数: {basicInfo.issuedShares?.toLocaleString() ?? 0}株)
                  </p>
                </div>
                <p className="text-2xl font-black text-primary">
                  {preview.perShare.toLocaleString()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    円
                  </span>
                </p>
              </div>
            </div>
          </div>

          <FormNavigationButtons onBack={handleBack} nextLabel="計算する (Step 6へ)" />
        </form>
      </Card>
    </div>
  );
}
