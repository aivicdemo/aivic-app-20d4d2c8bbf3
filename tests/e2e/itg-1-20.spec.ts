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
    await expect(page).toHaveTitle(/工数記録確認/);
    await expect(page.locator('h1')).toContainText('工数記録確認');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th')).toContainText(['作業日', '作業内容', '開始時刻', '終了時刻', '工数']);
    await expect(page.locator('tbody tr')).toBeVisible();
  });

  test('SCEN-320: 作業項目一覧の正常表示', async ({ page }) => {
    // SCEN-320
    await expect(page.locator('.work-items-section')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount.greaterThan(0);
    await expect(page.locator('td:nth-child(2)')).toBeVisible();
    await expect(page.locator('td:nth-child(1)')).toBeVisible();
    await expect(page.locator('td:nth-child(5)')).toBeVisible();
  });

  test('SCEN-321: 時刻・工数の正常表示', async ({ page }) => {
    // SCEN-321
    await expect(page.locator('tbody tr')).toBeVisible();
    await expect(page.locator('td:nth-child(3)')).toHaveText(/\d{2}:\d{2}/);
    await expect(page.locator('td:nth-child(4)')).toHaveText(/\d{2}:\d{2}/);
    await expect(page.locator('td:nth-child(5)')).toHaveText(/\d+時間\d+分/);
  });

  test('SCEN-322: 修正ボタンで編集画面遷移', async ({ page }) => {
    // SCEN-322
    await expect(page.locator('tbody tr')).toBeVisible();
    await page.click('button:has-text("修正")');
    await expect(page).toHaveURL(/edit/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('SCEN-323: 承認ボタンで承認完了', async ({ page }) => {
    // SCEN-323
    await expect(page.locator('tbody tr')).toBeVisible();
    await page.click('button:has-text("承認")');
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await page.click('button:has-text("承認する")');
    await expect(page.locator('.success-message')).toContainText('承認完了');
    await expect(page.locator('button:has-text("承認")')).toBeDisabled();
  });

  test('SCEN-324: 異常値警告アイコンの表示', async ({ page }) => {
    // SCEN-324
    await page.goto("/panels/scr-1778907226171.html?anomaly=true");
    await expect(page.locator('.warning-icon')).toBeVisible();
    await expect(page.locator('.anomaly-row')).toBeVisible();
  });

  test('SCEN-325: 承認済み記録の修正不可', async ({ page }) => {
    // SCEN-325
    await page.goto("/panels/scr-1778907226171.html?approved=true");
    await expect(page.locator('button:has-text("修正")')).toBeDisabled();
    await page.click('button:has-text("修正")');
    await expect(page.locator('.error-message')).toContainText('承認済みの記録は修正できません');
  });

  test('SCEN-326: 権限なしユーザーの承認不可', async ({ page }) => {
    // SCEN-326
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'normaluser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907226171.html");
    await page.click('button:has-text("承認")');
    await expect(page.locator('.error-message')).toContainText('権限不足');
  });

  test('SCEN-327: 24時間を超える異常工数の警告', async ({ page }) => {
    // SCEN-327
    await page.goto("/panels/scr-1778907226171.html?overtime=true");
    await expect(page.locator('.warning-message')).toContainText('24時間を超える');
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
  });

  test('SCEN-328: 終了時刻が開始時刻より早い場合の警告', async ({ page }) => {
    // SCEN-328
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '08:30');
    await page.fill('input[name="workContent"]', 'テスト作業');
    await page.click('button:has-text("確認")');
    await expect(page.locator('.warning-message')).toContainText('終了時刻が開始時刻より早い');
  });

  test('SCEN-329: 中断時間が実働時間を超える場合の警告', async ({ page }) => {
    // SCEN-329
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '17:00');
    await page.fill('input[name="breakTime"]', '9');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.warning-message')).toContainText('中断時間が実働時間を超えています');
  });

  test('SCEN-330: 作業内容詳細の文字数上限表示', async ({ page }) => {
    // SCEN-330
    const longText = 'a'.repeat(1000);
    await page.fill('textarea[name="workDetail"]', longText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.work-detail')).toContainText(longText);
    
    const tooLongText = 'a'.repeat(1001);
    await page.fill('textarea[name="workDetail"]', tooLongText);
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('SCEN-331: 作業項目0件の場合の表示', async ({ page }) => {
    // SCEN-331
    await page.goto("/panels/scr-1778907226171.html?empty=true");
    await expect(page.locator('.empty-state')).toContainText('作業項目がありません');
    await expect(page.locator('tbody tr')).toHaveCount(0);
  });
});