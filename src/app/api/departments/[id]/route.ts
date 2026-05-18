import { NextResponse } from 'next/server';
import { updateDepartment, deleteDepartment } from '@/lib/api/departments';

/**
 * PATCH /api/departments/[id]
 * Updates a department with partial updates
 * Body: { name?: string, color?: string, description?: string, deptHead?: string }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  if (color !== undefined && (typeof color !== 'string' || color.trim() === '')) {
    return NextResponse.json({ error: 'Color must be a non-empty string if provided' }, { status: 400 });
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
