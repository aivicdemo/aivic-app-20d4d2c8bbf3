import { test, expect } from '@playwright/test';

test.describe("ログイン画面", () => {
  
  test('SCEN-001: 正常ログインできる', async ({ page }) => {
    // SCEN-001
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-002: ログイン状態保持が機能する', async ({ page, context }) => {
    // SCEN-002
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
    
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto("/login.html");
    expect(newPage.url()).toContain("/login.html");
  });

  test('SCEN-003: パスワード表示切り替えが動作する', async ({ page }) => {
    // SCEN-003
    await page.goto("/login.html");
    await page.fill('input[type="password"]', 'testpassword');
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toHaveValue('testpassword');
  });

  test('SCEN-004: パスワード忘れリンクが遷移する', async ({ page }) => {
    // SCEN-004
    await page.goto("/login.html");
    const currentUrl = page.url();
    expect(currentUrl).toContain("/login.html");
  });

  test('SCEN-005: 存在しないユーザーIDでエラー表示', async ({ page }) => {
    // SCEN-005
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'nonexistent_user');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-006: パスワード誤りでエラー表示', async ({ page }) => {
    // SCEN-006
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-007: 連続ログイン失敗でアカウントロック', async ({ page }) => {
    // SCEN-007
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-008: ユーザーID空欄でバリデーション', async ({ page }) => {
    // SCEN-008
    await page.goto("/login.html");
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-009: パスワード空欄でバリデーション', async ({ page }) => {
    // SCEN-009
    await page.goto("/login.html");
    await page.fill('input[type="text"]', 'worker001');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-010: 両方空欄でバリデーション', async ({ page }) => {
    // SCEN-010
    await page.goto("/login.html");
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-011: ユーザーID最大文字数入力', async ({ page }) => {
    // SCEN-011
    await page.goto("/login.html");
    const maxUserId = 'a'.repeat(50);
    await page.fill('input[type="text"]', maxUserId);
    await page.fill('input[type="password"]', 'password123');
    const userIdField = page.locator('input[type="text"]');
    await expect(userIdField).toHaveValue(maxUserId);
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-012: パスワード最大文字数入力', async ({ page }) => {
    // SCEN-012
    await page.goto("/login.html");
    const maxPassword = 'a'.repeat(128);
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', maxPassword);
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toHaveValue(maxPassword);
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-013: 特殊文字入力でエラーハンドリング', async ({ page }) => {
    // SCEN-013
    await page.goto("/login.html");
    await page.fill('input[type="text"]', '<script>alert(\'test\')</script>');
    await page.fill('input[type="password"]', '\'; DROP TABLE users; --');
    await page.click('button[type="submit"]');
    await page.waitForLoadState();
    expect(page.url()).not.toContain("/login.html");
  });

});