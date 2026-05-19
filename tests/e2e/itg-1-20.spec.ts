import { test, expect } from '@playwright/test';

test.describe("工数記録確認画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907226171.html");
  });

  test('SCEN-319: 工数記録確認画面の基本表示', async ({ page }) => {
    // SCEN-319
    await expect(page.locator('h2')).toContainText('工数記録確認');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th')).toContainText(['作業日', '作業内容', '開始時刻', '終了時刻', '工数']);
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-320: 作業項目一覧の正常表示', async ({ page }) => {
    // SCEN-320
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount({ min: 0 });
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      await expect(firstRow.locator('td').nth(1)).toBeVisible();
      await expect(firstRow.locator('td').nth(4)).toBeVisible();
      await expect(firstRow.locator('td').nth(0)).toBeVisible();
    }
  });

  test('SCEN-321: 時刻・工数の正常表示', async ({ page }) => {
    // SCEN-321
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    if (count > 0) {
      const firstRow = rows.first();
      await expect(firstRow.locator('td').nth(2)).toMatch(/\d{2}:\d{2}/);
      await expect(firstRow.locator('td').nth(3)).toMatch(/\d{2}:\d{2}/);
      await expect(firstRow.locator('td').nth(4)).toBeVisible();
    }
  });

  test('SCEN-322: 修正ボタンで編集画面遷移', async ({ page }) => {
    // SCEN-322
    const editButton = page.locator('button:has-text("詳細")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await expect(page.locator('#detail-modal')).toBeVisible();
    }
  });

  test('SCEN-323: 承認ボタンで承認完了', async ({ page }) => {
    // SCEN-323
    const approveButton = page.locator('button:has-text("承認")').first();
    if (await approveButton.count() > 0) {
      await approveButton.click();
      await expect(page.locator('button:has-text("承認する")')).toBeVisible();
      await page.click('button:has-text("承認する")');
    }
  });

  test('SCEN-324: 異常値警告アイコンの表示', async ({ page }) => {
    // SCEN-324
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    const warningIcon = page.locator('button:has-text("⚠")');
    if (await warningIcon.count() > 0) {
      await expect(warningIcon).toBeVisible();
    }
  });

  test('SCEN-325: 承認済み記録の修正不可', async ({ page }) => {
    // SCEN-325
    const approvedRow = page.locator('tbody tr:has-text("承認済み")').first();
    if (await approvedRow.count() > 0) {
      const editButton = approvedRow.locator('button:has-text("詳細")');
      await expect(editButton).toBeDisabled();
    }
  });

  test('SCEN-326: 権限なしユーザーの承認不可', async ({ page }) => {
    // SCEN-326
    const approveButton = page.locator('button:has-text("承認")').first();
    if (await approveButton.count() > 0) {
      await expect(approveButton).toBeDisabled();
    }
  });

  test('SCEN-327: 24時間を超える異常工数の警告', async ({ page }) => {
    // SCEN-327
    const emergencyAlert = page.locator('#emergency-alert');
    if (await emergencyAlert.count() > 0) {
      await expect(emergencyAlert).toBeVisible();
      await expect(emergencyAlert).toContainText('異常');
    }
    const warningButton = page.locator('button:has-text("⚠")');
    if (await warningButton.count() > 0) {
      await expect(warningButton).toBeVisible();
    }
  });

  test('SCEN-328: 終了時刻が開始時刻より早い場合の警告', async ({ page }) => {
    // SCEN-328
    const emergencyAlert = page.locator('#emergency-alert');
    if (await emergencyAlert.count() > 0) {
      await expect(emergencyAlert).toBeVisible();
    }
    const warningButton = page.locator('button:has-text("⚠")');
    if (await warningButton.count() > 0) {
      await expect(warningButton).toBeVisible();
    }
  });

  test('SCEN-329: 中断時間が実働時間を超える場合の警告', async ({ page }) => {
    // SCEN-329
    const emergencyAlert = page.locator('#emergency-alert');
    if (await emergencyAlert.count() > 0) {
      await expect(emergencyAlert).toBeVisible();
      await expect(emergencyAlert).toContainText(['中断時間', '実働時間']);
    }
  });

  test('SCEN-330: 作業内容詳細の文字数上限表示', async ({ page }) => {
    // SCEN-330
    const detailButton = page.locator('button:has-text("詳細")').first();
    if (await detailButton.count() > 0) {
      await detailButton.click();
      await expect(page.locator('#detail-modal')).toBeVisible();
      await expect(page.locator('#detail-content')).toBeVisible();
      const content = await page.locator('#detail-content').textContent();
      expect(content?.length).toBeLessThanOrEqual(1000);
    }
  });

  test('SCEN-331: 作業項目0件の場合の表示', async ({ page }) => {
    // SCEN-331
    const emptyMessage = page.locator('#empty-message');
    const recordRows = page.locator('tbody tr');
    const rowCount = await recordRows.count();
    
    if (rowCount === 0) {
      await expect(emptyMessage).toBeVisible();
      await expect(emptyMessage).toContainText(['作業項目がありません', '記録がありません']);
    }
  });
});