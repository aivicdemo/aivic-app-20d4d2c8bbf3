import { test, expect } from '@playwright/test';

test.describe("データ検証処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'admin');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907287126.html");
  });

  test("SCEN-190: 検証対象期間選択後に検証実行できる", async ({ page }) => {
    // SCEN-190
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="validation-execute"]');
    await expect(page.locator('[data-testid="validation-result"]')).toBeVisible();
  });

  test("SCEN-191: 検証進捗バーが正常に表示される", async ({ page }) => {
    // SCEN-191
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="validation-execute"]');
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await page.waitForSelector('[data-testid="progress-percentage"]');
    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('100%');
  });

  test("SCEN-192: 異常値検出結果一覧が表示される", async ({ page }) => {
    // SCEN-192
    await page.click('[data-testid="anomaly-detection"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="worker-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-datetime"]')).toBeVisible();
  });

  test("SCEN-193: エラー種別フィルターで絞り込みできる", async ({ page }) => {
    // SCEN-193
    await page.click('[data-testid="error-type-filter"]');
    await page.selectOption('[data-testid="error-type-filter"]', '入力値エラー');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="error-list"]')).toBeVisible();
  });

  test("SCEN-194: データ修正モーダルで個別修正できる", async ({ page }) => {
    // SCEN-194
    await page.click('[data-testid="edit-button"]');
    await expect(page.locator('[data-testid="edit-modal"]')).toBeVisible();
    await page.fill('[data-testid="work-time-input"]', '8');
    await page.fill('[data-testid="work-content-input"]', '修正後作業内容');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="edit-modal"]')).not.toBeVisible();
  });

  test("SCEN-195: 一括承認で複数データを承認できる", async ({ page }) => {
    // SCEN-195
    await page.check('[data-testid="checkbox-1"]');
    await page.check('[data-testid="checkbox-2"]');
    await page.click('[data-testid="bulk-approve"]');
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-approve"]');
    await expect(page.locator('[data-testid="approval-complete"]')).toBeVisible();
  });

  test("SCEN-196: 検証ログを出力できる", async ({ page }) => {
    // SCEN-196
    await page.fill('[data-testid="required-field"]', '');
    await page.click('[data-testid="save-button"]');
    await page.click('[data-testid="export-log"]');
    const download = await page.waitForEvent('download');
    expect(download.suggestedFilename()).toContain('.log');
  });

  test("SCEN-197: 再検証を実行できる", async ({ page }) => {
    // SCEN-197
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="validation-execute"]');
    await page.waitForSelector('[data-testid="validation-result"]');
    await page.click('[data-testid="re-validation"]');
    await page.click('[data-testid="confirm-ok"]');
    await expect(page.locator('[data-testid="validation-complete"]')).toBeVisible();
  });

  test("SCEN-198: 検証完了通知が表示される", async ({ page }) => {
    // SCEN-198
    await page.fill('[data-testid="work-item"]', '作業項目');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('[data-testid="data-validation"]');
    await expect(page.locator('[data-testid="validation-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-notification"]')).toContainText('データ検証が完了しました');
  });

  test("SCEN-199: 期間未選択で検証実行時エラー表示", async ({ page }) => {
    // SCEN-199
    await page.click('[data-testid="validation-execute"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('期間を選択してください');
  });

  test("SCEN-200: 検証実行中に再度実行ボタン押下でエラー", async ({ page }) => {
    // SCEN-200
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="work-time"]', '8');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('[data-testid="validation-execute"]');
    await page.click('[data-testid="validation-execute"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('検証処理が実行中です');
  });

  test("SCEN-201: 修正データが不正な場合エラー表示", async ({ page }) => {
    // SCEN-201
    await page.click('[data-testid="edit-record"]');
    await page.fill('[data-testid="work-time-field"]', '-5');
    await page.fill('[data-testid="work-date-field"]', '2023/13/45');
    await page.fill('[data-testid="work-content-field"]', '');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test("SCEN-202: 選択なしで一括承認時エラー表示", async ({ page }) => {
    // SCEN-202
    await page.click('[data-testid="bulk-approve"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('承認する項目を選択してください');
  });

  test("SCEN-203: 検証結果なしでログ出力時エラー表示", async ({ page }) => {
    // SCEN-203
    await page.click('[data-testid="export-log"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('検証結果がありません');
  });

  test("SCEN-204: 1年以上の長期間選択時の動作", async ({ page }) => {
    // SCEN-204
    await page.fill('[data-testid="start-date"]', '2022-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-01');
    await page.click('[data-testid="confirm-period"]');
    const start = Date.now();
    await page.click('[data-testid="validation-execute"]');
    await page.waitForSelector('[data-testid="validation-result"]');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(30000);
  });

  test("SCEN-205: 1日のみ選択時の動作", async ({ page }) => {
    // SCEN-205
    await page.fill('[data-testid="start-date"]', '2024-01-15');
    await expect(page.locator('[data-testid="end-date"]')).toHaveValue('2024-01-15');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.fill('[data-testid="work-hours"]', '8');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-206: 大量の異常値検出時の表示", async ({ page }) => {
    // SCEN-206
    await page.click('[data-testid="import-test-data"]');
    await page.click('[data-testid="validation-execute"]');
    await page.waitForSelector('[data-testid="anomaly-list"]');
    await expect(page.locator('[data-testid="total-count"]')).toContainText('180');
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
  });

  test("SCEN-207: 異常値なし時の結果表示", async ({ page }) => {
    // SCEN-207
    await page.fill('[data-testid="work-time"]', '8');
    await page.fill('[data-testid="work-content"]', '通常業務');
    await page.fill('[data-testid="worker-id"]', 'WORKER001');
    await page.click('[data-testid="validation-button"]');
    await expect(page.locator('[data-testid="validation-result"]')).toContainText('データに異常はありません');
  });

  test("SCEN-208: 最大文字数での修正入力", async ({ page }) => {
    // SCEN-208
    await page.click('[data-testid="edit-button"]');
    const maxText = 'a'.repeat(1000);
    await page.fill('[data-testid="work-content-input"]', maxText);
    await page.fill('[data-testid="work-time-input"]', '999999');
    await page.fill('[data-testid="remarks-input"]', maxText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});