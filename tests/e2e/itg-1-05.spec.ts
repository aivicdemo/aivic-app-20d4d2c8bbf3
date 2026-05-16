import { test, expect } from '@playwright/test';

test.describe("工数記録開始画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907187615.html");
  });

  test("SCEN-064: 作業項目選択して工数記録開始", async ({ page }) => {
    // SCEN-064
    await page.selectOption('select[name="workItem"]', { index: 1 });
    await expect(page.locator('select[name="workItem"]')).toBeVisible();
    await page.click('button:has-text("記録開始")');
    await expect(page).toHaveURL(/work-recording/);
    await expect(page.locator('.work-item-name')).toBeVisible();
    await expect(page.locator('.start-time')).toBeVisible();
  });

  test("SCEN-065: 作業場所入力して工数記録開始", async ({ page }) => {
    // SCEN-065
    await page.fill('input[name="location"]', 'A棟3階301号室');
    await page.click('button:has-text("作業開始")');
    await expect(page).toHaveURL(/work-recording/);
    await expect(page.locator(':has-text("A棟3階301号室")')).toBeVisible();
  });

  test("SCEN-066: 備考入力して工数記録開始", async ({ page }) => {
    // SCEN-066
    await page.selectOption('select[name="workItem"]', { index: 1 });
    await expect(page.locator('input[name="startTime"]')).toHaveValue(/.+/);
    await page.fill('textarea[name="memo"]', '作業内容の詳細情報');
    await page.click('button:has-text("記録開始")');
    await expect(page).toHaveURL(/work-recording/);
  });

  test("SCEN-067: 中断中作業を再開", async ({ page }) => {
    // SCEN-067
    await expect(page.locator('.suspended-work-list')).toBeVisible();
    await page.click('button:has-text("再開")');
    await expect(page.locator('.confirmation-dialog')).toBeVisible();
    await page.click('.confirmation-dialog button:has-text("再開")');
    await expect(page.locator('.active-work-list')).toBeVisible();
  });

  test("SCEN-068: 進行中作業一覧表示確認", async ({ page }) => {
    // SCEN-068
    await expect(page.locator('.active-work-list')).toBeVisible();
    await expect(page.locator('.work-name')).toBeVisible();
    await expect(page.locator('.start-time')).toBeVisible();
    await expect(page.locator('.elapsed-time')).toBeVisible();
  });

  test("SCEN-069: 作業員名と現在日時表示確認", async ({ page }) => {
    // SCEN-069
    await expect(page.locator('.worker-name')).toBeVisible();
    await expect(page.locator('.current-datetime')).toHaveText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  test("SCEN-070: ログアウト実行", async ({ page }) => {
    // SCEN-070
    await page.click('.user-menu');
    await page.click('button:has-text("ログアウト")');
    if (await page.locator('.logout-confirmation').isVisible()) {
      await page.click('button:has-text("ログアウト")');
    }
    await expect(page).toHaveURL(/login/);
  });

  test("SCEN-071: 設定メニューアクセス", async ({ page }) => {
    // SCEN-071
    await page.click('button.settings-button');
    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('.notification-settings')).toBeVisible();
  });

  test("SCEN-072: 作業項目未選択で開始ボタン押下", async ({ page }) => {
    // SCEN-072
    await page.click('button:has-text("記録開始")');
    await expect(page.locator('.error-message')).toContainText('作業項目を選択してください');
    await expect(page).toHaveURL(/scr-1778907187615/);
  });

  test("SCEN-073: 作業場所に不正文字入力", async ({ page }) => {
    // SCEN-073
    await page.fill('input[name="location"]', '<script>alert(\'test\')</script>');
    await page.selectOption('select[name="workItem"]', { index: 1 });
    await page.click('button:has-text("記録開始")');
    await expect(page.locator('.validation-error')).toBeVisible();
    await expect(page).toHaveURL(/scr-1778907187615/);
  });

  test("SCEN-074: 複数作業の同時開始制御", async ({ page }) => {
    // SCEN-074
    await page.selectOption('select[name="workItem"]', 'システム開発');
    await page.click('button:has-text("記録開始")');
    await expect(page.locator('.active-work')).toContainText('システム開発');
    await page.selectOption('select[name="workItem"]', 'テスト実行');
    await page.click('button:has-text("記録開始")');
    await expect(page.locator('.error-message')).toContainText('既に実行中の作業があります');
  });

  test("SCEN-075: 存在しない中断作業の再開", async ({ page }) => {
    // SCEN-075
    await page.goto("/panels/scr-1778907187615.html?resumeId=999999");
    await page.click('button:has-text("中断作業を再開")');
    await expect(page.locator('.error-message')).toContainText('指定された作業が見つかりません');
  });

  test("SCEN-076: 作業場所文字数上限入力", async ({ page }) => {
    // SCEN-076
    const maxText = 'A'.repeat(50);
    const overText = 'A'.repeat(51);
    await page.fill('input[name="location"]', maxText);
    await expect(page.locator('input[name="location"]')).toHaveValue(maxText);
    await page.fill('input[name="location"]', overText);
    const actualValue = await page.inputValue('input[name="location"]');
    expect(actualValue.length).toBeLessThanOrEqual(50);
  });

  test("SCEN-077: 備考文字数上限入力", async ({ page }) => {
    // SCEN-077
    await page.selectOption('select[name="workItem"]', { index: 1 });
    const maxText = 'A'.repeat(500);
    const overText = 'A'.repeat(501);
    await page.fill('textarea[name="memo"]', maxText);
    await expect(page.locator('.char-counter')).toBeVisible();
    await page.fill('textarea[name="memo"]', overText);
    const actualValue = await page.inputValue('textarea[name="memo"]');
    expect(actualValue.length).toBeLessThanOrEqual(500);
    await page.click('button:has-text("記録開始")');
    await expect(page).toHaveURL(/work-recording/);
  });

  test("SCEN-078: 作業場所空欄で記録開始", async ({ page }) => {
    // SCEN-078
    await page.selectOption('select[name="workItem"]', { index: 1 });
    await expect(page.locator('input[name="startTime"]')).toHaveValue(/.+/);
    await page.click('button:has-text("記録開始")');
    if (await page.locator('.error-message').isVisible()) {
      await expect(page.locator('.error-message')).toContainText('作業場所');
    } else {
      await expect(page).toHaveURL(/work-recording/);
    }
  });

  test("SCEN-079: 備考空欄で記録開始", async ({ page }) => {
    // SCEN-079
    await page.selectOption('select[name="workItem"]', { index: 1 });
    await expect(page.locator('input[name="startTime"]')).toHaveValue(/.+/);
    await page.click('button:has-text("記録開始")');
    await expect(page).toHaveURL(/work-recording/);
    await expect(page.locator('.start-time')).toBeVisible();
  });
});