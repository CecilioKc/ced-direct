import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const agents = db.prepare(
      `SELECT id, name, code FROM agents WHERE role = 'agent' ORDER BY name ASC`
    ).all();
    return NextResponse.json({ agents });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
