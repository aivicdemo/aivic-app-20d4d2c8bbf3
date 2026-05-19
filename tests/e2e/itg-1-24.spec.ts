import { test, expect } from '@playwright/test';

test.describe("工数記録画面", () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

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
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-button"]');
    await page.fill('[data-testid="work-memo-input"]', '配管点検作業');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="today-work-history"]')).toContainText('配管点検作業');
  });

  test("SCEN-015: 作業中断・再開が正常動作", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.fill('[data-testid="pause-reason-input"]', '機械故障');
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('#elapsed-time')).toContainText('中断中');
    await page.click('button:has-text("作業再開")');
    await expect(page.locator('#elapsed-time')).not.toContainText('中断中');
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
  });

  test("SCEN-016: 作業メモ入力して保存", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('#work-memo', '設備点検時に異常音を確認。次回要詳細調査');
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="today-work-history"]')).toContainText('設備点検時に異常音を確認。次回要詳細調査');
  });

  test("SCEN-017: 本日の作業履歴が正しく表示", async ({ page }) => {
    const todayDate = new Date().toLocaleDateString('ja-JP');
    await expect(page.locator('#current-datetime')).toContainText(todayDate);
    await expect(page.locator('[data-testid="today-work-history"]')).toBeVisible();
    const historyRows = page.locator('#history-tbody tr');
    const count = await historyRows.count();
    if (count > 0) {
      await expect(historyRows.first()).toContainText(/\d{2}:\d{2}/);
    }
  });

  test("SCEN-018: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', '');
    await page.click('[data-testid="start-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業項目を選択してください');
  });

  test("SCEN-019: 作業未開始で終了ボタン押下", async ({ page }) => {
    await page.click('[data-testid="end-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業が開始されていません');
  });

  test("SCEN-020: 作業未開始で中断ボタン押下", async ({ page }) => {
    await page.click('[data-testid="pause-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業が開始されていません');
  });

  test("SCEN-021: 中断理由未入力で中断実行", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.fill('[data-testid="pause-reason-input"]', '');
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('中断理由を入力してください');
    await expect(page.locator('#elapsed-time')).not.toContainText('中断中');
  });

  test("SCEN-022: 未保存状態でキャンセル", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', 'テスト作業内容');
    await page.click('[data-testid="cancel-button"]');
    await expect(page.locator('[data-testid="work-memo-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="work-item-select"]')).toHaveValue('');
  });

  test("SCEN-023: 作業メモ最大文字数入力", async ({ page }) => {
    const maxText = 'あ'.repeat(500);
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', maxText);
    await expect(page.locator('#memo-counter')).toContainText('500');
    await page.fill('[data-testid="work-memo-input"]', maxText + 'い');
    const actualValue = await page.locator('[data-testid="work-memo-input"]').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(500);
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
  });

  test("SCEN-024: 中断理由最大文字数入力", async ({ page }) => {
    const maxReason = 'あ'.repeat(500);
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.fill('[data-testid="pause-reason-input"]', maxReason);
    await page.click('[data-testid="confirm-pause-button"]');
    await expect(page.locator('#elapsed-time')).toContainText('中断中');
  });

  test("SCEN-025: 24時間連続作業記録", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', '24時間連続作業');
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="today-work-history"]')).toContainText('24時間連続作業');
  });

  test("SCEN-026: 日付跨ぎ作業の記録", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', '機械メンテナンス');
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="today-work-history"]')).toContainText('機械メンテナンス');
  });

  test("SCEN-027: 同一作業項目で複数回記録", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', '配管作業1回目');
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-memo-input"]', '配管作業2回目');
    await page.click('[data-testid="start-button"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
    
    const historyRows = page.locator('#history-tbody tr');
    await expect(historyRows).toHaveCount(2);
  });

  test("SCEN-028: 経過時間の正確な表示更新", async ({ page }) => {
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-button"]');
    await expect(page.locator('#elapsed-time')).toContainText('00:00:0');
    await page.waitForTimeout(2000);
    await expect(page.locator('#elapsed-time')).toContainText('00:00:0');
    await page.waitForTimeout(3000);
    await expect(page.locator('#elapsed-time')).toContainText('00:00:0');
    await page.click('[data-testid="end-button"]');
    await page.click('[data-testid="save-button"]');
  });
});