import { describe, expect, it } from 'vitest';
import { selectDisplayValue } from '@/components/ui/GridForm';
import { ERA_OPTS } from '@/components/tables/Table1_1Grid';
import { DATE_OPTS } from '@/components/tables/table2/Table2Grid';
import { DEFAULT_ERA } from '@/lib/wareki';

// 印刷はプルダウンを文字に置き換えて刷る。置き換えた結果が画面の <select> と食い違うと、
// 「画面には出ているのに刷ると空欄」になり、提出するまで気づけない。
// 実際に元号欄がこれで空欄になっていた（選択肢に空が無いため、画面は先頭の「令和」を出すが
// 保存値は空のまま。印刷が保存値をそのまま刷っていた）。

describe('印刷でプルダウンの代わりに刷る文字', () => {
  it('選択肢にある値はそのまま刷る', () => {
    expect(selectDisplayValue(ERA_OPTS, '平成')).toBe('平成');
    expect(selectDisplayValue([{ value: '1', label: '1：社長' }], '1')).toBe('1');
  });

  it('選択肢に無い値は先頭の選択肢を刷る（閉じた <select> の表示と同じ規則）', () => {
    expect(selectDisplayValue(ERA_OPTS, '')).toBe('令和');
    expect(selectDisplayValue(ERA_OPTS, '大正')).toBe('令和');
  });

  it('空の選択肢がある欄は未選択なら空欄のまま（年・月・日）', () => {
    expect(selectDisplayValue([...DATE_OPTS.y], '')).toBe('');
    expect(selectDisplayValue([{ value: '', label: '' }, { value: '1', label: '1：普通株式' }], '')).toBe('');
  });

  it('元号欄は未選択でも既定の元号を刷る（判定計算・サマリー・案件名と同じ既定）', () => {
    for (const options of [ERA_OPTS, [...DATE_OPTS.g]]) {
      expect(options).not.toContain('');
      expect(selectDisplayValue(options, '')).toBe(DEFAULT_ERA);
    }
  });
});
