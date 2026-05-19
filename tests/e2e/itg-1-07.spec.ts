import { test, expect } from '@playwright/test';

test.describe("データ自動保存処理", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907212862.html");
  });

  test("SCEN-093: 自動保存が正常に動作する", async ({ page }) => {
    // SCEN-093
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('select[name="task"]', 'プロジェクトA');
    await page.fill('input[name="startTime"]', '09:00');
    await page.fill('textarea[name="workContent"]', 'システム開発作業');
    
    await page.clock.install({ time: new Date() });
    await page.clock.fastForward('00:00:30');
    
    await page.reload();
    await expect(page.locator('textarea[name="workContent"]')).toHaveValue('システム開発作業');
  });

  test("SCEN-094: 保存間隔設定を変更できる", async ({ page }) => {
    // SCEN-094
    const currentInterval = await page.locator('[data-testid="save-interval"]').textContent();
    await page.fill('#save-interval', '60');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('[data-testid="save-interval"]')).toHaveValue('60');
    
    await page.reload();
    await expect(page.locator('[data-testid="save-interval"]')).toHaveValue('60');
  });

  test("SCEN-095: 手動同期が正常に実行される", async ({ page }) => {
    // SCEN-095
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', 'オフライン作業');
    
    await page.context().setOffline(true);
    await page.fill('textarea[name="workContent"]', 'オフライン追加作業');
    
    await page.context().setOffline(false);
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="manual-sync-button"]');
    
    await expect(page.locator('[data-testid="pending-sync-count"]')).toHaveText('0');
  });

  test("SCEN-096: ローカルデータ一覧が表示される", async ({ page }) => {
    // SCEN-096
    await page.context().setOffline(true);
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '作業内容1');
    await page.click('button:has-text("記録開始")');
    
    await page.fill('textarea[name="workContent"]', '作業内容2');
    await page.click('button:has-text("記録開始")');
    
    await page.goto("/panels/scr-1778907212862.html");
    const localDataRows = page.locator('[data-testid="local-data-list"] tr');
    await expect(localDataRows).toHaveCount.greaterThan(0);
  });

  test("SCEN-097: ネットワーク切断時にローカル保存される", async ({ page }) => {
    // SCEN-097
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', 'ローカル保存テスト');
    
    await page.context().setOffline(true);
    await page.click('button:has-text("記録開始")');
    
    await page.context().setOffline(false);
    await page.reload();
    
    await expect(page.locator('textarea[name="workContent"]')).toHaveValue('ローカル保存テスト');
  });

  test("SCEN-098: ネットワーク復旧時に自動同期される", async ({ page }) => {
    // SCEN-098
    await page.context().setOffline(true);
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '自動同期テスト');
    await page.click('button:has-text("記録開始")');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="pending-sync-count"]')).not.toHaveText('0');
    
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    
    await expect(page.locator('[data-testid="pending-sync-count"]')).toHaveText('0');
  });

  test("SCEN-099: データ復旧オプションが動作する", async ({ page }) => {
    // SCEN-099
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '復旧テストデータ');
    
    await page.close();
    
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="data-recovery-button"]');
    await page.click('button:has-text("復旧する")');
    
    await page.goto("/panels/scr-1778907296658.html");
    await expect(page.locator('textarea[name="workContent"]')).toHaveValue('復旧テストデータ');
  });

  test("SCEN-100: 保存間隔に0秒を設定するとエラー", async ({ page }) => {
    // SCEN-100
    await page.fill('#save-interval', '0');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('[data-testid="settings-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-error"]')).toContainText('1秒以上で設定してください');
  });

  test("SCEN-101: サーバーエラー時に保存エラー通知", async ({ page }) => {
    // SCEN-101
    await page.route('**/api/save', route => route.fulfill({ status: 500 }));
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', 'エラーテスト');
    await page.click('button:has-text("記録開始")');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-notification"]')).toContainText('保存に失敗しました');
  });

  test("SCEN-102: 同期失敗時にリトライ機能が動作", async ({ page }) => {
    // SCEN-102
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', 'リトライテスト');
    
    await page.context().setOffline(true);
    await page.click('button:has-text("記録開始")');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
    
    await page.context().setOffline(false);
    await page.click('[data-testid="retry-button"]');
    
    await expect(page.locator('[data-testid="pending-sync-count"]')).toHaveText('0');
  });

  test("SCEN-103: ストレージ容量不足時のエラーハンドリング", async ({ page }) => {
    // SCEN-103
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };
    });
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '容量不足テスト');
    await page.click('button:has-text("記録開始")');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-notification"]')).toContainText('容量不足');
  });

  test("SCEN-104: 不正データ形式での同期エラー処理", async ({ page }) => {
    // SCEN-104
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('input[name="workHours"]', 'abc');
    await page.fill('input[name="workDate"]', '2024/99/99 25:70');
    await page.fill('textarea[name="workContent"]', 'あ'.repeat(1000));
    
    await page.context().setOffline(true);
    await page.click('button:has-text("記録開始")');
    
    await page.context().setOffline(false);
    await page.goto("/panels/scr-1778907212862.html");
    
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
  });

  test("SCEN-105: 保存間隔の最小値設定", async ({ page }) => {
    // SCEN-105
    await page.fill('#save-interval', '1');
    await page.click('[data-testid="save-settings-button"]');
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '最小間隔テスト');
    
    await page.clock.install({ time: new Date() });
    await page.clock.fastForward('00:00:01');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="last-save-time"]')).not.toBeEmpty();
  });

  test("SCEN-106: 保存間隔の最大値設定", async ({ page }) => {
    // SCEN-106
    await page.fill('#save-interval', '86400');
    await page.click('[data-testid="save-settings-button"]');
    
    await expect(page.locator('#save-interval')).toHaveValue('86400');
    
    await page.goto("/panels/scr-1778907296658.html");
    await page.fill('textarea[name="workContent"]', '最大間隔テスト');
    
    await page.clock.install({ time: new Date() });
    await page.clock.fastForward('24:00:00');
    
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('[data-testid="last-save-time"]')).not.toBeEmpty();
  });

  test("SCEN-107: 大量データの自動保存性能", async ({ page }) => {
    // SCEN-107
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      await page.goto("/panels/scr-1778907296658.html");
      await page.fill('textarea[name="workContent"]', `大量データテスト${i}`);
      await page.click('button:has-text("記録開始")');
    }
    
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="manual-sync-button"]');
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(10000);
    
    await expect(page.locator('[data-testid="pending-sync-count"]')).toHaveText('0');
  });

  test("SCEN-108: 同期待ち件数の上限表示", async ({ page }) => {
    // SCEN-108
    await page.context().setOffline(true);
    
    for (let i = 0; i < 101; i++) {
      await page.goto("/panels/scr-1778907296658.html");
      await page.fill('textarea[name="workContent"]', `上限テスト${i}`);
      await page.click('button:has-text("記録開始")');
    }
    
    await page.goto("/panels/scr-1778907212862.html");
    const syncCount = await page.locator('[data-testid="pending-sync-count"]').textContent();
    expect(parseInt(syncCount || '0')).toBeLessThanOrEqual(100);
    
    await expect(page.locator('[data-testid="error-notification"]')).toBeVisible();
  });

});