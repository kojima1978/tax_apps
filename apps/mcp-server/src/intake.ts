/**
 * 取込の控え ── どの欄を外から入れたのか、何を読んで入れたのかを案件に残す。
 *
 * 置き場所（案件データの中のバケット）も鍵の形も、株式評価明細書の辞書が決める
 * （`catalog.intake`）。ここに写しを持たないのは様式と同じ理由で、片方だけ古くなって
 * 黙って別の場所へ書き始めるのを避けるため。
 *
 * 画面はこの控えを読んで、自動で入った欄に印を付け（印刷には出さない）、人が確認・入力する
 * 欄を一覧にする。人が値を直すと画面が鍵を落とし、「確認済み」にすると confirmed を立てる
 * （出典は残る）。だから **こちらから confirmed は渡さない**。
 */
import type { CaseData, CatalogIntake, FieldCatalog } from './catalog.js';
import { InputError } from './errors.js';

/** 道具が受け取る出典。 */
export interface IntakeSourceInput {
  source?: unknown;
  page?: unknown;
  note?: unknown;
  uncertain?: unknown;
}

/** 控えに入れる値。`confirmed` は画面だけが立てるのでここには無い。 */
export interface IntakeRecord {
  source: string;
  page?: number;
  note?: string;
  uncertain?: boolean;
  at: string;
}

/** 控えを書く先。`filled` が false の欄（空にした欄）は控えも消す。 */
export interface IntakeTarget {
  key: string;
  filled: boolean;
}

export interface ApplyIntakeResult {
  data: CaseData;
  /** 控えを置いた鍵 */
  added: string[];
  /** 控えを落とした鍵（空にした欄・出典なしで上書きした欄） */
  removed: string[];
}

const CONTROL_CHARS = /[\x00-\x1f\x7f]/;
const SOURCE_MAX = 120;
const NOTE_MAX = 200;

/**
 * 控えの置き場所。辞書に無ければ書きに行かない ── 勝手な場所へ書くと画面は読めず、
 * 「出典を付けたのに誰にも見えない」になる。
 */
export function intakeOf(catalog: FieldCatalog): CatalogIntake {
  if (catalog.intake === undefined) {
    throw new InputError(
      '株式評価明細書の辞書に取込の控えの置き場所（intake）がありません。'
      + 'アプリが古いので、docker/scripts/manage.sh build stock-valuation-form で作り直してください',
    );
  }
  return catalog.intake;
}

function text(value: unknown, what: string, max: number): string {
  if (typeof value !== 'string') throw new InputError(`${what}: 文字列で指定してください`);
  const trimmed = value.trim();
  if (CONTROL_CHARS.test(trimmed)) {
    throw new InputError(`${what}: 改行やタブを含む値は入れられません`);
  }
  if (trimmed.length > max) {
    throw new InputError(`${what}: ${max}文字までにしてください（${trimmed.length}文字）`);
  }
  return trimmed;
}

/**
 * 出典を検証して控えの値にする。省略（undefined）はそのまま null を返す ──
 * 資料を読まずに人の指示で直すときまで出典を強いると、嘘のファイル名が入る。
 */
export function buildIntakeRecord(
  raw: IntakeSourceInput | undefined,
  now: Date = new Date(),
): IntakeRecord | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InputError('source: 読んだ資料を { source: "決算書.pdf", page: 4 } の形で指定してください');
  }

  const known = ['source', 'page', 'note', 'uncertain'];
  for (const key of Object.keys(raw)) {
    if (known.includes(key)) continue;
    if (key === 'confirmed') {
      throw new InputError(
        'source.confirmed は渡せません。人が画面で「確認済み」にしたときだけ立つ印です',
      );
    }
    throw new InputError(`source.${key} という項目はありません。指定できるのは ${known.join(' / ')}`);
  }

  const source = text(raw.source, 'source', SOURCE_MAX);
  if (source === '') {
    throw new InputError('source: 読んだ資料のファイル名を入れてください（空では控えになりません）');
  }

  let page: number | undefined;
  if (raw.page !== undefined && raw.page !== null) {
    const value = typeof raw.page === 'string' ? Number(raw.page.trim()) : raw.page;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new InputError(`source.page: 1以上の整数で指定してください（${String(raw.page)}）`);
    }
    page = value;
  }

  let note: string | undefined;
  if (raw.note !== undefined && raw.note !== null) {
    const value = text(raw.note, 'source.note', NOTE_MAX);
    if (value !== '') note = value;
  }

  let uncertain: boolean | undefined;
  if (raw.uncertain !== undefined && raw.uncertain !== null) {
    if (typeof raw.uncertain !== 'boolean') {
      throw new InputError('source.uncertain: true か false で指定してください');
    }
    if (raw.uncertain) uncertain = true;
  }

  return {
    source,
    ...(page === undefined ? {} : { page }),
    ...(note === undefined ? {} : { note }),
    ...(uncertain === undefined ? {} : { uncertain }),
    at: now.toISOString(),
  };
}

/**
 * 控えを案件データへ重ねる（元のデータは変えない）。
 *
 * 出典が無いとき（record が null）は、書いた欄の控えを**落とす**。人の指示で直した値に
 * 前の取込の出典が残っていると、画面が「この数字は決算書から入った」と嘘をつく。
 */
export function applyIntake(
  catalog: FieldCatalog,
  data: CaseData,
  targets: readonly IntakeTarget[],
  record: IntakeRecord | null,
): ApplyIntakeResult {
  const intake = intakeOf(catalog);
  const bucket = { ...(data[intake.table] ?? {}) };
  const encoded = record === null ? '' : JSON.stringify(record);

  const added: string[] = [];
  const removed: string[] = [];
  for (const target of targets) {
    if (record !== null && target.filled) {
      bucket[target.key] = encoded;
      added.push(target.key);
      continue;
    }
    if (bucket[target.key] !== undefined) {
      delete bucket[target.key];
      removed.push(target.key);
    }
  }

  const next: CaseData = { ...data };
  if (Object.keys(bucket).length === 0) delete next[intake.table];
  else next[intake.table] = bucket;

  return { data: next, added, removed };
}

/** 案件に入っている控え（鍵 → 値）。読めない値は無かったことにする。 */
export function readIntake(
  catalog: FieldCatalog,
  data: CaseData,
): Record<string, Record<string, unknown>> {
  const bucket = data[catalog.intake?.table ?? ''];
  if (bucket === undefined) return {};
  const out: Record<string, Record<string, unknown>> = {};
  for (const [key, raw] of Object.entries(bucket)) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        out[key] = parsed as Record<string, unknown>;
      }
    } catch {
      // 壊れた控えは見せない（入力そのものには関係しない）
    }
  }
  return out;
}

/** 文面に出す1行ぶん（「決算書.pdf 4ページ / 剰余金の配当」）。 */
export function describeIntakeRecord(record: IntakeRecord): string {
  const parts = [record.source];
  if (record.page !== undefined) parts.push(`${record.page}ページ`);
  const head = parts.join(' ');
  const tail = [record.note, record.uncertain === true ? '自信なし' : undefined].filter(
    (v): v is string => v !== undefined,
  );
  return tail.length === 0 ? head : `${head} / ${tail.join(' / ')}`;
}
