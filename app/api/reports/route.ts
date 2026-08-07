import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getTokenFromCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromCookie(
      request.headers.get('cookie')
    );
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // format: 2026-06
    const agentId = searchParams.get('agentId');
    const county = searchParams.get('county'); // new: county filter

    const targetAgentId =
      token.role === 'manager' && agentId
        ? parseInt(agentId)
        : token.agentId;

    // build dynamic filter clause + params together so ordering never drifts
    const conditions: string[] = [];
    const baseParams: any[] = [];

    const isManagerAllAgents = token.role === 'manager' && !agentId;

    if (!isManagerAllAgents) {
      conditions.push('agent_id = ?');
      baseParams.push(targetAgentId);
    }

    if (month) {
      conditions.push(`strftime('%Y-%m', submission_date) = ?`);
      baseParams.push(month);
    } else {
      conditions.push(`submission_date >= date('now', '-5 months')`);
    }

    if (county) {
      conditions.push('city_county = ?');
      baseParams.push(county);
    }

    const baseWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // total count
    const total = (db.prepare(
      `SELECT COUNT(*) as count FROM submissions ${baseWhere}`
    ).get(...baseParams) as any).count;

    // race breakdown
    const raceRows = db.prepare(
      `SELECT race, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY race`
    ).all(...baseParams);

    // age breakdown
    const ageRows = db.prepare(
      `SELECT age_group, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY age_group`
    ).all(...baseParams);

    // sex breakdown
    const sexRows = db.prepare(
      `SELECT sex, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY sex`
    ).all(...baseParams);

    // county breakdown (NEW) — uses the same filters except county itself,
    // so the chart still shows the full distribution even when not filtered
    const countyConditions = conditions.filter(c => c !== 'city_county = ?');
    const countyParams = baseParams.slice(0, county ? baseParams.length - 1 : baseParams.length);
    const countyWhere = countyConditions.length ? `WHERE ${countyConditions.join(' AND ')}` : '';
    const countyRows = db.prepare(
      `SELECT city_county as county, COUNT(*) as count FROM submissions ${countyWhere} GROUP BY city_county ORDER BY count DESC`
    ).all(...countyParams);

    // monthly trend (last 5 months)
    const trendConditions: string[] = [];
    const trendParams: any[] = [];
    if (!isManagerAllAgents) {
      trendConditions.push('agent_id = ?');
      trendParams.push(targetAgentId);
    }
    trendConditions.push(`submission_date >= date('now', '-5 months')`);
    if (county) {
      trendConditions.push('city_county = ?');
      trendParams.push(county);
    }
    const trendRows = db.prepare(
      `SELECT strftime('%Y-%m', submission_date) as month,
       COUNT(*) as count FROM submissions
       WHERE ${trendConditions.join(' AND ')}
       GROUP BY month ORDER BY month ASC`
    ).all(...trendParams);

    // contact method breakdown
    const contactRows = db.prepare(
      `SELECT contact_method, COUNT(*) as count FROM submissions ${baseWhere} GROUP BY contact_method`
    ).all(...baseParams);

    // if manager, also get per-agent summary
    let agentSummary = null;
    if (isManagerAllAgents) {
      agentSummary = db.prepare(
        `SELECT a.name, a.code, COUNT(s.id) as count
         FROM agents a
         LEFT JOIN submissions s ON a.id = s.agent_id
         ${month ? `AND strftime('%Y-%m', s.submission_date) = '${month}'` : `AND s.submission_date >= date('now', '-5 months')`}
         ${county ? `AND s.city_county = '${county.replace(/'/g, "''")}'` : ''}
         WHERE a.role = 'agent'
         GROUP BY a.id ORDER BY count DESC`
      ).all();
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
