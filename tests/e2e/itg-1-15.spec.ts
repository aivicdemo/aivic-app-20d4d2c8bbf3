import { test, expect } from '@playwright/test';

test.describe("異常値検出処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907309324.html");
  });

  test("SCEN-227: 検出対象期間選択して異常値検出実行", async ({ page }) => {
    // SCEN-227
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await page.fill('input[type="date"]:first-of-type', firstDay.toISOString().split('T')[0]);
    await page.fill('input[type="date"]:last-of-type', lastDay.toISOString().split('T')[0]);
    await page.click('button:has-text("検出実行")');
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('table')).toBeVisible();
  });

  test("SCEN-228: 検出進捗表示から完了まで確認", async ({ page }) => {
    // SCEN-228
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('text=0%')).toBeVisible();
    await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
    await page.waitForSelector('text=100%');
    await expect(page.locator('text=処理完了')).toBeVisible();
  });

  test("SCEN-229: 検出された異常値一覧表示", async ({ page }) => {
    // SCEN-229
    await page.click('button:has-text("検出実行")');
    await page.waitForSelector('text=処理完了');
    await page.click('button:has-text("異常値一覧")');
    await expect(page.locator('table thead')).toContainText('作業日時');
    await expect(page.locator('table thead')).toContainText('作業員名');
    await expect(page.locator('table thead')).toContainText('工数値');
  });

  test("SCEN-230: 異常値詳細情報表示", async ({ page }) => {
    // SCEN-230
    await page.click('tr .warning-icon');
    await expect(page.locator('.detail-panel')).toBeVisible();
    await expect(page.locator('text=異常値の種類')).toBeVisible();
    await expect(page.locator('text=検出理由')).toBeVisible();
    await expect(page.locator('text=修正推奨値')).toBeVisible();
  });

  test("SCEN-231: 検出ルール設定保存", async ({ page }) => {
    // SCEN-231
    await page.click('button:has-text("ルール設定")');
    await page.click('button:has-text("新規ルール作成")');
    await page.fill('input[placeholder="ルール名"]', '工数超過検出テスト');
    await page.selectOption('select', '作業時間');
    await page.fill('input[placeholder="閾値"]', '8');
    await page.check('input[type="checkbox"]:has-text("メール通知")');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=工数超過検出テスト')).toBeVisible();
  });

  test("SCEN-232: しきい値設定保存", async ({ page }) => {
    // SCEN-232
    await page.click('button:has-text("設定")');
    await page.fill('input[placeholder="上限"]', '12.0');
    await page.fill('input[placeholder="下限"]', '0.5');
    await page.fill('input[placeholder="効率"]', '50');
    await page.click('button:has-text("保存")');
    await page.click('button:has-text("はい")');
    await page.reload();
    await expect(page.locator('input[placeholder="上限"]')).toHaveValue('12.0');
  });

  test("SCEN-233: 除外条件設定保存", async ({ page }) => {
    // SCEN-233
    await page.click('button:has-text("除外条件設定")');
    await page.fill('input[placeholder="休憩時間"]', '30');
    await page.fill('input[placeholder="移動時間"]', '60');
    await page.fill('input[placeholder="待機時間"]', '120');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=設定完了')).toBeVisible();
    await page.reload();
    await expect(page.locator('input[placeholder="休憩時間"]')).toHaveValue('30');
  });

  test("SCEN-234: 検出結果フィルター適用", async ({ page }) => {
    // SCEN-234
    await page.selectOption('select[name="level"]', '高');
    await page.click('button:has-text("フィルター適用")');
    await page.selectOption('select[name="period"]', '過去7日間');
    await page.click('button:has-text("フィルター適用")');
    await page.click('button:has-text("クリア")');
    await expect(page.locator('select[name="level"]')).toHaveValue('');
  });

  test("SCEN-235: 異常値を承認処理", async ({ page }) => {
    // SCEN-235
    await page.check('input[type="checkbox"]');
    await page.fill('textarea[placeholder="承認理由"]', '確認済み');
    await page.click('button:has-text("承認")');
    await page.click('button:has-text("OK")');
    await expect(page.locator('text=承認済み')).toBeVisible();
    await expect(page.locator('text=承認完了')).toBeVisible();
  });

  test("SCEN-236: 異常値を却下処理", async ({ page }) => {
    // SCEN-236
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("却下")');
    await page.fill('textarea[placeholder="却下理由"]', '入力ミス');
    await page.click('button:has-text("確定")');
    await expect(page.locator('text=却下済み')).toBeVisible();
  });

  test("SCEN-237: 一括選択で複数処理", async ({ page }) => {
    // SCEN-237
    await page.check('input[type="checkbox"]:first-of-type');
    await page.click('button:has-text("異常値検出実行")');
    await page.click('button:has-text("実行")');
    await expect(page.locator('.progress-indicator')).toBeVisible();
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('text=成功')).toBeVisible();
  });

  test("SCEN-238: 検出ログ表示確認", async ({ page }) => {
    // SCEN-238
    await page.click('button:has-text("検出実行")');
    await page.waitForSelector('text=処理完了');
    await page.click('button:has-text("検出ログ表示")');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=検出日時')).toBeVisible();
    await expect(page.locator('text=検出レベル')).toBeVisible();
    await page.click('tr:first-of-type');
    await expect(page.locator('.detail-view')).toBeVisible();
  });

  test("SCEN-239: 期間未選択で検出実行エラー", async ({ page }) => {
    // SCEN-239
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('text=期間を選択してください')).toBeVisible();
  });

  test("SCEN-240: しきい値に無効値でエラー", async ({ page }) => {
    // SCEN-240
    await page.click('button:has-text("設定")');
    await page.fill('input[placeholder="しきい値"]', '-1');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=無効な値です')).toBeVisible();
  });

  test("SCEN-241: 検出中に重複実行でエラー", async ({ page }) => {
    // SCEN-241
    await page.click('button:has-text("検出実行")');
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('text=異常値検出処理が既に実行中です')).toBeVisible();
  });

  test("SCEN-242: 権限なしユーザーでアクセス拒否", async ({ page }) => {
    // SCEN-242
    await page.goto("/login.html");
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907309324.html");
    await expect(page.locator('text=403')).toBeVisible();
    await expect(page.locator('text=権限がありません')).toBeVisible();
  });

  test("SCEN-243: 大量データ処理でタイムアウト", async ({ page }) => {
    // SCEN-243
    await page.selectOption('select[name="period"]', '全期間');
    await page.click('button:has-text("検出実行")');
    await page.waitForTimeout(5000);
    await expect(page.locator('text=タイムアウト')).toBeVisible();
  });

  test("SCEN-244: 開始日＞終了日で期間エラー", async ({ page }) => {
    // SCEN-244
    await page.fill('input[type="date"]:first-of-type', '2024-12-15');
    await page.fill('input[type="date"]:last-of-type', '2024-12-10');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text=開始日は終了日より前の日付を入力してください')).toBeVisible();
  });

  test("SCEN-245: 最大期間範囲での検出実行", async ({ page }) => {
    // SCEN-245
    await page.fill('input[type="date"]:first-of-type', '2020-01-01');
    await page.fill('input[type="date"]:last-of-type', '2099-12-31');
    await page.check('input[name="all-workers"]');
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('.loading')).toBeVisible();
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('.pagination')).toBeVisible();
  });

  test("SCEN-246: しきい値境界値での検出", async ({ page }) => {
    // SCEN-246
    await page.click('button:has-text("設定")');
    await page.fill('input[placeholder="上限"]', '8');
    await page.click('button:has-text("保存")');
    await page.fill('input[placeholder="工数"]', '8:00');
    await page.fill('input[placeholder="工数"]', '8:01');
    await page.fill('input[placeholder="工数"]', '7:59');
    await page.click('button:has-text("検出実行")');
    await expect(page.locator('text=8:01')).toBeVisible();
    await expect(page.locator('text=8:00')).not.toBeVisible();
  });

  test("SCEN-247: 異常値0件時の表示", async ({ page }) => {
    // SCEN-247
    await page.click('button:has-text("検出実行")');
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('text=異常値が見つかりませんでした')).toBeVisible();
  });

  test("SCEN-248: 最大件数異常値の表示", async ({ page }) => {
    // SCEN-248
    await page.click('button:has-text("検出実行")');
    await page.waitForSelector('text=処理完了');
    await expect(page.locator('text=件数制限')).toBeVisible();
    await expect(page.locator('.pagination')).toBeVisible();
  });
});