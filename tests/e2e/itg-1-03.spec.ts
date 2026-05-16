import { test, expect } from '@playwright/test';

test.describe("作業履歴一覧画面", () => {
  test.beforeEach(async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(baseUrl);
  });

  test("SCEN-029: 日付範囲選択で作業履歴を絞り込める", async ({ page }) => {
    // SCEN-029
    await page.goto("/work-history");
    await page.fill('input[type="date"][name="startDate"]', '2024-01-01');
    await page.fill('input[type="date"][name="endDate"]', '2024-01-31');
    await page.click('button:has-text("絞り込み")');
    await expect(page.locator('.work-history-item')).toBeVisible();
  });

  test("SCEN-030: 作業項目ドロップダウンで絞り込める", async ({ page }) => {
    // SCEN-030
    await page.goto("/work-history");
    await page.click('select[name="workType"]');
    await page.selectOption('select[name="workType"]', '配線工事');
    await page.waitForTimeout(500);
    await expect(page.locator('.work-history-item')).toBeVisible();
    await page.selectOption('select[name="workType"]', '点検作業');
    await page.waitForTimeout(500);
    await expect(page.locator('.work-history-item')).toBeVisible();
    await page.selectOption('select[name="workType"]', 'すべて');
  });

  test("SCEN-031: 作業状況フィルターで絞り込める", async ({ page }) => {
    // SCEN-031
    await page.goto("/work-history");
    await page.selectOption('select[name="status"]', '進行中');
    await page.click('button:has-text("適用")');
    await expect(page.locator('.work-history-item')).toBeVisible();
    await page.selectOption('select[name="status"]', '完了');
    await page.click('button:has-text("適用")');
    await expect(page.locator('.work-history-item')).toBeVisible();
    await page.selectOption('select[name="status"]', '全て');
    await expect(page.locator('.work-history-item')).toBeVisible();
  });

  test("SCEN-032: 複数フィルター組み合わせで絞り込める", async ({ page }) => {
    // SCEN-032
    await page.goto("/work-history");
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="workType"]', '点検作業');
    await page.selectOption('select[name="worker"]', '田中太郎');
    await page.click('button:has-text("絞り込み")');
    await expect(page.locator('.work-history-item')).toBeVisible();
  });

  test("SCEN-033: 検索ボタンで結果更新される", async ({ page }) => {
    // SCEN-033
    await page.goto("/work-history");
    await page.fill('input[name="workDate"]', '2024-01-15');
    await page.fill('input[name="workerName"]', '田中太郎');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.work-history-list')).toBeVisible();
  });

  test("SCEN-034: リセットボタンでフィルター初期化される", async ({ page }) => {
    // SCEN-034
    await page.goto("/work-history");
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="workType"]', '点検作業');
    await page.selectOption('select[name="status"]', '完了');
    await page.click('button:has-text("適用")');
    await page.click('button:has-text("リセット")');
    await expect(page.locator('input[name="startDate"]')).toHaveValue('');
    await expect(page.locator('input[name="endDate"]')).toHaveValue('');
  });

  test("SCEN-035: 作業履歴一覧が正しく表示される", async ({ page }) => {
    // SCEN-035
    await page.goto("/");
    await page.click('a:has-text("作業履歴")');
    await expect(page.locator('.work-history-list')).toBeVisible();
    await expect(page.locator('.work-history-item').first()).toBeVisible();
  });

  test("SCEN-036: 開始日が終了日より後でエラー表示", async ({ page }) => {
    // SCEN-036
    await page.goto("/work-history");
    await page.fill('input[name="startDate"]', '2024-12-31');
    await page.fill('input[name="endDate"]', '2024-01-01');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("SCEN-037: 未来日付選択でエラー表示", async ({ page }) => {
    // SCEN-037
    await page.goto("/work-history");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[name="workDate"]', tomorrowStr);
    await page.click('button:has-text("適用")');
    await expect(page.locator('.error-message')).toContainText('未来日付は選択できません');
  });

  test("SCEN-038: 1年以上の期間選択でエラー表示", async ({ page }) => {
    // SCEN-038
    await page.goto("/work-history");
    await page.fill('input[name="startDate"]', '2023-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.click('button:has-text("適用")');
    await expect(page.locator('.error-message')).toContainText('1年以上の期間は選択できません');
  });

  test("SCEN-039: 検索結果0件時の表示", async ({ page }) => {
    // SCEN-039
    await page.goto("/work-history");
    await page.fill('input[name="workerName"]', '存在しない作業員');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.no-results')).toContainText('該当する作業履歴が見つかりません');
    await expect(page.locator('button:has-text("クリア")')).toBeVisible();
  });

  test("SCEN-040: 大量データ表示時のパフォーマンス", async ({ page }) => {
    // SCEN-040
    const startTime = Date.now();
    await page.goto("/work-history");
    await page.waitForSelector('.work-history-list');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
    
    const scrollStart = Date.now();
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStart;
    expect(scrollTime).toBeLessThan(1000);
  });

  test("SCEN-041: 日付範囲未選択で検索実行", async ({ page }) => {
    // SCEN-041
    await page.goto("/work-history");
    await page.click('button:has-text("検索")');
    await expect(page.locator('.error-message')).toContainText('日付範囲を選択してください');
  });

  test("SCEN-042: 同日の開始終了日付選択", async ({ page }) => {
    // SCEN-042
    await page.goto("/work-history");
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);
    await page.click('button:has-text("検索")');
    await expect(page.locator('.work-history-list')).toBeVisible();
    await expect(page.locator('.error-message')).not.toBeVisible();
  });
});