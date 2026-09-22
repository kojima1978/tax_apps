import { describe, expect, it } from 'vitest';
import type { TableId } from '@/types/form';
import {
  caseDisplayName,
  caseLabelsOf,
  formatSavedAt,
  saveStatusLabel,
  taxPeriodLabel,
} from '../caseLabels';

/** 第1表の該当欄だけを返す getField。様式のどの欄を見ているかをそのまま書く。 */
function fields(values: Record<string, string>) {
  return (table: TableId, field: string) => (table === 'table1_1' ? values[field] ?? '' : '');
}

describe('taxPeriodLabel', () => {
  it('元号・年・月・日がそろえば1つの日付にする', () => {
    expect(taxPeriodLabel(fields({ f14_g: '令和', f14_y: '8', f14_m: '3', f14_d: '15' })))
      .toBe('令和8年3月15日');
  });

  it('元号が空なら既定の元号で補う（様式の元号欄は既定のまま使われることが多い）', () => {
    expect(taxPeriodLabel(fields({ f14_y: '8', f14_m: '3', f14_d: '15' }))).toBe('令和8年3月15日');
  });

  it('年が無ければ何も出さない（入力途中の案件を「年年月日」のような形にしない）', () => {
    expect(taxPeriodLabel(fields({ f14_m: '3', f14_d: '15' }))).toBe('');
  });

  it('月まで、年までの途中でも入っているところまで出す', () => {
    expect(taxPeriodLabel(fields({ f14_y: '8', f14_m: '3' }))).toBe('令和8年3月');
    expect(taxPeriodLabel(fields({ f14_y: '8' }))).toBe('令和8年');
  });

  it('月が無ければ日は出さない', () => {
    expect(taxPeriodLabel(fields({ f14_y: '8', f14_d: '15' }))).toBe('令和8年');
  });

  it('前後の空白は落とす', () => {
    expect(taxPeriodLabel(fields({ f14_y: ' 8 ', f14_m: ' 3 ', f14_d: ' 15 ' }))).toBe('令和8年3月15日');
  });
});

describe('caseLabelsOf', () => {
  it('会社名（第1表の f12）と課税時期を取り出す', () => {
    const labels = caseLabelsOf(fields({ f12: ' 甲田製作所 ', f14_y: '8', f14_m: '3', f14_d: '15' }));
    expect(labels).toEqual({ companyName: '甲田製作所', taxPeriod: '令和8年3月15日' });
  });

  it('未入力なら空文字（サーバ側は空を許すので、ここで作らない）', () => {
    expect(caseLabelsOf(fields({}))).toEqual({ companyName: '', taxPeriod: '' });
  });
});

describe('caseDisplayName', () => {
  it('会社名があればそのまま', () => {
    expect(caseDisplayName({ id: 12, companyName: '甲田製作所' })).toBe('甲田製作所');
  });

  it('会社名が空ならIDで見分けられるようにする', () => {
    expect(caseDisplayName({ id: 12, companyName: '' })).toBe('（会社名未入力 #12）');
    expect(caseDisplayName({ id: 12, companyName: '   ' })).toBe('（会社名未入力 #12）');
  });
});

describe('formatSavedAt', () => {
  it('Date でも ISO 文字列でも同じ形にする（一覧はサーバからの文字列を渡す）', () => {
    const date = new Date(2026, 8, 22, 9, 5);
    expect(formatSavedAt(date)).toBe('2026/9/22 09:05');
    expect(formatSavedAt(date.toISOString())).toBe('2026/9/22 09:05');
  });

  it('日付として読めなければ空にする（一覧の行を落とさない）', () => {
    expect(formatSavedAt('これは日付ではない')).toBe('');
  });
});

describe('saveStatusLabel', () => {
  const at = new Date(2026, 8, 22, 9, 5);

  it('案件未選択のときは保存先がこの端末だけだと分かる文言にする', () => {
    expect(saveStatusLabel(false, 'idle', null, null)).toBe('入力するとこの端末に自動保存されます');
    expect(saveStatusLabel(false, 'idle', null, at)).toBe('この端末のみに保存 09:05（案件未選択）');
  });

  it('案件未選択なら案件側の状態は出さない（保存されていないのに保存中と読めてしまう）', () => {
    expect(saveStatusLabel(false, 'saving', at, at)).toBe('この端末のみに保存 09:05（案件未選択）');
  });

  it('案件を選んでいる間は書き戻しの状態をそのまま出す', () => {
    expect(saveStatusLabel(true, 'pending', at, at)).toBe('案件へ保存します…');
    expect(saveStatusLabel(true, 'saving', at, at)).toBe('案件へ保存中…');
    expect(saveStatusLabel(true, 'error', at, at)).toBe('案件へ保存できませんでした');
    expect(saveStatusLabel(true, 'saved', at, at)).toBe('案件に保存済み 09:05');
  });

  it('保存時刻がまだ無い（開いた直後）でも案件に入っていることは伝える', () => {
    expect(saveStatusLabel(true, 'idle', null, at)).toBe('案件に保存済み');
  });
});
