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

  // SCEN-190
  test("[normal] データ検証処理 - 検証対象期間選択後に検証実行できる", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#btn-execute');
    await expect(page.locator('#progress-area')).toBeVisible();
  });

  // SCEN-191
  test("[normal] データ検証処理 - 検証進捗バーが正常に表示される", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#btn-execute');
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('#progress-text')).toContainText('%');
  });

  // SCEN-192
  test("[normal] データ検証処理 - 異常値検出結果一覧が表示される", async ({ page }) => {
    await page.click('button:has-text("異常値検出処理")');
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  // SCEN-193
  test("[normal] データ検証処理 - エラー種別フィルターで絞り込みできる", async ({ page }) => {
    await page.selectOption('#error-type-filter', { label: '入力値エラー' });
    await page.click('#btn-filter');
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
  });

  // SCEN-194
  test("[normal] データ検証処理 - データ修正モーダルで個別修正できる", async ({ page }) => {
    await page.click('button:has-text("修正")');
    await expect(page.locator('#correction-modal')).toBeVisible();
    await page.fill('#edit-work-content', '修正された作業内容');
    await page.click('#btn-save-edit');
    await expect(page.locator('#correction-modal')).not.toBeVisible();
  });

  // SCEN-195
  test("[normal] データ検証処理 - 一括承認で複数データを承認できる", async ({ page }) => {
    await page.check('#select-all');
    await page.click('#btn-bulk-approve');
    await page.click('button:has-text("承認")');
    await expect(page.locator('#notification-text')).toContainText('承認');
  });

  // SCEN-196
  test("[normal] データ検証処理 - 検証ログを出力できる", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#btn-execute');
    await page.waitForTimeout(2000);
    await page.click('#btn-export-log');
    await expect(page.locator('#notification-text')).toContainText('出力');
  });

  // SCEN-197
  test("[normal] データ検証処理 - 再検証を実行できる", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#btn-execute');
    await page.waitForTimeout(2000);
    await page.click('#btn-re-validate');
    await page.click('button:has-text("OK")');
    await expect(page.locator('#progress-area')).toBeVisible();
  });

  // SCEN-198
  test("[normal] データ検証処理 - 検証完了通知が表示される", async ({ page }) => {
    await page.click('button:has-text("データ検証")');
    await page.waitForTimeout(2000);
    await expect(page.locator('#notification-text')).toContainText('完了');
  });

  // SCEN-199
  test("[error] データ検証処理 - 期間未選択で検証実行時エラー表示", async ({ page }) => {
    await page.click('#btn-execute');
    await expect(page.locator('#notification-text')).toContainText('期間');
  });

  // SCEN-200
  test("[error] データ検証処理 - 検証実行中に再度実行ボタン押下でエラー", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#btn-execute');
    await page.click('#btn-execute');
    await expect(page.locator('#notification-text')).toContainText('実行中');
  });

  // SCEN-201
  test("[error] データ検証処理 - 修正データが不正な場合エラー表示", async ({ page }) => {
    await page.click('button:has-text("修正")');
    await page.fill('#edit-start-time', '-5');
    await page.fill('#edit-end-time', '25:00');
    await page.fill('#edit-work-content', '');
    await page.click('#btn-save-edit');
    await expect(page.locator('#notification-text')).toContainText('エラー');
  });

  // SCEN-202
  test("[error] データ検証処理 - 選択なしで一括承認時エラー表示", async ({ page }) => {
    await page.click('#btn-bulk-approve');
    await expect(page.locator('#notification-text')).toContainText('選択');
  });

  // SCEN-203
  test("[error] データ検証処理 - 検証結果なしでログ出力時エラー表示", async ({ page }) => {
    await page.click('#btn-export-log');
    await expect(page.locator('#notification-text')).toContainText('検証結果');
  });

  // SCEN-204
  test("[edge] データ検証処理 - 1年以上の長期間選択時の動作", async ({ page }) => {
    await page.fill('#start-date', '2022-01-01');
    await page.fill('#end-date', '2024-01-01');
    await page.click('#btn-execute');
    await expect(page.locator('#progress-area')).toBeVisible();
    await page.waitForTimeout(5000);
    await expect(page.locator('#notification-text')).toBeVisible();
  });

  // SCEN-205
  test("[edge] データ検証処理 - 1日のみ選択時の動作", async ({ page }) => {
    await page.fill('#start-date', '2024-01-15');
    await page.fill('#end-date', '2024-01-15');
    await page.click('#btn-execute');
    await expect(page.locator('#progress-area')).toBeVisible();
    await expect(page.locator('#notification-text')).toContainText('完了');
  });

  // SCEN-206
  test("[edge] データ検証処理 - 大量の異常値検出時の表示", async ({ page }) => {
    await page.click('button:has-text("異常値検出処理")');
    await page.waitForTimeout(3000);
    await expect(page.locator('#anomaly-tbody')).toBeVisible();
    const rows = page.locator('#anomaly-tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  // SCEN-207
  test("[edge] データ検証処理 - 異常値なし時の結果表示", async ({ page }) => {
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-01');
    await page.click('#btn-execute');
    await page.waitForTimeout(2000);
    await expect(page.locator('#no-data-message')).toContainText('異常はありません');
  });

  // SCEN-208
  test("[edge] データ検証処理 - 最大文字数での修正入力", async ({ page }) => {
    await page.click('button:has-text("修正")');
    const longText = 'a'.repeat(1000);
    await page.fill('#edit-work-content', longText);
    await page.fill('[data-testid="edit-start-time"]', '08:00');
    await page.fill('[data-testid="edit-end-time"]', '17:00');
    await page.click('#btn-save-edit');
    await expect(page.locator('#notification-text')).toContainText('保存');
  });
});