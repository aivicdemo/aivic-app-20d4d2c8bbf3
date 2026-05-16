import { test, expect } from '@playwright/test';

test.describe("工数記録終了画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907199709.html");
  });

  test("SCEN-080: 全項目入力で記録確定が成功する", async ({ page }) => {
    // SCEN-080
    await page.selectOption('[name="workItem"]', 'maintenance');
    await page.fill('[name="startTime"]', '09:00');
    await page.fill('[name="endTime"]', '17:00');
    await page.fill('[name="workDetails"]', '定期メンテナンス作業');
    await page.selectOption('[name="workLocation"]', 'factory-a');
    await page.fill('[name="assignee"]', '田中太郎');
    await page.fill('[name="remarks"]', '特記事項なし');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-081: 作業メモ未入力で記録確定が成功する", async ({ page }) => {
    // SCEN-081
    await page.fill('[name="workMemo"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('.completion-message')).toBeVisible();
  });

  test("SCEN-082: 異常報告ありで記録確定が成功する", async ({ page }) => {
    // SCEN-082
    await page.fill('[name="workTime"]', '8:00');
    await page.check('[name="hasIncident"]');
    await page.fill('[name="incidentDetails"]', '機械の異音を確認');
    await page.click('button[type="submit"]');
    await expect(page.locator('.completion-message')).toBeVisible();
  });

  test("SCEN-083: キャンセルで前画面に戻る", async ({ page }) => {
    // SCEN-083
    await page.click('button[name="cancel"]');
    await expect(page).toHaveURL(/work-record/);
  });

  test("SCEN-084: 完了状況未選択で記録確定エラー", async ({ page }) => {
    // SCEN-084
    await page.fill('[name="workContent"]', '清掃作業');
    await page.fill('[name="workTime"]', '4:30');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText('完了状況を選択してください');
  });

  test("SCEN-085: 異常報告チェック時に異常内容未入力でエラー", async ({ page }) => {
    // SCEN-085
    await page.check('[name="hasIncident"]');
    await page.fill('[name="incidentDetails"]', '');
    await page.click('button[name="endRecord"]');
    await expect(page.locator('.error-message')).toContainText('異常内容を入力してください');
  });

  test("SCEN-086: 作業メモ最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-086
    const maxText = 'あ'.repeat(1000);
    await page.fill('[name="workMemo"]', maxText);
    await page.fill('[name="workTime"]', '8:00');
    await page.fill('[name="workContent"]', '点検作業');
    await page.click('button[type="submit"]');
    await expect(page.locator('.completion-message')).toBeVisible();
  });

  test("SCEN-087: 作業メモ最大文字数超過でエラー", async ({ page }) => {
    // SCEN-087
    const overMaxText = 'あ'.repeat(1001);
    await page.fill('[name="workMemo"]', overMaxText);
    await page.click('button[name="endRecord"]');
    await expect(page.locator('.error-message')).toContainText('文字数制限を超えています');
  });

  test("SCEN-088: 異常内容最大文字数で記録確定が成功する", async ({ page }) => {
    // SCEN-088
    const maxIncidentText = 'あ'.repeat(500);
    await page.fill('[name="incidentDetails"]', maxIncidentText);
    await expect(page.locator('[name="incidentDetails"]')).toHaveValue(maxIncidentText);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/completion|list/);
  });

  test("SCEN-089: 異常内容最大文字数超過でエラー", async ({ page }) => {
    // SCEN-089
    const overMaxText = 'あ'.repeat(501);
    await page.fill('[name="endTime"]', '18:00');
    await page.fill('[name="incidentDetails"]', overMaxText);
    await page.click('button[name="register"]');
    await expect(page.locator('.error-message')).toContainText('文字数制限超過');
  });

  test("SCEN-090: 異常報告チェック解除で異常内容が非表示になる", async ({ page }) => {
    // SCEN-090
    await page.check('[name="hasIncident"]');
    await expect(page.locator('[name="incidentDetails"]')).toBeVisible();
    await page.fill('[name="incidentDetails"]', 'テスト異常内容');
    await page.uncheck('[name="hasIncident"]');
    await expect(page.locator('[name="incidentDetails"]')).not.toBeVisible();
  });

  test("SCEN-091: 時刻情報が正しく表示される", async ({ page }) => {
    // SCEN-091
    await expect(page.locator('.start-time-display')).toMatch(/\d{2}:\d{2}/);
    await expect(page.locator('.end-time-display')).toMatch(/\d{2}:\d{2}/);
    await expect(page.locator('.work-duration-display')).toMatch(/\d{2}:\d{2}/);
  });

  test("SCEN-092: 実作業時間が正しく計算表示される", async ({ page }) => {
    // SCEN-092
    await expect(page.locator('.actual-work-time')).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});