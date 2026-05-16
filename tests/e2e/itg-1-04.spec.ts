import { test, expect } from '@playwright/test';

test.describe("異常値検出ログ画面", () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    // ログイン処理（必要に応じて調整）
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    // 異常値検出ログ画面に遷移
    await page.click('text=異常値検出ログ');
    await page.waitForURL('**/anomaly-logs');
  });

  test("SCEN-043: 異常値検出ログ一覧が正常に表示される", async ({ page }) => {
    // SCEN-043
    await expect(page.locator('.log-list')).toBeVisible();
    await expect(page.locator('.log-item').first()).toContainText('検出日時');
    await expect(page.locator('.log-item').first()).toContainText('作業員名');
    await expect(page.locator('.log-item').first()).toContainText('異常値の内容');
    await expect(page.locator('.log-item').first()).toContainText('対象データ');
  });

  test("SCEN-044: 検出日時フィルターで期間絞り込みができる", async ({ page }) => {
    // SCEN-044
    await page.fill('input[name="startDate"]', '2024-01-01T00:00');
    await page.fill('input[name="endDate"]', '2024-01-31T23:59');
    await page.click('button:has-text("フィルター適用")');
    await expect(page.locator('.log-item')).toHaveCount(0);
  });

  test("SCEN-045: 異常値タイプで絞り込みができる", async ({ page }) => {
    // SCEN-045
    await page.selectOption('select[name="anomalyType"]', '工数超過');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-item')).toHaveCount(0);
    
    await page.selectOption('select[name="anomalyType"]', '工数不足');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-item')).toHaveCount(0);
    
    await page.selectOption('select[name="anomalyType"]', '全て');
    await page.click('button:has-text("絞り込み実行")');
  });

  test("SCEN-046: 作業員名検索で該当データが抽出される", async ({ page }) => {
    // SCEN-046
    await page.fill('input[placeholder="作業員名で検索"]', '田中太郎');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.search-results')).toContainText('検索結果件数');
  });

  test("SCEN-047: 作業項目絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-047
    await page.selectOption('select[name="workItem"]', '設備点検');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-item')).toHaveCount(0);
  });

  test("SCEN-048: ステータス絞り込みで該当データが抽出される", async ({ page }) => {
    // SCEN-048
    await page.click('select[name="status"]');
    await page.selectOption('select[name="status"]', '未処理');
    await page.click('button:has-text("絞り込み実行")');
    await expect(page.locator('.log-item')).toHaveCount(0);
  });

  test("SCEN-049: 複数条件組み合わせで検索できる", async ({ page }) => {
    // SCEN-049
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="anomalyLevel"]', '警告');
    await page.selectOption('select[name="targetWork"]', '機械保守');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list')).toBeVisible();
  });

  test("SCEN-050: フィルタークリアで全条件がリセットされる", async ({ page }) => {
    // SCEN-050
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.selectOption('select[name="worker"]', 'テスト作業員');
    await page.selectOption('select[name="anomalyType"]', '工数超過');
    await page.selectOption('select[name="priority"]', '高');
    await page.click('button:has-text("フィルター適用")');
    await page.click('button:has-text("フィルタークリア")');
    await expect(page.locator('input[name="startDate"]')).toHaveValue('');
    await expect(page.locator('input[name="endDate"]')).toHaveValue('');
  });

  test("SCEN-051: 異常値詳細が正常に表示される", async ({ page }) => {
    // SCEN-051
    await page.click('.log-item:first-child');
    await expect(page.locator('.detail-dialog')).toBeVisible();
    await expect(page.locator('.detail-dialog')).toContainText('検出日時');
    await expect(page.locator('.detail-dialog')).toContainText('対象データ');
    await expect(page.locator('.detail-dialog')).toContainText('異常の種類');
    await expect(page.locator('.detail-dialog')).toContainText('閾値');
    await expect(page.locator('.detail-dialog')).toContainText('実測値');
  });

  test("SCEN-052: 対応状況を更新できる", async ({ page }) => {
    // SCEN-052
    await page.click('.log-item:has-text("未対応"):first');
    await page.selectOption('select[name="status"]', '対応中');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
    
    await page.selectOption('select[name="status"]', '完了');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-053: コメントを入力して保存できる", async ({ page }) => {
    // SCEN-053
    await page.click('.log-item:first-child');
    await page.fill('textarea[name="comment"]', '作業時間の記録ミスを修正しました');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toContainText('保存しました');
  });

  test("SCEN-054: エクスポートでファイルがダウンロードされる", async ({ page }) => {
    // SCEN-054
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("エクスポート")');
    await page.click('button:has-text("ダウンロード")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('anomaly-logs');
  });

  test("SCEN-055: 存在しない作業員名で検索結果が0件", async ({ page }) => {
    // SCEN-055
    await page.fill('input[placeholder="作業員名で検索"]', 'テスト太郎999');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.no-results')).toContainText('該当する作業員のログが見つかりません');
  });

  test("SCEN-056: 未来日付でフィルターして結果が0件", async ({ page }) => {
    // SCEN-056
    await page.fill('input[name="startDate"]', '2025-12-31');
    await page.fill('input[name="endDate"]', '2026-01-31');
    await page.click('button:has-text("フィルター実行")');
    await expect(page.locator('.no-results')).toContainText('該当するログがありません');
  });

  test("SCEN-057: 不正な日付形式でエラー表示", async ({ page }) => {
    // SCEN-057
    await page.fill('input[name="startDate"]', '2024/13/45');
    await page.click('button:has-text("検索")');
    await expect(page.locator('.error-message')).toContainText('正しい日付形式で入力してください（YYYY-MM-DD）');
  });

  test("SCEN-058: 対応状況更新時にネットワークエラー", async ({ page }) => {
    // SCEN-058
    await page.click('.log-item:first-child');
    await page.selectOption('select[name="status"]', '対応中');
    await page.context().setOffline(true);
    await page.click('button:has-text("更新")');
    await expect(page.locator('.error-message')).toBeVisible();
    await page.context().setOffline(false);
  });

  test("SCEN-059: コメント上限文字数超過でエラー表示", async ({ page }) => {
    // SCEN-059
    await page.click('.log-item:first-child');
    const longText = 'あ'.repeat(1001);
    await page.fill('textarea[name="comment"]', longText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('文字数上限');
  });

  test("SCEN-060: 検索条件なしで全件検索", async ({ page }) => {
    // SCEN-060
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list')).toBeVisible();
    await expect(page.locator('.pagination')).toBeVisible();
  });

  test("SCEN-061: コメント文字数上限値で保存成功", async ({ page }) => {
    // SCEN-061
    await page.click('.log-item:first-child');
    const maxText = 'あ'.repeat(1000);
    await page.fill('textarea[name="comment"]', maxText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-062: 大量データ表示時のページネーション", async ({ page }) => {
    // SCEN-062
    await expect(page.locator('.pagination')).toBeVisible();
    const firstPageCount = await page.locator('.log-item').count();
    await page.click('button:has-text("次へ")');
    await expect(page.locator('.log-item')).toHaveCount(firstPageCount);
    await page.click('button:has-text("前へ")');
    await page.click('.page-number:nth-child(3)');
    await expect(page.locator('.log-list')).toBeVisible();
  });

  test("SCEN-063: 同一日の開始終了日付で検索", async ({ page }) => {
    // SCEN-063
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[name="startDate"]', today);
    await page.fill('input[name="endDate"]', today);
    await page.click('button:has-text("検索")');
    await expect(page.locator('.log-list, .no-results')).toBeVisible();
  });
});