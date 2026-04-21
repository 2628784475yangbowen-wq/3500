const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');
const authenticate = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
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

app.use('/api', authenticate);
app.use('/api/applicants', applicantRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/jobs', jobRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
