import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("日付選択で該当日の工数記録が表示される", async ({ page }) => {
    // SCEN-109
    await page.goto("/records");
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', '2024-01-15');
    await expect(page.locator('.record-list')).toBeVisible();
  });

  test("作業記録一覧テーブルに全項目が正しく表示される", async ({ page }) => {
    // SCEN-110
    await page.goto("/records");
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("日付")')).toBeVisible();
    await expect(page.locator('th:has-text("開始時間")')).toBeVisible();
    await expect(page.locator('th:has-text("終了時間")')).toBeVisible();
    await expect(page.locator('th:has-text("作業内容")')).toBeVisible();
    await expect(page.locator('th:has-text("作業場所")')).toBeVisible();
    await expect(page.locator('th:has-text("工数")')).toBeVisible();
    await expect(page.locator('th:has-text("備考")')).toBeVisible();
  });

  test("編集ボタンで編集画面に遷移する", async ({ page }) => {
    // SCEN-111
    await page.goto("/records");
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/.*edit.*/);
  });

  test("削除ボタンで記録が削除される", async ({ page }) => {
    // SCEN-112
    await page.goto("/records");
    const recordCount = await page.locator('tbody tr').count();
    await page.click('button:has-text("削除")');
    await page.click('button:has-text("削除"):visible');
    const newRecordCount = await page.locator('tbody tr').count();
    expect(newRecordCount).toBe(recordCount - 1);
  });

  test("詳細表示ボタンで詳細画面が表示される", async ({ page }) => {
    // SCEN-113
    await page.goto("/records");
    await page.click('button:has-text("詳細")');
    await expect(page.locator('.record-detail')).toBeVisible();
  });

  test("期間絞り込みで指定期間の記録のみ表示される", async ({ page }) => {
    // SCEN-114
    await page.goto("/records");
    await page.fill('input[placeholder*="開始日"]', '2024-01-01');
    await page.fill('input[placeholder*="終了日"]', '2024-01-31');
    await page.click('button:has-text("絞り込み")');
    await expect(page.locator('.record-list')).toBeVisible();
  });

  test("異常値警告アイコンが該当記録に表示される", async ({ page }) => {
    // SCEN-115
    await page.goto("/records");
    await expect(page.locator('.warning-icon')).toBeVisible();
  });

  test("工数記録が存在しない日付を選択", async ({ page }) => {
    // SCEN-116
    await page.goto("/records");
    await page.fill('input[type="date"]', '2030-12-31');
    await expect(page.locator(':has-text("記録なし")')).toBeVisible();
  });

  test("削除権限がない記録の削除を試行", async ({ page }) => {
    // SCEN-117
    await page.goto("/records");
    await page.click('button:has-text("削除")');
    await expect(page.locator(':has-text("削除権限がありません")')).toBeVisible();
  });

  test("編集権限がない記録の編集を試行", async ({ page }) => {
    // SCEN-118
    await page.goto("/records");
    await page.click('button:has-text("編集")');
    await expect(page.locator(':has-text("編集権限がありません")')).toBeVisible();
  });

  test("期間絞り込みで開始日が終了日より後の日付を指定", async ({ page }) => {
    // SCEN-119
    await page.goto("/records");
    await page.fill('input[placeholder*="開始日"]', '2024-03-15');
    await page.fill('input[placeholder*="終了日"]', '2024-03-10');
    await page.click('button:has-text("絞り込み")');
    await expect(page.locator(':has-text("開始日は終了日より前の日付を指定してください")')).toBeVisible();
  });

  test("月末日から月初日への日付選択", async ({ page }) => {
    // SCEN-120
    await page.goto("/records");
    await page.fill('input[type="date"]', '2024-01-31');
    await page.fill('input[type="date"]', '2024-02-01');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-02-01');
  });

  test("当日の日付選択", async ({ page }) => {
    // SCEN-121
    await page.goto("/records");
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await expect(page.locator('input[type="date"]')).toHaveValue(today);
    await expect(page.locator('.record-list')).toBeVisible();
  });

  test("最大表示件数の境界値での記録表示", async ({ page }) => {
    // SCEN-122
    await page.goto("/records");
    const recordCount = await page.locator('tbody tr').count();
    if (recordCount > 10) {
      await expect(page.locator('.pagination')).toBeVisible();
    }
  });

  test("24時間を超える異常な作業時間の表示", async ({ page }) => {
    // SCEN-123
    await page.goto("/records");
    await expect(page.locator('td:has-text("25:")')).toBeVisible();
    await expect(page.locator('.warning-icon')).toBeVisible();
  });
});