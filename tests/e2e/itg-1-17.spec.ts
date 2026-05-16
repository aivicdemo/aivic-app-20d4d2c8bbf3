import { test, expect } from '@playwright/test';

test.describe("緊急報告画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907330826.html");
  });

  test("SCEN-267: 全項目正常入力で緊急報告が送信される", async ({ page }) => {
    // SCEN-267
    await page.fill('input[name="title"]', '設備故障');
    await page.selectOption('select[name="urgency"]', '高');
    await page.fill('input[name="location"]', 'A棟2階機械室');
    await page.fill('textarea[name="content"]', '冷却装置から異音が発生し、温度上昇を確認');
    await page.fill('input[name="reporter"]', '田中太郎');
    await page.fill('input[name="contact"]', '090-1234-5678');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-268: 緊急度高で事故報告が正常送信される", async ({ page }) => {
    // SCEN-268
    await page.selectOption('select[name="urgency"]', '高');
    await page.selectOption('select[name="type"]', '事故');
    await page.fill('input[name="datetime"]', '2024-01-15T10:30');
    await page.fill('input[name="location"]', 'B棟1階作業場');
    await page.fill('textarea[name="content"]', '機械操作中に部品が飛散し作業員が負傷');
    await page.selectOption('select[name="injury"]', 'あり');
    await page.fill('input[name="reporter"]', '佐藤花子');
    await page.fill('input[name="contact"]', '080-9876-5432');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-269: 写真添付ありで報告が送信される", async ({ page }) => {
    // SCEN-269
    await page.fill('textarea[name="content"]', '設備から煙が発生している緊急事態');
    await page.setInputFiles('input[type="file"]', 'test-image.jpg');
    await expect(page.locator('.file-preview')).toBeVisible();
    await page.fill('input[name="title"]', '設備異常');
    await page.selectOption('select[name="urgency"]', '高');
    await page.fill('input[name="location"]', 'C棟機械室');
    await page.fill('input[name="reporter"]', '山田太郎');
    await page.fill('input[name="contact"]', '070-1111-2222');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-270: 下書き保存が正常に実行される", async ({ page }) => {
    // SCEN-270
    await page.fill('textarea[name="content"]', '機械の異常音について調査中');
    await page.setInputFiles('input[type="file"]', 'test-document.pdf');
    await page.click('button[name="draft"]');
    await expect(page.locator('.save-message')).toBeVisible();
    await page.goto("/panels/scr-1778907330826.html");
    await expect(page.locator('textarea[name="content"]')).toHaveValue('機械の異常音について調査中');
    await expect(page.locator('.file-preview')).toBeVisible();
  });

  test("SCEN-271: 必須項目未入力で送信エラー", async ({ page }) => {
    // SCEN-271
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('必須項目');
  });

  test("SCEN-272: 緊急度未選択で送信エラー", async ({ page }) => {
    // SCEN-272
    await page.fill('input[name="title"]', '設備故障');
    await page.fill('textarea[name="content"]', '機械が動作しません');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('緊急度');
  });

  test("SCEN-273: 報告種別未選択で送信エラー", async ({ page }) => {
    // SCEN-273
    await page.fill('input[name="title"]', '設備故障');
    await page.fill('textarea[name="content"]', '機械が停止しました');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('報告種別');
  });

  test("SCEN-274: 発生日時未入力で送信エラー", async ({ page }) => {
    // SCEN-274
    await page.fill('textarea[name="content"]', '設備故障により作業停止');
    await page.fill('input[name="reporter"]', '田中太郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('発生日時');
  });

  test("SCEN-275: 発生場所未入力で送信エラー", async ({ page }) => {
    // SCEN-275
    await page.fill('textarea[name="content"]', '設備に異常が発生');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('発生場所');
  });

  test("SCEN-276: 緊急事態内容未入力で送信エラー", async ({ page }) => {
    // SCEN-276
    await page.fill('input[name="datetime"]', '2024-01-15T14:30');
    await page.fill('input[name="location"]', 'A棟作業場');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('緊急事態内容');
  });

  test("SCEN-277: 連絡先電話番号未入力で送信エラー", async ({ page }) => {
    // SCEN-277
    await page.fill('input[name="title"]', '設備異常');
    await page.selectOption('select[name="urgency"]', '中');
    await page.fill('input[name="datetime"]', '2024-01-15T15:00');
    await page.fill('textarea[name="content"]', '機械の温度が異常に上昇');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('連絡先');
  });

  test("SCEN-278: サポート外ファイル形式でアップロードエラー", async ({ page }) => {
    // SCEN-278
    await page.fill('input[name="title"]', '緊急報告');
    await page.fill('textarea[name="content"]', '詳細な報告内容');
    await page.setInputFiles('input[type="file"]', 'test-file.exe');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('サポートされていないファイル形式');
  });

  test("SCEN-279: ファイルサイズ上限超過でアップロードエラー", async ({ page }) => {
    // SCEN-279
    await page.fill('input[name="title"]', '緊急報告');
    await page.fill('textarea[name="content"]', '大容量ファイル付き報告');
    const buffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    await page.setInputFiles('input[type="file"]', {
      name: 'large-file.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer
    });
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('ファイルサイズ上限');
  });

  test("SCEN-280: 発生日時に未来日付入力でバリデーションエラー", async ({ page }) => {
    // SCEN-280
    await page.fill('input[name="title"]', '設備点検');
    await page.fill('textarea[name="content"]', '定期点検での異常発見');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[name="datetime"]', futureDate);
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('未来の日付は入力できません');
  });

  test("SCEN-281: 緊急事態内容に文字数上限値入力", async ({ page }) => {
    // SCEN-281
    const maxText = 'あ'.repeat(1000);
    await page.fill('textarea[name="content"]', maxText);
    await expect(page.locator('.char-counter')).toContainText('1000/1000');
    await page.fill('input[name="title"]', '詳細報告');
    await page.selectOption('select[name="urgency"]', '中');
    await page.fill('input[name="location"]', 'D棟');
    await page.fill('input[name="reporter"]', '鈴木一郎');
    await page.fill('input[name="contact"]', '090-3333-4444');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("SCEN-282: 緊急事態内容で文字数上限超過でバリデーションエラー", async ({ page }) => {
    // SCEN-282
    const overText = 'あ'.repeat(1001);
    await page.selectOption('select[name="type"]', '設備故障');
    await page.fill('textarea[name="content"]', overText);
    await page.fill('input[name="title"]', '長文報告');
    await page.fill('input[name="reporter"]', '田中次郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('文字数上限を超えています');
  });

  test("SCEN-283: 電話番号形式不正でバリデーションエラー", async ({ page }) => {
    // SCEN-283
    await page.selectOption('select[name="type"]', '事故');
    await page.fill('textarea[name="content"]', '緊急事態の詳細報告');
    await page.fill('input[name="contact"]', '123-abc-def');
    await page.fill('input[name="title"]', '緊急報告');
    await page.fill('input[name="location"]', 'E棟');
    await page.fill('input[name="reporter"]', '佐藤三郎');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('正しい電話番号の形式');
  });

  test("SCEN-284: 複数画像添付の上限値テスト", async ({ page }) => {
    // SCEN-284
    await page.fill('textarea[name="content"]', '複数画像付き報告');
    await page.fill('input[name="datetime"]', '2024-01-15T16:00');
    await page.setInputFiles('input[type="file"]', ['image1.jpg', 'image2.jpg', 'image3.jpg']);
    await page.setInputFiles('input[type="file"]', ['image4.jpg', 'image5.jpg', 'image6.jpg']);
    await expect(page.locator('.warning-message')).toBeVisible();
    await expect(page.locator('.warning-message')).toContainText('上限');
    await expect(page.locator('.file-preview')).toHaveCount(5);
    await page.fill('input[name="title"]', '画像報告');
    await page.selectOption('select[name="urgency"]', '低');
    await page.fill('input[name="location"]', 'F棟');
    await page.fill('input[name="reporter"]', '高橋四郎');
    await page.fill('input[name="contact"]', '080-5555-6666');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });
});