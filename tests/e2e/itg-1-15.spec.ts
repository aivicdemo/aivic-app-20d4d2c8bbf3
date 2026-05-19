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

  test('SCEN-227: [normal] 検出対象期間選択して異常値検出実行', async ({ page }) => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('[data-testid="start-date"]', firstDay.toISOString().split('T')[0]);
    await page.fill('[data-testid="end-date"]', lastDay.toISOString().split('T')[0]);
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-228: [normal] 検出進捗表示から完了まで確認', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('#progress-area')).toBeVisible();
    await expect(page.locator('#progress-bar')).toBeVisible();
    await expect(page.locator('#btn-cancel')).toBeVisible();
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await expect(page.locator('#progress-area')).not.toBeVisible();
  });

  test('SCEN-229: [normal] 検出された異常値一覧表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody tr')).toBeVisible();
  });

  test('SCEN-230: [normal] 異常値詳細情報表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await page.click('#anomaly-tbody tr:first-child td:last-child button:has-text("▶")');
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
  });

  test('SCEN-231: [normal] 検出ルール設定保存', async ({ page }) => {
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.fill('[data-testid="interrupt-threshold"]', '5');
    await page.check('[data-testid="exclude-break"]');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    
    await expect(page.locator('[data-testid="hour-threshold"]')).toHaveValue('8');
    await expect(page.locator('[data-testid="interrupt-threshold"]')).toHaveValue('5');
    await expect(page.locator('[data-testid="exclude-break"]')).toBeChecked();
  });

  test('SCEN-232: [normal] しきい値設定保存', async ({ page }) => {
    await page.fill('[data-testid="hour-threshold"]', '12.0');
    await page.fill('[data-testid="interrupt-threshold"]', '0.5');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    
    await expect(page.locator('[data-testid="hour-threshold"]')).toHaveValue('12.0');
    await expect(page.locator('[data-testid="interrupt-threshold"]')).toHaveValue('0.5');
  });

  test('SCEN-233: [normal] 除外条件設定保存', async ({ page }) => {
    await page.check('[data-testid="exclude-break"]');
    await page.check('[data-testid="exclude-travel"]');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.reload();
    
    await expect(page.locator('[data-testid="exclude-break"]')).toBeChecked();
    await expect(page.locator('[data-testid="exclude-travel"]')).toBeChecked();
  });

  test('SCEN-234: [normal] 検出結果フィルター適用', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await page.selectOption('[data-testid="severity-filter"]', '高');
    await page.click('[data-testid="filter-button"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    
    await page.selectOption('[data-testid="status-filter"]', '未承認');
    await page.click('[data-testid="filter-button"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-235: [normal] 異常値を承認処理', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await page.click('#anomaly-tbody tr:first-child input[type="checkbox"]');
    await page.click('[data-testid="bulk-approve-button"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-236: [normal] 異常値を却下処理', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await page.click('#anomaly-tbody tr:first-child input[type="checkbox"]');
    await page.click('[data-testid="bulk-reject-button"]');
    
    await expect(page.locator('#reject-modal')).toBeVisible();
    await page.fill('[data-testid="reject-reason"]', '入力ミスのため却下');
    await page.click('[data-testid="confirm-reject-button"]');
    
    await expect(page.locator('#reject-modal')).not.toBeVisible();
  });

  test('SCEN-237: [normal] 一括選択で複数処理', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await page.click('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-approve-button"]');
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-238: [normal] 検出ログ表示確認', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await page.click('[data-testid="detection-log-btn"]');
    
    await expect(page.locator('.table-wrap')).toBeVisible();
  });

  test('SCEN-239: [error] 期間未選択で検出実行エラー', async ({ page }) => {
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert-text')).toContainText('期間');
  });

  test('SCEN-240: [error] しきい値に無効値でエラー', async ({ page }) => {
    await page.fill('[data-testid="hour-threshold"]', '-5');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert-text')).toContainText('しきい値');
  });

  test('SCEN-241: [error] 検出中に重複実行でエラー', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert-text')).toContainText('実行中');
  });

  test('SCEN-242: [error] 権限なしユーザーでアクセス拒否', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'guest');
    await page.fill('[name="password"]', 'guest');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907309324.html");
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert-text')).toContainText('権限');
  });

  test('SCEN-243: [error] 大量データ処理でタイムアウト', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForTimeout(5000);
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
  });

  test('SCEN-244: [edge] 開始日＞終了日で期間エラー', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-12-15');
    await page.fill('[data-testid="end-date"]', '2024-12-10');
    await page.click('[data-testid="detect-button"]');
    
    await expect(page.locator('#emergency-alert')).toBeVisible();
    await expect(page.locator('.emergency-alert-text')).toContainText('開始日');
  });

  test('SCEN-245: [edge] 最大期間範囲での検出実行', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2099-12-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('#progress-area', { state: 'visible' });
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-246: [edge] しきい値境界値での検出', async ({ page }) => {
    await page.fill('[data-testid="hour-threshold"]', '8');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test('SCEN-247: [edge] 異常値0件時の表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-01');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toContainText('異常値は検出されませんでした');
  });

  test('SCEN-248: [edge] 最大件数異常値の表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="detect-button"]');
    
    await page.waitForSelector('[data-testid="anomaly-list"]', { timeout: 30000 });
    
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    const rows = await page.locator('#anomaly-tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });
});