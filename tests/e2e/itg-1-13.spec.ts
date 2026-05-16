import { test, expect } from '@playwright/test';

test.describe("データ検証処理", () => {

test.beforeEach(async ({ page }) => {
  await page.goto("/login.html");
  await page.fill('input[name="username"]', 'test-user');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.goto("/panels/scr-1778907287126.html");
});

test('SCEN-190: 検証対象期間選択後に検証実行できる', async ({ page }) => {
  // SCEN-190
  await page.fill('#validation-start-date', '2023-01-01');
  await page.fill('#validation-end-date', '2023-01-31');
  await page.click('#execute-validation');
  await expect(page.locator('#validation-result')).toBeVisible();
});

test('SCEN-191: 検証進捗バーが正常に表示される', async ({ page }) => {
  // SCEN-191
  await page.fill('#validation-start-date', '2023-01-01');
  await page.fill('#validation-end-date', '2023-01-31');
  await page.click('#execute-validation');
  await expect(page.locator('#progress-bar')).toBeVisible();
  await expect(page.locator('#progress-percentage')).toContainText('%');
  await page.waitForSelector('#progress-percentage:has-text("100%")', { timeout: 10000 });
});

test('SCEN-192: 異常値検出結果一覧が表示される', async ({ page }) => {
  // SCEN-192
  await page.click('#detect-anomalies');
  await page.waitForSelector('#anomaly-results');
  await expect(page.locator('#anomaly-results')).toBeVisible();
  await expect(page.locator('[data-testid="worker-id"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="work-datetime"]').first()).toBeVisible();
});

test('SCEN-193: エラー種別フィルターで絞り込みできる', async ({ page }) => {
  // SCEN-193
  await expect(page.locator('#error-log-list')).toBeVisible();
  await page.click('#error-type-filter');
  await page.selectOption('#error-type-filter', '入力値エラー');
  await page.click('#apply-filter');
  await expect(page.locator('.error-item')).toHaveCount(1, { timeout: 5000 });
});

test('SCEN-194: データ修正モーダルで個別修正できる', async ({ page }) => {
  // SCEN-194
  await page.click('.edit-button');
  await expect(page.locator('#edit-modal')).toBeVisible();
  await page.fill('#work-hours', '8');
  await page.fill('#work-content', '修正された作業内容');
  await page.click('#save-button');
  await expect(page.locator('#edit-modal')).not.toBeVisible();
  await expect(page.locator('.error-status')).not.toBeVisible();
});

test('SCEN-195: 一括承認で複数データを承認できる', async ({ page }) => {
  // SCEN-195
  await expect(page.locator('#pending-approval-list')).toBeVisible();
  await page.check('input[type="checkbox"]:nth-of-type(1)');
  await page.check('input[type="checkbox"]:nth-of-type(2)');
  await page.click('#bulk-approve');
  await page.click('#confirm-approve');
  await expect(page.locator('#success-message')).toBeVisible();
});

test('SCEN-196: 検証ログを出力できる', async ({ page }) => {
  // SCEN-196
  await page.fill('#work-hours', '');
  await page.click('#save-work');
  await page.click('#export-log');
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toMatch(/validation.*\.log/);
});

test('SCEN-197: 再検証を実行できる', async ({ page }) => {
  // SCEN-197
  await page.fill('#validation-start-date', '2023-01-01');
  await page.fill('#validation-end-date', '2023-01-31');
  await page.click('#execute-validation');
  await page.waitForSelector('#validation-result');
  await page.click('#re-validate');
  await page.click('#confirm-revalidate');
  await expect(page.locator('#validation-result')).toBeVisible();
});

test('SCEN-198: 検証完了通知が表示される', async ({ page }) => {
  // SCEN-198
  await page.fill('#work-item', 'テスト作業');
  await page.fill('#start-time', '09:00');
  await page.fill('#end-time', '17:00');
  await page.click('#validate-data');
  await expect(page.locator('#completion-notice')).toContainText('データ検証が完了しました');
});

test('SCEN-199: 期間未選択で検証実行時エラー表示', async ({ page }) => {
  // SCEN-199
  await page.click('#execute-validation');
  await expect(page.locator('#error-message')).toContainText('期間');
});

test('SCEN-200: 検証実行中に再度実行ボタン押下でエラー', async ({ page }) => {
  // SCEN-200
  await page.fill('#work-date', '2023-01-01');
  await page.fill('#work-hours', '8');
  await page.click('#execute-validation');
  await page.click('#execute-validation');
  await expect(page.locator('#error-message')).toContainText('実行中');
});

test('SCEN-201: 修正データが不正な場合エラー表示', async ({ page }) => {
  // SCEN-201
  await page.click('.edit-button');
  await page.fill('#work-hours', '-5');
  await page.fill('#work-date', '2023/13/45');
  await page.fill('#work-content', '');
  await page.click('#save-button');
  await expect(page.locator('.error-message')).toBeVisible();
});

test('SCEN-202: 選択なしで一括承認時エラー表示', async ({ page }) => {
  // SCEN-202
  await expect(page.locator('#pending-approval-list')).toBeVisible();
  await page.click('#bulk-approve');
  await expect(page.locator('#error-message')).toContainText('選択してください');
});

test('SCEN-203: 検証結果なしでログ出力時エラー表示', async ({ page }) => {
  // SCEN-203
  await page.click('#export-log');
  await expect(page.locator('#error-message')).toContainText('検証結果がありません');
});

test('SCEN-204: 1年以上の長期間選択時の動作', async ({ page }) => {
  // SCEN-204
  await page.fill('#validation-start-date', '2022-01-01');
  await page.fill('#validation-end-date', '2023-12-31');
  await page.click('#confirm-period');
  const startTime = Date.now();
  await page.click('#execute-validation');
  await page.waitForSelector('#validation-result', { timeout: 30000 });
  const endTime = Date.now();
  expect(endTime - startTime).toBeLessThan(30000);
});

test('SCEN-205: 1日のみ選択時の動作', async ({ page }) => {
  // SCEN-205
  await page.fill('#start-date', '2023-01-15');
  await expect(page.locator('#end-date')).toHaveValue('2023-01-15');
  await page.fill('#work-content', 'テスト作業');
  await page.fill('#work-hours', '8');
  await page.click('#save-button');
  await expect(page.locator('#work-list')).toContainText('2023-01-15');
});

test('SCEN-206: 大量の異常値検出時の表示', async ({ page }) => {
  // SCEN-206
  await page.click('#import-test-data');
  await page.click('#execute-validation');
  await page.waitForSelector('#anomaly-count');
  await expect(page.locator('#anomaly-count')).toContainText('180');
  await expect(page.locator('#pagination')).toBeVisible();
  await expect(page.locator('.anomaly-item').first()).toBeVisible();
});

test('SCEN-207: 異常値なし時の結果表示', async ({ page }) => {
  // SCEN-207
  await page.fill('#work-hours', '8');
  await page.fill('#work-content', '通常業務');
  await page.fill('#worker-id', 'WORKER001');
  await page.click('#validate-data');
  await expect(page.locator('#validation-result')).toContainText('データに異常はありません');
});

test('SCEN-208: 最大文字数での修正入力', async ({ page }) => {
  // SCEN-208
  await page.click('.edit-button');
  const maxText = 'a'.repeat(1000);
  await page.fill('#work-content', maxText);
  await page.fill('#work-hours', '999999');
  await page.fill('#remarks', maxText);
  await page.click('#save-button');
  await expect(page.locator('#success-message')).toBeVisible();
});

});