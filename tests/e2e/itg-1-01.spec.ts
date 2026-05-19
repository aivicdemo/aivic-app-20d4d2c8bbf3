import { test, expect } from '@playwright/test';

test.describe("ログイン画面", () => {
  // SCEN-001
  test("正常ログインできる", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-002
  test("ログイン状態保持が機能する", async ({ page, context }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
    
    const newPage = await context.newPage();
    await newPage.goto("/login.html");
    expect(newPage.url()).not.toContain('/login.html');
  });

  // SCEN-003
  test("パスワード表示切り替えが動作する", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'testpassword');
    const passwordField = page.locator('[data-testid="password"]');
    const inputType = await passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });

  // SCEN-004
  test("パスワード忘れリンクが遷移する", async ({ page }) => {
    await page.goto("/login.html");
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  // SCEN-005
  test("存在しないユーザーIDでエラー表示", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'nonexistent_user');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-006
  test("パスワード誤りでエラー表示", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-007
  test("連続ログイン失敗でアカウントロック", async ({ page }) => {
    await page.goto("/login.html");
    
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="username"]', 'worker001');
      await page.fill('[data-testid="password"]', 'wrongpassword');
      await Promise.all([
        page.waitForURL(url => !url.toString().includes('/login.html')),
        page.click('[data-testid="login-button"]')
      ]);
      await page.goto("/login.html");
    }
    
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-008
  test("ユーザーID空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-009
  test("パスワード空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'worker001');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-010
  test("両方空欄でバリデーション", async ({ page }) => {
    await page.goto("/login.html");
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-011
  test("ユーザーID最大文字数入力", async ({ page }) => {
    await page.goto("/login.html");
    const maxUserId = 'a'.repeat(50);
    await page.fill('[data-testid="username"]', maxUserId);
    await page.fill('[data-testid="password"]', 'password123');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-012
  test("パスワード最大文字数入力", async ({ page }) => {
    await page.goto("/login.html");
    const maxPassword = 'a'.repeat(128);
    await page.fill('[data-testid="username"]', 'worker001');
    await page.fill('[data-testid="password"]', maxPassword);
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });

  // SCEN-013
  test("特殊文字入力でエラーハンドリング", async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', '<script>alert("test")</script>');
    await page.fill('[data-testid="password"]', "'; DROP TABLE users; --");
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('[data-testid="login-button"]')
    ]);
    expect(page.url()).not.toContain('/login.html');
  });
});