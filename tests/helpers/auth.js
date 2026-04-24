process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const authService = require('../../backend/src/services/authService');

const APPLICANT_ID = '30000000-0000-0000-0000-000000000001';
const MANAGER_ID = '20000000-0000-0000-0000-000000000001';

function applicantToken(id = APPLICANT_ID) {
  return authService.signToken({ id, role: 'applicant', email: 'test-applicant@example.com' });
}

function managerToken(id = MANAGER_ID) {
  return authService.signToken({ id, role: 'manager', email: 'test-manager@example.com' });
}

function applicantAuth(id) {
  return { Authorization: `Bearer ${applicantToken(id)}` };
}

function managerAuth(id) {
  return { Authorization: `Bearer ${managerToken(id)}` };
}

module.exports = {
  APPLICANT_ID,
  MANAGER_ID,
  applicantToken,
  managerToken,
  applicantAuth,
  managerAuth
};
