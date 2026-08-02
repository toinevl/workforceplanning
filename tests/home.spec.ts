import { test, expect } from './fixtures';

test.describe('Home / Org Dashboard', () => {
  test('displays organization overview, navigation, and department cards', async ({ seededPage: page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Workforce Planning/i);
    await expect(page.getByRole('heading', { name: /organization/i })).toBeVisible();

    // Nav links
    await expect(page.getByRole('link', { name: 'Org' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scenarios' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Departments' })).toBeVisible();
  });
});
