import { describe, expect, it } from 'vitest';
import { findGroupByKey, groupCasesByCompany, groupKeyOf, groupKeyOfCaseId, taxPeriodOrder } from '../caseGroups';

/** 一覧はサーバから更新日時の降順で来る。テストもその順で並べて渡す。 */
const caseOf = (id: number, companyName: string, taxPeriod: string, companyKey: string | null = null) =>
  ({ id, companyName, taxPeriod, companyKey });

describe('taxPeriodOrder', () => {
  it('年月日を比べられる数にする', () => {
    expect(taxPeriodOrder('令和8年3月15日')).toBeGreaterThan(taxPeriodOrder('令和8年2月28日')!);
  });

  it('元号をまたいでも新しいほうが大きい', () => {
    expect(taxPeriodOrder('令和1年5月1日')).toBeGreaterThan(taxPeriodOrder('平成31年4月30日')!);
  });

  it('元号が無ければ令和として読む', () => {
    expect(taxPeriodOrder('8年3月15日')).toBe(taxPeriodOrder('令和8年3月15日'));
  });

  it('月・日が欠けていても読む（同じ年では月日入りより前）', () => {
    expect(taxPeriodOrder('令和8年')).toBeLessThan(taxPeriodOrder('令和8年1月')!);
  });

  it('読めない文字列は null', () => {
    expect(taxPeriodOrder('')).toBeNull();
    expect(taxPeriodOrder('未定')).toBeNull();
  });
});

describe('groupCasesByCompany', () => {
  it('1件しか無い会社はまとめない', () => {
    const groups = groupCasesByCompany([caseOf(1, '甲田製作所', '令和8年3月15日')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(1);
  });

  it('同じ会社は1つの塊にし、中は課税時期の新しい順', () => {
    const groups = groupCasesByCompany([
      caseOf(1, '甲田製作所', '令和6年3月15日'),
      caseOf(2, '乙山商事', '令和8年1月10日'),
      caseOf(3, '甲田製作所', '令和8年3月15日'),
    ]);
    expect(groups.map((g) => g.companyName)).toEqual(['甲田製作所', '乙山商事']);
    expect(groups[0]!.items.map((item) => item.id)).toEqual([3, 1]);
  });

  it('空白と大文字小文字の打ち分けは同じ会社として扱う', () => {
    const groups = groupCasesByCompany([
      caseOf(1, 'ABC　工業', '令和8年3月15日'),
      caseOf(2, 'abc工業', '令和7年3月15日'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(2);
  });

  it('課税時期が読めないものは塊の後ろへ回す', () => {
    const groups = groupCasesByCompany([
      caseOf(1, '甲田製作所', ''),
      caseOf(2, '甲田製作所', '令和7年3月15日'),
      caseOf(3, '甲田製作所', '令和8年3月15日'),
    ]);
    expect(groups[0]!.items.map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it('会社名が未入力の案件はまとめない（別の会社かどうか分からない）', () => {
    const groups = groupCasesByCompany([caseOf(1, '', ''), caseOf(2, '  ', '')]);
    expect(groups).toHaveLength(2);
  });

  it('会社キーが同じなら会社名が違っても1つの塊（名前を直しても年分が離れない）', () => {
    const groups = groupCasesByCompany([
      caseOf(2, '有限会社中山家具', '令和8年3月15日', 'k1'),
      caseOf(1, '中山家具　有限会社', '令和7年3月15日', 'k1'),
    ]);
    expect(groups).toHaveLength(1);
    // 見出しは一番新しい年分の名前（直したほうが出る）。
    expect(groups[0]!.companyName).toBe('有限会社中山家具');
  });

  it('会社キーが違えば会社名が同じでも混ざらない（同名の別会社）', () => {
    const groups = groupCasesByCompany([
      caseOf(1, '山田商事', '令和8年3月15日', 'k1'),
      caseOf(2, '山田商事', '令和8年3月15日', 'k2'),
    ]);
    expect(groups.map((g) => g.items.map((item) => item.id))).toEqual([[1], [2]]);
  });

  it('キーの無い案件は同じ名前の塊へ入る（この仕組みより前の案件・手で作った案件）', () => {
    const groups = groupCasesByCompany([
      caseOf(3, '甲田製作所', '令和6年3月15日'),
      caseOf(2, '甲田製作所', '令和8年3月15日', 'k1'),
      caseOf(1, '甲田製作所', '令和7年3月15日', 'k1'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('塊の順は一番上に来た案件で決まる（キーの有無で先回りしない）', () => {
    const groups = groupCasesByCompany([
      caseOf(1, '乙山商事', '令和8年1月10日'),
      caseOf(2, '甲田製作所', '令和8年3月15日', 'k1'),
    ]);
    expect(groups.map((g) => g.companyName)).toEqual(['乙山商事', '甲田製作所']);
  });
});

describe('groupKeyOf', () => {
  it('会社キーがあればそれを印にする', () => {
    expect(groupKeyOf(caseOf(1, '甲田製作所', '', 'k1'))).toBe('key:k1');
  });

  it('会社キーが無ければ会社名（絞り込みと同じ正規化）', () => {
    expect(groupKeyOf(caseOf(1, 'ABC　工業', ''))).toBe(groupKeyOf(caseOf(2, 'abc工業', '')));
  });

  it('会社名も無ければ他と混ざらないようIDで止める', () => {
    expect(groupKeyOf(caseOf(7, '  ', ''))).toBe('id:7');
  });
});

describe('groupKeyOfCaseId', () => {
  /** 帳票の「← 一覧」の戻り先。会社キーの無い案件でも、実在する塊の印を返さなければならない。 */
  const cases = [
    caseOf(1, '甲田製作所', '令和8年3月15日', 'k1'),
    caseOf(2, '甲田製作所', '令和6年3月15日'),
    caseOf(3, '乙山商事', '令和8年1月10日'),
  ];

  it('会社キーを持つ案件はそのキーの塊', () => {
    expect(groupKeyOfCaseId(cases, 1)).toBe('key:k1');
  });

  it('キーの無い案件でも、寄せられた先の塊の印を返す（自前で作った印とは違う）', () => {
    expect(groupKeyOfCaseId(cases, 2)).toBe('key:k1');
    expect(groupKeyOf(cases[1]!)).toBe('name:甲田製作所');
  });

  it('寄せる先が無ければ会社名の印', () => {
    expect(groupKeyOfCaseId(cases, 3)).toBe('name:乙山商事');
  });

  it('一覧にない案件は null（戻り先を会社一覧に落とす）', () => {
    expect(groupKeyOfCaseId(cases, 99)).toBeNull();
  });
});

describe('findGroupByKey', () => {
  it('印が一致する塊', () => {
    const groups = groupCasesByCompany([caseOf(1, '甲田製作所', '令和8年3月15日', 'k1')]);
    expect(findGroupByKey(groups, 'key:k1')?.companyName).toBe('甲田製作所');
  });

  it('会社キーが後から振られても、古い会社名の印で見つかる', () => {
    // 年分を足した瞬間にサーバが両方へキーを振るので、塊の印は key: に変わる。
    // URL に残っているのは変わる前の name: なので、これが当たらないと戻り先が消える。
    const groups = groupCasesByCompany([
      caseOf(2, '甲田製作所', '令和9年3月15日', 'k1'),
      caseOf(1, '甲田製作所', '令和8年3月15日', 'k1'),
    ]);
    expect(groups[0]!.key).toBe('key:k1');
    expect(findGroupByKey(groups, 'name:甲田製作所')?.key).toBe('key:k1');
  });

  it('無い会社は null', () => {
    const groups = groupCasesByCompany([caseOf(1, '甲田製作所', '令和8年3月15日')]);
    expect(findGroupByKey(groups, 'name:乙山商事')).toBeNull();
    expect(findGroupByKey(groups, 'key:k9')).toBeNull();
  });
});
