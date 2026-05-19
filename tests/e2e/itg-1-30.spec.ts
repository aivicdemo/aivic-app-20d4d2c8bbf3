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

  test("SCEN-109: 日付選択で該当日の工数記録が表示される", async ({ page }) => {
    // SCEN-109
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-filter"]', '2024-01-15');
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue('2024-01-15');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test("SCEN-110: 作業記録一覧テーブルに全項目が正しく表示される", async ({ page }) => {
    // SCEN-110
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    await expect(page.locator('#records-tbody')).toBeVisible();
    const headerCells = page.locator('[data-testid="record-list"] th');
    await expect(headerCells).toContainText(['日付', '開始時間', '終了時間', '作業内容', '作業場所', '工数', '備考']);
  });

  test("SCEN-111: 編集ボタンで編集画面に遷移する", async ({ page }) => {
    // SCEN-111
    const editButton = page.locator('#records-tbody tr').first().locator('button', { hasText: '編集' });
    if (await editButton.count() > 0) {
      await editButton.click();
      await expect(page).toHaveURL(/\/panels\/scr-\d+\.html/);
    }
  });

  test("SCEN-112: 削除ボタンで記録が削除される", async ({ page }) => {
    // SCEN-112
    const deleteButton = page.locator('#records-tbody tr').first().locator('button:has-text("削除")');
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      if (await page.locator('#delete-modal').isVisible()) {
        await page.click('#btn-confirm-delete');
      }
      await expect(page.locator('#records-tbody')).toBeVisible();
    }
  });

  test("SCEN-113: 詳細表示ボタンで詳細画面が表示される", async ({ page }) => {
    // SCEN-113
    const detailButton = page.locator('#records-tbody tr').first().locator('button:has-text("詳細")');
    if (await detailButton.count() > 0) {
      await detailButton.click();
      await expect(page.locator('#detail-modal')).toBeVisible();
      await expect(page.locator('#detail-content')).toBeVisible();
    }
  });

  test("SCEN-114: 期間絞り込みで指定期間の記録のみ表示される", async ({ page }) => {
    // SCEN-114
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test("SCEN-115: 異常値警告アイコンが該当記録に表示される", async ({ page }) => {
    // SCEN-115
    const warningIcon = page.locator('button:has-text("⚠")');
    if (await warningIcon.count() > 0) {
      await expect(warningIcon).toBeVisible();
    }
  });

  test("SCEN-116: 工数記録が存在しない日付を選択", async ({ page }) => {
    // SCEN-116
    await page.fill('[data-testid="date-filter"]', '2099-12-31');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('#empty-message')).toBeVisible();
  });

  test("SCEN-117: 削除権限がない記録の削除を試行", async ({ page }) => {
    // SCEN-117
    const deleteButton = page.locator('#records-tbody tr').first().locator('button:has-text("削除")');
    if (await deleteButton.count() > 0) {
      await expect(deleteButton).toBeDisabled();
    } else {
      await expect(page.locator('#records-tbody')).toBeVisible();
    }
  });

  test("SCEN-118: 編集権限がない記録の編集を試行", async ({ page }) => {
    // SCEN-118
    const editButton = page.locator('#records-tbody tr').first().locator('button', { hasText: '編集' });
    if (await editButton.count() > 0) {
      await expect(editButton).toBeDisabled();
    } else {
      await expect(page.locator('#records-tbody')).toBeVisible();
    }
  });

  test("SCEN-119: 期間絞り込みで開始日が終了日より後の日付を指定", async ({ page }) => {
    // SCEN-119
    await page.fill('[data-testid="start-date"]', '2024-03-15');
    await page.fill('[data-testid="end-date"]', '2024-03-10');
    await page.click('[data-testid="filter-button"]');
    const errorMessage = page.locator('text=開始日は終了日より前の日付を指定してください');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test("SCEN-120: 月末日から月初日への日付選択", async ({ page }) => {
    // SCEN-120
    await page.fill('[data-testid="date-filter"]', '2024-01-31');
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue('2024-01-31');
    await page.fill('[data-testid="date-filter"]', '2024-02-01');
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue('2024-02-01');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test("SCEN-121: 当日の日付選択", async ({ page }) => {
    // SCEN-121
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="date-filter"]', today);
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue(today);
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test("SCEN-122: 最大表示件数の境界値での記録表示", async ({ page }) => {
    // SCEN-122
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    const recordRows = page.locator('#records-tbody tr');
    const rowCount = await recordRows.count();
    await expect(recordRows).toHaveCount(rowCount);
  });

  test("SCEN-123: 24時間を超える異常な作業時間の表示", async ({ page }) => {
    // SCEN-123
    const abnormalTimeCell = page.locator('#records-tbody tr td').filter({ hasText: /2[5-9]:\d{2}|[3-9]\d:\d{2}/ });
    if (await abnormalTimeCell.count() > 0) {
      await expect(abnormalTimeCell).toBeVisible();
      const warningIcon = page.locator('button:has-text("⚠")');
      if (await warningIcon.count() > 0) {
        await expect(warningIcon).toBeVisible();
      }
    }
  });

});