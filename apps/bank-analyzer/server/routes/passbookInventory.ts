// 通帳有無一覧表（Django: passbook_inventory / add_certificate_account / import_certificate_accounts /
// api_save_passbook_inventory / api_reorder_passbook_inventory / export_passbook_inventory）。
// 中身は services/passbookInventory.ts

import type { PrismaClient } from '@prisma/client';
import { optionalText, parseAmountValue, parseIdList } from '../input.js';
import { parseId } from '../json.js';
import { contentDisposition } from '../lib/exportFileName.js';
import { StatementImportError } from '../lib/import/errors.js';
import {
  addCertificateAccount,
  checkLengths,
  exportInventoryXlsx,
  getInventory,
  importCertificateAccounts,
  readCertificateSheet,
  reorderAccounts,
  updateField,
  type FieldUpdate,
} from '../services/passbookInventory.js';
import { fail, ok, readBody, type CaseRouter } from './common.js';
import { MAX_FILE_BYTES } from './imports.js';

type ParsedUpdate = { ok: true; value: FieldUpdate } | { ok: false; error: string };

const AMOUNT_LABELS = { passbookBalance: '通帳残高', certificateBalance: '残証残高' } as const;

function parseFieldUpdate(body: Record<string, unknown>): ParsedUpdate {
  const { field, value } = body;
  switch (field) {
    case 'passbookBalance':
    case 'certificateBalance': {
      const amount = parseAmountValue(value, AMOUNT_LABELS[field], null);
      return amount.ok ? { ok: true, value: { field, value: amount.value } } : amount;
    }
    case 'hasAccruedInterest':
      return typeof value === 'boolean' ? { ok: true, value: { field, value } } : { ok: false, error: '既経過利息の値が正しくありません' };
    case 'inventoryRemarks':
      return value === null || value === undefined || typeof value === 'string'
        ? { ok: true, value: { field, value: value ?? '' } }
        : { ok: false, error: '備考の値が正しくありません' };
    case 'passbookYear': {
      const year = typeof body.year === 'string' ? Number(body.year) : body.year;
      if (typeof year !== 'number' || !Number.isInteger(year) || year < 1000 || year > 9999) {
        return { ok: false, error: '年が正しくありません' };
      }
      return typeof value === 'boolean' ? { ok: true, value: { field, year, value } } : { ok: false, error: '通帳有無の値が正しくありません' };
    }
    default:
      return { ok: false, error: '項目が正しくありません' };
  }
}

export function passbookInventoryRoutes(r: CaseRouter, db: PrismaClient) {
  r.get('/:caseId/passbook-inventory', async (c) => ok(c, await getInventory(db, c.get('caseId'))));

  // 取引の無い口座（残高証明書だけあるもの）を1件足す。同じ口座番号があればその口座を直す
  r.post('/:caseId/passbook-inventory/accounts', async (c) => {
    const body = await readBody(c);
    const accountNumber = optionalText(body.accountNumber);
    if (!accountNumber) return fail(c, '口座番号を入力してください');
    const certificateBalance = parseAmountValue(body.certificateBalance, '残証残高', null);
    if (!certificateBalance.ok) return fail(c, certificateBalance.error);
    const passbookBalance = parseAmountValue(body.passbookBalance, '通帳残高', null);
    if (!passbookBalance.ok) return fail(c, passbookBalance.error);
    const data = {
      accountNumber,
      bankName: optionalText(body.bankName) ?? '',
      branchName: optionalText(body.branchName) ?? '',
      accountType: optionalText(body.accountType) ?? '',
      certificateBalance: certificateBalance.value,
      passbookBalance: passbookBalance.value,
      hasAccruedInterest: body.hasAccruedInterest === true,
      inventoryRemarks: optionalText(body.inventoryRemarks) ?? '',
    };
    const tooLong = checkLengths(data);
    if (tooLong) return fail(c, tooLong);
    const result = await addCertificateAccount(db, c.get('caseId'), data);
    return ok(c, { created: result === 'created', message: `残高証明書の口座を${result === 'created' ? '追加' : '更新'}しました。` });
  });

  // 口座・残証残高のリスト（CSV / xlsx）
  r.post('/:caseId/passbook-inventory/import', async (c) => {
    let body: Record<string, unknown>;
    try {
      body = (await c.req.parseBody()) as Record<string, unknown>;
    } catch {
      return fail(c, '取込ファイルを選択してください。');
    }
    const file = body.file ?? body.certificate_file;
    if (!(file instanceof File)) return fail(c, '取込ファイルを選択してください。');
    if (file.size > MAX_FILE_BYTES) return fail(c, `ファイル '${file.name}' が大きすぎます（10MBまで）`);

    let sheet;
    try {
      sheet = readCertificateSheet(new Uint8Array(await file.arrayBuffer()));
    } catch (e) {
      if (!(e instanceof StatementImportError)) throw e;
      return fail(c, `取込に失敗しました: ${e.message}`);
    }
    const result = await importCertificateAccounts(db, c.get('caseId'), sheet);
    if (!result.ok) return fail(c, `取込に失敗しました: ${result.error}`);
    const { created, updated, skipped } = result.value;
    return ok(c, {
      ...result.value,
      message: `残高証明書の口座リストを取り込みました。追加${created}件、更新${updated}件、スキップ${skipped}件。`,
    });
  });

  // 1つの欄を書く（画面のその場編集）
  r.patch('/:caseId/passbook-inventory/accounts/:accountId', async (c) => {
    const accountId = parseId(c.req.param('accountId'));
    if (!accountId) return fail(c, '口座が見つかりません', 404);
    const update = parseFieldUpdate(await readBody(c));
    if (!update.ok) return fail(c, update.error);
    const result = await updateField(db, c.get('caseId'), accountId, update.value);
    if (!result) return fail(c, '口座が見つかりません', 404);
    return ok(c, result);
  });

  r.put('/:caseId/passbook-inventory/order', async (c) => {
    const body = await readBody(c);
    const order = parseIdList(body.order);
    if (!order || order.length === 0) return fail(c, '並び順が正しくありません');
    if (!(await reorderAccounts(db, c.get('caseId'), order))) return fail(c, '並び順に、この案件に無い口座か重複した口座が含まれています');
    return ok(c);
  });

  r.get('/:caseId/export/xlsx/passbook-inventory', async (c) => {
    const file = await exportInventoryXlsx(db, c.get('caseId'));
    return c.body(file.body, 200, { 'Content-Type': file.contentType, 'Content-Disposition': contentDisposition(file.filename) });
  });
}
