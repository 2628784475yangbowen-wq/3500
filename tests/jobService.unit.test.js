const assert = require('node:assert/strict');
const test = require('node:test');
const jobService = require('../backend/src/services/jobService');
const applicantService = require('../backend/src/services/applicantService');

function buildJob(overrides = {}) {
  return {
    id: 'job-1',
    title: 'IT Help Desk Aide',
    description: '',
    location: 'Library',
    hourlyRate: 16.25,
    minHoursPerWeek: 4,
    maxHoursPerWeek: 12,
    remotePossible: false,
    lowBandwidthFriendly: true,
    departmentName: 'IT Help Desk',
    shifts: [
      { id: 's1', dayOfWeek: 2, startTime: '09:00', endTime: '13:00', openSlots: 2 }
    ],
    skills: [
      { skill: 'basic troubleshooting', required: true },
      { skill: 'customer service', required: false }
    ],
    ...overrides
  };
}

function withPatchedJobs(jobs, fn) {
  const originalJobs = jobService.getActiveJobs;
  const originalApplicant = applicantService.getApplicantById;

  jobService.getActiveJobs = async () => jobs;
  applicantService.getApplicantById = async () => null;

  return Promise.resolve(fn()).finally(() => {
    jobService.getActiveJobs = originalJobs;
    applicantService.getApplicantById = originalApplicant;
  });
}

test('recommendJobs ranks jobs that match skill and schedule highest', async () => {
  const jobs = [
    buildJob(),
    buildJob({
      id: 'job-2',
      title: 'Quiet Filing Assistant',
      departmentName: 'Records',
      shifts: [{ id: 's2', dayOfWeek: 5, startTime: '09:00', endTime: '12:00', openSlots: 1 }],
      skills: [{ skill: 'documentation', required: false }]
    })
  ];

  await withPatchedJobs(jobs, async () => {
    const { recommendations } = await jobService.recommendJobs({
      applicantId: null,
      criteria: {
        skills: ['basic troubleshooting'],
        timeWindows: [{ dayOfWeek: 2, startTime: '08:00', endTime: '12:00' }],
        remotePreferred: false
      }
    });

    assert.ok(recommendations.length >= 1, 'expected at least one recommendation');
    assert.equal(recommendations[0].id, 'job-1');
    assert.ok(recommendations[0].score > 0);
    assert.deepEqual(recommendations[0].matchedSkills, ['basic troubleshooting']);
    assert.equal(recommendations[0].matchedShifts.length, 1);
    assert.ok(recommendations[0].reasons.some((reason) => /basic troubleshooting/.test(reason)));
  });
});

test('recommendJobs penalises jobs missing a required skill', async () => {
  const jobs = [buildJob()];

  await withPatchedJobs(jobs, async () => {
    const matched = await jobService.recommendJobs({
      criteria: {
        skills: ['basic troubleshooting'],
        timeWindows: [{ dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }],
        remotePreferred: false
      }
    });
    const unmatched = await jobService.recommendJobs({
      criteria: {
        skills: ['tutoring'],
        timeWindows: [{ dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }],
        remotePreferred: false
      }
    });

    const matchedScore = matched.recommendations[0]?.score ?? 0;
    const unmatchedScore = unmatched.recommendations[0]?.score ?? 0;
    assert.ok(
      matchedScore > unmatchedScore,
      `expected matched score ${matchedScore} to exceed unmatched score ${unmatchedScore}`
    );
  });
});

test('recommendJobs falls back to applicant profile when criteria are empty', async () => {
  const jobs = [buildJob()];
  const originalJobs = jobService.getActiveJobs;
  const originalApplicant = applicantService.getApplicantById;

  jobService.getActiveJobs = async () => jobs;
  applicantService.getApplicantById = async () => ({
    id: 'applicant-1',
    first_name: 'Alex',
    last_name: 'Morgan',
    skills: ['basic troubleshooting'],
    availability: [{ dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }]
  });

  try {
    const { recommendations, usedApplicantProfile } = await jobService.recommendJobs({
      applicantId: 'applicant-1',
      criteria: { skills: [], timeWindows: [], remotePreferred: false }
    });

    assert.equal(usedApplicantProfile, true);
    assert.equal(recommendations[0].id, 'job-1');
    assert.ok(recommendations[0].matchedSkills.includes('basic troubleshooting'));
  } finally {
    jobService.getActiveJobs = originalJobs;
    applicantService.getApplicantById = originalApplicant;
  }
});

test('recommendJobs rewards remote preference only when the job allows remote', async () => {
  const jobs = [
    buildJob({ id: 'onsite', remotePossible: false }),
    buildJob({ id: 'remote', remotePossible: true })
  ];

  await withPatchedJobs(jobs, async () => {
    const { recommendations } = await jobService.recommendJobs({
      criteria: {
        skills: ['basic troubleshooting'],
        timeWindows: [{ dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }],
        remotePreferred: true
      }
    });

    const remote = recommendations.find((match) => match.id === 'remote');
    const onsite = recommendations.find((match) => match.id === 'onsite');
    assert.ok(remote && onsite);
    assert.ok(remote.score >= onsite.score);
  });
});
