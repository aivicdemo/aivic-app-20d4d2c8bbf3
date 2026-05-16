import { test, expect } from '@playwright/test';

test.describe("工数記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907133295.html");
  });

  test("SCEN-014: 作業開始から終了まで正常記録", async ({ page }) => {
    // SCEN-014
    await page.click('button:has-text("開始")');
    await page.selectOption('select[name="task"]', '機械メンテナンス');
    await page.fill('textarea[name="content"]', '定期点検作業');
    await page.waitForTimeout(2000);
    await page.click('button:has-text("終了")');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-015: 作業中断・再開が正常動作", async ({ page }) => {
    // SCEN-015
    await page.selectOption('select[name="task"]', '配管作業');
    await page.fill('input[name="startTime"]', '09:00');
    await page.click('button:has-text("開始")');
    await page.click('button:has-text("中断")');
    await page.selectOption('select[name="pauseReason"]', '休憩');
    await page.click('button:has-text("中断確定")');
    await expect(page.locator('.status-paused')).toBeVisible();
    await page.click('button:has-text("再開")');
    await expect(page.locator('.status-working')).toBeVisible();
    await page.click('button:has-text("終了")');
  });

  test("SCEN-016: 作業メモ入力して保存", async ({ page }) => {
    // SCEN-016
    await page.fill('input[name="workDate"]', '2024-01-15');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '10:30');
    await page.selectOption('select[name="workContent"]', '設備点検');
    await page.fill('textarea[name="memo"]', '設備点検時に異常音を確認。次回要詳細調査');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.confirmation-screen')).toContainText('設備点検時に異常音を確認。次回要詳細調査');
  });

  test("SCEN-017: 本日の作業履歴が正しく表示", async ({ page }) => {
    // SCEN-017
    const today = new Date().toLocaleDateString('ja-JP');
    await expect(page.locator('.current-date')).toContainText(today);
    await expect(page.locator('.work-history-item')).toBeVisible();
    await expect(page.locator('.work-history-item .start-time')).toBeVisible();
    await expect(page.locator('.work-history-item .end-time')).toBeVisible();
    await expect(page.locator('.work-history-item .work-content')).toBeVisible();
    await expect(page.locator('.work-history-item .work-hours')).toBeVisible();
  });

  test("SCEN-018: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-018
    await page.click('button:has-text("開始")');
    await expect(page.locator('.error-message')).toContainText('作業項目を選択してください');
    await expect(page.locator('.status-working')).not.toBeVisible();
  });

  test("SCEN-019: 作業未開始で終了ボタン押下", async ({ page }) => {
    // SCEN-019
    await page.click('button:has-text("終了")');
    await expect(page.locator('.error-message')).toContainText('作業が開始されていません');
  });

  test("SCEN-020: 作業未開始で中断ボタン押下", async ({ page }) => {
    // SCEN-020
    await page.click('button:has-text("中断")');
    await expect(page.locator('.error-message')).toContainText('作業が開始されていません');
  });

  test("SCEN-021: 中断理由未入力で中断実行", async ({ page }) => {
    // SCEN-021
    await page.selectOption('select[name="task"]', '機械メンテナンス');
    await page.click('button:has-text("開始")');
    await page.click('button:has-text("中断")');
    await page.click('button:has-text("決定")');
    await expect(page.locator('.error-message')).toContainText('中断理由を入力してください');
    await expect(page.locator('.status-working')).toBeVisible();
  });

  test("SCEN-022: 未保存状態でキャンセル", async ({ page }) => {
    // SCEN-022
    await page.selectOption('select[name="task"]', '配管作業');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '10:30');
    await page.fill('textarea[name="content"]', '作業内容テスト');
    await page.click('button:has-text("キャンセル")');
    await page.click('button:has-text("はい")');
    await expect(page.locator('input[name="startTime"]')).toHaveValue('');
  });

  test("SCEN-023: 作業メモ最大文字数入力", async ({ page }) => {
    // SCEN-023
    await page.selectOption('select[name="task"]', '機械メンテナンス');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '10:30');
    const maxText = 'a'.repeat(500);
    await page.fill('textarea[name="memo"]', maxText);
    await expect(page.locator('.char-counter')).toContainText('500/500');
    await page.fill('textarea[name="memo"]', maxText + 'x');
    await expect(page.locator('textarea[name="memo"]')).toHaveValue(maxText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-024: 中断理由最大文字数入力", async ({ page }) => {
    // SCEN-024
    await page.selectOption('select[name="task"]', '配管作業');
    await page.click('button:has-text("開始")');
    await page.click('button:has-text("中断")');
    const maxText = 'a'.repeat(500);
    await page.fill('textarea[name="pauseReason"]', maxText);
    await page.click('button:has-text("中断確定")');
    await expect(page.locator('.status-paused')).toBeVisible();
  });

  test("SCEN-025: 24時間連続作業記録", async ({ page }) => {
    // SCEN-025
    await page.fill('input[name="startTime"]', '00:00');
    await page.fill('input[name="endTime"]', '23:59');
    await page.fill('textarea[name="content"]', '24時間連続作業');
    await page.click('button:has-text("登録")');
    await page.click('button:has-text("OK")');
    await expect(page.locator('.success-message')).toBeVisible();
    await page.goto('/panels/work-list.html');
    await expect(page.locator('.work-item')).toContainText('24時間連続作業');
  });

  test("SCEN-026: 日付跨ぎ作業の記録", async ({ page }) => {
    // SCEN-026
    await page.fill('input[name="startDateTime"]', '2024-01-15 23:30');
    await page.fill('input[name="endDateTime"]', '2024-01-16 01:30');
    await page.fill('textarea[name="content"]', '機械メンテナンス');
    await page.selectOption('select[name="project"]', 'プロジェクトA');
    await page.click('button:has-text("保存")');
    await page.goto('/panels/work-list.html');
    await expect(page.locator('.work-item .duration')).toContainText('2時間');
  });

  test("SCEN-027: 同一作業項目で複数回記録", async ({ page }) => {
    // SCEN-027
    await page.selectOption('select[name="task"]', '配管作業');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('input[name="endTime"]', '10:30');
    await page.click('button:has-text("記録")');
    await page.selectOption('select[name="task"]', '配管作業');
    await page.fill('input[name="startTime"]', '13:00');
    await page.fill('input[name="endTime"]', '15:00');
    await page.click('button:has-text("記録")');
    await expect(page.locator('.work-history-item')).toHaveCount(2);
  });

  test("SCEN-028: 経過時間の正確な表示更新", async ({ page }) => {
    // SCEN-028
    await page.clock.install();
    await page.click('button:has-text("開始")');
    await expect(page.locator('.elapsed-time')).toContainText('00:00:00');
    await page.clock.fastForward(30000);
    await expect(page.locator('.elapsed-time')).toContainText('00:00:30');
    await page.clock.fastForward(60000);
    await expect(page.locator('.elapsed-time')).toContainText('00:01:30');
    await page.clock.fastForward(30000);
    await expect(page.locator('.elapsed-time')).toContainText('00:02:00');
    await page.click('button:has-text("停止")');
  });
});