import { test, expect } from '@playwright/test';

test.describe("作業履歴一覧画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907145716.html");
  });

  test("SCEN-029: 日付範囲選択で作業履歴を絞り込める", async ({ page }) => {
    // SCEN-029
    await page.fill('#input-start-date', '2024-01-01');
    await page.fill('#input-end-date', '2024-01-31');
    await page.click('#btn-search');
    await page.waitForSelector('#work-history-tbody');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("SCEN-030: 作業項目ドロップダウンで絞り込める", async ({ page }) => {
    // SCEN-030
    await page.click('#select-work-item');
    await page.selectOption('#select-work-item', '配線工事');
    await page.waitForTimeout(1000);
    await expect(page.locator('#work-history-tbody')).toBeVisible();
    
    await page.selectOption('#select-work-item', '点検作業');
    await page.waitForTimeout(1000);
    await expect(page.locator('#work-history-tbody')).toBeVisible();
    
    await page.selectOption('#select-work-item', '');
  });

  test("SCEN-031: 作業状況フィルターで絞り込める", async ({ page }) => {
    // SCEN-031
    await page.selectOption('#select-status', '進行中');
    await page.click('#btn-search');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
    
    await page.selectOption('#select-status', '完了');
    await page.click('#btn-search');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
    
    await page.selectOption('#select-status', '');
    await page.click('#btn-search');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("SCEN-032: 複数フィルター組み合わせで絞り込める", async ({ page }) => {
    // SCEN-032
    await page.fill('#input-start-date', '2024-01-01');
    await page.fill('#input-end-date', '2024-01-31');
    await page.selectOption('#select-work-item', '点検作業');
    await page.selectOption('#select-worker', '田中太郎');
    await page.click('#btn-search');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("SCEN-033: 検索ボタンで結果更新される", async ({ page }) => {
    // SCEN-033
    await page.fill('#input-start-date', '2024-01-01');
    await page.fill('#input-end-date', '2024-01-31');
    await page.click('#btn-search');
    await page.waitForSelector('#work-history-tbody');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("SCEN-034: リセットボタンでフィルター初期化される", async ({ page }) => {
    // SCEN-034
    await page.fill('#input-start-date', '2024-01-01');
    await page.fill('#input-end-date', '2024-01-31');
    await page.selectOption('#select-work-item', '点検作業');
    await page.selectOption('#select-status', '進行中');
    await page.click('#btn-search');
    
    await page.click('#btn-reset');
    await expect(page.locator('#input-start-date')).toHaveValue('');
    await expect(page.locator('#input-end-date')).toHaveValue('');
    await expect(page.locator('#select-work-item')).toHaveValue('');
    await expect(page.locator('#select-status')).toHaveValue('');
  });

  test("SCEN-035: 作業履歴一覧が正しく表示される", async ({ page }) => {
    // SCEN-035
    await expect(page.locator('#work-history-table')).toBeVisible();
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("SCEN-036: 開始日が終了日より後でエラー表示", async ({ page }) => {
    // SCEN-036
    await page.fill('#input-start-date', '2024-12-31');
    await page.fill('#input-end-date', '2024-01-01');
    await page.click('#btn-search');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("SCEN-037: 未来日付選択でエラー表示", async ({ page }) => {
    // SCEN-037
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await page.fill('#input-start-date', tomorrowStr);
    await page.click('#btn-search');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-038: 1年以上の期間選択でエラー表示", async ({ page }) => {
    // SCEN-038
    await page.fill('#input-start-date', '2023-01-01');
    await page.fill('#input-end-date', '2024-12-31');
    await page.click('#btn-search');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('1年以上');
  });

  test("SCEN-039: 検索結果0件時の表示", async ({ page }) => {
    // SCEN-039
    await page.fill('#input-start-date', '2030-01-01');
    await page.fill('#input-end-date', '2030-01-31');
    await page.click('#btn-search');
    await expect(page.locator('#no-results')).toBeVisible();
    await expect(page.locator('#no-results')).toContainText('該当する作業履歴が見つかりません');
  });

  test("SCEN-040: 大量データ表示時のパフォーマンス", async ({ page }) => {
    // SCEN-040
    const startTime = Date.now();
    await page.goto("/panels/scr-1778907145716.html");
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
    
    const scrollStartTime = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(1000);
  });

  test("SCEN-041: 日付範囲未選択で検索実行", async ({ page }) => {
    // SCEN-041
    await page.click('#btn-search');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('日付範囲を選択してください');
  });

  test("SCEN-042: 同日の開始終了日付選択", async ({ page }) => {
    // SCEN-042
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#input-start-date', today);
    await page.fill('#input-end-date', today);
    await page.click('#btn-search');
    await expect(page.locator('#work-history-tbody')).toBeVisible();
    await expect(page.locator('#error-message')).not.toBeVisible();
  });
});