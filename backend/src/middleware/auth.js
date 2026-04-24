const { AppError } = require('../utils/errors');
const authService = require('../services/authService');

function extractToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: { message: 'Authentication required. Send Authorization: Bearer <token>.' }
    });
  }

  try {
    req.user = authService.verifyToken(token);
    return next();
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 401;
    return res.status(status).json({
      error: { message: error.message || 'Invalid or expired token' }
    });
  }
}

function requireRole(...allowedRoles) {
  const roles = new Set(allowedRoles);
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    if (!roles.has(req.user.role)) {
      return res.status(403).json({
        error: { message: `Access denied. This route requires role: ${[...roles].join(' or ')}` }
      });
    }
    return next();
  };
}

function requireSelfOrManager(paramName = 'id') {
  return function guard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    if (req.user.role === 'manager') {
      return next();
    }
    if (req.user.role === 'applicant' && req.user.id === req.params[paramName]) {
      return next();
    }
    return res.status(403).json({
      error: { message: 'You can only access your own applicant record.' }
    });
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requireSelfOrManager
};
