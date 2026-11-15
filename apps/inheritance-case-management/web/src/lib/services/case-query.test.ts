import { describe, expect, it } from 'vitest';
import { buildCaseWhereClause } from './case-query';
import { buildDeadlineCondition } from './case-deadline-query';
import { CLOSED_STATUSES } from '@/types/constants';

const HIDE_CLOSED = { status: { notIn: [...CLOSED_STATUSES] } };

/** AND に積まれた条件を配列で取り出す（1つだけのときも配列に）。 */
function andClauses(where: ReturnType<typeof buildCaseWhereClause>) {
  return Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
}

describe('案件一覧の絞り込み条件（buildCaseWhereClause）', () => {
  it('条件なしなら何も絞らない', () => {
    expect(buildCaseWhereClause({})).toEqual({});
  });

  describe('完了案件を隠す', () => {
    it('ほかに指定がなければ見送り・入金済を外す', () => {
      expect(andClauses(buildCaseWhereClause({ hideClosed: true }))).toEqual([HIDE_CLOSED]);
    });

    it('名前検索のときは完了案件も探せるよう外さない', () => {
      const clauses = andClauses(buildCaseWhereClause({ hideClosed: true, search: '山田' }));
      expect(clauses).not.toContainEqual(HIDE_CLOSED);
      expect(clauses).toHaveLength(1);
    });

    it('ステータスを明示したときはその指定を優先する', () => {
      const where = buildCaseWhereClause({ hideClosed: true, status: '入金済' });
      expect(where.status).toBe('入金済');
      expect(andClauses(where)).toEqual([]);
    });
  });

  it('ステータスはカンマ区切りなら in にする', () => {
    expect(buildCaseWhereClause({ status: '見積中,受託' }).status).toEqual({ in: ['見積中', '受託'] });
  });

  it('未分割は false も条件として残す', () => {
    expect(buildCaseWhereClause({ isUndivided: false }).isUndivided).toBe(false);
  });

  describe('年度', () => {
    it('1つの年度', () => {
      expect(buildCaseWhereClause({ fiscalYear: 2026 }).fiscalYear).toBe(2026);
    });

    it('カンマ区切りの年度は数値の in にする', () => {
      expect(buildCaseWhereClause({ fiscalYears: '2025,2026' }).fiscalYear).toEqual({ in: [2025, 2026] });
    });

    it('両方あれば1つの年度を優先する', () => {
      expect(buildCaseWhereClause({ fiscalYear: 2024, fiscalYears: '2025,2026' }).fiscalYear).toBe(2024);
    });
  });

  describe('担当者', () => {
    it('未割当は担当者・社員の指定より優先する', () => {
      const where = buildCaseWhereClause({ unassigned: true, staffId: 1, assigneeId: 2, internalReferrerId: 3 });
      expect(where.assigneeId).toBeNull();
      expect(where.OR).toBeUndefined();
      expect(where.internalReferrerId).toBeUndefined();
    });

    it('社員の指定は担当か社内紹介のどちらかで当たり、個別の指定より優先する', () => {
      const where = buildCaseWhereClause({ staffId: 1, assigneeId: 2, internalReferrerId: 3 });
      expect(where.OR).toEqual([{ assigneeId: 1 }, { internalReferrerId: 1 }]);
      expect(where.assigneeId).toBeUndefined();
      expect(where.internalReferrerId).toBeUndefined();
    });

    it('担当者と社内紹介者は両方そろって当たる', () => {
      const where = buildCaseWhereClause({ assigneeId: 2, internalReferrerId: 3 });
      expect(where.assigneeId).toBe(2);
      expect(where.internalReferrerId).toBe(3);
    });

    it('社員の指定と名前検索は両方効く（検索は AND 側に入る）', () => {
      const where = buildCaseWhereClause({ staffId: 1, search: '山田' });
      expect(where.OR).toEqual([{ assigneeId: 1 }, { internalReferrerId: 1 }]);
      expect(andClauses(where)).toHaveLength(1);
    });

    it('部署は担当者の所属で絞る', () => {
      expect(buildCaseWhereClause({ department: '資産税部' }).assignee).toEqual({ department: { name: '資産税部' } });
    });
  });

  describe('紹介元', () => {
    it('紹介なしは社外・社内の紹介者がどちらもいない案件', () => {
      const where = buildCaseWhereClause({ noReferrer: true });
      expect(where.referrerId).toBeNull();
      expect(where.internalReferrerId).toBeNull();
    });

    it('紹介なしでも社内紹介者を明示していればそれを残す', () => {
      const where = buildCaseWhereClause({ noReferrer: true, internalReferrerId: 3 });
      expect(where.referrerId).toBeNull();
      expect(where.internalReferrerId).toBe(3);
    });

    it('紹介なしと紹介元の会社は同時に効かせない（紹介なしを優先）', () => {
      const where = buildCaseWhereClause({ noReferrer: true, referrerCompany: '○○銀行' });
      expect(where.referrerId).toBeNull();
      expect(where.referrer).toBeUndefined();
    });

    it('紹介元の会社は会社名で絞る', () => {
      expect(buildCaseWhereClause({ referrerCompany: '○○銀行' }).referrer).toEqual({ company: { name: '○○銀行' } });
    });
  });

  describe('期限', () => {
    it('期限間近・期限超過は期限の条件を AND に積む', () => {
      const where = buildCaseWhereClause({ deadlineSoon: true, deadlineOverdue: true });
      const clauses = andClauses(where) as { status?: unknown; OR?: unknown }[];
      expect(clauses).toHaveLength(2);
      // 日付の範囲は今日に依存するので、ステータスの並びだけ同じことを確かめる（範囲は case-deadline-query.test.ts）
      expect(clauses[0].status).toEqual(buildDeadlineCondition('soon').status);
      expect(clauses[1].status).toEqual(buildDeadlineCondition('overdue').status);
    });

    it('完了案件を隠す条件とも重ねられる', () => {
      const clauses = andClauses(buildCaseWhereClause({ hideClosed: true, deadlineSoon: true }));
      expect(clauses[0]).toEqual(HIDE_CLOSED);
      expect(clauses).toHaveLength(2);
    });
  });

  describe('日付の範囲', () => {
    it('開始は含み、終了は含まない（UTC の0時）', () => {
      const where = buildCaseWhereClause({ caseAddedFrom: '2026-04-01', caseAddedTo: '2026-05-01' });
      expect(where.caseAddedDate).toEqual({
        gte: new Date('2026-04-01T00:00:00.000Z'),
        lt: new Date('2026-05-01T00:00:00.000Z'),
      });
    });

    it('片側だけでも絞れる', () => {
      const where = buildCaseWhereClause({ caseCompletedTo: '2026-01-01', billedFrom: '2025-12-01', paidTo: '2026-02-01' });
      expect(where.caseCompletedDate).toEqual({ lt: new Date('2026-01-01T00:00:00.000Z') });
      expect(where.billedDate).toEqual({ gte: new Date('2025-12-01T00:00:00.000Z') });
      expect(where.paidDate).toEqual({ lt: new Date('2026-02-01T00:00:00.000Z') });
    });
  });
});
