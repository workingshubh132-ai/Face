// Pure date/phase/milestone math — no DOM, no storage. Kept isolated so it can
// be unit-tested directly in Node without a browser, the same way Skinprint's
// scoring functions are tested.

export const PROTOCOL_LENGTH = 90;

export const PHASES = [
  { key: 'reset',      name: 'Reset',       start: 1,  end: 10, goal: 'Establish baseline and remove bad habits.' },
  { key: 'foundation', name: 'Foundation',  start: 11, end: 30, goal: 'Make the system automatic. Not dramatic change yet — consistency.' },
  { key: 'upgrade',    name: 'Upgrade',     start: 31, end: 63, goal: 'Progressive difficulty. Improve the hairstyle, wardrobe, fitness, posture and presence.' },
  { key: 'polish',     name: 'Polish',      start: 64, end: 83, goal: 'Everything becomes cleaner and more intentional.' },
  { key: 'final',      name: 'Final Form',  start: 84, end: 90, goal: 'Compare Day 1 to Day 90 and generate the Comeback Report.' }
];

export const MILESTONES = [
  { day: 1,  label: 'Baseline' },
  { day: 10, label: 'Routine established' },
  { day: 21, label: 'Consistency checkpoint' },
  { day: 30, label: 'One month' },
  { day: 45, label: 'Midpoint' },
  { day: 63, label: 'Upgrade phase complete' },
  { day: 75, label: 'Polish checkpoint' },
  { day: 84, label: 'Final stretch' },
  { day: 90, label: 'Transformation review' }
];

export const PHOTO_SCHEDULE_DAYS = [1, 7, 14, 21, 30, 42, 54, 66, 78, 90];

function toUTCDate(iso){
  // Parsed as UTC midnight so a day boundary never shifts with the viewer's
  // timezone — a protocol started in Mumbai should count the same days for
  // someone checking in from a different timezone on the same device.
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 1-based day number. Day 1 is the start date itself. Never negative or zero —
// a device clock set before the start date still reads as Day 1, not Day 0.
export function dayIndexFor(dateISO, startISO){
  const diff = Math.round((toUTCDate(dateISO) - toUTCDate(startISO)) / 86400000);
  return Math.max(1, diff + 1);
}

export function isoForDayIndex(startISO, dayIndex){
  const ms = toUTCDate(startISO) + (dayIndex - 1) * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

export function phaseForDay(dayIndex){
  const clamped = Math.min(Math.max(dayIndex, 1), PROTOCOL_LENGTH);
  return PHASES.find(p => clamped >= p.start && clamped <= p.end) || PHASES[PHASES.length - 1];
}

export function daysRemaining(dayIndex){
  return Math.max(0, PROTOCOL_LENGTH - dayIndex);
}

// Strictly greater than: standing exactly on a milestone day should point at
// the *following* one, not repeat the milestone already reached.
export function nextMilestone(dayIndex){
  return MILESTONES.find(m => m.day > dayIndex) || null;
}

export function isProtocolComplete(dayIndex){
  return dayIndex > PROTOCOL_LENGTH;
}

// Which week (1-indexed) a day belongs to, for weekly-review boundaries —
// review N covers days [(N-1)*7+1 .. N*7].
export function weekOfDay(dayIndex){
  return Math.ceil(dayIndex / 7);
}

export function weekRange(weekNumber){
  const start = (weekNumber - 1) * 7 + 1;
  return { start, end: Math.min(start + 6, PROTOCOL_LENGTH) };
}

// A review is "due" the day after a week closes (day 8 triggers week 1's
// review), and only once — the caller tracks which weeks have been generated.
export function completedWeeksAsOf(dayIndex){
  const full = Math.floor((dayIndex - 1) / 7);
  return full;
}

export function isPhotoScheduleDay(dayIndex){
  return PHOTO_SCHEDULE_DAYS.includes(dayIndex);
}

export function nextPhotoDay(dayIndex){
  return PHOTO_SCHEDULE_DAYS.find(d => d >= dayIndex) || null;
}
