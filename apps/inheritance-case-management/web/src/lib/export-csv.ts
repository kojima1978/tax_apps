import type { InheritanceCase, ProgressStep } from "@/types/shared";
import { formatId } from "@/types/shared";
import { MAX_CONTACT_COLUMNS } from "./import-csv";

const TEMPLATE_HEADERS = [
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
  "連絡先1_氏名",
  "連絡先1_電話",
  "連絡先1_メール",
];

const TEMPLATE_SAMPLE_ROW = [
  "",
  "山田太郎",
  "2025-01-15",
  "2025",
  "未着手",
  "未判定",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "山田花子",
  "03-1234-5678",
  "hanako@example.com",
];

export function downloadCSVTemplate() {
  const csvContent = [
    TEMPLATE_HEADERS.join(","),
    TEMPLATE_SAMPLE_ROW.join(","),
  ].join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "案件取込テンプレート.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVCell(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportCasesToCSV(cases: InheritanceCase[], filename?: string) {
  // Determine max contacts across all cases (capped)
  const maxContacts = Math.min(
    cases.reduce((max, c) => Math.max(max, c.contacts?.length ?? 0), 0),
    MAX_CONTACT_COLUMNS
  );

  // Check if any case has progress data
  const hasProgress = cases.some((c) => c.progress && c.progress.length > 0);

  // Build headers
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
  ];

  for (let i = 1; i <= maxContacts; i++) {
    headers.push(`連絡先${i}_氏名`, `連絡先${i}_電話`, `連絡先${i}_メール`);
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
      c.dateOfDeath,
      c.fiscalYear,
      c.status,
      c.acceptanceStatus || "",
      c.assignee?.name || "",
      c.referrer ? `${c.referrer.company} / ${c.referrer.name}` : "",
      c.propertyValue || 0,
      c.taxAmount || 0,
      c.estimateAmount || 0,
      c.feeAmount || 0,
      c.referralFeeRate ?? "",
      c.referralFeeAmount ?? "",
    ];

    // Contact columns
    for (let i = 0; i < maxContacts; i++) {
      const contact = c.contacts?.[i];
      row.push(
        contact?.name || "",
        contact?.phone || "",
        contact?.email || ""
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
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `案件一覧_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
