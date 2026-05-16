import { test, expect } from '@playwright/test';

test.describe("工数記録開始画面", () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907187615.html");
  });

  test('SCEN-064: 作業項目選択して工数記録開始', async ({ page }) => {
    // SCEN-064
    await page.click('[data-testid="work-item-select"] option:first-child');
    await expect(page.locator('[data-testid="work-item-select"]')).toHaveClass(/selected/);
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page).toHaveURL(/work-recording/);
  });

  test('SCEN-065: 作業場所入力して工数記録開始', async ({ page }) => {
    // SCEN-065
    await page.fill('[data-testid="work-location-input"]', 'A棟3階301号室');
    await page.click('[data-testid="start-work-btn"]');
    await expect(page).toHaveURL(/work-tracking/);
  });

  test('SCEN-066: 備考入力して工数記録開始', async ({ page }) => {
    // SCEN-066
    await page.click('[data-testid="work-item-select"] option:first-child');
    await expect(page.locator('[data-testid="start-time-input"]')).toHaveValue(/.+/);
    await page.fill('[data-testid="remarks-input"]', '詳細な作業内容の備考');
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page).toHaveURL(/work-in-progress/);
  });

  test('SCEN-067: 中断中作業を再開', async ({ page }) => {
    // SCEN-067
    await page.click('[data-testid="resume-work-btn"]');
    await expect(page.locator('[data-testid="resume-confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-resume-btn"]');
    await expect(page.locator('[data-testid="in-progress-list"]')).toContainText('進行中');
  });

  test('SCEN-068: 進行中作業一覧表示確認', async ({ page }) => {
    // SCEN-068
    await expect(page.locator('[data-testid="in-progress-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="work-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="elapsed-time"]')).toBeVisible();
  });

  test('SCEN-069: 作業員名と現在日時表示確認', async ({ page }) => {
    // SCEN-069
    await expect(page.locator('[data-testid="worker-name"]')).toContainText('testuser');
    await expect(page.locator('[data-testid="current-datetime"]')).toHaveText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  test('SCEN-070: ログアウト実行', async ({ page }) => {
    // SCEN-070
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
    await page.click('[data-testid="confirm-logout-btn"]');
    await expect(page).toHaveURL(/login/);
  });

  test('SCEN-071: 設定メニューアクセス', async ({ page }) => {
    // SCEN-071
    await page.click('[data-testid="settings-btn"]');
    await expect(page).toHaveURL(/settings/);
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();
  });

  test('SCEN-072: 作業項目未選択で開始ボタン押下', async ({ page }) => {
    // SCEN-072
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('作業項目を選択してください');
    await expect(page).toHaveURL(/scr-1778907187615/);
  });

  test('SCEN-073: 作業場所に不正文字入力', async ({ page }) => {
    // SCEN-073
    await page.fill('[data-testid="work-location-input"]', '<script>alert(\'test\')</script>');
    await page.click('[data-testid="work-item-select"] option:first-child');
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('SCEN-074: 複数作業の同時開始制御', async ({ page }) => {
    // SCEN-074
    await page.click('[data-testid="work-item-select"] option[value="system-dev"]');
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page.locator('[data-testid="active-work"]')).toContainText('システム開発');
    await page.click('[data-testid="work-item-select"] option[value="test-exec"]');
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('既に実行中の作業があります');
  });

  test('SCEN-075: 存在しない中断作業の再開', async ({ page }) => {
    // SCEN-075
    await page.goto("/panels/scr-1778907187615.html?resumeId=invalid");
    await page.click('[data-testid="resume-suspended-work-btn"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('指定された作業が見つかりません');
  });

  test('SCEN-076: 作業場所文字数上限入力', async ({ page }) => {
    // SCEN-076
    const maxChars = 'A'.repeat(50);
    await page.fill('[data-testid="work-location-input"]', maxChars);
    await expect(page.locator('[data-testid="work-location-input"]')).toHaveValue(maxChars);
    await page.fill('[data-testid="work-location-input"]', maxChars + 'X');
    await expect(page.locator('[data-testid="work-location-input"]')).toHaveValue(maxChars);
    await page.click('[data-testid="register-btn"]');
    await expect(page).toHaveURL(/success/);
  });

  test('SCEN-077: 備考文字数上限入力', async ({ page }) => {
    // SCEN-077
    await page.click('[data-testid="work-item-select"] option:first-child');
    const maxChars = 'あ'.repeat(500);
    await page.fill('[data-testid="remarks-input"]', maxChars);
    await expect(page.locator('[data-testid="char-counter"]')).toContainText('500/500');
    await page.fill('[data-testid="remarks-input"]', maxChars + 'い');
    await expect(page.locator('[data-testid="remarks-input"]')).toHaveValue(maxChars);
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page).toHaveURL(/work-recording/);
  });

  test('SCEN-078: 作業場所空欄で記録開始', async ({ page }) => {
    // SCEN-078
    await page.fill('[data-testid="worker-name-input"]', 'テスト作業者');
    await page.click('[data-testid="work-content-select"] option:first-child');
    await expect(page.locator('[data-testid="start-time-input"]')).toHaveValue(/.+/);
    await page.click('[data-testid="start-recording-btn"]');
    const errorMsg = page.locator('[data-testid="error-message"]');
    if (await errorMsg.isVisible()) {
      await expect(errorMsg).toContainText('作業場所は必須項目です');
    } else {
      await expect(page).toHaveURL(/work-recording/);
    }
  });

  test('SCEN-079: 備考空欄で記録開始', async ({ page }) => {
    // SCEN-079
    await page.click('[data-testid="work-item-select"] option:first-child');
    await expect(page.locator('[data-testid="start-time-input"]')).toHaveValue(/.+/);
    await page.click('[data-testid="start-recording-btn"]');
    await expect(page).toHaveURL(/work-in-progress/);
  });

});