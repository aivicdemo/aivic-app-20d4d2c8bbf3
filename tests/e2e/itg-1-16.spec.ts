import { test, expect } from '@playwright/test';

test.describe("修正入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907319067.html");
  });

  test("SCEN-249: 修正対象記録選択して正常修正できる", async ({ page }) => {
    // SCEN-249
    await page.waitForLoadState('networkidle');
    await page.locator('text=工数記録一覧').first().click();
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('textarea[placeholder="作業内容"]', '修正された作業内容');
    await page.fill('input[type="time"]', '08:30');
    await page.fill('input[type="date"]', '2024-01-15');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=修正完了')).toBeVisible();
    await page.locator('text=一覧に戻る').click();
    await expect(page.locator('text=修正された作業内容')).toBeVisible();
  });

  test("SCEN-250: 作業日付を正常に変更できる", async ({ page }) => {
    // SCEN-250
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[type="date"]', '2024-02-20');
    await page.click('button[type="submit"]');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-02-20');
  });

  test("SCEN-251: 作業開始終了時刻を正常に修正できる", async ({ page }) => {
    // SCEN-251
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '18:00');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=修正完了')).toBeVisible();
    await page.locator('text=一覧に戻る').click();
    await expect(page.locator('text=09:00')).toBeVisible();
    await expect(page.locator('text=18:00')).toBeVisible();
  });

  test("SCEN-252: 作業項目を変更して修正できる", async ({ page }) => {
    // SCEN-252
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.selectOption('select[name="work_item"]', '設計作業');
    await page.click('button[type="submit"]');
    await page.locator('text=一覧に戻る').click();
    await expect(page.locator('text=設計作業')).toBeVisible();
  });

  test("SCEN-253: 中断時刻と理由を修正できる", async ({ page }) => {
    // SCEN-253
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="break_time"]', '12:30');
    await page.selectOption('select[name="break_reason"]', '会議');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=修正完了')).toBeVisible();
  });

  test("SCEN-254: 修正理由を入力して保存できる", async ({ page }) => {
    // SCEN-254
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('textarea[name="edit_reason"]', '作業時間の誤入力のため修正');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
  });

  test("SCEN-255: 修正前データが正しく表示される", async ({ page }) => {
    // SCEN-255
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await expect(page.locator('input[type="date"]')).not.toHaveValue('');
    await expect(page.locator('input[name="start_time"]')).not.toHaveValue('');
    await expect(page.locator('textarea[placeholder="作業内容"]')).not.toHaveValue('');
  });

  test("SCEN-256: 実作業時間が自動計算される", async ({ page }) => {
    // SCEN-256
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="start_time"]', '09:00');
    await page.fill('input[name="end_time"]', '17:30');
    await page.fill('input[name="break_minutes"]', '60');
    await expect(page.locator('span[data-calculated="work_hours"]')).toHaveText(/7[.:][35]/);
  });

  test("SCEN-257: 修正対象記録未選択でエラー", async ({ page }) => {
    // SCEN-257
    await page.click('button[type="submit"]');
    await expect(page.locator('text=修正対象の記録が選択されていません')).toBeVisible();
  });

  test("SCEN-258: 作業日付に無効な日付でエラー", async ({ page }) => {
    // SCEN-258
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[type="date"]', '2024-02-30');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=無効な日付です')).toBeVisible();
  });

  test("SCEN-259: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-259
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="start_time"]', '14:00');
    await page.fill('input[name="end_time"]', '13:00');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=開始時刻は終了時刻より前の時刻を入力してください')).toBeVisible();
  });

  test("SCEN-260: 中断時刻が作業時間外でエラー", async ({ page }) => {
    // SCEN-260
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="break_time"]', '23:30');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=中断時刻が作業時間外です')).toBeVisible();
  });

  test("SCEN-261: 修正理由未入力でエラー", async ({ page }) => {
    // SCEN-261
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="work_hours"]', '8.5');
    await page.fill('textarea[name="edit_reason"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=修正理由が未入力です')).toBeVisible();
  });

  test("SCEN-262: 異常値警告が正しく表示される", async ({ page }) => {
    // SCEN-262
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="work_hours"]', '-5');
    await page.fill('input[name="start_time"]', '25:00');
    await page.fill('input[type="date"]', '2099-12-31');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=負の数値は入力できません')).toBeVisible();
    await expect(page.locator('text=24時間を超える時刻です')).toBeVisible();
  });

  test("SCEN-263: 作業日付境界値で正常動作", async ({ page }) => {
    // SCEN-263
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[type="date"]', '1900-01-01');
    await page.fill('textarea[placeholder="作業内容"]', 'テスト作業');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
    
    await page.fill('input[type="date"]', '2099-12-31');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
    
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
  });

  test("SCEN-264: 時刻境界値00:00と23:59で正常動作", async ({ page }) => {
    // SCEN-264
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="start_time"]', '00:00');
    await page.fill('input[name="end_time"]', '23:59');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
    await page.locator('text=一覧に戻る').click();
    await expect(page.locator('text=00:00')).toBeVisible();
    await expect(page.locator('text=23:59')).toBeVisible();
  });

  test("SCEN-265: 修正理由文字数上限での動作", async ({ page }) => {
    // SCEN-265
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    const maxText = 'あ'.repeat(200);
    await page.fill('textarea[name="edit_reason"]', maxText);
    await page.fill('textarea[name="edit_reason"]', maxText + 'い');
    const actualValue = await page.inputValue('textarea[name="edit_reason"]');
    expect(actualValue.length).toBeLessThanOrEqual(200);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=保存完了')).toBeVisible();
  });

  test("SCEN-266: 24時間作業での時間計算", async ({ page }) => {
    // SCEN-266
    await page.locator('button').filter({ hasText: '修正' }).first().click();
    await page.fill('input[name="start_time"]', '00:00');
    await page.fill('input[name="end_time"]', '23:59');
    await expect(page.locator('span[data-calculated="work_hours"]')).toHaveText(/23.*59|23\.9/);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=長時間作業です')).toBeVisible();
  });
});