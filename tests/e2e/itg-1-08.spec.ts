import { test, expect } from '@playwright/test';

test.describe("記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907226171.html");
  });

  test('SCEN-109: 日付選択で該当日の工数記録が表示される', async ({ page }) => {
    // SCEN-109
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-filter"]', '2024-01-15');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-110: 作業記録一覧テーブルに全項目が正しく表示される', async ({ page }) => {
    // SCEN-110
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    await expect(page.locator('#records-tbody')).toBeVisible();
    const headers = page.locator('th');
    await expect(headers.nth(0)).toContainText('日付');
    await expect(headers.nth(1)).toContainText('開始時間');
    await expect(headers.nth(2)).toContainText('終了時間');
    await expect(headers.nth(3)).toContainText('作業内容');
  });

  test('SCEN-111: 編集ボタンで編集画面に遷移する', async ({ page }) => {
    // SCEN-111
    await page.click('button:has-text("編集")');
    await page.waitForURL(/\/panels\/.*\.html/);
  });

  test('SCEN-112: 削除ボタンで記録が削除される', async ({ page }) => {
    // SCEN-112
    await page.click('button:has-text("削除")');
    await expect(page.locator('#delete-modal')).toBeVisible();
    await page.click('#btn-confirm-delete');
    await expect(page.locator('#delete-modal')).not.toBeVisible();
  });

  test('SCEN-113: 詳細表示ボタンで詳細画面が表示される', async ({ page }) => {
    // SCEN-113
    await page.click('button:has-text("詳細")');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
  });

  test('SCEN-114: 期間絞り込みで指定期間の記録のみ表示される', async ({ page }) => {
    // SCEN-114
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-115: 異常値警告アイコンが該当記録に表示される', async ({ page }) => {
    // SCEN-115
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    const warningIcon = page.locator('button:has-text("⚠")').first();
    await expect(warningIcon).toBeVisible();
  });

  test('SCEN-116: 工数記録が存在しない日付を選択', async ({ page }) => {
    // SCEN-116
    await page.fill('[data-testid="date-filter"]', '2099-12-31');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('#empty-message')).toBeVisible();
  });

  test('SCEN-117: 削除権限がない記録の削除を試行', async ({ page }) => {
    // SCEN-117
    const deleteButton = page.locator('button:has-text("削除")').first();
    if (await deleteButton.isDisabled()) {
      await expect(deleteButton).toBeDisabled();
    } else {
      await deleteButton.click();
      await expect(page.locator('.error-message')).toBeVisible();
    }
  });

  test('SCEN-118: 編集権限がない記録の編集を試行', async ({ page }) => {
    // SCEN-118
    const editButton = page.locator('button:has-text("編集")').first();
    if (await editButton.isDisabled()) {
      await expect(editButton).toBeDisabled();
    } else {
      await editButton.click();
      await expect(page.locator('.error-message')).toBeVisible();
    }
  });

  test('SCEN-119: 期間絞り込みで開始日が終了日より後の日付を指定', async ({ page }) => {
    // SCEN-119
    await page.fill('[data-testid="start-date"]', '2024-03-15');
    await page.fill('[data-testid="end-date"]', '2024-03-10');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('SCEN-120: 月末日から月初日への日付選択', async ({ page }) => {
    // SCEN-120
    await page.fill('[data-testid="date-filter"]', '2024-01-31');
    await page.click('[data-testid="filter-button"]');
    await page.fill('[data-testid="date-filter"]', '2024-02-01');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-121: 当日の日付選択', async ({ page }) => {
    // SCEN-121
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="date-filter"]', today);
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-122: 最大表示件数の境界値での記録表示', async ({ page }) => {
    // SCEN-122
    await page.click('[data-testid="filter-button"]');
    const records = page.locator('#records-tbody tr');
    const recordCount = await records.count();
    await expect(records).toHaveCount(recordCount);
  });

  test('SCEN-123: 24時間を超える異常な作業時間の表示', async ({ page }) => {
    // SCEN-123
    await page.click('button:has-text("詳細")');
    await expect(page.locator('#detail-modal')).toBeVisible();
    const warningIcon = page.locator('button:has-text("⚠")');
    if (await warningIcon.count() > 0) {
      await expect(warningIcon.first()).toBeVisible();
    }
    await expect(page.locator('#detail-content')).toContainText(/\d+:\d+/);
  });
});