// 業種目データ（1年分アーカイブJSON）をDBへ取り込む。
//
// 取込元は prisma/industry-data/*.json。ここは Git 管理下に置いてあるので、
// `git pull` した環境で起動すれば同じ年分がそのまま復元される。
// 書き出しは `npm run industry:save`（DB → 同ディレクトリ）。
//
// 個々の会社の情報はこのディレクトリには一切入らない。業種目データだけが Git に乗る。
//
// ここは **足すだけ** で、既存のデータは消さない。以前は SEED_FORCE=1 で全年分を
// 消してから入れ直せるようにしていたが、環境変数はコンテナに残り続ける
// （`docker compose restart` は environment を評価し直さない）ため、
// 一度立てると再起動のたびに全消し→再取込が走った。しかもアーカイブの無い年分
// （画面から登録して `industry:save` していないもの）は戻せない。
// 入れ直しは年分を名指しする明示操作に移した ── `npm run industry:reseed`。

import fs from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { createIndustryYear, parseArchive } from './industryArchive.js';

export interface SeedYearResult {
  label: string;
  skipped: boolean;
  categoryCount: number;
  monthlyPriceCount: number;
}

export interface SeedResult {
  years: SeedYearResult[];
  imported: number;
  skipped: number;
}

/** ファイル名は `業種目データ_令和8年分_2026.json`。ログの順序を安定させるため名前順に読む。 */
function listArchiveFiles(dataDir: string): string[] {
  if (!fs.existsSync(dataDir)) {
    throw new Error(`業種目データのディレクトリがありません: ${dataDir}`);
  }
  return fs
    .readdirSync(dataDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
}

/**
 * 未登録の年分だけを取り込む。既にある年分には触れない
 * （画面から訂正した内容をファイルで上書きしてしまわないため）。
 * ファイルの内容で入れ直したいときは `npm run industry:reseed`（年分を名指しする明示操作）。
 */
export async function seedIndustryData(db: PrismaClient, dataDir: string): Promise<SeedResult> {
  const files = listArchiveFiles(dataDir);
  if (files.length === 0) {
    throw new Error(`業種目データのJSONが1件もありません: ${dataDir}`);
  }

  const years: SeedYearResult[] = [];

  for (const file of files) {
    let archive;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8')) as unknown;
      archive = parseArchive(raw, file);
    } catch (error) {
      // 何年分もある中のどれが壊れているのか分からないと直しようがない。
      throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }

    const existing = await db.industryYear.findUnique({
      where: { gregorianYear: archive.gregorianYear },
    });
    if (existing) {
      years.push({ label: archive.label, skipped: true, categoryCount: 0, monthlyPriceCount: 0 });
      continue;
    }

    const created = await createIndustryYear(db, archive);
    years.push({
      label: created.label,
      skipped: false,
      categoryCount: created.categoryCount,
      monthlyPriceCount: created.monthlyPriceCount,
    });
  }

  // 「起動はしているが業種目マスタが空」という静かな壊れ方を防ぐ最後の砦。
  // ここで投げると health が 503 になり、restart: unless-stopped が拾う。
  if ((await db.industryYear.count()) === 0) {
    throw new Error('業種目データが1年分も登録されていません');
  }

  return {
    years,
    imported: years.filter(({ skipped }) => !skipped).length,
    skipped: years.filter(({ skipped }) => skipped).length,
  };
}
