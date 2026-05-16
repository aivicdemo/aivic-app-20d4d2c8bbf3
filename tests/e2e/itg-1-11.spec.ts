import { test, expect } from '@playwright/test';

test.describe("入力チェック機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907263518.html");
  });

  test("SCEN-157: 全項目正常入力でチェック通過", async ({ page }) => {
    // SCEN-157
    await page.fill('input[name="work_date"]', '2024/01/15');
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '17:00');
    await page.fill('input[name="break_time"]', '60');
    await page.fill('input[name="work_content"]', '配管工事');
    await page.fill('input[name="work_location"]', 'A棟1階');
    await page.fill('input[name="worker_name"]', '山田太郎');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-158: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-158
    await page.click('button:has-text("登録")');
    await expect(page.locator('.error-message')).toContainText('作業日');
    await expect(page.locator('.error-message')).toContainText('作業内容');
    await expect(page.locator('.error-message')).toContainText('作業時間');
  });

  test("SCEN-159: 不正な日時形式でフォーマットエラー", async ({ page }) => {
    // SCEN-159
    await page.fill('input[name="start_datetime"]', '2024/13/45 25:70');
    await page.fill('input[name="end_datetime"]', 'abc-def-ghi');
    await page.fill('input[name="work_content"]', '配管作業');
    await page.fill('input[name="work_location"]', 'B棟');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.format-error')).toBeVisible();
  });

  test("SCEN-160: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-160
    await page.selectOption('select[name="work_item"]', 'maintenance');
    await page.fill('input[name="start_time"]', '14:00');
    await page.fill('input[name="end_time"]', '10:00');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('開始時刻は終了時刻より前に設定してください');
  });

  test("SCEN-161: 24時間超過の作業時間で警告", async ({ page }) => {
    // SCEN-161
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '10:00');
    await page.check('input[name="next_day"]');
    await page.fill('input[name="work_content"]', 'システム保守');
    await page.selectOption('select[name="project"]', 'proj1');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.warning-message')).toContainText('24時間を超過');
  });

  test("SCEN-162: 同一日時の重複データで検出アラート", async ({ page }) => {
    // SCEN-162
    await page.fill('input[name="work_datetime"]', '2024-01-15 09:00');
    await page.fill('input[name="work_content"]', '設備点検作業');
    await page.fill('input[name="work_hours"]', '2');
    await page.click('button:has-text("登録")');
    await page.waitForSelector('.success-message');
    
    await page.click('button:has-text("新規作成")');
    await page.fill('input[name="work_datetime"]', '2024-01-15 09:00');
    await page.fill('input[name="work_content"]', '清掃作業');
    await page.fill('input[name="work_hours"]', '1');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.alert-message')).toContainText('指定された日時には既に作業記録が登録されています');
  });

  test("SCEN-163: 異常に短い作業時間で通知表示", async ({ page }) => {
    // SCEN-163
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '09:01');
    await page.fill('input[name="work_content"]', '点検作業');
    await page.fill('input[name="work_location"]', 'C棟');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.notification, .warning-dialog')).toContainText('異常に短い作業時間');
  });

  test("SCEN-164: 異常に長い作業時間で通知表示", async ({ page }) => {
    // SCEN-164
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '32:00');
    await page.fill('input[name="work_content"]', '保守作業');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.warning-notification')).toContainText('作業時間が異常に長く設定されています');
  });

  test("SCEN-165: エラー詳細確認ボタンで詳細表示", async ({ page }) => {
    // SCEN-165
    await page.click('button:has-text("登録")');
    await page.waitForSelector('.error-message');
    await page.click('button:has-text("詳細確認")');
    await expect(page.locator('.error-detail-dialog, .error-detail-area')).toBeVisible();
    await expect(page.locator('.error-list')).toContainText('必須項目未入力');
  });

  test("SCEN-166: 入力修正提案が適切に表示", async ({ page }) => {
    // SCEN-166
    await page.fill('input[name="work_item_name"]', '@@##');
    await page.fill('input[name="work_hours"]', '-5');
    await page.fill('input[name="work_date"]', 'invalid-date');
    await page.click('button:has-text("確認")');
    await expect(page.locator('.suggestion-message')).toBeVisible();
    
    await page.fill('input[name="work_item_name"]', '配管作業');
    await page.fill('input[name="work_hours"]', '8');
    await page.fill('input[name="work_date"]', '2024-01-15');
    await page.click('button:has-text("送信")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-167: エラー有りでステータスアイコン赤", async ({ page }) => {
    // SCEN-167
    await page.fill('input[name="work_hours"]', '-5');
    await page.fill('textarea[name="work_content"]', 'a'.repeat(1001));
    await page.click('button:has-text("保存")');
    await expect(page.locator('.status-icon.red, .status-icon.error')).toBeVisible();
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test("SCEN-168: チェック通過でステータスアイコン緑", async ({ page }) => {
    // SCEN-168
    await page.fill('input[name="work_date"]', '2024-01-15');
    await page.fill('input[name="work_hours"]', '8.0');
    await page.fill('input[name="work_content"]', 'システム開発作業');
    await page.selectOption('select[name="project_name"]', 'project1');
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-icon.green, .status-icon.success')).toBeVisible();
  });

  test("SCEN-169: エラー有りで保存不可表示", async ({ page }) => {
    // SCEN-169
    await page.fill('input[name="work_hours"]', '25');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('button:has-text("保存")')).toBeDisabled();
  });

  test("SCEN-170: チェック通過で保存可能表示", async ({ page }) => {
    // SCEN-170
    await page.fill('input[name="work_date"]', '2024-01-15');
    await page.fill('input[name="work_hours"]', '8.0');
    await page.fill('input[name="work_content"]', 'システム開発');
    await page.selectOption('select[name="project_name"]', 'project1');
    await expect(page.locator('button:has-text("保存")')).toBeEnabled();
    await expect(page.locator('.save-status')).toContainText('保存可能');
  });

  test("SCEN-171: エラーログ出力ボタンでログ生成", async ({ page }) => {
    // SCEN-171
    await page.click('button:has-text("設定"), button:has-text("システム")');
    await page.waitForSelector('button:has-text("エラーログ出力")');
    await page.click('button:has-text("エラーログ出力")');
    await expect(page.locator('.log-generation-message, .download-complete')).toContainText('ログファイル');
  });

  test("SCEN-172: ガイダンスパネルが適切に表示", async ({ page }) => {
    // SCEN-172
    await page.focus('input[name="work_content"]');
    await expect(page.locator('.guidance-panel')).toBeVisible();
    
    await page.focus('input[name="work_date"]');
    await expect(page.locator('.guidance-panel')).toBeHidden();
    
    await page.focus('input[name="work_content"]');
    await expect(page.locator('.guidance-panel')).toBeVisible();
    await expect(page.locator('.guidance-panel')).toContainText('入力ガイダンス');
  });

  test("SCEN-173: 最大文字数境界値で入力チェック", async ({ page }) => {
    // SCEN-173
    const maxText = 'a'.repeat(200);
    const overText = 'a'.repeat(201);
    
    await page.fill('textarea[name="work_content"]', maxText);
    await page.fill('input[name="work_date"]', '2024-01-15');
    await page.fill('input[name="work_hours"]', '8');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
    
    await page.fill('textarea[name="work_content"]', overText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('文字数');
  });

  test("SCEN-174: 複数エラー同時発生で全て表示", async ({ page }) => {
    // SCEN-174
    await page.fill('input[name="start_time"]', '25:99');
    await page.fill('input[name="end_time"]', 'abc');
    await page.fill('input[name="work_hours"]', '-5');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message')).toContainText('作業日付は必須です');
    await expect(page.locator('.error-message')).toContainText('開始時刻の形式が正しくありません');
    await expect(page.locator('.error-message')).toContainText('終了時刻の形式が正しくありません');
    await expect(page.locator('.error-message')).toContainText('作業内容は必須です');
    await expect(page.locator('.error-message')).toContainText('作業時間は正の値で入力してください');
  });
});