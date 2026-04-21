const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const DAY_LOOKUP = DAY_NAMES.reduce((acc, day, index) => {
  acc[day.toLowerCase()] = index;
  return acc;
}, {});

function dayName(dayOfWeek) {
  return DAY_NAMES[Number(dayOfWeek)] || 'Unknown';
}

function dayNumber(day) {
  if (typeof day === 'number') {
    return day >= 0 && day <= 6 ? day : undefined;
  }

  if (/^[0-6]$/.test(String(day || ''))) {
    return Number(day);
  }

  return DAY_LOOKUP[String(day || '').toLowerCase()];
}

function toMinutes(time) {
  if (!time) {
    return undefined;
  }

  const [hours, minutes] = String(time).slice(0, 5).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return undefined;
  }

  return hours * 60 + minutes;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const startA = toMinutes(aStart);
  const endA = toMinutes(aEnd);
  const startB = toMinutes(bStart);
  const endB = toMinutes(bEnd);

  if ([startA, endA, startB, endB].some((value) => value === undefined)) {
    return false;
  }

  return startA < endB && startB < endA;
}

function formatTime(time) {
  return String(time || '').slice(0, 5);
}

module.exports = {
  DAY_NAMES,
  dayName,
  dayNumber,
  overlaps,
  formatTime
};
