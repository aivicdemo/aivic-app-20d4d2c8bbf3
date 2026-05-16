import { test, expect } from '@playwright/test';

test.describe("工数記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907226171.html");
  });

  test('SCEN-319: 工数記録確認画面の基本表示', async ({ page }) => {
    // SCEN-319
    await expect(page.locator('h1')).toContainText('工数記録確認');
    await expect(page.locator('th:has-text("作業日")')).toBeVisible();
    await expect(page.locator('th:has-text("作業内容")')).toBeVisible();
    await expect(page.locator('th:has-text("開始時刻")')).toBeVisible();
    await expect(page.locator('th:has-text("終了時刻")')).toBeVisible();
    await expect(page.locator('th:has-text("工数")')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCountGreaterThan(0);
  });

  test('SCEN-320: 作業項目一覧の正常表示', async ({ page }) => {
    // SCEN-320
    await expect(page.locator('.work-items-section')).toBeVisible();
    await expect(page.locator('tbody tr td:first-child')).toBeVisible();
    await expect(page.locator('tbody tr td:nth-child(2)')).toBeVisible();
    await expect(page.locator('tbody tr td:nth-child(5)')).toBeVisible();
  });

  test('SCEN-321: 時刻・工数の正常表示', async ({ page }) => {
    // SCEN-321
    const startTimeCell = page.locator('tbody tr:first-child td:nth-child(3)');
    const endTimeCell = page.locator('tbody tr:first-child td:nth-child(4)');
    const workHoursCell = page.locator('tbody tr:first-child td:nth-child(5)');
    
    await expect(startTimeCell).toMatch(/^\d{2}:\d{2}$/);
    await expect(endTimeCell).toMatch(/^\d{2}:\d{2}$/);
    await expect(workHoursCell).toMatch(/^\d+時間\d+分$/);
  });

  test('SCEN-322: 修正ボタンで編集画面遷移', async ({ page }) => {
    // SCEN-322
    await expect(page.locator('tbody tr')).toHaveCountGreaterThan(0);
    await page.click('tbody tr:first-child .edit-btn');
    await expect(page).toHaveURL(/edit/);
  });

  test('SCEN-323: 承認ボタンで承認完了', async ({ page }) => {
    // SCEN-323
    await expect(page.locator('tbody tr .approve-btn')).toBeVisible();
    await page.click('tbody tr:first-child .approve-btn');
    await expect(page.locator('.confirm-dialog')).toBeVisible();
    await page.click('.confirm-dialog .approve-confirm-btn');
    await expect(page.locator('.success-message')).toContainText('承認完了');
  });

  test('SCEN-324: 異常値警告アイコンの表示', async ({ page }) => {
    // SCEN-324
    const warningIcon = page.locator('tbody tr .warning-icon');
    await expect(warningIcon).toBeVisible();
    await expect(warningIcon).toHaveClass(/warning/);
  });

  test('SCEN-325: 承認済み記録の修正不可', async ({ page }) => {
    // SCEN-325
    const approvedRow = page.locator('tbody tr:has(.status-approved)');
    const editBtn = approvedRow.locator('.edit-btn');
    
    await expect(editBtn).toBeDisabled();
  });

  test('SCEN-326: 権限なしユーザーの承認不可', async ({ page }) => {
    // SCEN-326
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'normaluser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907226171.html");
    
    await page.click('tbody tr:first-child .approve-btn');
    await expect(page.locator('.error-message')).toContainText('権限不足');
  });

  test('SCEN-327: 24時間を超える異常工数の警告', async ({ page }) => {
    // SCEN-327
    const abnormalRow = page.locator('tbody tr:has-text("25時間")');
    await expect(abnormalRow.locator('.warning-icon')).toBeVisible();
    await expect(page.locator('.warning-message')).toContainText('24時間を超える');
  });

  test('SCEN-328: 終了時刻が開始時刻より早い場合の警告', async ({ page }) => {
    // SCEN-328
    await page.fill('.start-time-input', '09:00');
    await page.fill('.end-time-input', '08:30');
    await page.click('.confirm-btn');
    
    await expect(page.locator('.error-message')).toContainText('終了時刻が開始時刻より早い');
  });

  test('SCEN-329: 中断時間が実働時間を超える場合の警告', async ({ page }) => {
    // SCEN-329
    await page.fill('.start-time-input', '09:00');
    await page.fill('.end-time-input', '17:00');
    await page.fill('.break-time-input', '9');
    await page.click('.save-btn');
    
    await expect(page.locator('.warning-message')).toContainText('中断時間が実働時間を超えています');
  });

  test('SCEN-330: 作業内容詳細の文字数上限表示', async ({ page }) => {
    // SCEN-330
    const longText = 'a'.repeat(1000);
    const overLimitText = 'a'.repeat(1001);
    
    await page.fill('.work-detail-input', longText);
    await expect(page.locator('.work-detail-input')).toHaveValue(longText);
    
    await page.fill('.work-detail-input', overLimitText);
    await expect(page.locator('.char-limit-error')).toBeVisible();
  });

  test('SCEN-331: 作業項目0件の場合の表示', async ({ page }) => {
    // SCEN-331
    await page.route('**/api/work-records', route => {
      route.fulfill({ json: [] });
    });
    await page.reload();
    
    await expect(page.locator('.empty-state')).toContainText('作業項目がありません');
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });
});