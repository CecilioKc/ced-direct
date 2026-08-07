import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agentId,
      city_county,
      phone,
      race,
      age_group,
      sex,
      contact_method,
      wants_info,
      allow_followup,
    } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // verify agent exists
    const agent = db.prepare(
      'SELECT id FROM agents WHERE id = ?'
    ).get(agentId);

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid agent' },
        { status: 404 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO submissions (
        agent_id, city_county, phone, race,
        age_group, sex, contact_method,
        wants_info, allow_followup
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      agentId,
      city_county || null,
      phone || null,
      Array.isArray(race) ? race.join(', ') : race || null,
      age_group || null,
      sex || null,
      contact_method || null,
      wants_info || null,
      allow_followup || null,
    );

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
    });

  } catch (error) {
    console.error('Survey submission error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}