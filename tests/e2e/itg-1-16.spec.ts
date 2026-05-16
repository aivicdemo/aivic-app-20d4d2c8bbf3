import { test, expect } from '@playwright/test';

test.describe("修正入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907319067.html");
  });

  test("SCEN-249: 修正対象記録選択して正常修正できる", async ({ page }) => {
    // SCEN-249
    await page.waitForLoadState();
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="work-content"]', '修正された作業内容');
    await page.fill('input[name="work-hours"]', '8.5');
    await page.fill('input[name="work-date"]', '2024-01-15');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toContainText('修正完了');
    await page.goto("/panels/work-list.html");
    await expect(page.locator('tr[data-record-id="1"] .work-content')).toContainText('修正された作業内容');
  });

  test("SCEN-250: 作業日付を正常に変更できる", async ({ page }) => {
    // SCEN-250
    await page.click('tr[data-record-id="1"]');
    await page.click('input[name="work-date"]');
    await page.fill('input[name="work-date"]', '2024-02-01');
    await page.click('button[type="submit"]');
    await expect(page.locator('input[name="work-date"]')).toHaveValue('2024-02-01');
  });

  test("SCEN-251: 作業開始終了時刻を正常に修正できる", async ({ page }) => {
    // SCEN-251
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="start-time"]', '09:30');
    await page.fill('input[name="end-time"]', '18:00');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await page.goto("/panels/work-list.html");
    await expect(page.locator('tr[data-record-id="1"] .start-time')).toContainText('09:30');
  });

  test("SCEN-252: 作業項目を変更して修正できる", async ({ page }) => {
    // SCEN-252
    await page.click('tr[data-record-id="1"]');
    await page.click('select[name="work-item"]');
    await page.selectOption('select[name="work-item"]', { label: '設計作業' });
    await page.click('button[type="submit"]');
    await page.goto("/panels/work-list.html");
    await expect(page.locator('tr[data-record-id="1"] .work-item')).toContainText('設計作業');
  });

  test("SCEN-253: 中断時刻と理由を修正できる", async ({ page }) => {
    // SCEN-253
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="break-time"]', '12:30');
    await page.selectOption('select[name="break-reason"]', { label: '会議' });
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toContainText('修正完了');
  });

  test("SCEN-254: 修正理由を入力して保存できる", async ({ page }) => {
    // SCEN-254
    await page.fill('textarea[name="correction-reason"]', '作業時間の誤入力のため修正');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toContainText('保存完了');
  });

  test("SCEN-255: 修正前データが正しく表示される", async ({ page }) => {
    // SCEN-255
    await page.goto("/panels/work-list.html");
    await page.click('tr[data-record-id="1"] .edit-button');
    await page.goto("/panels/scr-1778907319067.html");
    await expect(page.locator('input[name="work-date"]')).toHaveValue('2024-01-10');
    await expect(page.locator('input[name="start-time"]')).toHaveValue('09:00');
    await expect(page.locator('input[name="work-content"]')).toHaveValue('開発作業');
  });

  test("SCEN-256: 実作業時間が自動計算される", async ({ page }) => {
    // SCEN-256
    await page.fill('input[name="start-time"]', '09:00');
    await page.fill('input[name="end-time"]', '17:30');
    await page.fill('input[name="break-minutes"]', '60');
    await expect(page.locator('input[name="actual-work-time"]')).toHaveValue('7.5');
  });

  test("SCEN-257: 修正対象記録未選択でエラー", async ({ page }) => {
    // SCEN-257
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('修正対象の記録が選択されていません');
  });

  test("SCEN-258: 作業日付に無効な日付でエラー", async ({ page }) => {
    // SCEN-258
    await page.fill('input[name="work-date"]', '2024/02/30');
    await page.fill('input[name="work-content"]', '作業内容');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('無効な日付です');
  });

  test("SCEN-259: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-259
    await page.fill('input[name="start-time"]', '14:00');
    await page.fill('input[name="end-time"]', '13:00');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('開始時刻は終了時刻より前の時刻を入力してください');
  });

  test("SCEN-260: 中断時刻が作業時間外でエラー", async ({ page }) => {
    // SCEN-260
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="break-time"]', '23:30');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('中断時刻が作業時間外です');
  });

  test("SCEN-261: 修正理由未入力でエラー", async ({ page }) => {
    // SCEN-261
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="work-hours"]', '9.0');
    await page.fill('textarea[name="correction-reason"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('修正理由を入力してください');
  });

  test("SCEN-262: 異常値警告が正しく表示される", async ({ page }) => {
    // SCEN-262
    await page.fill('input[name="work-hours"]', '-5');
    await page.fill('input[name="start-time"]', '25:00');
    await page.fill('input[name="work-date"]', '2025-12-31');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('負の数値は入力できません');
  });

  test("SCEN-263: 作業日付境界値で正常動作", async ({ page }) => {
    // SCEN-263
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="work-date"]', '1900-01-01');
    await page.fill('input[name="work-content"]', '作業内容');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await page.fill('input[name="work-date"]', '2099-12-31');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-264: 時刻境界値00:00と23:59で正常動作", async ({ page }) => {
    // SCEN-264
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="start-time"]', '00:00');
    await page.fill('input[name="end-time"]', '23:59');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
    await page.goto("/panels/work-list.html");
    await expect(page.locator('tr[data-record-id="1"] .start-time')).toContainText('00:00');
  });

  test("SCEN-265: 修正理由文字数上限での動作", async ({ page }) => {
    // SCEN-265
    await page.click('tr[data-record-id="1"]');
    const maxText = 'あ'.repeat(200);
    await page.fill('textarea[name="correction-reason"]', maxText);
    await page.type('textarea[name="correction-reason"]', 'い');
    await page.click('button[type="submit"]');
    await expect(page.locator('textarea[name="correction-reason"]')).toHaveValue(maxText);
  });

  test("SCEN-266: 24時間作業での時間計算", async ({ page }) => {
    // SCEN-266
    await page.click('tr[data-record-id="1"]');
    await page.fill('input[name="start-time"]', '00:00');
    await page.fill('input[name="end-time"]', '23:59');
    await page.click('button[type="submit"]');
    await expect(page.locator('input[name="total-work-time"]')).toHaveValue('23時間59分');
    await expect(page.locator('.warning-message')).toContainText('長時間作業');
  });
});