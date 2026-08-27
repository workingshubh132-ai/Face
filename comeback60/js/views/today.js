import { DEFAULT_TASKS, PERIOD_LABELS, presenceChallengesForDay, noBsGroups } from '../habits.js';
import { dailyCategoryTotals, dailyOverallPct } from '../scoring.js';
import { isoForDayIndex, phaseForDay } from '../dates.js';
import { ensureDay, update } from '../store.js';
import { escapeHtml, checkRow, fmtPct } from '../ui.js';
import { templateFor, workoutDayFor } from '../workouts.js';

function sleepHoursFrom(bedtime, waketime){
  if (!bedtime || !waketime) return null;
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = waketime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // slept past midnight
  return Math.round((mins / 60) * 10) / 10;
}

export function renderToday(root, ctx){
  const { state, dayIndex } = ctx;
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const day = ensureDay(iso); // reading only here; ensureDay does not mark dirty until update() persists
  const phase = phaseForDay(dayIndex);
  const totals = dailyCategoryTotals(day, dayIndex, state.customHabits, state.habitCompletions, iso);
  const pct = dailyOverallPct(totals);
  const presence = presenceChallengesForDay(dayIndex);

  const workout = workoutDayFor(state.protocol.workoutLevel, state.protocol.equipment, dayIndex);
  const templateLabel = templateFor(state.protocol.workoutLevel, state.protocol.equipment).label;

  const periods = ['morning', 'day', 'night'];

  const noBsBody = () => {
    const groups = noBsGroups(dayIndex);
    const doneCount = groups.filter(g => g.taskIds.every(id => day.tasks[id])).length;
    return `
      <div class="card center" style="margin-bottom:14px">
        <div class="num" style="font-size:2rem;font-weight:700">${doneCount}/${groups.length}</div>
        <div class="label">COMPLETE</div>
      </div>
      <div class="card">
        ${groups.map(g => checkRow(g.id, g.label, g.taskIds.every(id => day.tasks[id]), 'data-nobs')).join('')}
      </div>
    `;
  };

  const fullBody = () => `
    <div class="card" style="margin-bottom:14px">
      <div class="row between" style="margin-bottom:10px">
        <div class="card-title" style="margin:0">Last night's sleep</div>
      </div>
      <div class="grid grid-2" style="margin-bottom:10px">
        <div class="field mt-0"><label>Bedtime</label><input type="time" id="bedtime" value="${escapeHtml(day.sleep.bedtime || '')}"></div>
        <div class="field mt-0"><label>Wake time</label><input type="time" id="waketime" value="${escapeHtml(day.sleep.waketime || '')}"></div>
      </div>
      <div class="row between">
        <span class="small muted">${day.sleep.hours != null ? `${day.sleep.hours}h logged` : 'Log both times to calculate hours'}</span>
        <div class="chip-row">
          ${[1,2,3,4,5].map(q => `<button type="button" class="chip${day.sleep.quality===q?' on':''}" data-quality="${q}" style="padding:5px 11px">${q}</button>`).join('')}
        </div>
      </div>
    </div>

    ${periods.map(period => `
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">${PERIOD_LABELS[period]}</div>
        ${DEFAULT_TASKS.filter(t => t.period === period).map(t => checkRow(t.id, t.label, !!day.tasks[t.id])).join('')}
        ${period === 'day' ? `<div class="hairline-block small muted">Today's workout: <b style="color:var(--text)">${escapeHtml(workout.name)}</b> (${escapeHtml(templateLabel)}) — see Fitness for the full list.</div>` : ''}
      </div>
    `).join('')}

    <div class="card">
      <div class="card-title">Presence — today's two</div>
      ${presence.map(p => checkRow(p.id, p.label, !!day.tasks[p.id])).join('')}
    </div>
  `;

  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <div class="row between">
          <h1>Today</h1>
          <label class="row" style="gap:8px;align-items:center">
            <span class="small muted">No-BS mode</span>
            <span class="switch"><input type="checkbox" id="nobs-toggle" ${state.noBsMode ? 'checked' : ''}><span class="track"><span class="knob"></span></span></span>
          </label>
        </div>
        <p class="sub">Day ${dayIndex} · ${escapeHtml(phase.name)} phase · ${fmtPct(pct)} complete</p>
        <div class="bar-track" style="margin-top:10px"><div class="bar-fill" data-pct="${pct}" style="width:${pct}%"></div></div>
      </div>

      ${state.noBsMode ? noBsBody() : fullBody()}
    </div>
  `;

  document.getElementById('nobs-toggle').addEventListener('change', e => {
    update(s => { s.noBsMode = e.target.checked; });
  });

  root.querySelectorAll('[data-task]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.task;
      update(s => {
        const d = ensureDay(iso);
        d.tasks[id] = !d.tasks[id];
        // Keep the Fitness page's workout.done flag in lockstep — it is the
        // same fact ("did today's workout happen") shown in two places, and
        // the two must never be able to disagree with each other.
        if (id === 'workout-day') d.workout.done = d.tasks[id];
      });
    });
  });

  root.querySelectorAll('[data-nobs]').forEach(row => {
    row.addEventListener('click', () => {
      const groups = noBsGroups(dayIndex);
      const group = groups.find(g => g.id === row.dataset.nobs);
      const allDone = group.taskIds.every(id => day.tasks[id]);
      update(s => {
        const d = ensureDay(iso);
        group.taskIds.forEach(id => { d.tasks[id] = !allDone; });
      });
    });
  });

  const bedtimeEl = document.getElementById('bedtime');
  const waketimeEl = document.getElementById('waketime');
  if (bedtimeEl) bedtimeEl.addEventListener('change', e => {
    update(s => {
      const d = ensureDay(iso);
      d.sleep.bedtime = e.target.value;
      d.sleep.hours = sleepHoursFrom(d.sleep.bedtime, d.sleep.waketime);
    });
  });
  if (waketimeEl) waketimeEl.addEventListener('change', e => {
    update(s => {
      const d = ensureDay(iso);
      d.sleep.waketime = e.target.value;
      d.sleep.hours = sleepHoursFrom(d.sleep.bedtime, d.sleep.waketime);
    });
  });
  root.querySelectorAll('[data-quality]').forEach(btn => btn.addEventListener('click', () => {
    update(s => { ensureDay(iso).sleep.quality = Number(btn.dataset.quality); });
  }));
}
