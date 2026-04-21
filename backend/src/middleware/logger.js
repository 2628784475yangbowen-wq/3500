function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const entry = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs
    };

    console.log(JSON.stringify(entry));
  });

  next();
}

module.exports = requestLogger;
