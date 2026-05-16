import { test, expect } from '@playwright/test';

test.describe("工数修正画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907343735.html");
  });

  test("SCEN-285: 修正対象作業記録を選択して工数修正できる", async ({ page }) => {
    // SCEN-285
    await expect(page.locator('.work-record-list')).toBeVisible();
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="workHours"]', '8.5');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.work-hours-display')).toContainText('8.5');
  });

  test("SCEN-286: 作業開始・終了時刻を修正して保存できる", async ({ page }) => {
    // SCEN-286
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '18:00');
    await page.click('button[data-action="save"]');
    await page.click('button:has-text("OK")');
    await expect(page.locator('.updated-time')).toContainText('09:00');
    await expect(page.locator('.updated-time')).toContainText('18:00');
  });

  test("SCEN-287: 中断時間入力で正味作業時間が正しく計算される", async ({ page }) => {
    // SCEN-287
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '17:00');
    await page.fill('input[name="breakTime"]', '60');
    await expect(page.locator('.net-work-time')).toContainText('7時間0分');
  });

  test("SCEN-288: 作業項目と作業内容詳細を変更できる", async ({ page }) => {
    // SCEN-288
    await page.click('.work-record-item:first-child');
    await page.selectOption('select[name="workItem"]', 'development');
    await page.fill('textarea[name="workDetail"]', '新しい作業内容詳細');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.work-item-display')).toContainText('development');
    await expect(page.locator('.work-detail-display')).toContainText('新しい作業内容詳細');
  });

  test("SCEN-289: 修正理由を入力して修正を完了できる", async ({ page }) => {
    // SCEN-289
    await page.click('.work-record-item:first-child');
    await page.click('button:has-text("修正")');
    await page.fill('input[name="workHours"]', '7.5');
    await page.fill('textarea[name="modifyReason"]', '作業時間の見直し');
    await page.click('button:has-text("修正完了")');
    await expect(page.locator('.completion-message')).toBeVisible();
    await expect(page.locator('.work-hours-display')).toContainText('7.5');
  });

  test("SCEN-290: 元データ参照ボタンで修正前データを確認できる", async ({ page }) => {
    // SCEN-290
    await page.click('.work-record-item:first-child');
    await page.click('button:has-text("修正")');
    await page.fill('input[name="workHours"]', '6.0');
    await page.click('button:has-text("元データ参照")');
    await expect(page.locator('.original-data-modal')).toBeVisible();
    await expect(page.locator('.original-work-time')).toBeVisible();
    await expect(page.locator('.original-work-content')).toBeVisible();
  });

  test("SCEN-291: 修正対象作業記録未選択でエラー表示", async ({ page }) => {
    // SCEN-291
    await expect(page.locator('.work-record-list')).toBeVisible();
    await page.click('button:has-text("修正")');
    await expect(page.locator('.error-message')).toContainText('修正対象の作業記録を選択してください');
  });

  test("SCEN-292: 作業開始時刻が終了時刻より後でエラー表示", async ({ page }) => {
    // SCEN-292
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="startTime"]', '14:00');
    await page.fill('input[name="endTime"]', '10:00');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.error-message')).toContainText('作業開始時刻は終了時刻より前の時刻を入力してください');
  });

  test("SCEN-293: 中断時間が作業時間を超過でエラー表示", async ({ page }) => {
    // SCEN-293
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="workHours"]', '4');
    await page.fill('input[name="breakTime"]', '5');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.error-message')).toContainText('中断時間が作業時間を超過しています');
  });

  test("SCEN-294: 修正理由未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-294
    await page.click('.work-record-item:first-child');
    await page.click('button:has-text("修正")');
    await page.fill('input[name="workHours"]', '8.0');
    await page.fill('textarea[name="modifyReason"]', '');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.validation-error')).toContainText('修正理由');
  });

  test("SCEN-295: 異常な作業時間で警告表示される", async ({ page }) => {
    // SCEN-295
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '08:00');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.warning-message')).toContainText('作業時間が異常です。開始時間と終了時間を確認してください');
  });

  test("SCEN-296: 作業開始・終了時刻が同一時刻の境界値", async ({ page }) => {
    // SCEN-296
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '09:00');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.validation-error')).toContainText('作業時間が0分です。開始時刻と終了時刻を確認してください');
  });

  test("SCEN-297: 中断時間がゼロの境界値", async ({ page }) => {
    // SCEN-297
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="breakTime"]', '0');
    await page.fill('input[name="workHours"]', '8');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.break-time-display')).toContainText('0分');
  });

  test("SCEN-298: 作業内容詳細の文字数上限", async ({ page }) => {
    // SCEN-298
    await page.click('.work-record-item:first-child');
    const longText = 'a'.repeat(1001);
    await page.fill('textarea[name="workDetail"]', longText);
    await page.click('body');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test("SCEN-299: 修正理由の文字数上限", async ({ page }) => {
    // SCEN-299
    await page.click('.work-record-item:first-child');
    const maxText = 'a'.repeat(500);
    await page.fill('textarea[name="modifyReason"]', maxText);
    await expect(page.locator('.char-counter')).toContainText('500');
    await page.fill('textarea[name="modifyReason"]', maxText + 'a');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.error-message')).toContainText('修正理由は500文字以内で入力してください');
  });

  test("SCEN-300: 24時間を跨ぐ作業時間の境界値", async ({ page }) => {
    // SCEN-300
    await page.click('.work-record-item:first-child');
    await page.fill('input[name="startTime"]', '23:30');
    await page.fill('input[name="endTime"]', '01:30');
    await page.click('button[data-action="save"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.work-time-display')).toContainText('2時間');
  });
});