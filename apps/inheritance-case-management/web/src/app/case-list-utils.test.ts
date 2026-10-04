import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CasesQueryParams } from '@/lib/api/cases';
import type { CaseListItem } from '@/types/shared';
import {
  CASE_LIST_PAGE_SIZE,
  COMPLETED_STATUS_CSV,
  ONGOING_STATUS,
  applyKpiCardFilter,
  calculateCaseListAmountTotals,
  getActiveKpiFilter,
  getCaseListFilterDescription,
  getCaseListFilters,
  getCaseListKpiFilters,
  getHasCaseFilters,
  getThisMonthRange,
  parseCaseListFilterValue,
  parseCaseListUrlParams,
  toCaseListUrlSearch,
} from './case-list-utils';

const parse = (search: string) => parseCaseListUrlParams(new URLSearchParams(search));

// 「当年度を既定にする」「当月の範囲」を含むので時刻を固定する。
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-04T09:00:00+09:00'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('URL から絞り込み条件を読む', () => {
  it('何も付いていなければ当年度・終了案件は除外・1ページ目', () => {
    expect(parse('')).toEqual({
      page: 1,
      pageSize: CASE_LIST_PAGE_SIZE,
      fiscalYear: 2026,
      hideClosed: true,
    });
  });

  it('他の絞り込みがあるときは年度を勝手に足さない（検索結果が当年度に隠れないように）', () => {
    const params = parse('search=山田');
    expect(params.search).toBe('山田');
    expect(params.fiscalYear).toBeUndefined();
  });

  it('年度は単年指定が複数年指定より優先する', () => {
    expect(parse('fiscalYear=2024&fiscalYears=2024,2025').fiscalYear).toBe(2024);
    expect(parse('fiscalYear=2024&fiscalYears=2024,2025').fiscalYears).toBeUndefined();
    expect(parse('fiscalYears=2024,2025').fiscalYears).toBe('2024,2025');
  });

  it('終了案件の扱いは URL の指定が最優先、次がステータスの有無', () => {
    expect(parse('hideClosed=false').hideClosed).toBe(false);
    expect(parse('hideClosed=true').hideClosed).toBe(true);
    // ステータスを明示したときは、そのステータスの案件を隠さない
    expect(parse('status=入金済').hideClosed).toBeUndefined();
  });

  it('真偽値の絞り込みは "true" のときだけ立てる', () => {
    expect(parse('unassigned=true&noReferrer=1&deadlineSoon=false')).toMatchObject({ unassigned: true });
    expect(parse('unassigned=true&noReferrer=1&deadlineSoon=false').noReferrer).toBeUndefined();
    expect(parse('unassigned=true&noReferrer=1&deadlineSoon=false').deadlineSoon).toBeUndefined();
  });

  it('並び替えは想定した値だけ受け付ける', () => {
    expect(parse('sortBy=bestAmount&sortOrder=asc')).toMatchObject({ sortBy: 'bestAmount', sortOrder: 'asc' });
    expect(parse('sortBy=deceasedName&sortOrder=up').sortBy).toBeUndefined();
    expect(parse('sortBy=deceasedName&sortOrder=up').sortOrder).toBeUndefined();
  });
});

describe('URL へ書き戻す', () => {
  it('既定値は書かない（URLを短く保ち、既定の変更に追従させる）', () => {
    expect(toCaseListUrlSearch({ page: 1, pageSize: CASE_LIST_PAGE_SIZE, hideClosed: true })).toBe('');
  });

  it('既定から外れたものだけ書く', () => {
    const search = toCaseListUrlSearch({ page: 3, hideClosed: false, unassigned: true, assigneeId: 5 });
    const sp = new URLSearchParams(search);
    expect(sp.get('page')).toBe('3');
    expect(sp.get('hideClosed')).toBe('false');
    expect(sp.get('unassigned')).toBe('true');
    expect(sp.get('assigneeId')).toBe('5');
  });

  it('書いて読み直すと同じ条件に戻る', () => {
    const params: CasesQueryParams = {
      page: 2,
      pageSize: CASE_LIST_PAGE_SIZE,
      fiscalYears: '2024,2025',
      search: '山田',
      department: '資産税部',
      assigneeId: 3,
      internalReferrerId: 4,
      staffId: 5,
      referrerCompany: 'あおぞら銀行',
      unassigned: true,
      noReferrer: true,
      billedFrom: '2026-01-01',
      paidTo: '2026-12-31',
      hideClosed: false,
      sortBy: 'bestAmount',
      sortOrder: 'desc',
    };
    expect(parse(toCaseListUrlSearch(params))).toEqual(params);
  });
});

describe('絞り込み値の読み取り', () => {
  it('種類ごとに型を揃える', () => {
    expect(parseCaseListFilterValue('hideClosed', 'false')).toBe(false);
    expect(parseCaseListFilterValue('unassigned', 'true')).toBe(true);
    expect(parseCaseListFilterValue('unassigned', 'false')).toBeUndefined();
    expect(parseCaseListFilterValue('assigneeId', '7')).toBe(7);
    expect(parseCaseListFilterValue('assigneeId', '')).toBeUndefined();
    expect(parseCaseListFilterValue('search', '山田')).toBe('山田');
    expect(parseCaseListFilterValue('search', '')).toBeUndefined();
  });
});

describe('いま効いている絞り込み', () => {
  const params: CasesQueryParams = {
    page: 2,
    pageSize: CASE_LIST_PAGE_SIZE,
    sortBy: 'bestAmount',
    search: '山田',
    assigneeId: 3,
    hideClosed: true,
  };

  it('ページ番号や並び順は絞り込みに数えない', () => {
    expect(getCaseListFilters(params)).toEqual({ search: '山田', assigneeId: 3 });
    expect(getHasCaseFilters({ page: 1, pageSize: CASE_LIST_PAGE_SIZE })).toBe(false);
    expect(getHasCaseFilters(params)).toBe(true);
  });

  it('KPIの集計にはカード由来の条件を渡さない（カード同士の数値を独立させる）', () => {
    const { from, to } = getThisMonthRange();
    const withCard: CasesQueryParams = {
      ...params,
      status: ONGOING_STATUS,
      deadlineSoon: true,
      caseAddedFrom: from,
      caseAddedTo: to,
    };
    expect(getCaseListKpiFilters(withCard)).toEqual({ search: '山田', assigneeId: 3 });
  });

  it('手で選んだステータスは KPI にも効かせる', () => {
    expect(getCaseListKpiFilters({ ...params, status: '手続中' })).toEqual({
      search: '山田',
      assigneeId: 3,
      status: '手続中',
    });
  });
});

describe('KPIカードの切り替え', () => {
  const manual: CasesQueryParams = { page: 3, pageSize: CASE_LIST_PAGE_SIZE, search: '山田', assigneeId: 3, hideClosed: true };

  it('カードを選ぶと1ページ目に戻り、手で入れた絞り込みは残る', () => {
    const next = applyKpiCardFilter(manual, 'ongoing');
    expect(next.page).toBe(1);
    expect(next.search).toBe('山田');
    expect(next.assigneeId).toBe(3);
    expect(next.status).toBe(ONGOING_STATUS);
    expect(getActiveKpiFilter(next)).toBe('ongoing');
  });

  it('別のカードへ移ると前のカードの条件だけ消える（積み重ならない）', () => {
    const ongoing = applyKpiCardFilter(manual, 'ongoing');
    const added = applyKpiCardFilter(ongoing, 'addedThisMonth');
    const { from, to } = getThisMonthRange();
    expect(added.status).toBeUndefined();
    expect(added.caseAddedFrom).toBe(from);
    expect(added.caseAddedTo).toBe(to);
    expect(added.hideClosed).toBe(false);
    expect(added.search).toBe('山田');
    expect(getActiveKpiFilter(added)).toBe('addedThisMonth');

    const completed = applyKpiCardFilter(added, 'completed');
    expect(completed.caseAddedFrom).toBeUndefined();
    expect(completed.caseAddedTo).toBeUndefined();
    expect(completed.status).toBe(COMPLETED_STATUS_CSV);
    expect(getActiveKpiFilter(completed)).toBe('completed');
  });

  it('同じカードをもう一度押すと選択が解除され、既定へ戻る', () => {
    const ongoing = applyKpiCardFilter(manual, 'ongoing');
    const off = applyKpiCardFilter(ongoing, 'ongoing');
    expect(off.status).toBeUndefined();
    expect(off.hideClosed).toBe(true);
    expect(off.search).toBe('山田');
    expect(getActiveKpiFilter(off)).toBeNull();
  });

  it('総案件数カードは終了案件も含める', () => {
    const total = applyKpiCardFilter(manual, 'total');
    expect(total.hideClosed).toBe(false);
    expect(getActiveKpiFilter(total)).toBe('total');
  });
});

describe('一覧の金額合計', () => {
  const mk = (over: Partial<CaseListItem>): CaseListItem => ({
    id: 1,
    deceasedName: '案件',
    dateOfDeath: '2026-01-01',
    status: '手続中',
    isUndivided: false,
    feeAmount: 0,
    estimateAmount: 0,
    fiscalYear: 2026,
    hasMemo: false,
    ...over,
  });

  it('報酬額が入っていれば確定、未入力なら見積として足す', () => {
    const totals = calculateCaseListAmountTotals([
      mk({ id: 1, feeAmount: 1_000_000, estimateAmount: 900_000 }),
      mk({ id: 2, feeAmount: 0, estimateAmount: 500_000 }),
      mk({ id: 3, feeAmount: 0, estimateAmount: 0 }),
    ]);
    expect(totals).toEqual({ confirmed: 1_000_000, estimate: 500_000, total: 1_500_000 });
  });

  it('0件なら全部0（合計欄に NaN を出さない）', () => {
    expect(calculateCaseListAmountTotals([])).toEqual({ confirmed: 0, estimate: 0, total: 0 });
  });
});

describe('絞り込みの説明文（印刷の見出しに出る）', () => {
  const assignees = [{ id: 3, name: '佐藤 一郎' }, { id: 4, name: '鈴木 二郎' }];

  it('効いている条件を並べる', () => {
    const text = getCaseListFilterDescription(
      { fiscalYear: 2026, status: '手続中', assigneeId: 3, unassigned: true, search: '山田' },
      assignees
    );
    expect(text).toBe('2026年度 / ステータス: 手続中 / 担当者: 佐藤 一郎 / 担当者: 未設定 / 検索: 山田');
  });

  it('条件が無ければ「全案件」', () => {
    expect(getCaseListFilterDescription({}, assignees)).toBe('全案件');
  });

  it('名簿に無いIDは名前を出さない（"undefined" と書かない）', () => {
    expect(getCaseListFilterDescription({ assigneeId: 99 }, assignees)).toBe('全案件');
  });
});
