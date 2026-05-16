import { test, expect } from '@playwright/test';

test.describe("工数記録終了画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("全項目入力で記録確定が成功する", async ({ page }) => {
    // SCEN-080
    await page.goto("/work-end");
    await page.fill('[name="workItem"]', "テスト作業");
    await page.fill('[name="startTime"]', "09:00");
    await page.fill('[name="endTime"]', "17:00");
    await page.fill('[name="workDetail"]', "作業詳細");
    await page.selectOption('[name="workLocation"]', "現場A");
    await page.fill('[name="assignee"]', "作業者名");
    await page.fill('[name="memo"]', "備考テスト");
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("作業メモ未入力で記録確定が成功する", async ({ page }) => {
    // SCEN-081
    await page.goto("/work-start");
    await page.click('button:has-text("作業開始")');
    await page.click('button:has-text("作業終了")');
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("異常報告ありで記録確定が成功する", async ({ page }) => {
    // SCEN-082
    await page.goto("/work-end");
    await page.fill('[name="workTime"]', "8:00");
    await page.check('[name="hasIssue"]');
    await page.fill('[name="issueDetail"]', "異常内容詳細");
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("キャンセルで前画面に戻る", async ({ page }) => {
    // SCEN-083
    await page.goto("/work-end");
    await page.click('button:has-text("キャンセル")');
    await expect(page).toHaveURL(/work/);
  });

  test("完了状況未選択で記録確定エラー", async ({ page }) => {
    // SCEN-084
    await page.goto("/work-end");
    await page.fill('[name="workContent"]', "作業内容");
    await page.fill('[name="workTime"]', "8:00");
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('.error-message')).toContainText("完了状況");
  });

  test("異常報告チェック時に異常内容未入力でエラー", async ({ page }) => {
    // SCEN-085
    await page.goto("/work-end");
    await page.check('[name="hasIssue"]');
    await page.click('button:has-text("記録終了")');
    await expect(page.locator('.error-message')).toContainText("異常内容");
  });

  test("作業メモ最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-086
    await page.goto("/work-end");
    const maxText = "あ".repeat(1000);
    await page.fill('[name="memo"]', maxText);
    await page.fill('[name="workTime"]', "8:00");
    await page.fill('[name="workContent"]', "作業内容");
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("作業メモ最大文字数超過でエラー", async ({ page }) => {
    // SCEN-087
    await page.goto("/work-end");
    const overText = "あ".repeat(1001);
    await page.fill('[name="memo"]', overText);
    await page.click('button:has-text("記録終了")');
    await expect(page.locator('.error-message')).toContainText("文字数");
  });

  test("異常内容最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-088
    await page.goto("/work-start");
    await page.click('button:has-text("作業開始")');
    await page.click('button:has-text("作業終了")');
    const maxText = "あ".repeat(500);
    await page.fill('[name="issueDetail"]', maxText);
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("異常内容最大文字数超過でエラー", async ({ page }) => {
    // SCEN-089
    await page.goto("/work-end");
    await page.fill('[name="endTime"]', "17:00");
    const overText = "あ".repeat(501);
    await page.fill('[name="issueDetail"]', overText);
    await page.click('button:has-text("登録")');
    await expect(page.locator('.error-message')).toContainText("文字数制限");
  });

  test("異常報告チェック解除で異常内容が非表示になる", async ({ page }) => {
    // SCEN-090
    await page.goto("/work-end");
    await page.check('[name="hasIssue"]');
    await expect(page.locator('[name="issueDetail"]')).toBeVisible();
    await page.fill('[name="issueDetail"]', "テスト内容");
    await page.uncheck('[name="hasIssue"]');
    await expect(page.locator('[name="issueDetail"]')).not.toBeVisible();
  });

  test("時刻情報が正しく表示される", async ({ page }) => {
    // SCEN-091
    await page.goto("/login");
    await page.click('button:has-text("作業開始")');
    await page.click('button:has-text("作業完了")');
    await expect(page.locator('.start-time')).toContainText(/\d{2}:\d{2}/);
    await expect(page.locator('.end-time')).toContainText(/\d{2}:\d{2}/);
    await expect(page.locator('.work-duration')).toContainText(/\d{2}:\d{2}/);
  });

  test("実作業時間が正しく計算表示される", async ({ page }) => {
    // SCEN-092
    await page.goto("/login");
    await page.click('button:has-text("作業開始")');
    await page.waitForTimeout(1000);
    await page.click('button:has-text("作業終了")');
    await expect(page.locator('.actual-work-time')).toContainText(/\d{2}:\d{2}:\d{2}/);
  });
});