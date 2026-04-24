const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { requireSelfOrManager } = require('../middleware/auth');
const applicantService = require('../services/applicantService');

const router = express.Router();

router.use('/:id', requireSelfOrManager('id'));

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

router.get(
  '/:id/applications',
  asyncHandler(async (req, res) => {
    const applications = await applicantService.listApplicationsByApplicant(req.params.id);
    res.json({ applications });
  })
);

router.post(
  '/:id/applications',
  asyncHandler(async (req, res) => {
    const application = await applicantService.applyToJob(req.params.id, {
      jobId: req.body.jobId,
      note: req.body.applicantNote
    });
    res.json({
      message: 'Application submitted',
      application
    });
  })
);

module.exports = router;
