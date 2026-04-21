const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const request = require('supertest');
const app = require('../backend/src/app');
const { pool } = require('../backend/src/config/db');
const applicantService = require('../backend/src/services/applicantService');
const aiService = require('../backend/src/services/aiService');
const jobService = require('../backend/src/services/jobService');
const managerService = require('../backend/src/services/managerService');

after(async () => {
  await pool.end();
});

test('GET /api/health returns service status without authentication', async () => {
  process.env.API_TOKEN = 'secret-for-test';

  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'campus-work-study-hr-portal-lite');
});

test('protected API routes reject requests without a configured token', async () => {
  process.env.API_TOKEN = 'secret-for-test';

  const response = await request(app).get('/api/jobs');

  assert.equal(response.status, 401);
  assert.match(response.body.error.message, /Unauthorized/);
});

test('PUT /api/applicants/:id/availability accepts applicant schedule updates', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.replaceAvailability;

  applicantService.replaceAvailability = async (applicantId, availability) => ({
    id: applicantId,
    first_name: 'Alex',
    last_name: 'Morgan',
    email: 'alex.morgan@student.example',
    skills: [],
    availability
  });

  t.after(() => {
    applicantService.replaceAvailability = original;
  });

  const response = await request(app)
    .put('/api/applicants/30000000-0000-0000-0000-000000000001/availability')
    .send({
      availability: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00', note: 'Morning block' }
      ]
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Availability saved');
  assert.equal(response.body.applicant.availability[0].dayOfWeek, 2);
});

test('GET /api/managers/dashboard returns aggregated manager data', async (t) => {
  process.env.API_TOKEN = '';
  const original = managerService.getDashboardSummary;

  managerService.getDashboardSummary = async () => ({
    summary: {
      activeApplicants: 3,
      activeJobs: 4,
      openShiftSlots: 10,
      pendingApplications: 2
    },
    applicationsByStatus: [{ status: 'submitted', count: 1 }],
    availabilityByDay: [{ dayOfWeek: 2, dayName: 'Tuesday', count: 2 }],
    departments: [{ id: 'dept-1', name: 'IT Help Desk', activeJobs: 1, applications: 1, openSlots: 2 }]
  });

  t.after(() => {
    managerService.getDashboardSummary = original;
  });

  const response = await request(app).get('/api/managers/dashboard');

  assert.equal(response.status, 200);
  assert.equal(response.body.dashboard.summary.activeApplicants, 3);
  assert.equal(response.body.dashboard.departments[0].name, 'IT Help Desk');
});

test('POST /api/ai/chat returns database-backed recommendations through service stubs', async (t) => {
  process.env.API_TOKEN = '';
  const originalExtract = aiService.extractMatchCriteria;
  const originalRecommend = jobService.recommendJobs;

  aiService.extractMatchCriteria = async () => ({
    provider: 'mock',
    timeWindows: [{ dayOfWeek: 2, startTime: '08:00', endTime: '12:00' }],
    skills: ['basic troubleshooting'],
    remotePreferred: false,
    maxHoursPerWeek: null
  });
  jobService.recommendJobs = async () => ({
    applicant: {
      id: '30000000-0000-0000-0000-000000000001',
      first_name: 'Alex',
      last_name: 'Morgan'
    },
    usedApplicantProfile: false,
    recommendations: [
      {
        id: 'job-1',
        title: 'IT Help Desk Aide',
        departmentName: 'IT Help Desk',
        hourlyRate: 16.25,
        score: 85,
        reasons: ['Matches skills: basic troubleshooting'],
        matchedSkills: ['basic troubleshooting'],
        matchedShifts: [{ dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }]
      }
    ]
  });

  t.after(() => {
    aiService.extractMatchCriteria = originalExtract;
    jobService.recommendJobs = originalRecommend;
  });

  const response = await request(app)
    .post('/api/ai/chat')
    .send({
      message: 'I am free Tuesday morning. What jobs can I do?',
      applicantId: '30000000-0000-0000-0000-000000000001'
    });

  assert.equal(response.status, 200);
  assert.match(response.body.reply, /IT Help Desk Aide/);
  assert.equal(response.body.recommendations[0].score, 85);
});
