import { test, expect } from '@playwright/test';

test.describe("異常値検出処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907309324.html");
  });

  test('SCEN-227: 検出対象期間選択して異常値検出実行', async ({ page }) => {
    // SCEN-227
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('input[type="date"]', firstDay.toISOString().split('T')[0]);
    await page.fill('input[type="date"]:nth-of-type(2)', lastDay.toISOString().split('T')[0]);
    await page.click('button:has-text("異常値検出実行")');
    await expect(page.locator('text=処理完了')).toBeVisible();
    await expect(page.locator('text=検出結果')).toBeVisible();
  });

  test('SCEN-228: 検出進捗表示から完了まで確認', async ({ page }) => {
    // SCEN-228
    await page.click('button:has-text("検出開始")');
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('text=0%')).toBeVisible();
    await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
    await page.waitForSelector('text=100%');
    await expect(page.locator('text=検出処理完了')).toBeVisible();
    await expect(page.locator('text=検出結果')).toBeVisible();
  });

  test('SCEN-229: 検出された異常値一覧表示', async ({ page }) => {
    // SCEN-229
    await page.click('button:has-text("異常値検出")');
    await page.waitForSelector('text=処理完了');
    await page.click('button:has-text("検出された異常値一覧")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("作業日時")')).toBeVisible();
    await expect(page.locator('th:has-text("作業員名")')).toBeVisible();
    await expect(page.locator('th:has-text("工数値")')).toBeVisible();
  });

  test('SCEN-230: 異常値詳細情報表示', async ({ page }) => {
    // SCEN-230
    await page.click('.anomaly-icon');
    await page.click('.work-record-row');
    await expect(page.locator('.anomaly-details')).toBeVisible();
    await expect(page.locator('text=異常値の種類')).toBeVisible();
    await expect(page.locator('text=検出理由')).toBeVisible();
    await expect(page.locator('text=修正推奨値')).toBeVisible();
  });

  test('SCEN-231: 検出ルール設定保存', async ({ page }) => {
    // SCEN-231
    await page.goto("/panels/anomaly-settings.html");
    await page.click('button:has-text("新規ルール作成")');
    await page.fill('input[name="ruleName"]', '工数超過検出テスト');
    await page.selectOption('select[name="condition"]', '作業時間');
    await page.fill('input[name="threshold"]', '8');
    await page.check('input[name="emailNotification"]');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=工数超過検出テスト')).toBeVisible();
  });

  test('SCEN-232: しきい値設定保存', async ({ page }) => {
    // SCEN-232
    await page.goto("/panels/anomaly-settings.html");
    await page.fill('input[name="upperThreshold"]', '12.0');
    await page.fill('input[name="lowerThreshold"]', '0.5');
    await page.fill('input[name="efficiencyThreshold"]', '50');
    await page.click('button:has-text("保存")');
    await page.click('button:has-text("はい")');
    await expect(page.locator('text=保存成功')).toBeVisible();
    await page.goto("/panels/anomaly-settings.html");
    await expect(page.locator('input[name="upperThreshold"]')).toHaveValue('12.0');
  });

  test('SCEN-233: 除外条件設定保存', async ({ page }) => {
    // SCEN-233
    await page.goto("/panels/anomaly-settings.html");
    await page.click('button:has-text("除外条件設定")');
    await page.fill('input[name="breakTime"]', '30');
    await page.fill('input[name="travelTime"]', '60');
    await page.fill('input[name="waitTime"]', '120');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=設定完了')).toBeVisible();
    await page.reload();
    await expect(page.locator('input[name="breakTime"]')).toHaveValue('30');
  });

  test('SCEN-234: 検出結果フィルター適用', async ({ page }) => {
    // SCEN-234
    await page.selectOption('select[name="anomalyLevel"]', '高');
    await page.click('button:has-text("フィルター適用")');
    await page.waitForSelector('.result-updated');
    await page.selectOption('select[name="period"]', '過去7日間');
    await page.click('button:has-text("フィルター適用")');
    await page.click('button:has-text("クリア")');
    await expect(page.locator('select[name="anomalyLevel"]')).toHaveValue('');
  });

  test('SCEN-235: 異常値を承認処理', async ({ page }) => {
    // SCEN-235
    await page.check('input[type="checkbox"]:first-of-type');
    await page.fill('textarea[name="approvalComment"]', '承認理由を入力');
    await page.click('button:has-text("承認")');
    await page.click('button:has-text("OK")');
    await expect(page.locator('text=承認済み')).toBeVisible();
    await expect(page.locator('text=承認完了')).toBeVisible();
  });

  test('SCEN-236: 異常値を却下処理', async ({ page }) => {
    // SCEN-236
    await page.check('input[type="checkbox"]:first-of-type');
    await page.click('button:has-text("却下")');
    await page.fill('textarea[placeholder="却下理由を入力"]', '却下理由テスト');
    await page.click('button:has-text("確定")');
    await expect(page.locator('text=却下済み')).toBeVisible();
  });

  test('SCEN-237: 一括選択で複数処理', async ({ page }) => {
    // SCEN-237
    await page.check('input[type="checkbox"][name="selectAll"]');
    await expect(page.locator('input[type="checkbox"]:not([name="selectAll"])')).toBeChecked();
    await page.click('button:has-text("異常値検出実行")');
    await page.click('button:has-text("実行")');
    await expect(page.locator('.progress-indicator')).toBeVisible();
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('text=成功')).toBeVisible();
  });

  test('SCEN-238: 検出ログ表示確認', async ({ page }) => {
    // SCEN-238
    await page.click('button:has-text("異常値検出")');
    await page.waitForSelector('text=処理完了');
    await page.click('button:has-text("検出ログ表示")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("検出日時")')).toBeVisible();
    await expect(page.locator('th:has-text("異常内容")')).toBeVisible();
    await expect(page.locator('th:has-text("検出レベル")')).toBeVisible();
  });

  test('SCEN-239: 期間未選択で検出実行エラー', async ({ page }) => {
    // SCEN-239
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('text=期間を選択してください')).toBeVisible();
  });

  test('SCEN-240: しきい値に無効値でエラー', async ({ page }) => {
    // SCEN-240
    await page.goto("/panels/anomaly-settings.html");
    await page.fill('input[name="threshold"]', '-1');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=無効な値です')).toBeVisible();
  });

  test('SCEN-241: 検出中に重複実行でエラー', async ({ page }) => {
    // SCEN-241
    await page.click('button:has-text("異常値検出")');
    await page.click('button:has-text("異常値検出")');
    await expect(page.locator('text=異常値検出処理が既に実行中です')).toBeVisible();
  });

  test('SCEN-242: 権限なしユーザーでアクセス拒否', async ({ page }) => {
    // SCEN-242
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'guest');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907309324.html");
    await expect(page.locator('text=403')).toBeVisible();
    await expect(page.locator('text=権限がありません')).toBeVisible();
  });

  test('SCEN-243: 大量データ処理でタイムアウト', async ({ page }) => {
    // SCEN-243
    await page.selectOption('select[name="period"]', 'all');
    await page.click('button:has-text("異常値検出")');
    await page.waitForTimeout(5000);
    await expect(page.locator('text=タイムアウト')).toBeVisible();
    await expect(page.locator('button')).toBeEnabled();
  });

  test('SCEN-244: 開始日＞終了日で期間エラー', async ({ page }) => {
    // SCEN-244
    await page.fill('input[name="startDate"]', '2024-12-15');
    await page.fill('input[name="endDate"]', '2024-12-10');
    await page.fill('input[name="workContent"]', 'テスト作業');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text=開始日は終了日より前の日付を入力してください')).toBeVisible();
  });

  test('SCEN-245: 最大期間範囲での検出実行', async ({ page }) => {
    // SCEN-245
    await page.fill('input[name="startDate"]', '2020-01-01');
    await page.fill('input[name="endDate"]', '2099-12-31');
    await page.check('input[name="allWorkers"]');
    await page.click('button:has-text("異常値検出")');
    await expect(page.locator('.loading')).toBeVisible();
    await page.waitForSelector('text=検出結果');
    await expect(page.locator('.pagination')).toBeVisible();
  });

  test('SCEN-246: しきい値境界値での検出', async ({ page }) => {
    // SCEN-246
    await page.goto("/panels/work-input.html");
    await page.fill('input[name="workHours"]', '8');
    await page.click('button:has-text("保存")');
    await page.fill('input[name="workHours"]', '8.02');
    await page.click('button:has-text("保存")');
    await page.fill('input[name="workHours"]', '7.98');
    await page.click('button:has-text("保存")');
    await page.goto("/panels/scr-1778907309324.html");
    await page.click('button:has-text("異常値検出")');
    await expect(page.locator('text=8.02')).toBeVisible();
    await expect(page.locator('text=8')).not.toBeVisible();
  });

  test('SCEN-247: 異常値0件時の表示', async ({ page }) => {
    // SCEN-247
    await page.selectOption('select[name="dataset"]', 'normal');
    await page.click('button:has-text("異常値検出")');
    await expect(page.locator('text=異常値は検出されませんでした')).toBeVisible();
  });

  test('SCEN-248: 最大件数異常値の表示', async ({ page }) => {
    // SCEN-248
    await page.click('button:has-text("異常値検出")');
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('text=件数制限')).toBeVisible();
    await expect(page.locator('.pagination')).toBeVisible();
    await page.click('button:has-text("次へ")');
    await expect(page.locator('table')).toBeVisible();
  });
});