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

test.describe('Coverage computation', () => {
  test('GET /api/teams?departmentId=X uses department skills as axes, with team override applied', async ({ seededPage: page }) => {
    // Skill names deliberately avoid the legacy ROLE_PROFILES vocabulary (Research, Teaching,
    // Leadership, Strategy, Communication, Backend, DevOps, Fundraising) — seed.ts's
    // deriveSkillsForRole tags every non-SQUAD member with 3 of those names by default, which
    // would make `current` nondeterministic for this test if we reused them.
    const deptRes = await page.request.post('/api/departments', {
      data: {
        name: `Coverage Dept ${Date.now()}`,
        color: '#3b82f6',
        skills: [
          { name: 'Woodworking', requiredHeadcount: 3 },
          { name: 'Cartography', requiredHeadcount: 2 },
        ],
      },
    });
    const { data: dept } = await deptRes.json();
    const woodworkingId = dept.skills[0].id;
    const cartographyId = dept.skills[1].id;

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];

    await page.request.patch(`/api/teams/${team.id}`, {
      data: { departmentId: dept.id, skillOverrides: { [woodworkingId]: 9 } },
    });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    expect(scopedRes.status()).toBe(200);
    const { data: scopedTeams } = await scopedRes.json();
    const scopedTeam = scopedTeams.find((t: { id: string }) => t.id === team.id);

    expect(scopedTeam.skills).toEqual([
      { id: woodworkingId, name: 'Woodworking', current: 0, ambition: 9, gap: 9 },
      { id: cartographyId, name: 'Cartography', current: 0, ambition: 2, gap: 2 },
    ]);
  });

  test('a team in a department with no skills configured returns an empty skills array', async ({ seededPage: page }) => {
    const deptRes = await page.request.post('/api/departments', {
      data: { name: `Empty Skills Dept ${Date.now()}`, color: '#3b82f6' },
    });
    const { data: dept } = await deptRes.json();

    const teamsRes = await page.request.get('/api/teams');
    const { data: teams } = await teamsRes.json();
    const team = teams[0];
    await page.request.patch(`/api/teams/${team.id}`, { data: { departmentId: dept.id } });

    const scopedRes = await page.request.get(`/api/teams?departmentId=${dept.id}`);
    const { data: scopedTeams } = await scopedRes.json();
    expect(scopedTeams.find((t: { id: string }) => t.id === team.id).skills).toEqual([]);
  });
});

test.describe('Seed script — default department skills', () => {
  test('a full reseed gives Applied Physics & Science Education a Research skill with a gap-0 baseline', async ({ page }) => {
    const seedRes = await page.request.post('/api/seed', { data: { resetFirst: true } });
    expect(seedRes.ok()).toBeTruthy();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const apse = departments.find((d: { name: string }) => d.name === 'Applied Physics & Science Education');
    expect(apse).toBeDefined();

    const research = apse.skills.find((s: { name: string }) => s.name === 'Research');
    expect(research).toBeDefined();
    expect(research.requiredHeadcount).toBeGreaterThan(0);

    const teamsRes = await page.request.get(`/api/teams?departmentId=${apse.id}`);
    const { data: teams } = await teamsRes.json();
    const totalCurrentResearch = teams.reduce((sum: number, t: { skills: Array<{ name: string; current: number }> }) => {
      const point = t.skills.find((s) => s.name === 'Research');
      return sum + (point?.current ?? 0);
    }, 0);
    expect(totalCurrentResearch).toBe(research.requiredHeadcount);
  });

  test('Support Services has no default skills configured', async ({ page }) => {
    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const svc = departments.find((d: { name: string }) => d.name === 'Support Services');
    expect(svc).toBeDefined();
    expect(svc.skills).toEqual([]);
  });

  test('membersPerTeam option does not break gap-0 baseline', async ({ page }) => {
    const seedRes = await page.request.post('/api/seed', { data: { resetFirst: true, membersPerTeam: 2 } });
    expect(seedRes.ok()).toBeTruthy();

    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const apse = departments.find((d: { name: string }) => d.name === 'Applied Physics & Science Education');
    expect(apse).toBeDefined();

    const teamsRes = await page.request.get(`/api/teams?departmentId=${apse.id}`);
    const { data: teams } = await teamsRes.json();

    for (const skill of apse.skills) {
      const totalCurrent = teams.reduce((sum: number, t: { skills: Array<{ name: string; current: number }> }) => {
        const point = t.skills.find((s) => s.name === skill.name);
        return sum + (point?.current ?? 0);
      }, 0);
      expect(totalCurrent).toBe(skill.requiredHeadcount);
    }
  });
});

test.describe('Admin UI — department skills', () => {
  test('creating a department with skills via the form shows them as radar axes', async ({ seededPage: page }) => {
    await page.goto('/departments');

    await page.getByPlaceholder('e.g., Engineering').fill('UI Skills Dept');
    await page.getByRole('button', { name: /add skill/i }).click();
    await page.getByPlaceholder('Skill name').fill('Research');
    await page.getByPlaceholder('Required headcount').fill('2');

    await Promise.all([
      page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.request().url().includes('/api/departments')
      ),
      page.getByRole('button', { name: 'Create Department' }).click(),
    ]);

    await page.waitForLoadState('networkidle');

    // Verify the department was created via API
    const deptsRes = await page.request.get('/api/departments');
    const { data: departments } = await deptsRes.json();
    const dept = departments.find((d: { name: string }) => d.name === 'UI Skills Dept');
    expect(dept).toBeDefined();

    expect(dept.skills).toEqual([{ id: 'research', name: 'Research', requiredHeadcount: 2, sortOrder: 0 }]);

    // Verify the department is visible on the departments list page
    // Note: Department appears twice on /departments (top summary + DepartmentsSection list),
    // so we disambiguate with .first()
    await page.goto('/departments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('UI Skills Dept').first()).toBeVisible();

    // Verify the department displays with skills on its detail page
    await page.goto(`/departments/${dept.id}`);
    await expect(page.getByText('No skills configured for this department yet')).not.toBeVisible();
  });
});
