import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCookie } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(request.headers.get('cookie'));
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const agent = db.prepare(
      'SELECT id, name, code, role FROM agents WHERE id = ?'
    ).get(token.agentId) as any;
    if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
