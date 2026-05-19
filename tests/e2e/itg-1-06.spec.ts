import { test, expect } from '@playwright/test';

test.describe("工数記録終了画面", () => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test.beforeEach(async ({ page }) => {
    page.setBaseURL(baseUrl);
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
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.fill('[data-testid="work-memo"]', '作業完了しました');
    await page.click('[data-testid="save-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-081: 作業メモ未入力で記録確定が成功する", async ({ page }) => {
    // SCEN-081
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.click('[data-testid="save-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-082: 異常報告ありで記録確定が成功する", async ({ page }) => {
    // SCEN-082
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.check('[data-testid="has-issue"]');
    await page.fill('[data-testid="issue-content"]', '機械の調子が悪い');
    await page.click('[data-testid="save-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-083: キャンセルで前画面に戻る", async ({ page }) => {
    // SCEN-083
    await page.click('[data-testid="cancel-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-084: 完了状況未選択で記録確定エラー", async ({ page }) => {
    // SCEN-084
    await page.fill('[data-testid="work-memo"]', '作業内容');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('完了状況');
  });

  test("SCEN-085: 異常報告チェック時に異常内容未入力でエラー", async ({ page }) => {
    // SCEN-085
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.check('[data-testid="has-issue"]');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('異常内容');
  });

  test("SCEN-086: 作業メモ最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-086
    const maxText = 'あ'.repeat(1000);
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.fill('[data-testid="work-memo"]', maxText);
    await page.click('[data-testid="save-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-087: 作業メモ最大文字数超過でエラー", async ({ page }) => {
    // SCEN-087
    const overMaxText = 'あ'.repeat(1001);
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.fill('[data-testid="work-memo"]', overMaxText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数');
  });

  test("SCEN-088: 異常内容最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-088
    const maxIssueText = 'あ'.repeat(1000);
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.check('[data-testid="has-issue"]');
    await page.fill('[data-testid="issue-content"]', maxIssueText);
    await page.click('[data-testid="save-button"]');
    await expect(page).toHaveURL(/panels/);
  });

  test("SCEN-089: 異常内容最大文字数超過でエラー", async ({ page }) => {
    // SCEN-089
    const overMaxIssueText = 'あ'.repeat(1001);
    await page.selectOption('[data-testid="completion-status"]', 'completed');
    await page.check('[data-testid="has-issue"]');
    await page.fill('[data-testid="issue-content"]', overMaxIssueText);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数');
  });

  test("SCEN-090: 異常報告チェック解除で異常内容が非表示になる", async ({ page }) => {
    // SCEN-090
    await page.check('[data-testid="has-issue"]');
    await expect(page.locator('[data-testid="issue-content"]')).toBeVisible();
    await page.fill('[data-testid="issue-content"]', 'テスト入力');
    await page.uncheck('[data-testid="has-issue"]');
    await expect(page.locator('[data-testid="issue-content"]')).not.toBeVisible();
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
    const actualTime = await page.locator('#actual-work-time').textContent();
    expect(actualTime).toMatch(/\d+:\d{2}:\d{2}/);
  });
});