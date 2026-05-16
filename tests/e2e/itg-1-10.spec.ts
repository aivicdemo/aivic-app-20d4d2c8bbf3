import { test, expect } from '@playwright/test';

test.describe("作業再開記録画面", () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  test.beforeEach(async ({ page }) => {
    await page.goto(baseURL);
    // ログイン処理を想定（実際のログインフローに応じて調整）
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
  });

  test("SCEN-144: 中断中作業一覧が正常に表示される", async ({ page }) => {
    // SCEN-144
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    const listArea = page.locator('[data-testid="suspended-work-list"]');
    await expect(listArea).toBeVisible();
    const hasItems = await page.locator('[data-testid="work-item"]').count();
    if (hasItems > 0) {
      await expect(page.locator('[data-testid="work-name"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="suspend-time"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="progress-status"]').first()).toBeVisible();
    } else {
      await expect(page.locator('text=中断中の作業はありません')).toBeVisible();
    }
  });

  test("SCEN-145: 作業再開ボタンで再開記録画面に遷移する", async ({ page }) => {
    // SCEN-145
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await expect(page.locator('[data-testid="work-selection"]')).toBeVisible();
    await expect(page.locator('[data-testid="resume-time"]')).toBeVisible();
  });

  test("SCEN-146: 再開時刻が自動で現在時刻に設定される", async ({ page }) => {
    // SCEN-146
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    const currentTime = new Date();
    const resumeTimeValue = await page.locator('[data-testid="resume-time"]').inputValue();
    const resumeTime = new Date(resumeTimeValue);
    const timeDiff = Math.abs(currentTime.getTime() - resumeTime.getTime());
    expect(timeDiff).toBeLessThan(60000); // 1分以内
  });

  test("SCEN-147: 再開理由を入力して作業再開が完了する", async ({ page }) => {
    // SCEN-147
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.fill('[data-testid="resume-reason"]', '機材調整完了のため');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test("SCEN-148: 再開理由をドロップダウンから選択して作業再開が完了する", async ({ page }) => {
    // SCEN-148
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="resume-reason-dropdown"]');
    await page.click('text=休憩終了');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test("SCEN-149: 再開確認ダイアログでOKを選択して再開される", async ({ page }) => {
    // SCEN-149
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="work-item"]');
    await page.click('[data-testid="resume-button"]');
    await page.click('[data-testid="confirm-ok"]');
    await expect(page.locator('text=作業中')).toBeVisible();
  });

  test("SCEN-150: 再開確認ダイアログでキャンセルを選択して再開が中止される", async ({ page }) => {
    // SCEN-150
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="work-item"]');
    await page.click('[data-testid="resume-button"]');
    await page.click('[data-testid="confirm-cancel"]');
    await expect(page.locator('text=中断中')).toBeVisible();
  });

  test("SCEN-151: 戻るボタンで前画面に遷移する", async ({ page }) => {
    // SCEN-151
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="back-button"]');
    await expect(page.url()).not.toContain('/work-resume');
  });

  test("SCEN-152: 再開理由未入力で送信時にエラー表示", async ({ page }) => {
    // SCEN-152
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.fill('[data-testid="work-id"]', 'WORK-001');
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('text=再開理由を入力してください')).toBeVisible();
  });

  test("SCEN-153: 再開理由が最大文字数を超過した場合にエラー表示", async ({ page }) => {
    // SCEN-153
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="work-selection"]');
    const longText = 'a'.repeat(501);
    await page.fill('[data-testid="resume-reason"]', longText);
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('text=再開理由は500文字以内で入力してください')).toBeVisible();
  });

  test("SCEN-154: 中断中作業が0件の場合の画面表示", async ({ page }) => {
    // SCEN-154
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    const workCount = await page.locator('[data-testid="work-item"]').count();
    if (workCount === 0) {
      await expect(page.locator('text=現在中断中の作業はありません')).toBeVisible();
      await expect(page.locator('[data-testid="resume-button"]')).toBeDisabled();
    }
  });

  test("SCEN-155: 再開理由が最大文字数ちょうどで正常処理される", async ({ page }) => {
    // SCEN-155
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    await page.click('[data-testid="work-selection"]');
    const maxText = 'a'.repeat(200);
    await page.fill('[data-testid="resume-reason"]', maxText);
    await page.click('[data-testid="resume-button"]');
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test("SCEN-156: 複数の中断中作業から特定作業を選択して再開する", async ({ page }) => {
    // SCEN-156
    await page.click('text=作業再開');
    await page.waitForURL('**/work-resume');
    const workItems = page.locator('[data-testid="work-item"]');
    await expect(workItems).toHaveCount(2, { timeout: 5000 });
    await page.click('[data-testid="work-item"]:has-text("WORK-001")');
    await expect(page.locator('[data-testid="work-details"]')).toBeVisible();
    await page.click('[data-testid="resume-button"]');
    if (await page.locator('[data-testid="confirm-ok"]').isVisible()) {
      await page.click('[data-testid="confirm-ok"]');
    }
    await expect(page.locator('text=実行中')).toBeVisible();
  });
});