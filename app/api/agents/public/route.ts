import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Public endpoint used by the anonymous participant survey form to list agent
// names for "who did you meet with" — intentionally unauthenticated.
export async function GET() {
  try {
    const agents = await query<{ id: number; name: string; code: string }>(
      `SELECT id, name, code FROM agents WHERE role IN ('agent', 'both') ORDER BY name ASC`
    );
    const countyRows = await query<{ agent_id: number; county: string }>(
      `SELECT ac.agent_id, ac.county
       FROM agent_counties ac
       JOIN agents a ON a.id = ac.agent_id
       WHERE a.role IN ('agent', 'both')
       ORDER BY ac.county ASC`
    );
    const countiesByAgent = new Map<number, string[]>();
    for (const row of countyRows) {
      const counties = countiesByAgent.get(row.agent_id) ?? [];
      counties.push(row.county);
      countiesByAgent.set(row.agent_id, counties);
    }

    return NextResponse.json({
      agents: agents
        .map(agent => ({ ...agent, counties: countiesByAgent.get(agent.id) ?? [] }))
        .filter(agent => agent.counties.length > 0),
    });
  } catch (error) {
    console.error('Public agents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
