import { test, expect } from '@playwright/test';

test.describe("工数記録データ抽出画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907353387.html");
  });

  test("SCEN-301: 期間指定でCSV抽出が正常実行される", async ({ page }) => {
    // SCEN-301
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="outputFormat"]', 'csv');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("抽出実行")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("SCEN-302: 複数作業員・項目選択でExcel抽出が正常実行される", async ({ page }) => {
    // SCEN-302
    await page.check('input[name="workers"][value="worker1"]');
    await page.check('input[name="workers"][value="worker2"]');
    await page.check('input[name="workers"][value="worker3"]');
    await page.check('input[name="extractItems"][value="workDateTime"]');
    await page.check('input[name="extractItems"][value="workContent"]');
    await page.check('input[name="extractItems"][value="workHours"]');
    await page.selectOption('select[name="outputFormat"]', 'excel');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("抽出実行")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
  });

  test("SCEN-303: 異常値除外条件でデータ抽出される", async ({ page }) => {
    // SCEN-303
    await page.check('input[name="excludeAbnormalValues"]');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("データ抽出")');
    
    await page.waitForSelector('.extraction-results');
    const results = await page.locator('.work-hours-value').allTextContents();
    
    for (const hours of results) {
      const numHours = parseFloat(hours);
      expect(numHours).toBeGreaterThan(0);
      expect(numHours).toBeLessThanOrEqual(24);
    }
  });

  test("SCEN-304: 中断記録含む条件でデータ抽出される", async ({ page }) => {
    // SCEN-304
    await page.check('input[name="includeBreakRecords"]');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("データ抽出")');
    
    await page.waitForSelector('.extraction-results');
    await expect(page.locator('.break-record')).toBeVisible();
  });

  test("SCEN-305: 抽出条件プレビューが正しく表示される", async ({ page }) => {
    // SCEN-305
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="worker"]', '田中太郎');
    await page.selectOption('select[name="workType"]', '基礎工事');
    await page.click('button:has-text("プレビュー")');
    
    await expect(page.locator('.preview-area')).toContainText('2024年1月1日～2024年1月31日');
    await expect(page.locator('.preview-area')).toContainText('田中太郎');
    await expect(page.locator('.preview-area')).toContainText('基礎工事');
  });

  test("SCEN-306: 抽出データ件数が正確に表示される", async ({ page }) => {
    // SCEN-306
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("データ抽出")');
    
    await page.waitForSelector('.extraction-results');
    const countText = await page.locator('.result-count').textContent();
    const displayedCount = parseInt(countText?.match(/\d+/)?.[0] || '0');
    
    const actualRows = await page.locator('.result-row').count();
    expect(displayedCount).toBe(actualRows);
  });

  test("SCEN-307: 条件保存が正常実行される", async ({ page }) => {
    // SCEN-307
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="worker"]', '田中太郎');
    await page.fill('input[name="workNumber"]', 'WK-2024-001');
    await page.click('button:has-text("条件保存")');
    
    await page.fill('input[name="conditionName"]', '2024年1月田中分');
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('.message')).toContainText('条件が保存されました');
    await expect(page.locator('.saved-conditions')).toContainText('2024年1月田中分');
  });

  test("SCEN-308: 条件クリアで全項目がリセットされる", async ({ page }) => {
    // SCEN-308
    await page.fill('input[name="workerName"]', '田中');
    await page.fill('input[name="startDate"]', '2024/01/01');
    await page.fill('input[name="endDate"]', '2024/01/31');
    await page.selectOption('select[name="project"]', 'プロジェクトA');
    await page.fill('input[name="workContent"]', '設計');
    
    await page.click('button:has-text("条件クリア")');
    
    await expect(page.locator('input[name="workerName"]')).toHaveValue('');
    await expect(page.locator('input[name="startDate"]')).toHaveValue('');
    await expect(page.locator('input[name="endDate"]')).toHaveValue('');
    await expect(page.locator('input[name="workContent"]')).toHaveValue('');
  });

  test("SCEN-309: 開始日が終了日より未来でエラー表示", async ({ page }) => {
    // SCEN-309
    await page.fill('input[name="startDate"]', '2024-12-31');
    await page.fill('input[name="endDate"]', '2024-12-01');
    await page.click('button:has-text("抽出")');
    
    await expect(page.locator('.error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("SCEN-310: 期間未指定で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-310
    await page.selectOption('select[name="worker"]', 'worker1');
    await page.click('button:has-text("抽出実行")');
    
    await expect(page.locator('.error-message')).toContainText('期間を指定してください');
  });

  test("SCEN-311: 作業員未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-311
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("抽出実行")');
    
    await expect(page.locator('.error-message')).toContainText('作業員を選択してください');
  });

  test("SCEN-312: 出力形式未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-312
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="worker"]', 'worker1');
    await page.click('button:has-text("抽出実行")');
    
    await expect(page.locator('.error-message')).toContainText('出力形式を選択してください');
  });

  test("SCEN-313: 大量データ抽出時のタイムアウトエラー", async ({ page }) => {
    // SCEN-313
    await page.fill('input[name="startDate"]', '2022-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.check('input[name="allWorkers"]');
    await page.selectOption('select[name="detailLevel"]', 'daily');
    await page.click('button:has-text("データ抽出")');
    
    await expect(page.locator('.processing-indicator')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('処理がタイムアウトしました', { timeout: 60000 });
  });

  test("SCEN-314: 当日日付での期間指定", async ({ page }) => {
    // SCEN-314
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);
    await page.click('button:has-text("抽出実行")');
    
    await page.waitForSelector('.extraction-results');
    const hasData = await page.locator('.result-row').count() > 0;
    const hasNoDataMessage = await page.locator('.no-data-message').isVisible();
    
    expect(hasData || hasNoDataMessage).toBeTruthy();
  });

  test("SCEN-315: 最大期間範囲での抽出", async ({ page }) => {
    // SCEN-315
    await page.fill('input[name="startDate"]', '2020-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.click('button:has-text("抽出実行")');
    
    await page.waitForSelector('.extraction-results', { timeout: 30000 });
    await page.click('button:has-text("CSV出力")');
    
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("SCEN-316: 全作業員選択での抽出", async ({ page }) => {
    // SCEN-316
    await page.check('input[name="selectAllWorkers"]');
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("抽出実行")');
    
    await page.waitForSelector('.extraction-results');
    const workerNames = await page.locator('.worker-name').allTextContents();
    expect(workerNames.length).toBeGreaterThan(1);
  });

  test("SCEN-317: 抽出結果0件の場合の表示", async ({ page }) => {
    // SCEN-317
    await page.fill('input[name="workerID"]', '999999');
    await page.fill('input[name="startDate"]', '1900-01-01');
    await page.fill('input[name="endDate"]', '1900-01-02');
    await page.click('button:has-text("抽出")');
    
    await expect(page.locator('.no-data-message')).toContainText('該当するデータが見つかりませんでした');
  });

  test("SCEN-318: 最大件数上限での抽出", async ({ page }) => {
    // SCEN-318
    await page.fill('input[name="startDate"]', '2020-01-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    await page.check('input[name="allWorkers"]');
    await page.click('button:has-text("抽出実行")');
    
    await page.waitForSelector('.extraction-results', { timeout: 30000 });
    
    const warningVisible = await page.locator('.warning-message').isVisible();
    if (warningVisible) {
      await expect(page.locator('.warning-message')).toContainText('最大抽出件数');
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("ダウンロード")');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBeDefined();
    }
  });
});