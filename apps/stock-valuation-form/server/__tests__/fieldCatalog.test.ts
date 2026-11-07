import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  CATALOG_CASE_IDENTITY,
  CATALOG_FIELDS,
  CATALOG_FORMATS,
  CATALOG_ROW_TABLES,
  findByCode,
} from '../fieldCatalog.js';

/**
 * 辞書は様式の定義とは別ファイルなので、放っておくと片方だけ動いてずれる。
 * 様式側を import せずソースの文字列で突き合わせるのは jumpTargets.test.ts と同じ理由
 * （server のテストから .tsx を読み込むと React ごと引き込むことになる）。
 *
 * ずれ方は3通りあり、どれも黙って壊れる:
 *   - 載せ漏れ … 外から入れられない欄ができる（気づきにくい）
 *   - 載せ過ぎ … 自動計算欄に書き込めてしまい、次の再計算で消える
 *   - 種類違い … 欠損金がマイナスで入らず、利益金額が過大になる
 */
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');

const TABLE4_1 = read('../../src/components/tables/table4/Table4_1Grid.tsx');
const TABLE1_1 = read('../../src/components/tables/Table1_1Grid.tsx');

/** 第4表の1 の ci('field', 'CODE', …) をソースから拾う。 */
interface SourceField { field: string; code: string; readOnly: boolean; signed: boolean; required: boolean }

function sourceFields(): SourceField[] {
  const out: SourceField[] = [];
  for (const m of TABLE4_1.matchAll(/\.\.\.ci\('([^']+)',\s*'([^']+)',([^\n]*)/g)) {
    const rest = m[3] ?? '';
    out.push({
      field: m[1]!, code: m[2]!,
      readOnly: rest.includes('readOnly: true'),
      signed: rest.includes('signedCommaInteger: true'),
      required: rest.includes('calculationRequired: true'),
    });
  }
  return out;
}

describe('欄の辞書と様式の定義', () => {
  const src = sourceFields();

  it('様式側の欄をソースから拾えている（正規表現の空振り防止）', () => {
    expect(src.length).toBeGreaterThanOrEqual(28);
  });

  it('人が入れる欄はすべて辞書に載っている', () => {
    const missing = src.filter((s) => !s.readOnly).filter((s) => findByCode(s.code) === undefined);
    expect(missing.map((s) => `${s.code}(${s.field})`)).toEqual([]);
  });

  it('自動計算欄・他表からの転記欄は辞書に載せない', () => {
    const leaked = src.filter((s) => s.readOnly).filter((s) => findByCode(s.code) !== undefined);
    expect(leaked.map((s) => `${s.code}(${s.field})`)).toEqual([]);
  });

  it('辞書のコードと保存キーの対応が様式と一致する', () => {
    const byCode = new Map(src.map((s) => [s.code, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.table === 'table4')
      .filter((f) => byCode.get(f.code)?.field !== f.field)
      .map((f) => `${f.code}: 辞書=${f.field} 様式=${byCode.get(f.code)?.field ?? 'なし'}`);
    expect(wrong).toEqual([]);
  });

  it('マイナスを取る欄の種類が様式の入力設定と一致する', () => {
    const byCode = new Map(src.map((s) => [s.code, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.table === 'table4')
      .filter((f) => (f.kind === 'signedInteger') !== (byCode.get(f.code)?.signed ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });

  it('計算に必須の欄が様式の指定と一致する', () => {
    const byCode = new Map(src.map((s) => [s.code, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.table === 'table4')
      .filter((f) => (f.required === true) !== (byCode.get(f.code)?.required ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });

  it('コードが重複していない', () => {
    const codes = CATALOG_FIELDS.map((f) => f.code);
    expect(codes.length).toBe(new Set(codes).size);
  });
});

describe('第5表の明細行', () => {
  const table5 = CATALOG_ROW_TABLES.find((t) => t.table === 'table5')!;

  it('行数が様式側の定数と一致する', () => {
    const rows = read('../../src/lib/table5Rows.ts');
    const constOf = (name: string) => {
      const m = rows.match(new RegExp(name + ' = ([0-9]+)'));
      expect(m, `${name} を読めませんでした`).not.toBeNull();
      return Number(m![1]);
    };
    expect(table5.mainRows).toBe(constOf('TABLE5_MAIN_ROWS'));
    expect(table5.contRows).toBe(constOf('TABLE5_CONT_ROWS'));
    expect(table5.maxPages).toBe(constOf('TABLE5_MAX_PAGES'));
    expect(table5.maxRows).toBe(table5.mainRows + table5.contRows * (table5.maxPages - 1));
  });

  it('資産の備考の選択肢が貼り付け取込と一致する', () => {
    const paste = read('../../src/features/table5Paste/parseBalanceSheet.ts');
    const m = paste.match(/ASSET_NOTES:\s*readonly string\[\]\s*=\s*\[([^\]]*)\]/);
    expect(m, 'ASSET_NOTES を読めませんでした').not.toBeNull();
    const notes = [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
    const asset = table5.sides.find((s) => s.key === 'asset')!;
    expect([...asset.noteOptions]).toEqual(notes);
  });

  it('保存キーの組み立て方が様式の参照と一致する', () => {
    const grid = read('../../src/components/tables/table5/Table5Grid.tsx');
    // calcTable5Detail が読む形（a_${row}_1 … l_${row}_4）と同じ接頭辞・列番号であること
    for (const side of table5.sides) {
      for (const col of table5.columns) {
        expect(grid).toContain(`${side.prefix}_\${row}_${col.index}`);
      }
    }
  });
});

describe('値の書き方', () => {
  it('負号が様式側の表記と一致する', () => {
    const fmt = read('../../src/lib/numberFormat.ts');
    const m = fmt.match(/NEGATIVE_MARK = '([^']+)'/);
    expect(m, 'NEGATIVE_MARK を読めませんでした').not.toBeNull();
    expect(CATALOG_FORMATS.signedInteger.negativeMark).toBe(m![1]);
  });

  it('符号を取る欄と取らない欄の区別がある', () => {
    expect(CATALOG_FORMATS.integer.negativeMark).toBeUndefined();
    expect(CATALOG_FORMATS.text.numeric).toBe(false);
    expect(CATALOG_FORMATS.enum.numeric).toBe(false);
  });

  it('第5表の金額欄がマイナスを取れる（控除項目が入るため）', () => {
    const grid = read('../../src/components/tables/table5/Table5Grid.tsx');
    // 様式側は 0 始まりの列番号で判定している（辞書は 1 始まりなので +1 したものが金額欄）
    expect(grid).toContain('const isAmount = ci === 1 || ci === 2;');
    const table5 = CATALOG_ROW_TABLES.find((t) => t.table === 'table5')!;
    const signed = table5.columns.filter((c) => c.kind === 'signedInteger').map((c) => c.index);
    expect(signed).toEqual([2, 3]);
  });

  it('備考の選択肢が様式の選択肢に含まれている', () => {
    const grid = read('../../src/components/tables/table5/Table5Grid.tsx');
    const line = grid.split(/\r?\n/).find((l) => l.includes('options:'));
    expect(line, 'options の行を読めませんでした').toBeDefined();
    const asset = CATALOG_ROW_TABLES.find((t) => t.table === 'table5')!.sides.find((s) => s.key === 'asset')!;
    for (const option of asset.noteOptions) expect(line).toContain(`'${option}'`);
  });
});

describe('案件の見出しになる欄', () => {
  /** 1セル＝1行で書かれているので、行から座標を読める。 */
  const lineWith = (text: string): string => {
    const line = TABLE1_1.split(/\r?\n/).find((l) => l.includes(text));
    expect(line, `${text} の行を読めませんでした`).toBeDefined();
    return line!;
  };
  const numOf = (line: string, key: string): number => {
    const m = line.match(new RegExp(`${key}: (-?[0-9.]+)`));
    expect(m, `${key} を読めませんでした: ${line}`).not.toBeNull();
    return Number(m![1]);
  };

  /** 和暦日付の4列プルダウンを置いている呼び出し（接頭辞・コード・必須）。 */
  const dateCalls = [...TABLE1_1.matchAll(
    /dateSelectCells\('([^']+)',\s*[0-9.]+,\s*[0-9.]+,\s*'([^']+)'(,\s*true)?\)/g,
  )].map((m) => ({ prefix: m[1]!, code: m[2]!, required: m[3] !== undefined }));

  it('様式側の日付欄をソースから拾えている（正規表現の空振り防止）', () => {
    expect(dateCalls.length).toBe(CATALOG_CASE_IDENTITY.dates.length);
  });

  it('会社名の欄が様式の識別コードの隣にある', () => {
    const { code, field } = CATALOG_CASE_IDENTITY.companyName;
    const codeLine = lineWith(`codeLabel: '${code}'`);
    const fieldLine = lineWith(`field: '${field}', kind: 'input'`);
    // 識別コードの印字セルの右端が入力欄の左端 ── 隣り合っていなければ別の欄のコード
    expect(numOf(fieldLine, 'left')).toBeCloseTo(numOf(codeLine, 'left') + numOf(codeLine, 'width'), 2);
  });

  it('日付欄のコードと保存キーの接頭辞が様式と一致する', () => {
    expect(dateCalls.map((c) => `${c.code}:${c.prefix}`))
      .toEqual(CATALOG_CASE_IDENTITY.dates.map((d) => `${d.code}:${d.prefix}`));
  });

  it('見出しに使う欄（課税時期）が様式で必須の指定になっている', () => {
    expect(dateCalls.map((c) => c.required))
      .toEqual(CATALOG_CASE_IDENTITY.dates.map((d) => d.required));
  });

  it('4欄の内訳が様式の列と一致する', () => {
    const suffixes = [...TABLE1_1.matchAll(/\{ suffix: '([^']+)',/g)].map((m) => m[1]!);
    expect(suffixes).toEqual(CATALOG_CASE_IDENTITY.parts.map((p) => p.keySuffix));
  });

  it('見出しの組み立て方が一覧の表示と一致する', () => {
    const labels = read('../../src/features/cases/caseLabels.ts');
    const { table, companyName, dates, parts } = CATALOG_CASE_IDENTITY;
    expect(labels).toContain(`getField('${table}', '${companyName.field}')`);
    const taxPeriod = dates.find((d) => d.required)!;
    for (const part of parts) {
      // 一覧が読む欄（read('f14_y') など）と、値の後ろへ付ける字（`}年`）
      expect(labels).toContain(`read('${taxPeriod.prefix}${part.keySuffix}')`);
      if (part.labelSuffix !== '') expect(labels).toContain(`}${part.labelSuffix}`);
    }
  });
});

describe('元号', () => {
  const wareki = read('../../src/lib/wareki.ts');

  /** wareki.ts の ERAS（元号 → base / start / end）をソースから読む。 */
  const sourceEras = [...wareki.matchAll(
    /\['([^']+)',\s*\{ base: ([0-9]+), start: '([0-9-]+)'(?:, end: '([0-9-]+)')? \}\]/g,
  )].map((m) => ({ name: m[1]!, base: Number(m[2]), start: m[3]!, end: m[4] }));

  const openMaxYear = (() => {
    const m = wareki.match(/OPEN_ERA_MAX_YEAR = ([0-9]+)/);
    expect(m, 'OPEN_ERA_MAX_YEAR を読めませんでした').not.toBeNull();
    return Number(m![1]);
  })();

  it('様式側の元号をソースから拾えている（正規表現の空振り防止）', () => {
    expect(sourceEras.length).toBeGreaterThanOrEqual(CATALOG_CASE_IDENTITY.eras.length);
  });

  it('選べる元号が様式のプルダウンと一致する', () => {
    const m = wareki.match(/ERA_OPTS = \[([^\]]*)\]/);
    expect(m, 'ERA_OPTS を読めませんでした').not.toBeNull();
    const opts = [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
    expect(CATALOG_CASE_IDENTITY.eras.map((e) => e.name)).toEqual(opts);
  });

  it('元号の期間が様式側の定義と一致する', () => {
    const byName = new Map(sourceEras.map((e) => [e.name, e]));
    for (const era of CATALOG_CASE_IDENTITY.eras) {
      const src = byName.get(era.name);
      expect(src, `${era.name} が wareki.ts にありません`).toBeDefined();
      expect({ base: era.base, start: era.start, end: era.end })
        .toEqual({ base: src!.base, start: src!.start, end: src!.end });
      // 続いている元号は様式の選択肢の数で切る。終わった元号は改元日の年から決まる
      expect(era.lastYear).toBe(
        src!.end === undefined ? openMaxYear : Number(src!.end.slice(0, 4)) - src!.base,
      );
    }
  });

  it('元号未選択のときの扱いが様式と一致する', () => {
    const m = wareki.match(/DEFAULT_ERA = '([^']+)'/);
    expect(m, 'DEFAULT_ERA を読めませんでした').not.toBeNull();
    expect(CATALOG_CASE_IDENTITY.defaultEra).toBe(m![1]);
  });
});
