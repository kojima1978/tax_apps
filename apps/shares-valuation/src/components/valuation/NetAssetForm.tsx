"use client";

import { useState } from "react";
import { BasicInfo, Financials } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { NumberInput } from "@/components/ui/NumberInput";

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
  const [formData, setFormData] = useState({
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
  });

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
            <div className="flex items-center justify-between pb-2 border-b border-blue-300 bg-blue-50 p-4 rounded-t-lg border-2 border-b-0 border-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  ✎
                </div>
                <h3 className="text-lg font-bold text-blue-900">
                  入力：純資産価額の計算要素
                </h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyInheritanceToBook}
                className="text-xs"
              >
                相続税評価額を帳簿価格に複写
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 border-t-0">
                <Label className="font-bold underline">資産の部</Label>

                {/* Order: Inheritance Value (Top), Book Value (Bottom) */}
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
                      placeholder="0"
                      value={formData.assetsInheritanceValue}
                      onChange={handleChange}
                      className="pr-12 text-right bg-white"
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
                      placeholder="0"
                      value={formData.landFairValueAddition}
                      onChange={handleChange}
                      className="pr-12 text-right bg-white"
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
                      placeholder="0"
                      value={formData.assetsBookValue}
                      onChange={handleChange}
                      required
                      className="pr-12 text-right bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                      千円
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div className="space-y-4 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 border-t-0">
                <Label className="font-bold underline">負債の部</Label>

                {/* Order: Inheritance Value (Top), Book Value (Bottom) */}
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
                      placeholder="0"
                      value={formData.liabilitiesInheritanceValue}
                      onChange={handleChange}
                      className="pr-12 text-right bg-white"
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
                      placeholder="0"
                      value={formData.liabilitiesBookValue}
                      onChange={handleChange}
                      required
                      className="pr-12 text-right bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                      千円
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Result Preview */}
          <div className="bg-green-50 p-4 rounded-xl border-2 border-green-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                ✓
              </div>
              <h3 className="text-sm font-bold text-green-900">
                計算結果：純資産価額の計算結果 (リアルタイムプレビュー)
              </h3>
            </div>
            <div className="space-y-2">
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    相続税評価額ベースの純資産
                  </span>
                  <span className="font-bold">
                    {(() => {
                      const assets = Number(formData.assetsInheritanceValue);
                      const liabilities = Number(
                        formData.liabilitiesInheritanceValue,
                      );
                      const netAsset = assets - liabilities;
                      return Math.max(0, netAsset).toLocaleString();
                    })()}{" "}
                    千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({Number(formData.assetsInheritanceValue).toLocaleString()} -{" "}
                  {Number(
                    formData.liabilitiesInheritanceValue,
                  ).toLocaleString()}
                  )千円
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    帳簿価額ベースの純資産
                  </span>
                  <span className="font-bold">
                    {(() => {
                      const assets = Number(formData.assetsBookValue);
                      const liabilities = Number(formData.liabilitiesBookValue);
                      const netAsset = assets - liabilities;
                      return Math.max(0, netAsset).toLocaleString();
                    })()}{" "}
                    千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  ({Number(formData.assetsBookValue).toLocaleString()} -{" "}
                  {Number(formData.liabilitiesBookValue).toLocaleString()})千円
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    評価差額に相当する金額
                  </span>
                  <span className="font-bold">
                    {(() => {
                      const assetsInh = Number(formData.assetsInheritanceValue);
                      const liabInh = Number(
                        formData.liabilitiesInheritanceValue,
                      );
                      const netInh = Math.max(0, assetsInh - liabInh);

                      const assetsBook = Number(formData.assetsBookValue);
                      const liabBook = Number(formData.liabilitiesBookValue);
                      const netBook = Math.max(0, assetsBook - liabBook);

                      const diff = netInh - netBook;
                      if (diff <= 0) return "0";
                      return diff.toLocaleString();
                    })()}{" "}
                    千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {(() => {
                    const assetsInh = Number(formData.assetsInheritanceValue);
                    const liabInh = Number(
                      formData.liabilitiesInheritanceValue,
                    );
                    const netInh = Math.max(0, assetsInh - liabInh);

                    const assetsBook = Number(formData.assetsBookValue);
                    const liabBook = Number(formData.liabilitiesBookValue);
                    const netBook = Math.max(0, assetsBook - liabBook);

                    return `(${netInh.toLocaleString()} - ${netBook.toLocaleString()})千円`;
                  })()}
                </div>
              </div>
              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    評価差額に対する法人税額等 (37%)
                  </span>
                  <span className="font-bold text-red-500">
                    ▲{" "}
                    {(() => {
                      const assetsInh = Number(formData.assetsInheritanceValue);
                      const liabInh = Number(
                        formData.liabilitiesInheritanceValue,
                      );
                      const netInh = Math.max(0, assetsInh - liabInh);

                      const assetsBook = Number(formData.assetsBookValue);
                      const liabBook = Number(formData.liabilitiesBookValue);
                      const netBook = Math.max(0, assetsBook - liabBook);

                      const diff = netInh - netBook;
                      if (diff <= 0) return "0";
                      return Math.floor(diff * 0.37).toLocaleString();
                    })()}{" "}
                    千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {(() => {
                    const assetsInh = Number(formData.assetsInheritanceValue);
                    const liabInh = Number(
                      formData.liabilitiesInheritanceValue,
                    );
                    const netInh = Math.max(0, assetsInh - liabInh);

                    const assetsBook = Number(formData.assetsBookValue);
                    const liabBook = Number(formData.liabilitiesBookValue);
                    const netBook = Math.max(0, assetsBook - liabBook);

                    const diff = netInh - netBook;
                    if (diff <= 0) return "(0 * 37%)千円";
                    return `(${diff.toLocaleString()} * 37%)千円`;
                  })()}
                </div>
              </div>

              <div className="border-b border-primary/10 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    （法人税額控除後）相続税評価額ベースの純資産
                  </span>
                  <span className="font-bold text-foreground">
                    {(() => {
                      const assetsInh = Number(formData.assetsInheritanceValue);
                      const liabInh = Number(
                        formData.liabilitiesInheritanceValue,
                      );
                      const netInh = Math.max(0, assetsInh - liabInh);

                      const assetsBook = Number(formData.assetsBookValue);
                      const liabBook = Number(formData.liabilitiesBookValue);
                      const netBook = Math.max(0, assetsBook - liabBook);

                      const diff = netInh - netBook;
                      const tax = diff > 0 ? Math.floor(diff * 0.37) : 0;
                      const netAfterTax = netInh - tax;

                      return netAfterTax.toLocaleString();
                    })()}{" "}
                    千円
                  </span>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-1">
                  {(() => {
                    const assetsInh = Number(formData.assetsInheritanceValue);
                    const liabInh = Number(
                      formData.liabilitiesInheritanceValue,
                    );
                    const netInh = Math.max(0, assetsInh - liabInh);

                    const assetsBook = Number(formData.assetsBookValue);
                    const liabBook = Number(formData.liabilitiesBookValue);
                    const netBook = Math.max(0, assetsBook - liabBook);

                    const diff = netInh - netBook;
                    const tax = diff > 0 ? Math.floor(diff * 0.37) : 0;

                    return `(${netInh.toLocaleString()} - ${tax.toLocaleString()})千円`;
                  })()}
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
                    (発行済株式数:{" "}
                    {basicInfo.issuedShares?.toLocaleString() ?? 0}株)
                  </p>
                </div>
                <p className="text-2xl font-black text-primary">
                  {(() => {
                    const assetsInh = Number(formData.assetsInheritanceValue);
                    const liabInh = Number(
                      formData.liabilitiesInheritanceValue,
                    );
                    const netInh = Math.max(0, assetsInh - liabInh);

                    const assetsBook = Number(formData.assetsBookValue);
                    const liabBook = Number(formData.liabilitiesBookValue);
                    const netBook = Math.max(0, assetsBook - liabBook);

                    const diff = netInh - netBook;
                    const tax = diff > 0 ? Math.floor(diff * 0.37) : 0;

                    const totalNetAsset = netInh - tax;
                    const shares = basicInfo.issuedShares || 1;

                    return Math.floor(
                      (totalNetAsset * 1000) / shares,
                    ).toLocaleString();
                  })()}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    円
                  </span>
                </p>
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
              計算する (Step 6へ)
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
