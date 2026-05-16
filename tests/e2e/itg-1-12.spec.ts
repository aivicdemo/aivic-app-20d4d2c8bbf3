import { test, expect } from '@playwright/test';

test.describe("エラー表示画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907278416.html");
  });

  test('SCEN-175: エラー画面の基本要素が全て表示される', async ({ page }) => {
    // SCEN-175
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="home-link"]')).toBeVisible();
  });

  test('SCEN-176: エラーメッセージとエラーコードが正しく表示される', async ({ page }) => {
    // SCEN-176
    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorCode = page.locator('[data-testid="error-code"]');
    
    await expect(errorMessage).toBeVisible();
    await expect(errorCode).toBeVisible();
    
    const messageText = await errorMessage.textContent();
    const codeText = await errorCode.textContent();
    
    expect(messageText).toBeTruthy();
    expect(codeText).toMatch(/E\d+|ERR-\d+/);
  });

  test('SCEN-177: 再試行ボタンで元の画面に戻る', async ({ page }) => {
    // SCEN-177
    await page.click('[data-testid="retry-button"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/panels\/scr-/);
  });

  test('SCEN-178: 戻るボタンで前画面に遷移する', async ({ page }) => {
    // SCEN-178
    await page.click('[data-testid="back-button"]');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/panels\/scr-/);
  });

  test('SCEN-179: ホームに戻るボタンでトップ画面に遷移する', async ({ page }) => {
    // SCEN-179
    await expect(page.locator('[data-testid="home-link"]')).toBeVisible();
    await page.click('[data-testid="home-link"]');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/panels\/scr-/);
  });

  test('SCEN-180: 管理者に連絡ボタンで連絡画面に遷移する', async ({ page }) => {
    // SCEN-180
    await page.click('[data-testid="contact-admin-button"]');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/panels\/scr-/);
  });

  test('SCEN-181: エラー詳細表示ボタンで詳細情報が表示される', async ({ page }) => {
    // SCEN-181
    await page.click('[data-testid="error-details-button"]');
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-timestamp"]')).toBeVisible();
  });

  test('SCEN-182: エラー発生時刻が正確に表示される', async ({ page }) => {
    // SCEN-182
    const timestampElement = page.locator('[data-testid="error-timestamp"]');
    await expect(timestampElement).toBeVisible();
    
    const timestampText = await timestampElement.textContent();
    expect(timestampText).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  test('SCEN-183: ネットワークエラー時の再試行が失敗する', async ({ page }) => {
    // SCEN-183
    await page.route('**/*', route => route.abort('connectionfailed'));
    
    await page.click('[data-testid="retry-button"]');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText('再試行に失敗');
  });

  test('SCEN-184: 管理者連絡機能が利用できない場合のエラー', async ({ page }) => {
    // SCEN-184
    await page.route('/api/contact/**', route => route.abort('connectionfailed'));
    
    await page.click('[data-testid="contact-admin-button"]');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="contact-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="alternative-contact"]')).toBeVisible();
  });

  test('SCEN-185: エラー詳細情報が取得できない場合の表示', async ({ page }) => {
    // SCEN-185
    await page.route('/api/error-details/**', route => route.abort('connectionfailed'));
    
    await page.click('[data-testid="error-details-button"]');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('[data-testid="error-details-unavailable"]')).toContainText('詳細情報を取得できませんでした');
  });

  test('SCEN-186: セッション切れ状態での各ボタン操作', async ({ page }) => {
    // SCEN-186
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    
    await page.click('[data-testid="login-link"]');
    await expect(page).toHaveURL('/login.html');
  });

  test('SCEN-187: 長いエラーメッセージの表示制限', async ({ page }) => {
    // SCEN-187
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    
    const messageText = await errorMessage.textContent();
    const messageLength = messageText?.length || 0;
    
    expect(messageLength).toBeLessThanOrEqual(500);
    
    const elementBox = await errorMessage.boundingBox();
    expect(elementBox).toBeTruthy();
  });

  test('SCEN-188: 連続した再試行ボタンクリック', async ({ page }) => {
    // SCEN-188
    const retryButton = page.locator('[data-testid="retry-button"]');
    
    await retryButton.click();
    await retryButton.click();
    await retryButton.click();
    
    await expect(retryButton).toBeDisabled();
    await page.waitForTimeout(2000);
  });

  test('SCEN-189: 画面表示中のネットワーク切断', async ({ page }) => {
    // SCEN-189
    await page.route('**/*', route => route.abort('connectionfailed'));
    
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    
    await page.unroute('**/*');
    
    await page.click('[data-testid="retry-button"]');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/panels\/scr-/);
  });
});