import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getTokenFromCookie } from '@/lib/auth';

function requireManager(request: NextRequest) {
  const token = getTokenFromCookie(request.headers.get('cookie'));
  if (!token || token.role !== 'manager') return null;
  return token;
}

export async function GET(request: NextRequest) {
  if (!requireManager(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const agents = db.prepare('SELECT id, name, code, role, created_at FROM agents ORDER BY role, name').all();
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  if (!requireManager(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, code, password, role } = await request.json();
  if (!name || !code || !password) return NextResponse.json({ error: 'Name, code and password required' }, { status: 400 });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO agents (name, code, password_hash, role) VALUES (?, ?, ?, ?)').run(name, code.toUpperCase(), hash, role || 'agent');
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Code already exists' }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  if (!requireManager(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name, code, password } = await request.json();
  if (!id || !name || !code) return NextResponse.json({ error: 'ID, name and code required' }, { status: 400 });
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      db.prepare('UPDATE agents SET name=?, code=?, password_hash=? WHERE id=?').run(name, code.toUpperCase(), hash, id);
    } else {
      db.prepare('UPDATE agents SET name=?, code=? WHERE id=?').run(name, code.toUpperCase(), id);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!requireManager(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const target = db.prepare('SELECT id, role FROM agents WHERE id = ?').get(id) as any;
    if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (target.role === 'manager') return NextResponse.json({ error: 'Cannot delete a manager account' }, { status: 403 });

    db.prepare('DELETE FROM submissions WHERE agent_id = ?').run(id);
    const result = db.prepare('DELETE FROM agents WHERE id = ?').run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Delete had no effect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Delete agent error:', e);
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
