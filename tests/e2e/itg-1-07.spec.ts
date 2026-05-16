import { test, expect } from '@playwright/test';

test.describe("データ自動保存処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.goto("/panels/scr-1778907212862.html");
  });

  test('SCEN-093: 自動保存が正常に動作する', async ({ page }) => {
    // SCEN-093
    await page.selectOption('select[name="task"]', 'maintenance');
    await page.fill('input[type="time"]', '09:00');
    await page.fill('textarea', '設備点検作業');
    
    await page.clock.install();
    await page.clock.fastForward('30000');
    
    await page.reload();
    await expect(page.selectOption('select[name="task"]')).toHaveValue('maintenance');
    await expect(page.locator('textarea')).toHaveValue('設備点検作業');
  });

  test('SCEN-094: 保存間隔設定を変更できる', async ({ page }) => {
    // SCEN-094
    await page.click('button[data-testid="settings"]');
    await page.click('text=データ自動保存');
    await expect(page.locator('input[name="interval"]')).toHaveValue('30');
    await page.fill('input[name="interval"]', '60');
    await page.click('button:has-text("保存")');
    await page.click('text=戻る');
    await page.click('button[data-testid="settings"]');
    await expect(page.locator('input[name="interval"]')).toHaveValue('60');
  });

  test('SCEN-095: 手動同期が正常に実行される', async ({ page }) => {
    // SCEN-095
    await page.fill('input[type="time"]', '10:00');
    await page.fill('input[name="endTime"]', '12:00');
    await page.context().setOffline(true);
    await page.fill('textarea', 'オフライン作業');
    await page.context().setOffline(false);
    await page.click('button:has-text("同期")');
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test('SCEN-096: ローカルデータ一覧が表示される', async ({ page }) => {
    // SCEN-096
    await page.context().setOffline(true);
    await page.fill('textarea', '作業内容1');
    await page.click('button:has-text("保存")');
    await page.fill('textarea', '作業内容2');
    await page.click('button:has-text("保存")');
    await page.click('text=ローカルデータ一覧');
    await expect(page.locator('text=作業内容1')).toBeVisible();
    await expect(page.locator('text=未同期')).toBeVisible();
  });

  test('SCEN-097: ネットワーク切断時にローカル保存される', async ({ page }) => {
    // SCEN-097
    await page.fill('textarea', 'ローカル保存テスト');
    await page.context().setOffline(true);
    await page.click('button:has-text("保存")');
    const localStorage = await page.evaluate(() => window.localStorage.getItem('workData'));
    expect(localStorage).toContain('ローカル保存テスト');
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('textarea')).toHaveValue('ローカル保存テスト');
  });

  test('SCEN-098: ネットワーク復旧時に自動同期される', async ({ page }) => {
    // SCEN-098
    await page.context().setOffline(true);
    await page.fill('textarea', '自動同期テスト');
    await page.click('button:has-text("保存")');
    await page.context().setOffline(false);
    await page.waitForSelector('text=同期中');
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test('SCEN-099: データ復旧オプションが動作する', async ({ page }) => {
    // SCEN-099
    await page.fill('textarea', '復旧テストデータ');
    await page.context().close();
    await page.goto("/panels/scr-1778907212862.html");
    await expect(page.locator('text=データを復旧しますか？')).toBeVisible();
    await page.click('button:has-text("復旧する")');
    await expect(page.locator('textarea')).toHaveValue('復旧テストデータ');
  });

  test('SCEN-100: 保存間隔に0秒を設定するとエラー', async ({ page }) => {
    // SCEN-100
    await page.click('button[data-testid="settings"]');
    await page.fill('input[name="interval"]', '0');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=保存間隔は1秒以上で設定してください')).toBeVisible();
  });

  test('SCEN-101: サーバーエラー時に保存エラー通知', async ({ page }) => {
    // SCEN-101
    await page.route('**/api/save', route => route.abort('failed'));
    await page.fill('textarea', 'エラーテスト');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=データの保存に失敗しました')).toBeVisible();
  });

  test('SCEN-102: 同期失敗時にリトライ機能が動作', async ({ page }) => {
    // SCEN-102
    await page.fill('textarea', 'リトライテスト');
    await page.context().setOffline(true);
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=同期に失敗しました')).toBeVisible();
    await page.context().setOffline(false);
    await expect(page.locator('text=リトライ中')).toBeVisible();
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test('SCEN-103: ストレージ容量不足時のエラーハンドリング', async ({ page }) => {
    // SCEN-103
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
    });
    await page.fill('textarea', '容量不足テスト');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=端末の容量不足が原因の可能性があります')).toBeVisible();
  });

  test('SCEN-104: 不正データ形式での同期エラー処理', async ({ page }) => {
    // SCEN-104
    await page.fill('input[name="workHours"]', 'abc');
    await page.fill('input[type="datetime-local"]', '2024-99-99T25:70');
    await page.fill('textarea', 'a'.repeat(10000));
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=入力形式が正しくありません')).toBeVisible();
  });

  test('SCEN-105: 保存間隔の最小値設定', async ({ page }) => {
    // SCEN-105
    await page.click('button[data-testid="settings"]');
    await page.fill('input[name="interval"]', '1');
    await page.click('button:has-text("保存")');
    await page.click('text=戻る');
    await page.fill('textarea', '最小間隔テスト');
    await page.clock.install();
    await page.clock.fastForward('1000');
    await expect(page.locator('text=自動保存完了')).toBeVisible();
  });

  test('SCEN-106: 保存間隔の最大値設定', async ({ page }) => {
    // SCEN-106
    await page.click('button[data-testid="settings"]');
    await page.fill('input[name="interval"]', '86400');
    await page.click('button:has-text("保存")');
    await page.click('text=戻る');
    await page.fill('textarea', '最大間隔テスト');
    await page.clock.install();
    await page.clock.fastForward('86400000');
    await expect(page.locator('text=自動保存完了')).toBeVisible();
  });

  test('SCEN-107: 大量データの自動保存性能', async ({ page }) => {
    // SCEN-107
    const startTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      await page.evaluate((index) => {
        const data = { id: index, content: `テストデータ${index}` };
        localStorage.setItem(`workData_${index}`, JSON.stringify(data));
      }, i);
    }
    await page.click('button:has-text("一括保存")');
    await expect(page.locator('text=保存完了')).toBeVisible({ timeout: 10000 });
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(10000);
  });

  test('SCEN-108: 同期待ち件数の上限表示', async ({ page }) => {
    // SCEN-108
    await page.context().setOffline(true);
    for (let i = 0; i < 101; i++) {
      await page.fill('textarea', `データ${i}`);
      await page.click('button:has-text("保存")');
    }
    await expect(page.locator('text=同期待ち: 100件')).toBeVisible();
    await expect(page.locator('text=上限に達しました')).toBeVisible();
  });
});