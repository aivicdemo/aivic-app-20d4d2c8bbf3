import { test, expect } from '@playwright/test';

test.describe("入力チェック機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test-user');
    await page.fill('[name="password"]', 'test-password');
    await page.click('[type="submit"]');
    await page.goto("/panels/scr-1778907263518.html");
  });

  test('SCEN-157: 全項目正常入力でチェック通過', async ({ page }) => {
    // SCEN-157
    await page.fill('[name="workDate"]', '2024/01/15');
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '17:00');
    await page.fill('[name="breakTime"]', '60');
    await page.fill('[name="workContent"]', '配管工事');
    await page.fill('[name="workLocation"]', 'A棟1階');
    await page.fill('[name="workerName"]', '山田太郎');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.error-message')).not.toBeVisible();
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-158: 必須項目未入力でエラー表示', async ({ page }) => {
    // SCEN-158
    await page.click('button:has-text("登録")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('必須項目');
  });

  test('SCEN-159: 不正な日時形式でフォーマットエラー', async ({ page }) => {
    // SCEN-159
    await page.fill('[name="startDateTime"]', '2024/13/45 25:70');
    await page.fill('[name="endDateTime"]', 'abc-def-ghi');
    await page.fill('[name="workContent"]', '作業内容');
    await page.fill('[name="workLocation"]', '作業場所');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.format-error')).toBeVisible();
  });

  test('SCEN-160: 開始時刻が終了時刻より後でエラー', async ({ page }) => {
    // SCEN-160
    await page.fill('[name="startTime"]', '14:00');
    await page.fill('[name="endTime"]', '10:00');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('開始時刻は終了時刻より前に');
  });

  test('SCEN-161: 24時間超過の作業時間で警告', async ({ page }) => {
    // SCEN-161
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '10:00');
    await page.selectOption('[name="endDay"]', '翌日');
    await page.fill('[name="workContent"]', '作業内容');
    await page.fill('[name="project"]', 'プロジェクト');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.warning-message')).toContainText('24時間を超過');
  });

  test('SCEN-162: 同一日時の重複データで検出アラート', async ({ page }) => {
    // SCEN-162
    await page.fill('[name="workDateTime"]', '2024-01-15 09:00');
    await page.fill('[name="workContent"]', '設備点検作業');
    await page.fill('[name="workHours"]', '2');
    await page.click('button:has-text("登録")');
    
    await page.click('button:has-text("新規")');
    await page.fill('[name="workDateTime"]', '2024-01-15 09:00');
    await page.fill('[name="workContent"]', '清掃作業');
    await page.fill('[name="workHours"]', '1');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.alert')).toContainText('指定された日時には既に作業記録');
  });

  test('SCEN-163: 異常に短い作業時間で通知表示', async ({ page }) => {
    // SCEN-163
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '09:01');
    await page.fill('[name="workContent"]', '作業内容');
    await page.fill('[name="workLocation"]', '作業場所');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.warning-notification')).toContainText('異常に短い作業時間');
  });

  test('SCEN-164: 異常に長い作業時間で通知表示', async ({ page }) => {
    // SCEN-164
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '32:00');
    await page.fill('[name="workContent"]', '作業内容');
    await page.click('button:has-text("登録")');
    await expect(page.locator('.warning-notification')).toContainText('作業時間が異常に長く');
  });

  test('SCEN-165: エラー詳細確認ボタンで詳細表示', async ({ page }) => {
    // SCEN-165
    await page.click('button:has-text("登録")');
    await expect(page.locator('.error-message')).toBeVisible();
    await page.click('button:has-text("詳細確認")');
    await expect(page.locator('.error-detail-dialog')).toBeVisible();
    await expect(page.locator('.error-list')).toBeVisible();
  });

  test('SCEN-166: 入力修正提案が適切に表示', async ({ page }) => {
    // SCEN-166
    await page.fill('[name="workItem"]', '!@#$%');
    await page.fill('[name="workHours"]', '-5');
    await page.fill('[name="workDate"]', 'invalid-date');
    await page.click('button:has-text("確認")');
    await expect(page.locator('.suggestion-message')).toBeVisible();
    
    await page.fill('[name="workItem"]', '正常な作業項目');
    await page.fill('[name="workHours"]', '8');
    await page.fill('[name="workDate"]', '2024-01-15');
    await page.click('button:has-text("送信")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-167: エラー有りでステータスアイコン赤', async ({ page }) => {
    // SCEN-167
    await page.fill('[name="workHours"]', '-5');
    await page.fill('[name="workContent"]', 'a'.repeat(1000));
    await page.click('button:has-text("保存")');
    await expect(page.locator('.status-icon.red')).toBeVisible();
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('SCEN-168: チェック通過でステータスアイコン緑', async ({ page }) => {
    // SCEN-168
    await page.fill('[name="workDate"]', '2024-01-15');
    await page.fill('[name="workHours"]', '8.0');
    await page.fill('[name="workContent"]', 'システム開発作業');
    await page.selectOption('[name="projectName"]', 'プロジェクトA');
    await page.waitForTimeout(1000);
    await expect(page.locator('.status-icon.green')).toBeVisible();
  });

  test('SCEN-169: エラー有りで保存不可表示', async ({ page }) => {
    // SCEN-169
    await page.fill('[name="workHours"]', '25');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('button:has-text("保存")')).toBeDisabled();
  });

  test('SCEN-170: チェック通過で保存可能表示', async ({ page }) => {
    // SCEN-170
    await page.fill('[name="workDate"]', '2024-01-15');
    await page.fill('[name="workHours"]', '8.0');
    await page.fill('[name="workContent"]', '作業内容');
    await page.selectOption('[name="projectName"]', 'プロジェクトA');
    await expect(page.locator('button:has-text("保存")')).toBeEnabled();
    await expect(page.locator('.save-status')).toContainText('保存可能');
  });

  test('SCEN-171: エラーログ出力ボタンでログ生成', async ({ page }) => {
    // SCEN-171
    await page.click('button:has-text("設定")');
    await page.click('button:has-text("エラーログ出力")');
    await expect(page.locator('.log-generation-message')).toBeVisible();
    await expect(page.locator('.download-complete')).toBeVisible();
  });

  test('SCEN-172: ガイダンスパネルが適切に表示', async ({ page }) => {
    // SCEN-172
    await page.focus('[name="workContent"]');
    await expect(page.locator('.guidance-panel')).toBeVisible();
    
    await page.focus('[name="workDate"]');
    await expect(page.locator('.guidance-panel')).not.toBeVisible();
    
    await page.focus('[name="workContent"]');
    await expect(page.locator('.guidance-panel')).toBeVisible();
    await expect(page.locator('.guidance-content')).toContainText('入力ガイダンス');
  });

  test('SCEN-173: 最大文字数境界値で入力チェック', async ({ page }) => {
    // SCEN-173
    const maxText = 'a'.repeat(200);
    const overMaxText = 'a'.repeat(201);
    
    await page.fill('[name="workContent"]', maxText);
    await page.fill('[name="workDate"]', '2024-01-15');
    await page.fill('[name="workHours"]', '8');
    await page.click('button:has-text("保存")');
    await expect(page.locator('.success-message')).toBeVisible();
    
    await page.fill('[name="workContent"]', overMaxText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('.error-message')).toContainText('文字数');
  });

  test('SCEN-174: 複数エラー同時発生で全て表示', async ({ page }) => {
    // SCEN-174
    await page.fill('[name="startTime"]', '25:99');
    await page.fill('[name="endTime"]', 'abc');
    await page.fill('[name="workHours"]', '-5');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message')).toContainText('作業日付は必須');
    await expect(page.locator('.error-message')).toContainText('開始時刻の形式');
    await expect(page.locator('.error-message')).toContainText('終了時刻の形式');
    await expect(page.locator('.error-message')).toContainText('作業内容は必須');
    await expect(page.locator('.error-message')).toContainText('作業時間は正の値');
  });
});