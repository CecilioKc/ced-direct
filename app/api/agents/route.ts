import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query } from '@/lib/db';
import { canManage } from '@/lib/roles';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.authorized || !canManage(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await query(
      `SELECT id, name, code, role, created_at FROM agents WHERE role IN ('agent', 'both') ORDER BY name ASC`
    );

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Agents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
