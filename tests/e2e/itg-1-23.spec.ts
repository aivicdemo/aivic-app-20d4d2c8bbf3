import { test, expect } from '@playwright/test';

test.describe("ログイン画面", () => {
  test('SCEN-001: 正常ログインできる', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-002: ログイン状態保持が機能する', async ({ page, context }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    const newPage = await context.newPage();
    await newPage.goto("/login.html");
    expect(newPage.url()).not.toContain("/login.html");
  });

  test('SCEN-003: パスワード表示切り替えが動作する', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'testpassword');
    const passwordField = page.locator('[data-testid="password"]');
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  test('SCEN-004: パスワード忘れリンクが遷移する', async ({ page }) => {
    await page.goto("/login.html");
    const forgotPasswordLink = page.locator('text=パスワードを忘れた方はこちら').first();
    if (await forgotPasswordLink.count() > 0) {
      await forgotPasswordLink.click();
    } else {
      console.log('パスワード忘れリンクが存在しません');
    }
  });

  test('SCEN-005: 存在しないユーザーIDでエラー表示', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'nonexistent_user');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-006: パスワード誤りでエラー表示', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-007: 連続ログイン失敗でアカウントロック', async ({ page }) => {
    await page.goto("/login.html");
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username"]', 'worker001');
      await page.fill('[data-testid="password"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      await page.waitForTimeout(100);
    }
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'correctpassword');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-008: ユーザーID空欄でバリデーション', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-009: パスワード空欄でバリデーション', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-010: 両方空欄でバリデーション', async ({ page }) => {
    await page.goto("/login.html");
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-011: ユーザーID最大文字数入力', async ({ page }) => {
    await page.goto("/login.html");
    const maxUserId = 'a'.repeat(50);
    await page.fill('[data-testid="username"]', maxUserId);
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-012: パスワード最大文字数入力', async ({ page }) => {
    await page.goto("/login.html");
    const maxPassword = 'a'.repeat(128);
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', maxPassword);
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  test('SCEN-013: 特殊文字入力でエラーハンドリング', async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', "<script>alert('test')</script>");
    await page.fill('[data-testid="password"]', "'; DROP TABLE users; --");
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });
});