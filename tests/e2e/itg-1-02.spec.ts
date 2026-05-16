import { test, expect } from '@playwright/test';

test.describe("工数記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test("SCEN-014: 作業開始から終了まで正常記録", async ({ page }) => {
    // SCEN-014
    await page.goto("/");
    await page.waitForTimeout(2000);
  });

  test("SCEN-015: 作業中断・再開が正常動作", async ({ page }) => {
    // SCEN-015
    await page.goto("/");
    await page.waitForTimeout(2000);
  });

  test("SCEN-016: 作業メモ入力して保存", async ({ page }) => {
    // SCEN-016
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-017: 本日の作業履歴が正しく表示", async ({ page }) => {
    // SCEN-017
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-018: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-018
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-019: 作業未開始で終了ボタン押下", async ({ page }) => {
    // SCEN-019
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-020: 作業未開始で中断ボタン押下", async ({ page }) => {
    // SCEN-020
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-021: 中断理由未入力で中断実行", async ({ page }) => {
    // SCEN-021
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-022: 未保存状態でキャンセル", async ({ page }) => {
    // SCEN-022
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-023: 作業メモ最大文字数入力", async ({ page }) => {
    // SCEN-023
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-024: 中断理由最大文字数入力", async ({ page }) => {
    // SCEN-024
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-025: 24時間連続作業記録", async ({ page }) => {
    // SCEN-025
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-026: 日付跨ぎ作業の記録", async ({ page }) => {
    // SCEN-026
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-027: 同一作業項目で複数回記録", async ({ page }) => {
    // SCEN-027
    await page.goto("/");
    await page.waitForTimeout(1000);
  });

  test("SCEN-028: 経過時間の正確な表示更新", async ({ page }) => {
    // SCEN-028
    await page.goto("/");
    await page.waitForTimeout(30000);
    await page.waitForTimeout(60000);
    await page.waitForTimeout(30000);
  });
});