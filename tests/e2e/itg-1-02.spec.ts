import { test, expect } from '@playwright/test';

test.describe("工数記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907133295.html");
  });

  test("SCEN-014: 作業開始から終了まで正常記録", async ({ page }) => {
    // SCEN-014
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.fill('#work-memo', '設備点検作業を実施');
    await page.waitForTimeout(2000);
    await page.click('#end-btn');
    await page.click('#save-btn');
    await expect(page.locator('#today-work-history')).toContainText('設備点検作業を実施');
  });

  test("SCEN-015: 作業中断・再開が正常動作", async ({ page }) => {
    // SCEN-015
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.waitForTimeout(1000);
    await page.click('#pause-btn');
    await page.fill('#pause-reason', '緊急対応のため');
    await page.click('#confirm-pause-btn');
    await expect(page.locator('.status-indicator')).toContainText('中断中');
    await page.click('button:has-text("作業再開")');
    await expect(page.locator('.status-indicator')).toContainText('作業中');
    await page.click('#end-btn');
    await page.click('#save-btn');
  });

  test("SCEN-016: 作業メモ入力して保存", async ({ page }) => {
    // SCEN-016
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.click('#end-btn');
    await page.fill('#work-memo', '設備点検時に異常音を確認。次回要詳細調査');
    await page.click('#save-btn');
    await expect(page.locator('#today-work-history')).toContainText('設備点検時に異常音を確認。次回要詳細調査');
  });

  test("SCEN-017: 本日の作業履歴が正しく表示", async ({ page }) => {
    // SCEN-017
    await expect(page.locator('#current-datetime')).toContainText(new Date().toLocaleDateString());
    const historySection = page.locator('#today-work-history');
    await expect(historySection).toBeVisible();
    const historyRows = page.locator('#history-tbody tr');
    if (await historyRows.count() > 0) {
      await expect(historyRows.first()).toContainText(/\d{2}:\d{2}/);
    }
  });

  test("SCEN-018: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-018
    await page.click('#start-btn');
    await expect(page.locator('#error-message')).toContainText('作業項目を選択してください');
  });

  test("SCEN-019: 作業未開始で終了ボタン押下", async ({ page }) => {
    // SCEN-019
    await page.click('#end-btn');
    await expect(page.locator('#error-message')).toContainText('作業が開始されていません');
  });

  test("SCEN-020: 作業未開始で中断ボタン押下", async ({ page }) => {
    // SCEN-020
    await page.click('#pause-btn');
    await expect(page.locator('#error-message')).toContainText('作業が開始されていません');
  });

  test("SCEN-021: 中断理由未入力で中断実行", async ({ page }) => {
    // SCEN-021
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.click('#pause-btn');
    await page.click('#confirm-pause-btn');
    await expect(page.locator('#error-message')).toContainText('中断理由を入力してください');
    await expect(page.locator('.status-indicator')).toContainText('作業中');
  });

  test("SCEN-022: 未保存状態でキャンセル", async ({ page }) => {
    // SCEN-022
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.click('#end-btn');
    await page.fill('#work-memo', 'テスト作業内容');
    await page.click('#cancel-btn');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('#work-memo')).toHaveValue('');
  });

  test("SCEN-023: 作業メモ最大文字数入力", async ({ page }) => {
    // SCEN-023
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.click('#end-btn');
    const maxText = 'あ'.repeat(500);
    await page.fill('#work-memo', maxText);
    await expect(page.locator('#memo-counter')).toContainText('500');
    await page.type('#work-memo', 'い');
    await expect(page.locator('#work-memo')).toHaveValue(maxText);
    await page.click('#save-btn');
  });

  test("SCEN-024: 中断理由最大文字数入力", async ({ page }) => {
    // SCEN-024
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.click('#pause-btn');
    const maxText = 'あ'.repeat(500);
    await page.fill('#pause-reason', maxText);
    await page.click('#confirm-pause-btn');
    await expect(page.locator('.status-indicator')).toContainText('中断中');
  });

  test("SCEN-025: 24時間連続作業記録", async ({ page }) => {
    // SCEN-025
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.evaluate(() => {
      const startTime = new Date();
      startTime.setHours(0, 0, 0, 0);
      const endTime = new Date();
      endTime.setHours(23, 59, 0, 0);
      window.mockWorkTime = { start: startTime, end: endTime };
    });
    await page.click('#end-btn');
    await page.fill('#work-memo', '24時間連続作業');
    page.on('dialog', dialog => dialog.accept());
    await page.click('#save-btn');
    await expect(page.locator('#today-work-history')).toContainText('24時間連続作業');
  });

  test("SCEN-026: 日付跨ぎ作業の記録", async ({ page }) => {
    // SCEN-026
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.evaluate(() => {
      const startTime = new Date();
      startTime.setHours(23, 30, 0, 0);
      const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
      endTime.setHours(1, 30, 0, 0);
      window.mockWorkTime = { start: startTime, end: endTime };
    });
    await page.click('#end-btn');
    await page.fill('#work-memo', '機械メンテナンス');
    await page.click('#save-btn');
    await expect(page.locator('#today-work-history')).toContainText('2時間');
  });

  test("SCEN-027: 同一作業項目で複数回記録", async ({ page }) => {
    // SCEN-027
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.waitForTimeout(1000);
    await page.click('#end-btn');
    await page.click('#save-btn');
    
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await page.waitForTimeout(1000);
    await page.click('#end-btn');
    await page.click('#save-btn');
    
    const historyRows = page.locator('#history-tbody tr');
    await expect(historyRows).toHaveCountGreaterThanOrEqual(2);
  });

  test("SCEN-028: 経過時間の正確な表示更新", async ({ page }) => {
    // SCEN-028
    await page.selectOption('#work-item-select', { index: 1 });
    await page.click('#start-btn');
    await expect(page.locator('#elapsed-time')).toContainText('00:00:00');
    await page.waitForTimeout(1000);
    await expect(page.locator('#elapsed-time')).toContainText('00:00:0');
    await page.evaluate(() => document.hidden = true);
    await page.waitForTimeout(1000);
    await page.evaluate(() => document.hidden = false);
    await expect(page.locator('#elapsed-time')).toContainText('00:00:0');
    await page.click('#end-btn');
  });
});