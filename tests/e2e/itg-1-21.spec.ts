import { test, expect } from '@playwright/test';

test.describe("工数記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907380182.html");
  });

  test("SCEN-332: 全項目入力で工数記録を正常登録", async ({ page }) => {
    // SCEN-332
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[placeholder*="作業者"]', '田中太郎');
    await page.selectOption('select', 'プロジェクトA');
    await page.fill('input[placeholder*="作業項目"]', 'システム設計書作成');
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.fill('input[placeholder*="休憩"]', '60');
    await page.fill('textarea', '設計書の詳細作成');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="登録完了"')).toBeVisible();
  });

  test("SCEN-333: 中断時間ありで工数が正しく自動計算", async ({ page }) => {
    // SCEN-333
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.fill('input[placeholder*="中断"]', '60');
    await page.click('button:has-text("計算")');
    await expect(page.locator('text="7.0h"')).toBeVisible();
  });

  test("SCEN-334: 一時保存後に記録確定", async ({ page }) => {
    // SCEN-334
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('textarea', '作業内容');
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.click('button:has-text("一時保存")');
    await expect(page.locator('text="一時保存完了"')).toBeVisible();
    await page.click('button:has-text("記録確定")');
    await page.click('button:has-text("OK")');
    await expect(page.locator('text="確定完了"')).toBeVisible();
  });

  test("SCEN-335: 必須項目未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-335
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="必須項目"')).toBeVisible();
  });

  test("SCEN-336: 開始時刻が終了時刻より後でエラー", async ({ page }) => {
    // SCEN-336
    await page.selectOption('select', 'プロジェクトA');
    await page.fill('input[type="time"]:first-of-type', '14:00');
    await page.fill('input[type="time"]:last-of-type', '10:00');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="開始時刻が終了時刻より後"')).toBeVisible();
  });

  test("SCEN-337: 未来日付選択でエラー", async ({ page }) => {
    // SCEN-337
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    await page.fill('input[type="date"]', futureDateStr);
    await page.fill('textarea', '作業内容');
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="未来日付は選択できません"')).toBeVisible();
  });

  test("SCEN-338: 24時間以上の作業時間でエラー", async ({ page }) => {
    // SCEN-338
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '10:00');
    await page.fill('textarea', 'テスト作業');
    await page.selectOption('select', 'プロジェクトA');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="24時間以上"')).toBeVisible();
  });

  test("SCEN-339: 作業内容詳細の最大文字数制限", async ({ page }) => {
    // SCEN-339
    const maxText = 'a'.repeat(1000);
    const overText = 'a'.repeat(1001);
    
    await page.fill('textarea', maxText);
    await expect(page.locator('textarea')).toHaveValue(maxText);
    
    await page.fill('textarea', overText);
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="文字数制限"')).toBeVisible();
  });

  test("SCEN-340: 同日00:00-23:59の境界時刻入力", async ({ page }) => {
    // SCEN-340
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[type="time"]:first-of-type', '00:00');
    await page.fill('input[type="time"]:last-of-type', '23:59');
    await page.fill('textarea', 'テスト作業');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="登録完了"')).toBeVisible();
  });

  test("SCEN-341: 中断時間が作業時間を超過する場合", async ({ page }) => {
    // SCEN-341
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.fill('input[placeholder*="中断"]', '540');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text="中断時間は作業時間を超過できません"')).toBeVisible();
  });

  test("SCEN-342: キャンセルで入力内容がクリア", async ({ page }) => {
    // SCEN-342
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('textarea', 'テスト作業');
    await page.fill('input[type="time"]:first-of-type', '09:00');
    await page.fill('input[type="time"]:last-of-type', '17:00');
    await page.click('button:has-text("キャンセル")');
    
    await expect(page.locator('input[type="date"]')).toHaveValue('');
    await expect(page.locator('textarea')).toHaveValue('');
    await expect(page.locator('input[type="time"]:first-of-type')).toHaveValue('');
  });

  test("SCEN-343: 日付跨ぎ作業の記録", async ({ page }) => {
    // SCEN-343
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await page.fill('input[type="time"]:first-of-type', '23:30');
    await page.fill('input[type="time"]:last-of-type', '01:30');
    await page.fill('textarea', '設備点検作業');
    await page.selectOption('select', 'プロジェクトA');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text="保存完了"')).toBeVisible();
  });
});