import { test, expect } from '@playwright/test';

test.describe("中断記録入力画面", () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'testpass');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard.html');
    
    // 対象画面に遷移
    await page.goto("/panels/scr-1778907238439.html");
  });

  test("SCEN-124: 中断開始時刻入力で記録完了", async ({ page }) => {
    // SCEN-124
    await page.fill('[data-testid="interrupt-start-time"]', '14:30');
    await page.selectOption('[data-testid="interrupt-reason"]', 'equipment-failure');
    await page.click('[data-testid="record-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="record-list"]')).toContainText('14:30');
  });

  test("SCEN-125: 中断理由選択で記録完了", async ({ page }) => {
    // SCEN-125
    await page.selectOption('[data-testid="interrupt-reason"]', 'material-shortage');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-126: 中断詳細入力で記録完了", async ({ page }) => {
    // SCEN-126
    await page.selectOption('[data-testid="interrupt-reason"]', 'maintenance');
    await page.fill('[data-testid="interrupt-start-time"]', '09:00');
    await page.fill('[data-testid="interrupt-end-time"]', '10:30');
    await page.fill('[data-testid="interrupt-details"]', '設備の定期メンテナンス作業');
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-127: 中断場所入力で記録完了", async ({ page }) => {
    // SCEN-127
    await page.selectOption('[data-testid="work-item"]', 'assembly-line-1');
    await page.fill('[data-testid="interrupt-start-time"]', '11:00');
    await page.fill('[data-testid="interrupt-end-time"]', '12:00');
    await page.fill('[data-testid="interrupt-location"]', 'A棟2階組立ライン');
    await page.selectOption('[data-testid="interrupt-reason"]', 'break');
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-128: 写真添付で記録完了", async ({ page }) => {
    // SCEN-128
    await page.fill('[data-testid="work-content"]', '配管作業');
    await page.selectOption('[data-testid="interrupt-reason"]', 'safety-check');
    await page.fill('[data-testid="interrupt-start-time"]', '13:00');
    await page.fill('[data-testid="interrupt-end-time"]', '13:15');
    
    const fileInput = page.locator('[data-testid="photo-upload"]');
    await fileInput.setInputFiles('test-files/sample.jpg');
    
    await expect(page.locator('[data-testid="uploaded-photo"]')).toBeVisible();
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-129: 音声メモ録音で記録完了", async ({ page }) => {
    // SCEN-129
    await page.selectOption('[data-testid="work-item"]', 'inspection');
    await page.selectOption('[data-testid="interrupt-reason"]', 'consultation');
    
    await page.context().grantPermissions(['microphone']);
    await page.click('[data-testid="voice-record-button"]');
    await page.waitForTimeout(2000);
    await page.click('[data-testid="voice-stop-button"]');
    
    await expect(page.locator('[data-testid="voice-player"]')).toBeVisible();
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-130: 緊急度選択で記録完了", async ({ page }) => {
    // SCEN-130
    await page.fill('[data-testid="interrupt-reason-text"]', '緊急設備故障');
    await page.selectOption('[data-testid="urgency-level"]', 'high');
    await page.fill('[data-testid="additional-comments"]', '即座の対応が必要');
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test("SCEN-131: 影響範囲選択で記録完了", async ({ page }) => {
    // SCEN-131
    await page.selectOption('[data-testid="interrupt-reason"]', 'system-error');
    await page.fill('[data-testid="interrupt-start-time"]', '15:00');
    await page.fill('[data-testid="interrupt-end-time"]', '15:45');
    await page.selectOption('[data-testid="impact-scope"]', 'entire-line');
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-132: 一時保存後に記録完了", async ({ page }) => {
    // SCEN-132
    await page.selectOption('[data-testid="work-item"]', 'quality-check');
    await page.fill('[data-testid="interrupt-reason-text"]', '品質検査');
    await page.fill('[data-testid="interrupt-time"]', '16:00');
    await page.click('[data-testid="temp-save-button"]');
    
    await expect(page.locator('[data-testid="temp-save-message"]')).toBeVisible();
    
    await page.reload();
    
    await expect(page.locator('[data-testid="work-item"]')).toHaveValue('quality-check');
    await expect(page.locator('[data-testid="interrupt-reason-text"]')).toHaveValue('品質検査');
    
    await page.fill('[data-testid="additional-info"]', '追加詳細情報');
    await page.click('[data-testid="record-complete-button"]');
    
    await expect(page.locator('[data-testid="completion-message"]')).toBeVisible();
  });

  test("SCEN-133: 中断時間自動計算表示", async ({ page }) => {
    // SCEN-133
    await page.click('[data-testid="start-interrupt-button"]');
    
    await expect(page.locator('[data-testid="interrupt-start-time"]')).not.toBeEmpty();
    
    await page.selectOption('[data-testid="interrupt-reason"]', 'meeting');
    await page.click('[data-testid="end-interrupt-button"]');
    
    await expect(page.locator('[data-testid="interrupt-end-time"]')).not.toBeEmpty();
    await expect(page.locator('[data-testid="interrupt-duration"]')).toBeVisible();
  });

  test("SCEN-134: 必須項目未入力でエラー表示", async ({ page }) => {
    // SCEN-134
    await page.fill('[data-testid="optional-notes"]', '備考のみ入力');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('必須項目');
  });

  test("SCEN-135: 未来時刻入力でエラー表示", async ({ page }) => {
    // SCEN-135
    await page.selectOption('[data-testid="work-item"]', 'assembly');
    
    const futureTime = new Date();
    futureTime.setHours(futureTime.getHours() + 2);
    const futureTimeString = futureTime.toTimeString().slice(0, 5);
    
    await page.fill('[data-testid="interrupt-start-time"]', futureTimeString);
    await page.selectOption('[data-testid="interrupt-reason"]', 'break');
    await page.fill('[data-testid="notes"]', 'コメント');
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('未来');
  });

  test("SCEN-136: 中断詳細文字数上限超過でエラー表示", async ({ page }) => {
    // SCEN-136
    await page.fill('[data-testid="interrupt-start-time"]', '10:00');
    await page.selectOption('[data-testid="interrupt-reason"]', 'maintenance');
    
    const longText = 'a'.repeat(1001);
    await page.fill('[data-testid="interrupt-details"]', longText);
    await page.click('[data-testid="register-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('文字数上限');
  });

  test("SCEN-137: 対応外ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-137
    await page.fill('[data-testid="interrupt-reason-text"]', '設備故障');
    
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles('test-files/malicious.exe');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('対応外');
  });

  test("SCEN-138: 大容量ファイル添付でエラー表示", async ({ page }) => {
    // SCEN-138
    await page.fill('[data-testid="interrupt-reason-text"]', 'ファイル添付テスト');
    
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles('test-files/large-video.mp4');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('サイズ上限');
  });

  test("SCEN-139: 録音失敗でエラー表示", async ({ page }) => {
    // SCEN-139
    await page.context().grantPermissions([]);
    await page.click('[data-testid="voice-record-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('録音失敗');
  });

  test("SCEN-140: ネットワークエラー時の送信失敗", async ({ page }) => {
    // SCEN-140
    await page.fill('[data-testid="work-content"]', '作業内容');
    await page.selectOption('[data-testid="interrupt-reason"]', 'emergency');
    await page.fill('[data-testid="interrupt-time"]', '14:00');
    
    await page.context().setOffline(true);
    await page.click('[data-testid="submit-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('ネットワーク');
    
    await page.context().setOffline(false);
    
    await expect(page.locator('[data-testid="work-content"]')).toHaveValue('作業内容');
  });

  test("SCEN-141: 中断詳細文字数上限境界値", async ({ page }) => {
    // SCEN-141
    const exactLimitText = 'a'.repeat(1000);
    await page.fill('[data-testid="interrupt-details"]', exactLimitText);
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    const overLimitText = 'a'.repeat(1001);
    await page.fill('[data-testid="interrupt-details"]', overLimitText);
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-142: ファイルサイズ上限境界値", async ({ page }) => {
    // SCEN-142
    await page.selectOption('[data-testid="work-item"]', 'inspection');
    await page.selectOption('[data-testid="interrupt-reason"]', 'documentation');
    
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles('test-files/exact-10mb.jpg');
    
    await expect(page.locator('[data-testid="uploaded-file"]')).toBeVisible();
    await page.click('[data-testid="save-button"]');
    
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    await fileInput.setInputFiles('test-files/over-10mb.jpg');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test("SCEN-143: 影響範囲全選択・全解除", async ({ page }) => {
    // SCEN-143
    await page.check('[data-testid="select-all-impact"]');
    
    const impactItems = page.locator('[data-testid^="impact-item-"]');
    await expect(impactItems.first()).toBeChecked();
    await expect(impactItems.last()).toBeChecked();
    
    await page.uncheck('[data-testid="select-all-impact"]');
    
    await expect(impactItems.first()).not.toBeChecked();
    await expect(impactItems.last()).not.toBeChecked();
    
    await page.check('[data-testid="impact-item-1"]');
    await page.check('[data-testid="impact-item-2"]');
    await page.check('[data-testid="impact-item-3"]');
    
    await expect(page.locator('[data-testid="select-all-impact"]')).toBeChecked();
    
    await page.uncheck('[data-testid="impact-item-1"]');
    
    await expect(page.locator('[data-testid="select-all-impact"]')).not.toBeChecked();
  });
});