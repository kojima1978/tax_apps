import { NextResponse } from "next/server";
import { z } from "zod";
import { familyComposition } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyUtc } from "@/lib/snapshot-date";
import { writeActivityLog } from "@/lib/activity-log";

const optionalFractionPart = z.union([z.number(), z.string()]).transform((value) => {
  if (value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}).refine((value) => value === null || value >= 0, "相続分は0以上の整数で入力してください。");

const familyMemberSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "氏名を入力してください。").max(100),
  nameKana: z.string().trim().max(100).default(""),
  relationship: z.enum(["SPOUSE", "CHILD", "GRANDCHILD", "PARENT", "GRANDPARENT", "SIBLING", "NIECE_NEPHEW", "OTHER"]),
  acquisitionReason: z.enum(["INHERITANCE", "BEQUEST", "GIFT", "OTHER"]),
  civilShareNumerator: optionalFractionPart.nullable(),
  civilShareDenominator: optionalFractionPart.nullable(),
  taxShareNumerator: optionalFractionPart.nullable(),
  taxShareDenominator: optionalFractionPart.nullable(),
  specialTaxAddition: z.boolean(),
  disabilityCategory: z.enum(["NONE", "GENERAL", "SPECIAL"]),
  // 形だけでなく実在する日付か見る（`2026-02-31` は `new Date` が 3月3日 へ繰り上げる）
  birthDate: z.string().refine((value) => parseDateOnlyUtc(value) !== null, "生年月日は正しい日付を入力してください。").nullable(),
  note: z.string().trim().max(500).default(""),
  sortOrder: z.number().int().min(0),
}).superRefine((member, context) => {
  for (const [numeratorKey, denominatorKey] of [
    ["civilShareNumerator", "civilShareDenominator"],
    ["taxShareNumerator", "taxShareDenominator"],
  ] as const) {
    const numerator = member[numeratorKey];
    const denominator = member[denominatorKey];
    if ((numerator === null) !== (denominator === null)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "相続分は分子と分母を両方入力してください。", path: [numeratorKey] });
    } else if (denominator !== null && denominator <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "相続分の分母は1以上で入力してください。", path: [denominatorKey] });
    }
  }
});

const saveSchema = z.object({
  householdId: z.number().int().positive(),
  members: z.array(familyMemberSchema).max(20, "家族は20名まで登録できます。"),
});

export async function PUT(request: Request) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" }, { status: 400 });
  }

  const household = await prisma.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true, name: true, clientCode: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });

  const suppliedIds = parsed.data.members.flatMap((member) => member.id ? [member.id] : []);
  if (new Set(suppliedIds).size !== suppliedIds.length) return NextResponse.json({ error: "同じ親族が重複しています。" }, { status: 400 });
  const existingMembers = await prisma.familyMember.findMany({ where: { householdId: household.id }, select: { id: true } });
  const existingIds = new Set(existingMembers.map((member) => member.id));
  if (suppliedIds.some((id) => !existingIds.has(id))) return NextResponse.json({ error: "別の顧客または削除済みの親族が含まれています。画面を更新してください。" }, { status: 409 });
  const suppliedIdSet = new Set(suppliedIds);
  const removedIds = existingMembers.flatMap((member) => suppliedIdSet.has(member.id) ? [] : [member.id]);
  const linkedAllocationCount = removedIds.length === 0 ? 0 : await prisma.positionAllocation.count({ where: { familyMemberId: { in: removedIds } } });
  if (linkedAllocationCount > 0) {
    return NextResponse.json({ error: `削除する親族が取得者・負担者として${linkedAllocationCount}件の明細に登録されています。先に明細の取得者・負担者を変更してください。` }, { status: 409 });
  }

  const composition = familyComposition(parsed.data.members);
  await prisma.$transaction(async (tx) => {
    const retainedIds: number[] = [];
    for (const [index, member] of parsed.data.members.entries()) {
      const data = {
          householdId: household.id,
          name: member.name,
          nameKana: member.nameKana,
          relationship: member.relationship,
          acquisitionReason: member.acquisitionReason,
          civilShareNumerator: member.civilShareNumerator,
          civilShareDenominator: member.civilShareDenominator,
          taxShareNumerator: member.taxShareNumerator,
          taxShareDenominator: member.taxShareDenominator,
          specialTaxAddition: member.specialTaxAddition,
          disabilityCategory: member.disabilityCategory,
          birthDate: member.birthDate ? parseDateOnlyUtc(member.birthDate) : null,
          note: member.note,
          sortOrder: index,
      };
      if (member.id) {
        await tx.familyMember.update({ where: { id: member.id }, data });
        retainedIds.push(member.id);
      } else {
        const created = await tx.familyMember.create({ data, select: { id: true } });
        retainedIds.push(created.id);
      }
    }
    await tx.familyMember.deleteMany({ where: { householdId: household.id, id: { notIn: retainedIds } } });
    await tx.household.update({ where: { id: household.id }, data: composition });
    await writeActivityLog(tx, { householdId: household.id, householdName: household.name, clientCode: household.clientCode, action: "UPDATE", entityType: "FAMILY", entityId: household.id, summary: `親族情報を${parsed.data.members.length}名で更新` });
  });

  return NextResponse.json({ ok: true, composition });
}
