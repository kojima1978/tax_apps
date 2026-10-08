// 画面の絞り込み条件（クエリ文字列）を TransactionFilter にする（Django 版 views/_helpers.py の
// build_filter_state）。値の解釈（金額の読み取りなど）は lib/aggregate.ts の filterTransactions に任せる。

import type { TransactionFilter } from './lib/aggregate.js';

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
    amountMin: q.get('amount_min') ?? '',
    amountMax: q.get('amount_max') ?? '',
    amountType: pick(q.get('amount_type'), ['both', 'out', 'in'], 'both'),
    dateFrom: q.get('date_from') ?? '',
    dateTo: q.get('date_to') ?? '',
    sort: q.get('sort') ?? '',
  };
  if (includeTabFilters) {
    filter.transferCategory = list('transfer_category');
    filter.transferCategoryMode = pick(q.get('transfer_category_mode'), ['include', 'exclude'], 'include');
  }
  return filter;
}
