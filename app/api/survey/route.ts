import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { normalizeContactEmail } from '@/lib/contact-email.mjs';
import { findAssignedCounty } from '@/lib/counties.mjs';
import { canActAsAgent, isAppRole } from '@/lib/roles';

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

    const contactEmail = contact_method === 'Email' ? normalizeContactEmail(email) : null;
    if (contact_method === 'Email' && !contactEmail) {
      return NextResponse.json({ error: 'A valid email address is required when Email is selected' }, { status: 400 });
    }

    // verify agent exists
    const agent = await queryOne<{ id: number; role: string }>(
      'SELECT id, role FROM agents WHERE id = @agentId',
      { agentId }
    );
    if (!agent || !isAppRole(agent.role) || !canActAsAgent(agent.role)) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 404 });
    }

    const assignedCountyRows = await query<{ county: string }>(
      'SELECT county FROM agent_counties WHERE agent_id = @agentId ORDER BY county',
      { agentId }
    );
    const assignedCounty = findAssignedCounty(city_county, assignedCountyRows.map(row => row.county));
    if (!assignedCounty) {
      return NextResponse.json({ error: 'This survey link does not contain a valid assigned county' }, { status: 400 });
    }

    const result = await execute(
      `SET XACT_ABORT ON;
       BEGIN TRANSACTION;
       BEGIN TRY
         DECLARE @InsertedSubmission TABLE (id INT);

         INSERT INTO submissions (
           agent_id, city_county, phone, race,
           age_group, sex, contact_method,
           wants_info, allow_followup
         )
         OUTPUT INSERTED.id INTO @InsertedSubmission(id)
         VALUES (@agentId, @city_county, @phone, @race, @age_group, @sex, @contact_method, @wants_info, @allow_followup);

         IF @contactEmail IS NOT NULL
         BEGIN
           INSERT INTO agent_contact_emails (agent_id, email)
           VALUES (@agentId, @contactEmail);
         END;

         COMMIT TRANSACTION;
         SELECT id FROM @InsertedSubmission;
       END TRY
       BEGIN CATCH
         IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
         THROW;
       END CATCH;`,
      {
        agentId,
        city_county: assignedCounty,
        phone: phone || null,
        contactEmail: contactEmail || null,
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
