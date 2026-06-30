import { NextResponse } from 'next/server';
import { getDepartmentById, updateDepartment, deleteDepartment } from '@/lib/api/departments';

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

  // Validate that at least one updateable field is present
  const { name, color, description, deptHead } = body;
  if (name === undefined && color === undefined && description === undefined && deptHead === undefined) {
    return NextResponse.json({ error: 'At least one field must be provided for update' }, { status: 400 });
  }

  // Validate non-empty strings for name and color if provided
  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    return NextResponse.json({ error: 'Name must be a non-empty string if provided' }, { status: 400 });
  }

  if (color !== undefined && (typeof color !== 'string' || !HEX_COLOR_RE.test(color))) {
    return NextResponse.json({ error: 'Color must be a valid hex color (e.g. #a3b4c5)' }, { status: 400 });
  }

  // Build updates object with only provided fields
  const updates: Partial<{ name: string; color: string; description?: string; deptHead?: string }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color.trim();
  if (description !== undefined) updates.description = description;
  if (deptHead !== undefined) updates.deptHead = deptHead;

  // Update department
  try {
    const updated = await updateDepartment(id, updates);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    // If error is "not found", return 404
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
