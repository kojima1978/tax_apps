import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/form';
import { rolloverFormData } from '../rollover';
import { normalizeFormData } from '../useFormData';

/** テスト用の入力データを組み立てる */
function baseData(): FormData {
  return {
    ...initialFormData,
    table1_1: {
      ...initialFormData.table1_1,
      f12: 'テスト株式会社',
      f14_g: '令和', f14_y: '8', f14_m: '10', f14_d: '15',
      f15_from_g: '令和', f15_from_y: '7', f15_from_m: '4', f15_from_d: '1',
      f15_to_g: '令和', f15_to_y: '8', f15_to_m: '3', f15_to_d: '31',
      sh_1_1: '株主 太郎', sh_1_4: '1,000', sh_1_5: '1,000',
    },
    table1_2: { ...initialFormData.table1_2, gyoshu: '卸売業', f22: '500,000', f24: '700,000', emp_regular: '20', emp_hours: '18,000' },
    table3: { ...initialFormData.table3, mod1_div: '50', right_haito: '1', r22_pay: '500' },
    table4: {
      ...initialFormData.table4,
      f28: '1,000', f29: '100', f32: '900', f33: '90', f36: '800', f37: '80',
      e18: '5,000', e19: '500', e20: '50', e21: '5', e22: '1',
      e25: '4,000', e26: '400', e27: '40', e28: '4', e29: '2',
      e32: '3,000', e33: '300', e34: '30', e35: '3', e36: '3',
      n52: '10,000', n53: '20,000', n56: '9,000', n57: '18,000',
      r1gyonum: '99', mod_pay: '400', mod_ratio: '0.5',
    },
    table5: {
      ...initialFormData.table5,
      a_1_1: '現金預金', a_1_2: '1,000', a_1_3: '1,000', a_1_4: '',
      a_2_1: '有価証券', a_2_2: '2,000', a_2_3: '1,500', a_2_4: '株式等',
      l_1_1: '借入金', l_1_2: '500', l_1_3: '500',
      _sel: 'a:1',
    },
    table6: { ...initialFormData.table6, mod9_div: '30', exp_div: '100', right_musho: '1' },
    table7: { ...initialFormData.table7, f10: '300', f11: '250', f13: '3,000', f14: '2,500', '⑩': '1,234', mod_div: '10' },
    table8: { ...initialFormData.table8, '⑱': '5,000', '⑲': '4,000' },
  };
}

describe('rolloverFormData（翌事業年度更新）', () => {
  const rolled = rolloverFormData(baseData());

  it('課税時期・直前期（自/至）の年を1年進める', () => {
    expect(rolled.table1_1.f14_y).toBe('9');
    expect(rolled.table1_1.f15_from_y).toBe('8');
    expect(rolled.table1_1.f15_to_y).toBe('9');
    // 月日・元号は維持
    expect(rolled.table1_1.f14_m).toBe('10');
    expect(rolled.table1_1.f14_g).toBe('令和');
  });

  it('第4表の期別データを1期ずらして順送りする（直前期は空欄）', () => {
    // 配当: 直前期→直前々期→直前々期の前期
    expect(rolled.table4.f32).toBe('1,000');
    expect(rolled.table4.f33).toBe('100');
    expect(rolled.table4.f36).toBe('900');
    expect(rolled.table4.f37).toBe('90');
    expect(rolled.table4.f28).toBe('');
    expect(rolled.table4.f29).toBe('');
    // 利益
    expect(rolled.table4.e25).toBe('5,000');
    expect(rolled.table4.e32).toBe('4,000');
    expect(rolled.table4.e18).toBe('');
    // 純資産（n52は①連動なので維持、直前々期へ複写）
    expect(rolled.table4.n56).toBe('10,000');
    expect(rolled.table4.n57).toBe('20,000');
    expect(rolled.table4.n53).toBe('');
    expect(rolled.table4.n52).toBe('10,000');
  });

  it('第4表の配当欄と連動する第3表・第6表の欄も同期する（正規化で古い値が復活しない）', () => {
    const normalized = normalizeFormData(rolled);
    expect(normalized.table3.f59).toBe('1,000'); // 直前々期＝旧直前期
    expect(normalized.table3.f55).toBe('');      // 直前期は空欄のまま
    expect(normalized.table6.f66).toBe('1,000');
    expect(normalized.table6.f61).toBe('');
    expect(normalized.table4.f28).toBe('');
  });

  it('第7表の受取配当金等を順送りし、上書き欄・修正欄をクリアする', () => {
    expect(rolled.table7.f11).toBe('300');
    expect(rolled.table7.f14).toBe('3,000');
    expect(rolled.table7.f10).toBe('');
    expect(rolled.table7.f13).toBe('');
    expect(rolled.table7['⑩']).toBe('');
    expect(rolled.table7.mod_div).toBe('');
  });

  it('第5表は科目・備考を維持して金額だけクリアする', () => {
    expect(rolled.table5.a_1_1).toBe('現金預金');
    expect(rolled.table5.a_2_4).toBe('株式等');
    expect(rolled.table5.a_1_2).toBe('');
    expect(rolled.table5.a_2_3).toBe('');
    expect(rolled.table5.l_1_2).toBe('');
    expect(rolled.table5._sel).toBe('');
  });

  it('会社規模判定・価額修正・権利・S2上書きをクリアする', () => {
    expect(rolled.table1_2.f22).toBe('');
    expect(rolled.table1_2.emp_regular).toBe('');
    expect(rolled.table1_2.gyoshu).toBe('卸売業'); // 業種区分は維持
    expect(rolled.table3.mod1_div).toBe('');
    expect(rolled.table3.right_haito).toBe('');
    expect(rolled.table6.mod9_div).toBe('');
    expect(rolled.table6.right_musho).toBe('');
    expect(rolled.table4.mod_pay).toBe('');
    expect(rolled.table8['⑱']).toBe('');
  });

  it('会社名・株主構成・業種目番号は維持する', () => {
    expect(rolled.table1_1.f12).toBe('テスト株式会社');
    expect(rolled.table1_1.sh_1_1).toBe('株主 太郎');
    expect(rolled.table1_1.sh_1_4).toBe('1,000');
    expect(rolled.table4.r1gyonum).toBe('99');
  });

  it('日付が空欄・非数値ならそのまま', () => {
    const data = baseData();
    data.table1_1.f14_y = '';
    data.table1_1.f15_from_y = 'abc';
    const r = rolloverFormData(data);
    expect(r.table1_1.f14_y).toBe('');
    expect(r.table1_1.f15_from_y).toBe('abc');
  });
});
