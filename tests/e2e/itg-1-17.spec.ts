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

  test("SCEN-267: 全項目正常入力で緊急報告が送信される", async ({ page }) => {
    // SCEN-267
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'A棟2階機械室');
    await page.fill('#emergency-content', '冷却装置から異音が発生し、温度上昇を確認');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-268: 緊急度高で事故報告が正常送信される", async ({ page }) => {
    // SCEN-268
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '事故');
    await page.fill('#occurrence-datetime', '2024-01-01T10:00');
    await page.fill('#occurrence-location', 'B棟1階');
    await page.fill('#emergency-content', '機械操作中に負傷者が発生');
    await page.fill('#reporter-name', '山田花子');
    await page.fill('#contact-phone', '080-1111-2222');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-269: 写真添付ありで報告が送信される", async ({ page }) => {
    // SCEN-269
    await page.fill('#emergency-content', '設備から煙が発生している状況');
    const fileInput = page.locator('#photo-input');
    await fileInput.setInputFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image content')
    });
    await expect(page.locator('#photo-preview')).toBeVisible();
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'C棟機械室');
    await page.fill('#reporter-name', '佐藤次郎');
    await page.fill('#contact-phone', '070-3333-4444');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-270: 下書き保存が正常に実行される", async ({ page }) => {
    // SCEN-270
    await page.fill('#emergency-content', '機械の定期点検中に異常を発見');
    await page.fill('#occurrence-location', 'D棟3階');
    await page.click('[data-testid="draft-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
    await page.reload();
    await expect(page.locator('#emergency-content')).toHaveValue('機械の定期点検中に異常を発見');
    await expect(page.locator('#occurrence-location')).toHaveValue('D棟3階');
  });

  test("SCEN-271: 必須項目未入力で送信エラー", async ({ page }) => {
    // SCEN-271
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-272: 緊急度未選択で送信エラー", async ({ page }) => {
    // SCEN-272
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#emergency-content', '機械が動作しません');
    await page.fill('#occurrence-location', 'E棟1階');
    await page.fill('#reporter-name', '鈴木一郎');
    await page.fill('#contact-phone', '090-5555-6666');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-273: 報告種別未選択で送信エラー", async ({ page }) => {
    // SCEN-273
    await page.fill('#emergency-content', '機械が停止しました');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'F棟2階');
    await page.fill('#reporter-name', '田中三郎');
    await page.fill('#contact-phone', '080-7777-8888');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-274: 発生日時未入力で送信エラー", async ({ page }) => {
    // SCEN-274
    await page.fill('#emergency-content', '設備故障により作業停止');
    await page.fill('#reporter-name', '田中太郎');
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'G棟1階');
    await page.fill('#contact-phone', '090-9999-0000');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-275: 発生場所未入力で送信エラー", async ({ page }) => {
    // SCEN-275
    await page.fill('#emergency-content', '冷却システムの異常を確認');
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-datetime', '2024-01-01T14:30');
    await page.fill('#reporter-name', '山田五郎');
    await page.fill('#contact-phone', '070-1111-2222');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-276: 緊急事態内容未入力で送信エラー", async ({ page }) => {
    // SCEN-276
    await page.fill('#occurrence-datetime', '2024-01-01T16:00');
    await page.fill('#occurrence-location', 'H棟地下1階');
    await page.selectOption('#report-type', '事故');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#reporter-name', '佐藤六郎');
    await page.fill('#contact-phone', '080-3333-4444');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-277: 連絡先電話番号未入力で送信エラー", async ({ page }) => {
    // SCEN-277
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-datetime', '2024-01-01T18:00');
    await page.fill('#emergency-content', '電源システムの異常');
    await page.fill('#occurrence-location', 'I棟屋上');
    await page.fill('#reporter-name', '鈴木七郎');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-278: サポート外ファイル形式でアップロードエラー", async ({ page }) => {
    // SCEN-278
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#emergency-content', '機械の異常音を記録したい');
    await page.fill('#occurrence-location', 'J棟3階');
    await page.fill('#reporter-name', '田中八郎');
    await page.fill('#contact-phone', '090-5555-7777');
    const fileInput = page.locator('#photo-input');
    await fileInput.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('executable content')
    });
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-279: ファイルサイズ上限超過でアップロードエラー", async ({ page }) => {
    // SCEN-279
    await page.selectOption('#report-type', '事故');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#emergency-content', '大きな写真ファイルを添付したい');
    await page.fill('#occurrence-location', 'K棟2階');
    await page.fill('#reporter-name', '山田九郎');
    await page.fill('#contact-phone', '080-8888-9999');
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024, 'x');
    const fileInput = page.locator('#photo-input');
    await fileInput.setInputFiles({
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer
    });
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-280: 発生日時に未来日付入力でバリデーションエラー", async ({ page }) => {
    // SCEN-280
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#emergency-content', '機械の故障が発生');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('#occurrence-datetime', futureDateStr);
    await page.fill('#occurrence-location', 'L棟1階');
    await page.fill('#reporter-name', '佐藤十郎');
    await page.fill('#contact-phone', '070-0000-1111');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-281: 緊急事態内容に文字数上限値入力", async ({ page }) => {
    // SCEN-281
    const maxContent = 'a'.repeat(1000);
    await page.fill('#emergency-content', maxContent);
    await expect(page.locator('#content-counter')).toContainText('1000/1000');
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'M棟地下2階');
    await page.fill('#reporter-name', '鈴木十一郎');
    await page.fill('#contact-phone', '090-2222-3333');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test("SCEN-282: 緊急事態内容で文字数上限超過でバリデーションエラー", async ({ page }) => {
    // SCEN-282
    const overLimitContent = 'a'.repeat(1001);
    await page.fill('#emergency-content', overLimitContent);
    await page.selectOption('#report-type', '事故');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'N棟4階');
    await page.fill('#reporter-name', '田中十二郎');
    await page.fill('#contact-phone', '080-4444-5555');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-283: 電話番号形式不正でバリデーションエラー", async ({ page }) => {
    // SCEN-283
    await page.selectOption('#report-type', '設備故障');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#emergency-content', '電気系統の異常');
    await page.fill('#occurrence-location', 'O棟屋上');
    await page.fill('#reporter-name', '山田十三郎');
    await page.fill('#contact-phone', '123-abc-def');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  test("SCEN-284: 複数画像添付の上限値テスト", async ({ page }) => {
    // SCEN-284
    await page.fill('#emergency-content', '複数の角度からの写真が必要');
    await page.selectOption('#report-type', '事故');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-location', 'P棟全域');
    await page.fill('#reporter-name', '佐藤十四郎');
    await page.fill('#contact-phone', '070-6666-7777');
    
    const fileInput = page.locator('#photo-input');
    const files = [];
    for (let i = 0; i < 6; i++) {
      files.push({
        name: `image-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(`test image ${i}`)
      });
    }
    await fileInput.setInputFiles(files);
    await expect(page.locator('#error-messages')).toBeVisible();
    
    await fileInput.setInputFiles(files.slice(0, 5));
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });
});