import { NextResponse } from 'next/server';
import { getAllMembers } from '@/lib/api/members';

export async function GET() {
  const members = await getAllMembers();
  return NextResponse.json({ data: members });
}
