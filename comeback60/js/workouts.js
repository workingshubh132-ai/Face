// Reasonable, beginner-safe templates only — no periodization engine, no
// 1RM math, no supplement stack. The goal per the brief is strength +
// athleticism + posture + energy + consistency, and a template a person will
// actually finish beats an optimal one they won't. Two levels × three
// equipment tiers = six templates, each with two alternating workout days so
// the same muscles are not hit back-to-back on a daily-checklist cadence.

export const LEVELS = [
  { key: 'beginner',     label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' }
];

export const EQUIPMENT = [
  { key: 'none',  label: 'No equipment' },
  { key: 'basic', label: 'Basic equipment (bands, dumbbells)' },
  { key: 'gym',   label: 'Full gym' }
];

function ex(name, scheme, note){
  return { name, scheme, note: note || '' };
}

export const WORKOUT_TEMPLATES = {
  'beginner-none': {
    label: 'Beginner · Bodyweight',
    days: [
      { id: 'A', name: 'Full Body A', exercises: [
        ex('Bodyweight squat', '3 × 12'),
        ex('Push-up (knees if needed)', '3 × 8–12'),
        ex('Glute bridge', '3 × 15'),
        ex('Plank', '3 × 20–30s'),
        ex('Standing march / step-ups', '2 × 20')
      ]},
      { id: 'B', name: 'Full Body B', exercises: [
        ex('Reverse lunge', '3 × 10 per leg'),
        ex('Incline push-up (hands on a surface)', '3 × 10'),
        ex('Superman hold', '3 × 15'),
        ex('Wall sit', '3 × 20–30s'),
        ex('Dead bug', '2 × 10 per side')
      ]}
    ]
  },
  'beginner-basic': {
    label: 'Beginner · Bands & Dumbbells',
    days: [
      { id: 'A', name: 'Full Body A', exercises: [
        ex('Goblet squat', '3 × 10'),
        ex('Dumbbell bench press or floor press', '3 × 10'),
        ex('Band or dumbbell row', '3 × 12'),
        ex('Dumbbell Romanian deadlift', '3 × 10'),
        ex('Plank', '3 × 30s')
      ]},
      { id: 'B', name: 'Full Body B', exercises: [
        ex('Dumbbell reverse lunge', '3 × 10 per leg'),
        ex('Dumbbell shoulder press', '3 × 10'),
        ex('Band pull-apart', '3 × 15'),
        ex('Dumbbell hip thrust', '3 × 12'),
        ex('Side plank', '2 × 20s per side')
      ]}
    ]
  },
  'beginner-gym': {
    label: 'Beginner · Gym',
    days: [
      { id: 'A', name: 'Full Body A', exercises: [
        ex('Leg press or goblet squat', '3 × 10'),
        ex('Chest press machine or bench press', '3 × 10'),
        ex('Lat pulldown', '3 × 10'),
        ex('Seated leg curl', '3 × 12'),
        ex('Cable crunch or plank', '3 × 12–15')
      ]},
      { id: 'B', name: 'Full Body B', exercises: [
        ex('Romanian deadlift (light)', '3 × 10'),
        ex('Shoulder press machine', '3 × 10'),
        ex('Seated cable row', '3 × 10'),
        ex('Walking lunge', '2 × 12 per leg'),
        ex('Face pull', '3 × 15')
      ]}
    ]
  },
  'intermediate-none': {
    label: 'Intermediate · Bodyweight',
    days: [
      { id: 'A', name: 'Full Body A', exercises: [
        ex('Bulgarian split squat', '3 × 10 per leg'),
        ex('Push-up, feet elevated', '4 × 10–15'),
        ex('Single-leg glute bridge', '3 × 12 per leg'),
        ex('Pike push-up', '3 × 8'),
        ex('Hollow body hold', '3 × 20–30s')
      ]},
      { id: 'B', name: 'Full Body B', exercises: [
        ex('Jump squat or tempo squat', '4 × 12'),
        ex('Archer push-up or diamond push-up', '3 × 8'),
        ex('Nordic curl negative or hamstring walkout', '3 × 8'),
        ex('Plank to push-up', '3 × 10'),
        ex('Side plank with reach', '3 × 10 per side')
      ]}
    ]
  },
  'intermediate-basic': {
    label: 'Intermediate · Bands & Dumbbells',
    days: [
      { id: 'A', name: 'Full Body A', exercises: [
        ex('Dumbbell front squat', '4 × 10'),
        ex('Dumbbell bench press', '4 × 10'),
        ex('Single-arm dumbbell row', '3 × 12 per side'),
        ex('Dumbbell Romanian deadlift', '3 × 10'),
        ex('Weighted plank', '3 × 30–40s')
      ]},
      { id: 'B', name: 'Full Body B', exercises: [
        ex('Dumbbell walking lunge', '3 × 12 per leg'),
        ex('Dumbbell arnold press', '3 × 10'),
        ex('Band face pull', '3 × 15'),
        ex('Dumbbell hip thrust', '4 × 10'),
        ex('Renegade row', '3 × 8 per side')
      ]}
    ]
  },
  'intermediate-gym': {
    label: 'Intermediate · Gym',
    days: [
      { id: 'A', name: 'Push / Legs A', exercises: [
        ex('Barbell or smith squat', '4 × 8'),
        ex('Bench press', '4 × 8'),
        ex('Overhead press', '3 × 10'),
        ex('Leg extension', '3 × 12'),
        ex('Cable crunch', '3 × 15')
      ]},
      { id: 'B', name: 'Pull / Legs B', exercises: [
        ex('Deadlift or Romanian deadlift', '3 × 6–8'),
        ex('Lat pulldown or pull-up', '4 × 8–10'),
        ex('Seated row', '3 × 10'),
        ex('Walking lunge', '3 × 12 per leg'),
        ex('Face pull', '3 × 15')
      ]}
    ]
  }
};

export function templateFor(level, equipment){
  return WORKOUT_TEMPLATES[`${level}-${equipment}`] || WORKOUT_TEMPLATES['beginner-none'];
}

// Alternates A/B by day index so consecutive workout days do not repeat —
// deterministic, not stored, so it needs no state of its own.
export function workoutDayFor(level, equipment, dayIndex){
  const t = templateFor(level, equipment);
  return t.days[dayIndex % t.days.length];
}

export const POSTURE_ROUTINE = [
  ex('Chin tucks', '2 × 10', 'Gently draw the chin back, hold a beat, release.'),
  ex('Wall slide', '2 × 10', 'Back and arms against a wall, slide arms up and down.'),
  ex('Doorway chest stretch', '2 × 20s per side'),
  ex('Cat–cow', '2 × 10'),
  ex('Glute bridge', '2 × 12', 'Weak glutes are a common driver of an anterior pelvic tilt.')
];
