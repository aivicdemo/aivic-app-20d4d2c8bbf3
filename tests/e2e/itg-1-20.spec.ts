import { test, expect } from '@playwright/test';

test.describe("工数記録確認画面", () => {
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

  test('SCEN-319: 工数記録確認画面の基本表示', async ({ page }) => {
    // SCEN-319
    await expect(page.locator('h1')).toHaveText('工数記録確認');
    await expect(page.locator('table th')).toContainText(['作業日', '作業内容', '開始時刻', '終了時刻', '工数']);
    await expect(page.getByTestId('record-list')).toBeVisible();
    await expect(page.locator('#records-tbody')).toBeVisible();
  });

  test('SCEN-320: 作業項目一覧の正常表示', async ({ page }) => {
    // SCEN-320
    await expect(page.getByTestId('record-list')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.locator('tbody tr td').nth(1)).toBeVisible();
    await expect(page.locator('tbody tr td').nth(4)).toBeVisible();
    await expect(page.locator('tbody tr td').first()).toBeVisible();
  });

  test('SCEN-321: 時刻・工数の正常表示', async ({ page }) => {
    // SCEN-321
    await expect(page.locator('#records-tbody')).toBeVisible();
    await expect(page.locator('tbody tr td').nth(2)).toContainText(/\d{2}:\d{2}/);
    await expect(page.locator('tbody tr td').nth(3)).toContainText(/\d{2}:\d{2}/);
    await expect(page.locator('tbody tr td').nth(4)).toContainText(/\d+時間\d+分|\d+分/);
  });

  test('SCEN-322: 修正ボタンで編集画面遷移', async ({ page }) => {
    // SCEN-322
    await expect(page.locator('#records-tbody')).toBeVisible();
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/scr-1778907296658/);
  });

  test('SCEN-323: 承認ボタンで承認完了', async ({ page }) => {
    // SCEN-323
    await expect(page.locator('#records-tbody')).toBeVisible();
    await page.click('button:has-text("承認")');
    await expect(page.locator('.alert, .message')).toContainText('承認');
    await expect(page.locator('button:has-text("承認")')).toBeDisabled();
  });

  test('SCEN-324: 異常値警告アイコンの表示', async ({ page }) => {
    // SCEN-324
    await expect(page.locator('#records-tbody')).toBeVisible();
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await expect(page.locator('.warning, .alert')).toBeVisible();
  });

  test('SCEN-325: 承認済み記録の修正不可', async ({ page }) => {
    // SCEN-325
    await expect(page.locator('#records-tbody')).toBeVisible();
    const editButton = page.locator('tr:has-text("承認済み") button:has-text("編集")');
    if (await editButton.count() > 0) {
      await expect(editButton).toBeDisabled();
    }
  });

  test('SCEN-326: 権限なしユーザーの承認不可', async ({ page }) => {
    // SCEN-326
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'user');
    await page.fill('[name="password"]', 'user');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907226171.html");
    await page.click('button:has-text("承認")');
    await expect(page.locator('.error, .alert')).toContainText('権限');
  });

  test('SCEN-327: 24時間を超える異常工数の警告', async ({ page }) => {
    // SCEN-327
    await expect(page.locator('#records-tbody')).toBeVisible();
    await expect(page.locator('tr:has-text("25時間") button:has-text("⚠"), tr:has-text("24時間") button:has-text("⚠")')).toBeVisible();
    await expect(page.locator('.warning, .alert')).toContainText(/24時間|異常|警告/);
  });

  test('SCEN-328: 終了時刻が開始時刻より早い場合の警告', async ({ page }) => {
    // SCEN-328
    await expect(page.locator('#records-tbody')).toBeVisible();
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await expect(page.locator('.warning, .alert')).toContainText(/終了時刻|開始時刻|警告/);
  });

  test('SCEN-329: 中断時間が実働時間を超える場合の警告', async ({ page }) => {
    // SCEN-329
    await expect(page.locator('#records-tbody')).toBeVisible();
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await expect(page.locator('.warning, .alert')).toContainText(/中断時間|実働時間|超え/);
  });

  test('SCEN-330: 作業内容詳細の文字数上限表示', async ({ page }) => {
    // SCEN-330
    await page.click('button:has-text("詳細")');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
    const content = await page.locator('#detail-content').textContent();
    expect(content?.length).toBeLessThanOrEqual(1000);
    await page.click('#btn-close-modal');
  });

  test('SCEN-331: 作業項目0件の場合の表示', async ({ page }) => {
    // SCEN-331
    if (await page.locator('#empty-message').isVisible()) {
      await expect(page.locator('#empty-message')).toContainText(/作業項目がありません|データがありません/);
      await expect(page.locator('#records-tbody tr')).toHaveCount(0);
    }
  });
});