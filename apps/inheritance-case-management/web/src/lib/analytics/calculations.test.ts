import { describe, expect, it } from 'vitest';
import type { InheritanceCase } from '@/types/shared';
import {
  calcBestNet,
  calcNet,
  calcNetPersonal,
  calcReferralFee,
  fiscalYearWareki,
  formatCurrency,
  formatDateWithWareki,
  getAnalyticsBaseType,
  pinBottomCompare,
  toWareki,
  LABEL_NONE,
  LABEL_UNSET,
} from './calculations';

const base: InheritanceCase = {
  id: 1,
  deceasedName: '案件A',
  dateOfDeath: '2026-01-01',
  status: '手続中',
  taxAmount: 0,
  feeAmount: 0,
  fiscalYear: 2026,
  estimateAmount: 0,
  propertyValue: 0,
  referralFeeAmount: 0,
  estimateReferralFeeAmount: 0,
};

// estimateReferralFeeAmount は型では number だが、DB では未入力＝null が返る。
// 計算側も `!= null` で分岐しているので、テストでも null を渡せるようにしておく。
type CaseOverrides = Partial<Omit<InheritanceCase, 'estimateReferralFeeAmount'>> & {
  estimateReferralFeeAmount?: number | null;
};
const mkCase = (over: CaseOverrides = {}): InheritanceCase => ({ ...base, ...over }) as InheritanceCase;

describe('集計に使う金額の種類', () => {
  it('受託〜申告済は見込、請求済・入金済は確定', () => {
    expect(getAnalyticsBaseType(mkCase({ status: '受託' }))).toBe('estimate');
    expect(getAnalyticsBaseType(mkCase({ status: '申告済' }))).toBe('estimate');
    expect(getAnalyticsBaseType(mkCase({ status: '請求済' }))).toBe('fee');
    expect(getAnalyticsBaseType(mkCase({ status: '入金済' }))).toBe('fee');
  });

  it('見積前・見積中・見送りは集計に入れない', () => {
    for (const status of ['見積前', '見積中', '見送り'] as const) {
      expect(getAnalyticsBaseType(mkCase({ status })), status).toBeNull();
    }
  });
});

describe('紹介手数料', () => {
  it('確定（報酬ベース）は登録済みの金額をそのまま使う', () => {
    const c = mkCase({ feeAmount: 1_000_000, referralFeeAmount: 150_000, referralFeeRate: 30 });
    // 率は見ない。確定額が入っている以上そちらが正。
    expect(calcReferralFee(c, 'fee')).toBe(150_000);
  });

  it('見込は、見積紹介料が入っていればそれを優先する', () => {
    const c = mkCase({ estimateAmount: 1_000_000, estimateReferralFeeAmount: 120_000, referralFeeRate: 15 });
    expect(calcReferralFee(c, 'estimate')).toBe(120_000);
  });

  it('見込で見積紹介料が未入力なら率から計算する（端数は切り捨て）', () => {
    const c = mkCase({ estimateAmount: 1_234_567, estimateReferralFeeAmount: null, referralFeeRate: 15 });
    expect(calcReferralFee(c, 'estimate')).toBe(185_185); // 1,234,567 × 15% = 185,185.05
  });

  it('見積紹介料が0円なら「0と決めた」として扱う（率へ落とさない）', () => {
    const c = mkCase({ estimateAmount: 1_000_000, estimateReferralFeeAmount: 0, referralFeeRate: 15 });
    expect(calcReferralFee(c, 'estimate')).toBe(0);
  });

  it('率も金額も無ければ0', () => {
    expect(calcReferralFee(mkCase({ estimateAmount: 1_000_000, estimateReferralFeeAmount: null }), 'estimate')).toBe(0);
    expect(calcReferralFee(mkCase({ feeAmount: 1_000_000 }), 'fee')).toBe(0);
  });
});

describe('ネット売上', () => {
  const external = mkCase({ feeAmount: 1_000_000, referralFeeAmount: 150_000 });
  const internal = mkCase({ feeAmount: 1_000_000, referralFeeAmount: 150_000, internalReferrerId: 7 });

  it('会社の売上は社外紹介料だけ引く（社内紹介は社外流出ではない）', () => {
    expect(calcNet(external, 'fee')).toBe(850_000);
    expect(calcNet(internal, 'fee')).toBe(1_000_000);
  });

  it('個人の売上は社内紹介でも引く', () => {
    expect(calcNetPersonal(external, 'fee')).toBe(850_000);
    expect(calcNetPersonal(internal, 'fee')).toBe(850_000);
  });

  it('報酬額が入っていれば確定、未入力なら見込で計算する', () => {
    expect(calcBestNet(mkCase({ feeAmount: 1_000_000, referralFeeAmount: 150_000, estimateAmount: 2_000_000 })))
      .toBe(850_000);
    expect(calcBestNet(mkCase({ feeAmount: 0, estimateAmount: 2_000_000, estimateReferralFeeAmount: 200_000 })))
      .toBe(1_800_000);
  });

  it('報酬額0は「未入力」と同じ扱い（0円で確定した案件は無い）', () => {
    expect(calcBestNet(mkCase({ feeAmount: 0, estimateAmount: 500_000, estimateReferralFeeAmount: 0 }))).toBe(500_000);
  });
});

describe('「なし」「未設定」を末尾へ寄せる比較', () => {
  it('片方だけが末尾行なら末尾行を下にする', () => {
    expect(pinBottomCompare('あおぞら銀行', LABEL_NONE)).toBe(-1);
    expect(pinBottomCompare(LABEL_UNSET, 'あおぞら銀行')).toBe(1);
  });

  it('どちらも通常行／どちらも末尾行なら同等（次の条件へ譲る）', () => {
    expect(pinBottomCompare('A社', 'B社')).toBe(0);
    expect(pinBottomCompare(LABEL_NONE, LABEL_UNSET)).toBe(0);
  });
});

describe('和暦の表示', () => {
  it('改元日の前後で切り替わり、元年は「元」と書く', () => {
    expect(toWareki('2019-04-30')).toBe('平成31年');
    expect(toWareki('2019-05-01')).toBe('令和元年');
    expect(toWareki('1989-01-07')).toBe('昭和64年');
    expect(toWareki('1989-01-08')).toBe('平成元年');
    expect(toWareki('2026-07-04')).toBe('令和8年');
  });

  it('年度は元号1文字＋年（元年は「元」）', () => {
    expect(fiscalYearWareki(2026)).toBe('R8');
    expect(fiscalYearWareki(2019)).toBe('R元');
    expect(fiscalYearWareki(2018)).toBe('H30');
    expect(fiscalYearWareki(1989)).toBe('H元');
    expect(fiscalYearWareki(1988)).toBe('S63');
  });

  it('日付は西暦と和暦を並べて出す', () => {
    expect(formatDateWithWareki('2026-07-04')).toBe('2026/7/4（令和8年）');
  });
});

describe('金額の表示', () => {
  it('円記号と桁区切りを付ける', () => {
    expect(formatCurrency(1_234_567)).toBe('￥1,234,567');
    expect(formatCurrency(0)).toBe('￥0');
    expect(formatCurrency(-5_000)).toBe('-￥5,000');
  });
});
