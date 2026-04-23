const assert = require('node:assert/strict');
const { test } = require('node:test');
const request = require('supertest');
const app = require('../backend/src/app');
const applicantService = require('../backend/src/services/applicantService');

test('GET /api/applicants/:id returns applicant details when service resolves', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.getApplicantById;

  applicantService.getApplicantById = async (id) => ({
    id,
    first_name: 'Alex',
    last_name: 'Morgan',
    email: 'alex.morgan@student.example',
    skills: ['customer service'],
    availability: [{ dayOfWeek: 2, startTime: '08:00', endTime: '12:00', note: '' }]
  });

  t.after(() => {
    applicantService.getApplicantById = original;
  });

  const response = await request(app).get('/api/applicants/30000000-0000-0000-0000-000000000001');

  assert.equal(response.status, 200);
  assert.equal(response.body.applicant.first_name, 'Alex');
  assert.deepEqual(response.body.applicant.skills, ['customer service']);
});

test('PUT /api/applicants/:id/skills persists normalised skill list', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.replaceSkills;
  let received;

  applicantService.replaceSkills = async (applicantId, skills) => {
    received = { applicantId, skills };
    return {
      id: applicantId,
      first_name: 'Alex',
      last_name: 'Morgan',
      email: 'alex.morgan@student.example',
      skills,
      availability: []
    };
  };

  t.after(() => {
    applicantService.replaceSkills = original;
  });

  const response = await request(app)
    .put('/api/applicants/30000000-0000-0000-0000-000000000001/skills')
    .send({ skills: ['customer service', 'data entry'] });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Skills saved');
  assert.deepEqual(received.skills, ['customer service', 'data entry']);
  assert.deepEqual(response.body.applicant.skills, ['customer service', 'data entry']);
});

test('PATCH /api/applicants/:id/profile forwards update payload', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.updateProfile;
  let captured;

  applicantService.updateProfile = async (applicantId, body) => {
    captured = { applicantId, body };
    return {
      id: applicantId,
      first_name: body.firstName ?? 'Alex',
      last_name: body.lastName ?? 'Morgan',
      email: body.email ?? 'alex.morgan@student.example',
      max_weekly_hours: body.maxWeeklyHours ?? 12,
      skills: [],
      availability: []
    };
  };

  t.after(() => {
    applicantService.updateProfile = original;
  });

  const response = await request(app)
    .patch('/api/applicants/30000000-0000-0000-0000-000000000001/profile')
    .send({ firstName: 'Sam', maxWeeklyHours: 8 });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, 'Profile saved');
  assert.equal(captured.body.firstName, 'Sam');
  assert.equal(response.body.applicant.max_weekly_hours, 8);
});

test('GET /api/applicants/:id/applications returns application list', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.listApplicationsByApplicant;

  applicantService.listApplicationsByApplicant = async (id) => [
    { id: 'a1', jobId: 'b1', status: 'submitted', applicantNote: 'Interested' }
  ];

  t.after(() => {
    applicantService.listApplicationsByApplicant = original;
  });

  const response = await request(app).get('/api/applicants/30000000-0000-0000-0000-000000000001/applications');
  assert.equal(response.status, 200);
  assert.equal(response.body.applications[0].status, 'submitted');
});

test('POST /api/applicants/:id/applications creates application', async (t) => {
  process.env.API_TOKEN = '';
  const original = applicantService.applyToJob;

  applicantService.applyToJob = async (id, body) => ({
    id: 'new-app',
    jobId: body.jobId,
    status: 'submitted',
    applicantNote: String(body.note || '')
  });

  t.after(() => {
    applicantService.applyToJob = original;
  });

  const jobId = '20000000-0000-0000-0000-000000000001';
  const response = await request(app)
    .post('/api/applicants/30000000-0000-0000-0000-000000000001/applications')
    .send({ jobId, applicantNote: 'Please consider me' });

  assert.equal(response.status, 200);
  assert.equal(response.body.application.status, 'submitted');
});
