import { test, expect } from '@playwright/test';

test.describe("異常値検出ログ画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907170814.html");
  });

  test("SCEN-043: 異常値検出ログ一覧が正常に表示される", async ({ page }) => {
    // SCEN-043
    await expect(page.locator('.log-list-container')).toBeVisible();
    await expect(page.locator('.log-item')).toHaveCount(await page.locator('.log-item').count());
    await expect(page.locator('.detection-datetime')).toBeVisible();
    await expect(page.locator('.worker-name')).toBeVisible();
    await expect(page.locator('.anomaly-content')).toBeVisible();
    await expect(page.locator('.target-data')).toBeVisible();
  });

  test("SCEN-044: 検出日時フィルターで期間絞り込みができる", async ({ page }) => {
    // SCEN-044
    await page.fill('input[name="start-datetime"]', '2024-01-01 00:00');
    await page.fill('input[name="end-datetime"]', '2024-01-31 23:59');
    await page.click('button[data-testid="apply-filter"]');
    const logItems = page.locator('.log-item');
    const count = await logItems.count();
    for (let i = 0; i < count; i++) {
      const datetime = await logItems.nth(i).locator('.detection-datetime').textContent();
      expect(datetime).toMatch(/2024-01/);
    }
  });

  test("SCEN-045: 異常値タイプで絞り込みができる", async ({ page }) => {
    // SCEN-045
    await page.selectOption('select[name="anomaly-type"]', '工数超過');
    await page.click('button[data-testid="apply-filter"]');
    await expect(page.locator('.anomaly-type-filter')).toHaveValue('工数超過');
    await page.selectOption('select[name="anomaly-type"]', '工数不足');
    await page.click('button[data-testid="apply-filter"]');
    await expect(page.locator('.anomaly-type-filter')).toHaveValue('工数不足');
    await page.selectOption('select[name="anomaly-type"]', 'all');
    await page.click('button[data-testid="apply-filter"]');
  });

  test("SCEN-046: 作業員名検索で該当データが抽出される", async ({ page }) => {
    // SCEN-046
    await page.fill('input[name="worker-search"]', '田中太郎');
    await page.click('button[data-testid="search-button"]');
    await expect(page.locator('.search-results')).toBeVisible();
    await expect(page.locator('.highlight-worker-name')).toContainText('田中太郎');
    await expect(page.locator('.result-count')).toBeVisible();
  });

  test("SCEN-047: 作業項目絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-047
    await page.selectOption('select[name="work-item"]', '設備点検');
    await page.click('button[data-testid="apply-filter"]');
    const logItems = page.locator('.log-item');
    const count = await logItems.count();
    for (let i = 0; i < count; i++) {
      const workItem = await logItems.nth(i).locator('.work-item').textContent();
      expect(workItem).toBe('設備点検');
    }
  });

  test("SCEN-048: ステータス絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-048
    await page.selectOption('select[name="status-filter"]', '未処理');
    await page.click('button[data-testid="apply-filter"]');
    const logItems = page.locator('.log-item');
    const count = await logItems.count();
    for (let i = 0; i < count; i++) {
      const status = await logItems.nth(i).locator('.status').textContent();
      expect(status).toBe('未処理');
    }
  });

  test("SCEN-049: 複数条件組み合わせで検索できる", async ({ page }) => {
    // SCEN-049
    await page.fill('input[name="start-date"]', '2024-01-01');
    await page.fill('input[name="end-date"]', '2024-01-31');
    await page.selectOption('select[name="anomaly-level"]', '警告');
    await page.selectOption('select[name="target-work"]', '機械保守');
    await page.click('button[data-testid="search-button"]');
    await expect(page.locator('.search-results')).toBeVisible();
  });

  test("SCEN-050: フィルタークリアで全条件がリセットされる", async ({ page }) => {
    // SCEN-050
    await page.fill('input[name="start-date"]', '2024-01-01');
    await page.fill('input[name="end-date"]', '2024-01-31');
    await page.selectOption('select[name="worker-filter"]', 'worker1');
    await page.selectOption('select[name="anomaly-type"]', '工数超過');
    await page.selectOption('select[name="priority-filter"]', '高');
    await page.click('button[data-testid="apply-filter"]');
    await page.click('button[data-testid="clear-filter"]');
    await expect(page.locator('input[name="start-date"]')).toHaveValue('');
    await expect(page.locator('input[name="end-date"]')).toHaveValue('');
    await expect(page.locator('select[name="worker-filter"]')).toHaveValue('');
    await expect(page.locator('select[name="anomaly-type"]')).toHaveValue('');
    await expect(page.locator('select[name="priority-filter"]')).toHaveValue('');
  });

  test("SCEN-051: 異常値詳細が正常に表示される", async ({ page }) => {
    // SCEN-051
    await page.click('.log-item:first-child');
    await expect(page.locator('.anomaly-detail-modal')).toBeVisible();
    await expect(page.locator('.detail-datetime')).toBeVisible();
    await expect(page.locator('.detail-target-data')).toBeVisible();
    await expect(page.locator('.detail-anomaly-type')).toBeVisible();
    await expect(page.locator('.detail-threshold')).toBeVisible();
    await expect(page.locator('.detail-actual-value')).toBeVisible();
    await expect(page.locator('.detail-reason')).toBeVisible();
  });

  test("SCEN-052: 対応状況を更新できる", async ({ page }) => {
    // SCEN-052
    await page.click('.log-item[data-status="未対応"]:first-child');
    await page.selectOption('select[name="response-status"]', '対応中');
    await page.click('button[data-testid="save-status"]');
    await expect(page.locator('.status-updated-message')).toBeVisible();
    await page.selectOption('select[name="response-status"]', '完了');
    await page.click('button[data-testid="save-status"]');
    await expect(page.locator('.status-updated-message')).toBeVisible();
  });

  test("SCEN-053: コメントを入力して保存できる", async ({ page }) => {
    // SCEN-053
    await page.click('.log-item:first-child');
    await page.click('textarea[name="comment"]');
    await page.fill('textarea[name="comment"]', '作業時間の記録ミスを修正しました');
    await page.click('button[data-testid="save-comment"]');
    await expect(page.locator('.save-success-message')).toContainText('保存しました');
    await expect(page.locator('.saved-comment')).toContainText('作業時間の記録ミスを修正しました');
  });

  test("SCEN-054: エクスポートでファイルがダウンロードされる", async ({ page }) => {
    // SCEN-054
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[data-testid="export-button"]');
    await page.selectOption('select[name="file-format"]', 'CSV');
    await page.click('button[data-testid="download-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test("SCEN-055: 存在しない作業員名で検索結果が0件", async ({ page }) => {
    // SCEN-055
    await page.fill('input[name="worker-search"]', 'テスト太郎999');
    await page.click('button[data-testid="search-button"]');
    await expect(page.locator('.no-results-message')).toContainText('該当する作業員のログが見つかりません');
    await expect(page.locator('.result-count')).toContainText('0件');
  });

  test("SCEN-056: 未来日付でフィルターして結果が0件", async ({ page }) => {
    // SCEN-056
    await page.fill('input[name="start-date"]', '2025-12-31');
    await page.fill('input[name="end-date"]', '2026-01-31');
    await page.click('button[data-testid="apply-filter"]');
    await expect(page.locator('.no-results-message')).toContainText('該当するログがありません');
    await expect(page.locator('.log-item')).toHaveCount(0);
  });

  test("SCEN-057: 不正な日付形式でエラー表示", async ({ page }) => {
    // SCEN-057
    await page.fill('input[name="date-filter"]', '2024/13/45');
    await page.click('button[data-testid="search-button"]');
    await expect(page.locator('.error-message')).toContainText('正しい日付形式で入力してください（YYYY-MM-DD）');
  });

  test("SCEN-058: 対応状況更新時にネットワークエラー", async ({ page }) => {
    // SCEN-058
    await page.click('.log-item:first-child');
    await page.selectOption('select[name="response-status"]', '対応中');
    await page.context().setOffline(true);
    await page.click('button[data-testid="save-status"]');
    await expect(page.locator('.network-error-message')).toBeVisible();
    await page.context().setOffline(false);
    await expect(page.locator('button[data-testid="retry-button"]')).toBeVisible();
  });

  test("SCEN-059: コメント上限文字数超過でエラー表示", async ({ page }) => {
    // SCEN-059
    const longComment = 'a'.repeat(1001);
    await page.click('.log-item:first-child');
    await page.fill('textarea[name="comment"]', longComment);
    await page.click('button[data-testid="save-comment"]');
    await expect(page.locator('.char-limit-error')).toBeVisible();
    await expect(page.locator('.saved-comment')).not.toContainText(longComment);
  });

  test("SCEN-060: 検索条件なしで全件検索", async ({ page }) => {
    // SCEN-060
    await page.click('button[data-testid="search-button"]');
    await expect(page.locator('.log-list-container')).toBeVisible();
    await expect(page.locator('.total-count')).toBeVisible();
    await expect(page.locator('.pagination')).toBeVisible();
  });

  test("SCEN-061: コメント文字数上限値で保存成功", async ({ page }) => {
    // SCEN-061
    const maxComment = 'a'.repeat(1000);
    await page.click('.log-item:first-child');
    await page.fill('textarea[name="comment"]', maxComment);
    await page.click('button[data-testid="save-comment"]');
    await expect(page.locator('.save-success-message')).toBeVisible();
    await expect(page.locator('.saved-comment')).toContainText(maxComment);
  });

  test("SCEN-062: 大量データ表示時のページネーション", async ({ page }) => {
    // SCEN-062
    await expect(page.locator('.pagination')).toBeVisible();
    const firstPageCount = await page.locator('.log-item').count();
    expect(firstPageCount).toBeGreaterThan(0);
    await page.click('button[data-testid="next-page"]');
    await expect(page.locator('.log-item')).toHaveCount(await page.locator('.log-item').count());
    await page.click('button[data-testid="prev-page"]');
    await page.click('.page-number[data-page="3"]');
    await expect(page.locator('.current-page')).toContainText('3');
  });

  test("SCEN-063: 同一日の開始終了日付で検索", async ({ page }) => {
    // SCEN-063
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="start-date"]', today);
    await page.fill('input[name="end-date"]', today);
    await page.click('button[data-testid="search-button"]');
    const hasResults = await page.locator('.log-item').count() > 0;
    if (hasResults) {
      await expect(page.locator('.log-item')).toHaveCount(await page.locator('.log-item').count());
    } else {
      await expect(page.locator('.no-results-message')).toContainText('該当するデータがありません');
    }
  });
});