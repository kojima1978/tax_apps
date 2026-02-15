import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import { formatReiwaYear } from '@tax-apps/utils';
import {
  initializeDb,
  getOrCreateCustomer,
  saveDocumentRecord,
  getDocumentRecordByCustomerInfo,
  copyToNextYear,
  getAllCustomers,
  getCustomerYears,
  searchCustomers,
  getDistinctCustomerNames,
  getDistinctYears,
  getCustomerNamesByStaff,
  getYearsByCustomerAndStaff,
  getAllDocumentRecords,
  deleteDocumentRecord,
  updateCustomer,
  createCustomer,
  deleteCustomer,
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getFullBackupData,
  restoreFullBackup,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 文字列バリデーション: 空/非文字列/空白のみ → null、有効 → トリム済み文字列 */
function requireTrimmedString(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** req.params.id をパースし、無効な場合は400レスポンスを返す */
function parseId(req: express.Request, res: express.Response): number | null {
  const raw = req.params.id;
  const id = parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return null;
  }
  return id;
}

/** エンティティ作成の共通エラーハンドリング（409重複 / 500サーバーエラー） */
function handleCreateError(res: express.Response, e: unknown, duplicateMessage: string): void {
  const message = getErrorMessage(e);
  if (message.includes('already exists') || message.includes('UNIQUE constraint failed')) {
    res.status(409).json({ error: duplicateMessage });
  } else {
    res.status(500).json({ error: message });
  }
}

// ミドルウェア
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3005'],
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

// データベース初期化
initializeDb();

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// [NEW] Customer Management API

// Create customer
app.post('/api/customers', (req, res) => {
  const { staffId } = req.body;
  const trimmedName = requireTrimmedString(req.body.customerName);
  if (!trimmedName || !staffId) {
    return res.status(400).json({ error: 'Valid customerName and staffId are required' });
  }

  try {
    const customer = createCustomer(trimmedName, Number(staffId));
    res.json({ customer });
  } catch (e: unknown) {
    handleCreateError(res, e, 'この担当者に同名のお客様が既に登録されています');
  }
});

// Update customer
app.put('/api/customers/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { staffId } = req.body;
  const trimmedName = requireTrimmedString(req.body.customerName);

  if (!trimmedName || !staffId) {
    return res.status(400).json({ error: 'Valid customerName and staffId are required' });
  }

  const success = updateCustomer(id, trimmedName, Number(staffId));
  if (!success) {
    return res.status(404).json({ error: 'Customer not found or duplicate name' });
  }

  res.json({ success: true });
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const success = deleteCustomer(id);
  if (!success) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({ success: true });
});

// 顧客一覧を取得
app.get('/api/customers', (_req, res) => {
  const customers = getAllCustomers();
  res.json({ customers });
});

// 顧客検索
app.get('/api/search', (req, res) => {
  const trimmedQ = requireTrimmedString(req.query.q);

  if (!trimmedQ) {
    return res.json({ results: [] });
  }

  const results = searchCustomers(trimmedQ);
  res.json({ results });
});

// [NEW] Staff Management API

// Get all staff
app.get('/api/staff', (_req, res) => {
  const staff = getAllStaff();
  res.json({ staff });
});

// Create staff
app.post('/api/staff', (req, res) => {
  const { mobileNumber } = req.body;
  const trimmedName = requireTrimmedString(req.body.staffName);
  if (!trimmedName) {
    return res.status(400).json({ error: 'Valid staffName is required' });
  }
  try {
    const staff = createStaff(trimmedName, mobileNumber);
    res.json({ staff });
  } catch (e: unknown) {
    handleCreateError(res, e, 'この担当者名は既に登録されています');
  }
});

// Update staff
app.put('/api/staff/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { mobileNumber } = req.body;
  const trimmedName = requireTrimmedString(req.body.staffName);

  if (!trimmedName) {
    return res.status(400).json({ error: 'Valid staffName is required' });
  }

  const success = updateStaff(id, trimmedName, mobileNumber);
  if (!success) {
    return res.status(404).json({ error: 'Staff not found' });
  }

  res.json({ success: true });
});

// Delete staff
app.delete('/api/staff/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  try {
    const success = deleteStaff(id);
    if (!success) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ success: true });
  } catch (e: unknown) {
    return res.status(400).json({ error: getErrorMessage(e) });
  }
});

// お客様名一覧を取得（担当者でフィルタ可能）
app.get('/api/customer-names', (req, res) => {
  const { staffName } = req.query;

  const customerNames =
    staffName && typeof staffName === 'string'
      ? getCustomerNamesByStaff(staffName)
      : getDistinctCustomerNames();

  res.json({ customerNames });
});

// 年度一覧を取得（お客様名・担当者名でフィルタ可能）
app.get('/api/available-years', (req, res) => {
  const { customerName, staffName } = req.query;

  const years =
    customerName && staffName && typeof customerName === 'string' && typeof staffName === 'string'
      ? getYearsByCustomerAndStaff(customerName, staffName)
      : getDistinctYears();

  res.json({ years });
});

// 顧客の年度一覧を取得
app.get('/api/years', (req, res) => {
  const { customerName, staffName } = req.query;

  if (!customerName || !staffName) {
    return res.status(400).json({ error: 'customerName and staffName are required' });
  }

  const customerId = getOrCreateCustomer(customerName as string, staffName as string);
  const years = getCustomerYears(customerId);
  res.json({ years });
});

// 書類データを取得
app.get('/api/documents', (req, res) => {
  const { customerName, staffName, year } = req.query;

  if (!customerName || !staffName || !year) {
    return res.status(400).json({ error: 'customerName, staffName, and year are required' });
  }

  const documentGroups = getDocumentRecordByCustomerInfo(
    customerName as string,
    staffName as string,
    parseInt(year as string, 10)
  );

  res.json({
    documentGroups: documentGroups ?? null,
    found: documentGroups !== null,
  });
});

// 書類データを保存
app.post('/api/documents', (req, res) => {
  const { customerName, staffName, year, documentGroups, action } = req.body;

  if (!customerName || !staffName) {
    return res.status(400).json({ error: 'customerName and staffName are required' });
  }

  const customerId = getOrCreateCustomer(customerName, staffName);

  // 翌年度更新
  if (action === 'copyToNextYear') {
    if (!year) {
      return res.status(400).json({ error: 'year is required for copyToNextYear action' });
    }

    const success = copyToNextYear(customerId, year);
    if (!success) {
      return res.status(404).json({ error: '現在の年度のデータが見つかりません' });
    }

    return res.json({
      success: true,
      message: `${formatReiwaYear(year)}のデータを${formatReiwaYear(year + 1)}にコピーしました`,
      nextYear: year + 1,
    });
  }

  // 通常の保存
  if (!year || !documentGroups) {
    return res.status(400).json({ error: 'year and documentGroups are required' });
  }

  saveDocumentRecord(customerId, year, documentGroups);
  res.json({
    success: true,
    message: `${formatReiwaYear(year)}のデータを保存しました`,
  });
});

// 保存データ一覧を取得（管理画面用）
app.get('/api/records', (_req, res) => {
  const records = getAllDocumentRecords();
  res.json({ records });
});

// 書類データを削除
app.delete('/api/documents/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const success = deleteDocumentRecord(id);
  if (!success) {
    return res.status(404).json({ error: 'データが見つかりません' });
  }

  res.json({ success: true, message: 'データを削除しました' });
});

// --- バックアップ/復元 API ---

// 全データエクスポート
app.get('/api/backup/export', (_req, res) => {
  try {
    const data = getFullBackupData();
    res.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'required-documents-for-tax-return',
      type: 'full-backup',
      data,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

// バックアップから復元
app.post('/api/backup/import', (req, res) => {
  const body = req.body;

  if (!body || body.appName !== 'required-documents-for-tax-return' || body.type !== 'full-backup') {
    return res.status(400).json({ error: '無効なバックアップファイル形式です' });
  }
  if (!body.data || !Array.isArray(body.data.staff) || !Array.isArray(body.data.customers)) {
    return res.status(400).json({ error: 'バックアップデータの構造が不正です' });
  }

  try {
    const result = restoreFullBackup(body.data);
    res.json({
      success: true,
      message: `復元完了: 担当者${result.staffCount}件、お客様${result.customerCount}件、書類データ${result.recordCount}件`,
      ...result,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

// エラーハンドリングミドルウェア
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
