import { test, expect } from '@playwright/test';

test.describe("中断記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/panels\//);
    
    // 中断記録入力画面に遷移
    await page.goto("/panels/scr-1778907238439.html");
  });

  test("SCEN-124: 中断開始時刻入力で記録完了", async ({ page }) => {
    // SCEN-124
    await page.fill('[data-testid="interrupt-start-time"]', '14:30');
    await page.selectOption('[data-testid="interrupt-reason"]', 'meeting');
    await page.click('[data-testid="record-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-125: 中断理由選択で記録完了", async ({ page }) => {
    // SCEN-125
    await page.selectOption('[data-testid="interrupt-reason"]', 'break');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-126: 中断詳細入力で記録完了", async ({ page }) => {
    // SCEN-126
    await page.selectOption('[data-testid="interrupt-reason"]', 'other');
    await page.fill('[data-testid="interrupt-start-time"]', '09:00');
    await page.fill('[data-testid="interrupt-end-time"]', '09:30');
    await page.fill('[data-testid="interrupt-details"]', '機器の点検作業のため一時中断');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-127: 中断場所入力で記録完了", async ({ page }) => {
    // SCEN-127
    await page.selectOption('[data-testid="work-item"]', 'item1');
    await page.fill('[data-testid="interrupt-start-time"]', '10:00');
    await page.fill('[data-testid="interrupt-end-time"]', '10:15');
    await page.fill('[data-testid="interrupt-location"]', '2階会議室');
    await page.selectOption('[data-testid="interrupt-reason"]', 'meeting');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-128: 写真添付で記録完了", async ({ page }) => {
    // SCEN-128
    await page.fill('[data-testid="work-content"]', '機器点検');
    await page.selectOption('[data-testid="interrupt-reason"]', 'inspection');
    await page.fill('[data-testid="interrupt-start-time"]', '11:00');
    await page.fill('[data-testid="interrupt-end-time"]', '11:20');
    await page.setInputFiles('[data-testid="photo-upload"]', 'test-image.jpg');
    await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-129: 音声メモ録音で記録完了", async ({ page }) => {
    // SCEN-129
    await page.selectOption('[data-testid="work-item"]', 'item2');
    await page.selectOption('[data-testid="interrupt-reason"]', 'emergency');
    await page.click('[data-testid="record-audio-button"]');
    await page.waitForTimeout(3000);
    await page.click('[data-testid="stop-audio-button"]');
    await expect(page.locator('[data-testid="audio-player"]')).toBeVisible();
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-130: 緊急度選択で記録完了", async ({ page }) => {
    // SCEN-130
    await page.fill('[data-testid="interrupt-reason"]', '緊急対応');
    await page.selectOption('[data-testid="priority-level"]', 'high');
    await page.fill('[data-testid="additional-comments"]', '至急対応が必要');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-131: 影響範囲選択で記録完了", async ({ page }) => {
    // SCEN-131
    await page.selectOption('[data-testid="interrupt-reason"]', 'equipment');
    await page.fill('[data-testid="interrupt-start-time"]', '13:00');
    await page.fill('[data-testid="interrupt-end-time"]', '13:45');
    await page.selectOption('[data-testid="impact-scope"]', 'department');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-132: 一時保存後に記録完了", async ({ page }) => {
    // SCEN-132
    await page.selectOption('[data-testid="work-item"]', 'item3');
    await page.fill('[data-testid="interrupt-reason"]', '会議参加');
    await page.fill('[data-testid="interrupt-start-time"]', '14:00');
    await page.click('[data-testid="temp-save-button"]');
    await expect(page.locator('[data-testid="temp-save-message"]')).toBeVisible();
    
    await page.reload();
    await expect(page.locator('[data-testid="work-item"]')).toHaveValue('item3');
    await page.fill('[data-testid="interrupt-end-time"]', '15:00');
    await page.click('[data-testid="complete-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-133: 中断時間自動計算表示", async ({ page }) => {
    // SCEN-133
    await page.click('[data-testid="start-work-button"]');
    await page.click('[data-testid="interrupt-work-button"]');
    await expect(page.locator('[data-testid="interrupt-start-time"]')).not.toBeEmpty();
    await page.selectOption('[data-testid="interrupt-reason"]', 'break');
    await page.click('[data-testid="end-interrupt-button"]');
    await expect(page.locator('[data-testid="interrupt-end-time"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="interrupt-duration"]')).toBeVisible();
  });

  test("SCEN-134: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-134
    await page.fill('[data-testid="remarks"]', '備考のみ入力');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('必須項目');
  });

  test("SCEN-135: 未来時刻入力でエラー表示", async ({ page }) => {
    // SCEN-135
    await page.selectOption('[data-testid="work-item"]', 'item1');
    await page.fill('[data-testid="interrupt-start-time"]', '23:59');
    await page.selectOption('[data-testid="interrupt-reason"]', 'meeting');
    await page.fill('[data-testid="remarks"]', 'コメント');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('未来');
  });

  test("SCEN-136: 中断詳細文字数上限超過でエラー表示", async ({ page }) => {
    // SCEN-136
    await page.fill('[data-testid="interrupt-start-time"]', '12:00');
    await page.selectOption('[data-testid="interrupt-reason"]', 'other');
    const longText = 'a'.repeat(1001);
    await page.fill('[data-testid="interrupt-details"]', longText);
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数');
  });

  test("SCEN-137: 対応外ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-137
    await page.fill('[data-testid="interrupt-reason"]', '機器トラブル');
    await page.setInputFiles('[data-testid="file-upload"]', 'malicious.exe');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('対応外');
  });

  test("SCEN-138: 大容量ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-138
    await page.fill('[data-testid="interrupt-reason"]', 'トラブル対応');
    const largeFile = Buffer.alloc(50 * 1024 * 1024);
    await page.setInputFiles('[data-testid="file-upload"]', { 
      name: 'large-video.mp4', 
      mimeType: 'video/mp4', 
      buffer: largeFile 
    });
    await page.click('[data-testid="upload-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('サイズ');
  });

  test("SCEN-139: 録音失敗でエラー表示", async ({ page }) => {
    // SCEN-139
    await page.context().grantPermissions([], { origin: page.url() });
    await page.click('[data-testid="record-audio-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('録音');
  });

  test("SCEN-140: ネットワークエラー時の送信失敗", async ({ page }) => {
    // SCEN-140
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.selectOption('[data-testid="interrupt-reason"]', 'break');
    await page.fill('[data-testid="interrupt-start-time"]', '15:00');
    await page.context().setOffline(true);
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('ネットワーク');
    await page.context().setOffline(false);
  });

  test("SCEN-141: 中断詳細文字数上限境界値", async ({ page }) => {
    // SCEN-141
    const exactLimit = 'a'.repeat(1000);
    await page.fill('[data-testid="interrupt-details"]', exactLimit);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    const overLimit = 'a'.repeat(1001);
    await page.fill('[data-testid="interrupt-details"]', overLimit);
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-142: ファイルサイズ上限境界値", async ({ page }) => {
    // SCEN-142
    await page.selectOption('[data-testid="work-item"]', 'item1');
    await page.selectOption('[data-testid="interrupt-reason"]', 'other');
    
    const exactSizeFile = Buffer.alloc(10 * 1024 * 1024);
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'exact-size.jpg',
      mimeType: 'image/jpeg',
      buffer: exactSizeFile
    });
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    const oversizeFile = Buffer.alloc(10 * 1024 * 1024 + 1);
    await page.setInputFiles('[data-testid="file-upload"]', {
      name: 'oversize.jpg',
      mimeType: 'image/jpeg', 
      buffer: oversizeFile
    });
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-143: 影響範囲全選択・全解除", async ({ page }) => {
    // SCEN-143
    await page.check('[data-testid="select-all-impact"]');
    await expect(page.locator('[data-testid="impact-item"]')).toBeChecked();
    
    await page.uncheck('[data-testid="select-all-impact"]');
    await expect(page.locator('[data-testid="impact-item"]')).not.toBeChecked();
    
    const impactItems = page.locator('[data-testid="impact-item"]');
    const count = await impactItems.count();
    for (let i = 0; i < count; i++) {
      await impactItems.nth(i).check();
    }
    await expect(page.locator('[data-testid="select-all-impact"]')).toBeChecked();
    
    await impactItems.first().uncheck();
    await expect(page.locator('[data-testid="select-all-impact"]')).not.toBeChecked();
  });
});