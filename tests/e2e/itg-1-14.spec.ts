import { test, expect } from '@playwright/test';

test.describe("工数入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'test-user');
    await page.fill('[data-testid="password"]', 'test-pass');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907296658.html");
  });

  test('SCEN-209: 全項目入力で工数記録が正常登録される', async ({ page }) => {
    // SCEN-209
    await page.selectOption('#work-date', '2024-01-15');
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:30');
    await page.selectOption('#work-content', 'maintenance');
    await page.selectOption('#work-location', 'site-a');
    await page.fill('#worker-name', '山田太郎');
    await page.fill('#remarks', '通常作業実施');
    await page.click('#register-button');
    
    await expect(page.locator('.success-message')).toBeVisible();
    await page.goto("/panels/work-list.html");
    await expect(page.locator('.work-record').first()).toContainText('山田太郎');
  });

  test('SCEN-210: カレンダーから作業日付を選択できる', async ({ page }) => {
    // SCEN-210
    await page.click('#work-date');
    await expect(page.locator('.calendar')).toBeVisible();
    await page.click('[data-date="15"]');
    
    await expect(page.locator('#work-date')).toHaveValue('2024-01-15');
    await expect(page.locator('.calendar')).not.toBeVisible();
  });

  test('SCEN-211: 作業項目をドロップダウンから選択できる', async ({ page }) => {
    // SCEN-211
    await page.click('#work-content');
    await expect(page.locator('#work-content option')).toHaveCount(3);
    await page.selectOption('#work-content', 'construction');
    
    await expect(page.locator('#work-content')).toHaveValue('construction');
  });

  test('SCEN-212: 開始終了時刻入力で実働時間が自動計算される', async ({ page }) => {
    // SCEN-212
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:30');
    await page.click('#worker-name');
    
    await expect(page.locator('#work-hours')).toHaveValue('8:30');
  });

  test('SCEN-213: 休憩時間入力で実働時間が正しく調整される', async ({ page }) => {
    // SCEN-213
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.fill('#break-time', '60');
    
    await expect(page.locator('#actual-hours')).toHaveValue('7:00');
    await page.click('#register-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-214: 中断記録を追加できる', async ({ page }) => {
    // SCEN-214
    await page.selectOption('#work-content', 'maintenance');
    await page.fill('#start-time', '10:00');
    await page.selectOption('#work-status', 'suspended');
    await page.fill('#suspend-reason', '機材確認');
    await page.fill('#suspend-time', '11:00');
    await page.click('#record-button');
    
    await expect(page.locator('.success-message')).toBeVisible();
    await page.goto("/panels/work-list.html");
    await expect(page.locator('.work-record .status')).toContainText('中断');
  });

  test('SCEN-215: 複数の中断記録を登録できる', async ({ page }) => {
    // SCEN-215
    await page.click('#start-work-button');
    
    await page.click('#suspend-button');
    await page.selectOption('#suspend-reason', '資材確認');
    await page.click('#record-suspend-button');
    
    await page.click('#resume-button');
    await page.click('#suspend-button');
    await page.selectOption('#suspend-reason', '打ち合わせ');
    await page.click('#record-suspend-button');
    
    await page.click('#resume-button');
    await page.click('#suspend-button');
    await page.selectOption('#suspend-reason', '休憩');
    await page.click('#record-suspend-button');
    
    await page.goto("/panels/work-list.html");
    await expect(page.locator('.suspend-history')).toHaveCount(3);
    await expect(page.locator('.suspend-history').nth(0)).toContainText('資材確認');
    await expect(page.locator('.suspend-history').nth(1)).toContainText('打ち合わせ');
    await expect(page.locator('.suspend-history').nth(2)).toContainText('休憩');
  });

  test('SCEN-216: 必須項目未入力でバリデーションエラー', async ({ page }) => {
    // SCEN-216
    await page.fill('#remarks', '備考のみ入力');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('必須項目');
  });

  test('SCEN-217: 開始時刻が終了時刻より遅い場合エラー', async ({ page }) => {
    // SCEN-217
    await page.selectOption('#work-content', 'maintenance');
    await page.fill('#start-time', '14:00');
    await page.fill('#end-time', '10:00');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('開始時刻は終了時刻より前');
  });

  test('SCEN-218: 未来日付選択でエラー', async ({ page }) => {
    // SCEN-218
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('#work-date', futureDateStr);
    await page.selectOption('#work-content', 'maintenance');
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('未来');
  });

  test('SCEN-219: 時刻フォーマット不正でエラー', async ({ page }) => {
    // SCEN-219
    await page.fill('#start-time', '25:30');
    await page.fill('#end-time', 'abc:def');
    await page.selectOption('#work-content', 'maintenance');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('時刻フォーマット');
  });

  test('SCEN-220: 休憩時間が実働時間を超過した場合エラー', async ({ page }) => {
    // SCEN-220
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.fill('#break-time', '600');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('休憩時間が実働時間を超過');
  });

  test('SCEN-221: 作業内容詳細の文字数上限でエラー', async ({ page }) => {
    // SCEN-221
    await page.fill('#work-date', '2024-01-15');
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.selectOption('#work-content', 'maintenance');
    
    const longText = 'あ'.repeat(501);
    await page.fill('#work-details', longText);
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('文字数上限');
  });

  test('SCEN-222: 24時間をまたぐ作業時間入力', async ({ page }) => {
    // SCEN-222
    await page.fill('#start-time', '23:30');
    await page.fill('#end-time', '02:30');
    await page.fill('#work-details', '夜間メンテナンス作業');
    await page.selectOption('#work-content', 'maintenance');
    await page.click('#register-button');
    
    await expect(page.locator('#work-hours')).toContainText('3:00');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-223: 休憩時間0分での登録', async ({ page }) => {
    // SCEN-223
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.fill('#break-time', '0');
    await page.selectOption('#work-content', 'maintenance');
    await page.fill('#worker-name', '田中次郎');
    await page.click('#register-button');
    
    await expect(page.locator('#actual-hours')).toContainText('8:00');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-224: 開始終了時刻が同じ場合の処理', async ({ page }) => {
    // SCEN-224
    await page.selectOption('#work-content', 'maintenance');
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '09:00');
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('同じ');
  });

  test('SCEN-225: 作業内容詳細の最大文字数入力', async ({ page }) => {
    // SCEN-225
    await page.fill('#work-date', '2024-01-15');
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    await page.selectOption('#work-content', 'maintenance');
    
    const maxText = 'あ'.repeat(500);
    await page.fill('#work-details', maxText);
    
    await expect(page.locator('#work-details')).toHaveValue(maxText);
    await page.click('#register-button');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-226: 中断時間の合計が実働時間と一致する場合', async ({ page }) => {
    // SCEN-226
    await page.fill('#start-time', '09:00');
    await page.fill('#end-time', '17:00');
    
    await page.click('#add-suspend-button');
    await page.fill('#suspend-start-1', '10:00');
    await page.fill('#suspend-end-1', '12:00');
    
    await page.click('#add-suspend-button');
    await page.fill('#suspend-start-2', '13:00');
    await page.fill('#suspend-end-2', '15:00');
    
    await page.click('#add-suspend-button');
    await page.fill('#suspend-start-3', '15:30');
    await page.fill('#suspend-end-3', '19:30');
    
    await page.click('#register-button');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('中断時間の合計');
  });
});