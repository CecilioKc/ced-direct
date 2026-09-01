import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { query, queryOne } from '@/lib/db';
import { canManage } from '@/lib/roles';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: 2026-06
    const agentIdParam = searchParams.get('agentId');
    const county = searchParams.get('county');
    const selfScope = searchParams.get('scope') === 'self';
    const managerAccess = canManage(session.role);

    const targetAgentId =
      managerAccess && !selfScope && agentIdParam ? parseInt(agentIdParam, 10) : session.agentId;

    const isManagerAllAgents = managerAccess && !selfScope && !agentIdParam;

    // build dynamic filter clause + named params together so ordering never drifts
    const conditions: string[] = [];
    const baseParams: Record<string, unknown> = {};

    if (!isManagerAllAgents) {
      conditions.push('agent_id = @agentId');
      baseParams.agentId = targetAgentId;
    }

    if (month) {
      conditions.push(`FORMAT(submission_date, 'yyyy-MM') = @month`);
      baseParams.month = month;
    } else {
      conditions.push(`submission_date >= DATEADD(month, -5, SYSUTCDATETIME())`);
    }

    if (county) {
      conditions.push('city_county = @county');
      baseParams.county = county;
    }

    const baseWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (
      await queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM submissions ${baseWhere}`, baseParams)
    )?.count ?? 0;

    const raceRows = await query(`SELECT race, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY race`, baseParams);
    const ageRows = await query(`SELECT age_group, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY age_group`, baseParams);
    const sexRows = await query(`SELECT sex, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY sex`, baseParams);

    // county breakdown — uses the same filters except county itself, so the chart
    // still shows the full distribution even when not filtered
    const countyParams = { ...baseParams };
    delete countyParams.county;
    const countyConditions = conditions.filter((c) => c !== 'city_county = @county');
    const countyWhere = countyConditions.length ? `WHERE ${countyConditions.join(' AND ')}` : '';
    const countyRows = await query(
      `SELECT city_county as county, COUNT(*) as count FROM submissions ${countyWhere} GROUP BY city_county ORDER BY count DESC`,
      countyParams
    );

    // monthly trend (last 5 months)
    const trendConditions: string[] = [];
    const trendParams: Record<string, unknown> = {};
    if (!isManagerAllAgents) {
      trendConditions.push('agent_id = @agentId');
      trendParams.agentId = targetAgentId;
    }
    trendConditions.push('submission_date >= DATEADD(month, -5, SYSUTCDATETIME())');
    if (county) {
      trendConditions.push('city_county = @county');
      trendParams.county = county;
    }
    const trendRows = await query(
      `SELECT FORMAT(submission_date, 'yyyy-MM') as month, COUNT(*) as count
       FROM submissions
       WHERE ${trendConditions.join(' AND ')}
       GROUP BY FORMAT(submission_date, 'yyyy-MM') ORDER BY month ASC`,
      trendParams
    );

    const contactRows = await query(
      `SELECT contact_method, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY contact_method`,
      baseParams
    );

    // if manager viewing all agents, also get per-agent summary
    let agentSummary = null;
    if (isManagerAllAgents) {
      const summaryParams: Record<string, unknown> = {};
      const joinConditions: string[] = [];
      if (month) {
        joinConditions.push(`AND FORMAT(s.submission_date, 'yyyy-MM') = @month`);
        summaryParams.month = month;
      } else {
        joinConditions.push('AND s.submission_date >= DATEADD(month, -5, SYSUTCDATETIME())');
      }
      if (county) {
        joinConditions.push('AND s.city_county = @county');
        summaryParams.county = county;
      }
      agentSummary = await query(
        `SELECT a.name, a.code, COUNT(s.id) as count
         FROM agents a
         LEFT JOIN submissions s ON a.id = s.agent_id ${joinConditions.join(' ')}
         WHERE a.role IN ('agent', 'both')
         GROUP BY a.id, a.name, a.code ORDER BY count DESC`,
        summaryParams
      );
    }

    return NextResponse.json({
      total,
      race: raceRows,
      age: ageRows,
      sex: sexRows,
      county: countyRows,
      trend: trendRows,
      contact: contactRows,
      agentSummary,
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
