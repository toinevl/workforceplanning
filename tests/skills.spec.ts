import { test, expect } from './fixtures';

test.describe('Department skills — data model', () => {
  test('POST /api/departments persists and returns a skills array', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Skills Test Dept',
        color: '#3b82f6',
        skills: [
          { name: 'Research', requiredHeadcount: 3 },
          { name: 'Leadership', requiredHeadcount: 1 },
        ],
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.data.skills).toEqual([
      { id: 'research', name: 'Research', requiredHeadcount: 3, sortOrder: 0 },
      { id: 'leadership', name: 'Leadership', requiredHeadcount: 1, sortOrder: 1 },
    ]);
  });

  test('PATCH /api/departments/[id] updates the skills array', async ({ seededPage: page }) => {
    const createRes = await page.request.post('/api/departments', {
      data: { name: 'Skills Patch Dept', color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 2 }] },
    });
    const { data: created } = await createRes.json();

    const patchRes = await page.request.patch(`/api/departments/${created.id}`, {
      data: {
        skills: [
          { name: 'Research', requiredHeadcount: 5 },
          { name: 'Teaching', requiredHeadcount: 2 },
        ],
      },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skills).toEqual([
      { id: 'research', name: 'Research', requiredHeadcount: 5, sortOrder: 0 },
      { id: 'teaching', name: 'Teaching', requiredHeadcount: 2, sortOrder: 1 },
    ]);
  });

  test('rejects a skill with a negative requiredHeadcount', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: { name: 'Bad Dept', color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: -1 }] },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects duplicate skill names within one department', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: {
        name: 'Dup Dept',
        color: '#3b82f6',
        skills: [
          { name: 'Research', requiredHeadcount: 1 },
          { name: 'research', requiredHeadcount: 2 },
        ],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/departments returns an empty skills array for a department created without any', async ({ seededPage: page }) => {
    const res = await page.request.post('/api/departments', {
      data: { name: 'No Skills Dept', color: '#3b82f6' },
    });
    const { data } = await res.json();
    expect(data.skills).toEqual([]);
  });
});

test.describe('Team skill overrides', () => {
  async function createDeptWithSkill(page: import('@playwright/test').Page) {
    const res = await page.request.post('/api/departments', {
      data: { name: `Override Dept ${Date.now()}`, color: '#3b82f6', skills: [{ name: 'Research', requiredHeadcount: 3 }] },
    });
    const { data } = await res.json();
    return data as { id: string; skills: Array<{ id: string; name: string }> };
  }

  test('PATCH /api/teams/[id] persists a valid skillOverrides map', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const researchId = dept.skills[0].id;
    const patchRes = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillOverrides: { [researchId]: 7 } },
    });
    expect(patchRes.status()).toBe(200);
    const { data: updated } = await patchRes.json();
    expect(updated.skillOverrides).toEqual({ [researchId]: 7 });
  });

  test('rejects a skillOverrides key that is not one of the department\'s skill ids', async ({ seededPage: page }) => {
    const dept = await createDeptWithSkill(page);
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const res = await page.request.patch(`/api/teams/${team.id}`, {
      data: { skillOverrides: { 'not-a-real-skill': 2 } },
    });
    expect(res.status()).toBe(400);
  });

  test('GET /api/teams returns an empty skillOverrides object for a team with none set', async ({ seededPage: page }) => {
    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    expect(teams[0].skillOverrides).toEqual({});
  });
});
