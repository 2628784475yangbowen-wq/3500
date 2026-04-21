function authenticate(req, res, next) {
  const configuredToken = process.env.API_TOKEN;

  if (!configuredToken || req.path === '/health') {
    return next();
  }

  const authHeader = req.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined;
  const apiKey = req.get('x-api-key');
  const token = bearerToken || apiKey;

  if (token !== configuredToken) {
    return res.status(401).json({
      error: {
        message: 'Unauthorized request',
        hint: 'Send Authorization: Bearer <API_TOKEN> or x-api-key.'
      }
    });
  }

  return next();
}

module.exports = authenticate;
