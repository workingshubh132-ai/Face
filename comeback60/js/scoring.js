// All scoring, streaks, and the "smart adaptation" recommendations are pure
// functions of (days, weights, dayIndex) — no DOM, no storage — so they can
// be tested head-on in Node the same way Skinprint's classifier is tested.

import { DEFAULT_TASKS, CATEGORIES, presenceChallengesForDay } from './habits.js';
import { isoForDayIndex, phaseForDay, weekRange } from './dates.js';

export const STREAK_THRESHOLD = 60; // "adequately executed" day, not "perfect"
export const WEAK_THRESHOLD = 50;
export const STRONG_THRESHOLD = 70;

function emptyDay(){
  return { tasks: {}, presenceIds: [], workout: { done: false }, sleep: { hours: null }, photoIds: [] };
}

// Cadence is anchored to createdAtDayIndex — the protocol day the habit was
// added on — never to wall-clock time. Deriving "day created" from
// Date.now() - h.createdAt would give a different answer depending on
// *when* this function happens to run relative to *when* it's asked to
// score (e.g. computing a past week's review today), instead of a fixed
// fact about the habit itself.
function isHabitDueOnDay(h, dayIndex){
  if (h.paused) return false;
  if (h.frequency === 'daily') return true;
  if (h.frequency === 'weekly') return true; // due all week; completion is opportunistic, counted below
  if (typeof h.frequency === 'string' && h.frequency.startsWith('custom-')){
    const n = Number(h.frequency.split('-')[1]) || 1;
    const created = h.createdAtDayIndex || 1;
    return dayIndex >= created && (dayIndex - created) % n === 0;
  }
  return false;
}

function dueCustomHabitsForDay(customHabits, iso, dayIndex){
  return (customHabits || []).filter(h => isHabitDueOnDay(h, dayIndex));
}

export { isHabitDueOnDay };

// Consecutive due-and-completed occurrences, walking back from uptoDayIndex.
// A day the habit was not due does not count for or against the streak.
export function habitStreak(state, habit, uptoDayIndex){
  let streak = 0;
  for (let d = uptoDayIndex; d >= 1; d--){
    if (!isHabitDueOnDay(habit, d)) continue;
    const iso = isoForDayIndex(state.protocol.startDate, d);
    const done = !!state.habitCompletions?.[habit.id]?.[iso];
    if (done) streak++;
    else break;
  }
  return streak;
}

// Per-category { done, total } for one day, folding in presence challenges and
// any custom habits due that day. A category with zero possible tasks is
// simply absent from the map — callers must not assume every key exists.
export function dailyCategoryTotals(dayRecord, dayIndex, customHabits, habitCompletions, iso){
  const day = dayRecord || emptyDay();
  const totals = {};
  const bump = (cat, done) => {
    if (!totals[cat]) totals[cat] = { done: 0, total: 0 };
    totals[cat].total++;
    if (done) totals[cat].done++;
  };

  for (const t of DEFAULT_TASKS) bump(t.category, !!day.tasks[t.id]);

  const presence = presenceChallengesForDay(dayIndex);
  for (const p of presence) bump('presence', !!day.tasks[p.id]);

  for (const h of dueCustomHabitsForDay(customHabits, iso, dayIndex)){
    const done = !!(habitCompletions?.[h.id]?.[iso]);
    bump(h.category, done);
  }

  return totals;
}

export function categoryPct(totals, catKey){
  const t = totals[catKey];
  if (!t || t.total === 0) return null;
  return Math.round((t.done / t.total) * 100);
}

export function dailyOverallPct(totals){
  let done = 0, total = 0;
  for (const cat of Object.values(totals)){ done += cat.done; total += cat.total; }
  return total ? Math.round((done / total) * 100) : 0;
}

// The weighted "Comeback Execution Score" for one day — renormalized over
// only the categories that actually had a task that day, so a category with
// nothing due never silently drags the score toward zero.
export function weightedDayScore(totals, weights){
  let weightedSum = 0, weightTotal = 0;
  for (const cat of CATEGORIES){
    const pct = categoryPct(totals, cat.key);
    if (pct === null) continue;
    const w = weights[cat.key] ?? cat.defaultWeight;
    weightedSum += pct * w;
    weightTotal += w;
  }
  return weightTotal ? Math.round(weightedSum / weightTotal) : 0;
}

function totalsForDayIndex(state, dayIndex){
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const day = state.days[iso];
  return dailyCategoryTotals(day, dayIndex, state.customHabits, state.habitCompletions, iso);
}

// A day the user has not reached yet is excluded, not scored zero. A day
// already lived with nothing logged IS scored zero — that is the honest
// number, not a penalty invented by the app.
export function scoreHistory(state, uptoDayIndex){
  const scores = [];
  for (let d = 1; d <= uptoDayIndex; d++){
    scores.push({ day: d, score: weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights) });
  }
  return scores;
}

export function comebackExecutionScore(state, currentDayIndex){
  const history = scoreHistory(state, currentDayIndex);
  if (!history.length) return 0;
  const sum = history.reduce((a, h) => a + h.score, 0);
  return Math.round(sum / history.length);
}

export function currentStreak(state, currentDayIndex){
  let streak = 0;
  for (let d = currentDayIndex; d >= 1; d--){
    const score = weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights);
    if (score >= STREAK_THRESHOLD) streak++;
    else break;
  }
  return streak;
}

export function longestStreak(state, uptoDayIndex){
  let longest = 0, run = 0;
  for (let d = 1; d <= uptoDayIndex; d++){
    const score = weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights);
    if (score >= STREAK_THRESHOLD){ run++; longest = Math.max(longest, run); }
    else run = 0;
  }
  return longest;
}

export function perfectDaysCount(state, uptoDayIndex){
  let count = 0;
  for (let d = 1; d <= uptoDayIndex; d++){
    if (weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights) >= 95) count++;
  }
  return count;
}

export function weeklyConsistency(state, currentDayIndex){
  const { start } = weekRange(Math.ceil(currentDayIndex / 7));
  const days = [];
  for (let d = start; d <= currentDayIndex; d++) days.push(weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights));
  if (!days.length) return 0;
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length);
}

// Recent vs. prior 7-day window per category, to find real momentum rather
// than a single noisy day. Falls back gracefully near the start of the
// protocol when a full prior window does not exist yet.
export function categoryTrend(state, currentDayIndex){
  const recentStart = Math.max(1, currentDayIndex - 6);
  const priorEnd = recentStart - 1;
  const priorStart = Math.max(1, priorEnd - 6);

  const sumTotals = (from, to) => {
    const acc = {};
    for (let d = from; d <= to; d++){
      const t = totalsForDayIndex(state, d);
      for (const [cat, v] of Object.entries(t)){
        if (!acc[cat]) acc[cat] = { done: 0, total: 0 };
        acc[cat].done += v.done; acc[cat].total += v.total;
      }
    }
    return acc;
  };

  const recent = sumTotals(recentStart, currentDayIndex);
  const prior = priorEnd >= priorStart ? sumTotals(priorStart, priorEnd) : null;

  return CATEGORIES.map(cat => {
    const recentPct = categoryPct(recent, cat.key);
    const priorPct = prior ? categoryPct(prior, cat.key) : null;
    return {
      key: cat.key,
      label: cat.label,
      recentPct: recentPct ?? 0,
      priorPct,
      delta: (recentPct !== null && priorPct !== null) ? recentPct - priorPct : null
    };
  });
}

const RECOMMENDATION_BY_CATEGORY = {
  appearance:  'Keep skin and hair routines on schedule',
  fitness:     'Protect the workout slot — even a short session counts',
  grooming:    'Reset the grooming basics: nails, facial hair, oral care',
  sleep:       'Fix bedtime before anything else this week',
  posture:     'Add a posture check to something you already do hourly',
  style:       'Lay out 2–3 outfits in advance so mornings are not a decision',
  presence:    "Pick one presence challenge and actually notice yourself doing it",
  consistency: 'Lower the bar until it is unmissable, then rebuild from there'
};

export function adaptationInsights(state, currentDayIndex){
  const trend = categoryTrend(state, currentDayIndex);
  const sorted = [...trend].sort((a, b) => a.recentPct - b.recentPct);
  const weakest = sorted[0];
  const strongest = [...trend].sort((a, b) => b.recentPct - a.recentPct)[0];

  const whatChanged = trend.filter(c => c.recentPct >= STRONG_THRESHOLD).sort((a, b) => b.recentPct - a.recentPct);
  const whatsHoldingBack = trend.filter(c => c.recentPct < WEAK_THRESHOLD).sort((a, b) => a.recentPct - b.recentPct);

  const focusCategories = (whatsHoldingBack.length ? whatsHoldingBack : sorted).slice(0, 3);
  const next7Days = focusCategories.map(c => RECOMMENDATION_BY_CATEGORY[c.key]).filter(Boolean);

  return {
    trend,
    biggestWeakness: weakest,
    biggestImprovement: strongest,
    whatChanged,
    whatsHoldingBack,
    next7Days,
    phase: phaseForDay(currentDayIndex)
  };
}

// Sustained short sleep should lower the bar, not just get flagged — this is
// the one place scoring logic reaches into "what should today ask of you".
export function recoveryWarning(state, currentDayIndex){
  const target = state.protocol.sleepTargetHours || 8.5;
  const window = 3;
  const from = Math.max(1, currentDayIndex - (window - 1));
  let sum = 0, n = 0;
  for (let d = from; d <= currentDayIndex; d++){
    const iso = isoForDayIndex(state.protocol.startDate, d);
    const hours = state.days[iso]?.sleep?.hours;
    if (typeof hours === 'number'){ sum += hours; n++; }
  }
  if (n < 2) return { warning: false };
  const avg = sum / n;
  return avg <= target - 1.5
    ? { warning: true, avgHours: Math.round(avg * 10) / 10, target }
    : { warning: false, avgHours: Math.round(avg * 10) / 10, target };
}

// Consistency for one or more specific task ids over a trailing window —
// used by the Appearance/Grooming views to show e.g. "sunscreen: 9/14 days"
// without re-deriving a whole category rollup for a handful of tasks.
export function taskConsistency(state, taskIds, uptoDayIndex, windowDays){
  const from = Math.max(1, uptoDayIndex - (windowDays - 1));
  let done = 0, total = 0;
  for (let d = from; d <= uptoDayIndex; d++){
    const iso = isoForDayIndex(state.protocol.startDate, d);
    const day = state.days[iso];
    for (const id of taskIds){
      total++;
      if (day?.tasks?.[id]) done++;
    }
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function workoutsCompleted(state, uptoDayIndex){
  let n = 0;
  for (let d = 1; d <= uptoDayIndex; d++){
    const iso = isoForDayIndex(state.protocol.startDate, d);
    if (state.days[iso]?.workout?.done) n++;
  }
  return n;
}

export function averageSleepHours(state, uptoDayIndex){
  let sum = 0, n = 0;
  for (let d = 1; d <= uptoDayIndex; d++){
    const iso = isoForDayIndex(state.protocol.startDate, d);
    const h = state.days[iso]?.sleep?.hours;
    if (typeof h === 'number'){ sum += h; n++; }
  }
  return n ? Math.round((sum / n) * 10) / 10 : null;
}

export function habitsCompletedTotal(state, uptoDayIndex){
  let n = 0;
  for (let d = 1; d <= uptoDayIndex; d++){
    const t = totalsForDayIndex(state, d);
    for (const cat of Object.values(t)) n += cat.done;
  }
  return n;
}

export function weeklyReview(state, weekNumber){
  const { start, end } = weekRange(weekNumber);
  const scores = [];
  for (let d = start; d <= end; d++) scores.push(weightedDayScore(totalsForDayIndex(state, d), state.protocol.weights));
  const completionPct = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const trend = categoryTrend({ ...state }, end);
  const strongest = [...trend].sort((a, b) => b.recentPct - a.recentPct)[0];
  const weakest = [...trend].sort((a, b) => a.recentPct - b.recentPct)[0];

  return {
    week: weekNumber,
    range: { start, end },
    completionPct,
    strongestCategory: strongest,
    weakestCategory: weakest,
    streak: currentStreak(state, end),
    workouts: workoutsCompleted(state, end) - workoutsCompleted(state, start - 1),
    sleepAvg: averageSleepHours(state, end),
    appearancePct: categoryPct(totalsAcrossRange(state, start, end), 'appearance'),
    groomingPct: categoryPct(totalsAcrossRange(state, start, end), 'grooming'),
    posturePct: categoryPct(totalsAcrossRange(state, start, end), 'posture'),
    biggestWin: strongest,
    biggestFailure: weakest,
    nextWeekFocus: adaptationInsights(state, end).next7Days
  };
}

function totalsAcrossRange(state, from, to){
  const acc = {};
  for (let d = from; d <= to; d++){
    const t = totalsForDayIndex(state, d);
    for (const [cat, v] of Object.entries(t)){
      if (!acc[cat]) acc[cat] = { done: 0, total: 0 };
      acc[cat].done += v.done; acc[cat].total += v.total;
    }
  }
  return acc;
}

export function finalReport(state, uptoDayIndex){
  const day1 = weightedDayScore(totalsForDayIndex(state, 1), state.protocol.weights);
  const dayFinal = weightedDayScore(totalsForDayIndex(state, uptoDayIndex), state.protocol.weights);
  const trend = categoryTrend(state, uptoDayIndex);
  const strongest = [...trend].sort((a, b) => (b.delta ?? b.recentPct) - (a.delta ?? a.recentPct)).slice(0, 3);
  const weakest = [...trend].sort((a, b) => a.recentPct - b.recentPct).slice(0, 3);

  return {
    startScore: day1,
    finalScore: dayFinal,
    improvementPct: day1 > 0 ? Math.round(((dayFinal - day1) / day1) * 100) : (dayFinal > 0 ? 100 : 0),
    overallScore: comebackExecutionScore(state, uptoDayIndex),
    strongestImprovements: strongest,
    weakestAreas: weakest,
    habitsCompleted: habitsCompletedTotal(state, uptoDayIndex),
    totalWorkouts: workoutsCompleted(state, uptoDayIndex),
    averageSleep: averageSleepHours(state, uptoDayIndex),
    longestStreak: longestStreak(state, uptoDayIndex),
    perfectDays: perfectDaysCount(state, uptoDayIndex),
    next90DayFocus: weakest.map(c => RECOMMENDATION_BY_CATEGORY[c.key]).filter(Boolean)
  };
}
