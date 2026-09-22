// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFormData } from './useFormData';
import { DETAIL_SOURCE } from '../lib/calc';
import { HEIR_ID } from '../lib/heirRef';
import { MAX_HEIRS, SALVAGE_KEY, STORAGE_KEY } from '../lib/storedData';
import { TABLE9_DETAIL_FORM } from '../forms/table9';

/**
 * 申告書全体の入力状態を持つフックのテスト。
 *
 * 326行あって、画面からの読み書き（`g` / `u`）・人と明細の増減・保存の成否が
 * すべてここを通るのに、テストが1つも無かった。用紙側（formRules.test.ts）は
 * 幾何だけ、App.test.tsx は組み立てだけを見ていて、この層は素通りしていた。
 */

/**
 * 保存済みデータとして読み込ませてからフックを起動する。
 *
 * `strict` は本番と同じ StrictMode（`main.tsx` がそう囲んでいる）。
 * 自分で `<StrictMode>` を wrapper に渡しても effect は1度しか走らないので、
 * 2度走らせるには testing-library の `reactStrictMode` を使う（実測）。
 */
const setup = (stored?: unknown, strict = false) => {
  if (stored !== undefined) {
    localStorage.setItem(STORAGE_KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
  }
  return renderHook(() => useFormData(), { reactStrictMode: strict });
};

/** 読み込ませる最小の保存データ（版は現行。移行の経路はここでは見ない） */
const seed = (extra: Record<string, unknown> = {}) => ({
  version: 7, common: {}, heirs: [{ name: '甲' }], used: ['table1'], details: {}, ...extra,
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('画面からの読み書き（g / u）', () => {
  it('共通欄は打った値がそのまま戻る', () => {
    const { result } = setup();
    act(() => { result.current.u('name', '甲野太郎'); });
    expect(result.current.g('name')).toBe('甲野太郎');
    expect(result.current.data.common.name).toBe('甲野太郎');
  });

  it('人ごとの欄は何人目かで振り分ける', () => {
    const { result } = setup();
    act(() => { result.current.u('h0.address', '東京都千代田区'); });
    expect(result.current.g('h0.address')).toBe('東京都千代田区');
    expect(result.current.data.heirs[0]?.address).toBe('東京都千代田区');
  });

  it('第1表（続）の右側は未作成でも入力時に作る（必ず2人分印刷するため）', () => {
    const { result } = setup();
    act(() => { result.current.u('h1.name', '乙'); });
    expect(result.current.data.heirs).toHaveLength(2);
    expect(result.current.data.heirs[1]?.[HEIR_ID]).toBeTypeOf('string');
  });

  it('いない人より後ろへは書けない', () => {
    const { result } = setup();
    const before = result.current.data;
    act(() => { result.current.u('h5.name', '丙'); });
    expect(result.current.data).toBe(before);
  });

  it('自動計算欄（t.）は書き込めない', () => {
    const { result } = setup();
    const before = result.current.data;
    act(() => { result.current.u('t.v1', '999'); });
    expect(result.current.data).toBe(before);
  });

  it('明細の欄は付表と行の添字で振り分ける', () => {
    const { result } = setup();
    act(() => { result.current.u('table11f1#0.kind', '宅地'); });
    expect(result.current.data.details.table11f1?.[0]).toEqual({ kind: '宅地' });
  });

  it('飛ばした位置へ書くと、間の行は空のまま作る', () => {
    const { result } = setup();
    act(() => { result.current.u('table11f1#2.kind', '宅地'); });
    expect(result.current.data.details.table11f1).toEqual([{}, {}, { kind: '宅地' }]);
  });

  it('価額は用紙から直接書けない（自動計算との切り替えごと入力画面に一本化してある）', () => {
    const { result } = setup();
    const before = result.current.data;
    act(() => { result.current.u('table11f1#0.value', '1000000'); });
    expect(result.current.data).toBe(before);
  });
});

describe('付表の項番（並び順から決まるので入力できない）', () => {
  const rows = { table11f1: [{ kind: '宅地' }, {}, { kind: '株式' }] };

  it('空欄の明細は数えない', () => {
    const { result } = setup(seed({ details: rows }));
    expect(result.current.g('table11f1#0.no0')).toBe('1');
    expect(result.current.g('table11f1#1.no0')).toBe('');
    expect(result.current.g('table11f1#2.no0')).toBe('2');
  });

  it('項番の欄へは書き込めない', () => {
    const { result } = setup(seed({ details: rows }));
    const before = result.current.data;
    act(() => { result.current.u('table11f1#0.no0', '9'); });
    expect(result.current.data).toBe(before);
  });
});

describe('転記されてきた明細', () => {
  /**
   * 第9表の明細1件。法定相続人の印が無いので非課税の対象外＝全額が付表4へ転記される。
   * 受取人の欄はIDを持つので（用紙に出すときだけ番号へ直す）、人にもIDを振っておく。
   */
  const transferred = seed({
    heirs: [{ [HEIR_ID]: 'pa', name: '甲' }],
    details: { [TABLE9_DETAIL_FORM]: [{ who: 'pa', amt: '1000000' }] },
  });

  it('保存した明細の後ろに続けて用紙へ載る', () => {
    const { result } = setup(transferred);
    const f4 = result.current.detailRows.table11f4 ?? [];
    expect(f4).toHaveLength(1);
    expect(f4[0]?.[DETAIL_SOURCE]).toBe('table9');
    // 転記行は保存していないので、申告データ側には残らない
    expect(result.current.data.details.table11f4).toBeUndefined();
  });

  it('転記行の位置へは書けない（保存行で押しのけてしまうため）', () => {
    const { result } = setup(transferred);
    const before = result.current.data;
    act(() => { result.current.u('table11f4#0.kind', '書き換え'); });
    expect(result.current.data).toBe(before);
  });
});

describe('財産を取得した人の増減', () => {
  it('足すと1人増え、上限で止まる', () => {
    const { result } = setup();
    act(() => { result.current.addHeir(); });
    expect(result.current.data.heirs).toHaveLength(2);
    act(() => { for (let i = result.current.data.heirs.length; i < MAX_HEIRS + 3; i += 1) result.current.addHeir(); });
    expect(result.current.data.heirs).toHaveLength(MAX_HEIRS);
    expect(result.current.maxHeirs).toBe(MAX_HEIRS);
  });

  it('消すと後ろが詰まる。最後の1人は消せない', () => {
    const { result } = setup(seed({ heirs: [{ name: '甲' }, { name: '乙' }] }));
    act(() => { result.current.removeHeir(0); });
    expect(result.current.data.heirs.map((h) => h.name)).toEqual(['乙']);
    const before = result.current.data;
    act(() => { result.current.removeHeir(0); });
    expect(result.current.data).toBe(before);
  });

  it('並べ替えると用紙に載る順が変わる（範囲外は何もしない）', () => {
    const { result } = setup(seed({ heirs: [{ name: '甲' }, { name: '乙' }, { name: '丙' }] }));
    act(() => { result.current.moveHeir(2, 0); });
    expect(result.current.data.heirs.map((h) => h.name)).toEqual(['丙', '甲', '乙']);
    const before = result.current.data;
    act(() => { result.current.moveHeir(0, 9); });
    expect(result.current.data).toBe(before);
  });

  it('丸ごと差し替えてもIDは今の人のものが残る（他の表からの参照を切らない）', () => {
    const { result } = setup();
    const id = result.current.data.heirs[0]?.[HEIR_ID];
    act(() => { result.current.setHeir(0, { name: '取り消した後の姿' }); });
    expect(result.current.data.heirs[0]).toEqual({ name: '取り消した後の姿', [HEIR_ID]: id });
  });
});

describe('明細の増減と並べ替え', () => {
  it('確定した明細の空欄は保存しない。付表と第11表の印も自動で付く', () => {
    const { result } = setup();
    act(() => { result.current.setDetailItem('table11f1', 0, { kind: '宅地', area: '  ', value: '100' }); });
    expect(result.current.data.details.table11f1?.[0]).toEqual({ kind: '宅地', value: '100' });
    expect(result.current.data.used).toContain('table11f1');
    expect(result.current.data.used).toContain('table11');
    expect(result.current.requiredForms).toContain('table11f1');
  });

  it('末尾より後ろへ確定すると、間は空の明細で埋まる', () => {
    const { result } = setup();
    act(() => { result.current.setDetailItem('table11f1', 2, { kind: '宅地' }); });
    expect(result.current.data.details.table11f1).toEqual([{}, {}, { kind: '宅地' }]);
  });

  it('1枚分まとめて増やす', () => {
    const { result } = setup();
    act(() => { result.current.addDetailPage('table11f1', 3); });
    expect(result.current.data.details.table11f1).toHaveLength(3);
  });

  it('件数を指定して増減する（0以下は無視）', () => {
    const { result } = setup(seed({ details: { table11f1: [{ kind: '宅地' }, {}, {}] } }));
    act(() => { result.current.setDetailCount('table11f1', 1); });
    expect(result.current.data.details.table11f1).toEqual([{ kind: '宅地' }]);
    const before = result.current.data;
    act(() => { result.current.setDetailCount('table11f1', 0); });
    expect(result.current.data).toBe(before);
  });

  it('消すと以降の項番が繰り上がる', () => {
    const { result } = setup(seed({ details: { table11f1: [{ kind: '宅地' }, { kind: '株式' }] } }));
    act(() => { result.current.removeDetailItem('table11f1', 0); });
    expect(result.current.data.details.table11f1).toEqual([{ kind: '株式' }]);
    expect(result.current.g('table11f1#0.no0')).toBe('1');
  });

  it('並べ替えると項番も振り直される', () => {
    const { result } = setup(seed({ details: { table11f1: [{ kind: '宅地' }, { kind: '株式' }] } }));
    act(() => { result.current.moveDetailItem('table11f1', 1, 0); });
    expect(result.current.g('table11f1#0.kind')).toBe('株式');
    expect(result.current.g('table11f1#0.no0')).toBe('1');
  });

  it('行を番号で名指しする共通欄（第14表の確認欄）は、並べ替えと同じ更新で付け替える', () => {
    const { result } = setup(seed({ common: { mark: '0' }, details: { table14: [{ kind: 'あ' }, { kind: 'い' }, { kind: 'う' }] } }));
    act(() => {
      result.current.moveDetailItem('table14', 0, 2, (common, indexOf) => ({
        ...common, mark: String(indexOf(Number(common.mark))),
      }));
    });
    // 動かした1件は行き先へ跳び、間に挟まれた行は1つずつ手前へ寄る
    expect(result.current.data.details.table14?.map((row) => row.kind)).toEqual(['い', 'う', 'あ']);
    expect(result.current.data.common.mark).toBe('2');
  });

  it('動かさない並べ替えは何もしない', () => {
    const { result } = setup(seed({ details: { table11f1: [{ kind: '宅地' }] } }));
    const before = result.current.data;
    act(() => { result.current.moveDetailItem('table11f1', 0, 0); });
    expect(result.current.data).toBe(before);
  });
});

describe('様式の印と全消し', () => {
  it('印は押すたびに入れ替わる', () => {
    const { result } = setup(seed({ used: ['table1'] }));
    act(() => { result.current.toggleUsed('table5'); });
    expect(result.current.data.used).toContain('table5');
    act(() => { result.current.toggleUsed('table5'); });
    expect(result.current.data.used).not.toContain('table5');
  });

  it('全消しで空のデータに戻る', () => {
    const { result } = setup(seed({ common: { name: '甲野太郎' } }));
    act(() => { result.current.reset(); });
    expect(result.current.data.common).toEqual({});
    expect(result.current.data.heirs).toHaveLength(1);
  });
});

describe('ファイルからの読み込み（importJson）', () => {
  /** jsdom の File は text() を持つ。保存した JSON をそのまま読ませる */
  const file = (text: string) => new File([text], 'a.json', { type: 'application/json' });

  it('正しい形なら取り込む', async () => {
    const { result } = setup();
    let ok = false;
    await act(async () => { ok = await result.current.importJson(file('{"common":{"name":"丙"},"heirs":[{}]}')); });
    expect(ok).toBe(true);
    expect(result.current.data.common.name).toBe('丙');
  });

  it('形が違えば取り込まず、今の入力も壊さない', async () => {
    const { result } = setup(seed({ common: { name: '甲野太郎' } }));
    let ok = true;
    await act(async () => { ok = await result.current.importJson(file('{"heirs":[]}')); });
    expect(ok).toBe(false);
    expect(result.current.data.common.name).toBe('甲野太郎');
  });

  it('壊れた JSON でも落ちない', async () => {
    const { result } = setup();
    let ok = true;
    await act(async () => { ok = await result.current.importJson(file('{')); });
    expect(ok).toBe(false);
  });
});

describe('自動保存（改善案1で入れた振る舞い）', () => {
  it.each([['そのまま', false], ['StrictMode', true]])(
    '読めなかった保存データを、開いただけで空で上書きしない（%s）', (_name, strict) => {
      localStorage.setItem(STORAGE_KEY, '{');
      const { result } = setup(undefined, strict as boolean);
      // StrictMode は effect を2度走らせる。「1回目だけ飛ばす」印だと2度目が素通りして潰れた
      expect(localStorage.getItem(STORAGE_KEY)).toBe('{');
      expect(result.current.salvaged).toBe(true);
      expect(result.current.rescue.map((entry) => entry.key)).toEqual([SALVAGE_KEY]);
    },
  );

  it('入力したときだけ保存する', () => {
    const { result } = setup(seed({ common: { name: '甲野太郎' } }));
    act(() => { result.current.u('name', '乙野次郎'); });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({ common: { name: '乙野次郎' } });
    expect(result.current.saveFailed).toBe(false);
  });

  it('保存できなければ表に出す（画面は自動保存を約束している）', () => {
    const { result } = setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    act(() => { result.current.u('name', '甲野太郎'); });
    expect(result.current.saveFailed).toBe(true);
    // 入力自体は続けられる
    expect(result.current.g('name')).toBe('甲野太郎');
  });

  it('読めたときは知らせるものも退避するものも無い', () => {
    const { result } = setup(seed());
    expect(result.current.salvaged).toBe(false);
    expect(result.current.rescue).toEqual([]);
  });
});
