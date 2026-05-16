import { test, expect } from '@playwright/test';

test.describe("工数入力画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");
  });

  test("SCEN-209: 全項目入力で工数記録が正常登録される", async ({ page }) => {
    // SCEN-209
    await page.goto("/");
    await page.fill('input[type="date"]', '2024-01-15');
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:30');
    await page.selectOption('select', { label: '作業A' });
    await page.fill('input[placeholder*="場所"]', '現場A');
    await page.fill('input[placeholder*="作業員"]', '田中太郎');
    await page.fill('textarea', '詳細な作業内容');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text=登録が完了しました')).toBeVisible();
  });

  test("SCEN-210: カレンダーから作業日付を選択できる", async ({ page }) => {
    // SCEN-210
    await page.goto("/");
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', '2024-01-15');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-01-15');
  });

  test("SCEN-211: 作業項目をドロップダウンから選択できる", async ({ page }) => {
    // SCEN-211
    await page.goto("/");
    await page.click('select');
    await page.selectOption('select', { index: 1 });
    await expect(page.locator('select')).not.toHaveValue('');
  });

  test("SCEN-212: 開始終了時刻入力で実働時間が自動計算される", async ({ page }) => {
    // SCEN-212
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:30');
    await page.click('body');
    await expect(page.locator('input[placeholder*="実働時間"]')).toHaveValue('8:30');
  });

  test("SCEN-213: 休憩時間入力で実働時間が正しく調整される", async ({ page }) => {
    // SCEN-213
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:00');
    await page.fill('input[placeholder*="休憩時間"]', '60');
    await expect(page.locator('text=7時間00分')).toBeVisible();
    await page.click('button:has-text("登録")');
  });

  test("SCEN-214: 中断記録を追加できる", async ({ page }) => {
    // SCEN-214
    await page.goto("/");
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.selectOption('select[name="status"]', '中断');
    await page.fill('input[placeholder*="中断理由"]', '資材確認');
    await page.fill('input[placeholder*="中断時刻"]', '10:30');
    await page.click('button:has-text("記録")');
    await expect(page.locator('text=中断')).toBeVisible();
  });

  test("SCEN-215: 複数の中断記録を登録できる", async ({ page }) => {
    // SCEN-215
    await page.goto("/");
    await page.click('button:has-text("作業開始")');
    await page.click('button:has-text("中断")');
    await page.selectOption('select[name="reason"]', '資材確認');
    await page.click('button:has-text("再開")');
    await page.click('button:has-text("中断")');
    await page.selectOption('select[name="reason"]', '打ち合わせ');
    await page.click('button:has-text("再開")');
    await page.click('button:has-text("中断")');
    await page.selectOption('select[name="reason"]', '休憩');
    await page.goto('/list');
    await expect(page.locator('text=資材確認')).toBeVisible();
    await expect(page.locator('text=打ち合わせ')).toBeVisible();
    await expect(page.locator('text=休憩')).toBeVisible();
  });

  test("SCEN-216: 必須項目未入力でバリデーションエラー", async ({ page }) => {
    // SCEN-216
    await page.goto("/");
    await page.fill('textarea', '任意項目のみ入力');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=必須項目')).toBeVisible();
  });

  test("SCEN-217: 開始時刻が終了時刻より遅い場合エラー", async ({ page }) => {
    // SCEN-217
    await page.goto("/");
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="開始時刻"]', '14:00');
    await page.fill('input[placeholder*="終了時刻"]', '10:00');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=開始時刻は終了時刻より前')).toBeVisible();
  });

  test("SCEN-218: 未来日付選択でエラー", async ({ page }) => {
    // SCEN-218
    await page.goto("/");
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    await page.fill('input[type="date"]', futureDate.toISOString().split('T')[0]);
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=未来日付')).toBeVisible();
  });

  test("SCEN-219: 時刻フォーマット不正でエラー", async ({ page }) => {
    // SCEN-219
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '25:30');
    await page.fill('input[placeholder*="終了時刻"]', 'abc:def');
    await page.selectOption('select', { index: 1 });
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=時刻フォーマット')).toBeVisible();
  });

  test("SCEN-220: 休憩時間が実働時間を超過した場合エラー", async ({ page }) => {
    // SCEN-220
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:00');
    await page.fill('input[placeholder*="休憩時間"]', '600');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=休憩時間が実働時間を超過')).toBeVisible();
  });

  test("SCEN-221: 作業内容詳細の文字数上限でエラー", async ({ page }) => {
    // SCEN-221
    await page.goto("/");
    await page.fill('input[type="date"]', '2024-01-15');
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:00');
    await page.fill('textarea', 'a'.repeat(1001));
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=文字数上限')).toBeVisible();
  });

  test("SCEN-222: 24時間をまたぐ作業時間入力", async ({ page }) => {
    // SCEN-222
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '23:30');
    await page.fill('input[placeholder*="終了時刻"]', '02:30');
    await page.fill('textarea', '夜間メンテナンス作業');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text=3時間00分')).toBeVisible();
  });

  test("SCEN-223: 休憩時間0分での登録", async ({ page }) => {
    // SCEN-223
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:00');
    await page.fill('input[placeholder*="休憩時間"]', '0');
    await page.selectOption('select', { index: 1 });
    await page.click('button:has-text("登録")');
    await expect(page.locator('text=8時間00分')).toBeVisible();
  });

  test("SCEN-224: 開始終了時刻が同じ場合の処理", async ({ page }) => {
    // SCEN-224
    await page.goto("/");
    await page.selectOption('select', { index: 1 });
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '09:00');
    await page.click('button:has-text("登録")');
    await expect(page.locator('text*=開始時刻と終了時刻が同じ')).toBeVisible();
  });

  test("SCEN-225: 作業内容詳細の最大文字数入力", async ({ page }) => {
    // SCEN-225
    await page.goto("/");
    await page.fill('input[type="date"]', '2024-01-15');
    const maxText = 'a'.repeat(1000);
    await page.fill('textarea', maxText);
    await expect(page.locator('textarea')).toHaveValue(maxText);
    await page.click('button:has-text("保存")');
    await expect(page.locator('text*=保存が完了')).toBeVisible();
  });

  test("SCEN-226: 中断時間の合計が実働時間と一致する場合", async ({ page }) => {
    // SCEN-226
    await page.goto("/");
    await page.fill('input[placeholder*="開始時刻"]', '09:00');
    await page.fill('input[placeholder*="終了時刻"]', '17:00');
    await page.fill('input[name="break1_start"]', '10:00');
    await page.fill('input[name="break1_end"]', '12:00');
    await page.fill('input[name="break2_start"]', '13:00');
    await page.fill('input[name="break2_end"]', '15:00');
    await page.fill('input[name="break3_start"]', '15:30');
    await page.fill('input[name="break3_end"]', '19:30');
    await page.click('button:has-text("保存")');
    await expect(page.locator('text*=中断時間の合計が実働時間と一致')).toBeVisible();
  });
});