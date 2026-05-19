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

  test("日付範囲選択で作業履歴を絞り込める", async ({ page }) => {
    // SCEN-029
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
  });

  test("作業項目ドロップダウンで絞り込める", async ({ page }) => {
    // SCEN-030
    await page.selectOption('[data-testid="work-item-filter"]', '配線工事');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    
    await page.selectOption('[data-testid="work-item-filter"]', '点検作業');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    
    await page.selectOption('[data-testid="work-item-filter"]', '');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
  });

  test("作業状況フィルターで絞り込める", async ({ page }) => {
    // SCEN-031
    await page.selectOption('[data-testid="status-filter"]', '進行中');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    
    await page.selectOption('[data-testid="status-filter"]', '完了');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    
    await page.selectOption('[data-testid="status-filter"]', '');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
  });

  test("複数フィルター組み合わせで絞り込める", async ({ page }) => {
    // SCEN-032
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="work-item-filter"]', '点検作業');
    await page.selectOption('[data-testid="worker-filter"]', '田中太郎');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
  });

  test("検索ボタンで結果更新される", async ({ page }) => {
    // SCEN-033
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="worker-filter"]', '田中太郎');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
  });

  test("リセットボタンでフィルター初期化される", async ({ page }) => {
    // SCEN-034
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="work-item-filter"]', '配線工事');
    await page.selectOption('[data-testid="status-filter"]', '進行中');
    await page.click('[data-testid="search-button"]');
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="start-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="end-date"]')).toHaveValue('');
  });

  test("作業履歴一覧が正しく表示される", async ({ page }) => {
    // SCEN-035
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    await expect(page.locator('#work-history-tbody')).toBeVisible();
  });

  test("開始日が終了日より後でエラー表示", async ({ page }) => {
    // SCEN-036
    await page.fill('[data-testid="start-date"]', '2024-12-31');
    await page.fill('[data-testid="end-date"]', '2024-01-01');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("未来日付選択でエラー表示", async ({ page }) => {
    // SCEN-037
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await page.fill('[data-testid="start-date"]', tomorrowStr);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('未来日付');
  });

  test("1年以上の期間選択でエラー表示", async ({ page }) => {
    // SCEN-038
    await page.fill('[data-testid="start-date"]', '2023-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('1年以上');
  });

  test("検索結果0件時の表示", async ({ page }) => {
    // SCEN-039
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="start-date"]', futureDateStr);
    await page.fill('[data-testid="end-date"]', futureDateStr);
    await page.selectOption('[data-testid="worker-filter"]', '存在しない作業員');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#no-results')).toBeVisible();
    await expect(page.locator('#no-results')).toContainText('該当する作業履歴が見つかりません');
  });

  test("大量データ表示時のパフォーマンス", async ({ page }) => {
    // SCEN-040
    const startTime = Date.now();
    await page.goto("/panels/scr-1778907145716.html");
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
    
    const scrollStartTime = Date.now();
    await page.locator('[data-testid="work-history-table"]').scrollIntoViewIfNeeded();
    const scrollTime = Date.now() - scrollStartTime;
    expect(scrollTime).toBeLessThan(1000);
    
    const filterStartTime = Date.now();
    await page.selectOption('[data-testid="status-filter"]', '完了');
    await page.click('[data-testid="search-button"]');
    const filterTime = Date.now() - filterStartTime;
    expect(filterTime).toBeLessThan(1000);
  });

  test("日付範囲未選択で検索実行", async ({ page }) => {
    // SCEN-041
    await page.click('[data-testid="reset-button"]');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('日付範囲を選択してください');
  });

  test("同日の開始終了日付選択", async ({ page }) => {
    // SCEN-042
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="start-date"]', today);
    await page.fill('[data-testid="end-date"]', today);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-table"]')).toBeVisible();
    await expect(page.locator('#error-message')).not.toBeVisible();
  });
});