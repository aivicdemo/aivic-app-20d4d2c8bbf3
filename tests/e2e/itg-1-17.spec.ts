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
  test('全項目正常入力で緊急報告が送信される', async ({ page }) => {
    await page.fill('#emergency-content', '冷却装置から異音が発生し、温度上昇を確認');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T10:30');
    await page.fill('#occurrence-location', 'A棟2階機械室');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-268
  test('緊急度高で事故報告が正常送信される', async ({ page }) => {
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '事故');
    await page.fill('#occurrence-datetime', '2024-01-15T09:15');
    await page.fill('#occurrence-location', 'B棟1階作業場');
    await page.fill('#emergency-content', '機械操作中に負傷事故が発生しました');
    await page.fill('#reporter-name', '山田花子');
    await page.fill('#contact-phone', '090-5678-1234');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-269
  test('写真添付ありで報告が送信される', async ({ page }) => {
    await page.fill('#emergency-content', '設備に異常を発見しました');
    await page.click('[data-testid="urgency-medium"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T11:00');
    await page.fill('#occurrence-location', 'C棟機械室');
    await page.fill('#reporter-name', '佐藤太郎');
    await page.fill('#contact-phone', '090-9876-5432');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="photo-input"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });
    
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-270
  test('下書き保存が正常に実行される', async ({ page }) => {
    await page.fill('#emergency-content', '下書きテスト内容');
    await page.click('[data-testid="urgency-low"]');
    await page.fill('#occurrence-location', 'テスト場所');
    await page.click('[data-testid="draft-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
    
    await page.reload();
    await expect(page.locator('#emergency-content')).toHaveValue('下書きテスト内容');
  });

  // SCEN-271
  test('必須項目未入力で送信エラー', async ({ page }) => {
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-272
  test('緊急度未選択で送信エラー', async ({ page }) => {
    await page.fill('#emergency-content', '機械が動作しません');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T12:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-273
  test('報告種別未選択で送信エラー', async ({ page }) => {
    await page.fill('#emergency-content', '機械が停止しました');
    await page.click('[data-testid="urgency-high"]');
    await page.fill('#occurrence-datetime', '2024-01-15T13:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-274
  test('発生日時未入力で送信エラー', async ({ page }) => {
    await page.fill('#emergency-content', '設備故障により作業停止');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-275
  test('発生場所未入力で送信エラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態が発生');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T14:00');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-276
  test('緊急事態内容未入力で送信エラー', async ({ page }) => {
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T15:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-277
  test('連絡先電話番号未入力で送信エラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態が発生');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T16:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-278
  test('サポート外ファイル形式でアップロードエラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態の報告');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T17:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="photo-input"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test-file.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('fake-exe-data')
    });
    
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-279
  test('ファイルサイズ上限超過でアップロードエラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態の報告');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T18:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="photo-input"]');
    const fileChooser = await fileChooserPromise;
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    await fileChooser.setFiles({
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuffer
    });
    
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-280
  test('発生日時に未来日付入力でバリデーションエラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態の報告');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('#occurrence-datetime', tomorrowStr);
    
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-281
  test('緊急事態内容に文字数上限値入力', async ({ page }) => {
    const maxContent = 'あ'.repeat(1000);
    await page.fill('#emergency-content', maxContent);
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T19:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    
    await expect(page.locator('#content-counter')).toContainText('1000/1000');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });

  // SCEN-282
  test('緊急事態内容で文字数上限超過でバリデーションエラー', async ({ page }) => {
    const overContent = 'あ'.repeat(1001);
    await page.fill('#emergency-content', overContent);
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T20:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-283
  test('電話番号形式不正でバリデーションエラー', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態の報告');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T21:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '123-abc-def');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#error-messages')).toBeVisible();
  });

  // SCEN-284
  test('複数画像添付の上限値テスト', async ({ page }) => {
    await page.fill('#emergency-content', '緊急事態の報告');
    await page.click('[data-testid="urgency-high"]');
    await page.selectOption('#report-type', '設備故障');
    await page.fill('#occurrence-datetime', '2024-01-15T22:00');
    await page.fill('#occurrence-location', '作業場');
    await page.fill('#reporter-name', '田中太郎');
    await page.fill('#contact-phone', '090-1234-5678');
    
    for (let i = 0; i < 6; i++) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-testid="photo-input"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: `test-image-${i}.jpg`,
        mimeType: 'image/jpeg',
        buffer: Buffer.from(`fake-image-data-${i}`)
      });
      
      if (i >= 4) {
        await expect(page.locator('#error-messages')).toBeVisible();
        break;
      }
    }
    
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });
});