import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(
      request.headers.get('cookie')
    );

    if (!token || token.role !== 'manager') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const agents = db.prepare(
      `SELECT id, name, code, role, created_at FROM agents WHERE role = 'agent' ORDER BY name ASC`
    ).all();

    return NextResponse.json({ agents });

  } catch (error) {
    console.error('Agents error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}