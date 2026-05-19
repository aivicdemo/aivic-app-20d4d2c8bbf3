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
    await expect(page).toHaveURL(/scr-1778907199709/);
  });

  test("SCEN-065: 作業場所入力して工数記録開始", async ({ page }) => {
    // SCEN-065
    await page.fill('[data-testid="work-location-input"]', 'A棟3階301号室');
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709/);
  });

  test("SCEN-066: 備考入力して工数記録開始", async ({ page }) => {
    // SCEN-066
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.fill('[data-testid="work-notes-input"]', '作業内容の詳細情報');
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709/);
  });

  test("SCEN-067: 中断中作業を再開", async ({ page }) => {
    // SCEN-067
    const resumeButton = page.locator('[data-testid="paused-works-list"] button:has-text("再開")').first();
    if (await resumeButton.count() > 0) {
      await resumeButton.click();
      await page.click('#confirm-ok');
      await expect(page.locator('[data-testid="active-works-list"]')).toBeVisible();
    }
  });

  test("SCEN-068: 進行中作業一覧表示確認", async ({ page }) => {
    // SCEN-068
    await expect(page.locator('[data-testid="active-works-list"]')).toBeVisible();
    const activeList = page.locator('[data-testid="active-works-list"]');
    await expect(activeList).toContainText(/.+/);
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
    await expect(page).toHaveURL(/scr-1778907380182/);
  });

  test("SCEN-072: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-072
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/作業項目/);
  });

  test("SCEN-073: 作業場所に不正文字入力", async ({ page }) => {
    // SCEN-073
    await page.fill('[data-testid="work-location-input"]', '<script>alert("test")</script>');
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-074: 複数作業の同時開始制御", async ({ page }) => {
    // SCEN-074
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('[data-testid="work-item-select"]', { index: 2 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/実行中.*作業/);
  });

  test("SCEN-075: 存在しない中断作業の再開", async ({ page }) => {
    // SCEN-075
    await page.goto("/panels/scr-1778907187615.html?workId=invalid");
    const resumeButton = page.locator('button:has-text("再開")');
    if (await resumeButton.count() > 0) {
      await resumeButton.click();
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/見つかりません/);
    }
  });

  test("SCEN-076: 作業場所文字数上限入力", async ({ page }) => {
    // SCEN-076
    const maxText = 'A'.repeat(50);
    await page.fill('[data-testid="work-location-input"]', maxText);
    await expect(page.locator('[data-testid="work-location-input"]')).toHaveValue(maxText);
    
    const overText = 'A'.repeat(51);
    await page.fill('[data-testid="work-location-input"]', overText);
    const inputValue = await page.locator('[data-testid="work-location-input"]').inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(50);
  });

  test("SCEN-077: 備考文字数上限入力", async ({ page }) => {
    // SCEN-077
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    const maxText = 'A'.repeat(500);
    await page.fill('[data-testid="work-notes-input"]', maxText);
    await expect(page.locator('[data-testid="work-notes-input"]')).toHaveValue(maxText);
    
    const overText = 'A'.repeat(501);
    await page.fill('[data-testid="work-notes-input"]', overText);
    const inputValue = await page.locator('[data-testid="work-notes-input"]').inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(500);
  });

  test("SCEN-078: 作業場所空欄で記録開始", async ({ page }) => {
    // SCEN-078
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    if (await page.locator('[data-testid="error-message"]').count() > 0) {
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/作業場所/);
    } else {
      await expect(page).toHaveURL(/scr-1778907199709/);
    }
  });

  test("SCEN-079: 備考空欄で記録開始", async ({ page }) => {
    // SCEN-079
    await page.selectOption('[data-testid="work-item-select"]', { index: 1 });
    await page.click('[data-testid="start-work-button"]');
    await expect(page).toHaveURL(/scr-1778907199709/);
  });
});