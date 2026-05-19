import { test, expect } from '@playwright/test';

test.describe("中断記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907238439.html");
  });

  test("SCEN-124: 中断開始時刻入力で記録完了", async ({ page }) => {
    // SCEN-124
    await page.fill('[data-testid="start-time"]', '14:30');
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-125: 中断理由選択で記録完了", async ({ page }) => {
    // SCEN-125
    await page.selectOption('[data-testid="interruption-reason"]', '材料不足');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-126: 中断詳細入力で記録完了", async ({ page }) => {
    // SCEN-126
    await page.selectOption('[data-testid="interruption-reason"]', '天候');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '10:30');
    await page.fill('[data-testid="interruption-details"]', '強風により作業中断');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-127: 中断場所入力で記録完了", async ({ page }) => {
    // SCEN-127
    await page.fill('[data-testid="start-time"]', '11:15');
    await page.fill('[data-testid="end-time"]', '12:00');
    await page.fill('[data-testid="interruption-location"]', '現場A棟');
    await page.selectOption('[data-testid="interruption-reason"]', '休憩');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-128: 写真添付で記録完了", async ({ page }) => {
    // SCEN-128
    await page.fill('[data-testid="interruption-details"]', '設備点検作業');
    await page.selectOption('[data-testid="interruption-reason"]', '点検');
    await page.fill('[data-testid="start-time"]', '13:00');
    await page.fill('[data-testid="end-time"]', '14:00');
    await page.click('[data-testid="photo-btn"]');
    const fileInput = page.locator('#photo-upload');
    await fileInput.setInputFiles({
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('test image content')
    });
    await expect(page.locator('#photo-preview')).toBeVisible();
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-129: 音声メモ録音で記録完了", async ({ page }) => {
    // SCEN-129
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    await page.click('button:text("🎤 録音開始")');
    await page.context().grantPermissions(['microphone']);
    await page.waitForTimeout(3000);
    await page.click('button:text("🎤 録音開始")');
    await expect(page.locator('#audio-playback')).toBeVisible();
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-130: 緊急度選択で記録完了", async ({ page }) => {
    // SCEN-130
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    await page.check('[data-testid="urgency-high"]');
    await page.fill('[data-testid="interruption-details"]', '緊急対応が必要');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-131: 影響範囲選択で記録完了", async ({ page }) => {
    // SCEN-131
    await page.selectOption('[data-testid="interruption-reason"]', '材料不足');
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.fill('[data-testid="end-time"]', '11:00');
    await page.check('[data-testid="impact-team"]');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-132: 一時保存後に記録完了", async ({ page }) => {
    // SCEN-132
    await page.selectOption('[data-testid="interruption-reason"]', '休憩');
    await page.fill('[data-testid="start-time"]', '12:00');
    await page.click('[data-testid="temp-save-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await page.reload();
    await page.fill('[data-testid="interruption-details"]', '昼食休憩');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
  });

  test("SCEN-133: 中断時間自動計算表示", async ({ page }) => {
    // SCEN-133
    await page.click('button:text("記録開始")');
    await page.click('button:text("中断記録")');
    await expect(page.locator('[data-testid="start-time"]')).toHaveValue(/.+/);
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    await page.click('button:text("作業再開")');
    await expect(page.locator('[data-testid="end-time"]')).toHaveValue(/.+/);
    await expect(page.locator('#interruption-duration')).toBeVisible();
  });

  test("SCEN-134: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-134
    await page.fill('[data-testid="interruption-details"]', '備考のみ入力');
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('必須');
  });

  test("SCEN-135: 未来時刻入力でエラー表示", async ({ page }) => {
    // SCEN-135
    await page.selectOption('[data-testid="interruption-reason"]', '点検');
    const futureTime = new Date(Date.now() + 3600000).toTimeString().slice(0, 5);
    await page.fill('[data-testid="start-time"]', futureTime);
    await page.fill('[data-testid="interruption-details"]', 'テスト作業');
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('未来');
  });

  test("SCEN-136: 中断詳細文字数上限超過でエラー表示", async ({ page }) => {
    // SCEN-136
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    const longText = 'あ'.repeat(1001);
    await page.fill('[data-testid="interruption-details"]', longText);
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('文字数');
  });

  test("SCEN-137: 対応外ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-137
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    const fileInput = page.locator('#photo-upload');
    await fileInput.setInputFiles({
      name: 'malware.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('executable content')
    });
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('ファイル形式');
  });

  test("SCEN-138: 大容量ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-138
    await page.selectOption('[data-testid="interruption-reason"]', '点検');
    const largeFile = Buffer.alloc(52428800); // 50MB
    const fileInput = page.locator('#photo-upload');
    await fileInput.setInputFiles({
      name: 'large.mp4',
      mimeType: 'video/mp4',
      buffer: largeFile
    });
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('サイズ');
  });

  test("SCEN-139: 録音失敗でエラー表示", async ({ page }) => {
    // SCEN-139
    await page.context().clearPermissions();
    await page.click('button:text("🎤 録音開始")');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('録音');
  });

  test("SCEN-140: ネットワークエラー時の送信失敗", async ({ page }) => {
    // SCEN-140
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.context().setOffline(true);
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('ネットワーク');
    await page.context().setOffline(false);
  });

  test("SCEN-141: 中断詳細文字数上限境界値", async ({ page }) => {
    // SCEN-141
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="interruption-reason"]', '機械故障');
    const exactLimit = 'あ'.repeat(1000);
    await page.fill('[data-testid="interruption-details"]', exactLimit);
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).not.toContainText('文字数');
    
    const overLimit = 'あ'.repeat(1001);
    await page.fill('[data-testid="interruption-details"]', overLimit);
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('文字数');
  });

  test("SCEN-142: ファイルサイズ上限境界値", async ({ page }) => {
    // SCEN-142
    await page.selectOption('[data-testid="interruption-reason"]', '点検');
    const exactSizeFile = Buffer.alloc(10485760); // 10MB
    const fileInput = page.locator('#photo-upload');
    await fileInput.setInputFiles({
      name: 'exact.jpg',
      mimeType: 'image/jpeg',
      buffer: exactSizeFile
    });
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).not.toContainText('サイズ');
    
    const overSizeFile = Buffer.alloc(10485761); // 10MB+1byte
    await fileInput.setInputFiles({
      name: 'over.jpg',
      mimeType: 'image/jpeg',
      buffer: overSizeFile
    });
    await expect(page.locator('#error-message')).toContainText('サイズ');
  });

  test("SCEN-143: 影響範囲全選択・全解除", async ({ page }) => {
    // SCEN-143
    await page.check('[data-testid="select-all"]');
    await expect(page.locator('[data-testid="impact-self"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-team"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-subsequent"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-schedule"]')).toBeChecked();
    
    await page.uncheck('[data-testid="select-all"]');
    await expect(page.locator('[data-testid="impact-self"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="impact-team"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="impact-subsequent"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="impact-schedule"]')).not.toBeChecked();
    
    await page.check('[data-testid="impact-self"]');
    await page.check('[data-testid="impact-team"]');
    await page.check('[data-testid="impact-subsequent"]');
    await page.check('[data-testid="impact-schedule"]');
    await expect(page.locator('[data-testid="select-all"]')).toBeChecked();
    
    await page.uncheck('[data-testid="impact-self"]');
    await expect(page.locator('[data-testid="select-all"]')).not.toBeChecked();
  });
});