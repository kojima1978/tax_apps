// 画面の絞り込み条件（クエリ文字列）を TransactionFilter にする（Django 版 views/_helpers.py の
// build_filter_state）。値の解釈（金額の読み取りなど）は lib/aggregate.ts の filterTransactions に任せる。

import { TRANSACTION_MARKS, type TransactionFilter } from './lib/aggregate.js';

// 取引の ID（正の整数）。読めなければ条件なし
const idValue = (value: string | null): number | null => (value && /^\d{1,15}$/.test(value) ? Number(value) : null);

const pick = <const T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export function filterFromQuery(q: URLSearchParams, { includeTabFilters = false } = {}): TransactionFilter {
  const list = (key: string) => q.getAll(key).filter(Boolean);
  const filter: TransactionFilter = {
    bank: list('bank'),
    account: list('account'),
    category: list('category'),
    categoryMode: pick(q.get('category_mode'), ['include', 'exclude'], 'include'),
    keyword: q.get('keyword') ?? '',
    // ?desc= は摘要の完全一致（検討の表・未分類の組から移るリンク用）。値が空でも「摘要なし」の条件として効く
    description: q.has('desc') ? (q.get('desc') ?? '') : undefined,
    amountMin: q.get('amount_min') ?? '',
    amountMax: q.get('amount_max') ?? '',
    amountType: pick(q.get('amount_type'), ['both', 'out', 'in'], 'both'),
    dateFrom: q.get('date_from') ?? '',
    dateTo: q.get('date_to') ?? '',
    sort: q.get('sort') ?? '',
    // 取込の結果（依頼25）から移るリンク: ?id_from=&id_to=（今回の取込）・?id=（何度でも）・?mark=
    idFrom: idValue(q.get('id_from')),
    idTo: idValue(q.get('id_to')),
    ids: q.getAll('id').map(idValue).filter((n): n is number => n !== null),
    mark: q.has('mark') ? pick(q.get('mark'), [...TRANSACTION_MARKS, ''], '') || null : null,
  };
  if (includeTabFilters) {
    filter.transferCategory = list('transfer_category');
    filter.transferCategoryMode = pick(q.get('transfer_category_mode'), ['include', 'exclude'], 'include');
  }
  return filter;
}
