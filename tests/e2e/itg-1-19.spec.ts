import { test, expect } from '@playwright/test';

test.describe("工数記録データ抽出画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // ログイン処理（認証が必要な場合）
    // await page.fill('[data-testid="username"]', 'testuser');
    // await page.fill('[data-testid="password"]', 'password');
    // await page.click('[data-testid="login-button"]');
  });

  test("SCEN-301: 期間指定でCSV抽出が正常実行される", async ({ page }) => {
    // SCEN-301
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="format"]', 'csv');
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("抽出実行")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test("SCEN-302: 複数作業員・項目選択でExcel抽出が正常実行される", async ({ page }) => {
    // SCEN-302
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.check('[name="worker"][value="worker1"]');
    await page.check('[name="worker"][value="worker2"]');
    await page.check('[name="worker"][value="worker3"]');
    await page.check('[name="item"][value="worktime"]');
    await page.check('[name="item"][value="content"]');
    await page.selectOption('[name="format"]', 'excel');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("抽出実行")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/);
  });

  test("SCEN-303: 異常値除外条件でデータ抽出される", async ({ page }) => {
    // SCEN-303
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.check('[name="excludeAbnormal"]');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', 'testworker');
    await page.click('button:has-text("データ抽出")');
    await expect(page.locator('.result-list')).toBeVisible();
    const results = await page.locator('.result-item').count();
    expect(results).toBeGreaterThanOrEqual(0);
  });

  test("SCEN-304: 中断記録含む条件でデータ抽出される", async ({ page }) => {
    // SCEN-304
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.check('[name="includeInterruption"]');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', 'testworker');
    await page.click('button:has-text("データ抽出")');
    await expect(page.locator('.result-list')).toBeVisible();
    await expect(page.locator('text=中断')).toBeVisible();
  });

  test("SCEN-305: 抽出条件プレビューが正しく表示される", async ({ page }) => {
    // SCEN-305
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', '田中太郎');
    await page.selectOption('[name="workType"]', '基礎工事');
    await page.click('button:has-text("プレビュー")');
    await expect(page.locator('.preview-area')).toBeVisible();
    await expect(page.locator('.preview-area')).toContainText('2024年1月1日～2024年1月31日');
    await expect(page.locator('.preview-area')).toContainText('田中太郎');
    await expect(page.locator('.preview-area')).toContainText('基礎工事');
  });

  test("SCEN-306: 抽出データ件数が正確に表示される", async ({ page }) => {
    // SCEN-306
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', 'testworker');
    await page.click('button:has-text("データ抽出")');
    await expect(page.locator('.result-count')).toBeVisible();
    const countText = await page.locator('.result-count').textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || '0');
    const actualRows = await page.locator('.result-item').count();
    expect(count).toBe(actualRows);
  });

  test("SCEN-307: 条件保存が正常実行される", async ({ page }) => {
    // SCEN-307
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', '田中太郎');
    await page.fill('[name="workNumber"]', 'WK-2024-001');
    await page.click('button:has-text("条件保存")');
    await page.fill('[name="conditionName"]', '2024年1月田中分');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=条件が保存されました')).toBeVisible();
    await expect(page.locator('.saved-conditions')).toContainText('2024年1月田中分');
  });

  test("SCEN-308: 条件クリアで全項目がリセットされる", async ({ page }) => {
    // SCEN-308
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="workerName"]', '田中');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="project"]', 'プロジェクトA');
    await page.fill('[name="workContent"]', '設計');
    await page.click('button:has-text("条件クリア")');
    await expect(page.locator('[name="workerName"]')).toHaveValue('');
    await expect(page.locator('[name="startDate"]')).toHaveValue('');
    await expect(page.locator('[name="endDate"]')).toHaveValue('');
    await expect(page.locator('[name="workContent"]')).toHaveValue('');
  });

  test("SCEN-309: 開始日が終了日より未来でエラー表示", async ({ page }) => {
    // SCEN-309
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-12-31');
    await page.fill('[name="endDate"]', '2024-12-01');
    await page.click('button:has-text("抽出")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('開始日は終了日より前の日付を入力してください');
  });

  test("SCEN-310: 期間未指定で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-310
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.selectOption('[name="worker"]', 'testworker');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('期間');
  });

  test("SCEN-311: 作業員未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-311
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('作業員');
  });

  test("SCEN-312: 出力形式未選択で抽出実行時にエラー表示", async ({ page }) => {
    // SCEN-312
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.selectOption('[name="worker"]', 'testworker');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('出力形式');
  });

  test("SCEN-313: 大量データ抽出時のタイムアウトエラー", async ({ page }) => {
    // SCEN-313
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2022-01-01');
    await page.fill('[name="endDate"]', '2024-12-31');
    await page.check('[name="allWorkers"]');
    await page.selectOption('[name="detailLevel"]', 'daily');
    await page.click('button:has-text("データ抽出")');
    await expect(page.locator('.processing')).toBeVisible();
    await expect(page.locator('.error-dialog')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.error-dialog')).toContainText('タイムアウト');
  });

  test("SCEN-314: 当日日付での期間指定", async ({ page }) => {
    // SCEN-314
    const today = new Date().toISOString().split('T')[0];
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', today);
    await page.fill('[name="endDate"]', today);
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.result-list, .no-data-message')).toBeVisible();
  });

  test("SCEN-315: 最大期間範囲での抽出", async ({ page }) => {
    // SCEN-315
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2020-01-01');
    await page.fill('[name="endDate"]', '2030-12-31');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.processing')).toBeVisible();
    await expect(page.locator('.result-list')).toBeVisible({ timeout: 30000 });
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("CSV出力")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test("SCEN-316: 全作業員選択での抽出", async ({ page }) => {
    // SCEN-316
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.check('[name="selectAll"]');
    await page.fill('[name="startDate"]', '2024-01-01');
    await page.fill('[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.result-list')).toBeVisible();
    const results = await page.locator('.result-item').count();
    expect(results).toBeGreaterThanOrEqual(0);
  });

  test("SCEN-317: 抽出結果0件の場合の表示", async ({ page }) => {
    // SCEN-317
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="workerId"]', 'nonexistent');
    await page.fill('[name="startDate"]', '2000-01-01');
    await page.fill('[name="endDate"]', '2000-01-01');
    await page.click('button:has-text("抽出")');
    await expect(page.locator('.no-data-message')).toBeVisible();
    await expect(page.locator('.no-data-message')).toContainText('該当するデータが見つかりませんでした');
  });

  test("SCEN-318: 最大件数上限での抽出", async ({ page }) => {
    // SCEN-318
    await page.goto("/");
    await page.click('text=工数記録データ抽出');
    await page.fill('[name="startDate"]', '2020-01-01');
    await page.fill('[name="endDate"]', '2024-12-31');
    await page.check('[name="selectAll"]');
    await page.click('button:has-text("抽出実行")');
    await expect(page.locator('.processing')).toBeVisible();
    await expect(page.locator('.warning-message, .result-list')).toBeVisible({ timeout: 30000 });
    if (await page.locator('.warning-message').isVisible()) {
      await expect(page.locator('.warning-message')).toContainText('最大');
      const downloadPromise = page.waitForDownload();
      await page.click('button:has-text("ダウンロード")');
      await downloadPromise;
    }
  });
});