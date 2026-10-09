// 夜間バックアップ用の案件 JSON 書き出し
// （Django 版 `manage.py export_case_json_backups --output-dir …` の置き換え）。
//
// `backup.sh` の backup_bank_analyzer_json が稼働中のコンテナの中でこれを呼ぶ。
// **ファイル名と中身は Django 版と同じ形に保つこと** ── 過去のバックアップと同じ
// フォルダに並び、どちらも画面の「JSONから復元」で読み込めるため:
//   `0001_<案件名>_backup.json` / `JSON.stringify(…, null, 2)` / 末尾に改行なし
// 取引0件の案件も1本書き出す（Django 版と同じ。読み込みは弾くが、案件名は記録に残る）。
//
// 出力先は環境変数 `OUTPUT_DIR` か `--output-dir <dir>`。dev と本番で入口が違う
// （dev=tsx でソースを直接・本番=ビルド済みの dist-server）ので、呼び出しは
// package.json の `backup:json` に寄せてある。

import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../db.js';
import { exportCaseJson } from '../services/backup.js';

// Django 版 views/_helpers.py の sanitize_filename。画面から落とす名前の
// sanitizePart とは別物（使えない文字を落とすのではなく `_` へ置き換える）なので、
// exportFileName.ts は使わない
function sanitizeFilename(name: string): string {
  const replaced = name.replace(/[\\/:*?"<>|]/g, '_');
  return replaced.replace(/^[_. ]+/, '').replace(/[_. ]+$/, '') || 'export';
}

function resolveOutputDir(): string {
  const i = process.argv.indexOf('--output-dir');
  const dir = (i >= 0 ? process.argv[i + 1] : undefined) ?? process.env.OUTPUT_DIR;
  if (!dir) throw new Error('出力先がありません（OUTPUT_DIR か --output-dir <dir> を指定してください）');
  return path.resolve(dir);
}

async function main() {
  const outputDir = resolveOutputDir();
  await fs.mkdir(outputDir, { recursive: true });

  const cases = await prisma.case.findMany({ select: { id: true }, orderBy: { id: 'asc' } });
  let exported = 0;
  for (const { id } of cases) {
    const result = await exportCaseJson(prisma, id, { allowEmpty: true });
    if (!result) continue; // 書き出している間に消えた案件
    const filename = `${String(id).padStart(4, '0')}_${sanitizeFilename(result.name)}_backup.json`;
    await fs.writeFile(path.join(outputDir, filename), JSON.stringify(result.data, null, 2), 'utf8');
    exported += 1;
  }
  console.log(`Exported ${exported} case JSON file(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
