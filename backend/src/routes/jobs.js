const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const jobService = require('../services/jobService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const jobs = await jobService.getActiveJobs();
    res.json({ jobs });
  })
);

module.exports = router;
