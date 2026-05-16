import { test, expect } from '@playwright/test';

test.describe("工数修正画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907343735.html");
  });

  test('SCEN-285: 修正対象作業記録を選択して工数修正できる', async ({ page }) => {
    // SCEN-285
    await expect(page.locator('.work-record-list')).toBeVisible();
    await page.click('.work-record-item:first-child');
    await page.fill('#work-hours-input', '8.5');
    await page.click('#save-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-286: 作業開始・終了時刻を修正して保存できる', async ({ page }) => {
    // SCEN-286
    await page.click('.work-record-item:first-child');
    await page.fill('#start-time-input', '09:00');
    await page.fill('#end-time-input', '18:00');
    await page.click('#save-button');
    if (await page.locator('.confirm-dialog').isVisible()) {
      await page.click('#confirm-ok');
    }
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-287: 中断時間入力で正味作業時間が正しく計算される', async ({ page }) => {
    // SCEN-287
    await page.fill('#start-time-input', '09:00');
    await page.fill('#end-time-input', '17:00');
    await page.fill('#break-time-input', '60');
    await expect(page.locator('#net-work-time')).toContainText('7時間0分');
  });

  test('SCEN-288: 作業項目と作業内容詳細を変更できる', async ({ page }) => {
    // SCEN-288
    await page.click('.work-record-item:first-child');
    await page.selectOption('#work-item-select', '設計作業');
    await page.fill('#work-detail-textarea', '修正後の作業内容詳細');
    await page.click('#save-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-289: 修正理由を入力して修正を完了できる', async ({ page }) => {
    // SCEN-289
    await page.click('.work-record-item:first-child');
    await page.fill('#work-hours-input', '7.5');
    await page.fill('#modification-reason-textarea', '時間の記録ミスのため修正');
    await page.click('#complete-modification-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-290: 元データ参照ボタンで修正前データを確認できる', async ({ page }) => {
    // SCEN-290
    await page.click('.work-record-item:first-child');
    await page.fill('#work-hours-input', '8.0');
    await page.click('#view-original-data-button');
    await expect(page.locator('.original-data-modal')).toBeVisible();
    await expect(page.locator('#original-work-hours')).toBeVisible();
  });

  test('SCEN-291: 修正対象作業記録未選択でエラー表示', async ({ page }) => {
    // SCEN-291
    await expect(page.locator('.work-record-list')).toBeVisible();
    await page.click('#modify-button');
    await expect(page.locator('.error-message')).toContainText('修正対象の作業記録を選択してください');
  });

  test('SCEN-292: 作業開始時刻が終了時刻より後でエラー表示', async ({ page }) => {
    // SCEN-292
    await page.click('.work-record-item:first-child');
    await page.fill('#start-time-input', '14:00');
    await page.fill('#end-time-input', '10:00');
    await page.click('#save-button');
    await expect(page.locator('.error-message')).toContainText('作業開始時刻は終了時刻より前の時刻を入力してください');
  });

  test('SCEN-293: 中断時間が作業時間を超過でエラー表示', async ({ page }) => {
    // SCEN-293
    await page.click('.work-record-item:first-child');
    await page.fill('#work-hours-input', '4');
    await page.fill('#break-time-input', '300');
    await page.click('#save-button');
    await expect(page.locator('.error-message')).toContainText('中断時間が作業時間を超過しています');
  });

  test('SCEN-294: 修正理由未入力でバリデーションエラー', async ({ page }) => {
    // SCEN-294
    await page.click('.work-record-item:first-child');
    await page.fill('#work-hours-input', '7.0');
    await page.fill('#modification-reason-textarea', '');
    await page.click('#save-button');
    await expect(page.locator('.validation-error')).toContainText('修正理由');
  });

  test('SCEN-295: 異常な作業時間で警告表示される', async ({ page }) => {
    // SCEN-295
    await page.click('.work-record-item:first-child');
    await page.fill('#start-time-input', '09:00');
    await page.fill('#end-time-input', '08:00');
    await page.click('#save-button');
    await expect(page.locator('.warning-message')).toContainText('作業時間が異常です');
  });

  test('SCEN-296: 作業開始・終了時刻が同一時刻の境界値', async ({ page }) => {
    // SCEN-296
    await page.fill('#start-time-input', '09:00');
    await page.fill('#end-time-input', '09:00');
    await page.click('#save-button');
    await expect(page.locator('.validation-error')).toContainText('作業時間が0分です');
  });

  test('SCEN-297: 中断時間がゼロの境界値', async ({ page }) => {
    // SCEN-297
    await page.click('.work-record-item:first-child');
    await page.fill('#break-time-input', '0');
    await page.fill('#work-hours-input', '8');
    await page.click('#save-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-298: 作業内容詳細の文字数上限', async ({ page }) => {
    // SCEN-298
    await page.click('.work-record-item:first-child');
    const longText = 'a'.repeat(1001);
    await page.fill('#work-detail-textarea', longText);
    await page.click('body');
    await page.click('#save-button');
    await expect(page.locator('.error-message')).toContainText('文字数上限');
  });

  test('SCEN-299: 修正理由の文字数上限', async ({ page }) => {
    // SCEN-299
    await page.click('.work-record-item:first-child');
    const longReason = 'a'.repeat(500);
    await page.fill('#modification-reason-textarea', longReason);
    await expect(page.locator('.character-count')).toContainText('500');
    await page.fill('#modification-reason-textarea', longReason + 'x');
    await page.click('#save-button');
    await expect(page.locator('.error-message')).toContainText('500文字以内');
  });

  test('SCEN-300: 24時間を跨ぐ作業時間の境界値', async ({ page }) => {
    // SCEN-300
    await page.click('.work-record-item:first-child');
    await page.fill('#start-time-input', '23:30');
    await page.fill('#end-time-input', '01:30');
    await page.click('#save-button');
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('#calculated-work-time')).toContainText('2時間');
  });
});