import { test, expect } from '@playwright/test';

test.describe("工数記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907380182.html");
  });

  test('SCEN-332: 全項目入力で工数記録を正常登録', async ({ page }) => {
    // SCEN-332
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', today);
    await page.fill('[data-testid="worker-name"]', '田中太郎');
    await page.selectOption('[data-testid="project-name"]', { index: 1 });
    await page.fill('[data-testid="work-item"]', 'システム設計書作成');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await page.fill('[data-testid="work-content"]', '設計書の作成業務を実施');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=登録完了')).toBeVisible();
  });

  test('SCEN-333: 中断時間ありで工数が正しく自動計算', async ({ page }) => {
    // SCEN-333
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '60');
    await page.click('[data-testid="calculate-button"]');
    
    const calculatedHours = page.locator('#calculated-hours');
    await expect(calculatedHours).toContainText('7');
  });

  test('SCEN-334: 一時保存後に記録確定', async ({ page }) => {
    // SCEN-334
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', today);
    await page.fill('[data-testid="work-content"]', '作業内容テスト');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.click('[data-testid="temp-save-button"]');
    
    await expect(page.locator('text=一時保存完了')).toBeVisible();
    
    await page.click('button:text("記録確定")');
    await page.click('button:text("OK")');
    
    await expect(page.locator('text=確定完了')).toBeVisible();
  });

  test('SCEN-335: 必須項目未入力でバリデーションエラー', async ({ page }) => {
    // SCEN-335
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('#error-messages')).toBeVisible();
    await expect(page.locator('text=必須項目')).toBeVisible();
  });

  test('SCEN-336: 開始時刻が終了時刻より後でエラー', async ({ page }) => {
    // SCEN-336
    await page.fill('[data-testid="work-item"]', 'テスト作業');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=開始時刻が終了時刻より後')).toBeVisible();
  });

  test('SCEN-337: 未来日付選択でエラー', async ({ page }) => {
    // SCEN-337
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('[data-testid="work-date"]', futureDateStr);
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=未来日付は選択できません')).toBeVisible();
  });

  test('SCEN-338: 24時間以上の作業時間でエラー', async ({ page }) => {
    // SCEN-338
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.fill('[data-testid="work-content"]', '長時間作業');
    await page.selectOption('[data-testid="project-name"]', { index: 1 });
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=24時間以上')).toBeVisible();
  });

  test('SCEN-339: 作業内容詳細の最大文字数制限', async ({ page }) => {
    // SCEN-339
    const maxText = 'あ'.repeat(1000);
    const overText = 'あ'.repeat(1001);
    
    await page.fill('[data-testid="work-content"]', maxText);
    await expect(page.locator('#char-count')).toContainText('1000');
    
    await page.fill('[data-testid="work-content"]', overText);
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=文字数制限')).toBeVisible();
  });

  test('SCEN-340: 同日00:00-23:59の境界時刻入力', async ({ page }) => {
    // SCEN-340
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', today);
    await page.fill('[data-testid="start-time"]', '00:00');
    await page.fill('[data-testid="end-time"]', '23:59');
    await page.fill('[data-testid="work-content"]', '長時間作業');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=登録完了')).toBeVisible();
  });

  test('SCEN-341: 中断時間が作業時間を超過する場合', async ({ page }) => {
    // SCEN-341
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');
    await page.fill('[data-testid="break-time"]', '540');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=中断時間は作業時間を超過できません')).toBeVisible();
  });

  test('SCEN-342: キャンセルで入力内容がクリア', async ({ page }) => {
    // SCEN-342
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', today);
    await page.fill('[data-testid="work-content"]', '作業内容テスト');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="remarks"]', '備考テスト');
    
    await page.click('[data-testid="cancel-button"]');
    
    await expect(page.locator('[data-testid="work-date"]')).toHaveValue('');
    await expect(page.locator('[data-testid="work-content"]')).toHaveValue('');
    await expect(page.locator('[data-testid="start-time"]')).toHaveValue('');
    await expect(page.locator('[data-testid="remarks"]')).toHaveValue('');
  });

  test('SCEN-343: 日付跨ぎ作業の記録', async ({ page }) => {
    // SCEN-343
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="work-date"]', today);
    await page.fill('[data-testid="start-time"]', '23:30');
    await page.fill('[data-testid="end-time"]', '01:30');
    await page.fill('[data-testid="work-content"]', '設備点検作業');
    await page.selectOption('[data-testid="project-name"]', { index: 1 });
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('text=登録完了')).toBeVisible();
    await page.click('[data-testid="calculate-button"]');
    await expect(page.locator('#calculated-hours')).toContainText('2');
  });
});