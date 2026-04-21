const assert = require('node:assert/strict');
const test = require('node:test');
const { heuristicExtract, buildRecommendationReply } = require('../backend/src/services/aiService');
const { dayNumber, overlaps, dayName } = require('../backend/src/utils/time');

test('heuristicExtract finds day, time window, and skills from plain language', () => {
  const result = heuristicExtract('I am free on Tuesday mornings and I know basic troubleshooting.');

  assert.deepEqual(result.timeWindows, [
    { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' }
  ]);
  assert.deepEqual(result.skills, ['basic troubleshooting']);
  assert.equal(result.remotePreferred, false);
});

test('time helpers support schedule matching', () => {
  assert.equal(dayNumber('Tuesday'), 2);
  assert.equal(dayNumber('2'), 2);
  assert.equal(dayName(5), 'Friday');
  assert.equal(overlaps('09:00', '12:00', '11:00', '13:00'), true);
  assert.equal(overlaps('09:00', '10:00', '10:00', '11:00'), false);
});

test('buildRecommendationReply formats concise job recommendations', () => {
  const reply = buildRecommendationReply({
    originalMessage: 'I am free Tuesday morning.',
    usedApplicantProfile: false,
    criteria: {},
    recommendations: [
      {
        title: 'IT Help Desk Aide',
        departmentName: 'IT Help Desk',
        hourlyRate: 16.25,
        matchedShifts: [
          { dayOfWeek: 2, startTime: '09:00', endTime: '13:00' }
        ],
        reasons: ['Matches skills: basic troubleshooting', 'Low-bandwidth friendly workflow']
      }
    ]
  });

  assert.match(reply, /IT Help Desk Aide/);
  assert.match(reply, /Tuesday 09:00-13:00/);
  assert.match(reply, /\$16\.25\/hr/);
});
