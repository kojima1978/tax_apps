// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import App from './App';
import { STORAGE_KEY } from './lib/storedData';

/**
 * 画面全体の回帰テスト。
 *
 * これまで App.tsx にはテストが1つも無く、罫線のスナップショット（formRules.test.ts）は
 * forms/*.ts の幾何だけを見ていた。用紙の組み立て（どの様式が何枚出るか）と
 * 様式をまたぐ転記の結線は、どちらのテストも通っていなかった部分。
 *
 * jsdom でのレンダリングは1様式ぶんでも安くないため、見るのは
 * 「用紙が出るか」「転記がつながっているか」「枚数の増減が効くか」に絞る。
 */

/** 財産を取得した人3人・小規模宅地等の明細4件。（続）が付く様式まで一通り出る最小の内容 */
const SEED = {
  version: 7,
  heirs: [{ name: '国税 太郎' }, { name: '国税 花子' }, { name: '国税 次郎' }],
  // （続）の枚数は本表に印が付いているかで決まるので、第15表と付表1も使う
  used: ['table1', 'table2', 'table11', 'table15', 'table1112f1'],
  details: { table1112f1: [{}, {}, {}, {}] },
};

/** 保存済みデータとして読み込ませる（App は起動時に localStorage から読む） */
const seed = (common: Record<string, string> = {}) => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...SEED, common }));
};

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** 様式一覧のボタン（FORMS の並び順） */
const formButtons = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>('.form-item__btn'));

/** 画面に出ている用紙の枚数 */
const govPages = (c: HTMLElement) => c.querySelectorAll('.app-main .gov-page').length;

/** 様式一覧から名前で選ぶ */
const openForm = (c: HTMLElement, label: string) => {
  const button = formButtons(c).find((b) => b.querySelector('.form-item__label')?.textContent === label);
  if (button === undefined) throw new Error(`様式一覧に無い: ${label}`);
  fireEvent.click(button);
};

const fieldOf = (c: HTMLElement, name: string) => {
  const el = c.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (el === null) throw new Error(`入力欄が無い: ${name}`);
  return el;
};

/** 用紙の左上のページ増減ボタン（1枚目のもの） */
const pageButton = (c: HTMLElement, label: string) => {
  const el = c.querySelector<HTMLButtonElement>(`.app-main button[aria-label="${label}"]`);
  if (el === null) throw new Error(`ページ操作が無い: ${label}`);
  return el;
};

/**
 * 様式一覧の項目ごとの用紙の枚数。
 * 「（補助資料）」は2つあるので Record ではなく並び順のまま持つ。
 */
const EXPECTED_PAGES: [string, number][] = [
  ['第1表', 1],
  ['第1表（続）', 1],                        // 3人なので2人目・3人目で1枚
  ['第2表', 1],
  ['第4表', 1],
  ['第4表の2', 1],
  ['第5表', 1],
  ['第6表', 1],
  ['第7表', 1],
  ['第8の8表', 1],
  ['第9表', 1],
  ['第10表', 1],
  ['第11表', 1],
  ['第11表の付表1', 1],
  ['（補助資料）', 1],                        // 付表1の単価又は倍数の計算根拠
  ['第11表の付表2', 1],
  ['第11表の付表3', 1],
  ['第11表の付表4', 1],
  ['第11の2表', 3],                          // 贈与を受けた人ごとに1枚（3人）
  ['第11・11の2表の付表1', 1],
  ['第11・11の2表の付表1（続）', 1],          // 明細4件なので4件目で1枚
  ['第11・11の2表の付表1（別表１）', 1],
  ['第13表', 1],
  ['（補助資料）', 2],                        // 資産別税負担一覧（財産の頁＋人の頁）
  ['第14表', 1],
  ['第15表', 1],
  ['第15表（続）', 1],                        // 3人なので2人目・3人目で1枚
];

describe('様式一覧と用紙の組み立て', () => {
  it('一覧のすべての項目が用紙を描く', () => {
    seed();
    const { container } = render(<App />);
    const labels = formButtons(container).map((b) => b.querySelector('.form-item__label')?.textContent ?? '');
    // 画面には選択中の様式だけを置く作りなので、1つずつ開いて数える
    const actual = labels.map((label, i): [string, number] => {
      fireEvent.click(formButtons(container)[i]!);
      return [label, govPages(container)];
    });
    expect(actual).toEqual(EXPECTED_PAGES);
  }, 300_000);
});

describe('様式をまたぐ転記', () => {
  it('被相続人の氏名は第1表で打つと他の様式へ転記され、そこでは直せない', () => {
    seed();
    const { container } = render(<App />);
    fireEvent.change(fieldOf(container, 't1.c.name'), { target: { value: '国税 一郎' } });

    openForm(container, '第11表');
    const name = fieldOf(container, 't11p0.c.name');
    expect(name.value).toBe('国税 一郎');
    // 転記先で打ち替えられると第1表と食い違うため、転記先は読み取り専用
    expect(name.readOnly).toBe(true);
  }, 60_000);

  it('第1表の転記欄をクリックすると転記元の様式が開く', () => {
    seed();
    const { container } = render(<App />);
    // ①取得財産の価額は第11表２③からの転記
    const cell = container.querySelector<HTMLElement>('.app-main .gf-cell--source-link[aria-label="1人目 ①取得財産の価額"]');
    expect(cell).not.toBeNull();
    fireEvent.click(cell!);

    expect(container.querySelector('input[name="t11p0.c.name"]')).not.toBeNull();
    expect(container.querySelector('input[name="t1.h0.v1"]')).toBeNull();
  }, 60_000);
});

describe('用紙の枚数の増減', () => {
  it('第9表はページを増やすと用紙が増え、減らすと戻る', () => {
    seed();
    const { container } = render(<App />);
    openForm(container, '第9表');
    expect(govPages(container)).toBe(1);

    fireEvent.click(pageButton(container, 'ページを増やす'));
    expect(govPages(container)).toBe(2);

    fireEvent.click(pageButton(container, 'ページを減らす'));
    expect(govPages(container)).toBe(1);
  }, 60_000);

  it('上限まで増やすと、それ以上は増やせない', () => {
    // 上限（10枚）まで入った状態で読み込む。＋を9回押すのと同じ状態
    seed({ t9Pages: '10' });
    const { container } = render(<App />);
    openForm(container, '第9表');
    expect(govPages(container)).toBe(10);
    expect(pageButton(container, 'ページを増やす').disabled).toBe(true);
    expect(pageButton(container, 'ページを減らす').disabled).toBe(false);
  }, 120_000);
});
