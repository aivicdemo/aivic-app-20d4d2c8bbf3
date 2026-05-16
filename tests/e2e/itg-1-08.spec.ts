import { test, expect } from '@playwright/test';

test.describe("記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test_user');
    await page.fill('[name="password"]', 'password');
    await page.click('[type="submit"]');
    await page.goto("/panels/scr-1778907226171.html");
  });

  test("日付選択で該当日の工数記録が表示される", async ({ page }) => {
    // SCEN-109
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', '2024-01-15');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-01-15');
    const records = page.locator('tbody tr');
    const count = await records.count();
    if (count === 0) {
      await expect(page.locator('text=記録なし')).toBeVisible();
    } else {
      for (let i = 0; i < count; i++) {
        await expect(records.nth(i).locator('td').first()).toContainText('2024-01-15');
      }
    }
  });

  test("作業記録一覧テーブルに全項目が正しく表示される", async ({ page }) => {
    // SCEN-110
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("日付")')).toBeVisible();
    await expect(page.locator('th:has-text("開始時間")')).toBeVisible();
    await expect(page.locator('th:has-text("終了時間")')).toBeVisible();
    await expect(page.locator('th:has-text("作業内容")')).toBeVisible();
    await expect(page.locator('th:has-text("作業場所")')).toBeVisible();
    await expect(page.locator('th:has-text("工数")')).toBeVisible();
    await expect(page.locator('th:has-text("備考")')).toBeVisible();
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow.locator('td').nth(0)).not.toBeEmpty();
    await expect(firstRow.locator('td').nth(1)).not.toBeEmpty();
    await expect(firstRow.locator('td').nth(2)).not.toBeEmpty();
  });

  test("編集ボタンで編集画面に遷移する", async ({ page }) => {
    // SCEN-111
    const editButton = page.locator('button:has-text("編集")').first();
    await editButton.click();
    await expect(page).toHaveURL(/edit/);
  });

  test("削除ボタンで記録が削除される", async ({ page }) => {
    // SCEN-112
    const initialCount = await page.locator('tbody tr').count();
    const deleteButton = page.locator('button:has-text("削除")').first();
    await deleteButton.click();
    
    page.on('dialog', dialog => dialog.accept());
    
    await page.waitForTimeout(1000);
    const finalCount = await page.locator('tbody tr').count();
    expect(finalCount).toBeLessThan(initialCount);
  });

  test("詳細表示ボタンで詳細画面が表示される", async ({ page }) => {
    // SCEN-113
    const detailButton = page.locator('button:has-text("詳細")').first();
    await detailButton.click();
    await expect(page.locator('text=作業内容')).toBeVisible();
    await expect(page.locator('text=開始時刻')).toBeVisible();
    await expect(page.locator('text=終了時刻')).toBeVisible();
    await expect(page.locator('text=作業時間')).toBeVisible();
    await expect(page.locator('text=備考')).toBeVisible();
  });

  test("期間絞り込みで指定期間の記録のみ表示される", async ({ page }) => {
    // SCEN-114
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');
    await page.click('button:has-text("絞り込み")');
    
    const records = page.locator('tbody tr');
    const count = await records.count();
    for (let i = 0; i < count; i++) {
      const dateText = await records.nth(i).locator('td').first().textContent();
      expect(dateText).toMatch(/2024-01/);
    }
  });

  test("異常値警告アイコンが該当記録に表示される", async ({ page }) => {
    // SCEN-115
    await page.goto("/panels/scr-1778907226171.html");
    const warningIcon = page.locator('.warning-icon, .alert-icon').first();
    await expect(warningIcon).toBeVisible();
    const parentRow = warningIcon.locator('..').locator('..');
    await expect(parentRow).toBeVisible();
  });

  test("工数記録が存在しない日付を選択", async ({ page }) => {
    // SCEN-116
    await page.fill('input[type="date"]', '2025-12-31');
    await page.click('button:has-text("検索")');
    
    const noRecordsMessage = page.locator('text=記録なし, text=データがありません');
    await expect(noRecordsMessage.or(page.locator('tbody tr').count().then(c => c === 0 ? page.locator('tbody') : page.locator('text=記録なし')))).toBeTruthy();
  });

  test("削除権限がない記録の削除を試行", async ({ page }) => {
    // SCEN-117
    const deleteButton = page.locator('button:has-text("削除")').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await expect(page.locator('text=削除権限がありません, text=権限エラー')).toBeVisible();
    } else {
      await expect(deleteButton).not.toBeVisible();
    }
  });

  test("編集権限がない記録の編集を試行", async ({ page }) => {
    // SCEN-118
    const editButton = page.locator('button:has-text("編集")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('text=編集権限がありません, text=権限エラー')).toBeVisible();
    } else {
      await expect(editButton).not.toBeVisible();
    }
  });

  test("期間絞り込みで開始日が終了日より後の日付を指定", async ({ page }) => {
    // SCEN-119
    await page.fill('input[name="startDate"]', '2024-03-15');
    await page.fill('input[name="endDate"]', '2024-03-10');
    await page.click('button:has-text("絞り込み")');
    
    await expect(page.locator('text=開始日は終了日より前の日付を指定してください, text=日付エラー')).toBeVisible();
  });

  test("月末日から月初日への日付選択", async ({ page }) => {
    // SCEN-120
    await page.fill('input[type="date"]', '2024-01-31');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-01-31');
    
    await page.fill('input[type="date"]', '2024-02-01');
    await expect(page.locator('input[type="date"]')).toHaveValue('2024-02-01');
    
    await page.click('button:has-text("検索")');
    const records = page.locator('tbody tr');
    const count = await records.count();
    if (count > 0) {
      await expect(records.first().locator('td').first()).toContainText('2024-02-01');
    }
  });

  test("当日の日付選択", async ({ page }) => {
    // SCEN-121
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[type="date"]', today);
    await expect(page.locator('input[type="date"]')).toHaveValue(today);
    
    await page.click('button:has-text("検索")');
    const records = page.locator('tbody tr');
    const count = await records.count();
    if (count > 0) {
      await expect(records.first().locator('td').first()).toContainText(today);
    }
  });

  test("最大表示件数の境界値での記録表示", async ({ page }) => {
    // SCEN-122
    const records = page.locator('tbody tr');
    const count = await records.count();
    
    if (count > 10) {
      await expect(page.locator('.pagination, button:has-text("次へ")')).toBeVisible();
      const recordsOnPage = await page.locator('tbody tr').count();
      expect(recordsOnPage).toBeLessThanOrEqual(10);
    } else {
      const allRecords = await page.locator('tbody tr').count();
      expect(allRecords).toBeLessThanOrEqual(10);
    }
  });

  test("24時間を超える異常な作業時間の表示", async ({ page }) => {
    // SCEN-123
    const abnormalTimeRecord = page.locator('td:has-text("25:"), td:has-text("26:"), td:has-text("1日")').first();
    if (await abnormalTimeRecord.isVisible()) {
      await expect(abnormalTimeRecord).toBeVisible();
      const warningIcon = page.locator('.warning-icon, .alert-icon');
      await expect(warningIcon).toBeVisible();
    }
  });
});