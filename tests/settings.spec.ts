import { test, expect } from './fixtures';

test.describe('Settings page', () => {
  test('displays settings and seed panel', async ({ seededPage: page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Seed section should be present
    await expect(page.getByText(/sample workforce data|seed/i).first()).toBeVisible();

    // Back to Home link
    await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
  });

  test('navigates to home via back link', async ({ seededPage: page }) => {
    await page.goto('/settings');

    await page.getByRole('link', { name: /back to home/i }).click();
    await expect(page).toHaveURL('/');
  });
});
