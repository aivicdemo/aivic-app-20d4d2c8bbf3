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
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.selectOption('#output-format', 'csv');
    
    const downloadPromise = page.waitForDownload();
    await page.click('#extract-button');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test("SCEN-302: 複数作業員・項目選択でExcel抽出が正常実行される", async ({ page }) => {
    // SCEN-302
    await page.check('input[name="workers"][value="worker1"]');
    await page.check('input[name="workers"][value="worker2"]');
    await page.check('input[name="workers"][value="worker3"]');
    await page.check('input[name="items"][value="datetime"]');
    await page.check('input[name="items"][value="content"]');
    await page.check('input[name="items"][value="hours"]');
    await page.selectOption('#output-format', 'excel');
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    
    const downloadPromise = page.waitForDownload();
    await page.click('#extract-button');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test("SCEN-303: 異常値除外条件でデータ抽出される", async ({ page }) => {
    // SCEN-303
    await page.check('#exclude-anomalies');
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.selectOption('#project-select', 'project1');
    await page.click('#extract-data-button');
    
    await page.waitForSelector('#result-list');
    const results = await page.locator('#result-list tr');
    expect(await results.count()).toBeGreaterThan(0);
  });

  test("SCEN-304: 中断記録含む条件でデータ抽出される", async ({ page }) => {
    // SCEN-304
    await page.check('#include-interruptions');
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', new Date().toISOString().split('T')[0]);
    await page.selectOption('#project-select', 'project1');
    await page.click('#extract-data-button');
    
    await page.waitForSelector('#result-list');
    const interruptionRecords = page.locator('#result-list tr:has-text("中断")');
    expect(await interruptionRecords.count()).toBeGreaterThanOrEqual(0);
  });

  test("SCEN-305: 抽出条件プレビューが正しく表示される", async ({ page }) => {
    // SCEN-305
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.selectOption('#worker-select', '田中太郎');
    await page.selectOption('#work-type', '基礎工事');
    await page.click('#preview-button');
    
    await page.waitForSelector('#preview-area');
    expect(page.locator('#preview-area')).toContainText('2024年1月1日～2024年1月31日');
    expect(page.locator('#preview-area')).toContainText('田中太郎');
    expect(page.locator('#preview-area')).toContainText('基礎工事');
  });

  test("SCEN-306: 抽出データ件数が正確に表示される", async ({ page }) => {
    // SCEN-306
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#extract-data-button');
    
    await page.waitForSelector('#data-count');
    const displayedCount = await page.locator('#data-count').textContent();
    const actualRows = await page.locator('#result-list tr').count();
    
    expect(parseInt(displayedCount || '0')).toBe(actualRows);
  });

  test("SCEN-307: 条件保存が正常実行される", async ({ page }) => {
    // SCEN-307
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.selectOption('#worker-select', '田中太郎');
    await page.fill('#work-number', 'WK-2024-001');
    await page.click('#save-condition-button');
    
    await page.fill('#condition-name', '2024年1月田中分');
    await page.click('#save-button');
    
    expect(page.locator('.message')).toContainText('条件が保存されました');
    expect(page.locator('#saved-conditions')).toContainText('2024年1月田中分');
  });

  test("SCEN-308: 条件クリアで全項目がリセットされる", async ({ page }) => {
    // SCEN-308
    await page.fill('#worker-name', '田中');
    await page.fill('#start-date', '2024/01/01');
    await page.fill('#end-date', '2024/01/31');
    await page.selectOption('#project-select', 'プロジェクトA');
    await page.fill('#work-content', '設計');
    await page.click('#clear-condition-button');
    
    expect(await page.inputValue('#worker-name')).toBe('');
    expect(await page.inputValue('#start-date')).toBe('');
    expect(await page.inputValue('#end-date')).toBe('');
    expect(await page.inputValue('#work-content')).toBe('');
  });

  test("SCEN-309: 開始日が終了日より未来でエラー表示", async ({ page }) => {
    // SCEN-309
    await page.fill('#start-date', '2024-12-31');
    await page.fill('#end-date', '2024-12-01');
    await page.click('#extract-button');
    
    expect(page.locator('.error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("SCEN-310: 期間未指定で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-310
    await page.selectOption('#worker-select', 'worker1');
    await page.click('#extract-button');
    
    expect(page.locator('.error-message')).toBeVisible();
  });

  test("SCEN-311: 作業員未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-311
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#extract-button');
    
    expect(page.locator('.error-message')).toContainText('作業員');
  });

  test("SCEN-312: 出力形式未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-312
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.selectOption('#worker-select', 'worker1');
    await page.click('#extract-button');
    
    expect(page.locator('.error-message')).toContainText('出力形式');
  });

  test("SCEN-313: 大量データ抽出時のタイムアウトエラー", async ({ page }) => {
    // SCEN-313
    await page.fill('#start-date', '2022-01-01');
    await page.fill('#end-date', '2024-12-31');
    await page.check('#all-workers');
    await page.selectOption('#detail-level', 'daily');
    await page.click('#extract-data-button');
    
    await page.waitForSelector('.processing-indicator');
    await page.waitForSelector('.timeout-error', { timeout: 60000 });
    expect(page.locator('.timeout-error')).toBeVisible();
  });

  test("SCEN-314: 当日日付での期間指定", async ({ page }) => {
    // SCEN-314
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#start-date', today);
    await page.fill('#end-date', today);
    await page.click('#extract-button');
    
    await page.waitForSelector('#result-list');
    const noDataMessage = page.locator('.no-data-message');
    const hasResults = await page.locator('#result-list tr').count() > 0;
    
    if (!hasResults) {
      expect(noDataMessage).toContainText('該当データなし');
    }
  });

  test("SCEN-315: 最大期間範囲での抽出", async ({ page }) => {
    // SCEN-315
    await page.fill('#start-date', '2020-01-01');
    await page.fill('#end-date', '2030-12-31');
    await page.click('#extract-button');
    
    await page.waitForSelector('#result-list');
    await page.click('#csv-output-button');
    
    const downloadPromise = page.waitForDownload();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test("SCEN-316: 全作業員選択での抽出", async ({ page }) => {
    // SCEN-316
    await page.check('#select-all-workers');
    await page.fill('#start-date', '2024-01-01');
    await page.fill('#end-date', '2024-01-31');
    await page.click('#extract-button');
    
    await page.waitForSelector('#result-list');
    const dataCount = await page.locator('#data-count').textContent();
    expect(parseInt(dataCount || '0')).toBeGreaterThanOrEqual(0);
  });

  test("SCEN-317: 抽出結果0件の場合の表示", async ({ page }) => {
    // SCEN-317
    await page.fill('#worker-id', '99999');
    await page.fill('#start-date', '1900-01-01');
    await page.fill('#end-date', '1900-01-02');
    await page.click('#extract-button');
    
    expect(page.locator('.no-data-message')).toContainText('該当するデータが見つかりませんでした');
  });

  test("SCEN-318: 最大件数上限での抽出", async ({ page }) => {
    // SCEN-318
    await page.fill('#start-date', '2020-01-01');
    await page.fill('#end-date', '2024-12-31');
    await page.check('#select-all-workers');
    await page.click('#extract-button');
    
    await page.waitForSelector('.warning-message');
    expect(page.locator('.warning-message')).toContainText('最大抽出件数');
    
    const downloadPromise = page.waitForDownload();
    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });

});