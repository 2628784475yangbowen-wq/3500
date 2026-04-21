const db = require('../config/db');
const { dayName, overlaps, formatTime } = require('../utils/time');
const applicantService = require('./applicantService');

async function getActiveJobs(executor = db) {
  const result = await executor.query(
    `
      SELECT
        j.id,
        j.title,
        j.description,
        j.location,
        j.hourly_rate AS "hourlyRate",
        j.min_hours_per_week AS "minHoursPerWeek",
        j.max_hours_per_week AS "maxHoursPerWeek",
        j.remote_possible AS "remotePossible",
        j.low_bandwidth_friendly AS "lowBandwidthFriendly",
        d.name AS "departmentName",
        JSONB_BUILD_OBJECT(
          'id', m.id,
          'firstName', m.first_name,
          'lastName', m.last_name,
          'email', m.email,
          'roleTitle', m.role_title
        ) AS manager,
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'id', js.id,
              'dayOfWeek', js.day_of_week,
              'startTime', TO_CHAR(js.start_time, 'HH24:MI'),
              'endTime', TO_CHAR(js.end_time, 'HH24:MI'),
              'openSlots', js.open_slots
            )
          ) FILTER (WHERE js.id IS NOT NULL),
          '[]'::JSONB
        ) AS shifts,
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'skill', jrs.skill,
              'required', jrs.required
            )
          ) FILTER (WHERE jrs.skill IS NOT NULL),
          '[]'::JSONB
        ) AS skills
      FROM jobs j
      JOIN departments d ON d.id = j.department_id
      LEFT JOIN managers m ON m.id = j.manager_id
      LEFT JOIN job_shifts js ON js.job_id = j.id
      LEFT JOIN job_required_skills jrs ON jrs.job_id = j.id
      WHERE j.active = TRUE
      GROUP BY j.id, d.name, m.id
      ORDER BY d.name, j.title
    `
  );

  return result.rows.map(normalizeJobRow);
}

async function recommendJobs({ applicantId, criteria }) {
  const [jobs, applicant] = await Promise.all([
    module.exports.getActiveJobs(),
    applicantId
      ? applicantService.getApplicantById(applicantId).catch(() => null)
      : Promise.resolve(null)
  ]);

  const requestedSkills = normalizeSkills(criteria.skills);
  const applicantSkills = normalizeSkills(applicant?.skills || []);
  const desiredSkills = requestedSkills.length > 0 ? requestedSkills : applicantSkills;
  const requestedAvailability = normalizeAvailability(criteria.timeWindows || []);
  const applicantAvailability = normalizeAvailability(applicant?.availability || []);
  const availability = requestedAvailability.length > 0 ? requestedAvailability : applicantAvailability;

  const recommendations = jobs
    .map((job) => scoreJob(job, desiredSkills, availability, criteria))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 6);

  return {
    applicant,
    recommendations,
    usedApplicantProfile: Boolean(applicant && (requestedSkills.length === 0 || requestedAvailability.length === 0))
  };
}

function scoreJob(job, desiredSkills, availability, criteria) {
  const requiredSkills = job.skills.filter((skill) => skill.required).map((skill) => skill.skill);
  const allJobSkills = job.skills.map((skill) => skill.skill);
  const matchedSkills = allJobSkills.filter((skill) => desiredSkills.includes(skill));
  const missingRequiredSkills = requiredSkills.filter((skill) => !desiredSkills.includes(skill));
  const matchedShifts = availability.length > 0
    ? job.shifts.filter((shift) => availability.some((block) => (
      Number(block.dayOfWeek) === Number(shift.dayOfWeek)
        && overlaps(block.startTime, block.endTime, shift.startTime, shift.endTime)
    )))
    : job.shifts;

  const skillScore = allJobSkills.length === 0 ? 20 : Math.round((matchedSkills.length / allJobSkills.length) * 40);
  const availabilityScore = job.shifts.length === 0 ? 20 : Math.round((matchedShifts.length / job.shifts.length) * 40);
  const davFitScore = job.lowBandwidthFriendly ? 10 : 0;
  const remoteScore = criteria.remotePreferred && job.remotePossible ? 5 : 0;
  const penalty = missingRequiredSkills.length * 18;
  const score = Math.max(0, skillScore + availabilityScore + davFitScore + remoteScore - penalty);

  return {
    ...job,
    score,
    matchedSkills,
    missingRequiredSkills,
    matchedShifts,
    reasons: buildReasons(job, matchedSkills, missingRequiredSkills, matchedShifts)
  };
}

function buildReasons(job, matchedSkills, missingRequiredSkills, matchedShifts) {
  const reasons = [];

  if (matchedSkills.length > 0) {
    reasons.push(`Matches skills: ${matchedSkills.join(', ')}`);
  }

  if (matchedShifts.length > 0) {
    const shiftText = matchedShifts
      .map((shift) => `${dayName(shift.dayOfWeek)} ${formatTime(shift.startTime)}-${formatTime(shift.endTime)}`)
      .join('; ');
    reasons.push(`Fits availability: ${shiftText}`);
  }

  if (job.lowBandwidthFriendly) {
    reasons.push('Low-bandwidth friendly workflow');
  }

  if (missingRequiredSkills.length > 0) {
    reasons.push(`May need support with: ${missingRequiredSkills.join(', ')}`);
  }

  return reasons;
}

function normalizeJobRow(row) {
  return {
    ...row,
    hourlyRate: Number(row.hourlyRate),
    minHoursPerWeek: Number(row.minHoursPerWeek),
    maxHoursPerWeek: Number(row.maxHoursPerWeek),
    shifts: row.shifts || [],
    skills: (row.skills || []).map((skill) => ({
      skill: String(skill.skill).toLowerCase(),
      required: Boolean(skill.required)
    }))
  };
}

function normalizeSkills(skills) {
  return [...new Set((skills || []).map((skill) => String(skill || '').trim().toLowerCase()).filter(Boolean))];
}

function normalizeAvailability(blocks) {
  return (blocks || [])
    .filter((block) => block.dayOfWeek !== undefined && block.startTime && block.endTime)
    .map((block) => ({
      dayOfWeek: Number(block.dayOfWeek),
      startTime: formatTime(block.startTime),
      endTime: formatTime(block.endTime)
    }));
}

module.exports = {
  getActiveJobs,
  recommendJobs
};
