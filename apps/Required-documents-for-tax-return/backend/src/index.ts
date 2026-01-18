import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
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
  getDistinctStaffNames,
  getDistinctYears,
  getCustomerNamesByStaff,
  getYearsByCustomerAndStaff,
  getAllDocumentRecords,
  deleteDocumentRecord,
  updateCustomerInfo,
} from './db';

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());

// データベース初期化
initializeDb();

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 顧客一覧を取得
app.get('/api/customers', (_req, res) => {
  const customers = getAllCustomers();
  res.json({ customers });
});

// 顧客検索
app.get('/api/search', (req, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.json({ results: [] });
  }

  const results = searchCustomers(q.trim());
  res.json({ results });
});

// 担当者一覧を取得
app.get('/api/staff-names', (_req, res) => {
  const staffNames = getDistinctStaffNames();
  res.json({ staffNames });
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
      message: `令和${year}年のデータを令和${year + 1}年にコピーしました`,
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
    message: `令和${year}年のデータを保存しました`,
  });
});

// 保存データ一覧を取得（管理画面用）
app.get('/api/records', (_req, res) => {
  const records = getAllDocumentRecords();
  res.json({ records });
});

// 書類データを削除
app.delete('/api/documents/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const success = deleteDocumentRecord(id);
  if (!success) {
    return res.status(404).json({ error: 'データが見つかりません' });
  }

  res.json({ success: true, message: 'データを削除しました' });
});

// 顧客情報を更新
app.put('/api/customers', (req, res) => {
  const { oldCustomerName, oldStaffName, newCustomerName, newStaffName } = req.body;

  if (!oldCustomerName || !oldStaffName || !newCustomerName || !newStaffName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const success = updateCustomerInfo(oldCustomerName, oldStaffName, newCustomerName, newStaffName);
  if (!success) {
    return res.status(400).json({ error: '更新に失敗しました（重複または対象が見つかりません）' });
  }

  res.json({ success: true, message: '顧客情報を更新しました' });
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
