import { test, expect } from './fixtures';

test.describe('Admin page', () => {
  test('displays admin panel and seed section', async ({ seededPage: page }) => {
    await page.goto('/settings');

    // Heading is now 'Admin' (was 'Settings')
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();

    // Seed section should be present
    await expect(page.getByText(/sample workforce data|seed/i).first()).toBeVisible();
  });

  test('navigates to home via back link', async ({ seededPage: page }) => {
    await page.goto('/settings');

    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL('/');
  });
});
