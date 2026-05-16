import { test, expect } from '@playwright/test';

test.describe("工数記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907133295.html");
  });

  test("SCEN-014: 作業開始から終了まで正常記録", async ({ page }) => {
    // SCEN-014
    await page.click('[data-testid="start-work-button"]');
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.fill('[data-testid="work-content-input"]', '機械点検作業');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="end-work-button"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="work-record-list"]')).toContainText('機械点検作業');
  });

  test("SCEN-015: 作業中断・再開が正常動作", async ({ page }) => {
    // SCEN-015
    await page.selectOption('[data-testid="work-item-select"]', 'inspection');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.selectOption('[data-testid="pause-reason-select"]', 'break');
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('[data-testid="work-status"]')).toContainText('中断中');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('[data-testid="work-status"]')).toContainText('作業中');
    await page.click('[data-testid="end-work-button"]');
  });

  test("SCEN-016: 作業メモ入力して保存", async ({ page }) => {
    // SCEN-016
    await page.fill('[data-testid="work-date-input"]', '2024-01-15');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:30');
    await page.selectOption('[data-testid="work-content-select"]', 'equipment-check');
    await page.fill('[data-testid="work-memo-textarea"]', '設備点検時に異常音を確認。次回要詳細調査');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="confirmation-screen"]')).toContainText('設備点検時に異常音を確認。次回要詳細調査');
  });

  test("SCEN-017: 本日の作業履歴が正しく表示", async ({ page }) => {
    // SCEN-017
    const today = new Date().toLocaleDateString('ja-JP');
    await expect(page.locator('[data-testid="current-date"]')).toContainText(today);
    const historyItems = page.locator('[data-testid="work-history-item"]');
    await expect(historyItems.first()).toBeVisible();
    await expect(historyItems.first().locator('[data-testid="start-time"]')).toBeVisible();
    await expect(historyItems.first().locator('[data-testid="end-time"]')).toBeVisible();
    await expect(historyItems.first().locator('[data-testid="work-content"]')).toBeVisible();
    await expect(historyItems.first().locator('[data-testid="work-hours"]')).toBeVisible();
  });

  test("SCEN-018: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-018
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業項目を選択してください');
  });

  test("SCEN-019: 作業未開始で終了ボタン押下", async ({ page }) => {
    // SCEN-019
    await page.click('[data-testid="end-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業が開始されていません');
  });

  test("SCEN-020: 作業未開始で中断ボタン押下", async ({ page }) => {
    // SCEN-020
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業が開始されていません');
  });

  test("SCEN-021: 中断理由未入力で中断実行", async ({ page }) => {
    // SCEN-021
    await page.click('[data-testid="start-work-button"]');
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.click('[data-testid="pause-button"]');
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('中断理由を入力してください');
    await expect(page.locator('[data-testid="work-status"]')).toContainText('作業中');
  });

  test("SCEN-022: 未保存状態でキャンセル", async ({ page }) => {
    // SCEN-022
    await page.selectOption('[data-testid="work-item-select"]', 'inspection');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:30');
    await page.fill('[data-testid="work-content-textarea"]', 'テスト作業内容');
    await page.click('[data-testid="cancel-button"]');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('[data-testid="work-item-select"]')).toHaveValue('');
  });

  test("SCEN-023: 作業メモ最大文字数入力", async ({ page }) => {
    // SCEN-023
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:30');
    const maxText = 'あ'.repeat(500);
    await page.fill('[data-testid="work-memo-textarea"]', maxText);
    await expect(page.locator('[data-testid="char-counter"]')).toContainText('500');
    await page.fill('[data-testid="work-memo-textarea"]', maxText + 'い');
    await expect(page.locator('[data-testid="work-memo-textarea"]')).toHaveValue(maxText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-024: 中断理由最大文字数入力", async ({ page }) => {
    // SCEN-024
    await page.selectOption('[data-testid="work-item-select"]', 'inspection');
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="pause-button"]');
    const maxText = 'あ'.repeat(500);
    await page.fill('[data-testid="pause-reason-input"]', maxText);
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('[data-testid="work-status"]')).toContainText('中断中');
  });

  test("SCEN-025: 24時間連続作業記録", async ({ page }) => {
    // SCEN-025
    await page.fill('[data-testid="start-time-input"]', '00:00');
    await page.fill('[data-testid="end-time-input"]', '23:59');
    await page.fill('[data-testid="work-content-textarea"]', '24時間連続作業');
    await page.click('[data-testid="register-button"]');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-history-list"]')).toContainText('24時間連続作業');
  });

  test("SCEN-026: 日付跨ぎ作業の記録", async ({ page }) => {
    // SCEN-026
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    await page.fill('[data-testid="start-datetime-input"]', today.toISOString().slice(0, 16));
    await page.fill('[data-testid="end-datetime-input"]', tomorrow.toISOString().slice(0, 16));
    await page.fill('[data-testid="work-content-input"]', '機械メンテナンス');
    await page.selectOption('[data-testid="project-select"]', 'project-a');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="work-hours"]')).toContainText('2時間');
  });

  test("SCEN-027: 同一作業項目で複数回記録", async ({ page }) => {
    // SCEN-027
    await page.selectOption('[data-testid="work-item-select"]', '配管作業');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:30');
    await page.click('[data-testid="record-button"]');
    await page.selectOption('[data-testid="work-item-select"]', '配管作業');
    await page.fill('[data-testid="start-time-input"]', '13:00');
    await page.fill('[data-testid="end-time-input"]', '15:00');
    await page.click('[data-testid="record-button"]');
    const records = page.locator('[data-testid="work-record-item"]');
    await expect(records).toHaveCount(2);
    await expect(records.nth(0)).toContainText('配管作業');
    await expect(records.nth(1)).toContainText('配管作業');
  });

  test("SCEN-028: 経過時間の正確な表示更新", async ({ page }) => {
    // SCEN-028
    await page.clock.install({ time: new Date('2024-01-01T09:00:00') });
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="elapsed-time"]')).toContainText('00:00:00');
    await page.clock.fastForward('00:00:30');
    await expect(page.locator('[data-testid="elapsed-time"]')).toContainText('00:00:30');
    await page.clock.fastForward('00:01:00');
    await expect(page.locator('[data-testid="elapsed-time"]')).toContainText('00:01:30');
    await page.clock.fastForward('00:00:30');
    await page.click('[data-testid="stop-work-button"]');
    await expect(page.locator('[data-testid="elapsed-time"]')).toContainText('00:02:00');
  });
});