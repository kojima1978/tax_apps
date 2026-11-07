import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  CATALOG_CASE_IDENTITY,
  CATALOG_FIELDS,
  CATALOG_FORMATS,
  CATALOG_ROW_TABLES,
  CATALOG_RULES,
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
const TABLE1_2 = read('../../src/components/tables/table1-2/Table1_2Grid.tsx');
const TABLE5 = read('../../src/components/tables/table5/Table5Grid.tsx');

/** 辞書の欄は様式＋識別記号で引く（記号は様式をまたぐと重複するため記号だけでは引けない）。 */
const fieldOf = (form: string, symbol: string) =>
  CATALOG_FIELDS.find((f) => f.form === form && f.symbol === symbol);

describe('コードの付け方', () => {
  it('コードが重複していない', () => {
    const codes = CATALOG_FIELDS.map((f) => f.code);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it('コードは「様式の略号:識別記号」の形で、記号の部分が様式の印字と一致する', () => {
    const wrong = CATALOG_FIELDS.filter(
      (f) => !/^[0-9]+(-[0-9]+)?:[A-Z][0-9]{2}$/.test(f.code) || !f.code.endsWith(`:${f.symbol}`),
    ).map((f) => `${f.code}(${f.symbol})`);
    expect(wrong).toEqual([]);
  });

  it('略号が要る理由（同じ識別記号が別の様式にもある）', () => {
    const forms = new Map<string, Set<string>>();
    for (const f of CATALOG_FIELDS) {
      const set = forms.get(f.symbol) ?? new Set<string>();
      set.add(f.form);
      forms.set(f.symbol, set);
    }
    // ここが空になるなら記号だけで一意になったということだが、様式が増えればまた衝突する。
    // 衝突が現にあることを記録しておき、「略号は冗長」と外されないようにする。
    const shared = [...forms].filter(([, set]) => set.size > 1).map(([symbol]) => symbol);
    expect(shared.length).toBeGreaterThan(0);
  });

  it('コードの読み方が取り決めに書いてある', () => {
    expect(CATALOG_RULES.some((r) => r.includes('略号'))).toBe(true);
  });
});

/** 第4表の1 の ci('field', 'SYMBOL', …) をソースから拾う。 */
interface SourceField { field: string; symbol: string; readOnly: boolean; signed: boolean; required: boolean }

function sourceFields(): SourceField[] {
  const out: SourceField[] = [];
  for (const m of TABLE4_1.matchAll(/\.\.\.ci\('([^']+)',\s*'([^']+)',([^\n]*)/g)) {
    const rest = m[3] ?? '';
    out.push({
      field: m[1]!, symbol: m[2]!,
      readOnly: rest.includes('readOnly: true'),
      signed: rest.includes('signedCommaInteger: true'),
      required: rest.includes('calculationRequired: true'),
    });
  }
  return out;
}

describe('第4表の1 の欄と様式の定義', () => {
  const form = '第4表の1';
  const src = sourceFields();

  it('様式側の欄をソースから拾えている（正規表現の空振り防止）', () => {
    expect(src.length).toBeGreaterThanOrEqual(28);
  });

  it('人が入れる欄はすべて辞書に載っている', () => {
    const missing = src.filter((s) => !s.readOnly).filter((s) => fieldOf(form, s.symbol) === undefined);
    expect(missing.map((s) => `${s.symbol}(${s.field})`)).toEqual([]);
  });

  it('自動計算欄・他表からの転記欄は辞書に載せない', () => {
    const leaked = src.filter((s) => s.readOnly).filter((s) => fieldOf(form, s.symbol) !== undefined);
    expect(leaked.map((s) => `${s.symbol}(${s.field})`)).toEqual([]);
  });

  it('辞書の識別記号と保存キーの対応が様式と一致する', () => {
    const bySymbol = new Map(src.map((s) => [s.symbol, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      .filter((f) => bySymbol.get(f.symbol)?.field !== f.field)
      .map((f) => `${f.code}: 辞書=${f.field} 様式=${bySymbol.get(f.symbol)?.field ?? 'なし'}`);
    expect(wrong).toEqual([]);
  });

  it('マイナスを取る欄の種類が様式の入力設定と一致する', () => {
    const bySymbol = new Map(src.map((s) => [s.symbol, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      .filter((f) => (f.kind === 'signedInteger') !== (bySymbol.get(f.symbol)?.signed ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });

  it('計算に必須の欄が様式の指定と一致する', () => {
    const bySymbol = new Map(src.map((s) => [s.symbol, s]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      .filter((f) => (f.required === true) !== (bySymbol.get(f.symbol)?.required ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });
});

// ── 第1表の1・第1表の2 ───────────────────────────────────────────────
//
// この2表は第4表の1 と違って ci() ヘルパを通さず、識別記号の印字セルと入力欄が
// 別の要素として並んでいる（同じ top の行に隣り合う）。なので記号と保存キーの
// 対応は「同じ行にあること」で確かめる。

interface GridInput { field: string; readOnly: boolean; required: boolean; signed: boolean }

function gridInputs(src: string): GridInput[] {
  return [...src.matchAll(/field: '([^']+)', kind: 'input'([^\n]*)/g)].map((m) => {
    const rest = m[2] ?? '';
    return {
      field: m[1]!,
      readOnly: rest.includes('readOnly: true'),
      required: rest.includes('calculationRequired: true'),
      signed: rest.includes('signedCommaInteger: true'),
    };
  });
}

/** 行から `top: 12.34` を読む（1セル＝1行で書かれている）。 */
function topOf(src: string, needle: string): number {
  const line = src.split(/\r?\n/).find((l) => l.includes(needle));
  expect(line, `${needle} の行を読めませんでした`).toBeDefined();
  const m = line!.match(/top: (-?[0-9.]+)/);
  expect(m, `${needle} の top を読めませんでした`).not.toBeNull();
  return Number(m![1]);
}

/**
 * 入力できるのに辞書へ載せていない欄と、その理由。
 * 「資料から決まらないから人が入れる」ものを、載せ漏れと区別するための一覧
 * ── 理由を書かずに外すと、次に辞書を触る人が足してしまう。
 */
const EXCLUDED: Record<string, Record<string, string>> = {
  '第1表の1': {
    f12: '会社名は案件の見出しになるので caseIdentity 側（create_case で入る）',
    f23: '業種目番号は候補を挙げるだけで書き込まない',
    f26: '業種目番号は候補を挙げるだけで書き込まない',
    f29: '業種目番号は候補を挙げるだけで書き込まない',
    f24: '取引金額の構成比は業種目の選び方そのものなので人が入れる',
    f27: '取引金額の構成比は業種目の選び方そのものなので人が入れる',
    f30: '取引金額の構成比は業種目の選び方そのものなので人が入れる',
  },
  '第1表の2': {
    company: '会社名の転記欄（本体は第1表の1 の E01）',
    j_name: '判定欄の会社名（転記）',
    j_chushin_name: '中心的な同族株主の判定欄の会社名（転記）',
    emp_regular: '従業員数は資料から決まらないので人が入れる',
    emp_hours: '従業員数は資料から決まらないので人が入れる',
    f8: '増減資の状況その他評価上の参考事項は自由記述',
  },
};

describe.each([
  { form: '第1表の1', src: TABLE1_1, least: 13 },
  { form: '第1表の2', src: TABLE1_2, least: 8 },
])('$form の欄と様式の定義', ({ form, src, least }) => {
  const inputs = gridInputs(src);
  const editable = inputs.filter((i) => !i.readOnly);
  const excluded = EXCLUDED[form]!;

  it('様式側の入力欄をソースから拾えている（正規表現の空振り防止）', () => {
    expect(editable.length).toBeGreaterThanOrEqual(least);
  });

  it('入力できる欄は辞書に載っているか、載せない理由が書かれている', () => {
    const fields = new Set(CATALOG_FIELDS.filter((f) => f.form === form).map((f) => f.field));
    const unexplained = editable
      .filter((i) => !fields.has(i.field) && excluded[i.field] === undefined)
      .map((i) => i.field);
    expect(unexplained).toEqual([]);
  });

  it('自動計算欄と、載せないと決めた欄は辞書に無い', () => {
    const fields = new Set(CATALOG_FIELDS.filter((f) => f.form === form).map((f) => f.field));
    const leaked = [
      ...inputs.filter((i) => i.readOnly).map((i) => i.field),
      ...Object.keys(excluded),
    ].filter((field) => fields.has(field));
    expect(leaked).toEqual([]);
  });

  it('辞書の保存キーが様式の入力欄として実在する', () => {
    const byField = new Map(editable.map((i) => [i.field, i]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      .filter((f) => byField.get(f.field) === undefined)
      .map((f) => `${f.code}(${f.field})`);
    expect(wrong).toEqual([]);
  });

  it('識別記号の印字セルが入力欄と同じ行にある', () => {
    for (const f of CATALOG_FIELDS.filter((x) => x.form === form)) {
      // 記号が別の欄のものだと行（top）がずれる
      expect(topOf(src, `codeLabel: '${f.symbol}'`), `${f.code}`)
        .toBe(topOf(src, `field: '${f.field}', kind: 'input'`));
    }
  });

  it('計算に必須の欄が様式の指定と一致する', () => {
    const byField = new Map(editable.map((i) => [i.field, i]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      // 文字の欄（本店の所在地・代表者氏名）は計算に使われないので指定も無い
      .filter((f) => (f.required === true) !== (byField.get(f.field)?.required ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });

  it('マイナスを取る欄の種類が様式の入力設定と一致する', () => {
    const byField = new Map(editable.map((i) => [i.field, i]));
    const wrong = CATALOG_FIELDS.filter((f) => f.form === form)
      .filter((f) => (f.kind === 'signedInteger') !== (byField.get(f.field)?.signed ?? false))
      .map((f) => `${f.code}(${f.label})`);
    expect(wrong).toEqual([]);
  });
});

// ── 明細行で入れる表 ──────────────────────────────────────────────────

/**
 * 表ごとに、行数の定義元と、保存キーを組み立てているソース。
 * 続紙の枚数欄は意味が表ごとに違う（第5表の _pages は 1＝本表のみ、
 * 第1表の1 の _shpages は 0＝本表のみ）ので、base も突き合わせる。
 */
const ROW_TABLE_SOURCES = [
  {
    id: 'balanceSheet',
    rowsSource: read('../../src/lib/table5Rows.ts'),
    names: { mainRows: 'TABLE5_MAIN_ROWS', contRows: 'TABLE5_CONT_ROWS', maxPages: 'TABLE5_MAX_PAGES' },
    grid: TABLE5,
    rowVar: 'row',
  },
  {
    id: 'shareholders',
    rowsSource: TABLE1_1,
    names: { mainRows: 'SH_ROWS', contRows: 'CONT_SH', maxPages: 'MAX_SH_PAGES' },
    grid: TABLE1_1,
    rowVar: 'r',
  },
] as const;

describe.each(ROW_TABLE_SOURCES)('明細行の表（$id）', ({ id, rowsSource, names, grid, rowVar }) => {
  const rowTable = CATALOG_ROW_TABLES.find((t) => t.id === id)!;

  it('表が辞書にある', () => {
    expect(rowTable).toBeDefined();
  });

  it('行数と枚数の上限が様式側の定数と一致する', () => {
    const constOf = (name: string) => {
      const m = rowsSource.match(new RegExp(name + ' = ([0-9]+)'));
      expect(m, `${name} を読めませんでした`).not.toBeNull();
      return Number(m![1]);
    };
    expect(rowTable.mainRows).toBe(constOf(names.mainRows));
    expect(rowTable.contRows).toBe(constOf(names.contRows));
    expect(rowTable.pages.max).toBe(constOf(names.maxPages));
    expect(rowTable.maxRows).toBe(
      rowTable.mainRows + rowTable.contRows * (rowTable.pages.max - rowTable.pages.base),
    );
  });

  it('続紙の枚数欄の名前と、本表だけのときの値が様式側と一致する', () => {
    const { field, base } = rowTable.pages;
    const m = rowsSource.match(
      new RegExp(`Math\\.max\\(([0-9]+), Number\\(getField\\('${rowTable.table}', '${field}'\\)\\)`),
    );
    expect(m, `${field} の読み取り（Math.max）を見つけられませんでした`).not.toBeNull();
    expect(Number(m![1])).toBe(base);
  });

  it('保存キーの組み立て方が様式の参照と一致する', () => {
    for (const side of rowTable.sides) {
      for (const col of rowTable.columns) {
        expect(grid).toContain(`${side.prefix}_\${${rowVar}}_${col.key}`);
      }
    }
  });

  it('行の見出しになる列が1つだけ決まっている', () => {
    expect(rowTable.columns.filter((c) => c.required === true)).toHaveLength(1);
  });

  it('列の名前と保存キーが重複していない', () => {
    const colNames = rowTable.columns.map((c) => c.name);
    const keys = rowTable.columns.map((c) => c.key);
    expect(colNames.length).toBe(new Set(colNames).size);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('選択肢を配る列が enum として宣言されている', () => {
    const byName = new Map(rowTable.columns.map((c) => [c.name, c]));
    for (const side of rowTable.sides) {
      for (const name of Object.keys(side.options ?? {})) {
        expect(byName.get(name)?.kind, `${side.key}.${name}`).toBe('enum');
      }
    }
  });
});

describe('第5表の明細行', () => {
  const table5 = CATALOG_ROW_TABLES.find((t) => t.id === 'balanceSheet')!;
  const asset = table5.sides.find((s) => s.key === 'asset')!;

  it('資産の備考の選択肢が貼り付け取込と一致する', () => {
    const paste = read('../../src/features/table5Paste/parseBalanceSheet.ts');
    const m = paste.match(/ASSET_NOTES:\s*readonly string\[\]\s*=\s*\[([^\]]*)\]/);
    expect(m, 'ASSET_NOTES を読めませんでした').not.toBeNull();
    const notes = [...m![1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
    expect([...(asset.options?.note ?? [])]).toEqual(notes);
  });

  it('備考の選択肢が様式の選択肢に含まれている', () => {
    const line = TABLE5.split(/\r?\n/).find((l) => l.includes('options:'));
    expect(line, 'options の行を読めませんでした').toBeDefined();
    for (const option of asset.options?.note ?? []) expect(line).toContain(`'${option}'`);
  });

  it('負債側には備考の選択肢が無い（空欄だけ）', () => {
    const liability = table5.sides.find((s) => s.key === 'liability')!;
    expect(liability.options?.note).toBeUndefined();
  });

  it('金額欄がマイナスを取れる（控除項目が入るため）', () => {
    // 様式側は 0 始まりの列番号で判定している（辞書の保存キーは 1 始まり）
    expect(TABLE5).toContain('const isAmount = ci === 1 || ci === 2;');
    const signed = table5.columns.filter((c) => c.kind === 'signedInteger').map((c) => c.key);
    expect(signed).toEqual(['2', '3']);
  });
});

describe('第1表の1 の株主の明細行', () => {
  const sh = CATALOG_ROW_TABLES.find((t) => t.id === 'shareholders')!;

  it('続紙も本表と同じ通し番号の保存キーを使う', () => {
    // 続紙の1行目は SH_ROWS + (枚数-1) * CONT_SH + 1 から始まる（キーは分かれない）
    expect(TABLE1_1).toContain('SH_ROWS + (pageIndex - 1) * CONT_SH + 1');
  });

  it('評価方式の判定に関わる欄は載せていない（人が入れる）', () => {
    const keys = sh.columns.map((c) => c.key);
    // 続柄コード/続柄・役職コード/役職名・株式種類コード/株式の種類・議決権割合（自動計算）
    expect(keys).not.toContain('2k');
    expect(keys).not.toContain('2');
    expect(keys).not.toContain('3k');
    expect(keys).not.toContain('3');
    expect(keys).not.toContain('9');
    expect(keys).not.toContain('8');
    expect(keys).not.toContain('6');
  });

  it('入れ替えで同じ行の他の欄も消えることが注意書きにある', () => {
    expect(sh.hint ?? '').toContain('続柄');
  });

  it('側は1つだけ（資産・負債のような対になっていない）', () => {
    expect(sh.sides).toHaveLength(1);
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

  /** 和暦日付の4列プルダウンを置いている呼び出し（接頭辞・識別記号・必須）。 */
  const dateCalls = [...TABLE1_1.matchAll(
    /dateSelectCells\('([^']+)',\s*[0-9.]+,\s*[0-9.]+,\s*'([^']+)'(,\s*true)?\)/g,
  )].map((m) => ({ prefix: m[1]!, symbol: m[2]!, required: m[3] !== undefined }));

  it('様式側の日付欄をソースから拾えている（正規表現の空振り防止）', () => {
    expect(dateCalls.length).toBe(CATALOG_CASE_IDENTITY.dates.length);
  });

  it('会社名の欄が様式の識別記号の隣にある', () => {
    const { symbol, field } = CATALOG_CASE_IDENTITY.companyName;
    const codeLine = lineWith(`codeLabel: '${symbol}'`);
    const fieldLine = lineWith(`field: '${field}', kind: 'input'`);
    // 識別記号の印字セルの右端が入力欄の左端 ── 隣り合っていなければ別の欄の記号
    expect(numOf(fieldLine, 'left')).toBeCloseTo(numOf(codeLine, 'left') + numOf(codeLine, 'width'), 2);
  });

  it('日付欄の識別記号と保存キーの接頭辞が様式と一致する', () => {
    expect(dateCalls.map((c) => `${c.symbol}:${c.prefix}`))
      .toEqual(CATALOG_CASE_IDENTITY.dates.map((d) => `${d.symbol}:${d.prefix}`));
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
