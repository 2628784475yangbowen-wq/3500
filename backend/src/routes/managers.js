const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const managerService = require('../services/managerService');

const router = express.Router();

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const dashboard = await managerService.getDashboardSummary();
    res.json({ dashboard });
  })
);

router.get(
  '/jobs/:jobId/matches',
  asyncHandler(async (req, res) => {
    const matches = await managerService.getJobCandidateMatches(req.params.jobId);
    res.json(matches);
  })
);

module.exports = router;
