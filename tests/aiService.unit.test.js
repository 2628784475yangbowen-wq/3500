const assert = require('node:assert/strict');
const test = require('node:test');
const aiService = require('../backend/src/services/aiService');

function withEnv(env, fn) {
  const originals = {};
  for (const key of Object.keys(env)) {
    originals[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  return Promise.resolve(fn()).finally(() => {
    for (const key of Object.keys(originals)) {
      if (originals[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originals[key];
      }
    }
  });
}

function stubFetch(response) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => response;
  return () => {
    globalThis.fetch = original;
  };
}

test('extractMatchCriteria in mock mode uses deterministic parsing and reports provider', async () => {
  await withEnv({ AI_PROVIDER: 'mock' }, async () => {
    const criteria = await aiService.extractMatchCriteria(
      'I am free on Monday afternoons and I know customer service.'
    );

    assert.equal(criteria.provider, 'mock');
    assert.deepEqual(criteria.timeWindows, [
      { dayOfWeek: 1, startTime: '12:00', endTime: '17:00' }
    ]);
    assert.deepEqual(criteria.skills, ['customer service']);
  });
});

test('extractMatchCriteria falls back to heuristics when OpenAI fetch fails', async () => {
  await withEnv({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' }, async () => {
    const restore = stubFetch({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Provider unavailable' } })
    });

    try {
      const criteria = await aiService.extractMatchCriteria(
        'I am free Tuesday morning and I know basic troubleshooting.'
      );

      assert.equal(criteria.provider, 'fallback');
      assert.match(criteria.warning, /Provider unavailable/);
      assert.deepEqual(criteria.skills, ['basic troubleshooting']);
    } finally {
      restore();
    }
  });
});

test('extractMatchCriteria sanitises and merges OpenAI JSON output', async () => {
  await withEnv({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test-key' }, async () => {
    const restore = stubFetch({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                timeWindows: [{ dayOfWeek: 'Wednesday', startTime: '10:00', endTime: '14:00' }],
                skills: ['Data Entry', 'Customer Service'],
                maxHoursPerWeek: 10,
                remotePreferred: true
              })
            }
          }
        ]
      })
    });

    try {
      const criteria = await aiService.extractMatchCriteria('anything');
      assert.equal(criteria.provider, 'openai');
      assert.deepEqual(criteria.timeWindows, [
        { dayOfWeek: 3, startTime: '10:00', endTime: '14:00' }
      ]);
      assert.deepEqual(criteria.skills, ['data entry', 'customer service']);
      assert.equal(criteria.maxHoursPerWeek, 10);
      assert.equal(criteria.remotePreferred, true);
    } finally {
      restore();
    }
  });
});

test('extractMatchCriteria surfaces missing Gemini API key without crashing', async () => {
  await withEnv({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: undefined }, async () => {
    const criteria = await aiService.extractMatchCriteria('Tuesday morning');

    assert.equal(criteria.provider, 'fallback');
    assert.match(criteria.warning, /GEMINI_API_KEY/);
  });
});
