import { NextResponse } from 'next/server';
import { getTeam, updateTeam } from '@/lib/api/teams';
import { getDepartmentById } from '@/lib/api/departments';
import { parseSkillOverridesInput } from '@/lib/skills/departmentSkills';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  return NextResponse.json({ data: team });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const team = await getTeam(id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const body = await req.json();

  const updates: Partial<{
    name: string;
    color: string;
    description?: string;
    departmentId?: string;
    skillOverrides: Record<string, number>;
  }> = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if ('color' in body) {
    if (typeof body.color !== 'string') {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }
    updates.color = body.color;
  }

  if ('description' in body) {
    updates.description = body.description ?? undefined;
  }

  if ('departmentId' in body) {
    updates.departmentId = body.departmentId || undefined;
    if (updates.departmentId !== team.departmentId && !('skillOverrides' in body)) {
      updates.skillOverrides = {};
    }
  }

  if ('skillOverrides' in body) {
    const departmentId = 'departmentId' in body ? updates.departmentId : team.departmentId;
    if (!departmentId) {
      return NextResponse.json({ error: 'Team has no department; cannot set skill overrides' }, { status: 400 });
    }
    const department = await getDepartmentById(departmentId);
    const validSkillIds = new Set((department?.skills ?? []).map((s) => s.id));
    const parsed = parseSkillOverridesInput(body.skillOverrides, validSkillIds);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    updates.skillOverrides = parsed.skillOverrides;
  }

  const updated = await updateTeam(id, updates);
  return NextResponse.json({ data: updated });
}
