import { test, expect } from './fixtures';

test.describe('API smoke tests', () => {
  test('GET /api/scenarios returns data array', async ({ seededPage: page }) => {
    const res = await page.request.get('/api/scenarios');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /api/teams returns data array', async ({ seededPage: page }) => {
    const res = await page.request.get('/api/teams');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /api/members returns data array', async ({ seededPage: page }) => {
    const res = await page.request.get('/api/members');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('GET /api/departments returns data array', async ({ seededPage: page }) => {
    const res = await page.request.get('/api/departments');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBeTruthy();
  });
});
