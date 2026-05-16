import { test, expect } from '@playwright/test';

test.describe("工数記録終了画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907199709.html");
  });

  test("SCEN-080: 全項目入力で記録確定が成功する", async ({ page }) => {
    // SCEN-080
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '17:00');
    await page.fill('[data-testid="work-detail-input"]', '設備点検作業');
    await page.selectOption('[data-testid="location-select"]', 'factory-a');
    await page.fill('[data-testid="worker-name-input"]', '田中太郎');
    await page.fill('[data-testid="memo-input"]', '特記事項なし');
    await page.click('[data-testid="confirm-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-081: 作業メモ未入力で記録確定が成功する", async ({ page }) => {
    // SCEN-081
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="end-work-button"]');
    await page.click('[data-testid="confirm-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-082: 異常報告ありで記録確定が成功する", async ({ page }) => {
    // SCEN-082
    await page.fill('[data-testid="work-time-input"]', '8:00');
    await page.check('[data-testid="incident-report-checkbox"]');
    await page.fill('[data-testid="incident-detail-input"]', '機械の異常音を確認');
    await page.click('[data-testid="confirm-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-083: キャンセルで前画面に戻る", async ({ page }) => {
    // SCEN-083
    await page.click('[data-testid="cancel-button"]');
    await expect(page.url()).toContain('/panels/scr-work-record.html');
  });

  test("SCEN-084: 完了状況未選択で記録確定エラー", async ({ page }) => {
    // SCEN-084
    await page.fill('[data-testid="work-content-input"]', '作業内容');
    await page.fill('[data-testid="work-time-input"]', '8:00');
    await page.click('[data-testid="confirm-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('完了状況を選択してください');
  });

  test("SCEN-085: 異常報告チェック時に異常内容未入力でエラー", async ({ page }) => {
    // SCEN-085
    await page.check('[data-testid="incident-report-checkbox"]');
    await page.click('[data-testid="end-record-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('異常内容を入力してください');
  });

  test("SCEN-086: 作業メモ最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-086
    const maxText = 'あ'.repeat(1000);
    await page.fill('[data-testid="memo-input"]', maxText);
    await page.fill('[data-testid="work-time-input"]', '8:00');
    await page.fill('[data-testid="work-content-input"]', '作業内容');
    await page.click('[data-testid="confirm-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-087: 作業メモ最大文字数超過でエラー", async ({ page }) => {
    // SCEN-087
    const overMaxText = 'あ'.repeat(1001);
    await page.fill('[data-testid="memo-input"]', overMaxText);
    await page.click('[data-testid="end-record-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数超過');
  });

  test("SCEN-088: 異常内容最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-088
    const maxIncidentText = 'あ'.repeat(1000);
    await page.check('[data-testid="incident-report-checkbox"]');
    await page.fill('[data-testid="incident-detail-input"]', maxIncidentText);
    await expect(page.locator('[data-testid="incident-detail-input"]')).toHaveValue(maxIncidentText);
    await page.click('[data-testid="confirm-button"]');
    await expect(page.url()).not.toContain('/panels/scr-1778907199709.html');
  });

  test("SCEN-089: 異常内容最大文字数超過でエラー", async ({ page }) => {
    // SCEN-089
    const overMaxText = 'あ'.repeat(1001);
    await page.fill('[data-testid="end-time-input"]', '17:00');
    await page.fill('[data-testid="incident-detail-input"]', overMaxText);
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数制限超過');
  });

  test("SCEN-090: 異常報告チェック解除で異常内容が非表示になる", async ({ page }) => {
    // SCEN-090
    await page.check('[data-testid="incident-report-checkbox"]');
    await expect(page.locator('[data-testid="incident-detail-input"]')).toBeVisible();
    await page.fill('[data-testid="incident-detail-input"]', '異常内容テキスト');
    await page.uncheck('[data-testid="incident-report-checkbox"]');
    await expect(page.locator('[data-testid="incident-detail-input"]')).not.toBeVisible();
  });

  test("SCEN-091: 時刻情報が正しく表示される", async ({ page }) => {
    // SCEN-091
    await expect(page.locator('[data-testid="start-time-display"]')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.locator('[data-testid="end-time-display"]')).toHaveText(/^\d{2}:\d{2}$/);
    await expect(page.locator('[data-testid="work-duration-display"]')).toHaveText(/^\d{2}:\d{2}$/);
  });

  test("SCEN-092: 実作業時間が正しく計算表示される", async ({ page }) => {
    // SCEN-092
    await page.click('[data-testid="start-work-button"]');
    const startTime = await page.locator('[data-testid="start-time-display"]').textContent();
    await page.waitForTimeout(2000);
    await page.click('[data-testid="end-work-button"]');
    const actualWorkTime = await page.locator('[data-testid="actual-work-time-display"]').textContent();
    await expect(actualWorkTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});