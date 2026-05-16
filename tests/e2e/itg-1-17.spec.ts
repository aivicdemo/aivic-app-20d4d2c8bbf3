import { test, expect } from '@playwright/test';

test.describe("緊急報告画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test("SCEN-267: 全項目正常入力で緊急報告が送信される", async ({ page }) => {
    // SCEN-267
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "設備故障");
    await page.selectOption('[data-testid="urgency-level"]', "高");
    await page.fill('[data-testid="location"]', "A棟2階機械室");
    await page.fill('[data-testid="report-content"]', "冷却装置から異音が発生し、温度上昇を確認");
    await page.fill('[data-testid="reporter-name"]', "田中太郎");
    await page.fill('[data-testid="contact-phone"]', "090-1234-5678");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-268: 緊急度高で事故報告が正常送信される", async ({ page }) => {
    // SCEN-268
    await page.goto("/emergency-report");
    await page.selectOption('[data-testid="urgency-level"]', "高");
    await page.selectOption('[data-testid="report-type"]', "事故");
    await page.fill('[data-testid="incident-datetime"]', "2024-01-01T10:00");
    await page.fill('[data-testid="incident-location"]', "B棟1階");
    await page.fill('[data-testid="incident-details"]', "作業員が転倒");
    await page.selectOption('[data-testid="injured-status"]', "あり");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-269: 写真添付ありで報告が送信される", async ({ page }) => {
    // SCEN-269
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "緊急事態の詳細");
    await page.setInputFiles('[data-testid="photo-upload"]', 'test-image.jpg');
    await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();
    await page.fill('[data-testid="report-title"]', "写真付き報告");
    await page.selectOption('[data-testid="urgency-level"]', "中");
    await page.fill('[data-testid="location"]', "現場");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-270: 下書き保存が正常に実行される", async ({ page }) => {
    // SCEN-270
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "下書きテスト内容");
    await page.click('[data-testid="draft-save-button"]');
    await expect(page.locator('[data-testid="draft-saved-message"]')).toBeVisible();
    await page.goto("/");
    await page.goto("/emergency-report");
    await expect(page.locator('[data-testid="report-content"]')).toHaveValue("下書きテスト内容");
  });

  test("SCEN-271: 必須項目未入力で送信エラー", async ({ page }) => {
    // SCEN-271
    await page.goto("/emergency-report");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-272: 緊急度未選択で送信エラー", async ({ page }) => {
    // SCEN-272
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "設備故障");
    await page.fill('[data-testid="report-content"]', "機械が動作しません");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="urgency-error"]')).toBeVisible();
  });

  test("SCEN-273: 報告種別未選択で送信エラー", async ({ page }) => {
    // SCEN-273
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "設備故障");
    await page.fill('[data-testid="report-content"]', "機械が停止しました");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="report-type-error"]')).toBeVisible();
  });

  test("SCEN-274: 発生日時未入力で送信エラー", async ({ page }) => {
    // SCEN-274
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "設備故障により作業停止");
    await page.fill('[data-testid="reporter-name"]', "田中太郎");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="datetime-error"]')).toBeVisible();
  });

  test("SCEN-275: 発生場所未入力で送信エラー", async ({ page }) => {
    // SCEN-275
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "報告内容");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="location-error"]')).toBeVisible();
  });

  test("SCEN-276: 緊急事態内容未入力で送信エラー", async ({ page }) => {
    // SCEN-276
    await page.goto("/emergency-report");
    await page.fill('[data-testid="incident-datetime"]', "2024-01-01T10:00");
    await page.fill('[data-testid="location"]', "現場");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="content-error"]')).toBeVisible();
  });

  test("SCEN-277: 連絡先電話番号未入力で送信エラー", async ({ page }) => {
    // SCEN-277
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "報告");
    await page.selectOption('[data-testid="urgency-level"]', "中");
    await page.fill('[data-testid="incident-datetime"]', "2024-01-01T10:00");
    await page.fill('[data-testid="report-content"]', "内容");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
  });

  test("SCEN-278: サポート外ファイル形式でアップロードエラー", async ({ page }) => {
    // SCEN-278
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "ファイル添付テスト");
    await page.fill('[data-testid="report-content"]', "内容");
    await page.setInputFiles('[data-testid="file-upload"]', 'test-file.exe');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="file-format-error"]')).toBeVisible();
  });

  test("SCEN-279: ファイルサイズ上限超過でアップロードエラー", async ({ page }) => {
    // SCEN-279
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-title"]', "大容量ファイルテスト");
    await page.fill('[data-testid="report-content"]', "詳細");
    await page.setInputFiles('[data-testid="file-upload"]', 'large-file.jpg');
    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
  });

  test("SCEN-280: 発生日時に未来日付入力でバリデーションエラー", async ({ page }) => {
    // SCEN-280
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "内容");
    await page.fill('[data-testid="incident-datetime"]', "2025-12-31T10:00");
    await page.fill('[data-testid="report-content"]', "報告内容");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="future-date-error"]')).toBeVisible();
  });

  test("SCEN-281: 緊急事態内容に文字数上限値入力", async ({ page }) => {
    // SCEN-281
    await page.goto("/emergency-report");
    const maxText = "a".repeat(1000);
    await page.fill('[data-testid="emergency-content"]', maxText);
    await expect(page.locator('[data-testid="char-counter"]')).toHaveText("1000/1000");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-282: 緊急事態内容で文字数上限超過でバリデーションエラー", async ({ page }) => {
    // SCEN-282
    await page.goto("/emergency-report");
    await page.selectOption('[data-testid="emergency-type"]', "設備故障");
    const overLimitText = "a".repeat(1001);
    await page.fill('[data-testid="emergency-content"]', overLimitText);
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="char-limit-error"]')).toBeVisible();
  });

  test("SCEN-283: 電話番号形式不正でバリデーションエラー", async ({ page }) => {
    // SCEN-283
    await page.goto("/emergency-report");
    await page.selectOption('[data-testid="emergency-type"]', "事故");
    await page.fill('[data-testid="emergency-details"]', "詳細");
    await page.fill('[data-testid="contact-phone"]', "123-abc-def");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="phone-format-error"]')).toBeVisible();
  });

  test("SCEN-284: 複数画像添付の上限値テスト", async ({ page }) => {
    // SCEN-284
    await page.goto("/emergency-report");
    await page.fill('[data-testid="report-content"]', "内容");
    await page.fill('[data-testid="incident-time"]', "10:00");
    await page.setInputFiles('[data-testid="image-upload"]', ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg', 'image5.jpg']);
    await page.setInputFiles('[data-testid="image-upload"]', 'image6.jpg');
    await expect(page.locator('[data-testid="upload-limit-warning"]')).toBeVisible();
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});