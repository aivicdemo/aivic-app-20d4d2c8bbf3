import { test, expect } from '@playwright/test';

test.describe("工数入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907296658.html");
  });

  test("SCEN-209: 全項目入力で工数記録が正常登録される", async ({ page }) => {
    // SCEN-209
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.selectOption('[data-testid="work-location"]', { index: 1 });
    await page.fill('[data-testid="worker-name"]', 'テスト作業員');
    await page.fill('[data-testid="work-details"]', '詳細な作業内容です');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('text=登録が完了しました')).toBeVisible();
  });

  test("SCEN-210: カレンダーから作業日付を選択できる", async ({ page }) => {
    // SCEN-210
    await page.click('[data-testid="work-date"]');
    await expect(page.locator('.calendar')).toBeVisible();
    await page.click('text=15');
    await expect(page.locator('[data-testid="work-date"]')).toHaveValue(/15/);
  });

  test("SCEN-211: 作業項目をドロップダウンから選択できる", async ({ page }) => {
    // SCEN-211
    await page.click('[data-testid="work-item"]');
    const options = page.locator('[data-testid="work-item"] option');
    await expect(options).toHaveCount.toBeGreaterThan(1);
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await expect(page.locator('[data-testid="work-item"]')).not.toHaveValue('');
  });

  test("SCEN-212: 開始終了時刻入力で実働時間が自動計算される", async ({ page }) => {
    // SCEN-212
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.click('[data-testid="work-date"]');
    await expect(page.locator('[data-testid="actual-work-time"]')).toHaveValue('8:30');
  });

  test("SCEN-213: 休憩時間入力で実働時間が正しく調整される", async ({ page }) => {
    // SCEN-213
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await page.click('[data-testid="work-date"]');
    await expect(page.locator('[data-testid="actual-work-time"]')).toHaveValue('7:00');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="worker-name"]', 'テスト作業員');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('text=登録が完了しました')).toBeVisible();
  });

  test("SCEN-214: 中断記録を追加できる", async ({ page }) => {
    // SCEN-214
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="progress-status"]', 'value=中断');
    await page.selectOption('[data-testid="interrupt-reason"]', { index: 1 });
    await page.fill('[data-testid="interrupt-start"]', '10:00');
    await page.click('button:has-text("記録")');
    await expect(page.locator('[data-testid="interrupt-list"]')).toContainText('中断');
  });

  test("SCEN-215: 複数の中断記録を登録できる", async ({ page }) => {
    // SCEN-215
    await page.click('button:has-text("記録開始")');
    
    await page.click('[data-testid="interrupt-button"]');
    await page.selectOption('[data-testid="interrupt-reason"]', 'value=資材確認');
    await page.fill('[data-testid="interrupt-start"]', '10:00');
    await page.click('[data-testid="add-interrupt-button"]');
    
    await page.click('button:has-text("作業再開")');
    
    await page.click('[data-testid="interrupt-button"]');
    await page.selectOption('[data-testid="interrupt-reason"]', 'value=打ち合わせ');
    await page.fill('[data-testid="interrupt-start"]', '14:00');
    await page.click('[data-testid="add-interrupt-button"]');
    
    await page.click('button:has-text("作業再開")');
    
    await page.click('[data-testid="interrupt-button"]');
    await page.selectOption('[data-testid="interrupt-reason"]', 'value=休憩');
    await page.fill('[data-testid="interrupt-start"]', '16:00');
    await page.click('[data-testid="add-interrupt-button"]');
    
    const interrupts = page.locator('[data-testid="interrupt-list"] tr');
    await expect(interrupts).toHaveCount(3);
  });

  test("SCEN-216: 必須項目未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-216
    await page.fill('[data-testid="work-details"]', '任意項目のみ入力');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('必須項目');
  });

  test("SCEN-217: 開始時刻が終了時刻より遅い場合エラー", async ({ page }) => {
    // SCEN-217
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('開始時刻は終了時刻より前');
  });

  test("SCEN-218: 未来日付選択でエラー", async ({ page }) => {
    // SCEN-218
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="work-date"]', futureDateStr);
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('未来の日付');
  });

  test("SCEN-219: 時刻フォーマット不正でエラー", async ({ page }) => {
    // SCEN-219
    await page.fill('[data-testid="start-time"]', '25:30');
    await page.fill('[data-testid="end-time"]', 'abc:def');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('時刻フォーマット');
  });

  test("SCEN-220: 休憩時間が実働時間を超過した場合エラー", async ({ page }) => {
    // SCEN-220
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '600');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('休憩時間が実働時間を超過');
  });

  test("SCEN-221: 作業内容詳細の文字数上限でエラー", async ({ page }) => {
    // SCEN-221
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    const longText = 'あ'.repeat(1001);
    await page.fill('[data-testid="work-details"]', longText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数上限');
  });

  test("SCEN-222: 24時間をまたぐ作業時間入力", async ({ page }) => {
    // SCEN-222
    await page.fill('[data-testid="start-time"]', '23:30');
    await page.fill('[data-testid="end-time"]', '02:30');
    await page.fill('[data-testid="work-details"]', '夜間メンテナンス作業');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="worker-name"]', 'テスト作業員');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="actual-work-time"]')).toHaveValue('3:00');
  });

  test("SCEN-223: 休憩時間0分での登録", async ({ page }) => {
    // SCEN-223
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '0');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="worker-name"]', 'テスト作業員');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="actual-work-time"]')).toHaveValue('8:00');
    await expect(page.locator('text=登録が完了しました')).toBeVisible();
  });

  test("SCEN-224: 開始終了時刻が同じ場合の処理", async ({ page }) => {
    // SCEN-224
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '09:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('開始時刻と終了時刻が同じ');
  });

  test("SCEN-225: 作業内容詳細の最大文字数入力", async ({ page }) => {
    // SCEN-225
    const maxText = 'あ'.repeat(1000);
    await page.fill('[data-testid="work-details"]', maxText);
    await expect(page.locator('[data-testid="work-details"]')).toHaveValue(maxText);
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.selectOption('[data-testid="work-item"]', { index: 1 });
    await page.fill('[data-testid="worker-name"]', 'テスト作業員');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('text=登録が完了しました')).toBeVisible();
  });

  test("SCEN-226: 中断時間の合計が実働時間と一致する場合", async ({ page }) => {
    // SCEN-226
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    
    await page.fill('[data-testid="interrupt-start"]', '10:00');
    await page.fill('[data-testid="interrupt-end"]', '12:00');
    await page.click('[data-testid="add-interrupt-button"]');
    
    await page.fill('[data-testid="interrupt-start"]', '13:00');
    await page.fill('[data-testid="interrupt-end"]', '15:00');
    await page.click('[data-testid="add-interrupt-button"]');
    
    await page.fill('[data-testid="interrupt-start"]', '15:30');
    await page.fill('[data-testid="interrupt-end"]', '19:30');
    await page.click('[data-testid="add-interrupt-button"]');
    
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('中断時間の合計が実働時間と一致');
  });
});