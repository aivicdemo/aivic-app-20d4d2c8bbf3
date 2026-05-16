import { test, expect } from '@playwright/test';

test.describe("作業再開記録画面", () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理
    await page.goto("/login.html");
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard.html");
  });

  test("中断中作業一覧が正常に表示される", async ({ page }) => {
    // SCEN-144
    await page.goto("/panels/scr-1778907251446.html");
    
    const workList = page.locator('[data-testid="suspended-work-list"]');
    await expect(workList).toBeVisible();
    
    const workItems = page.locator('[data-testid="work-item"]');
    const itemCount = await workItems.count();
    
    if (itemCount > 0) {
      await expect(workItems.first()).toContainText(/作業名|中断時刻|進捗/);
    } else {
      await expect(page.locator('text=中断中の作業はありません')).toBeVisible();
    }
  });

  test("作業再開ボタンで再開記録画面に遷移する", async ({ page }) => {
    // SCEN-145
    await page.goto("/panels/dashboard.html");
    await page.click('button:has-text("作業再開")');
    await page.waitForURL("**/scr-1778907251446.html");
    
    await expect(page.locator('[data-testid="work-selection"]')).toBeVisible();
    await expect(page.locator('[data-testid="resume-time"]')).toBeVisible();
  });

  test("再開時刻が自動で現在時刻に設定される", async ({ page }) => {
    // SCEN-146
    const now = new Date();
    await page.goto("/panels/scr-1778907251446.html");
    
    const resumeTimeInput = page.locator('[data-testid="resume-time"]');
    const displayedTime = await resumeTimeInput.inputValue();
    const displayedDate = new Date(displayedTime);
    
    const timeDiff = Math.abs(displayedDate.getTime() - now.getTime());
    expect(timeDiff).toBeLessThan(60000); // 1分以内
  });

  test("再開理由を入力して作業再開が完了する", async ({ page }) => {
    // SCEN-147
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.fill('[data-testid="resume-reason"]', '機材調整完了のため');
    await page.click('button:has-text("作業再開")');
    
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test("再開理由をドロップダウンから選択して作業再開が完了する", async ({ page }) => {
    // SCEN-148
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.click('[data-testid="resume-reason-dropdown"]');
    await page.click('option:has-text("休憩終了")');
    await page.click('button:has-text("作業再開")');
    
    await expect(page.locator('text=作業再開が記録されました')).toBeVisible();
  });

  test("再開確認ダイアログでOKを選択して再開される", async ({ page }) => {
    // SCEN-149
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.click('[data-testid="work-item"]:first-child');
    await page.click('button:has-text("再開")');
    
    const dialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(dialog).toBeVisible();
    await page.click('button:has-text("OK")');
    
    await expect(page.locator('text=作業中')).toBeVisible();
  });

  test("再開確認ダイアログでキャンセルを選択して再開が中止される", async ({ page }) => {
    // SCEN-150
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.click('[data-testid="work-item"]:first-child');
    await page.click('button:has-text("作業再開")');
    
    const dialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(dialog).toBeVisible();
    await page.click('button:has-text("キャンセル")');
    
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('text=中断中')).toBeVisible();
  });

  test("戻るボタンで前画面に遷移する", async ({ page }) => {
    // SCEN-151
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.click('button:has-text("戻る")');
    await page.waitForURL("**/dashboard.html");
    
    await expect(page).toHaveURL(/dashboard\.html/);
  });

  test("再開理由未入力で送信時にエラー表示", async ({ page }) => {
    // SCEN-152
    await page.goto("/panels/scr-1778907251446.html");
    
    await page.fill('[data-testid="work-id"]', 'WORK-001');
    await page.click('button:has-text("送信")');
    
    await expect(page.locator('text=再開理由を入力してください')).toBeVisible();
  });

  test("再開理由が最大文字数を超過した場合にエラー表示", async ({ page }) => {
    // SCEN-153
    await page.goto("/panels/scr-1778907251446.html");
    
    const longText = 'あ'.repeat(501);
    await page.fill('[data-testid="resume-reason"]', longText);
    await page.click('button:has-text("再開記録")');
    
    await expect(page.locator('text=再開理由は500文字以内で入力してください')).toBeVisible();
  });

  test("中断中作業が0件の場合の画面表示", async ({ page }) => {
    // SCEN-154
    await page.goto("/panels/scr-1778907251446.html");
    
    const workItems = page.locator('[data-testid="work-item"]');
    const itemCount = await workItems.count();
    
    if (itemCount === 0) {
      await expect(page.locator('text=現在中断中の作業はありません')).toBeVisible();
      await expect(page.locator('button:has-text("再開")')).not.toBeVisible();
    }
  });

  test("再開理由が最大文字数ちょうどで正常処理される", async ({ page }) => {
    // SCEN-155
    await page.goto("/panels/scr-1778907251446.html");
    
    const maxText = 'あ'.repeat(200);
    await page.fill('[data-testid="resume-reason"]', maxText);
    await page.click('button:has-text("記録")');
    
    await expect(page.locator('text=作業再開記録が保存されました')).toBeVisible();
  });

  test("複数の中断中作業から特定作業を選択して再開する", async ({ page }) => {
    // SCEN-156
    await page.goto("/panels/scr-1778907251446.html");
    
    const workItems = page.locator('[data-testid="work-item"]');
    await expect(workItems).toHaveCountGreaterThan(1);
    
    const targetWork = page.locator('[data-testid="work-item"]:has-text("WORK-001")');
    await targetWork.click();
    
    await expect(page.locator('[data-testid="work-details"]')).toBeVisible();
    await page.click('button:has-text("作業再開")');
    
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    if (await confirmDialog.isVisible()) {
      await page.click('button:has-text("OK")');
    }
    
    await expect(page.locator('text=実行中')).toBeVisible();
  });
});