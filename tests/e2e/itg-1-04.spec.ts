import { test, expect } from '@playwright/test';

test.describe("異常値検出ログ画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907170814.html");
  });

  test("SCEN-043: 異常値検出ログ一覧が正常に表示される", async ({ page }) => {
    // SCEN-043
    await expect(page.getByTestId('anomaly-log-table')).toBeVisible();
    await expect(page.locator('#anomaly-log-tbody tr').first()).toBeVisible();
    await expect(page.locator('#result-count')).toBeVisible();
  });

  test("SCEN-044: 検出日時フィルターで期間絞り込みができる", async ({ page }) => {
    // SCEN-044
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01 00:00');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31 23:59');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#anomaly-log-tbody tr')).toHaveCount(0);
  });

  test("SCEN-045: 異常値タイプで絞り込みができる", async ({ page }) => {
    // SCEN-045
    await page.selectOption('[data-testid="anomaly-type-filter"]', '工数超過');
    await page.click('[data-testid="search-button"]');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '工数不足');
    await page.click('[data-testid="search-button"]');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '');
    await page.click('[data-testid="search-button"]');
    await expect(page.getByTestId('anomaly-log-table')).toBeVisible();
  });

  test("SCEN-046: 作業員名検索で該当データが抽出される", async ({ page }) => {
    // SCEN-046
    await page.fill('[data-testid="worker-name-search"]', '田中太郎');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  test("SCEN-047: 作業項目絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-047
    await page.selectOption('[data-testid="work-item-filter"]', '設備点検');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#anomaly-log-tbody')).toBeVisible();
  });

  test("SCEN-048: ステータス絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-048
    await page.selectOption('[data-testid="status-filter"]', '未処理');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#anomaly-log-tbody')).toBeVisible();
  });

  test("SCEN-049: 複数条件組み合わせで検索できる", async ({ page }) => {
    // SCEN-049
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '警告');
    await page.selectOption('[data-testid="work-item-filter"]', '機械保守');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  test("SCEN-050: フィルタークリアで全条件がリセットされる", async ({ page }) => {
    // SCEN-050
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '警告');
    await page.selectOption('[data-testid="status-filter"]', '未処理');
    await page.click('[data-testid="search-button"]');
    await page.click('[data-testid="clear-filters-button"]');
    await expect(page.getByTestId('start-date-filter')).toHaveValue('');
    await expect(page.getByTestId('end-date-filter')).toHaveValue('');
  });

  test("SCEN-051: 異常値詳細が正常に表示される", async ({ page }) => {
    // SCEN-051
    await page.click('#anomaly-log-tbody tr:first-child');
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
    await page.click('#close-modal');
  });

  test("SCEN-052: 対応状況を更新できる", async ({ page }) => {
    // SCEN-052
    await page.click('#anomaly-log-tbody tr:first-child');
    await page.selectOption('#status-update', '対応中');
    await page.click('#btn-update-status');
    await expect(page.locator('#success-message')).toBeVisible();
    await page.selectOption('#status-update', '完了');
    await page.click('#btn-update-status');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-053: コメントを入力して保存できる", async ({ page }) => {
    // SCEN-053
    await page.click('#anomaly-log-tbody tr:first-child');
    await page.fill('#response-memo', '作業時間の記録ミスを修正しました');
    await page.click('#btn-update-status');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-054: エクスポートでファイルがダウンロードされる", async ({ page }) => {
    // SCEN-054
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test("SCEN-055: 存在しない作業員名で検索結果が0件", async ({ page }) => {
    // SCEN-055
    await page.fill('[data-testid="worker-name-search"]', 'テスト太郎999');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#anomaly-log-tbody tr')).toHaveCount(0);
    await expect(page.locator('#result-count')).toContainText('0件');
  });

  test("SCEN-056: 未来日付でフィルターして結果が0件", async ({ page }) => {
    // SCEN-056
    await page.fill('[data-testid="start-date-filter"]', '2025-12-31');
    await page.fill('[data-testid="end-date-filter"]', '2026-01-31');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#anomaly-log-tbody tr')).toHaveCount(0);
  });

  test("SCEN-057: 不正な日付形式でエラー表示", async ({ page }) => {
    // SCEN-057
    await page.fill('[data-testid="start-date-filter"]', '2024/13/45');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-058: 対応状況更新時にネットワークエラー", async ({ page }) => {
    // SCEN-058
    await page.click('#anomaly-log-tbody tr:first-child');
    await page.selectOption('#status-update', '対応中');
    await page.context().setOffline(true);
    await page.click('#btn-update-status');
    await expect(page.locator('#error-message')).toBeVisible();
    await page.context().setOffline(false);
  });

  test("SCEN-059: コメント上限文字数超過でエラー表示", async ({ page }) => {
    // SCEN-059
    await page.click('#anomaly-log-tbody tr:first-child');
    const longText = 'a'.repeat(1001);
    await page.fill('#response-memo', longText);
    await page.click('#btn-update-status');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-060: 検索条件なしで全件検索", async ({ page }) => {
    // SCEN-060
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
    await expect(page.getByTestId('anomaly-log-table')).toBeVisible();
  });

  test("SCEN-061: コメント文字数上限値で保存成功", async ({ page }) => {
    // SCEN-061
    await page.click('#anomaly-log-tbody tr:first-child');
    const maxText = 'a'.repeat(1000);
    await page.fill('#response-memo', maxText);
    await page.click('#btn-update-status');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-062: 大量データ表示時のページネーション", async ({ page }) => {
    // SCEN-062
    await expect(page.locator('#pagination')).toBeVisible();
    await page.click('#pagination button:has-text("▶")');
    await expect(page.locator('#anomaly-log-tbody tr')).toHaveCountGreaterThan(0);
  });

  test("SCEN-063: 同一日の開始終了日付で検索", async ({ page }) => {
    // SCEN-063
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="start-date-filter"]', today);
    await page.fill('[data-testid="end-date-filter"]', today);
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });
});