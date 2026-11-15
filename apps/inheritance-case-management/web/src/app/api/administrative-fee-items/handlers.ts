import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { administrativeFeeCategoryOrder } from '@/lib/constants/administrative-fees';
import { createAdministrativeFeeItemSchema, updateAdministrativeFeeItemSchema } from '@/types/validation';

// 一覧（GET）と追加（POST）は route.ts に自前で置く。
// 分類の並び替えと既定値の投入があるため、汎用の1フィールド並びでは足りない
export const { byId } = createCrudRouteHandlers({
  model: 'administrativeFeeItem',
  orderBy: 'sortOrder',
  entityLabel: '料金表の行',
  createSchema: createAdministrativeFeeItemSchema,
  updateSchema: updateAdministrativeFeeItemSchema,
  // 分類を変えたら分類の並び順も付け替える（料金表の並びは分類単位）
  mapUpdateData: (data) => {
    const category = typeof data.category === 'string' ? data.category : null;
    return category ? { ...data, categoryOrder: administrativeFeeCategoryOrder(category) } : data;
  },
});
