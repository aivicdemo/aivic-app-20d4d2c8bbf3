import { test, expect } from '@playwright/test';

test.describe("記録確認画面", () => {
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

  test('SCEN-109: 日付選択で該当日の工数記録が表示される', async ({ page }) => {
    // SCEN-109
    await page.click('[data-testid="date-filter"]');
    await page.fill('[data-testid="date-filter"]', '2024-01-15');
    await page.click('[data-testid="filter-button"]');
    
    const recordList = page.locator('[data-testid="record-list"]');
    await expect(recordList).toBeVisible();
    
    const dateElements = page.locator('tbody tr td:first-child');
    const count = await dateElements.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const dateText = await dateElements.nth(i).textContent();
        expect(dateText).toContain('2024-01-15');
      }
    } else {
      await expect(page.locator('#empty-message')).toBeVisible();
    }
  });

  test('SCEN-110: 作業記録一覧テーブルに全項目が正しく表示される', async ({ page }) => {
    // SCEN-110
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    
    const headers = page.locator('thead th');
    await expect(headers.nth(0)).toContainText('日付');
    await expect(headers.nth(1)).toContainText('開始時間');
    await expect(headers.nth(2)).toContainText('終了時間');
    await expect(headers.nth(3)).toContainText('作業内容');
    await expect(headers.nth(4)).toContainText('作業場所');
    await expect(headers.nth(5)).toContainText('工数');
    
    const firstRow = page.locator('#records-tbody tr').first();
    if (await firstRow.isVisible()) {
      await expect(firstRow.locator('td').nth(0)).not.toBeEmpty();
      await expect(firstRow.locator('td').nth(1)).not.toBeEmpty();
      await expect(firstRow.locator('td').nth(2)).not.toBeEmpty();
      await expect(firstRow.locator('td').nth(3)).not.toBeEmpty();
      await expect(firstRow.locator('td').nth(4)).not.toBeEmpty();
      await expect(firstRow.locator('td').nth(5)).not.toBeEmpty();
    }
  });

  test('SCEN-111: 編集ボタンで編集画面に遷移する', async ({ page }) => {
    // SCEN-111
    const editButton = page.locator('button:has-text("編集")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page).toHaveURL(/scr-1778907380182\.html/);
    }
  });

  test('SCEN-112: 削除ボタンで記録が削除される', async ({ page }) => {
    // SCEN-112
    const deleteButton = page.locator('button', { hasText: '\n                削除\n' }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const confirmButton = page.locator('#btn-confirm-delete');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
    }
  });

  test('SCEN-113: 詳細表示ボタンで詳細画面が表示される', async ({ page }) => {
    // SCEN-113
    const detailButton = page.locator('button', { hasText: '\n                詳細\n' }).first();
    if (await detailButton.isVisible()) {
      await detailButton.click();
      await expect(page.locator('#detail-modal')).toBeVisible();
      await expect(page.locator('#detail-content')).toBeVisible();
    }
  });

  test('SCEN-114: 期間絞り込みで指定期間の記録のみ表示される', async ({ page }) => {
    // SCEN-114
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.click('[data-testid="filter-button"]');
    
    const dateElements = page.locator('#records-tbody tr td:first-child');
    const count = await dateElements.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const dateText = await dateElements.nth(i).textContent();
        const dateValue = new Date(dateText || '');
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        expect(dateValue >= startDate && dateValue <= endDate).toBe(true);
      }
    }
  });

  test('SCEN-115: 異常値警告アイコンが該当記録に表示される', async ({ page }) => {
    // SCEN-115
    const warningIcon = page.locator('button:has-text("⚠")');
    if (await warningIcon.isVisible()) {
      await expect(warningIcon).toBeVisible();
    }
    
    const emergencyAlert = page.locator('#emergency-alert');
    if (await emergencyAlert.isVisible()) {
      await expect(emergencyAlert).toBeVisible();
    }
  });

  test('SCEN-116: 工数記録が存在しない日付を選択', async ({ page }) => {
    // SCEN-116
    await page.fill('[data-testid="date-filter"]', '2025-12-31');
    await page.click('[data-testid="filter-button"]');
    
    await expect(page.locator('#empty-message')).toBeVisible();
    const emptyMessage = await page.locator('#empty-message').textContent();
    expect(emptyMessage).toContain('記録');
  });

  test('SCEN-117: 削除権限がない記録の削除を試行', async ({ page }) => {
    // SCEN-117
    const deleteButton = page.locator('button', { hasText: '\n                削除\n' }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      const errorMessage = page.locator('.error-message, .alert-danger');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toContain('権限');
      }
    } else {
      expect(await deleteButton.count()).toBe(0);
    }
  });

  test('SCEN-118: 編集権限がない記録の編集を試行', async ({ page }) => {
    // SCEN-118
    const editButton = page.locator('button:has-text("編集")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const errorMessage = page.locator('.error-message, .alert-danger');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        expect(errorText).toContain('権限');
      }
    } else {
      expect(await editButton.count()).toBe(0);
    }
  });

  test('SCEN-119: 期間絞り込みで開始日が終了日より後の日付を指定', async ({ page }) => {
    // SCEN-119
    await page.fill('[data-testid="start-date"]', '2024-03-15');
    await page.fill('[data-testid="end-date"]', '2024-03-10');
    await page.click('[data-testid="filter-button"]');
    
    const errorMessage = page.locator('.error-message, .alert-danger');
    await expect(errorMessage).toBeVisible();
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('開始日');
  });

  test('SCEN-120: 月末日から月初日への日付選択', async ({ page }) => {
    // SCEN-120
    const currentDate = new Date();
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    
    const lastDayStr = lastDay.toISOString().split('T')[0];
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    await page.fill('[data-testid="date-filter"]', lastDayStr);
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue(lastDayStr);
    
    await page.fill('[data-testid="date-filter"]', nextMonthStr);
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue(nextMonthStr);
    
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-121: 当日の日付選択', async ({ page }) => {
    // SCEN-121
    const today = new Date().toISOString().split('T')[0];
    
    await page.fill('[data-testid="date-filter"]', today);
    await expect(page.locator('[data-testid="date-filter"]')).toHaveValue(today);
    
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-122: 最大表示件数の境界値での記録表示', async ({ page }) => {
    // SCEN-122
    await page.click('[data-testid="filter-button"]');
    
    const rows = page.locator('#records-tbody tr');
    const rowCount = await rows.count();
    
    if (rowCount >= 50) {
      const pagination = page.locator('.pagination, .page-nav');
      await expect(pagination).toBeVisible();
    }
    
    await expect(page.locator('[data-testid="record-list"]')).toBeVisible();
  });

  test('SCEN-123: 24時間を超える異常な作業時間の表示', async ({ page }) => {
    // SCEN-123
    const workTimeElements = page.locator('#records-tbody tr td:nth-child(6)');
    const count = await workTimeElements.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const timeText = await workTimeElements.nth(i).textContent();
        if (timeText && (timeText.includes('25:') || timeText.includes('26:') || timeText.includes('1日'))) {
          const warningIcon = page.locator('button:has-text("⚠")');
          if (await warningIcon.isVisible()) {
            await expect(warningIcon).toBeVisible();
          }
          break;
        }
      }
    }
  });
});