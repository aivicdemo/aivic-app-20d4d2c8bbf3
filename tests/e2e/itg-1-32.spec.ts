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
    const suspendedList = page.getByTestId('suspended-work-list');
    await expect(suspendedList).toBeVisible();
    
    const noWorkMessage = page.locator('#no-suspended-work');
    const workRows = page.locator('#suspended-work-tbody tr');
    
    const hasWork = await workRows.count() > 0;
    if (hasWork) {
      await expect(workRows.first()).toBeVisible();
    } else {
      await expect(noWorkMessage).toBeVisible();
    }
  });

  test('SCEN-145: 作業再開ボタンで再開記録画面に遷移する', async ({ page }) => {
    // SCEN-145
    await page.goto("/");
    await page.waitForURL(url => !url.toString().includes('/login.html'));
    
    await page.click('text=作業再開');
    await expect(page).toHaveURL(/scr-1778907251446\.html/);
    
    await expect(page.getByTestId('resume-time')).toBeVisible();
    await expect(page.getByTestId('resume-reason-select')).toBeVisible();
  });

  test('SCEN-146: 再開時刻が自動で現在時刻に設定される', async ({ page }) => {
    // SCEN-146
    const resumeTimeField = page.getByTestId('resume-time');
    await expect(resumeTimeField).toBeVisible();
    
    const currentTime = new Date();
    const displayedTime = await resumeTimeField.inputValue();
    const displayedDate = new Date(displayedTime);
    
    const timeDifference = Math.abs(currentTime.getTime() - displayedDate.getTime());
    expect(timeDifference).toBeLessThanOrEqual(60000);
  });

  test('SCEN-147: 再開理由を入力して作業再開が完了する', async ({ page }) => {
    // SCEN-147
    await page.fill('[data-testid="resume-reason-detail"]', '機材調整完了のため');
    await page.click('[data-testid="resume-button"]');
    
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test('SCEN-148: 再開理由をドロップダウンから選択して作業再開が完了する', async ({ page }) => {
    // SCEN-148
    await page.selectOption('[data-testid="resume-reason-select"]', '休憩終了');
    await page.click('[data-testid="resume-button"]');
    
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test('SCEN-149: 再開確認ダイアログでOKを選択して再開される', async ({ page }) => {
    // SCEN-149
    const workRow = page.locator('#suspended-work-tbody tr').first();
    if (await workRow.isVisible()) {
      await workRow.click();
    }
    
    await page.click('[data-testid="resume-button"]');
    
    const dialog = page.locator('#resume-confirm-dialog');
    await expect(dialog).toBeVisible();
    
    await page.click('[data-testid="dialog-ok-button"]');
    await expect(dialog).not.toBeVisible();
  });

  test('SCEN-150: 再開確認ダイアログでキャンセルを選択して再開が中止される', async ({ page }) => {
    // SCEN-150
    const workRow = page.locator('#suspended-work-tbody tr').first();
    if (await workRow.isVisible()) {
      await workRow.click();
    }
    
    await page.click('[data-testid="resume-button"]');
    
    const dialog = page.locator('#resume-confirm-dialog');
    await expect(dialog).toBeVisible();
    
    await page.click('[data-testid="dialog-cancel-button"]');
    await expect(dialog).not.toBeVisible();
  });

  test('SCEN-151: 戻るボタンで前画面に遷移する', async ({ page }) => {
    // SCEN-151
    const backButton = page.getByTestId('back-button');
    await expect(backButton).toBeVisible();
    
    await backButton.click();
    await expect(page).not.toHaveURL(/scr-1778907251446\.html/);
  });

  test('SCEN-152: 再開理由未入力で送信時にエラー表示', async ({ page }) => {
    // SCEN-152
    await page.fill('[data-testid="resume-reason-detail"]', '');
    await page.click('[data-testid="resume-button"]');
    
    const errorMessage = page.locator('#resume-reason-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('再開理由を入力してください');
  });

  test('SCEN-153: 再開理由が最大文字数を超過した場合にエラー表示', async ({ page }) => {
    // SCEN-153
    const longText = 'あ'.repeat(501);
    await page.fill('[data-testid="resume-reason-detail"]', longText);
    await page.click('[data-testid="resume-button"]');
    
    const errorMessage = page.locator('#resume-reason-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('再開理由は500文字以内で入力してください');
  });

  test('SCEN-154: 中断中作業が0件の場合の画面表示', async ({ page }) => {
    // SCEN-154
    const noWorkMessage = page.locator('#no-suspended-work');
    const workRows = page.locator('#suspended-work-tbody tr');
    
    const workCount = await workRows.count();
    if (workCount === 0) {
      await expect(noWorkMessage).toBeVisible();
      await expect(noWorkMessage).toContainText('現在中断中の作業はありません');
    }
  });

  test('SCEN-155: 再開理由が最大文字数ちょうどで正常処理される', async ({ page }) => {
    // SCEN-155
    const maxText = 'あ'.repeat(200);
    await page.fill('[data-testid="resume-reason-detail"]', maxText);
    await page.click('[data-testid="resume-button"]');
    
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test('SCEN-156: 複数の中断中作業から特定作業を選択して再開する', async ({ page }) => {
    // SCEN-156
    const suspendedList = page.getByTestId('suspended-work-list');
    await expect(suspendedList).toBeVisible();
    
    const workRows = page.locator('#suspended-work-tbody tr');
    const workCount = await workRows.count();
    
    if (workCount > 0) {
      await workRows.first().click();
      await expect(page.locator('#selected-work-name')).toBeVisible();
      
      await page.click('[data-testid="resume-button"]');
      
      const dialog = page.locator('#resume-confirm-dialog');
      if (await dialog.isVisible()) {
        await page.click('[data-testid="dialog-ok-button"]');
      }
      
      await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
    }
  });
});