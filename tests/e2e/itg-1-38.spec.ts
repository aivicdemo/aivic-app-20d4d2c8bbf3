import { test, expect } from '@playwright/test';

test.describe("修正入力画面", () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907319067.html");
  });

  test("SCEN-249: 修正対象記録選択して正常修正できる", async ({ page }) => {
    // SCEN-249
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="correction-reason"]', '作業内容修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-250: 作業日付を正常に変更できる", async ({ page }) => {
    // SCEN-250
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="work-date"]', '2024-02-01');
    await page.fill('[data-testid="correction-reason"]', '日付修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="work-date"]')).toHaveValue('2024-02-01');
  });

  test("SCEN-251: 作業開始終了時刻を正常に修正できる", async ({ page }) => {
    // SCEN-251
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '08:30');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.fill('[data-testid="correction-reason"]', '時刻修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-252: 作業項目を変更して修正できる", async ({ page }) => {
    // SCEN-252
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="correction-reason"]', '作業項目変更');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-253: 中断時刻と理由を修正できる", async ({ page }) => {
    // SCEN-253
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="break-time"]', '12:00');
    await page.fill('[data-testid="break-reason"]', '機械故障');
    await page.fill('[data-testid="correction-reason"]', '中断情報修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-254: 修正理由を入力して保存できる", async ({ page }) => {
    // SCEN-254
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="correction-reason"]', '作業時間の誤入力のため修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('保存完了');
  });

  test("SCEN-255: 修正前データが正しく表示される", async ({ page }) => {
    // SCEN-255
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await expect(page.locator('[data-testid="work-date"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="start-time"]')).not.toHaveValue('');
    await expect(page.locator('[data-testid="end-time"]')).not.toHaveValue('');
    await expect(page.locator('#original-data')).toBeVisible();
  });

  test("SCEN-256: 実作業時間が自動計算される", async ({ page }) => {
    // SCEN-256
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.fill('[data-testid="break-duration"]', '60');
    await expect(page.locator('[data-testid="actual-work-time"]')).toContainText('7.5');
  });

  test("SCEN-257: 修正対象記録未選択でエラー", async ({ page }) => {
    // SCEN-257
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正対象');
  });

  test("SCEN-258: 作業日付に無効な日付でエラー", async ({ page }) => {
    // SCEN-258
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="work-date"]', '2024/02/30');
    await page.fill('[data-testid="correction-reason"]', '日付修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('無効な日付');
  });

  test("SCEN-259: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-259
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '13:00');
    await page.fill('[data-testid="correction-reason"]', '時刻修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('開始時刻は終了時刻より前');
  });

  test("SCEN-260: 中断時刻が作業時間外でエラー", async ({ page }) => {
    // SCEN-260
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '23:30');
    await page.fill('[data-testid="correction-reason"]', '中断時刻修正');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('作業時間外');
  });

  test("SCEN-261: 修正理由未入力でエラー", async ({ page }) => {
    // SCEN-261
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正理由が未入力');
  });

  test("SCEN-262: 異常値警告が正しく表示される", async ({ page }) => {
    // SCEN-262
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '25:00');
    await page.fill('[data-testid="work-date"]', '2030-01-01');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#anomaly-warnings')).toBeVisible();
  });

  test("SCEN-263: 作業日付境界値で正常動作", async ({ page }) => {
    // SCEN-263
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="work-date"]', '1900-01-01');
    await page.fill('[data-testid="correction-reason"]', '境界値テスト');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
    
    await page.fill('[data-testid="work-date"]', '2099-12-31');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-264: 時刻境界値00:00と23:59で正常動作", async ({ page }) => {
    // SCEN-264
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '00:00');
    await page.fill('[data-testid="end-time"]', '23:59');
    await page.fill('[data-testid="correction-reason"]', '時刻境界値テスト');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#error-messages')).toContainText('修正完了');
  });

  test("SCEN-265: 修正理由文字数上限での動作", async ({ page }) => {
    // SCEN-265
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    const longText = 'a'.repeat(200);
    await page.fill('[data-testid="correction-reason"]', longText);
    await expect(page.locator('#reason-count')).toContainText('200');
    
    await page.fill('[data-testid="correction-reason"]', longText + 'b');
    await expect(page.locator('[data-testid="correction-reason"]')).toHaveValue(longText);
  });

  test("SCEN-266: 24時間作業での時間計算", async ({ page }) => {
    // SCEN-266
    await page.selectOption('[data-testid="target-record"]', { index: 0 });
    await page.fill('[data-testid="start-time"]', '00:00');
    await page.fill('[data-testid="end-time"]', '23:59');
    await page.fill('[data-testid="correction-reason"]', '24時間作業テスト');
    await expect(page.locator('[data-testid="actual-work-time"]')).toContainText('23時間59分');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('#anomaly-warnings')).toContainText('長時間作業');
  });

});