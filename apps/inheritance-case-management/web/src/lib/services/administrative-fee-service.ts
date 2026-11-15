import { prisma } from '@/lib/prisma';
import {
  DEFAULT_ADMINISTRATIVE_FEE_ITEMS,
  administrativeFeeCategoryOrder,
} from '@/lib/constants/administrative-fees';
import type { CreateAdministrativeFeeItemInput } from '@/types/validation';

/** 料金表の並び（分類の並び → 分類の中の並び → 登録順） */
const FEE_ITEM_ORDER = [
  { categoryOrder: 'asc' as const },
  { sortOrder: 'asc' as const },
  { id: 'asc' as const },
];

/**
 * 料金表が1件も無いときだけ既定の料金表を入れる。
 * 既に1件でもあれば触らない（運用中に消した行を勝手に復活させない）。
 */
export async function ensureAdministrativeFeeDefaults(): Promise<void> {
  const count = await prisma.administrativeFeeItem.count();
  if (count > 0) return;
  await prisma.administrativeFeeItem.createMany({
    data: DEFAULT_ADMINISTRATIVE_FEE_ITEMS.map((item, index) => ({
      category: item.category,
      categoryOrder: administrativeFeeCategoryOrder(item.category),
      name: item.name,
      unitPrice: item.unitPrice,
      note: item.note ?? null,
      sortOrder: index,
    })),
  });
}

/** 料金表の一覧（既定値の投入つき） */
export async function listAdministrativeFeeItems() {
  await ensureAdministrativeFeeDefaults();
  return prisma.administrativeFeeItem.findMany({ orderBy: FEE_ITEM_ORDER });
}

/** 分類の中の最後の並び順の次（同じ分類に追加するとき用） */
async function nextSortOrder(category: string): Promise<number> {
  const last = await prisma.administrativeFeeItem.findFirst({
    where: { category },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  return (last?.sortOrder ?? -1) + 1;
}

export async function createAdministrativeFeeItem(input: CreateAdministrativeFeeItemInput) {
  return prisma.administrativeFeeItem.create({
    data: {
      category: input.category,
      categoryOrder: input.categoryOrder ?? administrativeFeeCategoryOrder(input.category),
      name: input.name,
      unitPrice: input.unitPrice,
      note: input.note ?? null,
      sortOrder: input.sortOrder || await nextSortOrder(input.category),
      active: true,
    },
  });
}

export interface AdministrativeFeeImportResult {
  /** 単価・備考を上書きした行数 */
  updated: number;
  /** 新しく追加した行数 */
  created: number;
  /** 取り込んだ値と同じで何も変えなかった行数 */
  unchanged: number;
}

/**
 * Excel・貼り付けからの取込。**分類＋手続き内容**をキーに
 * 一致する行は料金・備考を上書きし、無い行は追加する。
 * 取り込んだ表に無い行は消さない（削除は画面から1行ずつ）。
 */
export async function importAdministrativeFeeItems(
  items: Omit<CreateAdministrativeFeeItemInput, 'sortOrder' | 'categoryOrder'>[],
): Promise<AdministrativeFeeImportResult> {
  await ensureAdministrativeFeeDefaults();
  const result: AdministrativeFeeImportResult = { updated: 0, created: 0, unchanged: 0 };
  // 同じ分類＋手続き内容が複数回出てきたら最後の行を採用する
  const rows = new Map<string, Omit<CreateAdministrativeFeeItemInput, 'sortOrder' | 'categoryOrder'>>();
  for (const item of items) {
    rows.set(`${item.category}\u0000${item.name}`, item);
  }

  for (const item of rows.values()) {
    const note = item.note?.trim() ? item.note.trim() : null;
    const existing = await prisma.administrativeFeeItem.findUnique({
      where: { category_name: { category: item.category, name: item.name } },
    });
    if (!existing) {
      await prisma.administrativeFeeItem.create({
        data: {
          category: item.category,
          categoryOrder: administrativeFeeCategoryOrder(item.category),
          name: item.name,
          unitPrice: item.unitPrice,
          note,
          sortOrder: await nextSortOrder(item.category),
          active: true,
        },
      });
      result.created += 1;
      continue;
    }
    if (existing.unitPrice === item.unitPrice && (existing.note ?? null) === note && existing.active) {
      result.unchanged += 1;
      continue;
    }
    await prisma.administrativeFeeItem.update({
      where: { id: existing.id },
      data: { unitPrice: item.unitPrice, note, active: true },
    });
    result.updated += 1;
  }
  return result;
}
