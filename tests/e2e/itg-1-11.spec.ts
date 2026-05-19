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
    await page.fill('#target-record-id', '2024/01/15 09:00-17:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#status-icon')).toHaveClass(/green|success/);
    await expect(page.locator('#save-status')).toHaveText(/保存可能/);
  });

  test("SCEN-158: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-158
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#required-check-area')).toContainText('必須項目');
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-159: 不正な日時形式でフォーマットエラー", async ({ page }) => {
    // SCEN-159
    await page.fill('#target-record-id', '2024/13/45 25:70');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#format-error-area')).toContainText('フォーマット');
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-160: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-160
    await page.fill('#target-record-id', '2024/01/15 14:00-10:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#datetime-check-area')).toContainText('開始時刻は終了時刻より前');
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-161: 24時間超過の作業時間で警告", async ({ page }) => {
    // SCEN-161
    await page.fill('#target-record-id', '2024/01/15 09:00-2024/01/16 10:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#worktime-warning-area')).toContainText('24時間を超過');
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-162: 同一日時の重複データで検出アラート", async ({ page }) => {
    // SCEN-162
    await page.fill('#target-record-id', '2024/01/15 09:00-10:00');
    await page.click('button:text("チェック実行")');
    
    await page.fill('#target-record-id', '2024/01/15 09:00-11:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#duplicate-alert-area')).toContainText('既に作業記録が登録');
  });

  test("SCEN-163: 異常に短い作業時間で通知表示", async ({ page }) => {
    // SCEN-163
    await page.fill('#target-record-id', '2024/01/15 09:00-09:01');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#anomaly-notification-area')).toContainText('異常に短い作業時間');
  });

  test("SCEN-164: 異常に長い作業時間で通知表示", async ({ page }) => {
    // SCEN-164
    await page.fill('#target-record-id', '2024/01/15 09:00-32:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#anomaly-notification-area')).toContainText('異常に長く設定');
  });

  test("SCEN-165: エラー詳細確認ボタンで詳細表示", async ({ page }) => {
    // SCEN-165
    await page.click('button:text("チェック実行")');
    await page.click('#btn-error-detail');
    
    await expect(page.locator('#error-detail-modal')).toBeVisible();
    await expect(page.locator('#error-detail-content')).toContainText('エラー内容');
  });

  test("SCEN-166: 入力修正提案が適切に表示", async ({ page }) => {
    // SCEN-166
    await page.fill('#target-record-id', 'invalid-format');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#correction-suggestion-area')).toContainText('修正提案');
    await expect(page.locator('#btn-to-correction')).toBeVisible();
  });

  test("SCEN-167: エラー有りでステータスアイコン赤", async ({ page }) => {
    // SCEN-167
    await page.fill('#target-record-id', 'invalid');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#status-icon')).toHaveClass(/red|error/);
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-168: チェック通過でステータスアイコン緑", async ({ page }) => {
    // SCEN-168
    await page.fill('#target-record-id', '2024/01/15 09:00-17:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#status-icon')).toHaveClass(/green|success/);
  });

  test("SCEN-169: エラー有りで保存不可表示", async ({ page }) => {
    // SCEN-169
    await page.fill('#target-record-id', 'invalid-data');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#save-status')).toHaveText(/保存不可/);
  });

  test("SCEN-170: チェック通過で保存可能表示", async ({ page }) => {
    // SCEN-170
    await page.fill('#target-record-id', '2024/01/15 09:00-17:00');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#save-status')).toHaveText(/保存可能/);
  });

  test("SCEN-171: エラーログ出力ボタンでログ生成", async ({ page }) => {
    // SCEN-171
    await page.click('#btn-export-log');
    
    await expect(page.locator('#save-status')).toContainText('ログ');
  });

  test("SCEN-172: ガイダンスパネルが適切に表示", async ({ page }) => {
    // SCEN-172
    await page.focus('#target-record-id');
    await expect(page.locator('#guidance-panel')).toBeVisible();
    
    await page.blur('#target-record-id');
    await expect(page.locator('#guidance-panel')).toHaveClass(/hidden/);
  });

  test("SCEN-173: 最大文字数境界値で入力チェック", async ({ page }) => {
    // SCEN-173
    const maxText = 'a'.repeat(200);
    const overText = 'a'.repeat(201);
    
    await page.fill('#target-record-id', maxText);
    await page.click('button:text("チェック実行")');
    await expect(page.locator('#save-status')).toHaveText(/保存可能/);
    
    await page.fill('#target-record-id', overText);
    await page.click('button:text("チェック実行")');
    await expect(page.locator('#format-error-area')).toContainText('最大文字数');
  });

  test("SCEN-174: 複数エラー同時発生で全て表示", async ({ page }) => {
    // SCEN-174
    await page.fill('#target-record-id', 'invalid format 25:99 -5');
    await page.click('button:text("チェック実行")');
    
    await expect(page.locator('#required-check-area')).toBeVisible();
    await expect(page.locator('#format-error-area')).toBeVisible();
    await expect(page.locator('#datetime-check-area')).toBeVisible();
    await expect(page.locator('#status-icon')).toHaveClass(/red|error/);
  });
});