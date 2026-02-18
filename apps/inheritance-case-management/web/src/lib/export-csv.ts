import type { InheritanceCase } from "@tax-apps/shared";

export function exportCasesToCSV(cases: InheritanceCase[], filename?: string) {
  // CSVヘッダー
  const headers = [
    "ID",
    "被相続人氏名",
    "死亡日",
    "年度",
    "ステータス",
    "受託状況",
    "担当者",
    "紹介者",
    "財産評価額",
    "相続税額",
    "見積額",
    "報酬額",
    "紹介料率(%)",
    "紹介料",
    "作成日",
    "更新日",
  ];

  // CSVデータ行
  const rows = cases.map((c) => [
    c.id,
    c.deceasedName,
    c.dateOfDeath,
    c.fiscalYear,
    c.status,
    c.acceptanceStatus || "",
    c.assignee || "",
    c.referrer || "",
    c.propertyValue || 0,
    c.taxAmount || 0,
    c.estimateAmount || 0,
    c.feeAmount || 0,
    c.referralFeeRate ?? "",
    c.referralFeeAmount ?? "",
    c.createdAt ? new Date(c.createdAt).toLocaleString("ja-JP") : "",
    c.updatedAt ? new Date(c.updatedAt).toLocaleString("ja-JP") : "",
  ]);

  // CSV文字列を生成
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          // カンマや改行を含む場合はダブルクォートで囲む
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ].join("\n");

  // BOMを追加（Excel対応）
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8" });

  // ダウンロード
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `案件一覧_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
