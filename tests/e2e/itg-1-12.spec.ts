import { test, expect } from '@playwright/test';

test.describe("エラー表示画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
    // ログイン処理（認証が必要な場合）
  });

  test("エラー画面の基本要素が全て表示される", async ({ page }) => {
    // SCEN-175
    await page.goto("/");
    // 意図的にエラーを発生させる操作
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    // エラー画面の基本要素確認
    await expect(page.locator('text=エラーが発生しました')).toBeVisible();
    await expect(page.locator('text=エラーコード')).toBeVisible();
    await expect(page.locator('button:has-text("戻る")')).toBeVisible();
    await expect(page.locator('a:has-text("ホーム")')).toBeVisible();
  });

  test("エラーメッセージとエラーコードが正しく表示される", async ({ page }) => {
    // SCEN-176
    await page.goto("/");
    // エラー発生操作
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=エラーが発生しました')).toBeVisible();
    await expect(page.locator('text=E001')).toBeVisible();
  });

  test("再試行ボタンで元の画面に戻る", async ({ page }) => {
    // SCEN-177
    await page.goto("/");
    // ネットワークエラー発生
    await page.route('**/*', route => route.abort());
    await page.click('button[type="submit"]');
    
    // 再試行ボタンクリック
    await page.unroute('**/*');
    await page.click('button:has-text("再試行")');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test("戻るボタンで前画面に遷移する", async ({ page }) => {
    // SCEN-178
    await page.goto("/");
    // エラー発生
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("戻る")');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test("ホームに戻るボタンでトップ画面に遷移する", async ({ page }) => {
    // SCEN-179
    await page.goto("/");
    // エラー発生
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    await page.click('a:has-text("ホーム")');
    await page.waitForURL('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test("管理者に連絡ボタンで連絡画面に遷移する", async ({ page }) => {
    // SCEN-180
    await page.goto("/");
    // エラー発生
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("管理者に連絡")');
    await expect(page.locator('text=連絡フォーム')).toBeVisible();
  });

  test("エラー詳細表示ボタンで詳細情報が表示される", async ({ page }) => {
    // SCEN-181
    await page.goto("/");
    // 無効な認証情報でログイン試行
    await page.fill('input[type="text"]', 'invalid_user');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("エラー詳細表示")');
    await expect(page.locator('text=発生時刻')).toBeVisible();
    await expect(page.locator('text=原因')).toBeVisible();
  });

  test("エラー発生時刻が正確に表示される", async ({ page }) => {
    // SCEN-182
    const startTime = new Date();
    await page.goto("/");
    // エラー発生
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    const errorTime = await page.locator('text=発生時刻').textContent();
    expect(errorTime).toContain(startTime.getFullYear().toString());
  });

  test("ネットワークエラー時の再試行が失敗する", async ({ page }) => {
    // SCEN-183
    await page.goto("/");
    await page.route('**/*', route => route.abort());
    
    await page.fill('input[type="text"]', 'test_data');
    await page.click('button:has-text("保存")');
    
    await page.click('button:has-text("再試行")');
    await expect(page.locator('text=再試行に失敗しました')).toBeVisible();
  });

  test("管理者連絡機能が利用できない場合のエラー", async ({ page }) => {
    // SCEN-184
    await page.goto("/");
    // エラー発生
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    // 管理者連絡機能のエラーシミュレート
    await page.route('**/contact', route => route.abort());
    await page.click('button:has-text("管理者に連絡")');
    
    await expect(page.locator('text=連絡機能が利用できません')).toBeVisible();
    await expect(page.locator('text=電話番号')).toBeVisible();
  });

  test("エラー詳細情報が取得できない場合の表示", async ({ page }) => {
    // SCEN-185
    await page.goto("/");
    await page.route('**/error-details', route => route.abort());
    
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=エラーの詳細情報を取得できませんでした')).toBeVisible();
  });

  test("セッション切れ状態での各ボタン操作", async ({ page }) => {
    // SCEN-186
    await page.goto("/");
    // セッション削除
    await page.evaluate(() => sessionStorage.clear());
    
    await page.click('button:has-text("保存")');
    
    await page.click('button:has-text("再試行")');
    await expect(page.locator('text=認証エラー')).toBeVisible();
    
    await page.click('button:has-text("ログイン画面へ")');
    await page.waitForURL('/login');
  });

  test("長いエラーメッセージの表示制限", async ({ page }) => {
    // SCEN-187
    await page.goto("/");
    const longText = 'a'.repeat(1000);
    await page.fill('textarea', longText);
    await page.click('button[type="submit"]');
    
    const errorMessage = await page.locator('.error-message').textContent();
    expect(errorMessage?.length).toBeLessThanOrEqual(500);
    await expect(page.locator('text=...')).toBeVisible();
  });

  test("連続した再試行ボタンクリック", async ({ page }) => {
    // SCEN-188
    await page.goto("/");
    await page.route('**/*', route => route.abort());
    await page.click('button[type="submit"]');
    
    // 連続クリック
    await page.click('button:has-text("再試行")');
    await page.click('button:has-text("再試行")');
    await page.click('button:has-text("再試行")');
    
    await expect(page.locator('button:has-text("再試行"):disabled')).toBeVisible();
    await expect(page.locator('text=処理中')).toBeVisible();
  });

  test("画面表示中のネットワーク切断", async ({ page }) => {
    // SCEN-189
    await page.goto("/");
    // エラー画面表示
    await page.fill('input[type="text"]', 'invalid_data');
    await page.click('button[type="submit"]');
    
    // ネットワーク切断
    await page.route('**/*', route => route.abort());
    await page.click('button:has-text("再試行")');
    await expect(page.locator('text=ネットワークエラー')).toBeVisible();
    
    // ネットワーク復旧
    await page.unroute('**/*');
    await page.click('button:has-text("再試行")');
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});