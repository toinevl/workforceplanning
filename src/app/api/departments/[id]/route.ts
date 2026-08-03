import { NextResponse } from 'next/server';
import { getDepartmentById, updateDepartment, deleteDepartment } from '@/lib/api/departments';
import { parseDepartmentSkillsInput } from '@/lib/skills/departmentSkills';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * GET /api/departments/[id]
 * Returns a single department
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }
  const department = await getDepartmentById(id);

  if (!department) {
    return NextResponse.json({ error: 'Department not found' }, { status: 404 });
  }

  return NextResponse.json({ data: department });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json();

  const { name, color, description, deptHead, skills } = body;
  if (
    name === undefined &&
    color === undefined &&
    description === undefined &&
    deptHead === undefined &&
    skills === undefined
  ) {
    return NextResponse.json({ error: 'At least one field must be provided for update' }, { status: 400 });
  }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return NextResponse.json({ error: 'Name must be a non-empty string if provided' }, { status: 400 });
  }

  if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR_RE.test(color))) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g. #a3b4c5)' }, { status: 400 });
  }

  const parsedSkills = skills !== undefined ? parseDepartmentSkillsInput(skills) : undefined;
  if (parsedSkills && 'error' in parsedSkills) {
    return NextResponse.json({ error: parsedSkills.error }, { status: 400 });
  }

  const updates: Partial<{
    name: string;
    color: string;
    description?: string;
    deptHead?: string;
    skills: import('@/lib/types/domain').DepartmentSkill[];
  }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color.trim();
  if (description !== undefined) updates.description = description;
  if (deptHead !== undefined) updates.deptHead = deptHead;
  if (parsedSkills) updates.skills = parsedSkills.skills;

  try {
    const updated = await updateDepartment(id, updates);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    throw error;
  }
}

/**
 * DELETE /api/departments/[id]
 * Deletes a department if it has no assigned teams
 * Returns 200 on success, 409 if teams are assigned
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const result = await deleteDepartment(id);

  if (result.deleted) {
    return NextResponse.json({ data: { success: true } }, { status: 200 });
  } else {
    return NextResponse.json(
      {
        error: 'Cannot delete department with assigned teams',
        assignedTeamCount: result.assignedTeamCount,
      },
      { status: 409 }
    );
  }
}
