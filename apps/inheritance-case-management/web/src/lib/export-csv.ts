import type { InheritanceCase, ProgressStep } from "@/types/shared";
import { formatId } from "@/types/shared";
import { MAX_HEIR_COLUMNS } from "./import-csv";

function downloadCSVBlob(csvContent: string, filename: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const TEMPLATE_HEADERS = [
  "ID",
  "被相続人氏名",
  "年度",
  "死亡日",
  "受託状況",
  "進み具合",
  "対応状況",
  "特記事項",
  "担当者_部署名",
  "担当者_氏名",
  "社内紹介者_部署名",
  "社内紹介者_氏名",
  "紹介者_会社名",
  "紹介者_部署名",
  "メモ",
  "財産評価額",
  "相続税額",
  "見積額",
  "報酬額",
  "紹介料率(%)",
  "紹介料",
  "土地数_路線価",
  "土地数_倍率",
  "非上場株式数",
  "相続人数",
  "受託日",
  "相続人1_氏名",
  "相続人1_電話",
  "相続人1_郵便番号",
  "相続人1_住所",
  "相続人1_続柄",
  "相続人1_メモ",
];

const TEMPLATE_SAMPLE_ROW = [
  "",
  "山田太郎",
  "2025",
  "2025-01-15",
  "未判定",
  "未着手",
  "対応中",
  "",
  "資産税部",
  "田中一郎",
  "",
  "",
  "山田税理士事務所",
  "営業部",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "0",
  "0",
  "0",
  "0",
  "",
  "山田花子",
  "03-1234-5678",
  "100-0001",
  "東京都千代田区千代田1-1",
  "配偶者",
  "",
];

export function downloadCSVTemplate() {
  const csvContent = [
    TEMPLATE_HEADERS.join(","),
    TEMPLATE_SAMPLE_ROW.join(","),
  ].join("\n");

  downloadCSVBlob(csvContent, "案件取込テンプレート.csv");
}

function escapeCSVCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCasesToCSV(cases: InheritanceCase[], filename?: string) {
  // Determine max heirs across all cases (capped)
  const maxHeirs = Math.min(
    cases.reduce((max, c) => Math.max(max, c.heirs?.length ?? 0), 0),
    MAX_HEIR_COLUMNS
  );

  // Check if any case has progress data
  const hasProgress = cases.some((c) => c.progress && c.progress.length > 0);

  // Build headers
  const headers = [
    "ID",
    "被相続人氏名",
    "年度",
    "死亡日",
    "受託状況",
    "進み具合",
    "対応状況",
    "特記事項",
    "担当者_部署名",
    "担当者_氏名",
    "社内紹介者_部署名",
    "社内紹介者_氏名",
    "紹介者_会社名",
    "紹介者_部署名",
    "メモ",
    "財産評価額",
    "相続税額",
    "見積額",
    "報酬額",
    "紹介料率(%)",
    "紹介料",
    "見積紹介料",
    "土地数_路線価",
    "土地数_倍率",
    "非上場株式数",
    "相続人数",
    "受託日",
    "申告完了日",
  ];

  for (let i = 1; i <= maxHeirs; i++) {
    headers.push(`相続人${i}_氏名`, `相続人${i}_電話`, `相続人${i}_郵便番号`, `相続人${i}_住所`, `相続人${i}_続柄`, `相続人${i}_メモ`);
  }

  if (hasProgress) {
    headers.push("進捗データ");
  }

  headers.push("作成日", "更新日");

  // Build rows
  const rows = cases.map((c) => {
    const row: (string | number)[] = [
      formatId(c.id),
      c.deceasedName,
      c.fiscalYear,
      c.dateOfDeath,
      c.acceptanceStatus || "",
      c.status,
      c.handlingStatus || "対応中",
      c.summary || "",
      c.assignee?.department?.name || "",
      c.assignee?.name || "",
      c.internalReferrer?.department?.name || "",
      c.internalReferrer?.name || "",
      c.referrer?.company.name || "",
      c.referrer?.branch?.name || "",
      c.memo || "",
      c.propertyValue || 0,
      c.taxAmount || 0,
      c.estimateAmount || 0,
      c.feeAmount || 0,
      c.referralFeeRate ?? "",
      c.referralFeeAmount ?? "",
      c.estimateReferralFeeAmount ?? "",
      c.landRosenkaCount || 0,
      c.landBairitsuCount || 0,
      c.unlistedStockCount || 0,
      c.heirCount || 0,
      c.caseAddedDate || "",
      c.caseCompletedDate || "",
    ];

    // Heir columns
    for (let i = 0; i < maxHeirs; i++) {
      const heir = c.heirs?.[i];
      const person = heir?.person;
      row.push(
        person?.name || "",
        person?.phone || "",
        person?.postalCode || "",
        person?.address || "",
        heir?.relationship || "",
        heir?.memo || ""
      );
    }

    // Progress data (JSON)
    if (hasProgress) {
      if (c.progress && c.progress.length > 0) {
        const progressData: ProgressStep[] = c.progress.map((p) => ({
          id: p.stepId,
          name: p.name,
          date: p.date,
          ...(p.memo ? { memo: p.memo } : {}),
          ...(p.isDynamic ? { isDynamic: true } : {}),
        }));
        row.push(JSON.stringify(progressData));
      } else {
        row.push("");
      }
    }

    row.push(
      c.createdAt ? new Date(c.createdAt).toLocaleString("ja-JP") : "",
      c.updatedAt ? new Date(c.updatedAt).toLocaleString("ja-JP") : ""
    );

    return row;
  });

  // Generate CSV string
  const csvContent = [
    headers.map(escapeCSVCell).join(","),
    ...rows.map((row) => row.map(escapeCSVCell).join(",")),
  ].join("\n");

  // BOM for Excel compatibility
  downloadCSVBlob(
    csvContent,
    filename || `案件一覧_${new Date().toISOString().split("T")[0]}.csv`
  );
}
