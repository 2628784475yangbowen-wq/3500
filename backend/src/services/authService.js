const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError, badRequest } = require('../utils/errors');

const FALLBACK_SECRET = 'cps3500-dev-only-secret-do-not-use-in-prod';

function getSecret() {
  return process.env.JWT_SECRET || FALLBACK_SECRET;
}

function getExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '12h';
}

async function findApplicantByEmail(email, executor = db) {
  const result = await executor.query(
    `SELECT id, email, password_hash, first_name, last_name, 'applicant' AS role
       FROM applicants
      WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`,
    [email]
  );
  return result.rows[0];
}

async function findManagerByEmail(email, executor = db) {
  const result = await executor.query(
    `SELECT id, email, password_hash, first_name, last_name, 'manager' AS role
       FROM managers
      WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0];
}

async function findUserByEmail(email) {
  const applicant = await findApplicantByEmail(email);
  if (applicant) return applicant;
  return findManagerByEmail(email);
}

function signToken({ id, role, email }) {
  return jwt.sign({ sub: id, role, email }, getSecret(), { expiresIn: getExpiresIn() });
}

function verifyToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    return { id: payload.sub, role: payload.role, email: payload.email };
  } catch (error) {
    throw new AppError(401, 'Invalid or expired token');
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    throw badRequest('email and password are required');
  }

  const user = await findUserByEmail(String(email).trim());
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = signToken({ id: user.id, role: user.role, email: user.email });
  return {
    token,
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name
    }
  };
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), 10);
}

module.exports = {
  login,
  signToken,
  verifyToken,
  hashPassword,
  findApplicantByEmail,
  findManagerByEmail
};
