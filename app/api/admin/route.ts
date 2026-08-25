import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query, queryOne, execute } from '@/lib/db';

async function requireManager() {
  const session = await auth();
  if (!session?.authorized || session.role !== 'manager') return null;
  return session;
}

export async function GET() {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const agents = await query('SELECT id, name, email, code, role, created_at FROM agents ORDER BY role, name');
  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, code, email, role } = await request.json();
  if (!name || !code || !email) {
    return NextResponse.json({ error: 'Name, code and email (Azure AD sign-in email) required' }, { status: 400 });
  }
  try {
    const result = await execute(
      `INSERT INTO agents (name, email, code, role)
       OUTPUT INSERTED.id
       VALUES (@name, @email, @code, @role)`,
      { name, email: String(email).toLowerCase(), code: String(code).toUpperCase(), role: role || 'agent' }
    );
    return NextResponse.json({ success: true, id: result.recordset[0]?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Code or email already exists' }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name, code, email } = await request.json();
  if (!id || !name || !code || !email) {
    return NextResponse.json({ error: 'ID, name, code and email required' }, { status: 400 });
  }
  try {
    await execute(
      'UPDATE agents SET name=@name, code=@code, email=@email WHERE id=@id',
      { id, name, code: String(code).toUpperCase(), email: String(email).toLowerCase() }
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const target = await queryOne<{ id: number; role: string }>('SELECT id, role FROM agents WHERE id = @id', { id });
    if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (target.role === 'manager') return NextResponse.json({ error: 'Cannot delete a manager account' }, { status: 403 });

    await execute('DELETE FROM submissions WHERE agent_id = @id', { id });
    const result = await execute('DELETE FROM agents WHERE id = @id', { id });

    if (!result.rowsAffected[0]) {
      return NextResponse.json({ error: 'Delete had no effect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Delete agent error:', e);
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
