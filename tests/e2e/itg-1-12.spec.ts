import { test, expect } from '@playwright/test';

test.describe("エラー表示画面", () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907278416.html");
  });

  test("SCEN-175: エラー画面の基本要素が全て表示される", async ({ page }) => {
    // SCEN-175
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-code"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="home-button"]')).toBeVisible();
  });

  test("SCEN-176: エラーメッセージとエラーコードが正しく表示される", async ({ page }) => {
    // SCEN-176
    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorCode = page.locator('[data-testid="error-code"]');
    
    await expect(errorMessage).toBeVisible();
    await expect(errorCode).toBeVisible();
    
    const messageText = await errorMessage.textContent();
    const codeText = await errorCode.textContent();
    
    expect(messageText).toBeTruthy();
    expect(codeText).toMatch(/^(E\d{3}|ERR-\d{3})/);
  });

  test("SCEN-177: 再試行ボタンで元の画面に戻る", async ({ page }) => {
    // SCEN-177
    await page.click('[data-testid="retry-button"]');
    await expect(page).toHaveURL(/\/panels\//);
  });

  test("SCEN-178: 戻るボタンで前画面に遷移する", async ({ page }) => {
    // SCEN-178
    await page.click('[data-testid="back-button"]');
    await expect(page).toHaveURL(/\/panels\//);
  });

  test("SCEN-179: ホームに戻るボタンでトップ画面に遷移する", async ({ page }) => {
    // SCEN-179
    await page.click('[data-testid="home-button"]');
    await expect(page).toHaveURL(/\/panels\//);
  });

  test("SCEN-180: 管理者に連絡ボタンで連絡画面に遷移する", async ({ page }) => {
    // SCEN-180
    await page.click('[data-testid="contact-admin-button"]');
    await expect(page).toHaveURL(/\/panels\//);
  });

  test("SCEN-181: エラー詳細表示ボタンで詳細情報が表示される", async ({ page }) => {
    // SCEN-181
    await page.click('[data-testid="show-details-button"]');
    await expect(page.locator('#error-details')).toBeVisible();
    await expect(page.locator('#error-details-content')).toBeVisible();
  });

  test("SCEN-182: エラー発生時刻が正確に表示される", async ({ page }) => {
    // SCEN-182
    const timestamp = page.locator('[data-testid="error-timestamp"]');
    await expect(timestamp).toBeVisible();
    
    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
  });

  test("SCEN-183: ネットワークエラー時の再試行が失敗する", async ({ page }) => {
    // SCEN-183
    await page.route('**/*', route => route.abort());
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('再試行に失敗');
  });

  test("SCEN-184: 管理者連絡機能が利用できない場合のエラー", async ({ page }) => {
    // SCEN-184
    await page.route('**/api/contact/**', route => route.abort());
    await page.click('[data-testid="contact-admin-button"]');
    await expect(page.locator('#contact-fallback')).toBeVisible();
  });

  test("SCEN-185: エラー詳細情報が取得できない場合の表示", async ({ page }) => {
    // SCEN-185
    await page.route('**/api/error-details/**', route => route.abort());
    await page.click('[data-testid="show-details-button"]');
    await expect(page.locator('#error-details')).toContainText('エラーの詳細情報を取得できませんでした');
  });

  test("SCEN-186: セッション切れ状態での各ボタン操作", async ({ page }) => {
    // SCEN-186
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('認証');
    
    await page.click('[data-testid="back-button"]');
    await expect(page).toHaveURL(/\/login\.html/);
  });

  test("SCEN-187: 長いエラーメッセージの表示制限", async ({ page }) => {
    // SCEN-187
    const errorMessage = page.locator('[data-testid="error-message"]');
    const messageText = await errorMessage.textContent();
    
    if (messageText && messageText.length > 500) {
      expect(messageText).toMatch(/\.{3}$/);
    }
    
    const boundingBox = await errorMessage.boundingBox();
    expect(boundingBox?.width).toBeLessThan(800);
  });

  test("SCEN-188: 連続した再試行ボタンクリック", async ({ page }) => {
    // SCEN-188
    const retryButton = page.locator('[data-testid="retry-button"]');
    
    await retryButton.click();
    await retryButton.click();
    await retryButton.click();
    
    await expect(retryButton).toBeDisabled();
  });

  test("SCEN-189: 画面表示中のネットワーク切断", async ({ page }) => {
    // SCEN-189
    await page.route('**/*', route => route.abort());
    await page.click('[data-testid="retry-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('ネットワーク');
    
    await page.unroute('**/*');
    await page.click('[data-testid="retry-button"]');
    await expect(page).toHaveURL(/\/panels\//);
  });

});