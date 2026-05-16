import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("ログイン画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('SCEN-001: 正常ログインできる', async ({ page }) => {
    // SCEN-001
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/main/);
    await expect(page.locator('text=worker001')).toBeVisible();
  });

  test('SCEN-002: ログイン状態保持が機能する', async ({ page, context }) => {
    // SCEN-002
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'password123');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/main/);
    
    await context.close();
    const newContext = await page.context().browser()?.newContext();
    const newPage = await newContext!.newPage();
    await newPage.goto(BASE_URL);
    await expect(newPage).toHaveURL(/\/main/);
    await newContext!.close();
  });

  test('SCEN-003: パスワード表示切り替えが動作する', async ({ page }) => {
    // SCEN-003
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[aria-label="パスワードを表示"]');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await page.click('button[aria-label="パスワードを非表示"]');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('SCEN-004: パスワード忘れリンクが遷移する', async ({ page }) => {
    // SCEN-004
    await page.click('a:has-text("パスワードを忘れた方はこちら")');
    await expect(page).toHaveURL(/\/password-reset/);
    await expect(page.locator('form')).toBeVisible();
  });

  test('SCEN-005: 存在しないユーザーIDでエラー表示', async ({ page }) => {
    // SCEN-005
    await page.fill('input[type="text"]', 'nonexistent_user');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=ユーザーIDまたはパスワードが正しくありません')).toBeVisible();
  });

  test('SCEN-006: パスワード誤りでエラー表示', async ({ page }) => {
    // SCEN-006
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=ユーザーIDまたはパスワードが正しくありません')).toBeVisible();
  });

  test('SCEN-007: 連続ログイン失敗でアカウントロック', async ({ page }) => {
    // SCEN-007
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="text"]', 'worker001');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=ユーザーIDまたはパスワードが正しくありません')).toBeVisible();
    }
    
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=アカウントがロックされました')).toBeVisible();
  });

  test('SCEN-008: ユーザーID空欄でバリデーション', async ({ page }) => {
    // SCEN-008
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=ユーザーIDを入力してください')).toBeVisible();
  });

  test('SCEN-009: パスワード空欄でバリデーション', async ({ page }) => {
    // SCEN-009
    await page.fill('input[type="text"]', 'worker001');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=パスワードを入力してください')).toBeVisible();
  });

  test('SCEN-010: 両方空欄でバリデーション', async ({ page }) => {
    // SCEN-010
    await page.click('button[type="submit"]');
    await expect(page.locator('text=ユーザーIDを入力してください')).toBeVisible();
    await expect(page.locator('text=パスワードを入力してください')).toBeVisible();
  });

  test('SCEN-011: ユーザーID最大文字数入力', async ({ page }) => {
    // SCEN-011
    const maxUserId = 'a'.repeat(50);
    await page.fill('input[type="text"]', maxUserId);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/main/);
  });

  test('SCEN-012: パスワード最大文字数入力', async ({ page }) => {
    // SCEN-012
    const maxPassword = 'a'.repeat(128);
    await page.fill('input[type="text"]', 'worker001');
    await page.fill('input[type="password"]', maxPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/main/);
  });

  test('SCEN-013: 特殊文字入力でエラーハンドリング', async ({ page }) => {
    // SCEN-013
    await page.fill('input[type="text"]', "<script>alert('test')</script>");
    await page.fill('input[type="password"]', "'; DROP TABLE users; --");
    await page.click('button[type="submit"]');
    await expect(page.locator('text=不正な文字が含まれています')).toBeVisible();
    await expect(page.locator('script')).toHaveCount(0);
  });
});