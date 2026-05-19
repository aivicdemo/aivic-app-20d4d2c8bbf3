import { test, expect } from '@playwright/test';

test.describe("工数記録終了画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907199709.html");
  });

  test("SCEN-080: 全項目入力で記録確定が成功する", async ({ page }) => {
    // SCEN-080
    await page.selectOption('#completion-status', 'completed');
    await page.fill('#work-memo', '作業完了しました');
    await page.click('button:has-text("記録確定")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-081: 作業メモ未入力で記録確定が成功する", async ({ page }) => {
    // SCEN-081
    await page.selectOption('#completion-status', 'completed');
    await page.click('button:has-text("記録確定")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-082: 異常報告ありで記録確定が成功する", async ({ page }) => {
    // SCEN-082
    await page.selectOption('#completion-status', 'completed');
    await page.check('#has-issue');
    await page.fill('#issue-content', '機械の調子が悪い');
    await page.click('button:has-text("記録確定")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-083: キャンセルで前画面に戻る", async ({ page }) => {
    // SCEN-083
    await page.click('button:has-text("キャンセル")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-084: 完了状況未選択で記録確定エラー", async ({ page }) => {
    // SCEN-084
    await page.fill('#work-memo', 'テスト作業');
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('完了状況');
  });

  test("SCEN-085: 異常報告チェック時に異常内容未入力でエラー", async ({ page }) => {
    // SCEN-085
    await page.selectOption('#completion-status', 'completed');
    await page.check('#has-issue');
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('異常内容');
  });

  test("SCEN-086: 作業メモ最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-086
    const maxText = 'a'.repeat(1000);
    await page.selectOption('#completion-status', 'completed');
    await page.fill('#work-memo', maxText);
    await page.click('button:has-text("記録確定")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-087: 作業メモ最大文字数超過でエラー", async ({ page }) => {
    // SCEN-087
    const overMaxText = 'a'.repeat(1001);
    await page.selectOption('#completion-status', 'completed');
    await page.fill('#work-memo', overMaxText);
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('文字数');
  });

  test("SCEN-088: 異常内容最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-088
    const maxText = 'a'.repeat(1000);
    await page.selectOption('#completion-status', 'completed');
    await page.check('#has-issue');
    await page.fill('#issue-content', maxText);
    await page.click('button:has-text("記録確定")');
    await expect(page).toHaveURL(/\/panels\/scr-/);
  });

  test("SCEN-089: 異常内容最大文字数超過でエラー", async ({ page }) => {
    // SCEN-089
    const overMaxText = 'a'.repeat(1001);
    await page.selectOption('#completion-status', 'completed');
    await page.check('#has-issue');
    await page.fill('#issue-content', overMaxText);
    await page.click('button:has-text("記録確定")');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('文字数');
  });

  test("SCEN-090: 異常報告チェック解除で異常内容が非表示になる", async ({ page }) => {
    // SCEN-090
    await page.check('#has-issue');
    await expect(page.locator('#issue-content-section')).toBeVisible();
    await page.fill('#issue-content', 'テスト内容');
    await page.uncheck('#has-issue');
    await expect(page.locator('#issue-content-section')).toBeHidden();
  });

  test("SCEN-091: 時刻情報が正しく表示される", async ({ page }) => {
    // SCEN-091
    await expect(page.locator('#start-time')).toBeVisible();
    await expect(page.locator('#end-time')).toBeVisible();
    await expect(page.locator('#total-time')).toBeVisible();
    const startTime = await page.locator('#start-time').textContent();
    const endTime = await page.locator('#end-time').textContent();
    expect(startTime).toMatch(/\d{2}:\d{2}/);
    expect(endTime).toMatch(/\d{2}:\d{2}/);
  });

  test("SCEN-092: 実作業時間が正しく計算表示される", async ({ page }) => {
    // SCEN-092
    await expect(page.locator('#actual-work-time')).toBeVisible();
    const actualWorkTime = await page.locator('#actual-work-time').textContent();
    expect(actualWorkTime).toMatch(/\d+:\d{2}:\d{2}/);
  });
});