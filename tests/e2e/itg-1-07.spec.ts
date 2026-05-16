import { test, expect } from '@playwright/test';

test.describe("データ自動保存処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.goto("/panels/scr-1778907212862.html");
  });

  test("SCEN-093: 自動保存が正常に動作する", async ({ page }) => {
    // SCEN-093
    await page.selectOption('[data-testid="work-item-select"]', 'task1');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="work-content-textarea"]', '作業内容テスト');
    await page.waitForTimeout(30000);
    await page.reload();
    await expect(page.locator('[data-testid="work-content-textarea"]')).toHaveValue('作業内容テスト');
  });

  test("SCEN-094: 保存間隔設定を変更できる", async ({ page }) => {
    // SCEN-094
    await page.click('[data-testid="settings-button"]');
    await page.click('[data-testid="auto-save-settings"]');
    await page.fill('[data-testid="save-interval-input"]', '60');
    await page.click('[data-testid="save-settings-button"]');
    await page.click('[data-testid="back-to-main"]');
    await page.click('[data-testid="settings-button"]');
    await expect(page.locator('[data-testid="save-interval-input"]')).toHaveValue('60');
  });

  test("SCEN-095: 手動同期が正常に実行される", async ({ page }) => {
    // SCEN-095
    await page.fill('[data-testid="work-item-input"]', 'テスト作業');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:00');
    await page.setOffline(true);
    await page.fill('[data-testid="additional-work-input"]', '追加作業');
    await page.setOffline(false);
    await page.click('[data-testid="manual-sync-button"]');
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('同期完了');
  });

  test("SCEN-096: ローカルデータ一覧が表示される", async ({ page }) => {
    // SCEN-096
    await page.setOffline(true);
    await page.fill('[data-testid="work-content-input"]', '作業1');
    await page.click('[data-testid="save-button"]');
    await page.fill('[data-testid="work-content-input"]', '作業2');
    await page.click('[data-testid="save-button"]');
    await page.click('[data-testid="local-data-menu"]');
    await expect(page.locator('[data-testid="local-data-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-status-unsync"]')).toBeVisible();
  });

  test("SCEN-097: ネットワーク切断時にローカル保存される", async ({ page }) => {
    // SCEN-097
    await page.fill('[data-testid="work-content-input"]', '作業記録テスト');
    await page.fill('[data-testid="work-time-input"]', '2時間');
    await page.setOffline(true);
    await page.click('[data-testid="save-button"]');
    await page.setOffline(false);
    await page.reload();
    await expect(page.locator('[data-testid="work-content-input"]')).toHaveValue('作業記録テスト');
  });

  test("SCEN-098: ネットワーク復旧時に自動同期される", async ({ page }) => {
    // SCEN-098
    await page.setOffline(true);
    await page.fill('[data-testid="work-item-input"]', '新規作業');
    await page.fill('[data-testid="work-hours-input"]', '3');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="local-save-status"]')).toBeVisible();
    await page.setOffline(false);
    await expect(page.locator('[data-testid="sync-complete-message"]')).toBeVisible();
  });

  test("SCEN-099: データ復旧オプションが動作する", async ({ page }) => {
    // SCEN-099
    await page.fill('[data-testid="work-record-input"]', '復旧テスト作業');
    await page.context().close();
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="recovery-dialog"]')).toBeVisible();
    await page.click('[data-testid="recovery-confirm-button"]');
    await expect(page.locator('[data-testid="work-record-input"]')).toHaveValue('復旧テスト作業');
  });

  test("SCEN-100: 保存間隔に0秒を設定するとエラー", async ({ page }) => {
    // SCEN-100
    await page.click('[data-testid="settings-menu"]');
    await page.click('[data-testid="auto-save-section"]');
    await page.fill('[data-testid="save-interval-field"]', '0');
    await page.click('[data-testid="save-settings-button"]');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('保存間隔は1秒以上で設定してください');
  });

  test("SCEN-101: サーバーエラー時に保存エラー通知", async ({ page }) => {
    // SCEN-101
    await page.route('**/api/save', route => route.fulfill({ status: 500 }));
    await page.fill('[data-testid="work-content-input"]', '作業内容');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:00');
    await page.waitForTimeout(5000);
    await expect(page.locator('[data-testid="save-error-notification"]')).toContainText('データの保存に失敗しました');
  });

  test("SCEN-102: 同期失敗時にリトライ機能が動作", async ({ page }) => {
    // SCEN-102
    await page.fill('[data-testid="work-item-input"]', '新規作業項目');
    await page.fill('[data-testid="work-time-input"]', '2時間');
    await page.setOffline(true);
    await page.click('[data-testid="save-record-button"]');
    await expect(page.locator('[data-testid="sync-failed-message"]')).toBeVisible();
    await page.setOffline(false);
    await expect(page.locator('[data-testid="retry-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="sync-complete-notification"]')).toBeVisible();
  });

  test("SCEN-103: ストレージ容量不足時のエラーハンドリング", async ({ page }) => {
    // SCEN-103
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: () => Promise.resolve({ quota: 1000, usage: 999 }) }
      });
    });
    await page.fill('[data-testid="project-select"]', 'プロジェクトA');
    await page.fill('[data-testid="work-content-input"]', '作業内容');
    await page.fill('[data-testid="start-time-input"]', '09:00');
    await page.fill('[data-testid="end-time-input"]', '10:00');
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="storage-error-message"]')).toContainText('保存に失敗しました。端末の容量不足が原因の可能性があります');
  });

  test("SCEN-104: 不正データ形式での同期エラー処理", async ({ page }) => {
    // SCEN-104
    await page.fill('[data-testid="hours-input"]', 'abc');
    await page.fill('[data-testid="datetime-input"]', '2024/99/99 25:70');
    await page.fill('[data-testid="work-content-textarea"]', 'a'.repeat(10000));
    await page.click('[data-testid="save-button"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await page.setOffline(true);
    await page.click('[data-testid="save-button"]');
    await page.setOffline(false);
    await expect(page.locator('[data-testid="sync-error-notification"]')).toBeVisible();
  });

  test("SCEN-105: 保存間隔の最小値設定", async ({ page }) => {
    // SCEN-105
    await page.click('[data-testid="settings-screen"]');
    await page.fill('[data-testid="auto-save-interval"]', '1');
    await page.click('[data-testid="save-config"]');
    await page.goto("/panels/scr-1778907212862.html");
    await page.fill('[data-testid="work-data-input"]', '最小間隔テスト');
    await page.waitForTimeout(2000);
    await page.reload();
    await expect(page.locator('[data-testid="work-data-input"]')).toHaveValue('最小間隔テスト');
  });

  test("SCEN-106: 保存間隔の最大値設定", async ({ page }) => {
    // SCEN-106
    await page.click('[data-testid="settings-screen"]');
    await page.fill('[data-testid="save-interval-input"]', '86400');
    await page.click('[data-testid="apply-button"]');
    await page.click('[data-testid="close-settings"]');
    await page.fill('[data-testid="work-data-input"]', '最大間隔テスト');
    await page.clock.install();
    await page.clock.fastForward('24:00:00');
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toBeVisible();
  });

  test("SCEN-107: 大量データの自動保存性能", async ({ page }) => {
    // SCEN-107
    for (let i = 0; i < 100; i++) {
      await page.fill('[data-testid="bulk-data-input"]', `作業記録${i}`);
      await page.click('[data-testid="add-record-button"]');
    }
    const startTime = Date.now();
    await page.click('[data-testid="bulk-save-button"]');
    await expect(page.locator('[data-testid="save-complete"]')).toBeVisible();
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(10000);
  });

  test("SCEN-108: 同期待ち件数の上限表示", async ({ page }) => {
    // SCEN-108
    await page.setOffline(true);
    for (let i = 0; i < 101; i++) {
      await page.fill('[data-testid="work-record-input"]', `記録${i}`);
      await page.click('[data-testid="save-button"]');
    }
    await expect(page.locator('[data-testid="sync-queue-count"]')).toContainText('100');
    await expect(page.locator('[data-testid="queue-limit-warning"]')).toBeVisible();
  });
});