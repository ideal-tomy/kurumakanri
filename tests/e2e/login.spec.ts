import { test, expect } from '@playwright/test';

test('ログインページが表示される', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Shaken Notify')).toBeVisible();
  await expect(page.getByLabel('メールアドレス')).toBeVisible();
  await expect(page.getByLabel('パスワード')).toBeVisible();
});

test('保護ページに直接アクセスするとログインに飛ばされる', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
