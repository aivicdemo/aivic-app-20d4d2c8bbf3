import { test, expect } from '@playwright/test';

test.describe("作業履歴一覧画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907145716.html");
  });

  test("日付範囲選択で作業履歴を絞り込める", async ({ page }) => {
    // SCEN-029
    await page.click('[data-testid="start-date"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.click('[data-testid="end-date"]');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
  });

  test("作業項目ドロップダウンで絞り込める", async ({ page }) => {
    // SCEN-030
    await page.click('[data-testid="work-item-filter"]');
    await page.click('text=配線工事');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await page.click('[data-testid="work-item-filter"]');
    await page.click('text=点検作業');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await page.click('[data-testid="work-item-filter"]');
    await page.click('text=すべて');
  });

  test("作業状況フィルターで絞り込める", async ({ page }) => {
    // SCEN-031
    await page.click('[data-testid="status-filter"]');
    await page.click('text=進行中');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await page.click('[data-testid="status-filter"]');
    await page.click('text=完了');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await page.click('[data-testid="status-filter"]');
    await page.click('text=全て');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
  });

  test("複数フィルター組み合わせで絞り込める", async ({ page }) => {
    // SCEN-032
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="work-type-filter"]');
    await page.click('text=点検作業');
    await page.click('[data-testid="worker-filter"]');
    await page.click('text=田中太郎');
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
  });

  test("検索ボタンで結果更新される", async ({ page }) => {
    // SCEN-033
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="worker-name"]', '佐藤花子');
    await page.fill('[data-testid="work-content"]', '配線');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test("リセットボタンでフィルター初期化される", async ({ page }) => {
    // SCEN-034
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="work-type-filter"]');
    await page.click('text=点検作業');
    await page.click('[data-testid="status-filter"]');
    await page.click('text=完了');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await page.click('[data-testid="reset-button"]');
    await expect(page.locator('[data-testid="start-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="end-date"]')).toHaveValue('');
  });

  test("作業履歴一覧が正しく表示される", async ({ page }) => {
    // SCEN-035
    await expect(page.locator('[data-testid="work-history-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-history-item"]').first()).toBeVisible();
  });

  test("開始日が終了日より後でエラー表示", async ({ page }) => {
    // SCEN-036
    await page.fill('[data-testid="start-date"]', '2024-12-31');
    await page.fill('[data-testid="end-date"]', '2024-01-01');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("未来日付選択でエラー表示", async ({ page }) => {
    // SCEN-037
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await page.fill('[data-testid="start-date"]', tomorrowStr);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('未来日付は選択できません');
  });

  test("1年以上の期間選択でエラー表示", async ({ page }) => {
    // SCEN-038
    await page.fill('[data-testid="start-date"]', '2023-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('1年以上の期間は選択できません');
  });

  test("検索結果0件時の表示", async ({ page }) => {
    // SCEN-039
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    await page.fill('[data-testid="worker-name"]', '存在しない作業員');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="no-results-message"]')).toContainText('該当する作業履歴が見つかりません');
    await expect(page.locator('[data-testid="clear-search-button"]')).toBeVisible();
  });

  test("大量データ表示時のパフォーマンス", async ({ page }) => {
    // SCEN-040
    const startTime = Date.now();
    await page.goto("/panels/scr-1778907145716.html");
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
    
    const scrollStart = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const scrollTime = Date.now() - scrollStart;
    expect(scrollTime).toBeLessThan(1000);
    
    const filterStart = Date.now();
    await page.click('[data-testid="work-type-filter"]');
    await page.click('text=点検作業');
    const filterTime = Date.now() - filterStart;
    expect(filterTime).toBeLessThan(1000);
  });

  test("日付範囲未選択で検索実行", async ({ page }) => {
    // SCEN-041
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('日付範囲を選択してください');
  });

  test("同日の開始終了日付選択", async ({ page }) => {
    // SCEN-042
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="start-date"]', today);
    await page.fill('[data-testid="end-date"]', today);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="work-history-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });
});