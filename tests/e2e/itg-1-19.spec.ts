import { test, expect } from '@playwright/test';

test.describe("工数記録データ抽出画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907353387.html");
  });

  test("SCEN-301: 期間指定でCSV抽出が正常実行される", async ({ page }) => {
    // SCEN-301
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("SCEN-302: 複数作業員・項目選択でExcel抽出が正常実行される", async ({ page }) => {
    // SCEN-302
    await page.check('[data-testid="select-all-workers"]');
    await page.check('[data-testid="select-all-items"]');
    await page.selectOption('[data-testid="output-format"]', 'excel');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
  });

  test("SCEN-303: 異常値除外条件でデータ抽出される", async ({ page }) => {
    // SCEN-303
    await page.check('[data-testid="anomaly-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  test("SCEN-304: 中断記録含む条件でデータ抽出される", async ({ page }) => {
    // SCEN-304
    await page.check('[data-testid="interruption-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  test("SCEN-305: 抽出条件プレビューが正しく表示される", async ({ page }) => {
    // SCEN-305
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="preview-button"]');
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-content"]')).toContainText('2024-01-01');
    await expect(page.locator('[data-testid="preview-content"]')).toContainText('2024-01-31');
  });

  test("SCEN-306: 抽出データ件数が正確に表示される", async ({ page }) => {
    // SCEN-306
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
    const countText = await page.locator('[data-testid="data-count"]').textContent();
    expect(countText).toMatch(/\d+件/);
  });

  test("SCEN-307: 条件保存が正常実行される", async ({ page }) => {
    // SCEN-307
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="save-condition-button"]');
    await page.fill('[data-testid="condition-name"]', '2024年1月田中分');
    await page.click('[data-testid="confirm-save-button"]');
    await expect(page.locator('text=条件が保存されました')).toBeVisible();
  });

  test("SCEN-308: 条件クリアで全項目がリセットされる", async ({ page }) => {
    // SCEN-308
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.fill('[data-testid="work-location"]', '現場A');
    await page.click('[data-testid="clear-button"]');
    await expect(page.locator('[data-testid="start-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="end-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="work-location"]')).toHaveValue('');
  });

  test("SCEN-309: 開始日が終了日より未来でエラー表示", async ({ page }) => {
    // SCEN-309
    await page.fill('[data-testid="start-date"]', '2024-12-31');
    await page.fill('[data-testid="end-date"]', '2024-12-01');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('開始日は終了日より前の日付');
  });

  test("SCEN-310: 期間未指定で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-310
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('期間');
  });

  test("SCEN-311: 作業員未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-311
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業員');
  });

  test("SCEN-312: 出力形式未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-312
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('出力形式');
  });

  test("SCEN-313: 大量データ抽出時のタイムアウトエラー", async ({ page }) => {
    // SCEN-313
    await page.fill('[data-testid="start-date"]', '2022-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('タイムアウト');
  });

  test("SCEN-314: 当日日付での期間指定", async ({ page }) => {
    // SCEN-314
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="start-date"]', today);
    await page.fill('[data-testid="end-date"]', today);
    await page.check('[data-testid="select-all-workers"]');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  test("SCEN-315: 最大期間範囲での抽出", async ({ page }) => {
    // SCEN-315
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible({ timeout: 30000 });
  });

  test("SCEN-316: 全作業員選択での抽出", async ({ page }) => {
    // SCEN-316
    await page.check('[data-testid="select-all-workers"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  test("SCEN-317: 抽出結果0件の場合の表示", async ({ page }) => {
    // SCEN-317
    await page.fill('[data-testid="start-date"]', '2030-01-01');
    await page.fill('[data-testid="end-date"]', '2030-01-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toContainText('0件');
  });

  test("SCEN-318: 最大件数上限での抽出", async ({ page }) => {
    // SCEN-318
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.check('[data-testid="select-all-items"]');
    await page.selectOption('[data-testid="output-format"]', 'csv');
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    await expect(page.locator('text=上限')).toBeVisible();
  });
});