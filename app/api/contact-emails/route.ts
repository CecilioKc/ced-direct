import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query } from '@/lib/db';
import { canActAsAgent } from '@/lib/roles';

interface ContactEmailRow {
  id: number;
  email: string;
  created_at: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.authorized || !session.agentId || !canActAsAgent(session.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const emails = await query<ContactEmailRow>(
      `SELECT TOP (100) id, email, created_at
       FROM agent_contact_emails
       WHERE agent_id = @agentId
       ORDER BY created_at DESC`,
      { agentId: session.agentId }
    );

    return NextResponse.json(
      { emails },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Contact emails error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
