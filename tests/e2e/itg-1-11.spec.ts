import { test, expect } from '@playwright/test';

test.describe("入力チェック機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test('SCEN-157: 全項目正常入力でチェック通過', async ({ page }) => {
    // SCEN-157
    await page.goto('/');
    await page.fill('[data-testid="work-date"]', '2024/01/15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await page.fill('[data-testid="work-content"]', '配管工事');
    await page.fill('[data-testid="work-location"]', 'A棟1階');
    await page.fill('[data-testid="worker-name"]', '山田太郎');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('SCEN-158: 必須項目未入力でエラー表示', async ({ page }) => {
    // SCEN-158
    await page.goto('/');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('必須項目');
  });

  test('SCEN-159: 不正な日時形式でフォーマットエラー', async ({ page }) => {
    // SCEN-159
    await page.goto('/');
    await page.fill('[data-testid="start-datetime"]', '2024/13/45 25:70');
    await page.fill('[data-testid="end-datetime"]', 'abc-def-ghi');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('button:has-text("保存")');
    await expect(page.locator('[data-testid="format-error"]')).toBeVisible();
  });

  test('SCEN-160: 開始時刻が終了時刻より後でエラー', async ({ page }) => {
    // SCEN-160
    await page.goto('/');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('button:has-text("保存")');
    await expect(page.locator('[data-testid="time-error"]')).toContainText('開始時刻は終了時刻より前に設定してください');
  });

  test('SCEN-161: 24時間超過の作業時間で警告', async ({ page }) => {
    // SCEN-161
    await page.goto('/');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '10:00（翌日）');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="warning-message"]')).toContainText('24時間を超過');
  });

  test('SCEN-162: 同一日時の重複データで検出アラート', async ({ page }) => {
    // SCEN-162
    await page.goto('/');
    await page.fill('[data-testid="work-datetime"]', '2024-01-15 09:00');
    await page.fill('[data-testid="work-content"]', '設備点検作業');
    await page.fill('[data-testid="work-hours"]', '2時間');
    await page.click('button:has-text("登録")');
    await page.fill('[data-testid="work-datetime"]', '2024-01-15 09:00');
    await page.fill('[data-testid="work-content"]', '清掃作業');
    await page.fill('[data-testid="work-hours"]', '1時間');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="duplicate-alert"]')).toContainText('既に作業記録が登録されています');
  });

  test('SCEN-163: 異常に短い作業時間で通知表示', async ({ page }) => {
    // SCEN-163
    await page.goto('/');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '09:01');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="short-time-warning"]')).toBeVisible();
  });

  test('SCEN-164: 異常に長い作業時間で通知表示', async ({ page }) => {
    // SCEN-164
    await page.goto('/');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '32:00');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="long-time-warning"]')).toContainText('異常に長く設定されています');
  });

  test('SCEN-165: エラー詳細確認ボタンで詳細表示', async ({ page }) => {
    // SCEN-165
    await page.goto('/');
    await page.click('button:has-text("登録")');
    await page.click('button:has-text("詳細確認")');
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
  });

  test('SCEN-166: 入力修正提案が適切に表示', async ({ page }) => {
    // SCEN-166
    await page.goto('/');
    await page.fill('[data-testid="work-item"]', '###');
    await page.fill('[data-testid="work-time"]', '-5');
    await page.fill('[data-testid="work-date"]', 'invalid-date');
    await page.click('button:has-text("確認")');
    await expect(page.locator('[data-testid="correction-suggestion"]')).toBeVisible();
  });

  test('SCEN-167: エラー有りでステータスアイコン赤', async ({ page }) => {
    // SCEN-167
    await page.goto('/');
    await page.fill('[data-testid="work-time"]', '-5');
    await page.fill('[data-testid="work-content"]', 'a'.repeat(1000));
    await page.click('button:has-text("保存")');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/.*red.*/);
  });

  test('SCEN-168: チェック通過でステータスアイコン緑', async ({ page }) => {
    // SCEN-168
    await page.goto('/');
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="work-time"]', '8.0');
    await page.fill('[data-testid="work-content"]', 'システム開発作業');
    await page.selectOption('[data-testid="project-select"]', 'project1');
    await expect(page.locator('[data-testid="status-icon"]')).toHaveClass(/.*green.*/);
  });

  test('SCEN-169: エラー有りで保存不可表示', async ({ page }) => {
    // SCEN-169
    await page.goto('/');
    await page.fill('[data-testid="work-time"]', '25');
    await page.click('button:has-text("保存")');
    await expect(page.locator('button:has-text("保存")')).toBeDisabled();
  });

  test('SCEN-170: チェック通過で保存可能表示', async ({ page }) => {
    // SCEN-170
    await page.goto('/');
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="work-time"]', '8.0');
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.selectOption('[data-testid="project-select"]', 'project1');
    await expect(page.locator('button:has-text("保存")')).toBeEnabled();
  });

  test('SCEN-171: エラーログ出力ボタンでログ生成', async ({ page }) => {
    // SCEN-171
    await page.goto('/');
    await page.click('[data-testid="settings-menu"]');
    await page.click('button:has-text("エラーログ出力")');
    await expect(page.locator('[data-testid="log-success-message"]')).toBeVisible();
  });

  test('SCEN-172: ガイダンスパネルが適切に表示', async ({ page }) => {
    // SCEN-172
    await page.goto('/');
    await page.focus('[data-testid="work-content"]');
    await expect(page.locator('[data-testid="guidance-panel"]')).toBeVisible();
    await page.blur('[data-testid="work-content"]');
    await expect(page.locator('[data-testid="guidance-panel"]')).not.toBeVisible();
  });

  test('SCEN-173: 最大文字数境界値で入力チェック', async ({ page }) => {
    // SCEN-173
    await page.goto('/');
    await page.fill('[data-testid="work-content"]', 'a'.repeat(200));
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.click('button:has-text("保存")');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await page.fill('[data-testid="work-content"]', 'a'.repeat(201));
    await page.click('button:has-text("保存")');
    await expect(page.locator('[data-testid="max-length-error"]')).toBeVisible();
  });

  test('SCEN-174: 複数エラー同時発生で全て表示', async ({ page }) => {
    // SCEN-174
    await page.goto('/');
    await page.fill('[data-testid="start-time"]', '25:99');
    await page.fill('[data-testid="end-time"]', 'abc');
    await page.fill('[data-testid="work-time"]', '-5');
    await page.click('button:has-text("登録")');
    await expect(page.locator('[data-testid="multiple-errors"]')).toContainText('作業日付は必須です');
    await expect(page.locator('[data-testid="multiple-errors"]')).toContainText('開始時刻の形式が正しくありません');
    await expect(page.locator('[data-testid="multiple-errors"]')).toContainText('終了時刻の形式が正しくありません');
    await expect(page.locator('[data-testid="multiple-errors"]')).toContainText('作業内容は必須です');
    await expect(page.locator('[data-testid="multiple-errors"]')).toContainText('作業時間は正の値で入力してください');
  });
});