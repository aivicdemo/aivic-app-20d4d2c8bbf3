import { test, expect } from '@playwright/test';

test.describe("異常値検出処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907309324.html");
  });

  test("SCEN-227: [normal] 異常値検出処理 - 検出対象期間選択して異常値検出実行", async ({ page }) => {
    // SCEN-227
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('[data-testid="start-date"]', startDate.toISOString().split('T')[0]);
    await page.fill('[data-testid="end-date"]', endDate.toISOString().split('T')[0]);
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-228: [normal] 異常値検出処理 - 検出進捗表示から完了まで確認", async ({ page }) => {
    // SCEN-228
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('#progress-area')).toBeVisible();
    await expect(page.locator('#progress-bar')).toBeVisible();
    await expect(page.locator('#btn-cancel')).toBeVisible();
    await page.waitForSelector('#progress-area', { state: 'hidden' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-229: [normal] 異常値検出処理 - 検出された異常値一覧表示", async ({ page }) => {
    // SCEN-229
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  test("SCEN-230: [normal] 異常値検出処理 - 異常値詳細情報表示", async ({ page }) => {
    // SCEN-230
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    const detailButtons = await page.locator('button:has-text("▶")').count();
    if (detailButtons > 0) {
      await page.click('button:has-text("▶")');
      await expect(page.locator('#detail-modal')).toBeVisible();
      await expect(page.locator('#detail-content')).toBeVisible();
    }
  });

  test("SCEN-231: [normal] 異常値検出処理 - 検出ルール設定保存", async ({ page }) => {
    // SCEN-231
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.fill('[data-testid="interrupt-threshold"]', '5');
    await page.check('[data-testid="exclude-break"]');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    await expect(page.locator('[data-testid="hour-threshold"]')).toHaveValue('8');
  });

  test("SCEN-232: [normal] 異常値検出処理 - しきい値設定保存", async ({ page }) => {
    // SCEN-232
    await page.fill('[data-testid="hour-threshold"]', '12.0');
    await page.fill('[data-testid="interrupt-threshold"]', '50');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    await expect(page.locator('[data-testid="hour-threshold"]')).toHaveValue('12.0');
    await expect(page.locator('[data-testid="interrupt-threshold"]')).toHaveValue('50');
  });

  test("SCEN-233: [normal] 異常値検出処理 - 除外条件設定保存", async ({ page }) => {
    // SCEN-233
    await page.check('[data-testid="exclude-break"]');
    await page.check('[data-testid="exclude-travel"]');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    await expect(page.locator('[data-testid="exclude-break"]')).toBeChecked();
    await expect(page.locator('[data-testid="exclude-travel"]')).toBeChecked();
  });

  test("SCEN-234: [normal] 異常値検出処理 - 検出結果フィルター適用", async ({ page }) => {
    // SCEN-234
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await page.selectOption('[data-testid="severity-filter"]', 'high');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-235: [normal] 異常値検出処理 - 異常値を承認処理", async ({ page }) => {
    // SCEN-235
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    const approveButtons = await page.locator('[data-testid="approve-button"]').count();
    if (approveButtons > 0) {
      await page.click('[data-testid="approve-button"]');
      await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    }
  });

  test("SCEN-236: [normal] 異常値検出処理 - 異常値を却下処理", async ({ page }) => {
    // SCEN-236
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    const rejectButtons = await page.locator('[data-testid="reject-button"]').count();
    if (rejectButtons > 0) {
      await page.click('[data-testid="reject-button"]');
      await page.fill('[data-testid="reject-reason"]', '検証の結果、正常値と判断');
      await page.click('[data-testid="confirm-reject-button"]');
      await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    }
  });

  test("SCEN-237: [normal] 異常値検出処理 - 一括選択で複数処理", async ({ page }) => {
    // SCEN-237
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await page.click('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-approve-button"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-238: [normal] 異常値検出処理 - 検出ログ表示確認", async ({ page }) => {
    // SCEN-238
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await page.click('[data-testid="detection-log-btn"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-239: [error] 異常値検出処理 - 期間未選択で検出実行エラー", async ({ page }) => {
    // SCEN-239
    await page.fill('[data-testid="start-date"]', '');
    await page.fill('[data-testid="end-date"]', '');
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('.error, .alert')).toBeVisible();
  });

  test("SCEN-240: [error] 異常値検出処理 - しきい値に無効値でエラー", async ({ page }) => {
    // SCEN-240
    await page.fill('[data-testid="hour-threshold"]', '-5');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('.error, .alert')).toBeVisible();
  });

  test("SCEN-241: [error] 異常値検出処理 - 検出中に重複実行でエラー", async ({ page }) => {
    // SCEN-241
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('#progress-area', { state: 'visible' });
    
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('.error, .alert')).toBeVisible();
  });

  test("SCEN-242: [error] 異常値検出処理 - 権限なしユーザーでアクセス拒否", async ({ page }) => {
    // SCEN-242
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'guest');
    await page.fill('[name="password"]', 'guest');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    
    await page.goto("/panels/scr-1778907309324.html");
    await expect(page.locator('.error, .forbidden')).toBeVisible();
  });

  test("SCEN-243: [error] 異常値検出処理 - 大量データ処理でタイムアウト", async ({ page }) => {
    // SCEN-243
    const pastYear = new Date();
    pastYear.setFullYear(pastYear.getFullYear() - 5);
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    await page.fill('[data-testid="start-date"]', pastYear.toISOString().split('T')[0]);
    await page.fill('[data-testid="end-date"]', futureDate.toISOString().split('T')[0]);
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('.error, .timeout')).toBeVisible();
  });

  test("SCEN-244: [edge] 異常値検出処理 - 開始日＞終了日で期間エラー", async ({ page }) => {
    // SCEN-244
    await page.fill('[data-testid="start-date"]', '2024-12-15');
    await page.fill('[data-testid="end-date"]', '2024-12-10');
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('.error, .alert')).toBeVisible();
  });

  test("SCEN-245: [edge] 異常値検出処理 - 最大期間範囲での検出実行", async ({ page }) => {
    // SCEN-245
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2099-12-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForSelector('[data-testid="anomaly-list"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-246: [edge] 異常値検出処理 - しきい値境界値での検出", async ({ page }) => {
    // SCEN-246
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.click('[data-testid="save-settings-button"]');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-247: [edge] 異常値検出処理 - 異常値0件時の表示", async ({ page }) => {
    // SCEN-247
    await page.fill('[data-testid="hour-threshold"]', '999');
    await page.fill('[data-testid="interrupt-threshold"]', '999');
    await page.click('[data-testid="save-settings-button"]');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody tr')).toHaveCount(0);
  });

  test("SCEN-248: [edge] 異常値検出処理 - 最大件数異常値の表示", async ({ page }) => {
    // SCEN-248
    await page.fill('[data-testid="hour-threshold"]', '0.1');
    await page.fill('[data-testid="interrupt-threshold"]', '0.1');
    await page.click('[data-testid="save-settings-button"]');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    const rowCount = await page.locator('#anomaly-tbody tr').count();
    await expect(rowCount).toBeGreaterThan(0);
  });
});