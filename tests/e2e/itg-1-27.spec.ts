import { test, expect } from '@playwright/test';

test.describe("工数記録開始画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907187615.html");
  });

  test("SCEN-064: 作業項目選択して工数記録開始", async ({ page }) => {
    // SCEN-064
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await expect(page.locator('[data-testid="work-item-select"]')).toHaveValue(/.+/);
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709\.html/);
  });

  test("SCEN-065: 作業場所入力して工数記録開始", async ({ page }) => {
    // SCEN-065
    await page.fill('[data-testid="work-location-input"]', 'A棟3階301号室');
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709\.html/);
  });

  test("SCEN-066: 備考入力して工数記録開始", async ({ page }) => {
    // SCEN-066
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-notes-input"]', '詳細な作業内容の説明');
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709\.html/);
  });

  test("SCEN-067: 中断中作業を再開", async ({ page }) => {
    // SCEN-067
    await page.click('[data-testid="paused-works-list"] button:has-text("再開")');
    await expect(page.locator('#confirm-dialog')).toBeVisible();
    await page.click('#confirm-ok');
    await expect(page.locator('[data-testid="active-works-list"]')).toContainText(/./);
  });

  test("SCEN-068: 進行中作業一覧表示確認", async ({ page }) => {
    // SCEN-068
    await expect(page.locator('[data-testid="active-works-list"]')).toBeVisible();
    const activeWorkItems = page.locator('[data-testid="active-works-list"] .work-item');
    await expect(activeWorkItems).toHaveCount(0); // または実際のデータに応じて調整
  });

  test("SCEN-069: 作業員名と現在日時表示確認", async ({ page }) => {
    // SCEN-069
    await expect(page.locator('[data-testid="worker-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-datetime"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-datetime"]')).toHaveText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  test("SCEN-070: ログアウト実行", async ({ page }) => {
    // SCEN-070
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL(/login\.html/);
  });

  test("SCEN-071: 設定メニューアクセス", async ({ page }) => {
    // SCEN-071
    await page.click('[data-testid="settings-button"]');
    await expect(page).toHaveURL(/scr-/);
  });

  test("SCEN-072: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-072
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業項目');
  });

  test("SCEN-073: 作業場所に不正文字入力", async ({ page }) => {
    // SCEN-073
    await page.fill('[data-testid="work-location-input"]', '<script>alert(\'test\')</script>');
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-074: 複数作業の同時開始制御", async ({ page }) => {
    // SCEN-074
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await page.waitForTimeout(1000);
    await page.selectOption('[data-testid="work-item-select"]', { index: 2 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('既に実行中');
  });

  test("SCEN-075: 存在しない中断作業の再開", async ({ page }) => {
    // SCEN-075
    await page.goto("/panels/scr-1778907187615.html?resumeId=nonexistent");
    await page.click('button:has-text("再開")').catch(() => {});
    await expect(page.locator('[data-testid="error-message"]')).toContainText('見つかりません');
  });

  test("SCEN-076: 作業場所文字数上限入力", async ({ page }) => {
    // SCEN-076
    const maxText = 'A'.repeat(50);
    const overText = 'A'.repeat(51);
    await page.fill('[data-testid="work-location-input"]', maxText);
    await expect(page.locator('[data-testid="work-location-input"]')).toHaveValue(maxText);
    await page.fill('[data-testid="work-location-input"]', overText);
    const actualValue = await page.locator('[data-testid="work-location-input"]').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(50);
  });

  test("SCEN-077: 備考文字数上限入力", async ({ page }) => {
    // SCEN-077
    const maxText = 'A'.repeat(500);
    const overText = 'A'.repeat(501);
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-notes-input"]', maxText);
    await expect(page.locator('[data-testid="work-notes-input"]')).toHaveValue(maxText);
    await page.fill('[data-testid="work-notes-input"]', overText);
    const actualValue = await page.locator('[data-testid="work-notes-input"]').inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(500);
  });

  test("SCEN-078: 作業場所空欄で記録開始", async ({ page }) => {
    // SCEN-078
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-location-input"]', '');
    await page.click('[data-testid="start-work-button"]');
    const errorVisible = await page.locator('[data-testid="error-message"]').isVisible();
    if (errorVisible) {
      await expect(page.locator('[data-testid="error-message"]')).toContainText('作業場所');
    } else {
      await expect(page).toHaveURL(/scr-1778907199709\.html/);
    }
  });

  test("SCEN-079: 備考空欄で記録開始", async ({ page }) => {
    // SCEN-079
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-notes-input"]', '');
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709\.html/);
  });
});