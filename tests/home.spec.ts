import { test, expect } from './fixtures';

test.describe('Home / Scenarios page', () => {
  test('displays scenario list, navigation, and primary action', async ({ seededPage: page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Workforce Planning/i);
    await expect(page.getByRole('heading', { name: /scenarios/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Departments' })).toBeVisible();

    // Primary action button must be present and usable
    const newBtn = page.getByRole('button', { name: /new scenario/i });
    await expect(newBtn).toBeVisible();
    await expect(newBtn).toBeEnabled();
  });
});
