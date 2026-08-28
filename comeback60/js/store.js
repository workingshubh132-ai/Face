// Single source of truth. Everything lives in localStorage as one JSON blob —
// this app has no server, by design: a 90-day personal log is nobody's
// business but the person running it, and that only holds if nothing ever
// leaves the device. Photo binary data lives in IndexedDB instead (photos.js)
// since localStorage is a poor fit for large blobs, but it is described in
// the same state shape so the rest of the app never has to know the split.

const STORAGE_KEY = 'comeback60_state_v1';
const STATE_VERSION = 1;

import { defaultWeights } from './habits.js';
import { todayISO } from './dates.js';

function freshState(){
  return {
    version: STATE_VERSION,
    onboarded: false,
    createdAt: todayISO(),
    protocol: {
      startDate: null,
      priorities: [],           // ordered subset of the 10 priority keys
      workoutLevel: 'beginner', // 'beginner' | 'intermediate'
      equipment: 'none',        // 'none' | 'basic' | 'gym'
      sleepTargetHours: 8.5,
      weights: defaultWeights(),
      units: 'metric'           // 'metric' | 'imperial'
    },
    noBsMode: false,
    theme: 'dark',
    // days[YYYY-MM-DD] = { tasks:{id:bool}, presenceIds:[id,id], workout:{done,templateId,note}, sleep:{bedtime,waketime,hours,quality}, notes, photoIds:[] }
    days: {},
    customHabits: [],
    // habitCompletions[habitId][YYYY-MM-DD] = true
    habitCompletions: {},
    closet: [],   // { id, category, color, fit, style, formality, clean, notes, photoId, createdAt }
    outfits: [],  // { id, name, itemIds:{top,bottom,shoes,outer,accessory}, occasion, createdAt, lastScore }
    hair: { current: '', desired: '', haircutDate: null, products: '', notes: '' },
    glasses: { frameShape: '', frameColor: '', frameWidthMm: null, faceWidthMm: null, notes: '' },
    weeklyReviews: [], // { week, generatedAt, snapshot }
    finalReport: null,
    reminders: { enabled: false, time: '21:00' }
  };
}

function migrate(raw){
  // Only one version exists today; this is the seam future versions hang off.
  if (!raw || typeof raw !== 'object') return freshState();
  if (raw.version === STATE_VERSION) return raw;
  return { ...freshState(), ...raw, version: STATE_VERSION };
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    return migrate(JSON.parse(raw));
  }catch(err){
    console.warn('Could not read saved protocol data — starting fresh.', err);
    return freshState();
  }
}

let state = load();
const listeners = new Set();

function persist(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(err){
    console.error('Could not save — your browser storage may be full or blocked.', err);
  }
}

export function getState(){
  return state;
}

// Every mutation goes through here: apply a producer function against a
// shallow-cloned top level, persist, then notify. Callers mutate nested
// objects directly inside the producer (simple, and safe because there is
// exactly one writer — the page itself, no concurrent tabs assumed).
export function update(producer){
  producer(state);
  persist();
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn){
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function ensureDay(iso){
  if (!state.days[iso]){
    state.days[iso] = { tasks: {}, presenceIds: [], workout: { done: false, templateId: null, note: '' }, sleep: { bedtime: '', waketime: '', hours: null, quality: null }, skin: { rating: null }, notes: '', photoIds: [] };
  }
  // A day created before the skin-rating feature existed has no `skin` key
  // at all — backfill it here rather than making every reader defend
  // against a missing nested object.
  if (!state.days[iso].skin) state.days[iso].skin = { rating: null };
  return state.days[iso];
}

export function resetProtocol(){
  update(s => {
    const kept = { theme: s.theme, reminders: s.reminders };
    Object.assign(s, freshState(), kept);
  });
}

export function exportJSON(){
  return JSON.stringify(state, null, 2);
}

export function importJSON(json){
  const parsed = migrate(JSON.parse(json));
  update(s => Object.assign(s, parsed));
}
