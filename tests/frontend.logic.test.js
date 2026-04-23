const assert = require('node:assert/strict');
const test = require('node:test');
const { DAYS, dayLabel, parseSkills, friendlyError } = require('../frontend/src/app/logic');

test('DAYS list covers Sunday through Saturday in order', () => {
  assert.equal(DAYS.length, 7);
  assert.equal(DAYS[0].label, 'Sunday');
  assert.equal(DAYS[6].label, 'Saturday');
  assert.deepEqual(DAYS.map((day) => day.value), [0, 1, 2, 3, 4, 5, 6]);
});

test('dayLabel returns the correct weekday for valid indices and Unknown for others', () => {
  assert.equal(dayLabel(2), 'Tuesday');
  assert.equal(dayLabel('4'), 'Thursday');
  assert.equal(dayLabel(99), 'Unknown');
  assert.equal(dayLabel(null), 'Unknown');
});

test('parseSkills trims, lowercases, and drops empty tokens', () => {
  assert.deepEqual(
    parseSkills(' Customer Service , DATA entry, ,tutoring'),
    ['customer service', 'data entry', 'tutoring']
  );
  assert.deepEqual(parseSkills('one\ntwo\nthree'), ['one', 'two', 'three']);
  assert.deepEqual(parseSkills(''), []);
  assert.deepEqual(parseSkills(undefined), []);
});

test('friendlyError digs into nested HttpErrorResponse payloads', () => {
  const nested = { error: { error: { message: 'Save failed' } } };
  assert.equal(friendlyError(nested, 'fallback'), 'Save failed');

  const flat = { error: { message: 'Bad request' } };
  assert.equal(friendlyError(flat, 'fallback'), 'Bad request');

  assert.equal(friendlyError(null, 'fallback'), 'fallback');
  assert.equal(friendlyError('oops', 'fallback'), 'fallback');
});
