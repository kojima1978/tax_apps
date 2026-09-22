// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { GridForm, type GridCell } from './GridForm';
import { PrintRenderContext } from './printContext';

afterEach(cleanup);

/**
 * GridForm が様式の各セルをどんな DOM にするかを見張る。
 *
 * 様式そのものの罫線は `formRules.test.ts` が幾何（forms/*.ts）だけを見ているので、
 * 「セル定義をどう DOM へ変換するか」はこれまでどのテストも通っていなかった。
 * 入力欄の id・name・アクセシブル名、読み取り専用、保存する値の整形、
 * 転記の結線（onNavigate / onAction）、印刷用の描き替えがここの対象。
 */

/** 選択式の候補（コードと名称の対） */
const KIND_OPTIONS = [
  { value: '', label: '' },
  { value: '1', label: '1 土地' },
  { value: '2', label: '2 家屋' },
];

/**
 * 試験用の様式。座標は粗い格子（縦2列・横8行）に載せてあるので、
 * 格子へ寄せたときに潰れるセルは出ない（潰れると GridForm が console.warn を出す）。
 */
const fixtureCells = (): GridCell[] => [
  /* 0 */ { top: 0, left: 0, width: 50, height: 10, kind: 'label', text: '氏名' },
  /* 1 */ { top: 0, left: 50, width: 50, height: 10, kind: 'input', field: 'name', ariaLabel: '氏名', align: 'left' },
  /* 2 */ { top: 10, left: 0, width: 50, height: 10, kind: 'label', text: '金額' },
  /* 3 */ { top: 10, left: 50, width: 50, height: 10, kind: 'input', field: 'amount', ariaLabel: '金額', commaInteger: true },
  /* 4 */ { top: 20, left: 0, width: 50, height: 10, kind: 'label', text: '合計' },
  /* 5 */ { top: 20, left: 50, width: 50, height: 10, kind: 'input', field: 'total', ariaLabel: '合計', commaInteger: true, readOnly: true },
  /* 6 */ { top: 30, left: 0, width: 50, height: 10, kind: 'cell', text: '第11表', ariaLabel: '取得財産の価額', navigateToForm: 'table11' },
  /* 7 */ { top: 30, left: 50, width: 50, height: 10, kind: 'cell', text: '該当', toggleField: 'flag' },
  /* 8 */ {
    top: 40, left: 0, width: 50, height: 10, kind: 'input', field: 'kind', ariaLabel: '種類',
    options: KIND_OPTIONS, autoFill: { field: 'kindName', byValue: { '1': '土地', '2': '家屋' } },
  },
  /* 9 */ { top: 40, left: 50, width: 50, height: 10, kind: 'input', field: 'kindName', ariaLabel: '種類の名称', align: 'left' },
  /* 10 */ { top: 50, left: 0, width: 50, height: 10, kind: 'input', field: 'ratio', ariaLabel: '割合', options: KIND_OPTIONS, readOnly: true },
  /* 11 */ {
    top: 50, left: 50, width: 50, height: 10, kind: 'cell', text: '確認', ariaLabel: '記入漏れの確認',
    invalidWhen: (g) => g('amount') !== '' && g('name') === '', invalidMessage: '氏名が未記入です',
  },
  /* 12 */ { top: 60, left: 0, width: 100, height: 10, kind: 'cell', text: '明細', ariaLabel: '明細を開く', action: 'detail-0' },
  /* 13 */ { top: 70, left: 0, width: 50, height: 10, kind: 'cell', text: '区分A', ariaLabel: '区分Aを選ぶ', selectValue: { field: 'pick', value: 'A' } },
  /* 14 */ { top: 70, left: 50, width: 50, height: 10, kind: 'input', field: 'note', ariaLabel: '備考', align: 'left' },
];

interface HarnessProps {
  cells: GridCell[];
  initial?: Record<string, string>;
  /** u が呼ばれた組（フィールド・値）を控える。保存される値そのものを見るため */
  spy?: (field: string, value: string) => void;
  onNavigate?: (formId: string) => void;
  onAction?: (action: string) => void;
}

/** 入力値を持つ親。u で書いた値が g から読めるところまで（画面の往復）を通す */
function Harness({ cells, initial, spy, onNavigate, onAction }: HarnessProps) {
  const [values, setValues] = useState<Record<string, string>>(initial ?? {});
  const update = (field: string, value: string) => {
    spy?.(field, value);
    setValues((prev) => ({ ...prev, [field]: value }));
  };
  return (
    <GridForm
      cells={cells}
      g={(field) => values[field] ?? ''}
      u={update}
      formId="t"
      onNavigate={onNavigate}
      onAction={onAction}
    />
  );
}

/** 入力欄は name（`様式ID.フィールド`）で引く。同じアクセシブル名が枠側にも付くため */
const inputOf = (container: HTMLElement, field: string) => {
  const el = container.querySelector<HTMLInputElement>(`input[name="t.${field}"]`);
  if (el === null) throw new Error(`入力欄が無い: ${field}`);
  return el;
};

/** セルの枠（gf-cell）はアクセシブル名で引く */
const cellOf = (container: HTMLElement, ariaLabel: string) => {
  const el = container.querySelector<HTMLElement>(`.gf-cell[aria-label="${ariaLabel}"]`);
  if (el === null) throw new Error(`セルが無い: ${ariaLabel}`);
  return el;
};

describe('GridForm の入力欄', () => {
  it('id・name・アクセシブル名を様式IDとフィールドから組み立てる', () => {
    const { container } = render(<Harness cells={fixtureCells()} />);
    const name = inputOf(container, 'name');
    // id はセルの並び順まで含む（同じフィールドを複数のセルに置いても重複しない）
    expect(name.id).toBe('t-name-1');
    expect(name.getAttribute('aria-label')).toBe('氏名');
  });

  it('打った値をそのまま保存して読み戻す', () => {
    const spy = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} spy={spy} />);
    fireEvent.change(inputOf(container, 'name'), { target: { value: '国税 太郎' } });
    expect(spy).toHaveBeenCalledWith('name', '国税 太郎');
    expect(inputOf(container, 'name').value).toBe('国税 太郎');
  });

  it('金額欄は3桁区切りにしてから保存する', () => {
    const spy = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} spy={spy} />);
    fireEvent.change(inputOf(container, 'amount'), { target: { value: '1234567' } });
    expect(spy).toHaveBeenCalledWith('amount', '1,234,567');
    expect(inputOf(container, 'amount').value).toBe('1,234,567');
  });

  it('読み取り専用の欄は編集させず、カンマの無い保存値も整形して出す', () => {
    const { container } = render(<Harness cells={fixtureCells()} initial={{ total: '1234567' }} />);
    const total = inputOf(container, 'total');
    expect(total.readOnly).toBe(true);
    // タブ順から外す（自動計算欄を順に踏まされると入力が進まない）
    expect(total.tabIndex).toBe(-1);
    expect(total.value).toBe('1,234,567');
  });

  it('罫線のためだけのセルは内側余白を持たない', () => {
    const cells: GridCell[] = [
      { top: 0, left: 0, width: 100, height: 10, kind: 'label', text: '見出し' },
      { top: 10, left: 0, width: 100, height: 1, rule: true },
    ];
    const { container } = render(<Harness cells={cells} />);
    const boxes = container.querySelectorAll<HTMLElement>('.gf-cell');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.style.padding).toBe('1px 2px');
    // 余白を残すと枠の最小寸法が割り当て幅を超え、様式に無い縦罫線として見えてしまう
    expect(boxes[1]!.style.padding).toBe('0px');
  });
});

describe('GridForm の選択式の欄', () => {
  it('選択すると連動する名称の欄も書き換える', () => {
    const spy = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} spy={spy} />);
    const select = container.querySelector<HTMLSelectElement>('select[name="t.kind"]');
    expect(select).not.toBeNull();
    fireEvent.change(select!, { target: { value: '1' } });
    expect(spy).toHaveBeenCalledWith('kind', '1');
    expect(spy).toHaveBeenCalledWith('kindName', '土地');
    expect(inputOf(container, 'kindName').value).toBe('土地');
    // 選んだ後は何を選んだのかがアクセシブル名にも出る
    expect(container.querySelector('select[name="t.kind"]')!.getAttribute('aria-label')).toBe('種類：1 土地');
  });

  it('読み取り専用の選択式は候補を出さず選択済みの名称だけを出す', () => {
    const { container } = render(<Harness cells={fixtureCells()} initial={{ ratio: '2' }} />);
    expect(container.querySelector('select[name="t.ratio"]')).toBeNull();
    expect(cellOf(container, '割合').textContent).toBe('2 家屋');
  });
});

describe('GridForm のクリックで動くセル', () => {
  it('転記元のあるセルはボタンになり、クリックで様式を渡す', () => {
    const onNavigate = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} onNavigate={onNavigate} />);
    const cell = cellOf(container, '取得財産の価額の転記元を開く');
    expect(cell.className).toContain('gf-cell--source-link');
    expect(cell.getAttribute('role')).toBe('button');
    expect(cell.tabIndex).toBe(0);
    fireEvent.click(cell);
    expect(onNavigate).toHaveBeenCalledWith('table11');
  });

  it('明細を開くセルはキーボードでも押せる', () => {
    const onAction = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} onAction={onAction} />);
    const cell = cellOf(container, '明細を開く');
    expect(cell.className).toContain('gf-cell--action');
    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.keyDown(cell, { key: ' ' });
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenCalledWith('detail-0');
  });

  it('チェック式のセルは aria-checked を切り替える', () => {
    const spy = vi.fn();
    const { container } = render(<Harness cells={fixtureCells()} spy={spy} />);
    const cell = cellOf(container, '該当を選択');
    expect(cell.getAttribute('role')).toBe('checkbox');
    expect(cell.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(cell);
    expect(spy).toHaveBeenCalledWith('flag', '1');
    expect(cellOf(container, '該当を選択').getAttribute('aria-checked')).toBe('true');
    // もう一度押すと外れる
    fireEvent.click(cellOf(container, '該当を選択'));
    expect(spy).toHaveBeenLastCalledWith('flag', '');
  });

  it('値を選ぶセルは aria-pressed で選択状態を出す', () => {
    const { container } = render(<Harness cells={fixtureCells()} />);
    const cell = cellOf(container, '区分Aを選ぶ');
    expect(cell.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(cell);
    expect(cellOf(container, '区分Aを選ぶ').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('GridForm の記入内容の検査', () => {
  it('組合せが不正になった欄に aria-invalid と理由を出す', () => {
    const { container } = render(<Harness cells={fixtureCells()} />);
    const before = cellOf(container, '記入漏れの確認');
    expect(before.getAttribute('aria-invalid')).toBeNull();

    // 金額だけ入れて氏名を空のままにする
    fireEvent.change(inputOf(container, 'amount'), { target: { value: '100' } });
    const after = cellOf(container, '記入漏れの確認');
    expect(after.getAttribute('aria-invalid')).toBe('true');
    expect(after.getAttribute('title')).toBe('氏名が未記入です');
    expect(after.className).toContain('gf-cell--invalid');

    // 氏名を入れると消える
    fireEvent.change(inputOf(container, 'name'), { target: { value: '国税 太郎' } });
    expect(cellOf(container, '記入漏れの確認').getAttribute('aria-invalid')).toBeNull();
  });
});

describe('GridForm の印刷用の描画', () => {
  it('印刷では入力欄を描かず値だけを出す', () => {
    const { container } = render(
      <PrintRenderContext.Provider value={true}>
        <Harness cells={fixtureCells()} initial={{ name: '国税 太郎', amount: '1234567', kind: '1' }} />
      </PrintRenderContext.Provider>,
    );
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelectorAll('select')).toHaveLength(0);
    expect(container.textContent).toContain('国税 太郎');
    expect(container.textContent).toContain('1,234,567');
    // 転記のためのボタンも印刷では無効になる（役割ごと外す）
    expect(container.querySelector('.gf-cell--action')).toBeNull();
  });
});
