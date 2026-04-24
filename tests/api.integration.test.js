const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { APPLICANT_ID, applicantAuth, managerAuth } = require('./helpers/auth');
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
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'campus-work-study-hr-portal-lite');
});

test('protected API routes reject requests without a JWT', async () => {
  const response = await request(app).get('/api/jobs');

  assert.equal(response.status, 401);
  assert.match(response.body.error.message, /Authentication required/);
});

test('PUT /api/applicants/:id/availability accepts applicant schedule updates', async (t) => {
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
    .put(`/api/applicants/${APPLICANT_ID}/availability`)
    .set(applicantAuth(APPLICANT_ID))
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

  const response = await request(app)
    .get('/api/managers/dashboard')
    .set(managerAuth());

  assert.equal(response.status, 200);
  assert.equal(response.body.dashboard.summary.activeApplicants, 3);
  assert.equal(response.body.dashboard.departments[0].name, 'IT Help Desk');
});

test('applicant cannot reach manager-only routes', async () => {
  const response = await request(app)
    .get('/api/managers/dashboard')
    .set(applicantAuth(APPLICANT_ID));

  assert.equal(response.status, 403);
  assert.match(response.body.error.message, /Access denied/i);
});

test('POST /api/ai/chat returns database-backed recommendations through service stubs', async (t) => {
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
      id: APPLICANT_ID,
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
    .set(applicantAuth(APPLICANT_ID))
    .send({
      message: 'I am free Tuesday morning. What jobs can I do?',
      applicantId: APPLICANT_ID
    });

  assert.equal(response.status, 200);
  assert.match(response.body.reply, /IT Help Desk Aide/);
  assert.equal(response.body.recommendations[0].score, 85);
});

test('POST /api/auth/login returns a token on valid credentials', async (t) => {
  const authService = require('../backend/src/services/authService');
  const originalLogin = authService.login;

  authService.login = async ({ email, password }) => {
    if (email === 'alex.morgan@student.example' && password === 'password123') {
      return {
        token: authService.signToken({ id: APPLICANT_ID, role: 'applicant', email }),
        user: { id: APPLICANT_ID, role: 'applicant', email, firstName: 'Alex', lastName: 'Morgan' }
      };
    }
    const { AppError } = require('../backend/src/utils/errors');
    throw new AppError(401, 'Invalid email or password');
  };

  t.after(() => {
    authService.login = originalLogin;
  });

  const good = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alex.morgan@student.example', password: 'password123' });

  assert.equal(good.status, 200);
  assert.ok(good.body.token);
  assert.equal(good.body.user.role, 'applicant');

  const bad = await request(app)
    .post('/api/auth/login')
    .send({ email: 'alex.morgan@student.example', password: 'wrong' });

  assert.equal(bad.status, 401);
  assert.match(bad.body.error.message, /Invalid email or password/);
});
