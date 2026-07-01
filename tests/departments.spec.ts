import { test, expect } from './fixtures';

test.describe('Departments page', () => {
  test('loads and displays department list', async ({ seededPage: page }) => {
    await page.goto('/departments');

    await expect(page.getByRole('heading', { name: /departments/i })).toBeVisible();

    // Nav is present
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    // Either department cards or empty state is visible (data depends on seed)
    const contentArea = page.locator('.max-w-6xl');
    await expect(contentArea).toBeVisible();
  });

  test('navigates back to home via nav link', async ({ seededPage: page }) => {
    await page.goto('/departments');

    await page.getByRole('link', { name: 'Home' }).click();
    await expect(page).toHaveURL('/');
  });
});
