"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  exportValuationData,
  importValuationData,
  loadFromSessionStorage,
  saveToSessionStorage,
} from "@/lib/data-export-import";

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleStepByStepClick = () => {
    // sessionStorageをクリア
    sessionStorage.removeItem("valuationBasicInfo");
    sessionStorage.removeItem("valuationFinancials");
    router.push("/valuation/step1");
  };

  const handleBulkInputClick = () => {
    // sessionStorageをクリア
    sessionStorage.removeItem("valuationBasicInfo");
    sessionStorage.removeItem("valuationFinancials");
    router.push("/valuation/bulk");
  };

  const handleExportClick = () => {
    const { basicInfo, financials } = loadFromSessionStorage();
    if (!basicInfo || !financials) {
      toast.warning("エクスポートするデータがありません。先にデータを入力してください");
      return;
    }
    exportValuationData(basicInfo, financials);
    toast.success("データをエクスポートしました");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      const data = await importValuationData(file);
      saveToSessionStorage(data.basicInfo, data.financials);
      toast.success("データを読み込みました。一覧入力画面に移動します");
      router.push("/valuation/bulk");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "データの読み込みに失敗しました";
      setImportError(errorMessage);
      toast.error(errorMessage);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-primary tracking-tight">
          簡易株価計算
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          取引相場のない株式評価を、
          <br className="sm:hidden" />
          もっとかんたんに。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full px-4">
        <Card className="p-8 text-center space-y-6 border-4 border-secondary/20 shadow-xl hover:shadow-2xl transition-[shadow,transform,colors] hover:-translate-y-1">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              ステップバイステップ
            </h2>
            <p className="text-sm text-muted-foreground">
              会社規模の判定から評価額の算出まで、
              <br />
              ステップ形式でガイド付きで進めます。
            </p>
          </div>

          <Button
            size="lg"
            className="w-full text-lg shadow-lg hover:shadow-xl transition-[shadow,transform,colors]"
            onClick={handleStepByStepClick}
          >
            スタート！
          </Button>
        </Card>

        <Card className="p-8 text-center space-y-6 border-4 border-primary/20 shadow-xl hover:shadow-2xl transition-[shadow,transform,colors] hover:-translate-y-1">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">一覧入力</h2>
            <p className="text-sm text-muted-foreground">
              すべてのデータを一度に入力して、
              <br />
              素早く評価額を算出します。
            </p>
          </div>

          <Button
            size="lg"
            className="w-full text-lg shadow-lg hover:shadow-xl transition-[shadow,transform,colors]"
            onClick={handleBulkInputClick}
          >
            スタート！
          </Button>
        </Card>
      </div>

      {/* データのエクスポート/インポート */}
      <div className="mt-8 space-y-4 max-w-2xl w-full px-4">
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-center text-lg font-bold text-foreground mb-4">
            データの保存・読み込み
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleExportClick}
              className="flex-1 sm:flex-none"
            >
              データをエクスポート
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleImportClick}
              className="flex-1 sm:flex-none"
            >
              データをインポート
            </Button>
          </div>
          {importError && (
            <p className="text-center text-sm text-red-600 mt-2">
              {importError}
            </p>
          )}
          <p className="text-center text-xs text-muted-foreground mt-4">
            入力したデータをJSONファイルとして保存・読み込みできます
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
