import type {
  IndustryCategory,
  IndustryDataset,
  IndustryYear,
} from '@/data/industryDataset';
import type { TableId, TableProps } from '@/types/form';

/*
  業種目番号は年分ごとに振り直される。番号だけを持ち回ると、課税時期の年分を変えた
  とたんに同じ番号が別の業種目を指し、B・C・Dも株価も黙って別物に入れ替わる。
  番号が新しい年分から消えていれば空欄になって気づけるが、番号が残ったまま中身が
  変わった場合は何も起こらない ── これがいちばん危ない。

  そこで「その番号をどの年分の表から選んだか」を番号と一緒に控えておき、課税時期の
  年分と食い違ったときだけ突き合わせる。控えが当年分と同じなら比べるまでもないので、
  照合は年分をまたいだときにしか働かない（新規入力では何も出ない）。
*/

/** 業種目番号の欄と、それを選んだ年分を控える欄の組。 */
export interface IndustryNumberTarget {
  /** データの保存先バケット（表示上のタブとは別のことがある）。 */
  table: TableId;
  field: string;
  /** 選んだ年分の西暦を控える欄。様式には無い、突き合わせ専用の欄。 */
  stampField: string;
  /** 移動先のタブ。table4 バケットは第4表の2で編集する。 */
  tab: TableId;
  /** 一覧に出す見出し。 */
  where: string;
}

export const INDUSTRY_NUMBER_TARGETS: readonly IndustryNumberTarget[] = [
  { table: 'table1_1', field: 'f23', stampField: 'f23_year', tab: 'table1_1', where: '第1表の1　業種目番号（上段）' },
  { table: 'table1_1', field: 'f26', stampField: 'f26_year', tab: 'table1_1', where: '第1表の1　業種目番号（中段）' },
  { table: 'table1_1', field: 'f29', stampField: 'f29_year', tab: 'table1_1', where: '第1表の1　業種目番号（下段）' },
  { table: 'table4', field: 'r1gyonum', stampField: 'r1gyonum_year', tab: 'table4_2', where: '第4表の2　類似業種（1つ目）' },
  { table: 'table4', field: 'r2gyonum', stampField: 'r2gyonum_year', tab: 'table4_2', where: '第4表の2　類似業種（2つ目）' },
];

/** 課税時期（第1表の1）。年分の特定に使う。 */
export function taxPeriodOf(getField: TableProps['getField']) {
  return {
    era: getField('table1_1', 'f14_g'),
    eraYear: getField('table1_1', 'f14_y'),
    month: getField('table1_1', 'f14_m'),
  };
}

/**
 * 同じ業種目か。名前ではなく大中小の分類の組で見る。
 * 表記ゆれ（「その他の◯◯」など）で名前だけが変わることがあるため。
 */
function samePath(a: IndustryCategory, b: IndustryCategory): boolean {
  return a.largeName === b.largeName
    && a.middleName === b.middleName
    && a.smallName === b.smallName;
}

/** 区分記号付きの表示名。一覧で「どの業種目か」を読めるようにする。 */
export function categoryLabel(category: IndustryCategory): string {
  const level = category.level === 'SMALL' ? '小' : category.level === 'MIDDLE' ? '中' : '大';
  const path = [category.largeName, category.middleName, category.smallName]
    .filter((name, index, names) => name !== '' && name !== names[index - 1])
    .join(' ＞ ');
  return `${category.number}　【${level}】${path || category.name}`;
}

/** 年分をまたいで業種目が変わっていた1件。 */
export interface IndustryYearDiff {
  target: IndustryNumberTarget;
  /** 控えてある番号。 */
  number: string;
  /** 選んだときの年分と、そのときの業種目。 */
  from: { year: IndustryYear; category: IndustryCategory };
  /** 課税時期の年分。 */
  toYear: IndustryYear;
  /** 同じ番号が当年分で指している業種目。番号ごと無くなっていれば undefined。 */
  to: IndustryCategory | undefined;
  /** 同じ分類が当年分では別番号になっている場合の付け替え先。 */
  replacement: IndustryCategory | undefined;
}

interface YearLookup {
  year: IndustryYear;
  byNumber: Map<string, IndustryCategory>;
}

function lookupOf(year: IndustryYear): YearLookup {
  return {
    year,
    byNumber: new Map(year.categories.map((category) => [String(category.number), category])),
  };
}

/**
 * 控えの年分と課税時期の年分で業種目が食い違っている欄を挙げる。
 *
 * 控えが無い欄は挙げない。どの年分の表から選んだか分からないので、比べようがない
 * （控えを持たない古い保存データは syncIndustryStamps が読み込み時に埋める）。
 */
export function industryYearDiffs(
  getField: TableProps['getField'],
  dataset: IndustryDataset,
): IndustryYearDiff[] {
  const toYear = dataset.forTaxPeriod(taxPeriodOf(getField)).year;
  if (toYear === undefined) return [];

  const to = lookupOf(toYear);
  const fromLookups = new Map<number, YearLookup>();

  const diffs: IndustryYearDiff[] = [];

  for (const target of INDUSTRY_NUMBER_TARGETS) {
    const number = getField(target.table, target.field).trim();
    if (number === '') continue;

    const stamp = Number(getField(target.table, target.stampField).trim());
    if (!Number.isInteger(stamp) || stamp === toYear.gregorianYear) continue;

    let fromLookup = fromLookups.get(stamp);
    if (fromLookup === undefined) {
      const year = dataset.years.find((candidate) => candidate.gregorianYear === stamp);
      // 控えの年分がもう登録されていなければ、何と比べるべきか分からない。
      if (year === undefined) continue;
      fromLookup = lookupOf(year);
      fromLookups.set(stamp, fromLookup);
    }

    const fromCategory = fromLookup.byNumber.get(number);
    if (fromCategory === undefined) continue;

    const toCategory = to.byNumber.get(number);
    if (toCategory !== undefined && samePath(fromCategory, toCategory)) continue;

    diffs.push({
      target,
      number,
      from: { year: fromLookup.year, category: fromCategory },
      toYear,
      to: toCategory,
      replacement: toYear.categories.find((candidate) => samePath(fromCategory, candidate)),
    });
  }

  return diffs;
}

/**
 * 番号の控えを整える。
 *
 * ・番号が空なら控えも消す（消し忘れが次の年分で誤検知になる）
 * ・控えが無く、当年分にその番号があるなら当年分を控える
 *   （控えを持たない古い保存データの救済。保存されていた帳票はその課税時期で作られている）
 * ・控えと当年分で業種目が変わっていなければ当年分へ進める（差分として出し続けない）
 *
 * 中身が変わっている場合だけ控えを残す。それが industryYearDiffs の拾う1件になる。
 */
export function syncIndustryStamps(
  getField: TableProps['getField'],
  dataset: IndustryDataset,
): Array<{ target: IndustryNumberTarget; stamp: string }> {
  const updates: Array<{ target: IndustryNumberTarget; stamp: string }> = [];
  const toYear = dataset.forTaxPeriod(taxPeriodOf(getField)).year;

  for (const target of INDUSTRY_NUMBER_TARGETS) {
    const number = getField(target.table, target.field).trim();
    const current = getField(target.table, target.stampField);

    if (number === '') {
      if (current !== '') updates.push({ target, stamp: '' });
      continue;
    }

    // 年分が未登録のうちは何も判断できない。控えはそのまま残す。
    if (toYear === undefined) continue;

    const stamp = String(toYear.gregorianYear);
    if (current === stamp) continue;

    const toCategory = toYear.categories.find((category) => String(category.number) === number);
    if (toCategory === undefined) continue;

    if (current.trim() === '') {
      updates.push({ target, stamp });
      continue;
    }

    const fromYear = dataset.years.find(
      (candidate) => String(candidate.gregorianYear) === current.trim(),
    );
    const fromCategory = fromYear?.categories.find(
      (category) => String(category.number) === number,
    );
    if (fromCategory === undefined || samePath(fromCategory, toCategory)) {
      updates.push({ target, stamp });
    }
  }

  return updates;
}
