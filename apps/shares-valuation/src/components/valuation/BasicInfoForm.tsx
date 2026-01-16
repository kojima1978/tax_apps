"use client";

import { useState, useEffect } from "react";
import { BasicInfo } from "@/types/valuation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { DUMMY_DATA_PATTERNS, DummyDataPatternKey } from "@/lib/dummy-data";
import { useToast } from "@/components/ui/Toast";

interface BasicInfoFormProps {
  onNext: (
    data: Partial<BasicInfo>,
    dummyDataKey?: DummyDataPatternKey,
  ) => void;
  onBack?: () => void;
  defaultValues?: Partial<BasicInfo>;
}

export function BasicInfoForm({
  onNext,
  onBack,
  defaultValues,
}: BasicInfoFormProps) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    companyName: defaultValues?.companyName || "",
    taxationPeriod: defaultValues?.taxationPeriod || "",
    previousPeriod: defaultValues?.previousPeriod || "",
    capital: defaultValues?.capital?.toString() || "",
    issuedShares: defaultValues?.issuedShares?.toString() || "",
  });
  const [selectedDummyPattern, setSelectedDummyPattern] = useState<
    DummyDataPatternKey | undefined
  >(undefined);

  // Update form data when defaultValues changes (e.g., when returning from Step 2)
  useEffect(() => {
    if (defaultValues) {
      setFormData({
        companyName: defaultValues?.companyName || "",
        taxationPeriod: defaultValues?.taxationPeriod || "",
        previousPeriod: defaultValues?.previousPeriod || "",
        capital: defaultValues?.capital?.toString() || "",
        issuedShares: defaultValues?.issuedShares?.toString() || "",
      });
    }
  }, [defaultValues]);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const loadDummyData = (patternKey: DummyDataPatternKey) => {
    const pattern = DUMMY_DATA_PATTERNS[patternKey];
    setFormData({
      companyName: pattern.companyName,
      taxationPeriod: pattern.taxationPeriod,
      previousPeriod: pattern.previousPeriod,
      capital: pattern.capital.toString(),
      issuedShares: pattern.issuedShares.toString(),
    });
    setSelectedDummyPattern(patternKey);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse numbers
    const capital = Number(formData.capital.replace(/,/g, ""));
    const issuedShares = Number(formData.issuedShares.replace(/,/g, ""));

    if (issuedShares < 1) {
      toast.warning("発行済株式数は1株以上を入力してください。");
      return;
    }

    onNext(
      {
        companyName: formData.companyName,
        taxationPeriod: formData.taxationPeriod,
        previousPeriod: formData.previousPeriod,
        capital,
        issuedShares,
      },
      selectedDummyPattern,
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-primary">
          基本情報の入力 (Step 1/8)
        </h2>
        <p className="text-muted-foreground">
          会社名や評価時期などの基本情報を入力します。
        </p>
      </div>

      {/* ダミーデータ読み込みボタン */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-amber-900">
            テスト用ダミーデータ
          </span>
          <span className="text-xs text-amber-700">
            （動作確認用のサンプルデータを自動入力します）
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadDummyData("pattern1")}
            className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
          >
            パターン1: 小会社（小売業）
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => loadDummyData("pattern2")}
            className="bg-white hover:bg-amber-100 border-amber-300 text-amber-900 font-bold"
          >
            パターン2: 中会社（製造業）
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

      <Card className="p-6 border-secondary/20 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Company Basic Data Section */}
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-300">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  ✎
                </div>
                <h3 className="text-lg font-bold text-blue-900">
                  入力：会社基本データ
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">会社名</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    placeholder="例: 株式会社サンプル"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="bg-white"
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
                      className="bg-white"
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
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capital">資本金等の額</Label>
                  <div className="relative">
                    <NumberInput
                      id="capital"
                      name="capital"
                      placeholder="0"
                      value={formData.capital}
                      onChange={handleChange}
                      required
                      className="pr-12 text-right bg-white"
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
                      placeholder="0"
                      value={formData.issuedShares}
                      onChange={handleChange}
                      required
                      className="pr-12 text-right bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                      株
                    </span>
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border-2 border-green-300 text-sm">
                <div className="flex items-center gap-2 pb-2 border-b border-green-400">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-green-900">
                    計算結果：リアルタイムプレビュー
                  </h4>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    1株当たりの資本金額
                  </span>
                  <div className="text-right">
                    <span className="font-bold">
                      {Number(formData.capital) > 0 &&
                      Number(formData.issuedShares) > 0
                        ? Math.floor(
                            (Number(formData.capital) * 1000) /
                              Number(formData.issuedShares),
                          ).toLocaleString()
                        : "0"}
                    </span>
                    <span className="text-xs ml-1 text-muted-foreground">
                      円
                    </span>
                  </div>
                </div>
                <div className="text-xs text-right text-muted-foreground mb-2">
                  計算式: {Number(formData.capital).toLocaleString()}千円 ÷{" "}
                  {Number(formData.issuedShares).toLocaleString()}株
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dashed border-primary/20">
                  <span className="text-muted-foreground">
                    1株50円とした場合の発行済株式数
                  </span>
                  <div className="text-right">
                    <span className="font-bold">
                      {Number(formData.capital) > 0
                        ? Math.floor(
                            (Number(formData.capital) * 1000) / 50,
                          ).toLocaleString()
                        : "0"}
                    </span>
                    <span className="text-xs ml-1 text-muted-foreground">
                      株
                    </span>
                  </div>
                </div>
                <div className="text-xs text-right text-muted-foreground">
                  計算式: {Number(formData.capital).toLocaleString()}千円 ÷ 50円
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dashed border-primary/20">
                  <span className="text-muted-foreground">
                    50円株での換算係数
                  </span>
                  <div className="text-right">
                    <span className="font-bold">
                      {Number(formData.capital) > 0 &&
                      Number(formData.issuedShares) > 0
                        ? (
                            Number(formData.issuedShares) /
                            Math.floor((Number(formData.capital) * 1000) / 50)
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 3,
                          })
                        : "0"}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-right text-muted-foreground">
                  計算式: {Number(formData.issuedShares).toLocaleString()}株 ÷{" "}
                  {Number(formData.capital) > 0
                    ? Math.floor(
                        (Number(formData.capital) * 1000) / 50,
                      ).toLocaleString()
                    : "0"}
                  株
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={onBack}
              >
                TOPに戻る
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              className={`${onBack ? "flex-[2]" : "w-full"} text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all`}
            >
              次へ進む
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
