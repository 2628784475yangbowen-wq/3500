const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

function dayLabel(dayOfWeek) {
  if (dayOfWeek === null || dayOfWeek === undefined || dayOfWeek === '') {
    return 'Unknown';
  }
  const match = DAYS.find((day) => day.value === Number(dayOfWeek));
  return match ? match.label : 'Unknown';
}

function parseSkills(skillsText) {
  return String(skillsText || '')
    .split(/[,\n]+/)
    .map((skill) => skill.trim().toLowerCase())
    .filter(Boolean);
}

function friendlyError(error, fallback) {
  if (error && typeof error === 'object' && 'error' in error) {
    const maybe = error;
    const nested = maybe.error && maybe.error.error && maybe.error.error.message;
    const flat = maybe.error && maybe.error.message;
    return nested || flat || fallback;
  }
  return fallback;
}

module.exports = {
  DAYS,
  dayLabel,
  parseSkills,
  friendlyError
};
