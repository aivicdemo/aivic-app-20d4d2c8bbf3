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
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('input[type="time"]', '09:00');
    await page.fill('textarea', '設備点検作業');
    await page.waitForTimeout(3000);
    await page.goto("/panels/scr-1778907212862.html");
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('保存完了');
    await page.reload();
    await page.goto("/panels/scr-1778907187615.html");
    const content = await page.inputValue('textarea');
    expect(content).toBe('設備点検作業');
  });

  test("SCEN-094: 保存間隔設定を変更できる", async ({ page }) => {
    // SCEN-094
    const currentInterval = await page.inputValue('[data-testid="save-interval"]');
    await page.fill('[data-testid="save-interval"]', '60');
    await page.click('[data-testid="save-settings-button"]');
    await page.waitForSelector('[data-testid="auto-save-status"]');
    const newInterval = await page.inputValue('[data-testid="save-interval"]');
    expect(newInterval).toBe('60');
    await page.reload();
    const persistedInterval = await page.inputValue('[data-testid="save-interval"]');
    expect(persistedInterval).toBe('60');
  });

  test("SCEN-095: 手動同期が正常に実行される", async ({ page }) => {
    // SCEN-095
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('input[type="time"]', '09:00');
    await page.fill('textarea', '同期テストデータ');
    await page.click('button:has-text("記録開始")');
    await page.context().setOffline(true);
    await page.fill('textarea', '追加データ');
    await page.click('button:has-text("記録終了")');
    await page.context().setOffline(false);
    await page.goto("/panels/scr-1778907212862.html");
    await page.click('[data-testid="manual-sync-button"]');
    await page.waitForSelector('[data-testid="auto-save-status"]:has-text("同期完了")');
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('同期完了');
  });

  test("SCEN-096: ローカルデータ一覧が表示される", async ({ page }) => {
    // SCEN-096
    await page.context().setOffline(true);
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', 'ローカル保存データ1');
    await page.click('button:has-text("記録開始")');
    await page.fill('textarea', 'ローカル保存データ2');
    await page.click('button:has-text("記録終了")');
    await page.goto("/panels/scr-1778907212862.html");
    const localDataRows = await page.locator('[data-testid="local-data-list"] tr').count();
    expect(localDataRows).toBeGreaterThan(0);
    const firstRowText = await page.textContent('[data-testid="local-data-list"] tr:first-child');
    expect(firstRowText).toContain('未同期');
  });

  test("SCEN-097: ネットワーク切断時にローカル保存される", async ({ page }) => {
    // SCEN-097
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', '新規作業記録');
    await page.context().setOffline(true);
    await page.click('button:has-text("記録開始")');
    const localStorage = await page.evaluate(() => window.localStorage.getItem('workRecords'));
    expect(localStorage).toBeTruthy();
    await page.context().setOffline(false);
    await page.reload();
    const persistedData = await page.inputValue('textarea');
    expect(persistedData).toContain('新規作業記録');
  });

  test("SCEN-098: ネットワーク復旧時に自動同期される", async ({ page }) => {
    // SCEN-098
    await page.context().setOffline(true);
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', '復旧同期テストデータ');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    const pendingCount = await page.textContent('[data-testid="pending-sync-count"]');
    expect(pendingCount).not.toBe('0');
    await page.context().setOffline(false);
    await page.waitForSelector('[data-testid="auto-save-status"]:has-text("同期完了")');
    const finalPendingCount = await page.textContent('[data-testid="pending-sync-count"]');
    expect(finalPendingCount).toBe('0');
  });

  test("SCEN-099: データ復旧オプションが動作する", async ({ page }) => {
    // SCEN-099
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', '復旧テスト作業内容');
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto("/login.html");
    await newPage.fill('[name="username"]', 'test');
    await newPage.fill('[name="password"]', 'test');
    await Promise.all([
      newPage.waitForURL(url => !url.toString().includes('/login.html')),
      newPage.click('button[type="submit"]'),
    ]);
    await newPage.goto("/panels/scr-1778907212862.html");
    await newPage.waitForSelector('[data-testid="data-recovery-button"]');
    await newPage.click('[data-testid="data-recovery-button"]');
    await newPage.goto("/panels/scr-1778907187615.html");
    const recoveredContent = await newPage.inputValue('textarea');
    expect(recoveredContent).toBe('復旧テスト作業内容');
  });

  test("SCEN-100: 保存間隔に0秒を設定するとエラー", async ({ page }) => {
    // SCEN-100
    await page.fill('[data-testid="save-interval"]', '0');
    await page.click('[data-testid="save-settings-button"]');
    await page.waitForSelector('[data-testid="settings-error"]');
    const errorMessage = await page.textContent('[data-testid="settings-error"]');
    expect(errorMessage).toContain('1秒以上で設定してください');
  });

  test("SCEN-101: サーバーエラー時に保存エラー通知", async ({ page }) => {
    // SCEN-101
    await page.route('**/api/**', route => route.fulfill({
      status: 500,
      body: 'Server Error'
    }));
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', 'エラーテストデータ');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForSelector('[data-testid="error-notification"]');
    const errorText = await page.textContent('[data-testid="error-notification"]');
    expect(errorText).toContain('保存に失敗しました');
  });

  test("SCEN-102: 同期失敗時にリトライ機能が動作", async ({ page }) => {
    // SCEN-102
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', 'リトライテストデータ');
    await page.context().setOffline(true);
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForSelector('[data-testid="error-notification"]');
    await page.context().setOffline(false);
    await page.click('[data-testid="retry-button"]');
    await page.waitForSelector('[data-testid="auto-save-status"]:has-text("同期完了")');
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('同期完了');
  });

  test("SCEN-103: ストレージ容量不足時のエラーハンドリング", async ({ page }) => {
    // SCEN-103
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function() {
        throw new Error('QuotaExceededError');
      };
    });
    await page.goto("/panels/scr-1778907187615.html");
    await page.selectOption('select', 'task1');
    await page.fill('textarea', '容量不足テストデータ');
    await page.click('button:has-text("記録開始")');
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForSelector('[data-testid="error-notification"]');
    const errorMessage = await page.textContent('[data-testid="error-notification"]');
    expect(errorMessage).toContain('容量不足');
  });

  test("SCEN-104: 不正データ形式での同期エラー処理", async ({ page }) => {
    // SCEN-104
    await page.goto("/panels/scr-1778907187615.html");
    await page.fill('input[type="time"]', '25:70');
    await page.fill('textarea', 'a'.repeat(10000));
    await page.click('button:has-text("記録開始")');
    await page.context().setOffline(true);
    await page.click('button:has-text("記録終了")');
    await page.context().setOffline(false);
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForSelector('[data-testid="error-notification"]');
    const errorMessage = await page.textContent('[data-testid="error-notification"]');
    expect(errorMessage).toContain('不正なデータ形式');
  });

  test("SCEN-105: 保存間隔の最小値設定", async ({ page }) => {
    // SCEN-105
    await page.fill('[data-testid="save-interval"]', '1');
    await page.click('[data-testid="save-settings-button"]');
    await page.goto("/panels/scr-1778907187615.html");
    await page.fill('textarea', '最小間隔テストデータ');
    await page.waitForTimeout(1500);
    await page.goto("/panels/scr-1778907212862.html");
    const lastSaveTime = await page.textContent('[data-testid="last-save-time"]');
    expect(lastSaveTime).toBeTruthy();
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('保存完了');
  });

  test("SCEN-106: 保存間隔の最大値設定", async ({ page }) => {
    // SCEN-106
    await page.fill('[data-testid="save-interval"]', '86400');
    await page.click('[data-testid="save-settings-button"]');
    const savedInterval = await page.inputValue('[data-testid="save-interval"]');
    expect(savedInterval).toBe('86400');
    await page.goto("/panels/scr-1778907187615.html");
    await page.fill('textarea', '最大間隔テストデータ');
    await page.goto("/panels/scr-1778907212862.html");
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('保存待機');
  });

  test("SCEN-107: 大量データの自動保存性能", async ({ page }) => {
    // SCEN-107
    const startTime = Date.now();
    await page.goto("/panels/scr-1778907187615.html");
    for (let i = 0; i < 100; i++) {
      await page.fill('textarea', `大量データテスト${i}`);
      await page.click('button:has-text("記録開始")');
      await page.click('button:has-text("記録終了")');
    }
    await page.goto("/panels/scr-1778907212862.html");
    await page.waitForSelector('[data-testid="auto-save-status"]:has-text("保存完了")');
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThan(10000);
    const status = await page.textContent('[data-testid="auto-save-status"]');
    expect(status).toContain('保存完了');
  });

  test("SCEN-108: 同期待ち件数の上限表示", async ({ page }) => {
    // SCEN-108
    await page.context().setOffline(true);
    await page.goto("/panels/scr-1778907187615.html");
    for (let i = 0; i < 101; i++) {
      await page.fill('textarea', `上限テストデータ${i}`);
      await page.click('button:has-text("記録開始")');
      await page.click('button:has-text("記録終了")');
    }
    await page.goto("/panels/scr-1778907212862.html");
    const pendingCount = await page.textContent('[data-testid="pending-sync-count"]');
    expect(parseInt(pendingCount)).toBeLessThanOrEqual(100);
    const errorMessage = await page.textContent('[data-testid="error-notification"]');
    expect(errorMessage).toContain('上限');
  });
});