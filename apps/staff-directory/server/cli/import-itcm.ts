// 案件管理（itcm）の担当者・部署を台帳へ取り込む。
//
//   docker compose exec staff-directory npm run import:itcm              # 何をするかの一覧だけ（DB は変わらない）
//   docker compose exec staff-directory npm run import:itcm -- --yes     # 実行
//
// itcm は tax-apps-network 越しの HTTP で読む（itcm の DB には触らない）。
// 何度流しても取込済みの人は読み飛ばすので、itcm 側で担当者を足した後に流し直してよい。

import { closeDb, getDb } from '../db.js';
import {
  applyItcmImport,
  planItcmImport,
  type ItcmAssignee,
  type ItcmDepartment,
} from '../itcm-import.js';

const ITCM_API = process.env.ITCM_API_BASE ?? 'http://itcm-frontend:3020/itcm/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const execute = process.argv.includes('--yes');

  let departments: ItcmDepartment[];
  let assignees: ItcmAssignee[];
  try {
    [departments, assignees] = await Promise.all([
      fetchJson<ItcmDepartment[]>(`${ITCM_API}/departments`),
      fetchJson<ItcmAssignee[]>(`${ITCM_API}/assignees`),
    ]);
  } catch (err) {
    console.error(`案件管理から読めませんでした: ${(err as Error).message}`);
    console.error('案件管理（itcm-frontend）が起動しているか確かめてください。');
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  const plan = planItcmImport(db, departments, assignees);

  const deptCreate = plan.departments.filter((p) => p.action === 'create');
  const deptLink = plan.departments.filter((p) => p.action === 'link');
  const deptSkip = plan.departments.filter((p) => p.action === 'skip');
  const staffCreate = plan.staff.filter((p) => p.action === 'create');
  const staffSkip = plan.staff.filter((p) => p.action === 'skip');

  console.log(`案件管理: 部署 ${departments.length}件 / 担当者 ${assignees.length}名`);
  console.log('');
  console.log(`部署   新規 ${deptCreate.length} / 同名の部署へ結び付け ${deptLink.length} / 取込済み ${deptSkip.length}`);
  for (const p of deptCreate) console.log(`  + ${p.source.name}${p.source.active ? '' : '（使用停止）'}`);
  for (const p of deptLink) console.log(`  = ${p.source.name}（台帳の部署 #${p.localId}）`);
  console.log(`担当者 新規 ${staffCreate.length} / 取込済み ${staffSkip.length}`);
  for (const p of staffCreate) {
    const extra = [p.retiredOn ? `退職 ${p.retiredOn}` : '', ...p.notes].filter(Boolean).join(' / ');
    console.log(`  + itcm#${p.source.id} ${p.source.name}${extra ? `  （${extra}）` : ''}`);
  }
  console.log('');

  if (deptCreate.length + deptLink.length + staffCreate.length === 0) {
    console.log('取り込むものはありません。');
    closeDb();
    return;
  }
  if (!execute) {
    console.log('ここまでは一覧だけです（DB は変わっていません）。実行するには末尾に -- --yes を付けてください。');
    closeDb();
    return;
  }

  const result = applyItcmImport(db, plan);
  console.log(
    `取り込みました: 部署 新規 ${result.departmentsCreated}・結び付け ${result.departmentsLinked} / 担当者 ${result.staffCreated}名`,
  );
  closeDb();
}

await main();
