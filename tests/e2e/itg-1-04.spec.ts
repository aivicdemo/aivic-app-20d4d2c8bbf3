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

  // SCEN-043
  test('[normal] 異常値検出ログ一覧が正常に表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="anomaly-log-table"]')).toBeVisible();
    const headerRow = page.locator('[data-testid="anomaly-log-table"] thead tr');
    await expect(headerRow).toContainText('検出日時');
    await expect(headerRow).toContainText('作業員名');
    await expect(headerRow).toContainText('異常値種別');
    await expect(headerRow).toContainText('対象データ');
  });

  // SCEN-044
  test('[normal] 検出日時フィルターで期間絞り込みができる', async ({ page }) => {
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01T00:00');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31T23:59');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  // SCEN-045
  test('[normal] 異常値タイプで絞り込みができる', async ({ page }) => {
    await page.selectOption('[data-testid="anomaly-type-filter"]', '工数超過');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
    
    await page.selectOption('[data-testid="anomaly-type-filter"]', '工数不足');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
    
    await page.click('[data-testid="clear-filters-button"]');
    await expect(page.locator('[data-testid="anomaly-type-filter"]')).toHaveValue('');
  });

  // SCEN-046
  test('[normal] 作業員名検索で該当データが抽出される', async ({ page }) => {
    await page.fill('[data-testid="worker-name-search"]', '田中太郎');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  // SCEN-047
  test('[normal] 作業項目絞り込みで該当データが抽出される', async ({ page }) => {
    await page.selectOption('[data-testid="work-item-filter"]', '設備点検');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  // SCEN-048
  test('[normal] ステータス絞り込みで該当データが抽出される', async ({ page }) => {
    await page.selectOption('[data-testid="status-filter"]', '未処理');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  // SCEN-049
  test('[normal] 複数条件組み合わせで検索できる', async ({ page }) => {
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '警告');
    await page.selectOption('[data-testid="work-item-filter"]', '機械保守');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('#result-count')).toBeVisible();
  });

  // SCEN-050
  test('[normal] フィルタークリアで全条件がリセットされる', async ({ page }) => {
    await page.fill('[data-testid="start-date-filter"]', '2024-01-01');
    await page.fill('[data-testid="end-date-filter"]', '2024-01-31');
    await page.selectOption('[data-testid="anomaly-type-filter"]', '警告');
    await page.selectOption('[data-testid="status-filter"]', '未処理');
    await page.click('[data-testid="search-button"]');
    
    await page.click('[data-testid="clear-filters-button"]');
    
    await expect(page.locator('[data-testid="start-date-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="end-date-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="anomaly-type-filter"]')).toHaveValue('');
    await expect(page.locator('[data-testid="status-filter"]')).toHaveValue('');
  });

  // SCEN-051
  test('[normal] 異常値詳細が正常に表示される', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    await expect(page.locator('#detail-content')).toBeVisible();
    
    await page.click('#close-modal');
    await expect(page.locator('#detail-modal')).not.toBeVisible();
  });

  // SCEN-052
  test('[normal] 対応状況を更新できる', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    await page.selectOption('#status-update', '対応中');
    await page.click('#btn-update-status');
    
    await expect(page.locator('#success-message')).toBeVisible();
    
    await page.selectOption('#status-update', '完了');
    await page.click('#btn-update-status');
    
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-053
  test('[normal] コメントを入力して保存できる', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    await page.fill('#response-memo', '作業時間の記録ミスを修正しました');
    await page.click('#btn-update-status');
    
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-054
  test('[normal] エクスポートでファイルがダウンロードされる', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-button"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('anomaly_log');
  });

  // SCEN-055
  test('[error] 存在しない作業員名で検索結果が0件', async ({ page }) => {
    await page.fill('[data-testid="worker-name-search"]', 'テスト太郎999');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#result-count')).toContainText('0件');
  });

  // SCEN-056
  test('[error] 未来日付でフィルターして結果が0件', async ({ page }) => {
    await page.fill('[data-testid="start-date-filter"]', '2025-12-31');
    await page.fill('[data-testid="end-date-filter"]', '2026-01-31');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#result-count')).toContainText('0件');
  });

  // SCEN-057
  test('[error] 不正な日付形式でエラー表示', async ({ page }) => {
    await page.fill('[data-testid="start-date-filter"]', '2024/13/45');
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('正しい日付形式');
  });

  // SCEN-058
  test('[error] 対応状況更新時にネットワークエラー', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    await page.selectOption('#status-update', '対応中');
    
    await page.context().setOffline(true);
    await page.click('#btn-update-status');
    
    await expect(page.locator('#error-message')).toBeVisible();
    
    await page.context().setOffline(false);
  });

  // SCEN-059
  test('[error] コメント上限文字数超過でエラー表示', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    const longText = 'あ'.repeat(1001);
    await page.fill('#response-memo', longText);
    await page.click('#btn-update-status');
    
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('文字数');
  });

  // SCEN-060
  test('[edge] 検索条件なしで全件検索', async ({ page }) => {
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#result-count')).toBeVisible();
    await expect(page.locator('[data-testid="anomaly-log-table"]')).toBeVisible();
  });

  // SCEN-061
  test('[edge] コメント文字数上限値で保存成功', async ({ page }) => {
    const firstRow = page.locator('#anomaly-log-tbody tr').first();
    await firstRow.click();
    
    await expect(page.locator('#detail-modal')).toBeVisible();
    const maxText = 'あ'.repeat(1000);
    await page.fill('#response-memo', maxText);
    await page.click('#btn-update-status');
    
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-062
  test('[edge] 大量データ表示時のページネーション', async ({ page }) => {
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#pagination')).toBeVisible();
    
    const nextButton = page.locator('#pagination button:has-text("▶")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.locator('[data-testid="anomaly-log-table"]')).toBeVisible();
    }
  });

  // SCEN-063
  test('[edge] 同一日の開始終了日付で検索', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="start-date-filter"]', today);
    await page.fill('[data-testid="end-date-filter"]', today);
    await page.click('[data-testid="search-button"]');
    
    await expect(page.locator('#result-count')).toBeVisible();
  });
});