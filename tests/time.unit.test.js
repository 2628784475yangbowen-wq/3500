const assert = require('node:assert/strict');
const test = require('node:test');
const { dayNumber, dayName, overlaps, formatTime } = require('../backend/src/utils/time');

test('dayNumber accepts name, index, and numeric strings', () => {
  assert.equal(dayNumber('Sunday'), 0);
  assert.equal(dayNumber('tuesday'), 2);
  assert.equal(dayNumber(4), 4);
  assert.equal(dayNumber('5'), 5);
  assert.equal(dayNumber('nope'), undefined);
  assert.equal(dayNumber(9), undefined);
});

test('dayName returns Unknown for out-of-range input', () => {
  assert.equal(dayName(0), 'Sunday');
  assert.equal(dayName(6), 'Saturday');
  assert.equal(dayName(99), 'Unknown');
});

test('overlaps rejects touching intervals and undefined inputs', () => {
  assert.equal(overlaps('09:00', '10:00', '10:00', '11:00'), false);
  assert.equal(overlaps('09:00', '11:00', '10:00', '10:30'), true);
  assert.equal(overlaps('not-a-time', '10:00', '10:00', '11:00'), false);
  assert.equal(overlaps('09:00', '12:00', '11:00', '13:00'), true);
});

test('formatTime trims seconds and handles missing values', () => {
  assert.equal(formatTime('09:15:00'), '09:15');
  assert.equal(formatTime('13:00'), '13:00');
  assert.equal(formatTime(''), '');
  assert.equal(formatTime(undefined), '');
});
