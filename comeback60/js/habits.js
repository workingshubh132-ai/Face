// Default task definitions — the daily Morning/Day/Night checklist — plus the
// category weights used everywhere else in the app. Pure data, no DOM.

export const CATEGORIES = [
  { key: 'appearance', label: 'Appearance', defaultWeight: 25 },
  { key: 'fitness',    label: 'Fitness',    defaultWeight: 20 },
  { key: 'grooming',   label: 'Grooming',   defaultWeight: 15 },
  { key: 'sleep',      label: 'Sleep',      defaultWeight: 15 },
  { key: 'posture',    label: 'Posture',    defaultWeight: 10 },
  { key: 'style',      label: 'Style',      defaultWeight: 5  },
  { key: 'presence',   label: 'Presence',   defaultWeight: 5  },
  { key: 'consistency',label: 'Consistency',defaultWeight: 5  }
];

export function defaultWeights(){
  return Object.fromEntries(CATEGORIES.map(c => [c.key, c.defaultWeight]));
}

// period drives which of the three Today cards a task renders under.
// Every id is stable — it is the join key against a day's completion map, so
// renaming a label later must never change the id.
export const DEFAULT_TASKS = [
  // Morning
  { id: 'wake-schedule',   period: 'morning', category: 'sleep',      label: 'Wake up on schedule' },
  { id: 'water-am',        period: 'morning', category: 'fitness',    label: 'Water' },
  { id: 'hygiene-am',      period: 'morning', category: 'grooming',   label: 'Basic hygiene (shower, deodorant)' },
  { id: 'cleanser-am',     period: 'morning', category: 'appearance', label: 'Gentle cleanser' },
  { id: 'moisturizer-am',  period: 'morning', category: 'appearance', label: 'Moisturizer' },
  { id: 'sunscreen-am',    period: 'morning', category: 'appearance', label: 'Sunscreen if heading outdoors' },
  { id: 'hair-am',         period: 'morning', category: 'appearance', label: 'Hair styling' },
  { id: 'grooming-check',  period: 'morning', category: 'grooming',   label: 'Facial grooming check' },
  { id: 'posture-am',      period: 'morning', category: 'posture',    label: 'Posture check' },
  { id: 'movement-am',     period: 'morning', category: 'fitness',    label: 'Quick movement (5–10 min)' },
  { id: 'priority-am',     period: 'morning', category: 'consistency',label: "Set today's one priority" },

  // Day
  { id: 'hydration-day',   period: 'day', category: 'fitness',     label: 'Stay hydrated through the day' },
  { id: 'activity-day',    period: 'day', category: 'fitness',     label: 'Stay active (steps, movement breaks)' },
  { id: 'posture-day',     period: 'day', category: 'posture',     label: 'Maintain posture' },
  { id: 'eating-day',      period: 'day', category: 'consistency', label: 'Eat normally and consistently' },
  { id: 'no-touching',     period: 'day', category: 'appearance',  label: 'Avoid unnecessary face touching / picking' },
  { id: 'workout-day',     period: 'day', category: 'fitness',     label: "Complete today's workout" },
  { id: 'productive-day',  period: 'day', category: 'consistency', label: 'Stay productive' },

  // Night
  { id: 'cleanser-pm',     period: 'night', category: 'appearance', label: 'Gentle cleanser' },
  { id: 'moisturizer-pm',  period: 'night', category: 'appearance', label: 'Moisturizer' },
  { id: 'hair-pm',         period: 'night', category: 'appearance', label: 'Hair care per schedule' },
  { id: 'oral-pm',         period: 'night', category: 'grooming',   label: 'Brush & floss' },
  { id: 'clothes-pm',      period: 'night', category: 'style',      label: "Prepare tomorrow's clothes" },
  { id: 'reset-pm',        period: 'night', category: 'consistency',label: '5-minute room reset' },
  { id: 'reflection-pm',   period: 'night', category: 'consistency',label: 'Progress reflection' },
  { id: 'sleep-pm',        period: 'night', category: 'sleep',      label: 'Sleep on time' }
];

export const PERIOD_LABELS = { morning: 'Morning', day: 'Day', night: 'Night' };

// Presence works as daily rotating challenges rather than nine fixed checkboxes
// every day — the full list stays available, but only two are "live" on any
// given day so Today doesn't turn into a wall of low-stakes checkboxes.
export const PRESENCE_CHALLENGES = [
  { id: 'p-posture',   label: 'Maintain better posture in conversation' },
  { id: 'p-clear',     label: 'Speak clearly, not rushed' },
  { id: 'p-eye',       label: 'Make natural eye contact' },
  { id: 'p-fidget',    label: 'Notice and stop fidgeting' },
  { id: 'p-walk',      label: 'Walk with intent, not rushed' },
  { id: 'p-listen',    label: 'Listen fully instead of interrupting' },
  { id: 'p-slow',      label: 'Speak slightly slower than feels natural' },
  { id: 'p-clean',     label: 'Keep clothes and grooming visibly clean today' },
  { id: 'p-intro',     label: 'Practice introducing yourself with confidence' }
];

export function presenceChallengesForDay(dayIndex){
  const n = PRESENCE_CHALLENGES.length;
  const a = PRESENCE_CHALLENGES[(dayIndex * 2) % n];
  let b = PRESENCE_CHALLENGES[(dayIndex * 2 + 1) % n];
  if (b.id === a.id) b = PRESENCE_CHALLENGES[(dayIndex * 2 + 2) % n];
  return [a, b];
}

// No-BS mode groups the full checklist into the 8 essentials it maps to.
// Checking a group toggles every underlying task together, so there is still
// only one source of truth — the day's task map — whichever view is open.
export function noBsGroups(dayIndex){
  const presence = presenceChallengesForDay(dayIndex).map(p => p.id);
  return [
    { id: 'nobs-sleep',     label: 'Sleep',     taskIds: ['wake-schedule', 'sleep-pm'] },
    { id: 'nobs-skin',      label: 'Skin',      taskIds: ['cleanser-am', 'moisturizer-am', 'sunscreen-am', 'cleanser-pm', 'moisturizer-pm'] },
    { id: 'nobs-grooming',  label: 'Grooming',  taskIds: ['hygiene-am', 'grooming-check', 'oral-pm'] },
    { id: 'nobs-workout',   label: 'Workout',   taskIds: ['movement-am', 'workout-day'] },
    { id: 'nobs-posture',   label: 'Posture',   taskIds: ['posture-am', 'posture-day'] },
    { id: 'nobs-hair',      label: 'Hair',      taskIds: ['hair-am', 'hair-pm'] },
    { id: 'nobs-hydration', label: 'Hydration', taskIds: ['water-am', 'hydration-day'] },
    { id: 'nobs-presence',  label: 'Presence',  taskIds: presence }
  ];
}
