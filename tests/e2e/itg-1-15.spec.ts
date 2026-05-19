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

  test("SCEN-227: 検出対象期間選択して異常値検出実行", async ({ page }) => {
    // SCEN-227
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-228: 検出進捗表示から完了まで確認", async ({ page }) => {
    // SCEN-228
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('#progress-area')).toBeVisible();
    await expect(page.locator('#progress-bar')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-229: 検出された異常値一覧表示", async ({ page }) => {
    // SCEN-229
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  test("SCEN-230: 異常値詳細情報表示", async ({ page }) => {
    // SCEN-230
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await page.click('#anomaly-tbody tr:first-child');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
  });

  test("SCEN-231: 検出ルール設定保存", async ({ page }) => {
    // SCEN-231
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.fill('[data-testid="interrupt-threshold"]', '3');
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
  });

  test("SCEN-232: しきい値設定保存", async ({ page }) => {
    // SCEN-232
    await page.fill('[data-testid="hour-threshold"]', '12.0');
    await page.fill('[data-testid="interrupt-threshold"]', '0.5');
    await page.click('[data-testid="save-settings-button"]');
    await page.reload();
    await expect(page.locator('[data-testid="hour-threshold"]')).toHaveValue('12.0');
    await expect(page.locator('[data-testid="interrupt-threshold"]')).toHaveValue('0.5');
  });

  test("SCEN-233: 除外条件設定保存", async ({ page }) => {
    // SCEN-233
    await page.check('[data-testid="exclude-break"]');
    await page.check('[data-testid="exclude-travel"]');
    await page.click('[data-testid="save-settings-button"]');
    await page.reload();
    await expect(page.locator('[data-testid="exclude-break"]')).toBeChecked();
    await expect(page.locator('[data-testid="exclude-travel"]')).toBeChecked();
  });

  test("SCEN-234: 検出結果フィルター適用", async ({ page }) => {
    // SCEN-234
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await page.selectOption('[data-testid="severity-filter"]', '高');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-235: 異常値を承認処理", async ({ page }) => {
    // SCEN-235
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await page.click('#anomaly-tbody tr:first-child input[type="checkbox"]');
    await page.click('[data-testid="approve-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
  });

  test("SCEN-236: 異常値を却下処理", async ({ page }) => {
    // SCEN-236
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await page.click('#anomaly-tbody tr:first-child input[type="checkbox"]');
    await page.click('[data-testid="reject-button"]');
    await page.fill('[data-testid="reject-reason"]', 'テスト却下理由');
    await page.click('[data-testid="confirm-reject-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
  });

  test("SCEN-237: 一括選択で複数処理", async ({ page }) => {
    // SCEN-237
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await page.check('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-approve-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
  });

  test("SCEN-238: 検出ログ表示確認", async ({ page }) => {
    // SCEN-238
    await page.click('[data-testid="detection-log-btn"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-239: 期間未選択で検出実行エラー", async ({ page }) => {
    // SCEN-239
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert')).toContainText('期間');
  });

  test("SCEN-240: しきい値に無効値でエラー", async ({ page }) => {
    // SCEN-240
    await page.fill('[data-testid="hour-threshold"]', '-1');
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert')).toContainText('無効');
  });

  test("SCEN-241: 検出中に重複実行でエラー", async ({ page }) => {
    // SCEN-241
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert')).toContainText('実行中');
  });

  test("SCEN-242: 権限なしユーザーでアクセス拒否", async ({ page }) => {
    // SCEN-242
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'guest');
    await page.fill('[name="password"]', 'guest');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907309324.html");
    await expect(page.locator('.emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert')).toContainText('権限');
  });

  test("SCEN-243: 大量データ処理でタイムアウト", async ({ page }) => {
    // SCEN-243
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.selectOption('[data-testid="target-user"]', '全員');
    await page.click('[data-testid="detect-button"]');
    await page.waitForTimeout(5000);
    await expect(page.locator('.emergency-alert')).toBeVisible();
  });

  test("SCEN-244: 開始日＞終了日で期間エラー", async ({ page }) => {
    // SCEN-244
    await page.fill('[data-testid="start-date"]', '2024-12-15');
    await page.fill('[data-testid="end-date"]', '2024-12-10');
    await page.click('[data-testid="detect-button"]');
    await expect(page.locator('.emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert')).toContainText('開始日');
  });

  test("SCEN-245: 最大期間範囲での検出実行", async ({ page }) => {
    // SCEN-245
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2099-12-31');
    await page.selectOption('[data-testid="target-user"]', '全員');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible', timeout: 10000 });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-246: しきい値境界値での検出", async ({ page }) => {
    // SCEN-246
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.click('[data-testid="save-settings-button"]');
    await page.fill('[data-testid="start-date"]', '2024-12-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-247: 異常値0件時の表示", async ({ page }) => {
    // SCEN-247
    await page.fill('[data-testid="start-date"]', '2099-01-01');
    await page.fill('[data-testid="end-date"]', '2099-01-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toContainText('0件');
  });

  test("SCEN-248: 最大件数異常値の表示", async ({ page }) => {
    // SCEN-248
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    await page.waitForSelector('[data-testid="anomaly-list"]', { state: 'visible' });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    const rowCount = await page.locator('#anomaly-tbody tr').count();
    expect(rowCount).toBeGreaterThan(0);
  });
});