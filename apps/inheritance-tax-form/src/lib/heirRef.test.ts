import { describe, expect, it } from 'vitest';
import type { GridCell } from '../components/ui/GridForm';
import { COMMON, TOTALS } from '../forms/table1';
import { buildTable4 } from '../forms/table4';
import { buildTable42 } from '../forms/table42';
import { buildTable6, type Table6Options } from '../forms/table6';
import { buildTable7 } from '../forms/table7';
import { buildTable9 } from '../forms/table9';
import { buildTable10 } from '../forms/table10';
import { TABLE13_PERSONS, buildTable13 } from '../forms/table13';
import { buildTable14 } from '../forms/table14';
import { buildTable88 } from '../forms/table88';
import { buildTable1112f1 } from '../forms/table1112f1';
import { buildTable1112f1b } from '../forms/table1112f1b';
import type { Values } from './calc';
import { HEIR_ID, isHeirRefField, migrateHeirRefs, resolveHeirRefs, withHeirIds } from './heirRef';

/** 氏名の選択肢に混ぜておく目印。この目印が付いた欄＝人を指す欄 */
const MARK = '@@heir@@';
const OPTIONS: GridCell['options'] = ['', { value: '1', label: MARK }];
const GROUPS = [{ label: '候補', options: [{ value: '1', label: MARK }] }] as unknown as Table6Options['minor'];

/** 氏名の選択肢が付いている欄を集める（選択肢の作り方が2通りあるので中身の文字で見る） */
function refFields(cells: readonly GridCell[]): string[] {
  return cells
    .filter((cell) => cell.field !== undefined
      && JSON.stringify(cell.options ?? cell.optionGroups ?? '').includes(MARK))
    .map((cell) => cell.field!);
}

/** 氏名欄を持つ様式を全部組み立てる（1枚では出ない欄があるので2枚ぶん） */
function allCells(): GridCell[] {
  const cells: GridCell[] = [];
  for (let page = 0; page < 2; page += 1) {
    cells.push(
      ...buildTable4(COMMON, TOTALS, page, OPTIONS),
      ...buildTable42(COMMON, TOTALS, page, OPTIONS),
      ...buildTable9(COMMON, TOTALS, page, false, OPTIONS),
      ...buildTable10(COMMON, TOTALS, page, false, OPTIONS),
      ...buildTable14(COMMON, TOTALS, page, false, OPTIONS),
      ...buildTable88(COMMON, TOTALS, page, false, false, OPTIONS),
      ...buildTable13(COMMON, TOTALS, Array.from({ length: TABLE13_PERSONS }, (_, i) => ({
        prefix: `h${page * TABLE13_PERSONS + i}.`, label: `${i}人目`,
      })), page, false, OPTIONS),
    );
  }
  cells.push(
    ...buildTable6(COMMON, TOTALS, { minor: GROUPS, disabled: GROUPS, support: GROUPS }),
    ...buildTable7(COMMON, TOTALS, OPTIONS),
    ...buildTable1112f1(COMMON, TOTALS, 0, [
      { prefix: 'table1112f1#0.', index: 0, label: '明細1', linked: true },
      { prefix: 'table1112f1#1.', index: 1, label: '明細2', linked: false },
    ], OPTIONS),
    ...buildTable1112f1b(COMMON, TOTALS, 'table1112f1b#0.', 0, OPTIONS),
  );
  return cells;
}

describe('人を指す欄の一覧', () => {
  it('氏名の選択肢が付いている欄はすべて一覧に入っている', () => {
    const missing = [...new Set(refFields(allCells()))].filter((field) => !isHeirRefField(field));
    // 抜けると「並べ替えたら別人になる」に戻るので、様式を足したら heirRef.ts の一覧にも足す
    expect(missing).toEqual([]);
  });

  it('人を指さない欄は一覧に入らない', () => {
    // 番号で終わるが人ではないもの（第14表の受贈財産の番号・付表の項番・その人自身の番号）
    ['c.t14c0No', 'table11f1#0.no0', 'h0.t11no', 'c.t14c0Spouse'].forEach((field) => {
      expect(isHeirRefField(field)).toBe(false);
    });
  });
});

const heirs = withHeirIds([{ name: '甲' }, { name: '乙' }, { name: '丙' }]);
const id = (i: number): string => heirs[i]![HEIR_ID]!;

describe('参照の解決', () => {
  it('IDを何人目かに直して計算へ渡す', () => {
    const common: Values = { t9d0Who: id(2), t13d0Who: id(0), name: '被相続人' };
    const details = { table11f1: [{ who0: id(1), value: '100' }] };
    const out = resolveHeirRefs(common, heirs, details);
    expect(out.common).toEqual({ t9d0Who: '3', t13d0Who: '1', name: '被相続人' });
    expect(out.details.table11f1).toEqual([{ who0: '2', value: '100' }]);
  });

  it('並べ替えても同じ人を指す（番号だけが変わる）', () => {
    const common: Values = { t13d0Who: id(2) };
    const swapped = [heirs[2]!, heirs[0]!, heirs[1]!];
    expect(resolveHeirRefs(common, heirs, {}).common.t13d0Who).toBe('3');
    expect(resolveHeirRefs(common, swapped, {}).common.t13d0Who).toBe('1');
  });

  it('消された人を指していた欄は空欄になる', () => {
    const common: Values = { t13d0Who: id(1) };
    expect(resolveHeirRefs(common, [heirs[0]!, heirs[2]!], {}).common.t13d0Who).toBe('');
  });
});

describe('版5からの移行', () => {
  it('「何人目か」をその人のIDに読み替える', () => {
    const common: Values = { t13d0Who: '3', t4no: '1' };
    const details = { table11f1: [{ who0: '2' }] };
    const out = migrateHeirRefs(common, heirs, details);
    expect(out.common).toEqual({ t13d0Who: id(2), t4no: id(0) });
    expect(out.details.table11f1).toEqual([{ who0: id(1) }]);
  });

  it('居ない人を指していた欄は空欄になる', () => {
    expect(migrateHeirRefs({ t13d0Who: '9' }, heirs, {}).common.t13d0Who).toBe('');
  });
});
