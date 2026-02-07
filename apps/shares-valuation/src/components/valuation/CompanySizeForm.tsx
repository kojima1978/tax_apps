import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { calculateCompanySizeAndL, IndustryType } from "@/lib/valuation-logic";
import { BasicInfo } from "@/types/valuation";
import { NumberInputWithUnit } from "@/components/ui/NumberInputWithUnit";
import { IndustryTypeSelector } from "@/components/ui/IndustryTypeSelector";
import { FormNavigationButtons } from "@/components/ui/FormNavigationButtons";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface CompanySizeFormProps {
  onNext: (data: Partial<BasicInfo>) => void;
  onBack: () => void;
  defaultValues?: Partial<BasicInfo>;
  onChange?: (data: Partial<BasicInfo>) => void;
}

export function CompanySizeForm({
  onNext,
  onBack,
  defaultValues,
  onChange,
}: CompanySizeFormProps) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    employees: defaultValues?.employees?.toString() || "",
    totalAssets: defaultValues?.totalAssets
      ? (defaultValues.totalAssets / 1000).toString()
      : "",
    sales: defaultValues?.sales ? (defaultValues.sales / 1000).toString() : "",
    industryType: (defaultValues?.industryType as IndustryType) || "Wholesale",
  });

  const isInitialMount = useRef(true);
  const isUpdatingFromDefault = useRef(false);

  // Update form data when defaultValues changes (e.g., when coming from Step 1 or Step 3)
  useEffect(() => {
    if (defaultValues) {
      isUpdatingFromDefault.current = true;
      setFormData({
        employees: defaultValues?.employees?.toString() || "",
        totalAssets: defaultValues?.totalAssets
          ? (defaultValues.totalAssets / 1000).toString()
          : "",
        sales: defaultValues?.sales
          ? (defaultValues.sales / 1000).toString()
          : "",
        industryType:
          (defaultValues?.industryType as IndustryType) || "Wholesale",
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

  const handleIndustryChange = (type: IndustryType) => {
    setFormData((prev) => ({ ...prev, industryType: type }));
  };

  const notifyChange = useCallback(
    (data: typeof formData) => {
      if (onChange) {
        // Only notify if there's actual data to save
        // Don't overwrite with empty/zero values
        const employees = data.employees
          ? Number(data.employees.replace(/,/g, ""))
          : undefined;
        const totalAssets = data.totalAssets
          ? Number(data.totalAssets.replace(/,/g, "")) * 1000
          : undefined;
        const sales = data.sales
          ? Number(data.sales.replace(/,/g, "")) * 1000
          : undefined;

        // Only calculate and save if we have valid data
        if (
          employees !== undefined ||
          totalAssets !== undefined ||
          sales !== undefined
        ) {
          const { size, lRatio, sizeMultiplier } = calculateCompanySizeAndL({
            employees: employees ?? 0,
            sales: sales ?? 0,
            totalAssets: totalAssets ?? 0,
            industryType: data.industryType,
          });

          const updateData: Partial<BasicInfo> = {
            industryType: data.industryType,
          };

          if (employees !== undefined) updateData.employees = employees;
          if (totalAssets !== undefined) updateData.totalAssets = totalAssets;
          if (sales !== undefined) updateData.sales = sales;

          // Only add calculated values if we have real input data
          if (
            employees !== undefined &&
            totalAssets !== undefined &&
            sales !== undefined
          ) {
            updateData.size = size;
            updateData.lRatio = lRatio;
            updateData.sizeMultiplier = sizeMultiplier;
          }

          onChange(updateData);
        }
      }
    },
    [onChange],
  );

  // Notify parent of changes when formData updates (skip initial mount and updates from defaultValues)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isUpdatingFromDefault.current) {
      isUpdatingFromDefault.current = false;
      return;
    }
    notifyChange(formData);
  }, [formData, notifyChange]);

  // プレビュー用の計算結果メモ化
  const sizePreview = useMemo(() => {
    const emp = Number(formData.employees.replace(/,/g, ""));
    const assets = Number(formData.totalAssets.replace(/,/g, "")) * 1000;
    const sal = Number(formData.sales.replace(/,/g, "")) * 1000;
    const { size, lRatio, sizeMultiplier } = calculateCompanySizeAndL({
      employees: emp,
      totalAssets: assets,
      sales: sal,
      industryType: formData.industryType,
    });
    const sizeLabel = size === "Big" ? "大会社" : size === "Medium" ? "中会社" : "小会社";
    return { size, lRatio, sizeMultiplier, sizeLabel };
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse numbers (remove commas) and convert units (Thousands -> Yen)
    const employees = Number(formData.employees.replace(/,/g, ""));
    const totalAssets = Number(formData.totalAssets.replace(/,/g, "")) * 1000;
    const sales = Number(formData.sales.replace(/,/g, "")) * 1000;

    if (employees < 0) {
      toast.warning("従業員数は0人以上の数値を入力してください。");
      return;
    }

    // Calculate Size
    const { size, lRatio, sizeMultiplier } = calculateCompanySizeAndL({
      employees,
      sales,
      totalAssets,
      industryType: formData.industryType,
    });

    onNext({
      employees,
      totalAssets,
      sales,
      industryType: formData.industryType,
      size,
      lRatio,
      sizeMultiplier,
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-primary">
          会社規模の判定 (Step 2/8)
        </h2>
        <p className="text-muted-foreground">
          「資産・従業員」と「売上高」から会社規模とL割合を判定します。
        </p>
      </div>

      <div className="text-center space-y-2">
        <a
          href="https://www.e-stat.go.jp/classifications/terms/10"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          日本標準産業分類(令和５年[2023年]７月改定)
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
        <div className="text-sm text-muted-foreground">|</div>
        <a
          href="https://www.nta.go.jp/law/joho-zeikaishaku/hyoka/250600/pdf/02.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          （別表）日本標準産業分類の分類項目と類似業種比準価額計算上の業種目との対比表（令和７年分）
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-blue-300">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                  ✎
                </div>
                <h3 className="text-lg font-bold text-blue-900">
                  入力：会社規模判定データ
                </h3>
              </div>

              <div className="space-y-2">
                <Label>業種区分</Label>
                <IndustryTypeSelector value={formData.industryType} onChange={handleIndustryChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employees">従業員数</Label>
                  <NumberInputWithUnit
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleChange}
                    unit="人"
                    required
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalAssets">総資産価額 (帳簿価額)</Label>
                  <NumberInputWithUnit
                    id="totalAssets"
                    name="totalAssets"
                    value={formData.totalAssets}
                    onChange={handleChange}
                    unit="千円"
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sales">直前期の売上高</Label>
                  <NumberInputWithUnit
                    id="sales"
                    name="sales"
                    value={formData.sales}
                    onChange={handleChange}
                    unit="千円"
                    required
                    className="bg-white"
                  />
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
                  計算結果：判定結果 (リアルタイムプレビュー)
                </h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">会社規模区分</p>
                  <p className="text-2xl font-black text-primary">
                    {sizePreview.sizeLabel}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Lの割合 / 斟酌率
                  </p>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">
                      L = {sizePreview.lRatio.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (斟酌率: {sizePreview.sizeMultiplier})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <FormNavigationButtons onBack={onBack} />
        </form>
      </Card>
    </div>
  );
}
