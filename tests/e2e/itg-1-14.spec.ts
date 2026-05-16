import { test, expect } from '@playwright/test';

test.describe("工数入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907296658.html");
  });

  test("SCEN-209: 全項目入力で工数記録が正常登録される", async ({ page }) => {
    // SCEN-209
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.selectOption('[data-testid="work-location"]', 'office');
    await page.fill('[data-testid="worker-name"]', '田中太郎');
    await page.fill('[data-testid="remarks"]', '詳細な作業内容');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-210: カレンダーから作業日付を選択できる", async ({ page }) => {
    // SCEN-210
    await page.click('[data-testid="work-date"]');
    await expect(page.locator('[data-testid="calendar"]')).toBeVisible();
    await page.click('[data-testid="calendar-day-15"]');
    await expect(page.locator('[data-testid="work-date"]')).toHaveValue(/.*15$/);
    await expect(page.locator('[data-testid="calendar"]')).not.toBeVisible();
  });

  test("SCEN-211: 作業項目をドロップダウンから選択できる", async ({ page }) => {
    // SCEN-211
    await page.click('[data-testid="work-content"]');
    await expect(page.locator('[data-testid="work-content"] option')).toHaveCount({ min: 1 });
    await page.selectOption('[data-testid="work-content"]', 'development');
    await expect(page.locator('[data-testid="work-content"]')).toHaveValue('development');
  });

  test("SCEN-212: 開始終了時刻入力で実働時間が自動計算される", async ({ page }) => {
    // SCEN-212
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:30');
    await page.click('body');
    await expect(page.locator('[data-testid="working-hours"]')).toHaveValue('8:30');
  });

  test("SCEN-213: 休憩時間入力で実働時間が正しく調整される", async ({ page }) => {
    // SCEN-213
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await expect(page.locator('[data-testid="working-hours"]')).toHaveValue('7:00');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-214: 中断記録を追加できる", async ({ page }) => {
    // SCEN-214
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="work-status"]', 'interrupted');
    await page.fill('[data-testid="interruption-reason"]', '資材確認');
    await page.fill('[data-testid="interruption-time"]', '10:30');
    await page.click('[data-testid="record-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-215: 複数の中断記録を登録できる", async ({ page }) => {
    // SCEN-215
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.selectOption('[data-testid="interruption-reason"]', '資材確認');
    await page.fill('[data-testid="interruption-time"]', '10:00');
    await page.click('[data-testid="record-interruption-button"]');
    await page.click('[data-testid="resume-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.selectOption('[data-testid="interruption-reason"]', '打ち合わせ');
    await page.fill('[data-testid="interruption-time"]', '11:30');
    await page.click('[data-testid="record-interruption-button"]');
    await page.click('[data-testid="resume-button"]');
    await page.click('[data-testid="pause-button"]');
    await page.selectOption('[data-testid="interruption-reason"]', '休憩');
    await page.fill('[data-testid="interruption-time"]', '13:00');
    await page.click('[data-testid="record-interruption-button"]');
    await page.goto("/panels/work-history-list.html");
    await expect(page.locator('[data-testid="interruption-history"]')).toHaveCount(3);
  });

  test("SCEN-216: 必須項目未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-216
    await page.fill('[data-testid="remarks"]', '任意項目のみ入力');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).not.toBeVisible();
  });

  test("SCEN-217: 開始時刻が終了時刻より遅い場合エラー", async ({ page }) => {
    // SCEN-217
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="time-error"]')).toHaveText(/開始時刻は終了時刻より前に設定してください/);
  });

  test("SCEN-218: 未来日付選択でエラー", async ({ page }) => {
    // SCEN-218
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', futureDateString);
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.fill('[data-testid="working-hours"]', '8');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="date-error"]')).toBeVisible();
  });

  test("SCEN-219: 時刻フォーマット不正でエラー", async ({ page }) => {
    // SCEN-219
    await page.fill('[data-testid="start-time"]', '25:30');
    await page.fill('[data-testid="end-time"]', 'abc:def');
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="format-error"]')).toBeVisible();
  });

  test("SCEN-220: 休憩時間が実働時間を超過した場合エラー", async ({ page }) => {
    // SCEN-220
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '600');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="break-time-error"]')).toHaveText(/休憩時間が実働時間を超過しています/);
  });

  test("SCEN-221: 作業内容詳細の文字数上限でエラー", async ({ page }) => {
    // SCEN-221
    await page.fill('[data-testid="work-date"]', '2024-01-15');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    const longText = 'a'.repeat(1001);
    await page.fill('[data-testid="work-detail"]', longText);
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="length-error"]')).toBeVisible();
  });

  test("SCEN-222: 24時間をまたぐ作業時間入力", async ({ page }) => {
    // SCEN-222
    await page.fill('[data-testid="start-time"]', '23:30');
    await page.fill('[data-testid="end-time"]', '02:30');
    await page.fill('[data-testid="work-detail"]', '夜間メンテナンス作業');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="working-hours"]')).toHaveValue('3:00');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-223: 休憩時間0分での登録", async ({ page }) => {
    // SCEN-223
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '0');
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="working-hours"]')).toHaveValue('8:00');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-224: 開始終了時刻が同じ場合の処理", async ({ page }) => {
    // SCEN-224
    await page.selectOption('[data-testid="work-content"]', 'development');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '09:00');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="same-time-error"]')).toBeVisible();
  });

  test("SCEN-225: 作業内容詳細の最大文字数入力", async ({ page }) => {
    // SCEN-225
    const maxLengthText = 'a'.repeat(1000);
    await page.fill('[data-testid="work-detail"]', maxLengthText);
    await expect(page.locator('[data-testid="work-detail"]')).toHaveValue(maxLengthText);
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-226: 中断時間の合計が実働時間と一致する場合", async ({ page }) => {
    // SCEN-226
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="interruption-1-start"]', '10:00');
    await page.fill('[data-testid="interruption-1-end"]', '12:00');
    await page.fill('[data-testid="interruption-2-start"]', '13:00');
    await page.fill('[data-testid="interruption-2-end"]', '15:00');
    await page.fill('[data-testid="interruption-3-start"]', '15:30');
    await page.fill('[data-testid="interruption-3-end"]', '19:30');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="interruption-total-error"]')).toBeVisible();
  });
});