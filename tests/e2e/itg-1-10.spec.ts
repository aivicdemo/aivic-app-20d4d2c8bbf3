import { test, expect } from '@playwright/test';

test.describe("作業再開記録画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL("**/panels/**");
  });

  test('SCEN-144: 中断中作業一覧が正常に表示される', async ({ page }) => {
    // SCEN-144
    await page.goto("/panels/scr-1778907251446.html");
    await expect(page.locator('.suspended-work-list')).toBeVisible();
  });

  test('SCEN-145: 作業再開ボタンで再開記録画面に遷移する', async ({ page }) => {
    // SCEN-145
    await page.goto("/panels/main-dashboard.html");
    await page.click('button:has-text("作業再開")');
    await expect(page).toHaveURL("**/panels/scr-1778907251446.html");
  });

  test('SCEN-146: 再開時刻が自動で現在時刻に設定される', async ({ page }) => {
    // SCEN-146
    await page.goto("/panels/scr-1778907251446.html");
    const currentTime = new Date();
    const resumeTimeInput = page.locator('input[name="resumeTime"]');
    const displayedTime = await resumeTimeInput.inputValue();
    const displayedDate = new Date(displayedTime);
    const timeDiff = Math.abs(currentTime.getTime() - displayedDate.getTime());
    expect(timeDiff).toBeLessThan(60000);
  });

  test('SCEN-147: 再開理由を入力して作業再開が完了する', async ({ page }) => {
    // SCEN-147
    await page.goto("/panels/scr-1778907251446.html");
    await page.fill('textarea[name="resumeReason"]', '機材調整完了のため');
    await page.click('button:has-text("作業再開")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-148: 再開理由をドロップダウンから選択して作業再開が完了する', async ({ page }) => {
    // SCEN-148
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('select[name="resumeReasonSelect"]');
    await page.selectOption('select[name="resumeReasonSelect"]', '休憩終了');
    await page.click('button:has-text("作業再開")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-149: 再開確認ダイアログでOKを選択して再開される', async ({ page }) => {
    // SCEN-149
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('.work-item:first-child');
    await page.click('button:has-text("再開")');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('.work-status:has-text("作業中")')).toBeVisible();
  });

  test('SCEN-150: 再開確認ダイアログでキャンセルを選択して再開が中止される', async ({ page }) => {
    // SCEN-150
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('.work-item:first-child');
    await page.click('button:has-text("作業再開")');
    page.on('dialog', dialog => dialog.dismiss());
    await expect(page.locator('.work-status:has-text("中断")')).toBeVisible();
  });

  test('SCEN-151: 戻るボタンで前画面に遷移する', async ({ page }) => {
    // SCEN-151
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('button:has-text("戻る")');
    await expect(page).toHaveURL("**/panels/**");
  });

  test('SCEN-152: 再開理由未入力で送信時にエラー表示', async ({ page }) => {
    // SCEN-152
    await page.goto("/panels/scr-1778907251446.html");
    await page.fill('input[name="workId"]', 'WORK-001');
    await page.click('button:has-text("送信")');
    await expect(page.locator('.error-message')).toContainText('再開理由');
  });

  test('SCEN-153: 再開理由が最大文字数を超過した場合にエラー表示', async ({ page }) => {
    // SCEN-153
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('.work-item:first-child');
    const longText = 'a'.repeat(501);
    await page.fill('textarea[name="resumeReason"]', longText);
    await page.click('button:has-text("再開記録")');
    await expect(page.locator('.error-message')).toContainText('500文字以内');
  });

  test('SCEN-154: 中断中作業が0件の場合の画面表示', async ({ page }) => {
    // SCEN-154
    await page.goto("/panels/scr-1778907251446.html");
    await expect(page.locator('.no-work-message')).toContainText('中断中の作業はありません');
    await expect(page.locator('button:has-text("再開")')).toBeDisabled();
  });

  test('SCEN-155: 再開理由が最大文字数ちょうどで正常処理される', async ({ page }) => {
    // SCEN-155
    await page.goto("/panels/scr-1778907251446.html");
    await page.click('.work-item:first-child');
    const maxLengthText = 'a'.repeat(200);
    await page.fill('textarea[name="resumeReason"]', maxLengthText);
    await page.click('button:has-text("記録")');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('SCEN-156: 複数の中断中作業から特定作業を選択して再開する', async ({ page }) => {
    // SCEN-156
    await page.goto("/panels/scr-1778907251446.html");
    await expect(page.locator('.work-item')).toHaveCount(2, { timeout: 5000 });
    await page.click('.work-item:has-text("WORK-001")');
    await page.click('button:has-text("作業再開")');
    page.on('dialog', dialog => dialog.accept());
    await expect(page.locator('.current-work:has-text("WORK-001")')).toBeVisible();
  });
});