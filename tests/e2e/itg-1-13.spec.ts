import { test, expect } from '@playwright/test';

test.describe("データ検証処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907287126.html");
  });

  test("SCEN-190: 検証対象期間選択後に検証実行できる", async ({ page }) => {
    // SCEN-190
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('検証');
  });

  test("SCEN-191: 検証進捗バーが正常に表示される", async ({ page }) => {
    // SCEN-191
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('#progress-text')).toContainText('%');
  });

  test("SCEN-192: 異常値検出結果一覧が表示される", async ({ page }) => {
    // SCEN-192
    await page.click('button:has-text("異常値検出処理")');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  test("SCEN-193: エラー種別フィルターで絞り込みできる", async ({ page }) => {
    // SCEN-193
    await page.selectOption('[data-testid="error-type-filter"]', '入力値エラー');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  test("SCEN-194: データ修正モーダルで個別修正できる", async ({ page }) => {
    // SCEN-194
    await page.click('button:has-text("修正")');
    await expect(page.locator('#correction-modal')).toBeVisible();
    await page.fill('[data-testid="edit-work-content"]', '修正後の作業内容');
    await page.click('[data-testid="save-edit"]');
    await expect(page.locator('#correction-modal')).not.toBeVisible();
  });

  test("SCEN-195: 一括承認で複数データを承認できる", async ({ page }) => {
    // SCEN-195
    await page.click('[data-testid="select-all"]');
    await page.click('[data-testid="bulk-approve"]');
    await expect(page.locator('#notification-area')).toBeVisible();
  });

  test("SCEN-196: 検証ログを出力できる", async ({ page }) => {
    // SCEN-196
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await page.waitForSelector('#notification-area', { state: 'visible' });
    await page.click('[data-testid="export-log"]');
    await expect(page.locator('#notification-area')).toBeVisible();
  });

  test("SCEN-197: 再検証を実行できる", async ({ page }) => {
    // SCEN-197
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await page.waitForSelector('#notification-area', { state: 'visible' });
    await page.click('[data-testid="re-validate"]');
    await expect(page.locator('#notification-area')).toBeVisible();
  });

  test("SCEN-198: 検証完了通知が表示される", async ({ page }) => {
    // SCEN-198
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('完了');
  });

  test("SCEN-199: 期間未選択で検証実行時エラー表示", async ({ page }) => {
    // SCEN-199
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('選択');
  });

  test("SCEN-200: 検証実行中に再度実行ボタン押下でエラー", async ({ page }) => {
    // SCEN-200
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('実行中');
  });

  test("SCEN-201: 修正データが不正な場合エラー表示", async ({ page }) => {
    // SCEN-201
    await page.click('button:has-text("修正")');
    await expect(page.locator('#correction-modal')).toBeVisible();
    await page.fill('[data-testid="edit-start-time"]', 'abc');
    await page.fill('[data-testid="edit-end-time"]', '25:00');
    await page.fill('[data-testid="edit-work-content"]', '');
    await page.click('[data-testid="save-edit"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('エラー');
  });

  test("SCEN-202: 選択なしで一括承認時エラー表示", async ({ page }) => {
    // SCEN-202
    await page.click('[data-testid="bulk-approve"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('選択');
  });

  test("SCEN-203: 検証結果なしでログ出力時エラー表示", async ({ page }) => {
    // SCEN-203
    await page.click('[data-testid="export-log"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('検証');
  });

  test("SCEN-204: 1年以上の長期間選択時の動作", async ({ page }) => {
    // SCEN-204
    await page.fill('[data-testid="start-date"]', '2022-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
  });

  test("SCEN-205: 1日のみ選択時の動作", async ({ page }) => {
    // SCEN-205
    await page.fill('[data-testid="start-date"]', '2024-01-15');
    await page.fill('[data-testid="end-date"]', '2024-01-15');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('完了');
  });

  test("SCEN-206: 大量の異常値検出時の表示", async ({ page }) => {
    // SCEN-206
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  test("SCEN-207: 異常値なし時の結果表示", async ({ page }) => {
    // SCEN-207
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-01');
    await page.click('[data-testid="execute-validation"]');
    await expect(page.locator('#notification-area')).toBeVisible();
    await expect(page.locator('#no-data-message')).toBeVisible();
  });

  test("SCEN-208: 最大文字数での修正入力", async ({ page }) => {
    // SCEN-208
    await page.click('button:has-text("修正")');
    await expect(page.locator('#correction-modal')).toBeVisible();
    const maxText = 'a'.repeat(1000);
    await page.fill('[data-testid="edit-work-content"]', maxText);
    await page.click('[data-testid="save-edit"]');
    await expect(page.locator('#correction-modal')).not.toBeVisible();
  });
});