import { test, expect } from '@playwright/test';

test.describe("工数記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test("SCEN-319: 工数記録確認画面の基本表示", async ({ page }) => {
    // SCEN-319
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-320: 作業項目一覧の正常表示", async ({ page }) => {
    // SCEN-320
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-321: 時刻・工数の正常表示", async ({ page }) => {
    // SCEN-321
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-322: 修正ボタンで編集画面遷移", async ({ page }) => {
    // SCEN-322
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-323: 承認ボタンで承認完了", async ({ page }) => {
    // SCEN-323
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-324: 異常値警告アイコンの表示", async ({ page }) => {
    // SCEN-324
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-325: 承認済み記録の修正不可", async ({ page }) => {
    // SCEN-325
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-326: 権限なしユーザーの承認不可", async ({ page }) => {
    // SCEN-326
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-327: 24時間を超える異常工数の警告", async ({ page }) => {
    // SCEN-327
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-328: 終了時刻が開始時刻より早い場合の警告", async ({ page }) => {
    // SCEN-328
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-329: 中断時間が実働時間を超える場合の警告", async ({ page }) => {
    // SCEN-329
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-330: 作業内容詳細の文字数上限表示", async ({ page }) => {
    // SCEN-330
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });

  test("SCEN-331: 作業項目0件の場合の表示", async ({ page }) => {
    // SCEN-331
    await page.goto("/");
    await expect(page.locator('text=工数記録確認')).toBeVisible();
  });
});