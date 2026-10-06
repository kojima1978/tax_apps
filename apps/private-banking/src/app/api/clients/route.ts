import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defaultAsOfDate, isAsOfDateForFiscalYear, parseDateOnlyUtc } from "@/lib/snapshot-date";

/** 顧客一覧（ClientSummary）が必要とする列。GET・POST・PATCH で同じ形を返す。 */
const clientSummarySelect = { id: true, clientCode: true, name: true, nameKana: true, relatedCompany: true, staffId: true, staff: { select: { name: true } } } as const;
/**
 * 担当者は台帳（Staff）にしか無いので、画面へは名前だけを `assignedStaff` として出す。
 * 検索もCSVも文字列のまま使えるが、出所は台帳1本になる（自由入力の揺れが起きない）。
 */
const toClientSummary = <T extends { staff: { name: string } | null }>({ staff, ...client }: T) => ({ ...client, assignedStaff: staff?.name ?? "" });

/**
 * 担当者は台帳（Staff）の id で受け取る。画面のフォームは `FormData` をそのまま JSON に
 * しているので、未選択の `<select>` は空文字で届く ── `z.coerce.number()` はこれを 0 と
 * 読んで弾いてしまうため、空文字・未送信はここで「未設定（null）」へ寄せる。
 */
const staffIdSchema = z.preprocess(
  (value) => (value === "" || value === undefined ? null : value),
  z.coerce.number().int().positive().nullable(),
).default(null);

const clientFieldsSchema = z.object({
  name: z.string().trim().min(1, "顧客名を入力してください。").max(100),
  nameKana: z.string().trim().max(100).optional().default(""),
  clientCode: z.string().trim().min(1, "顧客コードを入力してください。").max(30).regex(/^[A-Za-z0-9_-]+$/, "顧客コードは半角英数字・ハイフン・アンダースコアで入力してください。"),
  // 担当者は台帳から選ぶ。未設定は null。
  staffId: staffIdSchema,
});

const createClientSchema = clientFieldsSchema.extend({
  fiscalYear: z.coerce.number().int().min(1900).max(2200),
  asOfDate: z.string().optional(),
}).superRefine((data, context) => {
  const asOfDate = data.asOfDate ?? defaultAsOfDate(data.fiscalYear);
  if (!isAsOfDateForFiscalYear(asOfDate, data.fiscalYear)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["asOfDate"],
      message: "B/S基準日は開始年度内の正しい日付を入力してください。",
    });
  }
});

const updateClientSchema = clientFieldsSchema.extend({
  id: z.coerce.number().int().positive(),
  // 関連法人は本人情報の画面だけで編集する（検索と記録のためだけの任意項目）。
  relatedCompany: z.string().trim().max(100).optional().default(""),
  birthDate: z.string().default("").refine(
    (value) => value === "" || parseDateOnlyUtc(value) !== null,
    "生年月日は正しい日付を入力してください。",
  ),
});

const deleteClientSchema = z.object({
  id: z.coerce.number().int().positive(),
  // 誤削除を防ぐため、顧客コードの入力を照合する。
  confirmationClientCode: z.string().trim().min(1),
});

export async function GET() {
  const clients = await prisma.household.findMany({
    select: {
      ...clientSummarySelect,
      snapshots: { orderBy: { fiscalYear: "desc" }, take: 1, select: { fiscalYear: true } },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return NextResponse.json(clients.map(({ snapshots, ...client }) => ({ ...toClientSummary(client), latestFiscalYear: snapshots[0]?.fiscalYear ?? null })));
}

export async function POST(request: Request) {
  const parsed = createClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const asOfDate = parseDateOnlyUtc(parsed.data.asOfDate ?? defaultAsOfDate(parsed.data.fiscalYear));
  if (!asOfDate) return NextResponse.json({ error: "B/S基準日を確認してください。" }, { status: 400 });
  try {
    const created = await prisma.household.create({
      data: {
        name: parsed.data.name,
        nameKana: parsed.data.nameKana,
        clientCode: parsed.data.clientCode.toUpperCase(),
        staffId: parsed.data.staffId,
        snapshots: {
          create: {
            label: "現在",
            fiscalYear: parsed.data.fiscalYear,
            asOfDate,
            isCurrent: true,
          },
        },
      },
      select: clientSummarySelect,
    });
    return NextResponse.json({ ...toClientSummary(created), latestFiscalYear: parsed.data.fiscalYear }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return NextResponse.json({ error: "この顧客コードはすでに使用されています。" }, { status: 409 });
      if (error.code === "P2003") return NextResponse.json({ error: "担当者を選び直してください。" }, { status: 400 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const parsed = updateClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  const { id, birthDate, ...fields } = parsed.data;
  try {
    const updated = await prisma.household.update({
      where: { id },
      data: {
        ...fields,
        birthDate: birthDate ? parseDateOnlyUtc(birthDate) : null,
        clientCode: fields.clientCode.toUpperCase(),
      },
      select: clientSummarySelect,
    });
    return NextResponse.json(toClientSummary(updated));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return NextResponse.json({ error: "この顧客コードはすでに使用されています。" }, { status: 409 });
      if (error.code === "P2025") return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
      if (error.code === "P2003") return NextResponse.json({ error: "担当者を選び直してください。" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request) {
  const parsed = deleteClientSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "確認用の顧客コードを入力してください。" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const household = await tx.household.findUnique({ where: { id: parsed.data.id }, select: { id: true, clientCode: true, name: true } });
    if (!household) return { status: 404, error: "顧客が見つかりません。" } as const;
    if (household.clientCode !== parsed.data.confirmationClientCode.toUpperCase()) {
      return { status: 400, error: "入力した顧客コードが削除対象と一致しません。" } as const;
    }
    // 年度・明細は onDelete: Cascade で一緒に消える。
    await tx.household.delete({ where: { id: household.id } });
    return { status: 200, name: household.name } as const;
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, name: result.name });
}
