import { test, expect } from '@playwright/test';

test.describe("中断記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test("中断開始時刻入力で記録完了", async ({ page }) => {
    // SCEN-124
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="start-time"]', '14:30');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    await page.click('[data-testid="record-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("中断理由選択で記録完了", async ({ page }) => {
    // SCEN-125
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="reason-select"]', 'material-shortage');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("中断詳細入力で記録完了", async ({ page }) => {
    // SCEN-126
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.fill('[data-testid="end-time"]', '10:30');
    await page.fill('[data-testid="detail-textarea"]', '機械の故障により作業を中断しました');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("中断場所入力で記録完了", async ({ page }) => {
    // SCEN-127
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="work-item-select"]', 'construction');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '09:15');
    await page.fill('[data-testid="location-input"]', '3階東側エリア');
    await page.selectOption('[data-testid="reason-select"]', 'safety-check');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("写真添付で記録完了", async ({ page }) => {
    // SCEN-128
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="work-content"]', '配管工事');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    await page.fill('[data-testid="start-time"]', '11:00');
    await page.fill('[data-testid="end-time"]', '11:30');
    await page.setInputFiles('[data-testid="photo-upload"]', 'test-image.jpg');
    await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("音声メモ録音で記録完了", async ({ page }) => {
    // SCEN-129
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    await page.click('[data-testid="record-audio-button"]');
    await page.context().grantPermissions(['microphone']);
    await page.waitForTimeout(10000);
    await page.click('[data-testid="stop-record-button"]');
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("緊急度選択で記録完了", async ({ page }) => {
    // SCEN-130
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="reason-input"]', '設備トラブル');
    await page.selectOption('[data-testid="urgency-select"]', 'high');
    await page.fill('[data-testid="comment-textarea"]', '緊急対応が必要');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("影響範囲選択で記録完了", async ({ page }) => {
    // SCEN-131
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="reason-select"]', 'material-shortage');
    await page.fill('[data-testid="start-time"]', '13:00');
    await page.fill('[data-testid="end-time"]', '13:45');
    await page.selectOption('[data-testid="impact-scope-select"]', 'department');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("一時保存後に記録完了", async ({ page }) => {
    // SCEN-132
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="work-item-select"]', 'inspection');
    await page.fill('[data-testid="reason-input"]', 'システムメンテナンス');
    await page.fill('[data-testid="start-time"]', '15:00');
    await page.click('[data-testid="temp-save-button"]');
    await expect(page.locator('.temp-save-message')).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-testid="work-item-select"]')).toHaveValue('inspection');
    await page.fill('[data-testid="end-time"]', '15:30');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test("中断時間自動計算表示", async ({ page }) => {
    // SCEN-133
    await page.goto("/work-record");
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="interrupt-button"]');
    await expect(page.locator('[data-testid="auto-start-time"]')).not.toBeEmpty();
    await page.selectOption('[data-testid="reason-select"]', 'break');
    await page.click('[data-testid="end-interrupt-button"]');
    await expect(page.locator('[data-testid="auto-end-time"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="calculated-duration"]')).toBeVisible();
  });

  test("必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-134
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="comment-textarea"]', '任意のコメント');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('必須項目');
  });

  test("未来時刻入力でエラー表示", async ({ page }) => {
    // SCEN-135
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="work-item-select"]', 'construction');
    await page.fill('[data-testid="start-time"]', '23:59');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    await page.fill('[data-testid="comment-textarea"]', 'テストコメント');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('未来の時刻');
  });

  test("中断詳細文字数上限超過でエラー表示", async ({ page }) => {
    // SCEN-136
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    const longText = 'a'.repeat(1001);
    await page.fill('[data-testid="detail-textarea"]', longText);
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('文字数上限');
  });

  test("対応外ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-137
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="reason-input"]', 'システム障害');
    await page.setInputFiles('[data-testid="file-upload"]', { name: 'test.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('test') });
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('対応外ファイル');
  });

  test("大容量ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-138
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="reason-input"]', 'トラブル報告');
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024);
    await page.setInputFiles('[data-testid="file-upload"]', { name: 'large-file.mp4', mimeType: 'video/mp4', buffer: largeBuffer });
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('ファイルサイズ上限');
  });

  test("録音失敗でエラー表示", async ({ page }) => {
    // SCEN-139
    await page.goto("/interrupt-record");
    await page.context().grantPermissions([]);
    await page.click('[data-testid="record-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('録音失敗');
  });

  test("ネットワークエラー時の送信失敗", async ({ page }) => {
    // SCEN-140
    await page.goto("/interrupt-record");
    await page.fill('[data-testid="work-content"]', '配線作業');
    await page.fill('[data-testid="reason-input"]', 'ネットワーク障害');
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.context().setOffline(true);
    await page.click('[data-testid="send-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('ネットワーク');
    await page.context().setOffline(false);
  });

  test("中断詳細文字数上限境界値", async ({ page }) => {
    // SCEN-141
    await page.goto("/interrupt-record");
    const exactLimit = 'a'.repeat(1000);
    await page.fill('[data-testid="detail-textarea"]', exactLimit);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
    
    const overLimit = 'a'.repeat(1001);
    await page.fill('[data-testid="detail-textarea"]', overLimit);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test("ファイルサイズ上限境界値", async ({ page }) => {
    // SCEN-142
    await page.goto("/interrupt-record");
    await page.selectOption('[data-testid="work-item-select"]', 'maintenance');
    await page.selectOption('[data-testid="reason-select"]', 'equipment-failure');
    
    const exactSizeBuffer = Buffer.alloc(10 * 1024 * 1024);
    await page.setInputFiles('[data-testid="file-upload"]', { name: 'exact-size.jpg', mimeType: 'image/jpeg', buffer: exactSizeBuffer });
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
    
    const overSizeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    await page.setInputFiles('[data-testid="file-upload"]', { name: 'over-size.jpg', mimeType: 'image/jpeg', buffer: overSizeBuffer });
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test("影響範囲全選択・全解除", async ({ page }) => {
    // SCEN-143
    await page.goto("/interrupt-record");
    await page.click('[data-testid="select-all-checkbox"]');
    await expect(page.locator('[data-testid="impact-item-1"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-item-2"]')).toBeChecked();
    
    await page.click('[data-testid="select-all-checkbox"]');
    await expect(page.locator('[data-testid="impact-item-1"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="impact-item-2"]')).not.toBeChecked();
    
    await page.click('[data-testid="impact-item-1"]');
    await page.click('[data-testid="impact-item-2"]');
    await expect(page.locator('[data-testid="select-all-checkbox"]')).toBeChecked();
    
    await page.click('[data-testid="impact-item-1"]');
    await expect(page.locator('[data-testid="select-all-checkbox"]')).not.toBeChecked();
  });
});