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
    await page.goto("/panels/scr-1778907133295.html");
    await page.click('button:has-text("工数記録")');
    await page.fill('input', '作業内容テスト');
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForTimeout(3000);
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('保存');
    await page.reload();
    expect(await page.inputValue('input')).toBe('作業内容テスト');
  });

  test("SCEN-094: 保存間隔設定を変更できる", async ({ page }) => {
    // SCEN-094
    await page.fill('[data-testid="save-interval"]', '60');
    await page.click('[data-testid="save-settings-button"]');
    expect(await page.inputValue('[data-testid="save-interval"]')).toBe('60');
    await page.reload();
    expect(await page.inputValue('[data-testid="save-interval"]')).toBe('60');
  });

  test("SCEN-095: 手動同期が正常に実行される", async ({ page }) => {
    // SCEN-095
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', '工数データ');
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="manual-sync-button"]');
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('同期完了');
  });

  test("SCEN-096: ローカルデータ一覧が表示される", async ({ page }) => {
    // SCEN-096
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', '作業内容1');
    await page.click('button:has-text("記録開始")');
    await page.fill('input', '作業内容2');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    const localData = page.locator('[data-testid="local-data-list"]');
    await expect(localData).toBeVisible();
    expect(await localData.textContent()).toContain('作業内容1');
    expect(await localData.textContent()).toContain('作業内容2');
  });

  test("SCEN-097: ネットワーク切断時にローカル保存される", async ({ page }) => {
    // SCEN-097
    await page.goto("/panels/scr-1778907133295.html");
    await page.context().setOffline(true);
    await page.fill('input', 'オフライン作業');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    expect(await page.textContent('[data-testid="network-status"]')).toContain('オフライン');
    await page.context().setOffline(false);
    expect(await page.inputValue('input')).toBe('オフライン作業');
  });

  test("SCEN-098: ネットワーク復旧時に自動同期される", async ({ page }) => {
    // SCEN-098
    await page.context().setOffline(true);
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', '同期待ちデータ');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('同期完了');
  });

  test("SCEN-099: データ復旧オプションが動作する", async ({ page }) => {
    // SCEN-099
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', '復旧テストデータ');
    await page.context().close();
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="data-recovery-button"]');
    expect(await page.inputValue('input')).toBe('復旧テストデータ');
  });

  test("SCEN-100: 保存間隔に0秒を設定するとエラー", async ({ page }) => {
    // SCEN-100
    await page.fill('[data-testid="save-interval"]', '0');
    await page.click('[data-testid="save-settings-button"]');
    const errorMessage = page.locator('[data-testid="settings-error"]');
    await expect(errorMessage).toBeVisible();
    expect(await errorMessage.textContent()).toContain('1秒以上で設定してください');
  });

  test("SCEN-101: サーバーエラー時に保存エラー通知", async ({ page }) => {
    // SCEN-101
    await page.route('**/api/**', route => route.fulfill({ status: 500 }));
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', 'エラーテスト');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    const errorNotification = page.locator('[data-testid="error-notification"]');
    await expect(errorNotification).toBeVisible();
    expect(await errorNotification.textContent()).toContain('保存に失敗しました');
  });

  test("SCEN-102: 同期失敗時にリトライ機能が動作", async ({ page }) => {
    // SCEN-102
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', 'リトライテスト');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    await page.context().setOffline(true);
    await page.click('[data-testid="manual-sync-button"]');
    expect(await page.textContent('[data-testid="error-notification"]')).toContain('同期に失敗');
    await page.context().setOffline(false);
    await page.click('[data-testid="retry-button"]');
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('同期完了');
  });

  test("SCEN-103: ストレージ容量不足時のエラーハンドリング", async ({ page }) => {
    // SCEN-103
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: () => Promise.resolve({ quota: 1000, usage: 999 }) }
      });
    });
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', 'ストレージ満杯テスト');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    const errorNotification = page.locator('[data-testid="error-notification"]');
    await expect(errorNotification).toBeVisible();
    expect(await errorNotification.textContent()).toContain('容量不足');
  });

  test("SCEN-104: 不正データ形式での同期エラー処理", async ({ page }) => {
    // SCEN-104
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', 'abc');
    await page.fill('input[type="datetime-local"]', '2024/99/99 25:70');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    const errorNotification = page.locator('[data-testid="error-notification"]');
    await expect(errorNotification).toBeVisible();
    expect(await errorNotification.textContent()).toContain('データ形式');
  });

  test("SCEN-105: 保存間隔の最小値設定", async ({ page }) => {
    // SCEN-105
    await page.fill('[data-testid="save-interval"]', '1');
    await page.click('[data-testid="save-settings-button"]');
    await page.goto("/panels/scr-1778907133295.html");
    await page.fill('input', '最小間隔テスト');
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForTimeout(1500);
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('保存');
  });

  test("SCEN-106: 保存間隔の最大値設定", async ({ page }) => {
    // SCEN-106
    await page.fill('[data-testid="save-interval"]', '86400');
    await page.click('[data-testid="save-settings-button"]');
    expect(await page.inputValue('[data-testid="save-interval"]')).toBe('86400');
    await page.reload();
    expect(await page.inputValue('[data-testid="save-interval"]')).toBe('86400');
  });

  test("SCEN-107: 大量データの自動保存性能", async ({ page }) => {
    // SCEN-107
    const startTime = Date.now();
    await page.goto("/panels/scr-1778907133295.html");
    for (let i = 0; i < 100; i++) {
      await page.fill('input', `大量データ${i}`);
      await page.click('button:has-text("記録開始")');
    }
    await page.goto("/panels/scr-1778907212862.html");
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(10000);
    expect(await page.textContent('[data-testid="auto-save-status"]')).toContain('保存完了');
  });

  test("SCEN-108: 同期待ち件数の上限表示", async ({ page }) => {
    // SCEN-108
    await page.context().setOffline(true);
    await page.goto("/panels/scr-1778907133295.html");
    for (let i = 0; i < 101; i++) {
      await page.fill('input', `上限テスト${i}`);
      await page.click('button:has-text("記録開始")');
    }
    await page.goto("/panels/scr-1778907212862.html");
    const pendingCount = page.locator('[data-testid="pending-sync-count"]');
    expect(await pendingCount.textContent()).toContain('100');
    expect(await page.textContent('[data-testid="error-notification"]')).toContain('上限');
  });
});