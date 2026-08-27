import { update, ensureDay } from '../store.js';
import { isoForDayIndex, weekRange } from '../dates.js';
import { taskConsistency, recoveryWarning, averageSleepHours, workoutsCompleted } from '../scoring.js';
import { LEVELS, EQUIPMENT, templateFor, workoutDayFor, POSTURE_ROUTINE } from '../workouts.js';
import { escapeHtml, sparkline, fmtPct } from '../ui.js';

let activeTab = 'workouts';

function workoutsTab(ctx){
  const { state, dayIndex } = ctx;
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const day = ensureDay(iso);
  const level = state.protocol.workoutLevel, equipment = state.protocol.equipment;
  const template = templateFor(level, equipment);
  const workout = workoutDayFor(level, equipment, dayIndex);
  const total = workoutsCompleted(state, dayIndex);

  return `
    <div class="grid grid-2" style="margin-bottom:14px">
      <div class="stat-tile accent"><div class="v">${total}</div><div class="l">TOTAL WORKOUTS LOGGED</div></div>
      <div class="stat-tile"><div class="v">${LEVELS.find(l=>l.key===level)?.label}</div><div class="l">${escapeHtml(EQUIPMENT.find(e=>e.key===equipment)?.label || '')}</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="row between" style="margin-bottom:6px">
        <div class="card-title" style="margin:0">Today · ${escapeHtml(workout.name)}</div>
        <span class="small muted">${escapeHtml(template.label)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem">
        ${workout.exercises.map(ex => `
          <tr style="border-bottom:1px solid var(--line-soft)">
            <td style="padding:9px 0">${escapeHtml(ex.name)}${ex.note ? `<div class="small muted">${escapeHtml(ex.note)}</div>` : ''}</td>
            <td style="padding:9px 0;text-align:right;white-space:nowrap;color:var(--text-dim)">${escapeHtml(ex.scheme)}</td>
          </tr>`).join('')}
      </table>
      <button class="btn ${day.workout.done ? 'btn-ghost' : 'btn-primary'} btn-block" id="workout-done" style="margin-top:14px">
        ${day.workout.done ? '✓ Marked done — tap to undo' : 'Mark today\'s workout done'}
      </button>
    </div>
    <div class="card">
      <div class="card-title">Change level / equipment</div>
      <div class="field"><label>Level</label>
        <div class="chip-row">${LEVELS.map(l => `<button type="button" class="chip${level===l.key?' on':''}" data-level="${l.key}">${l.label}</button>`).join('')}</div>
      </div>
      <div class="field mt-0"><label>Equipment</label>
        <div class="chip-row">${EQUIPMENT.map(e => `<button type="button" class="chip${equipment===e.key?' on':''}" data-equipment="${e.key}">${e.label}</button>`).join('')}</div>
      </div>
    </div>
  `;
}

function postureTab(ctx){
  const { state, dayIndex } = ctx;
  const c = taskConsistency(state, ['posture-am', 'posture-day'], dayIndex, 14);
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Consistency — last 14 days</div>
      <div class="row between"><span class="small">Posture checks completed</span><span class="small muted">${c.done}/${c.total} · ${fmtPct(c.pct)}</span></div>
      <div class="bar-track" style="margin-top:10px"><div class="bar-fill" style="width:${c.pct}%"></div></div>
    </div>
    <div class="card">
      <div class="card-title">Daily mobility routine</div>
      <table style="width:100%;border-collapse:collapse;font-size:0.86rem">
        ${POSTURE_ROUTINE.map(ex => `
          <tr style="border-bottom:1px solid var(--line-soft)">
            <td style="padding:9px 0">${escapeHtml(ex.name)}${ex.note ? `<div class="small muted">${escapeHtml(ex.note)}</div>` : ''}</td>
            <td style="padding:9px 0;text-align:right;white-space:nowrap;color:var(--text-dim)">${escapeHtml(ex.scheme)}</td>
          </tr>`).join('')}
      </table>
      <p class="hint">This improves posture and how you carry yourself — it does not change bone structure. Real, visible, and worth doing; not a magic fix.</p>
    </div>
  `;
}

function recoveryTab(ctx){
  const { state, dayIndex } = ctx;
  const { start } = weekRange(Math.ceil(dayIndex / 7));
  const values = [];
  for (let d = start; d <= dayIndex; d++){
    const iso = isoForDayIndex(state.protocol.startDate, d);
    values.push((state.days[iso]?.sleep?.hours || 0) / (state.protocol.sleepTargetHours || 8.5) * 100);
  }
  const avg = averageSleepHours(state, dayIndex);
  const rec = recoveryWarning(state, dayIndex);
  return `
    ${rec.warning ? `<div class="callout callout-warn" style="margin-bottom:14px"><b>RECOVERY WARNING.</b> ${rec.avgHours}h average against an ${rec.target}h target — today's plan should be lighter, not the same intensity.</div>` : ''}
    <div class="card" style="margin-bottom:14px">
      <div class="row between" style="margin-bottom:8px">
        <div class="card-title" style="margin:0">This week's sleep</div>
        <span class="small muted">${avg != null ? `${avg}h avg` : 'no data yet'}</span>
      </div>
      ${sparkline(values, { w: 300, h: 60 })}
      <p class="hint">Target: ${state.protocol.sleepTargetHours}h. Logged from Today's "Last night's sleep" card.</p>
    </div>
    <div class="callout callout-info">
      Sleep is scored, never sacrificed for streaks. If your average keeps dropping, the app will flag it here and on Home rather than reward pushing through.
    </div>
  `;
}

const TABS = { workouts: workoutsTab, posture: postureTab, recovery: recoveryTab };

export function renderFitness(root, ctx){
  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1>Fitness</h1>
        <p class="sub">Strength, posture and recovery — consistency over intensity.</p>
      </div>
      <div class="chip-row" style="margin-bottom:16px">
        ${Object.keys(TABS).map(t => `<button type="button" class="chip${activeTab===t?' on':''}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
      </div>
      <div id="tab-body">${TABS[activeTab](ctx)}</div>
    </div>
  `;

  root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    renderFitness(root, ctx);
  }));

  const iso = isoForDayIndex(ctx.state.protocol.startDate, ctx.dayIndex);
  const doneBtn = document.getElementById('workout-done');
  if (doneBtn) doneBtn.addEventListener('click', () => {
    update(s => {
      const d = ensureDay(iso);
      d.workout.done = !d.workout.done;
      d.tasks['workout-day'] = d.workout.done;
    });
  });
  root.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => {
    update(s => { s.protocol.workoutLevel = btn.dataset.level; });
  }));
  root.querySelectorAll('[data-equipment]').forEach(btn => btn.addEventListener('click', () => {
    update(s => { s.protocol.equipment = btn.dataset.equipment; });
  }));
}
