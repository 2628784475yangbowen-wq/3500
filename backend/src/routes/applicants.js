const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const applicantService = require('../services/applicantService');

const router = express.Router();

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const applicant = await applicantService.getApplicantById(req.params.id);
    res.json({ applicant });
  })
);

router.patch(
  '/:id/profile',
  asyncHandler(async (req, res) => {
    const applicant = await applicantService.updateProfile(req.params.id, req.body);
    res.json({
      message: 'Profile saved',
      applicant
    });
  })
);

router.put(
  '/:id/skills',
  asyncHandler(async (req, res) => {
    const applicant = await applicantService.replaceSkills(req.params.id, req.body.skills);
    res.json({
      message: 'Skills saved',
      applicant
    });
  })
);

router.put(
  '/:id/availability',
  asyncHandler(async (req, res) => {
    const applicant = await applicantService.replaceAvailability(req.params.id, req.body.availability);
    res.json({
      message: 'Availability saved',
      applicant
    });
  })
);

module.exports = router;
