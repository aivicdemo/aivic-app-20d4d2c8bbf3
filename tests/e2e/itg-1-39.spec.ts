import { test, expect } from '@playwright/test';

test.describe("緊急報告画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907330826.html");
  });

  // SCEN-267
  test("全項目正常入力で緊急報告が送信される", async ({ page }) => {
    await page.fill('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'A棟2階機械室');
    await page.fill('#emergency-content', '冷却装置から異音が発生し、温度上昇を確認');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-268
  test("緊急度高で事故報告が正常送信される", async ({ page }) => {
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#report-type', '事故');
    await page.fill('#occurrence-datetime', '2024-01-15T14:30');
    await page.fill('#occurrence-location', 'B棟1階作業場');
    await page.fill('#emergency-content', '作業員が機械に挟まれる事故が発生');
    await page.fill('#reporter-name', '佐藤花子');
    await page.fill('#contact-phone', '080-9876-5432');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-269
  test("写真添付ありで報告が送信される", async ({ page }) => {
    await page.fill('#emergency-content', '配管から水漏れが発生している状況');
    await page.setInputFiles('#photo-input', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image content')
    });
    await expect(page.locator('#photo-preview')).toBeVisible();
    await page.fill('#reporter-name', '山田太郎');
    await page.fill('#contact-phone', '070-1111-2222');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-270
  test("下書き保存が正常に実行される", async ({ page }) => {
    await page.fill('#emergency-content', '下書きテスト内容です');
    await page.fill('#reporter-name', '鈴木一郎');
    await page.click('[data-testid="draft-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
    await page.goto("/panels/scr-1778907330826.html");
    await expect(page.locator('#emergency-content')).toHaveValue('下書きテスト内容です');
    await expect(page.locator('#reporter-name')).toHaveValue('鈴木一郎');
  });

  // SCEN-271
  test("必須項目未入力で送信エラー", async ({ page }) => {
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-272
  test("緊急度未選択で送信エラー", async ({ page }) => {
    await page.fill('#report-type', '設備故障');
    await page.fill('#emergency-content', '機械が動作しません');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-273
  test("報告種別未選択で送信エラー", async ({ page }) => {
    await page.fill('#emergency-content', '機械が停止しました');
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-274
  test("発生日時未入力で送信エラー", async ({ page }) => {
    await page.fill('#emergency-content', '設備故障により作業停止');
    await page.fill('#reporter-name', '田中太郎');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-275
  test("発生場所未入力で送信エラー", async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態が発生しました');
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-276
  test("緊急事態内容未入力で送信エラー", async ({ page }) => {
    await page.fill('#occurrence-datetime', '2024-01-15T10:00');
    await page.fill('#occurrence-location', 'A棟');
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-277
  test("連絡先電話番号未入力で送信エラー", async ({ page }) => {
    await page.fill('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-datetime', '2024-01-15T10:00');
    await page.fill('#emergency-content', '機械故障が発生');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-278
  test("サポート外ファイル形式でアップロードエラー", async ({ page }) => {
    await page.fill('#emergency-content', 'ファイル添付テスト');
    await page.setInputFiles('#photo-input', {
      name: 'test.exe',
      mimeType: 'application/x-executable',
      buffer: Buffer.from('fake executable')
    });
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-279
  test("ファイルサイズ上限超過でアップロードエラー", async ({ page }) => {
    await page.fill('#emergency-content', '大容量ファイルテスト');
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    await page.setInputFiles('#photo-input', {
      name: 'large.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer
    });
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-280
  test("発生日時に未来日付入力でバリデーションエラー", async ({ page }) => {
    await page.fill('#emergency-content', '発生日時テスト');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('#occurrence-datetime', tomorrowStr);
    await page.fill('#occurrence-location', 'テスト場所');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-281
  test("緊急事態内容に文字数上限値入力", async ({ page }) => {
    const maxContent = 'あ'.repeat(1000);
    await page.fill('#emergency-content', maxContent);
    await expect(page.locator('#content-counter')).toContainText('1000/1000');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-282
  test("緊急事態内容で文字数上限超過でバリデーションエラー", async ({ page }) => {
    const overContent = 'あ'.repeat(1001);
    await page.fill('#emergency-content', overContent);
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-283
  test("電話番号形式不正でバリデーションエラー", async ({ page }) => {
    await page.fill('#emergency-content', '電話番号テスト');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '123-abc-def');
    await page.click('[data-testid="urgency-high"]');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-284
  test("複数画像添付の上限値テスト", async ({ page }) => {
    await page.fill('#emergency-content', '複数画像テスト');
    
    // 上限値まで画像を添付
    const files = [];
    for (let i = 0; i < 5; i++) {
      files.push({
        name: `test${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(`fake image ${i}`)
      });
    }
    await page.setInputFiles('#photo-input', files);
    
    // 上限超過の画像を追加しようとする
    await page.setInputFiles('#photo-input', {
      name: 'extra.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('extra image')
    });
    
    await expect(page.locator('#error-messages')).toBeVisible();
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });
});