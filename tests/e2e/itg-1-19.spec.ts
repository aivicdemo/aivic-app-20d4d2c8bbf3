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

  // SCEN-301
  test('[normal] 工数記録データ抽出画面 - 期間指定でCSV抽出が正常実行される', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  // SCEN-302
  test('[normal] 工数記録データ抽出画面 - 複数作業員・項目選択でExcel抽出が正常実行される', async ({ page }) => {
    await page.check('[data-testid="select-all-workers"]');
    await page.check('[data-testid="select-all-items"]');
    await page.selectOption('[data-testid="output-format"]', 'Excel');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.xlsx?$/i);
  });

  // SCEN-303
  test('[normal] 工数記録データ抽出画面 - 異常値除外条件でデータ抽出される', async ({ page }) => {
    await page.check('[data-testid="anomaly-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  // SCEN-304
  test('[normal] 工数記録データ抽出画面 - 中断記録含む条件でデータ抽出される', async ({ page }) => {
    await page.check('[data-testid="interruption-filter"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  // SCEN-305
  test('[normal] 工数記録データ抽出画面 - 抽出条件プレビューが正しく表示される', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.fill('[data-testid="work-location"]', '基礎工事');
    
    await page.click('[data-testid="preview-button"]');
    
    await expect(page.locator('[data-testid="preview-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-content"]')).toContainText('2024-01-01');
    await expect(page.locator('[data-testid="preview-content"]')).toContainText('2024-01-31');
  });

  // SCEN-306
  test('[normal] 工数記録データ抽出画面 - 抽出データ件数が正確に表示される', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
    const countText = await page.locator('[data-testid="data-count"]').textContent();
    expect(countText).toMatch(/\d+/);
  });

  // SCEN-307
  test('[normal] 工数記録データ抽出画面 - 条件保存が正常実行される', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.fill('[data-testid="work-location"]', 'WK-2024-001');
    
    await page.click('[data-testid="save-condition-button"]');
    await page.fill('[data-testid="condition-name"]', '2024年1月田中分');
    await page.click('[data-testid="confirm-save-button"]');
    
    await expect(page.locator('text=条件が保存されました')).toBeVisible();
  });

  // SCEN-308
  test('[normal] 工数記録データ抽出画面 - 条件クリアで全項目がリセットされる', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.fill('[data-testid="work-location"]', 'プロジェクトA');
    
    await page.click('[data-testid="clear-button"]');
    
    await expect(page.locator('[data-testid="start-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="end-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="work-location"]')).toHaveValue('');
  });

  // SCEN-309
  test('[error] 工数記録データ抽出画面 - 開始日が終了日より未来でエラー表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-12-31');
    await page.fill('[data-testid="end-date"]', '2024-12-01');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('開始日は終了日より前');
  });

  // SCEN-310
  test('[error] 工数記録データ抽出画面 - 期間未指定で抽出実行時にエラー表示', async ({ page }) => {
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('期間');
  });

  // SCEN-311
  test('[error] 工数記録データ抽出画面 - 作業員未選択で抽出実行時にエラー表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業員');
  });

  // SCEN-312
  test('[error] 工数記録データ抽出画面 - 出力形式未選択で抽出実行時にエラー表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.check('[data-testid="select-all-workers"]');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('出力形式');
  });

  // SCEN-313
  test('[error] 工数記録データ抽出画面 - 大量データ抽出時のタイムアウトエラー', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2022-01-01');
    await page.fill('[data-testid="end-date"]', '2024-12-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.check('[data-testid="select-all-items"]');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="error-message"]')).toContainText('タイムアウト');
  });

  // SCEN-314
  test('[edge] 工数記録データ抽出画面 - 当日日付での期間指定', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[data-testid="start-date"]', today);
    await page.fill('[data-testid="end-date"]', today);
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    await page.check('[data-testid="select-all-workers"]');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
  });

  // SCEN-315
  test('[edge] 工数記録データ抽出画面 - 最大期間範囲での抽出', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2030-12-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    await page.check('[data-testid="select-all-workers"]');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  // SCEN-316
  test('[edge] 工数記録データ抽出画面 - 全作業員選択での抽出', async ({ page }) => {
    await page.check('[data-testid="select-all-workers"]');
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('[data-testid="data-count"]')).toBeVisible();
    const countText = await page.locator('[data-testid="data-count"]').textContent();
    expect(countText).toMatch(/\d+/);
  });

  // SCEN-317
  test('[edge] 工数記録データ抽出画面 - 抽出結果0件の場合の表示', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '1990-01-01');
    await page.fill('[data-testid="end-date"]', '1990-01-31');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    await page.check('[data-testid="select-all-workers"]');
    
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('text=該当するデータが見つかりませんでした')).toBeVisible();
  });

  // SCEN-318
  test('[edge] 工数記録データ抽出画面 - 最大件数上限での抽出', async ({ page }) => {
    await page.fill('[data-testid="start-date"]', '2020-01-01');
    await page.fill('[data-testid="end-date"]', '2025-12-31');
    await page.check('[data-testid="select-all-workers"]');
    await page.check('[data-testid="select-all-items"]');
    await page.selectOption('[data-testid="output-format"]', 'CSV');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="extract-button"]');
    
    await expect(page.locator('text=最大抽出件数')).toBeVisible();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });
});