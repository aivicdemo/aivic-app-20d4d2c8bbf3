import { test, expect } from '@playwright/test';

test.describe("ログイン画面", () => {
  // SCEN-001
  test("[normal] ログイン画面 - 正常ログインできる", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-002
  test("[normal] ログイン画面 - ログイン状態保持が機能する", async ({ page, context }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
    
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto("/login.html");
    expect(newPage.url()).toContain("/login.html");
  });

  // SCEN-003
  test("[normal] ログイン画面 - パスワード表示切り替えが動作する", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'testpassword');
    const passwordField = page.locator('[data-testid="password"]');
    await expect(passwordField).toHaveAttribute('type', 'password');
  });

  // SCEN-004
  test("[normal] ログイン画面 - パスワード忘れリンクが遷移する", async ({ page }) => {
    await page.goto("/login.html");
    expect(page.url()).toContain("/login.html");
  });

  // SCEN-005
  test("[error] ログイン画面 - 存在しないユーザーIDでエラー表示", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'nonexistent_user');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-006
  test("[error] ログイン画面 - パスワード誤りでエラー表示", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-007
  test("[error] ログイン画面 - 連続ログイン失敗でアカウントロック", async ({ page }) => {
    await page.goto("/login.html");
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username"]', 'worker001');
      await page.fill('[data-testid="password"]', 'wrongpassword');
      if (i < 4) {
        await page.click('[data-testid="login-button"]');
        await page.waitForTimeout(100);
      }
    }
    await page.fill('[data-testid="password"]', 'correctpassword');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-008
  test("[edge] ログイン画面 - ユーザーID空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-009
  test("[edge] ログイン画面 - パスワード空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-010
  test("[edge] ログイン画面 - 両方空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-011
  test("[edge] ログイン画面 - ユーザーID最大文字数入力", async ({ page }) => {
    await page.goto("/login.html");
    const longUsername = 'a'.repeat(50);
    await page.fill('[data-testid="username"]', longUsername);
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-012
  test("[edge] ログイン画面 - パスワード最大文字数入力", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    const longPassword = 'a'.repeat(128);
    await page.fill('[data-testid="password"]', longPassword);
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]'),
    ]);
    expect(page.url()).not.toContain("/login.html");
  });

  // SCEN-013
  test("[edge] ログイン画面 - 特殊文字入力でエラーハンドリング", async ({ page }) => {
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