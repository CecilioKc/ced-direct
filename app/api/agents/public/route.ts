import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Public endpoint used by the anonymous participant survey form to list agent
// names for "who did you meet with" — intentionally unauthenticated.
export async function GET() {
  try {
    const agents = await query(`SELECT id, name, code FROM agents WHERE role = 'agent' ORDER BY name ASC`);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Public agents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
