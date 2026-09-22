/**
 * 申告書の自動計算。実体は `calc/` の各ファイルで、ここは取り込み口（再輸出のみ）。
 *
 * - `calc/values`  数値と単位（上位桁だけ記入する欄の SCALE 倍など）
 * - `calc/pages`   様式の枚数
 * - `calc/lawful`  法定相続人と第2表
 * - `calc/detail`  付表（財産の明細書）の明細
 * - `calc/assets`  財産・債務の価額（第9・10・11の2・13・14・15表と付表1）
 * - `calc/credits` 税額の加算・控除（第4・4の2・5・6・7・8の8表）
 * - `calc/all`     第1表と全体の組み立て
 */

// 数値と単位
export { SCALE, num, yen } from './calc/values';
export type { Values } from './calc/values';

// 枚数
export {
  table112Pages, hasTable112, table13MinPages, table13Pages, table9MinPages, table9Pages, table4Pages, table42Pages,
  table14MinPages, table14Pages, remapTable14Confirm, table88Pages, table10MinPages, table10Pages,
} from './calc/pages';

// 法定相続人・第2表
export { rateTax, lawfulMembers, deriveLawful, deriveCivil } from './calc/lawful';
export type { LawfulMember } from './calc/lawful';

// 付表の明細
export {
  DETAIL_SHARES_PER_GROUP, detailShareCount, detailGroupCount, sameValues, isEmptyDetail, DETAIL_METHOD,
  TABLE11F1_ROUTE_PRICE, TABLE11F1_MULTIPLE, TABLE11F1_ADJUST, TABLE11F1_UNIT, detailUnit, table11f1Calc,
  detailMethod, DETAIL_AUTO_VALUE, DETAIL_VALUE_MANUAL, detailAutoValue, detailValue, DETAIL_RATIO_N,
  DETAIL_RATIO_D, moved, moveDetailShare, detailShareAmounts, detailSlots,
} from './calc/detail';
export type { DetailMethod, Table11f1Calc, DetailSlot } from './calc/detail';

// 財産・債務の価額
export { DETAIL_SOURCE, table15Transferred } from './calc/assets';

// 税額の加算・控除
export { spouseIndex } from './calc/credits';

// 第1表と組み立て
export { computeHeir, computeAll } from './calc/all';
export type { UsedForms, Computed } from './calc/all';
