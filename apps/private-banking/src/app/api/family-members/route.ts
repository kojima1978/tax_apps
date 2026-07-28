import { NextResponse } from "next/server";
import { z } from "zod";
import { familyComposition } from "@/lib/family";
import { prisma } from "@/lib/prisma";

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
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
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

  const household = await prisma.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true } });
  if (!household) return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });

  const composition = familyComposition(parsed.data.members);
  await prisma.$transaction(async (tx) => {
    await tx.familyMember.deleteMany({ where: { householdId: household.id } });
    if (parsed.data.members.length > 0) {
      await tx.familyMember.createMany({
        data: parsed.data.members.map((member, index) => ({
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
          birthDate: member.birthDate ? new Date(`${member.birthDate}T00:00:00.000Z`) : null,
          note: member.note,
          sortOrder: index,
        })),
      });
    }
    await tx.household.update({ where: { id: household.id }, data: composition });
  });

  return NextResponse.json({ ok: true, composition });
}
