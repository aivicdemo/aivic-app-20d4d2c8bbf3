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
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-125: 中断理由選択で記録完了", async ({ page }) => {
    // SCEN-125
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-126: 中断詳細入力で記録完了", async ({ page }) => {
    // SCEN-126
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '14:00');
    await page.fill('[data-testid="end-time"]', '15:00');
    await page.fill('[data-testid="interruption-details"]', '機械の調整作業のため中断');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-127: 中断場所入力で記録完了", async ({ page }) => {
    // SCEN-127
    await page.fill('[data-testid="start-time"]', '10:00');
    await page.fill('[data-testid="end-time"]', '11:00');
    await page.fill('[data-testid="interruption-location"]', 'A棟3階');
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-128: 写真添付で記録完了", async ({ page }) => {
    // SCEN-128
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '13:00');
    await page.fill('[data-testid="end-time"]', '14:00');
    
    await page.setInputFiles('[data-testid="photo-upload"]', {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image content')
    });
    
    await expect(page.locator('#photo-preview')).toBeVisible();
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-129: 音声メモ録音で記録完了", async ({ page }) => {
    // SCEN-129
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    
    await page.context().grantPermissions(['microphone']);
    await page.click('button:text("🎤 録音開始")');
    await expect(page.locator('#recording-status')).toBeVisible();
    
    await page.waitForTimeout(2000);
    await page.click('button:text("🎤 録音開始")');
    await expect(page.locator('#audio-playback')).toBeVisible();
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-130: 緊急度選択で記録完了", async ({ page }) => {
    // SCEN-130
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.click('[data-testid="urgency-high"]');
    await page.fill('[data-testid="interruption-details"]', '緊急対応が必要な案件');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-131: 影響範囲選択で記録完了", async ({ page }) => {
    // SCEN-131
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '10:00');
    await page.click('[data-testid="impact-team"]');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-132: 一時保存後に記録完了", async ({ page }) => {
    // SCEN-132
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '11:00');
    await page.click('[data-testid="temp-save-btn"]');
    await expect(page.locator('#error-message')).toContainText('一時保存');
    
    await page.reload();
    await expect(page.locator('[data-testid="start-time"]')).toHaveValue('11:00');
    await page.fill('[data-testid="interruption-details"]', '追加情報');
    await page.click('[data-testid="complete-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
  });

  test("SCEN-133: 中断時間自動計算表示", async ({ page }) => {
    // SCEN-133
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="end-time"]', '10:30');
    await expect(page.locator('#interruption-duration')).toContainText('90');
  });

  test("SCEN-134: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-134
    await page.fill('[data-testid="interruption-details"]', '備考のみ入力');
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('必須項目');
  });

  test("SCEN-135: 未来時刻入力でエラー表示", async ({ page }) => {
    // SCEN-135
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(11, 16);
    await page.fill('[data-testid="start-time"]', futureTime);
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('未来の時刻');
  });

  test("SCEN-136: 中断詳細文字数上限超過でエラー表示", async ({ page }) => {
    // SCEN-136
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="interruption-details"]', 'a'.repeat(1001));
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('文字数上限');
  });

  test("SCEN-137: 対応外ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-137
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    
    await page.setInputFiles('[data-testid="photo-upload"]', {
      name: 'virus.exe',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('fake exe content')
    });
    
    await expect(page.locator('#error-message')).toContainText('対応外のファイル');
  });

  test("SCEN-138: 大容量ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-138
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024);
    await page.setInputFiles('[data-testid="photo-upload"]', {
      name: 'large.mp4',
      mimeType: 'video/mp4',
      buffer: largeBuffer
    });
    
    await expect(page.locator('#error-message')).toContainText('ファイルサイズ上限');
  });

  test("SCEN-139: 録音失敗でエラー表示", async ({ page }) => {
    // SCEN-139
    await page.context().grantPermissions([]);
    await page.click('button:text("🎤 録音開始")');
    await expect(page.locator('#error-message')).toContainText('録音');
  });

  test("SCEN-140: ネットワークエラー時の送信失敗", async ({ page }) => {
    // SCEN-140
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    await page.fill('[data-testid="start-time"]', '10:00');
    
    await page.context().setOffline(true);
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('ネットワーク');
    
    await page.context().setOffline(false);
  });

  test("SCEN-141: 中断詳細文字数上限境界値", async ({ page }) => {
    // SCEN-141
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    
    await page.fill('[data-testid="interruption-details"]', 'a'.repeat(1000));
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
    
    await page.fill('[data-testid="interruption-details"]', 'a'.repeat(1001));
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('文字数上限');
  });

  test("SCEN-142: ファイルサイズ上限境界値", async ({ page }) => {
    // SCEN-142
    await page.selectOption('[data-testid="interruption-reason"]', { index: 1 });
    
    const limitBuffer = Buffer.alloc(10 * 1024 * 1024);
    await page.setInputFiles('[data-testid="photo-upload"]', {
      name: 'limit.jpg',
      mimeType: 'image/jpeg',
      buffer: limitBuffer
    });
    await page.click('[data-testid="record-btn"]');
    await expect(page.locator('#error-message')).toContainText('記録が完了しました');
    
    const overBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    await page.setInputFiles('[data-testid="photo-upload"]', {
      name: 'over.jpg',
      mimeType: 'image/jpeg',
      buffer: overBuffer
    });
    await expect(page.locator('#error-message')).toContainText('ファイルサイズ上限');
  });

  test("SCEN-143: 影響範囲全選択・全解除", async ({ page }) => {
    // SCEN-143
    await page.click('[data-testid="select-all"]');
    await expect(page.locator('[data-testid="impact-self"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-team"]')).toBeChecked();
    await expect(page.locator('[data-testid="impact-subsequent"]')).toBeChecked();
    
    await page.click('[data-testid="select-all"]');
    await expect(page.locator('[data-testid="impact-self"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="impact-team"]')).not.toBeChecked();
    
    await page.click('[data-testid="impact-self"]');
    await page.click('[data-testid="impact-team"]');
    await page.click('[data-testid="impact-subsequent"]');
    await page.click('[data-testid="impact-schedule"]');
    await expect(page.locator('[data-testid="select-all"]')).toBeChecked();
    
    await page.click('[data-testid="impact-self"]');
    await expect(page.locator('[data-testid="select-all"]')).not.toBeChecked();
  });
});