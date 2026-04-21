const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { badRequest } = require('../utils/errors');
const aiService = require('../services/aiService');
const jobService = require('../services/jobService');

const router = express.Router();

const recommendationsHandler = asyncHandler(async (req, res) => {
  const { message, applicantId } = req.body;

  if (!message || typeof message !== 'string') {
    throw badRequest('message is required');
  }

  const criteria = await aiService.extractMatchCriteria(message);
  const { applicant, recommendations, usedApplicantProfile } = await jobService.recommendJobs({
    applicantId,
    criteria
  });
  const reply = aiService.buildRecommendationReply({
    originalMessage: message,
    criteria,
    recommendations,
    usedApplicantProfile
  });

  res.json({
    reply,
    criteria,
    applicant: applicant
      ? {
        id: applicant.id,
        firstName: applicant.first_name,
        lastName: applicant.last_name
      }
      : null,
    recommendations
  });
});

router.post('/recommendations', recommendationsHandler);
router.post('/chat', recommendationsHandler);

module.exports = router;
