import { test, expect } from '@playwright/test';

test.describe("工数記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('SCEN-332: 全項目入力で工数記録を正常登録', async ({ page }) => {
    // SCEN-332
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[name="workDate"]', today);
    await page.fill('[name="workerName"]', '田中太郎');
    await page.selectOption('[name="projectName"]', { index: 1 });
    await page.fill('[name="workItem"]', 'システム設計書作成');
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '17:00');
    await page.fill('[name="breakTime"]', '60');
    await page.fill('[name="workDetails"]', '詳細な作業内容');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-333: 中断時間ありで工数が正しく自動計算', async ({ page }) => {
    // SCEN-333
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '17:00');
    await page.fill('[name="breakTime"]', '60');
    await page.click('button:has-text("計算")');
    
    await expect(page.locator('[name="workHours"]')).toHaveValue('7.0');
  });

  test('SCEN-334: 一時保存後に記録確定', async ({ page }) => {
    // SCEN-334
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[name="workDate"]', today);
    await page.fill('[name="workItem"]', '作業内容');
    await page.fill('[name="workHours"]', '8.0');
    await page.click('button:has-text("一時保存")');
    
    await expect(page.locator('.temp-save-message')).toBeVisible();
    
    await page.click('button:has-text("記録確定")');
    await page.click('button:has-text("OK")');
    
    await expect(page.locator('.confirm-message')).toBeVisible();
  });

  test('SCEN-335: 必須項目未入力でバリデーションエラー', async ({ page }) => {
    // SCEN-335
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('[name="workDate"] + .field-error')).toBeVisible();
    await expect(page.locator('[name="startTime"] + .field-error')).toBeVisible();
    await expect(page.locator('[name="endTime"] + .field-error')).toBeVisible();
  });

  test('SCEN-336: 開始時刻が終了時刻より後でエラー', async ({ page }) => {
    // SCEN-336
    await page.selectOption('[name="workItem"]', { index: 1 });
    await page.fill('[name="startTime"]', '14:00');
    await page.fill('[name="endTime"]', '10:00');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message:has-text("開始時刻が終了時刻より後")')).toBeVisible();
  });

  test('SCEN-337: 未来日付選択でエラー', async ({ page }) => {
    // SCEN-337
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await page.fill('[name="workDate"]', futureDateString);
    await page.fill('[name="workItem"]', '作業内容');
    await page.fill('[name="workHours"]', '8.0');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message:has-text("未来日付")')).toBeVisible();
  });

  test('SCEN-338: 24時間以上の作業時間でエラー', async ({ page }) => {
    // SCEN-338
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '10:00');
    await page.check('[name="nextDay"]');
    await page.fill('[name="workItem"]', '作業内容');
    await page.selectOption('[name="projectName"]', { index: 1 });
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message:has-text("24時間以上")')).toBeVisible();
  });

  test('SCEN-339: 作業内容詳細の最大文字数制限', async ({ page }) => {
    // SCEN-339
    const maxText = 'a'.repeat(1000);
    const overText = 'a'.repeat(1001);
    
    await page.fill('[name="workDetails"]', maxText);
    await expect(page.locator('[name="workDetails"]')).toHaveValue(maxText);
    
    await page.fill('[name="workDetails"]', overText);
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message:has-text("文字数制限")')).toBeVisible();
  });

  test('SCEN-340: 同日00:00-23:59の境界時刻入力', async ({ page }) => {
    // SCEN-340
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[name="workDate"]', today);
    await page.fill('[name="startTime"]', '00:00');
    await page.fill('[name="endTime"]', '23:59');
    await page.fill('[name="workItem"]', '作業内容');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-341: 中断時間が作業時間を超過する場合', async ({ page }) => {
    // SCEN-341
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '17:00');
    await page.fill('[name="breakTime"]', '540');
    await page.click('button:has-text("登録")');
    
    await expect(page.locator('.error-message:has-text("中断時間は作業時間を超過")')).toBeVisible();
  });

  test('SCEN-342: キャンセルで入力内容がクリア', async ({ page }) => {
    // SCEN-342
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[name="workDate"]', today);
    await page.fill('[name="workItem"]', '作業内容');
    await page.fill('[name="workHours"]', '8.0');
    await page.fill('[name="remarks"]', '備考');
    await page.click('button:has-text("キャンセル")');
    
    await expect(page.locator('[name="workDate"]')).toHaveValue('');
    await expect(page.locator('[name="workItem"]')).toHaveValue('');
    await expect(page.locator('[name="workHours"]')).toHaveValue('');
    await expect(page.locator('[name="remarks"]')).toHaveValue('');
  });

  test('SCEN-343: 日付跨ぎ作業の記録', async ({ page }) => {
    // SCEN-343
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[name="startDateTime"]', `${today}T23:30`);
    await page.fill('[name="endDateTime"]', `${today}T01:30`);
    await page.check('[name="crossDay"]');
    await page.fill('[name="workItem"]', '設備点検作業');
    await page.selectOption('[name="projectName"]', { index: 1 });
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.calculated-hours:has-text("2.0")')).toBeVisible();
  });
});