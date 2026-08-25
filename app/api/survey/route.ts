import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

// Public endpoint — anonymous participants submit this form after scanning an
// agent's QR code. No authentication required or collected.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      agentId,
      city_county,
      phone,
      email,
      race,
      age_group,
      sex,
      contact_method,
      wants_info,
      allow_followup,
    } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    // verify agent exists
    const agent = await queryOne('SELECT id FROM agents WHERE id = @agentId', { agentId });
    if (!agent) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 404 });
    }

    const result = await execute(
      `INSERT INTO submissions (
        agent_id, city_county, phone, email, race,
        age_group, sex, contact_method,
        wants_info, allow_followup
      )
      OUTPUT INSERTED.id
      VALUES (@agentId, @city_county, @phone, @email, @race, @age_group, @sex, @contact_method, @wants_info, @allow_followup)`,
      {
        agentId,
        city_county: city_county || null,
        phone: phone || null,
        email: email || null,
        race: Array.isArray(race) ? race.join(', ') : race || null,
        age_group: age_group || null,
        sex: sex || null,
        contact_method: contact_method || null,
        wants_info: wants_info || null,
        allow_followup: allow_followup || null,
      }
    );

    return NextResponse.json({ success: true, id: result.recordset[0]?.id });
  } catch (error) {
    console.error('Survey submission error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
