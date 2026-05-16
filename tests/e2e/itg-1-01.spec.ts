import { test, expect } from '@playwright/test';

test.describe("ログイン画面", () => {
  
  test("SCEN-001: 正常ログインできる", async ({ page }) => {
    // SCEN-001
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL("/panels/work-record.html");
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });

  test("SCEN-002: ログイン状態保持が機能する", async ({ page, context }) => {
    // SCEN-002
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', 'password123');
    await page.check('input[name="rememberMe"]');
    await page.click('button[type="submit"]');
    await page.waitForURL("/panels/work-record.html");
    
    await context.close();
    const newContext = await page.context().browser()?.newContext();
    const newPage = await newContext?.newPage();
    await newPage?.goto("/login.html");
    await expect(newPage?.url()).toContain("/panels/work-record.html");
    await newContext?.close();
  });

  test("SCEN-003: パスワード表示切り替えが動作する", async ({ page }) => {
    // SCEN-003
    await page.goto("/login.html");
    await page.fill('input[name="password"]', 'testpassword');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    await page.click('[data-testid="toggle-password"]');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');
    await page.click('[data-testid="toggle-password"]');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  });

  test("SCEN-004: パスワード忘れリンクが遷移する", async ({ page }) => {
    // SCEN-004
    await page.goto("/login.html");
    await page.click('a[href="/panels/password-reset.html"]');
    await page.waitForURL("/panels/password-reset.html");
    await expect(page.locator('form')).toBeVisible();
  });

  test("SCEN-005: 存在しないユーザーIDでエラー表示", async ({ page }) => {
    // SCEN-005
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', 'nonexistent_user');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('ユーザーIDまたはパスワードが正しくありません');
  });

  test("SCEN-006: パスワード誤りでエラー表示", async ({ page }) => {
    // SCEN-006
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('ユーザーIDまたはパスワードが正しくありません');
    await expect(page.url()).toContain('/login.html');
  });

  test("SCEN-007: 連続ログイン失敗でアカウントロック", async ({ page }) => {
    // SCEN-007
    await page.goto("/login.html");
    
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="userId"]', 'worker001');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    }
    
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('アカウントがロックされました');
  });

  test("SCEN-008: ユーザーID空欄でバリデーション", async ({ page }) => {
    // SCEN-008
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', '');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('ユーザーIDを入力してください');
  });

  test("SCEN-009: パスワード空欄でバリデーション", async ({ page }) => {
    // SCEN-009
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('パスワードを入力してください');
  });

  test("SCEN-010: 両方空欄でバリデーション", async ({ page }) => {
    // SCEN-010
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', '');
    await page.fill('input[name="password"]', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test("SCEN-011: ユーザーID最大文字数入力", async ({ page }) => {
    // SCEN-011
    await page.goto("/login.html");
    const maxUserId = 'a'.repeat(50);
    await page.fill('input[name="userId"]', maxUserId);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL("/panels/work-record.html");
  });

  test("SCEN-012: パスワード最大文字数入力", async ({ page }) => {
    // SCEN-012
    await page.goto("/login.html");
    const maxPassword = 'a'.repeat(128);
    await page.fill('input[name="userId"]', 'worker001');
    await page.fill('input[name="password"]', maxPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL("/panels/work-record.html");
  });

  test("SCEN-013: 特殊文字入力でエラーハンドリング", async ({ page }) => {
    // SCEN-013
    await page.goto("/login.html");
    await page.fill('input[name="userId"]', '<script>alert(\'test\')</script>');
    await page.fill('input[name="password"]', '\'; DROP TABLE users; --');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('不正な文字が含まれています');
    await expect(page.url()).toContain('/login.html');
  });

});