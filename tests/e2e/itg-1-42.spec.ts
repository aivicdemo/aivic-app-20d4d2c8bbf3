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

  test("SCEN-319: 工数記録確認画面の基本表示", async ({ page }) => {
    // SCEN-319
    await expect(page.locator('h2')).toContainText('工数記録確認');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    await expect(page.locator('th')).toContainText('作業日');
    await expect(page.locator('th')).toContainText('作業内容');
    await expect(page.locator('th')).toContainText('開始時刻');
    await expect(page.locator('th')).toContainText('終了時刻');
    await expect(page.locator('th')).toContainText('工数');
    await expect(page.locator('#records-tbody')).toBeVisible();
  });

  test("SCEN-320: 作業項目一覧の正常表示", async ({ page }) => {
    // SCEN-320
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    await expect(page.locator('#records-tbody tr')).toHaveCount(3);
    await expect(page.locator('#records-tbody')).toContainText('システム開発');
    await expect(page.locator('#records-tbody')).toContainText('テスト');
    await expect(page.locator('#records-tbody')).toContainText('2024-01-15');
  });

  test("SCEN-321: 時刻・工数の正常表示", async ({ page }) => {
    // SCEN-321
    await expect(page.locator('#records-tbody')).toContainText('09:00');
    await expect(page.locator('#records-tbody')).toContainText('17:00');
    await expect(page.locator('#records-tbody')).toContainText('8時間0分');
    await expect(page.locator('#records-tbody')).toContainText('4時間30分');
  });

  test("SCEN-322: 修正ボタンで編集画面遷移", async ({ page }) => {
    // SCEN-322
    await page.click('button:has-text("詳細")');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toContainText('作業記録詳細');
  });

  test("SCEN-323: 承認ボタンで承認完了", async ({ page }) => {
    // SCEN-323
    await page.click('button:has-text("承認")');
    await expect(page.locator('.modal')).toBeVisible();
    await page.click('button:has-text("承認する")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-324: 異常値警告アイコンの表示", async ({ page }) => {
    // SCEN-324
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await expect(page.locator('.warning-indicator')).toBeVisible();
  });

  test("SCEN-325: 承認済み記録の修正不可", async ({ page }) => {
    // SCEN-325
    const approvedRow = page.locator('#records-tbody tr').filter({ hasText: '承認済み' });
    await expect(approvedRow.locator('button:has-text("詳細")')).toBeDisabled();
  });

  test("SCEN-326: 権限なしユーザーの承認不可", async ({ page }) => {
    // SCEN-326
    await page.click('button:has-text("承認")');
    await expect(page.locator('.error-message')).toContainText('権限がありません');
  });

  test("SCEN-327: 24時間を超える異常工数の警告", async ({ page }) => {
    // SCEN-327
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await page.click('button:has-text("⚠")');
    await expect(page.locator('.warning-message')).toContainText('24時間を超える');
  });

  test("SCEN-328: 終了時刻が開始時刻より早い場合の警告", async ({ page }) => {
    // SCEN-328
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await page.click('button:has-text("⚠")');
    await expect(page.locator('.warning-message')).toContainText('終了時刻が開始時刻より早い');
  });

  test("SCEN-329: 中断時間が実働時間を超える場合の警告", async ({ page }) => {
    // SCEN-329
    await expect(page.locator('button:has-text("⚠")')).toBeVisible();
    await page.click('button:has-text("⚠")');
    await expect(page.locator('.warning-message')).toContainText('中断時間が実働時間を超えています');
  });

  test("SCEN-330: 作業内容詳細の文字数上限表示", async ({ page }) => {
    // SCEN-330
    await page.click('button:has-text("詳細")');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toContainText('作業内容');
    const textContent = await page.locator('#detail-content').textContent();
    expect(textContent?.length).toBeLessThanOrEqual(1000);
  });

  test("SCEN-331: 作業項目0件の場合の表示", async ({ page }) => {
    // SCEN-331
    await page.evaluate(() => {
      const tbody = document.querySelector('#records-tbody');
      if (tbody) tbody.innerHTML = '';
    });
    await expect(page.locator('#empty-message')).toBeVisible();
    await expect(page.locator('#empty-message')).toContainText('作業項目がありません');
  });
});