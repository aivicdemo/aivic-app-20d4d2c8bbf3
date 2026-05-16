import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("データ自動保存処理", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    // ログイン処理（必要に応じて実装）
  });

  test("SCEN-093: 自動保存が正常に動作する", async ({ page }) => {
    // SCEN-093
    await page.goto("/");
    // 工数記録画面への遷移とデータ入力
    await page.fill('input[type="text"]', 'テスト作業項目');
    await page.fill('input[type="time"]', '09:00');
    await page.fill('textarea', 'テスト作業内容');
    
    // 30秒間待機して自動保存を確認
    await page.waitForTimeout(30000);
    
    // 画面更新後にデータが保持されているか確認
    await page.reload();
    await expect(page.locator('input[type="text"]')).toHaveValue('テスト作業項目');
    await expect(page.locator('textarea')).toHaveValue('テスト作業内容');
  });

  test("SCEN-094: 保存間隔設定を変更できる", async ({ page }) => {
    // SCEN-094
    await page.goto("/");
    await page.click('button:has-text("設定")');
    
    // 保存間隔設定を60秒に変更
    await page.fill('input[name="save-interval"]', '60');
    await page.click('button:has-text("保存")');
    
    // 設定が保存されていることを確認
    await page.click('button:has-text("設定")');
    await expect(page.locator('input[name="save-interval"]')).toHaveValue('60');
  });

  test("SCEN-095: 手動同期が正常に実行される", async ({ page }) => {
    // SCEN-095
    await page.goto("/");
    await page.fill('input[type="text"]', 'テスト作業');
    await page.fill('input[type="time"]', '09:00');
    
    // オフライン状態をシミュレート
    await page.context().setOffline(true);
    await page.fill('textarea', 'オフライン入力データ');
    
    // オンライン復旧後に手動同期
    await page.context().setOffline(false);
    await page.click('button:has-text("同期")');
    
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test("SCEN-096: ローカルデータ一覧が表示される", async ({ page }) => {
    // SCEN-096
    await page.goto("/");
    await page.context().setOffline(true);
    
    await page.fill('input[type="text"]', '作業項目1');
    await page.click('button:has-text("保存")');
    
    await page.fill('input[type="text"]', '作業項目2');
    await page.click('button:has-text("保存")');
    
    await page.click('button:has-text("ローカルデータ")');
    await expect(page.locator('text=作業項目1')).toBeVisible();
    await expect(page.locator('text=作業項目2')).toBeVisible();
  });

  test("SCEN-097: ネットワーク切断時にローカル保存される", async ({ page }) => {
    // SCEN-097
    await page.goto("/");
    await page.fill('input[type="text"]', 'オフライン作業');
    
    await page.context().setOffline(true);
    await page.click('button:has-text("保存")');
    
    // ローカルストレージにデータが保存されているか確認
    const localData = await page.evaluate(() => localStorage.getItem('workData'));
    expect(localData).toContain('オフライン作業');
    
    await page.context().setOffline(false);
    await page.reload();
    await expect(page.locator('input[type="text"]')).toHaveValue('オフライン作業');
  });

  test("SCEN-098: ネットワーク復旧時に自動同期される", async ({ page }) => {
    // SCEN-098
    await page.goto("/");
    await page.context().setOffline(true);
    
    await page.fill('input[type="text"]', '自動同期テスト');
    await page.click('button:has-text("保存")');
    
    await page.context().setOffline(false);
    await page.waitForTimeout(2000);
    
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test("SCEN-099: データ復旧オプションが動作する", async ({ page }) => {
    // SCEN-099
    await page.goto("/");
    await page.fill('input[type="text"]', '復旧テストデータ');
    
    await page.close();
    const newPage = await page.context().newPage();
    await newPage.goto("/");
    
    await expect(newPage.locator('text=データを復旧しますか')).toBeVisible();
    await newPage.click('button:has-text("復旧する")');
    
    await expect(newPage.locator('input[type="text"]')).toHaveValue('復旧テストデータ');
  });

  test("SCEN-100: 保存間隔に0秒を設定するとエラー", async ({ page }) => {
    // SCEN-100
    await page.goto("/");
    await page.click('button:has-text("設定")');
    
    await page.fill('input[name="save-interval"]', '0');
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('text=保存間隔は1秒以上で設定してください')).toBeVisible();
  });

  test("SCEN-101: サーバーエラー時に保存エラー通知", async ({ page }) => {
    // SCEN-101
    await page.route('**/api/save', route => route.fulfill({ status: 500 }));
    
    await page.goto("/");
    await page.fill('input[type="text"]', 'エラーテスト');
    await page.waitForTimeout(30000);
    
    await expect(page.locator('text=データの保存に失敗しました')).toBeVisible();
  });

  test("SCEN-102: 同期失敗時にリトライ機能が動作", async ({ page }) => {
    // SCEN-102
    await page.goto("/");
    await page.fill('input[type="text"]', 'リトライテスト');
    
    await page.context().setOffline(true);
    await page.click('button:has-text("保存")');
    await expect(page.locator('text=同期に失敗しました')).toBeVisible();
    
    await page.context().setOffline(false);
    await page.waitForTimeout(5000);
    
    await expect(page.locator('text=同期完了')).toBeVisible();
  });

  test("SCEN-103: ストレージ容量不足時のエラーハンドリング", async ({ page }) => {
    // SCEN-103
    await page.goto("/");
    
    // ストレージ容量不足をシミュレート
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };
    });
    
    await page.fill('input[type="text"]', '容量不足テスト');
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('text=端末の容量不足が原因の可能性があります')).toBeVisible();
  });

  test("SCEN-104: 不正データ形式での同期エラー処理", async ({ page }) => {
    // SCEN-104
    await page.goto("/");
    
    await page.fill('input[type="number"]', 'abc');
    await page.fill('input[type="datetime-local"]', '2024/99/99 25:70');
    
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('text=データ形式が正しくありません')).toBeVisible();
  });

  test("SCEN-105: 保存間隔の最小値設定", async ({ page }) => {
    // SCEN-105
    await page.goto("/");
    await page.click('button:has-text("設定")');
    
    await page.fill('input[name="save-interval"]', '1');
    await page.click('button:has-text("保存")');
    
    await page.fill('input[type="text"]', '最小間隔テスト');
    await page.waitForTimeout(2000);
    
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/save')) requests.push(req);
    });
    
    expect(requests.length).toBeGreaterThan(0);
  });

  test("SCEN-106: 保存間隔の最大値設定", async ({ page }) => {
    // SCEN-106
    await page.goto("/");
    await page.click('button:has-text("設定")');
    
    await page.fill('input[name="save-interval"]', '86400');
    await page.click('button:has-text("保存")');
    
    await expect(page.locator('input[name="save-interval"]')).toHaveValue('86400');
  });

  test("SCEN-107: 大量データの自動保存性能", async ({ page }) => {
    // SCEN-107
    await page.goto("/");
    
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await page.fill('input[type="text"]', `大量テスト${i}`);
      await page.click('button:has-text("保存")');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10000);
  });

  test("SCEN-108: 同期待ち件数の上限表示", async ({ page }) => {
    // SCEN-108
    await page.goto("/");
    await page.context().setOffline(true);
    
    for (let i = 0; i < 101; i++) {
      await page.fill('input[type="text"]', `上限テスト${i}`);
      await page.click('button:has-text("保存")');
    }
    
    await expect(page.locator('text=同期待ち件数が上限に達しました')).toBeVisible();
    await expect(page.locator('text=100件')).toBeVisible();
  });
});