// 原本は tax_apps/shared/help-doc/。写しを直さず原本を直して `bash shared/sync.sh` で配る
//
// アプリ内の「使い方」画面の本文の形。文章は各アプリの help-content.ts に節の配列で置き、
// 画面（HelpDocument.tsx）はそれを .map() で描くだけにする。Markdown パーサは入れない（依存を増やさない）。
// 本文の崩れ（目次と見出しの食い違い・空の欄・表の列数違い）は helpDocProblems で
// jsdom 無しに検査できる。各アプリのテストは「helpDocProblems(HELP_SECTIONS) が空」を見るだけでよい。

export type HelpBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'steps'; items: readonly string[] }
  | { kind: 'table'; caption?: string; headers: readonly string[]; rows: readonly (readonly string[])[] }
  | { kind: 'note'; text: string };

export type HelpSection = {
  /** 目次のリンク先・見出しの id（半角英小文字・数字・ハイフン。先頭は英字） */
  id: string;
  /** 「1. はじめに」のように、並び順の番号から始める */
  title: string;
  /** 目次に添える1行説明 */
  summary: string;
  blocks: readonly HelpBlock[];
};

/** 本文の崩れを人が読める文で返す（無ければ空配列） */
export function helpDocProblems(sections: readonly HelpSection[]): string[] {
  const problems: string[] = [];
  if (sections.length === 0) problems.push('節が1つもありません');

  const seen = new Set<string>();
  sections.forEach((section, index) => {
    const where = `${index + 1}番目の節（${section.id || 'id なし'}）`;
    if (!/^[a-z][a-z0-9-]*$/.test(section.id)) problems.push(`${where}: id がアンカーに使えない文字を含みます`);
    if (seen.has(section.id)) problems.push(`${where}: id が重複しています`);
    seen.add(section.id);
    if (!section.title.startsWith(`${index + 1}. `)) problems.push(`${where}: 見出しが「${index + 1}. 」で始まっていません`);
    if (!section.summary.trim()) problems.push(`${where}: 1行説明が空です`);
    if (section.blocks.length === 0) problems.push(`${where}: 本文がありません`);

    section.blocks.forEach((block, blockIndex) => {
      const at = `${where} の${blockIndex + 1}番目`;
      switch (block.kind) {
        case 'paragraph':
        case 'note':
          if (!block.text.trim()) problems.push(`${at}: 文章が空です`);
          break;
        case 'list':
        case 'steps':
          if (block.items.length === 0) problems.push(`${at}: 箇条書きが空です`);
          if (block.items.some((item) => !item.trim())) problems.push(`${at}: 空の項目があります`);
          // 画面は項目の文をそのまま key に使う
          if (new Set(block.items).size !== block.items.length) problems.push(`${at}: 同じ項目が重複しています`);
          break;
        case 'table': {
          if (block.headers.length < 2) problems.push(`${at}: 表の列が2つ未満です`);
          if (block.rows.length === 0) problems.push(`${at}: 表に行がありません`);
          block.rows.forEach((row, rowIndex) => {
            if (row.length !== block.headers.length) problems.push(`${at} の表の${rowIndex + 1}行目: 列数が見出しと違います`);
            if (row.some((cell) => !cell.trim())) problems.push(`${at} の表の${rowIndex + 1}行目: 空のセルがあります`);
          });
          const keys = block.rows.map((row) => row.join('|'));
          if (new Set(keys).size !== keys.length) problems.push(`${at}: 同じ行が重複しています`);
          break;
        }
      }
    });
  });
  return problems;
}
