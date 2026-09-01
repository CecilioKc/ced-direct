import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query, queryOne, execute } from '@/lib/db';
import { canActAsAgent, canManage, isAppRole } from '@/lib/roles';
import { normalizeCountyList } from '@/lib/counties.mjs';

interface AgentRow {
  id: number;
  name: string;
  email: string;
  code: string;
  role: string;
  created_at: string;
}

interface AgentCountyRow {
  agent_id: number;
  county: string;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function requireManager() {
  const session = await auth();
  if (!session?.authorized || !canManage(session.role)) return null;
  return session;
}

export async function GET() {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const agents = await query<AgentRow>('SELECT id, name, email, code, role, created_at FROM agents ORDER BY role, name');
  const countyRows = await query<AgentCountyRow>('SELECT agent_id, county FROM agent_counties ORDER BY county');
  const countiesByAgent = new Map<number, string[]>();
  for (const row of countyRows) {
    const counties = countiesByAgent.get(row.agent_id) ?? [];
    counties.push(row.county);
    countiesByAgent.set(row.agent_id, counties);
  }

  return NextResponse.json({
    agents: agents.map(agent => ({ ...agent, counties: countiesByAgent.get(agent.id) ?? [] })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, code, email, role, counties } = await request.json();
  const appRole = role || 'agent';
  if (!name || !code || !email) {
    return NextResponse.json({ error: 'Name, code and email (Azure AD sign-in email) required' }, { status: 400 });
  }
  if (!isAppRole(appRole)) {
    return NextResponse.json({ error: 'Role must be agent, manager, or both' }, { status: 400 });
  }
  const assignedCounties = normalizeCountyList(counties ?? []);
  if (!assignedCounties) {
    return NextResponse.json({ error: 'Select counties from the official Texas county list' }, { status: 400 });
  }
  if (canActAsAgent(appRole) && assignedCounties.length === 0) {
    return NextResponse.json({ error: 'Assign at least one county to an Agent account' }, { status: 400 });
  }

  const effectiveCounties = canActAsAgent(appRole) ? assignedCounties : [];
  const countyParams = Object.fromEntries(effectiveCounties.map((county, index) => [`county${index}`, county]));
  const countyInsert = effectiveCounties.length
    ? `INSERT INTO agent_counties (agent_id, county) VALUES ${effectiveCounties.map((_, index) => `(@newAgentId, @county${index})`).join(', ')};`
    : '';

  try {
    const result = await execute(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
       BEGIN TRY
         DECLARE @InsertedAgent TABLE (id INT);
         INSERT INTO agents (name, email, code, role)
         OUTPUT INSERTED.id INTO @InsertedAgent(id)
         VALUES (@name, @email, @code, @role);

         DECLARE @newAgentId INT = (SELECT id FROM @InsertedAgent);
         ${countyInsert}

         COMMIT TRANSACTION;
         SELECT @newAgentId AS id;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        code: String(code).trim().toUpperCase(),
        role: appRole,
        ...countyParams,
      }
    );
    return NextResponse.json({ success: true, id: result.recordset[0]?.id });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, 'Code or email already exists') }, { status: 409 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, name, code, email, role, counties } = await request.json();
  if (!id || !name || !code || !email) {
    return NextResponse.json({ error: 'ID, name, code and email required' }, { status: 400 });
  }
  if (!isAppRole(role)) {
    return NextResponse.json({ error: 'Role must be agent, manager, or both' }, { status: 400 });
  }
  const assignedCounties = normalizeCountyList(counties ?? []);
  if (!assignedCounties) {
    return NextResponse.json({ error: 'Select counties from the official Texas county list' }, { status: 400 });
  }
  if (canActAsAgent(role) && assignedCounties.length === 0) {
    return NextResponse.json({ error: 'Assign at least one county to an Agent account' }, { status: 400 });
  }

  const effectiveCounties = canActAsAgent(role) ? assignedCounties : [];
  const countyParams = Object.fromEntries(effectiveCounties.map((county, index) => [`county${index}`, county]));
  const countyInsert = effectiveCounties.length
    ? `INSERT INTO agent_counties (agent_id, county) VALUES ${effectiveCounties.map((_, index) => `(@id, @county${index})`).join(', ')};`
    : '';

  try {
    await execute(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
       BEGIN TRY
         UPDATE agents SET name=@name, code=@code, email=@email, role=@role WHERE id=@id;
         DELETE FROM agent_counties WHERE agent_id=@id;
         ${countyInsert}
         COMMIT TRANSACTION;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      {
        id,
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        email: String(email).trim().toLowerCase(),
        role,
        ...countyParams,
      }
    );
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, 'Update failed') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireManager())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const target = await queryOne<{ id: number; role: string }>('SELECT id, role FROM agents WHERE id = @id', { id });
    if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (isAppRole(target.role) && canManage(target.role)) {
      return NextResponse.json({ error: 'Cannot delete an account with manager access' }, { status: 403 });
    }

    await execute('DELETE FROM agent_contact_emails WHERE agent_id = @id', { id });
    await execute('DELETE FROM submissions WHERE agent_id = @id', { id });
    await execute('DELETE FROM agent_counties WHERE agent_id = @id', { id });
    const result = await execute('DELETE FROM agents WHERE id = @id', { id });

    if (!result.rowsAffected[0]) {
      return NextResponse.json({ error: 'Delete had no effect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete agent error:', error);
    return NextResponse.json({ error: errorMessage(error, 'Delete failed') }, { status: 500 });
  }
}
