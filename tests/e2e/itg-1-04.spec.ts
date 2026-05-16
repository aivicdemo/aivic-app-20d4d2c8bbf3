import { test, expect } from '@playwright/test';

test.describe("異常値検出ログ画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907170814.html");
  });

  test("SCEN-043: 異常値検出ログ一覧が正常に表示される", async ({ page }) => {
    // SCEN-043
    await expect(page.locator('.log-list-table')).toBeVisible();
    await expect(page.locator('th:has-text("検出日時")')).toBeVisible();
    await expect(page.locator('th:has-text("作業員名")')).toBeVisible();
    await expect(page.locator('th:has-text("異常値の内容")')).toBeVisible();
    await expect(page.locator('th:has-text("対象データ")')).toBeVisible();
    const rows = page.locator('.log-list-table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test("SCEN-044: 検出日時フィルターで期間絞り込みができる", async ({ page }) => {
    // SCEN-044
    await page.fill('input[name="startDateTime"]', '2024-01-01 00:00');
    await page.fill('input[name="endDateTime"]', '2024-01-31 23:59');
    await page.click('button:has-text("フィルター適用")');
    const dates = page.locator('.log-list-table tbody tr td:first-child');
    const count = await dates.count();
    for (let i = 0; i < count; i++) {
      const dateText = await dates.nth(i).textContent();
      expect(dateText).toMatch(/^2024-01/);
    }
  });

  test("SCEN-045: 異常値タイプで絞り込みができる", async ({ page }) => {
    // SCEN-045
    await page.selectOption('select[name="anomalyType"]', '工数超過');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-list-table tbody tr')).toContainText('工数超過');
    
    await page.selectOption('select[name="anomalyType"]', '工数不足');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-list-table tbody tr')).toContainText('工数不足');
    
    await page.selectOption('select[name="anomalyType"]', '');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-list-table tbody tr')).toBeVisible();
  });

  test("SCEN-046: 作業員名検索で該当データが抽出される", async ({ page }) => {
    // SCEN-046
    await page.fill('input[name="workerSearch"]', '田中太郎');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list-table tbody tr')).toContainText('田中太郎');
    await expect(page.locator('.search-result-count')).toBeVisible();
  });

  test("SCEN-047: 作業項目絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-047
    await page.selectOption('select[name="workItem"]', '設備点検');
    await page.click('button:has-text("絞り込み実行")');
    const workItems = page.locator('.log-list-table tbody tr td:nth-child(4)');
    const count = await workItems.count();
    for (let i = 0; i < count; i++) {
      await expect(workItems.nth(i)).toContainText('設備点検');
    }
  });

  test("SCEN-048: ステータス絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-048
    await page.click('select[name="status"]');
    await page.selectOption('select[name="status"]', '未処理');
    await page.click('button:has-text("絞り込み実行")');
    const statuses = page.locator('.log-list-table tbody tr td.status-column');
    const count = await statuses.count();
    for (let i = 0; i < count; i++) {
      await expect(statuses.nth(i)).toContainText('未処理');
    }
  });

  test("SCEN-049: 複数条件組み合わせで検索できる", async ({ page }) => {
    // SCEN-049
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="anomalyLevel"]', '警告');
    await page.selectOption('select[name="targetWork"]', '機械保守');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list-table tbody tr')).toContainText('警告');
    await expect(page.locator('.log-list-table tbody tr')).toContainText('機械保守');
  });

  test("SCEN-050: フィルタークリアで全条件がリセットされる", async ({ page }) => {
    // SCEN-050
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="worker"]', 'worker1');
    await page.selectOption('select[name="anomalyType"]', 'type1');
    await page.selectOption('select[name="severity"]', 'high');
    await page.click('button:has-text("フィルター適用")');
    
    await page.click('button:has-text("フィルタークリア")');
    await expect(page.locator('input[name="startDate"]')).toHaveValue('');
    await expect(page.locator('input[name="endDate"]')).toHaveValue('');
    await expect(page.locator('select[name="worker"]')).toHaveValue('');
  });

  test("SCEN-051: 異常値詳細が正常に表示される", async ({ page }) => {
    // SCEN-051
    await page.click('.log-list-table tbody tr:first-child');
    await expect(page.locator('.detail-dialog')).toBeVisible();
    await expect(page.locator('.detail-dialog .detection-time')).toBeVisible();
    await expect(page.locator('.detail-dialog .target-data')).toBeVisible();
    await expect(page.locator('.detail-dialog .anomaly-type')).toBeVisible();
    await expect(page.locator('.detail-dialog .threshold-value')).toBeVisible();
    await expect(page.locator('.detail-dialog .measured-value')).toBeVisible();
  });

  test("SCEN-052: 対応状況を更新できる", async ({ page }) => {
    // SCEN-052
    await page.click('.log-list-table tbody tr:first-child .status-update-btn');
    await page.selectOption('select[name="responseStatus"]', '対応中');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
    
    await page.click('.log-list-table tbody tr:first-child .status-update-btn');
    await page.selectOption('select[name="responseStatus"]', '完了');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.update-history')).toBeVisible();
  });

  test("SCEN-053: コメントを入力して保存できる", async ({ page }) => {
    // SCEN-053
    await page.click('.log-list-table tbody tr:first-child');
    await page.click('textarea[name="comment"]');
    await page.fill('textarea[name="comment"]', '作業時間の記録ミスを修正しました');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toHaveText('保存しました');
    await expect(page.locator('.comment-display')).toContainText('作業時間の記録ミスを修正しました');
  });

  test("SCEN-054: エクスポートでファイルがダウンロードされる", async ({ page }) => {
    // SCEN-054
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("エクスポート")');
    await page.selectOption('select[name="fileFormat"]', 'CSV');
    await page.click('button:has-text("ダウンロード")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("SCEN-055: 存在しない作業員名で検索結果が0件", async ({ page }) => {
    // SCEN-055
    await page.fill('input[name="workerSearch"]', 'テスト太郎999');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.no-results-message')).toHaveText('該当する作業員のログが見つかりません');
    await expect(page.locator('.log-list-table tbody tr')).toHaveCount(0);
  });

  test("SCEN-056: 未来日付でフィルターして結果が0件", async ({ page }) => {
    // SCEN-056
    await page.fill('input[name="startDate"]', '2025-12-31');
    await page.fill('input[name="endDate"]', '2026-01-31');
    await page.click('button:has-text("フィルター実行")');
    await expect(page.locator('.no-results-message')).toContainText('該当するログがありません');
    await expect(page.locator('.log-list-table tbody tr')).toHaveCount(0);
  });

  test("SCEN-057: 不正な日付形式でエラー表示", async ({ page }) => {
    // SCEN-057
    await page.fill('input[name="dateFilter"]', '2024/13/45');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.error-message')).toContainText('正しい日付形式で入力してください（YYYY-MM-DD）');
  });

  test("SCEN-058: 対応状況更新時にネットワークエラー", async ({ page }) => {
    // SCEN-058
    await page.click('.log-list-table tbody tr:first-child .status-update-btn');
    await page.selectOption('select[name="responseStatus"]', '対応中');
    await page.context().setOffline(true);
    await page.click('button:has-text("更新")');
    await expect(page.locator('.error-message')).toBeVisible();
    await page.context().setOffline(false);
  });

  test("SCEN-059: コメント上限文字数超過でエラー表示", async ({ page }) => {
    // SCEN-059
    const longText = 'a'.repeat(1001);
    await page.click('.log-list-table tbody tr:first-child');
    await page.fill('textarea[name="comment"]', longText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('文字数上限超過');
  });

  test("SCEN-060: 検索条件なしで全件検索", async ({ page }) => {
    // SCEN-060
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list-table tbody tr')).toHaveCountGreaterThan(0);
    await expect(page.locator('.pagination')).toBeVisible();
  });

  test("SCEN-061: コメント文字数上限値で保存成功", async ({ page }) => {
    // SCEN-061
    const maxLengthText = 'a'.repeat(1000);
    await page.click('.log-list-table tbody tr:first-child');
    await page.fill('textarea[name="comment"]', maxLengthText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.comment-display')).toContainText(maxLengthText);
  });

  test("SCEN-062: 大量データ表示時のページネーション", async ({ page }) => {
    // SCEN-062
    await expect(page.locator('.pagination')).toBeVisible();
    const firstPageCount = await page.locator('.log-list-table tbody tr').count();
    expect(firstPageCount).toBeGreaterThan(0);
    
    await page.click('.pagination .next-btn');
    await expect(page.locator('.log-list-table tbody tr')).toHaveCountGreaterThan(0);
    
    await page.click('.pagination .prev-btn');
    await expect(page.locator('.log-list-table tbody tr')).toHaveCount(firstPageCount);
    
    await page.click('.pagination .page-number[data-page="3"]');
    await expect(page.locator('.log-list-table tbody tr')).toBeVisible();
  });

  test("SCEN-063: 同一日の開始終了日付で検索", async ({ page }) => {
    // SCEN-063
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);
    await page.click('button:has-text("検索")');
    
    const hasResults = await page.locator('.log-list-table tbody tr').count();
    if (hasResults === 0) {
      await expect(page.locator('.no-results-message')).toContainText('該当するデータがありません');
    } else {
      await expect(page.locator('.log-list-table tbody tr')).toBeVisible();
    }
  });
});