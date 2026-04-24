const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');
const { requireAuth, requireRole } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const applicantRoutes = require('./routes/applicants');
const managerRoutes = require('./routes/managers');
const aiRoutes = require('./routes/ai');
const jobRoutes = require('./routes/jobs');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'campus-work-study-hr-portal-lite',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/jobs', requireAuth, jobRoutes);
app.use('/api/ai', requireAuth, aiRoutes);
app.use('/api/applicants', requireAuth, applicantRoutes);
app.use('/api/managers', requireAuth, requireRole('manager'), managerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
