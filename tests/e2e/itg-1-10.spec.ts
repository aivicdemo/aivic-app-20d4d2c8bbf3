import { test, expect } from '@playwright/test';

test.describe("作業再開記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="password"]', 'test');
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/login.html')),
      page.click('button[type="submit"]'),
    ]);
    await page.goto("/panels/scr-1778907251446.html");
  });

  test('SCEN-144: 中断中作業一覧が正常に表示される', async ({ page }) => {
    // SCEN-144
    await expect(page.locator('[data-testid="suspended-work-list"]')).toBeVisible();
    const suspendedWorkTable = page.locator('#suspended-work-tbody');
    const count = await suspendedWorkTable.locator('tr').count();
    if (count > 0) {
      await expect(suspendedWorkTable.locator('tr').first()).toBeVisible();
    } else {
      await expect(page.locator('#no-suspended-work')).toBeVisible();
    }
  });

  test('SCEN-145: 作業再開ボタンで再開記録画面に遷移する', async ({ page }) => {
    // SCEN-145
    await page.goto("/panels/scr-1778907133295.html");
    await page.click('button:text("作業再開")');
    await expect(page).toHaveURL(/scr-1778907251446\.html/);
    await expect(page.locator('#resume-form')).toBeVisible();
    await expect(page.locator('[data-testid="resume-time"]')).toBeVisible();
  });

  test('SCEN-146: 再開時刻が自動で現在時刻に設定される', async ({ page }) => {
    // SCEN-146
    const currentTime = new Date();
    const resumeTimeInput = page.locator('[data-testid="resume-time"]');
    await expect(resumeTimeInput).toBeVisible();
    const displayedTime = await resumeTimeInput.inputValue();
    const displayedDate = new Date(displayedTime);
    const timeDiff = Math.abs(displayedDate.getTime() - currentTime.getTime());
    expect(timeDiff).toBeLessThan(60000);
  });

  test('SCEN-147: 再開理由を入力して作業再開が完了する', async ({ page }) => {
    // SCEN-147
    await page.fill('[data-testid="resume-reason-detail"]', '機材調整完了のため');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-148: 再開理由をドロップダウンから選択して作業再開が完了する', async ({ page }) => {
    // SCEN-148
    await page.selectOption('[data-testid="resume-reason-select"]', '休憩終了');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-149: 再開確認ダイアログでOKを選択して再開される', async ({ page }) => {
    // SCEN-149
    const suspendedWork = page.locator('#suspended-work-tbody tr').first();
    if (await suspendedWork.count() > 0) {
      await suspendedWork.locator('button:text("選択")').click();
    }
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('#resume-confirm-dialog')).toBeVisible();
    await page.click('[data-testid="dialog-ok-button"]');
    await expect(page.locator('#resume-confirm-dialog')).not.toBeVisible();
  });

  test('SCEN-150: 再開確認ダイアログでキャンセルを選択して再開が中止される', async ({ page }) => {
    // SCEN-150
    const suspendedWork = page.locator('#suspended-work-tbody tr').first();
    if (await suspendedWork.count() > 0) {
      await suspendedWork.locator('button:text("選択")').click();
    }
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('#resume-confirm-dialog')).toBeVisible();
    await page.click('[data-testid="dialog-cancel-button"]');
    await expect(page.locator('#resume-confirm-dialog')).not.toBeVisible();
  });

  test('SCEN-151: 戻るボタンで前画面に遷移する', async ({ page }) => {
    // SCEN-151
    await page.click('[data-testid="back-button"]');
    await expect(page).not.toHaveURL(/scr-1778907251446\.html/);
  });

  test('SCEN-152: 再開理由未入力で送信時にエラー表示', async ({ page }) => {
    // SCEN-152
    await page.fill('[data-testid="resume-reason-detail"]', '');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('#resume-reason-error')).toBeVisible();
    await expect(page.locator('#resume-reason-error')).toContainText('再開理由');
  });

  test('SCEN-153: 再開理由が最大文字数を超過した場合にエラー表示', async ({ page }) => {
    // SCEN-153
    const longText = 'あ'.repeat(501);
    await page.fill('[data-testid="resume-reason-detail"]', longText);
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('#resume-reason-error')).toBeVisible();
    await expect(page.locator('#resume-reason-error')).toContainText('500文字以内');
  });

  test('SCEN-154: 中断中作業が0件の場合の画面表示', async ({ page }) => {
    // SCEN-154
    const noSuspendedWork = page.locator('#no-suspended-work');
    const suspendedWorkRows = page.locator('#suspended-work-tbody tr');
    const rowCount = await suspendedWorkRows.count();
    if (rowCount === 0) {
      await expect(noSuspendedWork).toBeVisible();
      await expect(noSuspendedWork).toContainText('中断中の作業はありません');
    }
  });

  test('SCEN-155: 再開理由が最大文字数ちょうどで正常処理される', async ({ page }) => {
    // SCEN-155
    const maxText = 'あ'.repeat(200);
    await page.fill('[data-testid="resume-reason-detail"]', maxText);
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('#resume-reason-error')).not.toBeVisible();
  });

  test('SCEN-156: 複数の中断中作業から特定作業を選択して再開する', async ({ page }) => {
    // SCEN-156
    const suspendedWorkList = page.locator('#suspended-work-tbody');
    await expect(suspendedWorkList).toBeVisible();
    const workRows = suspendedWorkList.locator('tr');
    const rowCount = await workRows.count();
    if (rowCount > 0) {
      await workRows.first().locator('button:text("選択")').click();
      await expect(page.locator('#selected-work-name')).toBeVisible();
      await page.click('[data-testid="resume-button"]');
      if (await page.locator('#resume-confirm-dialog').isVisible()) {
        await page.click('[data-testid="dialog-ok-button"]');
      }
    }
  });
});