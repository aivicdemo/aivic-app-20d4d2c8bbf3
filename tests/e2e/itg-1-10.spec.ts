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

  // SCEN-144
  test("中断中作業一覧が正常に表示される", async ({ page }) => {
    const suspendedList = page.locator('[data-testid="suspended-work-list"]');
    await expect(suspendedList).toBeVisible();
    
    const noWork = page.locator('#no-suspended-work');
    const hasWork = await noWork.isVisible();
    
    if (hasWork) {
      await expect(noWork).toContainText("中断中の作業はありません");
    } else {
      const tbody = page.locator('#suspended-work-tbody');
      await expect(tbody).toBeVisible();
    }
  });

  // SCEN-145
  test("作業再開ボタンで再開記録画面に遷移する", async ({ page }) => {
    await page.click('[data-aivic-nav="scr-1778907251446"]');
    await expect(page).toHaveURL(/\/panels\/scr-1778907251446\.html/);
    
    const resumeForm = page.locator('#resume-form');
    await expect(resumeForm).toBeVisible();
    
    const resumeTime = page.locator('[data-testid="resume-time"]');
    await expect(resumeTime).toBeVisible();
  });

  // SCEN-146
  test("再開時刻が自動で現在時刻に設定される", async ({ page }) => {
    const resumeTimeField = page.locator('#resume-time');
    await expect(resumeTimeField).toBeVisible();
    
    const displayedTime = await resumeTimeField.inputValue();
    const currentTime = new Date();
    const displayedDate = new Date(displayedTime);
    
    const timeDiff = Math.abs(currentTime.getTime() - displayedDate.getTime());
    expect(timeDiff).toBeLessThan(60000);
  });

  // SCEN-147
  test("再開理由を入力して作業再開が完了する", async ({ page }) => {
    await page.fill('[data-testid="resume-reason-detail"]', '機材調整完了のため');
    await page.click('[data-testid="resume-button"]');
    
    const dialog = page.locator('#resume-confirm-dialog');
    if (await dialog.isVisible()) {
      await page.click('[data-testid="dialog-ok-button"]');
    }
    
    await expect(page.locator('.status-indicator')).toContainText('作業中');
  });

  // SCEN-148
  test("再開理由をドロップダウンから選択して作業再開が完了する", async ({ page }) => {
    await page.click('[data-testid="resume-reason-select"]');
    await page.selectOption('#resume-reason-select', { label: '休憩終了' });
    await page.click('[data-testid="resume-button"]');
    
    const dialog = page.locator('#resume-confirm-dialog');
    if (await dialog.isVisible()) {
      await page.click('[data-testid="dialog-ok-button"]');
    }
    
    await expect(page.locator('.status-indicator')).toContainText('作業中');
  });

  // SCEN-149
  test("再開確認ダイアログでOKを選択して再開される", async ({ page }) => {
    const firstWork = page.locator('#suspended-work-tbody tr').first();
    if (await firstWork.isVisible()) {
      await firstWork.click();
    }
    
    await page.click('button:has-text("再開")');
    
    const dialog = page.locator('#resume-confirm-dialog');
    await expect(dialog).toBeVisible();
    await page.click('[data-testid="dialog-ok-button"]');
    
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.status-indicator')).toContainText('作業中');
  });

  // SCEN-150
  test("再開確認ダイアログでキャンセルを選択して再開が中止される", async ({ page }) => {
    const firstWork = page.locator('#suspended-work-tbody tr').first();
    if (await firstWork.isVisible()) {
      await firstWork.click();
    }
    
    await page.click('button:has-text("作業再開")');
    
    const dialog = page.locator('#resume-confirm-dialog');
    await expect(dialog).toBeVisible();
    await page.click('[data-testid="dialog-cancel-button"]');
    
    await expect(dialog).not.toBeVisible();
    await expect(firstWork).toBeVisible();
  });

  // SCEN-151
  test("戻るボタンで前画面に遷移する", async ({ page }) => {
    await page.click('[data-testid="back-button"]');
    await expect(page).not.toHaveURL(/\/panels\/scr-1778907251446\.html/);
  });

  // SCEN-152
  test("再開理由未入力で送信時にエラー表示", async ({ page }) => {
    const reasonField = page.locator('[data-testid="resume-reason-detail"]');
    await reasonField.clear();
    
    await page.click('[data-testid="resume-button"]');
    
    const errorMessage = page.locator('#resume-reason-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('再開理由を入力してください');
  });

  // SCEN-153
  test("再開理由が最大文字数を超過した場合にエラー表示", async ({ page }) => {
    const longText = 'あ'.repeat(501);
    await page.fill('[data-testid="resume-reason-detail"]', longText);
    await page.click('[data-testid="resume-button"]');
    
    const errorMessage = page.locator('#resume-reason-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('再開理由は500文字以内で入力してください');
  });

  // SCEN-154
  test("中断中作業が0件の場合の画面表示", async ({ page }) => {
    const noWorkMessage = page.locator('#no-suspended-work');
    if (await noWorkMessage.isVisible()) {
      await expect(noWorkMessage).toContainText('現在中断中の作業はありません');
      
      const resumeButton = page.locator('[data-testid="resume-button"]');
      await expect(resumeButton).toBeDisabled();
    }
  });

  // SCEN-155
  test("再開理由が最大文字数ちょうどで正常処理される", async ({ page }) => {
    const maxText = 'あ'.repeat(200);
    await page.fill('[data-testid="resume-reason-detail"]', maxText);
    
    const charCount = page.locator('#char-count');
    await expect(charCount).toContainText('200');
    
    await page.click('[data-testid="resume-button"]');
    
    const dialog = page.locator('#resume-confirm-dialog');
    if (await dialog.isVisible()) {
      await page.click('[data-testid="dialog-ok-button"]');
    }
    
    await expect(page.locator('.status-indicator')).toContainText('作業中');
  });

  // SCEN-156
  test("複数の中断中作業から特定作業を選択して再開する", async ({ page }) => {
    const workList = page.locator('#suspended-work-tbody tr');
    const workCount = await workList.count();
    
    if (workCount > 1) {
      const specificWork = workList.first();
      await specificWork.click();
      
      const selectedWorkName = page.locator('#selected-work-name');
      await expect(selectedWorkName).toBeVisible();
      
      await page.click('button:has-text("作業再開")');
      
      const dialog = page.locator('#resume-confirm-dialog');
      if (await dialog.isVisible()) {
        await page.click('[data-testid="dialog-ok-button"]');
      }
      
      await expect(page.locator('.status-indicator')).toContainText('実行中');
    }
  });
});