const { DAY_NAMES, dayNumber, dayName, formatTime } = require('../utils/time');

const TIME_WINDOWS = [
  { pattern: /\bmorning(s)?\b/i, startTime: '08:00', endTime: '12:00' },
  { pattern: /\bafternoon(s)?\b/i, startTime: '12:00', endTime: '17:00' },
  { pattern: /\bevening(s)?\b/i, startTime: '17:00', endTime: '21:00' },
  { pattern: /\bnight(s)?\b/i, startTime: '18:00', endTime: '22:00' },
  { pattern: /\banytime\b/i, startTime: '08:00', endTime: '17:00' }
];

const KNOWN_SKILLS = [
  'basic troubleshooting',
  'customer service',
  'data entry',
  'documentation',
  'scheduling',
  'technical support',
  'tutoring'
];

async function extractMatchCriteria(message) {
  const fallback = heuristicExtract(message);
  const provider = String(process.env.AI_PROVIDER || 'mock').toLowerCase();

  if (provider === 'mock') {
    return {
      ...fallback,
      provider: 'mock',
      note: 'Used local deterministic parsing because AI_PROVIDER=mock.'
    };
  }

  try {
    const raw = provider === 'gemini'
      ? await extractWithGemini(message)
      : await extractWithOpenAI(message);

    return sanitizeCriteria(raw, fallback, provider);
  } catch (error) {
    return {
      ...fallback,
      provider: 'fallback',
      warning: `AI parsing failed, so the server used local parsing instead: ${error.message}`
    };
  }
}

function buildRecommendationReply({ originalMessage, criteria, recommendations, usedApplicantProfile }) {
  if (recommendations.length === 0) {
    return [
      'I could not find a strong match yet.',
      'Try adding a day, a time window, or a skill. For example: "I am free Tuesday morning and I know basic troubleshooting."'
    ].join(' ');
  }

  const contextLine = usedApplicantProfile
    ? 'I also used the saved applicant profile where your message did not include details.'
    : 'I matched this using the availability and skills in your message.';

  const items = recommendations.map((job, index) => {
    const shiftText = job.matchedShifts.length > 0
      ? job.matchedShifts
        .map((shift) => `${dayName(shift.dayOfWeek)} ${formatTime(shift.startTime)}-${formatTime(shift.endTime)}`)
        .join(', ')
      : 'schedule flexible or not specified';
    const reasonText = job.reasons.join('; ');

    return `${index + 1}. ${job.title} (${job.departmentName}) - $${job.hourlyRate.toFixed(2)}/hr, ${shiftText}. ${reasonText}`;
  });

  return [
    `For "${originalMessage}", here are the best work-study matches.`,
    contextLine,
    ...items
  ].join('\n');
}

function heuristicExtract(message) {
  const lowerMessage = String(message || '').toLowerCase();
  const days = DAY_NAMES
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => lowerMessage.includes(day.toLowerCase()))
    .map(({ index }) => index);
  const timeWindow = TIME_WINDOWS.find(({ pattern }) => pattern.test(lowerMessage));
  const timeWindows = [];

  for (const day of days) {
    timeWindows.push({
      dayOfWeek: day,
      startTime: timeWindow?.startTime || '08:00',
      endTime: timeWindow?.endTime || '17:00'
    });
  }

  const skills = KNOWN_SKILLS.filter((skill) => lowerMessage.includes(skill));
  const maxHoursMatch = lowerMessage.match(/\b(\d{1,2})\s*(hour|hours|hr|hrs)\b/);

  return {
    timeWindows,
    skills,
    maxHoursPerWeek: maxHoursMatch ? Number(maxHoursMatch[1]) : null,
    remotePreferred: /\b(remote|online|from home)\b/.test(lowerMessage)
  };
}

async function extractWithOpenAI(message) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: extractionSystemPrompt() },
        { role: 'user', content: message }
      ]
    })
  });

  const data = await parseProviderResponse(response);
  const content = data.choices?.[0]?.message?.content;
  return parseJsonContent(content);
}

async function extractWithGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${extractionSystemPrompt()}\n\nUser message: ${message}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = await parseProviderResponse(response);
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseJsonContent(content);
}

async function parseProviderResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error?.message || `Provider returned HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function extractionSystemPrompt() {
  return [
    'Extract campus work-study matching criteria from the user message.',
    'Return only valid JSON with this shape:',
    '{',
    '  "timeWindows": [{"dayOfWeek": 0, "startTime": "08:00", "endTime": "12:00"}],',
    '  "skills": ["customer service"],',
    '  "maxHoursPerWeek": 12,',
    '  "remotePreferred": false',
    '}',
    'Use dayOfWeek where Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6.',
    'Use 24-hour HH:MM times. If a detail is missing, return an empty array or null instead of guessing.'
  ].join('\n');
}

function parseJsonContent(content) {
  if (!content) {
    throw new Error('Provider response did not include JSON content');
  }

  const cleaned = String(content)
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

function sanitizeCriteria(raw, fallback, provider) {
  const rawWindows = Array.isArray(raw?.timeWindows) ? raw.timeWindows : [];
  const timeWindows = rawWindows
    .map((block) => ({
      dayOfWeek: dayNumber(block.dayOfWeek ?? block.day),
      startTime: formatTime(block.startTime),
      endTime: formatTime(block.endTime)
    }))
    .filter((block) => block.dayOfWeek !== undefined && block.startTime && block.endTime);
  const skills = Array.isArray(raw?.skills)
    ? raw.skills.map((skill) => String(skill).trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    timeWindows: timeWindows.length > 0 ? timeWindows : fallback.timeWindows,
    skills: skills.length > 0 ? [...new Set(skills)] : fallback.skills,
    maxHoursPerWeek: Number.isFinite(Number(raw?.maxHoursPerWeek))
      ? Number(raw.maxHoursPerWeek)
      : fallback.maxHoursPerWeek,
    remotePreferred: typeof raw?.remotePreferred === 'boolean'
      ? raw.remotePreferred
      : fallback.remotePreferred,
    provider
  };
}

module.exports = {
  extractMatchCriteria,
  buildRecommendationReply,
  heuristicExtract
};
