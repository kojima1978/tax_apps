import { describe, expect, it } from 'vitest';
import { ADMIN_HASH, CASES_HASH, FORM_HASH, companyHash, resolveRoute } from '../screen';

describe('resolveRoute', () => {
  it('ハッシュ無しは会社一覧から始まる（会社を選んでから帳票に入る）', () => {
    expect(resolveRoute('')).toEqual({ screen: 'cases' });
    expect(resolveRoute(CASES_HASH)).toEqual({ screen: 'cases' });
  });

  it('#cases/<印> はその会社の年度一覧', () => {
    expect(resolveRoute(companyHash('key:abc-123'))).toEqual({
      screen: 'company',
      groupKey: 'key:abc-123',
    });
  });

  it('会社名の印はそのまま読み戻せる（記号や日本語が入る）', () => {
    expect(resolveRoute(companyHash('name:甲田製作所'))).toEqual({
      screen: 'company',
      groupKey: 'name:甲田製作所',
    });
  });

  it('#form は帳票（作業中の再読み込みで一覧へ戻されない）', () => {
    expect(resolveRoute(FORM_HASH)).toEqual({ screen: 'form' });
  });

  it('#industry-data は業種目データ管理', () => {
    expect(resolveRoute(ADMIN_HASH)).toEqual({ screen: 'admin' });
  });

  it('知らないハッシュ・壊れた印は会社一覧に落とす（行き止まりを作らない）', () => {
    expect(resolveRoute('#table3')).toEqual({ screen: 'cases' });
    expect(resolveRoute('#')).toEqual({ screen: 'cases' });
    expect(resolveRoute(`${CASES_HASH}/`)).toEqual({ screen: 'cases' });
    expect(resolveRoute(`${CASES_HASH}/%E4%B8`)).toEqual({ screen: 'cases' });
  });
});
