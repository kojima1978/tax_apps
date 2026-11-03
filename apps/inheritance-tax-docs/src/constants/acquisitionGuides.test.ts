import { describe, expect, it } from 'vitest';
import {
  ACQUISITION_GUIDES,
  ACQUISITION_GUIDE_IDS,
  acquisitionGuideIdForDocument,
  formatAcquisitionGuideRequest,
} from './acquisitionGuides';

describe('相続税申告用の資料取得案内', () => {
  it('選択対象を10種類だけ定義する', () => {
    expect(ACQUISITION_GUIDES).toHaveLength(10);
    expect(ACQUISITION_GUIDES.map((guide) => guide.id)).toEqual(ACQUISITION_GUIDE_IDS);
    expect(new Set(ACQUISITION_GUIDES.map((guide) => guide.id)).size).toBe(10);
    expect(ACQUISITION_GUIDES[2].id).toBe('family-register-broad-issuance');
  });

  it('被相続人名を窓口提示文へ入れる', () => {
    const guide = ACQUISITION_GUIDES.find((item) => item.id === 'bank-balance');
    expect(guide).toBeDefined();
    expect(formatAcquisitionGuideRequest(guide!, '山田 太郎')).toContain('山田 太郎 様');
    expect(guide?.requestOptions).toEqual([
      { label: '証明内容', value: 'すべてのお取引' },
      { label: '発行対象店', value: '取引がある口座すべて' },
      { label: '出力単位', value: '取引の口座番号別の残高' },
    ]);
  });

  it('被相続人名が空でも手書きできる空欄を残す', () => {
    const guide = ACQUISITION_GUIDES[0];
    expect(formatAcquisitionGuideRequest(guide, '')).toContain('________________ 様');
  });

  it('必要書類の行を銀行・証券会社それぞれの案内へ結び付ける', () => {
    expect(acquisitionGuideIdForDocument('cash_zandaka')).toBe('bank-balance');
    expect(acquisitionGuideIdForDocument('sec_zandaka')).toBe('securities-balance');
    expect(acquisitionGuideIdForDocument('deceased_fuhyo')).toBe('family-register-address-history');
    expect(acquisitionGuideIdForDocument('heir_koseki')).toBe('heir-family-register');
    expect(acquisitionGuideIdForDocument('deceased_jyuminhyo')).toBeUndefined();
    expect(acquisitionGuideIdForDocument('heir_jyuminhyo')).toBe('resident-record');
    expect(acquisitionGuideIdForDocument('real_estate_hyouka')).toBeUndefined();
  });

  it('印鑑登録証明書は3枚、それ以外は1枚と案内する', () => {
    expect(ACQUISITION_GUIDES.find((guide) => guide.id === 'seal-certificate')?.requiredCopies).toBe(3);
    expect(ACQUISITION_GUIDES.filter((guide) => guide.id !== 'seal-certificate').every((guide) => guide.requiredCopies === 1)).toBe(true);
    expect(ACQUISITION_GUIDES.find((guide) => guide.id === 'family-register-broad-issuance')?.requiredCopiesLabel).toBe('各1枚');
  });

  it('財産を引き継ぐ方の住民票は抄本と記載事項を明示する', () => {
    const guide = ACQUISITION_GUIDES.find((item) => item.id === 'resident-record');
    expect(guide?.requestText).toContain('住民票の写し（世帯の一部）');
    expect(guide?.requestOptions).toEqual([
      { label: '証明書の種類', value: '抄本（世帯の一部）' },
      { label: 'マイナンバー', value: '省略（記載しない）' },
      { label: '本籍地・筆頭者・続柄', value: '記載あり' },
    ]);
  });
});
