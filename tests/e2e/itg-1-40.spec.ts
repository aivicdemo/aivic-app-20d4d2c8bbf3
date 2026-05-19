import { test, expect } from '@playwright/test';

test.describe("工数修正画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907343735.html");
  });

  test("SCEN-285: 修正対象作業記録を選択して工数修正できる", async ({ page }) => {
    // SCEN-285
    await expect(page.locator('[data-testid="work-record-select"]')).toBeVisible();
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="total-work-time"]', '8.5');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="total-work-time"]')).toHaveValue('8.5');
  });

  test("SCEN-286: 作業開始・終了時刻を修正して保存できる", async ({ page }) => {
    // SCEN-286
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:30');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="start-time"]')).toHaveValue('09:30');
    await expect(page.locator('[data-testid="end-time"]')).toHaveValue('17:30');
  });

  test("SCEN-287: 中断時間入力で正味作業時間が正しく計算される", async ({ page }) => {
    // SCEN-287
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await expect(page.locator('[data-testid="net-work-time"]')).toContainText('7時間0分');
  });

  test("SCEN-288: 作業項目と作業内容詳細を変更できる", async ({ page }) => {
    // SCEN-288
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.selectOption('[data-testid="work-item-select"]', { index: 2 });
    await page.fill('[data-testid="work-details"]', '変更後の作業内容詳細');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="work-details"]')).toHaveValue('変更後の作業内容詳細');
  });

  test("SCEN-289: 修正理由を入力して修正を完了できる", async ({ page }) => {
    // SCEN-289
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.fill('[data-testid="correction-reason"]', '時刻記録ミスのため修正');
    await page.click('button:has-text("修正完了")');
    await expect(page.locator('[data-testid="correction-reason"]')).toHaveValue('時刻記録ミスのため修正');
  });

  test("SCEN-290: 元データ参照ボタンで修正前データを確認できる", async ({ page }) => {
    // SCEN-290
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.click('[data-testid="view-original-button"]');
    await expect(page.locator('#original-data-modal')).toBeVisible();
    await expect(page.locator('#original-data-content')).toBeVisible();
  });

  test("SCEN-291: 修正対象作業記録未選択でエラー表示", async ({ page }) => {
    // SCEN-291
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('修正対象の作業記録を選択してください');
  });

  test("SCEN-292: 作業開始時刻が終了時刻より後でエラー表示", async ({ page }) => {
    // SCEN-292
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業開始時刻は終了時刻より前の時刻を入力してください');
  });

  test("SCEN-293: 中断時間が作業時間を超過でエラー表示", async ({ page }) => {
    // SCEN-293
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="total-work-time"]', '4');
    await page.fill('[data-testid="break-time"]', '300');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('中断時間が作業時間を超過しています');
  });

  test("SCEN-294: 修正理由未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-294
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.fill('[data-testid="correction-reason"]', '');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('修正理由');
  });

  test("SCEN-295: 異常な作業時間で警告表示される", async ({ page }) => {
    // SCEN-295
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '08:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="warning-message"]')).toContainText('作業時間が異常です');
  });

  test("SCEN-296: 作業開始・終了時刻が同一時刻の境界値", async ({ page }) => {
    // SCEN-296
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '09:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業時間が0分です');
  });

  test("SCEN-297: 中断時間がゼロの境界値", async ({ page }) => {
    // SCEN-297
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="break-time"]', '0');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="break-time"]')).toHaveValue('0');
  });

  test("SCEN-298: 作業内容詳細の文字数上限", async ({ page }) => {
    // SCEN-298
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    const longText = 'a'.repeat(1001);
    await page.fill('[data-testid="work-details"]', longText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数上限');
  });

  test("SCEN-299: 修正理由の文字数上限", async ({ page }) => {
    // SCEN-299
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    const maxText = 'a'.repeat(500);
    await page.fill('[data-testid="correction-reason"]', maxText);
    const overText = maxText + 'a';
    await page.fill('[data-testid="correction-reason"]', overText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('500文字以内で入力してください');
  });

  test("SCEN-300: 24時間を跨ぐ作業時間の境界値", async ({ page }) => {
    // SCEN-300
    await page.selectOption('[data-testid="work-record-select"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '23:30');
    await page.fill('[data-testid="end-time"]', '01:30');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="net-work-time"]')).toContainText('2時間');
  });
});