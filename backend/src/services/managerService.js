const db = require('../config/db');
const { dayName, overlaps, formatTime } = require('../utils/time');
const { notFound } = require('../utils/errors');

async function getDashboardSummary() {
  const [summary, applicationsByStatus, availabilityByDay, departments] = await Promise.all([
    db.query(
      `
        SELECT
          (SELECT COUNT(*)::INT FROM applicants WHERE is_active = TRUE) AS "activeApplicants",
          (SELECT COUNT(*)::INT FROM jobs WHERE active = TRUE) AS "activeJobs",
          (SELECT COALESCE(SUM(open_slots), 0)::INT FROM job_shifts) AS "openShiftSlots",
          (SELECT COUNT(*)::INT FROM applications WHERE status IN ('submitted', 'reviewing')) AS "pendingApplications"
      `
    ),
    db.query(
      `
        SELECT status, COUNT(*)::INT AS count
        FROM applications
        GROUP BY status
        ORDER BY status
      `
    ),
    db.query(
      `
        SELECT day_of_week AS "dayOfWeek", COUNT(*)::INT AS count
        FROM availability_blocks
        GROUP BY day_of_week
        ORDER BY day_of_week
      `
    ),
    db.query(
      `
        SELECT
          d.id,
          d.name,
          COUNT(DISTINCT j.id)::INT AS "activeJobs",
          COUNT(DISTINCT app.id)::INT AS "applications",
          COALESCE(SUM(js.open_slots), 0)::INT AS "openSlots"
        FROM departments d
        LEFT JOIN jobs j ON j.department_id = d.id AND j.active = TRUE
        LEFT JOIN job_shifts js ON js.job_id = j.id
        LEFT JOIN applications app ON app.job_id = j.id
        GROUP BY d.id
        ORDER BY d.name
      `
    )
  ]);

  return {
    summary: summary.rows[0],
    applicationsByStatus: applicationsByStatus.rows,
    availabilityByDay: availabilityByDay.rows.map((row) => ({
      ...row,
      dayName: dayName(row.dayOfWeek)
    })),
    departments: departments.rows
  };
}

async function getJobCandidateMatches(jobId) {
  const jobResult = await db.query(
    `
      SELECT
        j.id,
        j.title,
        j.location,
        d.name AS "departmentName",
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'skill', jrs.skill,
              'required', jrs.required
            )
          ) FILTER (WHERE jrs.skill IS NOT NULL),
          '[]'::JSONB
        ) AS skills,
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'dayOfWeek', js.day_of_week,
              'startTime', TO_CHAR(js.start_time, 'HH24:MI'),
              'endTime', TO_CHAR(js.end_time, 'HH24:MI')
            )
          ) FILTER (WHERE js.id IS NOT NULL),
          '[]'::JSONB
        ) AS shifts
      FROM jobs j
      JOIN departments d ON d.id = j.department_id
      LEFT JOIN job_required_skills jrs ON jrs.job_id = j.id
      LEFT JOIN job_shifts js ON js.job_id = j.id
      WHERE j.id = $1
      GROUP BY j.id, d.name
    `,
    [jobId]
  );

  if (jobResult.rowCount === 0) {
    throw notFound('Job not found');
  }

  const applicantsResult = await db.query(
    `
      SELECT
        a.id,
        a.first_name AS "firstName",
        a.last_name AS "lastName",
        a.email,
        a.major,
        a.max_weekly_hours AS "maxWeeklyHours",
        COALESCE(
          ARRAY_AGG(DISTINCT s.skill) FILTER (WHERE s.skill IS NOT NULL),
          '{}'
        ) AS skills,
        COALESCE(
          JSONB_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'dayOfWeek', av.day_of_week,
              'startTime', TO_CHAR(av.start_time, 'HH24:MI'),
              'endTime', TO_CHAR(av.end_time, 'HH24:MI')
            )
          ) FILTER (WHERE av.id IS NOT NULL),
          '[]'::JSONB
        ) AS availability
      FROM applicants a
      LEFT JOIN applicant_skills s ON s.applicant_id = a.id
      LEFT JOIN availability_blocks av ON av.applicant_id = a.id
      WHERE a.is_active = TRUE
      GROUP BY a.id
    `
  );

  const job = normalizeJob(jobResult.rows[0]);
  const candidates = applicantsResult.rows
    .map((applicant) => scoreCandidate(job, applicant))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    job,
    candidates
  };
}

function scoreCandidate(job, applicant) {
  const applicantSkills = applicant.skills.map((skill) => String(skill).toLowerCase());
  const requiredSkills = job.skills.filter((skill) => skill.required).map((skill) => skill.skill);
  const jobSkills = job.skills.map((skill) => skill.skill);
  const matchedSkills = jobSkills.filter((skill) => applicantSkills.includes(skill));
  const missingRequiredSkills = requiredSkills.filter((skill) => !applicantSkills.includes(skill));
  const matchedShifts = job.shifts.filter((shift) => applicant.availability.some((block) => (
    Number(block.dayOfWeek) === Number(shift.dayOfWeek)
      && overlaps(block.startTime, block.endTime, shift.startTime, shift.endTime)
  )));
  const score = Math.max(0, matchedSkills.length * 20 + matchedShifts.length * 25 - missingRequiredSkills.length * 30);

  return {
    ...applicant,
    score,
    matchedSkills,
    missingRequiredSkills,
    matchedShifts: matchedShifts.map((shift) => ({
      ...shift,
      label: `${dayName(shift.dayOfWeek)} ${formatTime(shift.startTime)}-${formatTime(shift.endTime)}`
    }))
  };
}

function normalizeJob(row) {
  return {
    ...row,
    skills: (row.skills || []).map((skill) => ({
      skill: String(skill.skill).toLowerCase(),
      required: Boolean(skill.required)
    })),
    shifts: row.shifts || []
  };
}

module.exports = {
  getDashboardSummary,
  getJobCandidateMatches
};
