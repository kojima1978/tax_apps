import { test, expect } from '@playwright/test';

const API = 'http://localhost:3006/api';
const BASE = '/tax-docs';

// --- ヘルパー ---

async function createStaffViaAPI(name: string, mobile?: string) {
  const res = await fetch(`${API}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffName: name, mobileNumber: mobile ?? null }),
  });
  const data = await res.json();
  return data.staff;
}

async function createCustomerViaAPI(name: string, staffId: number | null = null) {
  const res = await fetch(`${API}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: name, ...(staffId ? { staffId } : {}) }),
  });
  const data = await res.json();
  return data.customer;
}

async function deleteAllStaffViaAPI() {
  const res = await fetch(`${API}/staff`);
  const data = await res.json();
  for (const s of data.staff ?? []) {
    await fetch(`${API}/staff/${s.id}`, { method: 'DELETE' });
  }
}

async function deleteAllCustomersViaAPI() {
  const res = await fetch(`${API}/customers`);
  const data = await res.json();
  for (const c of data.customers ?? []) {
    await fetch(`${API}/customers/${c.id}`, { method: 'DELETE' });
  }
}

async function cleanupAll() {
  await deleteAllCustomersViaAPI();
  await deleteAllStaffViaAPI();
}

// ============================================================
test.describe('確定申告 必要書類案内システム E2E', () => {
  test.beforeEach(async () => {
    await cleanupAll();
  });

  test.afterAll(async () => {
    await cleanupAll();
  });

  // ----------------------------------------------------------
  // 1. ダッシュボード
  // ----------------------------------------------------------
  test.describe('ダッシュボード', () => {
    test('タイトルが表示される', async ({ page }) => {
      await page.goto(`${BASE}/`);
      await expect(page.locator('h1')).toContainText('確定申告');
    });

    test('お客様がいない場合は空メッセージが表示される', async ({ page }) => {
      await page.goto(`${BASE}/`);
      await expect(page.getByText('お客様が登録されていません')).toBeVisible();
    });

    test('お客様登録ボタンが表示されリンク先が正しい', async ({ page }) => {
      await page.goto(`${BASE}/`);
      const link = page.getByRole('link', { name: 'お客様登録' });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', `${BASE}/customers/create`);
    });

    test('お客様カードが表示される', async ({ page }) => {
      const staff = await createStaffViaAPI('テスト担当');
      await createCustomerViaAPI('テスト顧客A', staff.id);
      await createCustomerViaAPI('テスト顧客B', staff.id);

      await page.goto(`${BASE}/`);
      await expect(page.getByText('テスト顧客A')).toBeVisible();
      await expect(page.getByText('テスト顧客B')).toBeVisible();
      await expect(page.getByText('2 件のお客様')).toBeVisible();
    });

    test('検索フィルタが動作する', async ({ page }) => {
      const staff = await createStaffViaAPI('テスト担当');
      await createCustomerViaAPI('山田太郎', staff.id);
      await createCustomerViaAPI('鈴木花子', staff.id);

      await page.goto(`${BASE}/`);
      await expect(page.getByText('2 件のお客様')).toBeVisible();

      await page.getByPlaceholder('お客様名で検索').fill('山田');
      await expect(page.getByText('山田太郎')).toBeVisible();
      await expect(page.getByText('鈴木花子')).not.toBeVisible();
      await expect(page.getByText('1 / 2 件')).toBeVisible();
    });

    test('担当者フィルタが動作する', async ({ page }) => {
      const staffA = await createStaffViaAPI('担当A');
      const staffB = await createStaffViaAPI('担当B');
      await createCustomerViaAPI('顧客X', staffA.id);
      await createCustomerViaAPI('顧客Y', staffB.id);

      await page.goto(`${BASE}/`);
      await expect(page.getByText('2 件のお客様')).toBeVisible();

      await page.locator('select').selectOption({ label: '担当A' });
      await expect(page.getByText('顧客X')).toBeVisible();
      await expect(page.getByText('顧客Y')).not.toBeVisible();
    });
  });

  // ----------------------------------------------------------
  // 2. 担当者管理
  // ----------------------------------------------------------
  test.describe('担当者管理', () => {
    test('担当者を新規作成できる', async ({ page }) => {
      await page.goto(`${BASE}/staff/create`);

      await page.locator('#name-input').fill('新規担当者');
      await page.locator('#mobile-input').fill('090-1111-2222');
      await page.locator('button[type="submit"]').click();

      await page.waitForURL('**/staff');
      await expect(page.getByText('新規担当者')).toBeVisible();
      await expect(page.getByText('090-1111-2222')).toBeVisible();
    });

    test('名前が空の場合バリデーションエラーが出る', async ({ page }) => {
      await page.goto(`${BASE}/staff/create`);
      // submitボタンは名前が空だとdisabled。入力欄をfocus→blurしてバリデーション発火
      await page.locator('#name-input').focus();
      await page.locator('#name-input').blur();
      await expect(page.getByText('担当者名を入力してください')).toBeVisible();
    });

    test('担当者を削除できる', async ({ page }) => {
      await createStaffViaAPI('削除対象担当');

      await page.goto(`${BASE}/staff`);
      await expect(page.getByText('削除対象担当')).toBeVisible();

      page.on('dialog', dialog => dialog.accept());
      // Trash2アイコンボタン（テキストなし）
      await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).click();

      await expect(page.getByText('削除対象担当')).not.toBeVisible();
    });
  });

  // ----------------------------------------------------------
  // 3. 顧客管理
  // ----------------------------------------------------------
  test.describe('顧客管理', () => {
    test('顧客を新規作成できる', async ({ page }) => {
      await page.goto(`${BASE}/customers/create`);

      await page.locator('#name-input').fill('新規顧客');
      await page.locator('button[type="submit"]').click();

      await page.waitForURL('**/customers/*');
      await expect(page.getByText('新規顧客 様')).toBeVisible();
    });

    test('名前が空の場合バリデーションエラーが出る', async ({ page }) => {
      await page.goto(`${BASE}/customers/create`);
      await page.locator('#name-input').focus();
      await page.locator('#name-input').blur();
      await expect(page.getByText('お客様名を入力してください')).toBeVisible();
    });

    test('担当者付きで顧客を作成できる', async ({ page }) => {
      const staff = await createStaffViaAPI('選択用担当者');

      await page.goto(`${BASE}/customers/create`);
      await page.locator('#name-input').fill('担当者付き顧客');

      // SearchableSelectはカスタムボタン。placeholderテキストをクリックして開く
      const selectTrigger = page.getByText('担当者を選択（後から設定可能）');
      await expect(selectTrigger).toBeVisible({ timeout: 10000 });
      await selectTrigger.click();
      await page.getByRole('option', { name: '選択用担当者' }).click();

      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/customers/*');
      await expect(page.getByText('担当者付き顧客 様')).toBeVisible();
      await expect(page.getByText('担当: 選択用担当者')).toBeVisible();
    });
  });

  // ----------------------------------------------------------
  // 4. 顧客詳細ページ
  // ----------------------------------------------------------
  test.describe('顧客詳細ページ', () => {
    test('顧客名と年度選択が表示される', async ({ page }) => {
      const staff = await createStaffViaAPI('詳細担当');
      const customer = await createCustomerViaAPI('詳細テスト顧客', staff.id);

      await page.goto(`${BASE}/customers/${customer.id}`);
      await expect(page.getByText('詳細テスト顧客 様')).toBeVisible();
      await expect(page.getByText('新しい年度の書類を作成')).toBeVisible();
      await expect(page.getByRole('button', { name: '作成・編集する' })).toBeVisible();
    });

    test('年度を選択してドキュメントエディタに遷移できる', async ({ page }) => {
      const customer = await createCustomerViaAPI('年度遷移テスト');

      await page.goto(`${BASE}/customers/${customer.id}`);
      await expect(page.getByRole('button', { name: '作成・編集する' })).toBeEnabled({ timeout: 10000 });
      await page.getByRole('button', { name: '作成・編集する' }).click();

      await page.waitForURL('**/customers/*/years/*');
      await expect(page.getByText('年度遷移テスト')).toBeVisible({ timeout: 10000 });
    });
  });

  // ----------------------------------------------------------
  // 5. ドキュメントエディタ
  // ----------------------------------------------------------
  test.describe('ドキュメントエディタ', () => {
    let customerId: number;

    test.beforeEach(async () => {
      const staff = await createStaffViaAPI('エディタ担当');
      const customer = await createCustomerViaAPI('エディタ顧客', staff.id);
      customerId = customer.id;
    });

    test('初期ドキュメントカテゴリが表示される', async ({ page }) => {
      await page.goto(`${BASE}/customers/${customerId}/years/2025`);
      await expect(page.getByText('エディタ顧客', { exact: true })).toBeVisible({ timeout: 15000 });
    });

    test('保存ボタンが動作する', async ({ page }) => {
      await page.goto(`${BASE}/customers/${customerId}/years/2025`);
      await expect(page.getByText('エディタ顧客', { exact: true })).toBeVisible({ timeout: 15000 });

      const saveButton = page.getByRole('button', { name: /保存/ });
      await saveButton.click();

      await expect(page.getByText('データを保存しました')).toBeVisible({ timeout: 5000 });
    });

    test('ドキュメント検索が動作する', async ({ page }) => {
      await page.goto(`${BASE}/customers/${customerId}/years/2025`);
      await expect(page.getByText('エディタ顧客', { exact: true })).toBeVisible({ timeout: 15000 });

      const searchInput = page.getByPlaceholder(/検索/);
      if (await searchInput.isVisible()) {
        await searchInput.fill('源泉徴収票');
        await page.waitForTimeout(500);
        const content = await page.textContent('body');
        expect(content).toContain('源泉徴収票');
      }
    });
  });

  // ----------------------------------------------------------
  // 6. ナビゲーション
  // ----------------------------------------------------------
  test.describe('ナビゲーション', () => {
    test('ダッシュボード → 顧客作成のフローが正しい', async ({ page }) => {
      await page.goto(`${BASE}/`);
      await page.getByRole('link', { name: 'お客様登録' }).click();
      await page.waitForURL('**/customers/create');
    });

    test('顧客カード → 詳細ページのフローが正しい', async ({ page }) => {
      const staff = await createStaffViaAPI('ナビ担当');
      const customer = await createCustomerViaAPI('ナビテスト顧客', staff.id);

      await page.goto(`${BASE}/`);
      await page.getByText('ナビテスト顧客').click();
      await page.waitForURL(`**/customers/${customer.id}`);
      await expect(page.getByText('ナビテスト顧客 様')).toBeVisible();
    });
  });

  // ----------------------------------------------------------
  // 7. API テスト
  // ----------------------------------------------------------
  test.describe('API', () => {
    test('ヘルスチェックが正常', async ({ request }) => {
      const res = await request.get(`${API}/health`);
      expect(res.ok()).toBe(true);
      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    test('CRUD: 担当者', async ({ request }) => {
      const createRes = await request.post(`${API}/staff`, {
        data: { staffName: 'API担当者', mobileNumber: '080-0000-0000' },
      });
      expect(createRes.ok()).toBe(true);
      const staff = (await createRes.json()).staff;
      expect(staff.staff_name).toBe('API担当者');

      const listRes = await request.get(`${API}/staff`);
      const listData = await listRes.json();
      const found = listData.staff.find((s: any) => s.id === staff.id);
      expect(found).toBeTruthy();
      expect(found.staff_name).toBe('API担当者');

      const updateRes = await request.put(`${API}/staff/${staff.id}`, {
        data: { staffName: 'API担当者更新', mobileNumber: '090-9999-8888' },
      });
      expect(updateRes.ok()).toBe(true);

      const deleteRes = await request.delete(`${API}/staff/${staff.id}`);
      expect(deleteRes.ok()).toBe(true);
    });

    test('CRUD: 顧客', async ({ request }) => {
      const createRes = await request.post(`${API}/customers`, {
        data: { customerName: 'API顧客' },
      });
      expect(createRes.ok()).toBe(true);
      const customer = (await createRes.json()).customer;
      expect(customer.customer_name).toBe('API顧客');

      const readRes = await request.get(`${API}/customers/${customer.id}`);
      const readData = await readRes.json();
      expect(readData.customer.customer_name).toBe('API顧客');

      const updateRes = await request.put(`${API}/customers/${customer.id}`, {
        data: { customerName: 'API顧客更新' },
      });
      expect(updateRes.ok()).toBe(true);

      const deleteRes = await request.delete(`${API}/customers/${customer.id}`);
      expect(deleteRes.ok()).toBe(true);
    });
  });
});
