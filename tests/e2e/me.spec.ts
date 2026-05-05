import { test, expect } from '@playwright/test';

test('顧客スマホビューはパラメタなしでもエラーにならない', async ({ page }) => {
  await page.goto('/me');
  await expect(page.getByText('お客様用ページ')).toBeVisible();
});
