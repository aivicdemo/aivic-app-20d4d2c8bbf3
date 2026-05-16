import { test, expect } from '@playwright/test';

test.describe("緊急報告画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907330826.html");
  });

  test("全項目正常入力で緊急報告が送信される", async ({ page }) => {
    // SCEN-267
    await page.fill('input[name="title"]', '設備故障');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('input[name="location"]', 'A棟2階機械室');
    await page.fill('textarea[name="content"]', '冷却装置から異音が発生し、温度上昇を確認');
    await page.fill('input[name="reporter"]', '田中太郎');
    await page.fill('input[name="contact"]', '090-1234-5678');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("緊急度高で事故報告が正常送信される", async ({ page }) => {
    // SCEN-268
    await page.selectOption('select[name="priority"]', 'high');
    await page.selectOption('select[name="type"]', 'accident');
    await page.fill('input[name="datetime"]', '2024-01-15T10:30');
    await page.fill('input[name="location"]', '工場A棟');
    await page.fill('textarea[name="content"]', '機械操作中の事故');
    await page.selectOption('select[name="injury"]', 'yes');
    await page.fill('input[name="reporter"]', '山田花子');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("写真添付ありで報告が送信される", async ({ page }) => {
    // SCEN-269
    await page.fill('textarea[name="content"]', '緊急事態の詳細内容');
    await page.setInputFiles('input[type="file"]', 'test-image.jpg');
    await expect(page.locator('.file-preview')).toBeVisible();
    await page.fill('input[name="title"]', '写真付き報告');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.fill('input[name="location"]', 'B棟');
    await page.fill('input[name="reporter"]', '佐藤次郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("下書き保存が正常に実行される", async ({ page }) => {
    // SCEN-270
    await page.fill('textarea[name="content"]', '下書きテスト内容');
    await page.click('button[name="draft"]');
    await expect(page.locator('.draft-saved')).toBeVisible();
    await page.reload();
    await expect(page.locator('textarea[name="content"]')).toHaveValue('下書きテスト内容');
  });

  test("必須項目未入力で送信エラー", async ({ page }) => {
    // SCEN-271
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('必須項目');
  });

  test("緊急度未選択で送信エラー", async ({ page }) => {
    // SCEN-272
    await page.fill('input[name="title"]', '設備故障');
    await page.fill('textarea[name="content"]', '機械が動作しません');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('緊急度');
  });

  test("報告種別未選択で送信エラー", async ({ page }) => {
    // SCEN-273
    await page.fill('input[name="title"]', '設備故障');
    await page.fill('textarea[name="content"]', '機械が停止しました');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('報告種別');
  });

  test("発生日時未入力で送信エラー", async ({ page }) => {
    // SCEN-274
    await page.fill('textarea[name="content"]', '設備故障により作業停止');
    await page.fill('input[name="reporter"]', '田中太郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('発生日時');
  });

  test("発生場所未入力で送信エラー", async ({ page }) => {
    // SCEN-275
    await page.fill('textarea[name="content"]', '報告内容');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('発生場所');
  });

  test("緊急事態内容未入力で送信エラー", async ({ page }) => {
    // SCEN-276
    await page.fill('input[name="datetime"]', '2024-01-15T10:30');
    await page.fill('input[name="location"]', '工場A棟');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('内容');
  });

  test("連絡先電話番号未入力で送信エラー", async ({ page }) => {
    // SCEN-277
    await page.fill('input[name="title"]', 'テスト報告');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('input[name="datetime"]', '2024-01-15T10:30');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('連絡先');
  });

  test("サポート外ファイル形式でアップロードエラー", async ({ page }) => {
    // SCEN-278
    await page.fill('input[name="title"]', 'ファイル添付テスト');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.setInputFiles('input[type="file"]', 'test.exe');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('サポートされていない');
  });

  test("ファイルサイズ上限超過でアップロードエラー", async ({ page }) => {
    // SCEN-279
    await page.fill('input[name="title"]', '大容量ファイルテスト');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.setInputFiles('input[type="file"]', 'large-file.jpg');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('サイズ上限');
  });

  test("発生日時に未来日付入力でバリデーションエラー", async ({ page }) => {
    // SCEN-280
    await page.fill('input[name="title"]', 'テスト報告');
    await page.fill('input[name="datetime"]', '2025-12-31T23:59');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('未来の日付');
  });

  test("緊急事態内容に文字数上限値入力", async ({ page }) => {
    // SCEN-281
    const maxContent = 'a'.repeat(1000);
    await page.fill('textarea[name="content"]', maxContent);
    await expect(page.locator('.char-count')).toContainText('1000/1000');
    await page.fill('input[name="title"]', 'テスト');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.fill('input[name="location"]', 'テスト場所');
    await page.fill('input[name="reporter"]', 'テスト太郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("緊急事態内容で文字数上限超過でバリデーションエラー", async ({ page }) => {
    // SCEN-282
    const overContent = 'a'.repeat(1001);
    await page.fill('textarea[name="content"]', overContent);
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('文字数上限');
  });

  test("電話番号形式不正でバリデーションエラー", async ({ page }) => {
    // SCEN-283
    await page.fill('input[name="title"]', 'テスト報告');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.fill('input[name="contact"]', '123-abc-def');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('電話番号');
  });

  test("複数画像添付の上限値テスト", async ({ page }) => {
    // SCEN-284
    await page.fill('input[name="title"]', '複数画像テスト');
    await page.fill('textarea[name="content"]', '報告内容');
    await page.setInputFiles('input[type="file"]', ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg', 'img6.jpg']);
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('上限');
    await page.fill('input[name="location"]', 'テスト場所');
    await page.fill('input[name="reporter"]', 'テスト太郎');
    await page.selectOption('select[name="priority"]', 'medium');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });
});