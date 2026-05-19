import { test, expect } from '@playwright/test';

test.describe("入力チェック機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907263518.html");
  });

  test("SCEN-157: 全項目正常入力でチェック通過", async ({ page }) => {
    // SCEN-157
    await page.fill('[data-testid="target-record-id"]', '2024/01/15');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/success/);
    await expect(page.locator('[data-testid="save-status"]')).toContainText('保存可能');
  });

  test("SCEN-158: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-158
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="required-check-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="required-check-area"]')).toContainText('必須項目');
    await expect(page.locator('[data-testid="save-status"]')).toContainText('保存不可');
  });

  test("SCEN-159: 不正な日時形式でフォーマットエラー", async ({ page }) => {
    // SCEN-159
    await page.fill('[data-testid="target-record-id"]', '2024/13/45 25:70');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="format-error-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="format-error-area"]')).toContainText('フォーマット');
  });

  test("SCEN-160: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-160
    await page.fill('[data-testid="target-record-id"]', '14:00-10:00');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="datetime-check-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="datetime-check-area"]')).toContainText('開始時刻は終了時刻より前');
  });

  test("SCEN-161: 24時間超過の作業時間で警告", async ({ page }) => {
    // SCEN-161
    await page.fill('[data-testid="target-record-id"]', '09:00-10:00(翌日)');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="worktime-warning-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="worktime-warning-area"]')).toContainText('24時間を超過');
  });

  test("SCEN-162: 同一日時の重複データで検出アラート", async ({ page }) => {
    // SCEN-162
    await page.fill('[data-testid="target-record-id"]', '2024-01-15 09:00');
    await page.click('button:has-text("入力チェック")');
    await page.fill('[data-testid="target-record-id"]', '2024-01-15 09:00');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="duplicate-alert-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="duplicate-alert-area"]')).toContainText('既に作業記録が登録');
  });

  test("SCEN-163: 異常に短い作業時間で通知表示", async ({ page }) => {
    // SCEN-163
    await page.fill('[data-testid="target-record-id"]', '09:00-09:01');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="anomaly-notification-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="anomaly-notification-area"]')).toContainText('異常に短い');
  });

  test("SCEN-164: 異常に長い作業時間で通知表示", async ({ page }) => {
    // SCEN-164
    await page.fill('[data-testid="target-record-id"]', '09:00-32:00');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="anomaly-notification-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="anomaly-notification-area"]')).toContainText('異常に長く');
  });

  test("SCEN-165: エラー詳細確認ボタンで詳細表示", async ({ page }) => {
    // SCEN-165
    await page.click('button:has-text("入力チェック")');
    await page.click('[data-testid="error-detail-button"]');
    await expect(page.locator('[data-testid="error-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-detail-content"]')).toContainText('エラー');
  });

  test("SCEN-166: 入力修正提案が適切に表示", async ({ page }) => {
    // SCEN-166
    await page.fill('[data-testid="target-record-id"]', '###invalid###');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="correction-suggestion-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="correction-suggestion-area"]')).toContainText('修正提案');
  });

  test("SCEN-167: エラー有りでステータスアイコン赤", async ({ page }) => {
    // SCEN-167
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/error/);
    await expect(page.locator('[data-testid="status-text"]')).toContainText('エラー');
  });

  test("SCEN-168: チェック通過でステータスアイコン緑", async ({ page }) => {
    // SCEN-168
    await page.fill('[data-testid="target-record-id"]', '2024-01-15');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/success/);
    await expect(page.locator('[data-testid="status-text"]')).toContainText('正常');
  });

  test("SCEN-169: エラー有りで保存不可表示", async ({ page }) => {
    // SCEN-169
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="save-status"]')).toContainText('保存不可');
    await expect(page.locator('[data-testid="save-status"]')).toHaveClass(/disabled/);
  });

  test("SCEN-170: チェック通過で保存可能表示", async ({ page }) => {
    // SCEN-170
    await page.fill('[data-testid="target-record-id"]', '2024-01-15');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="save-status"]')).toContainText('保存可能');
    await expect(page.locator('[data-testid="save-status"]')).toHaveClass(/enabled/);
  });

  test("SCEN-171: エラーログ出力ボタンでログ生成", async ({ page }) => {
    // SCEN-171
    await page.click('button:has-text("入力チェック")');
    await page.click('[data-testid="export-log-button"]');
    await expect(page.locator('.status-indicator')).toContainText('ログ出力完了');
  });

  test("SCEN-172: ガイダンスパネルが適切に表示", async ({ page }) => {
    // SCEN-172
    await page.focus('[data-testid="target-record-id"]');
    await expect(page.locator('[data-testid="guidance-panel"]')).toBeVisible();
    await page.focus('body');
    await expect(page.locator('[data-testid="guidance-panel"]')).toBeHidden();
  });

  test("SCEN-173: 最大文字数境界値で入力チェック", async ({ page }) => {
    // SCEN-173
    const maxText = 'a'.repeat(200);
    const overText = 'a'.repeat(201);
    
    await page.fill('[data-testid="target-record-id"]', maxText);
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/success/);
    
    await page.fill('[data-testid="target-record-id"]', overText);
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="format-error-area"]')).toContainText('最大文字数');
  });

  test("SCEN-174: 複数エラー同時発生で全て表示", async ({ page }) => {
    // SCEN-174
    await page.fill('[data-testid="target-record-id"]', '25:99 abc -5');
    await page.click('button:has-text("入力チェック")');
    await expect(page.locator('[data-testid="required-check-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="format-error-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="datetime-check-area"]')).toBeVisible();
    await expect(page.locator('[data-testid="worktime-warning-area"]')).toBeVisible();
  });
});