import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const countyRows = session.agentId
      ? await query<{ county: string }>(
          'SELECT county FROM agent_counties WHERE agent_id = @agentId ORDER BY county',
          { agentId: session.agentId }
        )
      : [];
    return NextResponse.json({
      id: session.agentId,
      name: session.user?.name,
      code: session.code,
      role: session.role,
      email: session.user?.email,
      counties: countyRows.map(row => row.county),
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
