const db = require('../config/db');
const { badRequest, notFound } = require('../utils/errors');
const { dayNumber } = require('../utils/time');

const PROFILE_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'preferred_contact',
  'major',
  'year_level',
  'public_summary',
  'access_needs',
  'max_weekly_hours',
  'is_active'
];

const PROFILE_ALIASES = {
  firstName: 'first_name',
  lastName: 'last_name',
  preferredContact: 'preferred_contact',
  yearLevel: 'year_level',
  publicSummary: 'public_summary',
  accessNeeds: 'access_needs',
  maxWeeklyHours: 'max_weekly_hours',
  isActive: 'is_active'
};

async function getApplicantById(applicantId, executor = db) {
  const result = await executor.query(
    `
      SELECT
        a.*,
        COALESCE(
          ARRAY_AGG(DISTINCT s.skill) FILTER (WHERE s.skill IS NOT NULL),
          '{}'
        ) AS skills,
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', av.id,
              'dayOfWeek', av.day_of_week,
              'startTime', TO_CHAR(av.start_time, 'HH24:MI'),
              'endTime', TO_CHAR(av.end_time, 'HH24:MI'),
              'note', av.note
            )
          ) FILTER (WHERE av.id IS NOT NULL),
          '[]'::JSONB
        ) AS availability
      FROM applicants a
      LEFT JOIN applicant_skills s ON s.applicant_id = a.id
      LEFT JOIN availability_blocks av ON av.applicant_id = a.id
      WHERE a.id = $1
      GROUP BY a.id
    `,
    [applicantId]
  );

  if (result.rowCount === 0) {
    throw notFound('Applicant not found');
  }

  return result.rows[0];
}

async function updateProfile(applicantId, changes) {
  const entries = Object.entries(changes || {})
    .map(([key, value]) => [PROFILE_ALIASES[key] || key, value])
    .filter(([key]) => PROFILE_FIELDS.includes(key));

  if (entries.length === 0) {
    throw badRequest('No supported profile fields were provided', { supportedFields: PROFILE_FIELDS });
  }

  return db.withTransaction(async (client) => {
    const previous = await getApplicantById(applicantId, client);
    const assignments = entries.map(([key], index) => `${key} = $${index + 2}`);
    const values = entries.map(([, value]) => value);

    await client.query(
      `
        UPDATE applicants
        SET ${assignments.join(', ')}
        WHERE id = $1
      `,
      [applicantId, ...values]
    );

    const updated = await getApplicantById(applicantId, client);
    await writeAuditEvent(client, {
      actorType: 'applicant',
      actorId: applicantId,
      entityType: 'applicant',
      entityId: applicantId,
      action: 'profile.update',
      previousState: previous,
      newState: updated
    });

    return updated;
  });
}

async function replaceSkills(applicantId, skills) {
  if (!Array.isArray(skills)) {
    throw badRequest('skills must be an array of strings');
  }

  const normalizedSkills = [...new Set(
    skills
      .map((skill) => String(skill || '').trim().toLowerCase())
      .filter(Boolean)
  )];

  return db.withTransaction(async (client) => {
    const previous = await getApplicantById(applicantId, client);
    await client.query('DELETE FROM applicant_skills WHERE applicant_id = $1', [applicantId]);

    for (const skill of normalizedSkills) {
      await client.query(
        'INSERT INTO applicant_skills (applicant_id, skill) VALUES ($1, $2)',
        [applicantId, skill]
      );
    }

    const updated = await getApplicantById(applicantId, client);
    await writeAuditEvent(client, {
      actorType: 'applicant',
      actorId: applicantId,
      entityType: 'applicant_skills',
      entityId: applicantId,
      action: 'skills.replace',
      previousState: previous.skills,
      newState: updated.skills
    });

    return updated;
  });
}

async function replaceAvailability(applicantId, availability) {
  if (!Array.isArray(availability)) {
    throw badRequest('availability must be an array');
  }

  const normalizedBlocks = availability.map((block) => {
    const parsedDay = dayNumber(block.dayOfWeek ?? block.day);

    if (parsedDay === undefined) {
      throw badRequest('Each availability block needs dayOfWeek 0-6 or a valid day name', block);
    }

    if (!block.startTime || !block.endTime || block.startTime >= block.endTime) {
      throw badRequest('Each availability block needs startTime before endTime', block);
    }

    return {
      dayOfWeek: parsedDay,
      startTime: block.startTime,
      endTime: block.endTime,
      note: block.note || ''
    };
  });

  return db.withTransaction(async (client) => {
    const previous = await getApplicantById(applicantId, client);
    await client.query('DELETE FROM availability_blocks WHERE applicant_id = $1', [applicantId]);

    for (const block of normalizedBlocks) {
      await client.query(
        `
          INSERT INTO availability_blocks (applicant_id, day_of_week, start_time, end_time, note)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [applicantId, block.dayOfWeek, block.startTime, block.endTime, block.note]
      );
    }

    const updated = await getApplicantById(applicantId, client);
    await writeAuditEvent(client, {
      actorType: 'applicant',
      actorId: applicantId,
      entityType: 'availability_blocks',
      entityId: applicantId,
      action: 'availability.replace',
      previousState: previous.availability,
      newState: updated.availability
    });

    return updated;
  });
}

async function writeAuditEvent(client, event) {
  await client.query(
    `
      INSERT INTO audit_events (
        actor_type,
        actor_id,
        entity_type,
        entity_id,
        action,
        previous_state,
        new_state
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      event.actorType,
      event.actorId,
      event.entityType,
      event.entityId,
      event.action,
      JSON.stringify(event.previousState ?? null),
      JSON.stringify(event.newState ?? null)
    ]
  );
}

module.exports = {
  getApplicantById,
  updateProfile,
  replaceSkills,
  replaceAvailability
};
