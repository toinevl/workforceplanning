import { test, expect } from './fixtures';

test.describe('Departments page', () => {
  test('loads and displays department list', async ({ seededPage: page }) => {
    await page.goto('/departments');

    // h1 heading (avoid ambiguity with DepartmentsSection h3)
    await expect(page.getByRole('heading', { name: /departments/i, level: 1 })).toBeVisible();

    // Nav is present
    await expect(page.getByRole('link', { name: 'Org' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scenarios' })).toBeVisible();
  });

  test('navigates back to org dashboard via nav link', async ({ seededPage: page }) => {
    await page.goto('/departments');

    await page.getByRole('link', { name: 'Org' }).click();
    await expect(page).toHaveURL('/');
  });
});
