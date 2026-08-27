import { CATEGORIES } from '../habits.js';
import { LEVELS, EQUIPMENT } from '../workouts.js';
import { todayISO } from '../dates.js';
import { update, exportJSON, resetProtocol } from '../store.js';
import { clearAllPhotos } from '../photos.js';
import { fmtDateHuman, addDaysISO, toast } from '../ui.js';
import { navigate } from '../router.js';

let weightDraft = null; // local draft while editing, committed on Save

function weightsCard(state){
  const weights = weightDraft || state.protocol.weights;
  const sum = CATEGORIES.reduce((a, c) => a + (Number(weights[c.key]) || 0), 0);
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Score weights</div>
      <p class="hint" style="margin-top:-6px;margin-bottom:14px">How much each category counts toward the Comeback Execution Score. Must add to 100.</p>
      ${CATEGORIES.map(c => `
        <div class="row between" style="padding:7px 0">
          <span class="small">${c.label}</span>
          <input type="number" min="0" max="100" data-weight="${c.key}" value="${weights[c.key]}" style="width:72px;text-align:right;padding:6px 8px">
        </div>
      `).join('')}
      <div class="row between hairline-block">
        <span class="small ${sum === 100 ? 'muted' : ''}" style="${sum !== 100 ? 'color:var(--warn)' : ''}">Total: ${sum}${sum !== 100 ? ' (must equal 100)' : ''}</span>
        <button class="btn btn-ghost btn-sm" id="save-weights" ${sum !== 100 ? 'disabled' : ''}>Save weights</button>
      </div>
    </div>
  `;
}

export function renderSettings(root, ctx){
  const { state } = ctx;
  const p = state.protocol;
  const endDate = addDaysISO(p.startDate, 59);

  root.innerHTML = `
    <div class="container">
      <div class="page-head"><h1>Settings</h1></div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Protocol</div>
        <div class="field"><label>Start date</label><input type="date" id="s-start" value="${p.startDate}"></div>
        <div class="row between"><span class="small muted">Target end date (Day 60)</span><span class="small">${fmtDateHuman(endDate)}</span></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Training</div>
        <div class="field"><label>Level</label><div class="chip-row">${LEVELS.map(l => `<button type="button" class="chip${p.workoutLevel===l.key?' on':''}" data-level="${l.key}">${l.label}</button>`).join('')}</div></div>
        <div class="field"><label>Equipment</label><div class="chip-row">${EQUIPMENT.map(e => `<button type="button" class="chip${p.equipment===e.key?' on':''}" data-equipment="${e.key}">${e.label}</button>`).join('')}</div></div>
        <div class="field mt-0"><label>Sleep target (hours)</label><input type="number" id="s-sleep" min="6" max="10" step="0.5" value="${p.sleepTargetHours}"></div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Display</div>
        <div class="row between" style="padding:6px 0">
          <span class="small">Theme</span>
          <div class="chip-row"><button type="button" class="chip${state.theme==='dark'?' on':''}" data-theme="dark">Dark</button><button type="button" class="chip${state.theme==='light'?' on':''}" data-theme="light">Light</button></div>
        </div>
        <div class="row between" style="padding:6px 0">
          <span class="small">Units</span>
          <div class="chip-row"><button type="button" class="chip${p.units==='metric'?' on':''}" data-units="metric">Metric</button><button type="button" class="chip${p.units==='imperial'?' on':''}" data-units="imperial">Imperial</button></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Reminder</div>
        <div class="row between" style="padding:6px 0">
          <span class="small">Daily nudge</span>
          <label class="switch"><input type="checkbox" id="s-reminder-on" ${state.reminders.enabled ? 'checked' : ''}><span class="track"><span class="knob"></span></span></label>
        </div>
        <div class="field mt-0"><label>Time</label><input type="time" id="s-reminder-time" value="${state.reminders.time}"></div>
        <p class="hint">Browser notification, only while this tab stays open — a static app with no server can't reliably push after you close it.</p>
      </div>

      ${weightsCard(state)}

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Habits</div>
        <button class="btn btn-ghost btn-block" id="go-habits">Manage custom habits →</button>
      </div>

      <div class="callout callout-info" style="margin-bottom:14px">
        Everything lives on this device — this browser's local storage and IndexedDB. Nothing is uploaded, no account exists, and photos are never used for anything but your own comparisons.
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Your data</div>
        <div class="stack">
          <button class="btn btn-ghost btn-block" id="export-data">Export all data (JSON)</button>
          <button class="btn btn-danger btn-block" id="delete-data">Delete all data</button>
          <button class="btn btn-danger btn-block" id="reset-protocol">Reset protocol (restart from Day 1)</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('s-start').addEventListener('change', e => update(s => { s.protocol.startDate = e.target.value; }));
  document.getElementById('s-sleep').addEventListener('change', e => update(s => { s.protocol.sleepTargetHours = Number(e.target.value) || 8.5; }));
  root.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => update(s => { s.protocol.workoutLevel = b.dataset.level; })));
  root.querySelectorAll('[data-equipment]').forEach(b => b.addEventListener('click', () => update(s => { s.protocol.equipment = b.dataset.equipment; })));
  root.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
    update(s => { s.theme = b.dataset.theme; }); // app.js applies data-theme on every render
  }));
  root.querySelectorAll('[data-units]').forEach(b => b.addEventListener('click', () => update(s => { s.protocol.units = b.dataset.units; })));

  document.getElementById('s-reminder-on').addEventListener('change', async e => {
    const enabled = e.target.checked;
    if (enabled && 'Notification' in window && Notification.permission === 'default'){
      await Notification.requestPermission();
    }
    update(s => { s.reminders.enabled = enabled; });
  });
  document.getElementById('s-reminder-time').addEventListener('change', e => update(s => { s.reminders.time = e.target.value; }));

  root.querySelectorAll('[data-weight]').forEach(input => input.addEventListener('input', () => {
    weightDraft = { ...(weightDraft || state.protocol.weights) };
    weightDraft[input.dataset.weight] = Number(input.value) || 0;
    renderSettings(root, ctx);
  }));
  const saveWeights = document.getElementById('save-weights');
  if (saveWeights) saveWeights.addEventListener('click', () => {
    update(s => { s.protocol.weights = weightDraft; });
    weightDraft = null;
    toast('Weights saved');
  });

  document.getElementById('go-habits').addEventListener('click', () => navigate('habits'));

  document.getElementById('export-data').addEventListener('click', () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `comeback60-export-${state.protocol.startDate}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Data exported — photos export separately from Progress → Photos');
  });

  document.getElementById('delete-data').addEventListener('click', async () => {
    if (!confirm('Delete everything — habits, days, closet, outfits and photos? This cannot be undone.')) return;
    await clearAllPhotos();
    resetProtocol();
    toast('All data deleted');
  });

  document.getElementById('reset-protocol').addEventListener('click', () => {
    if (!confirm("Restart the protocol from Day 1? Your logged history stays until you also delete data, but the day count and phase restart.")) return;
    update(s => { s.protocol.startDate = todayISO(); });
    toast('Protocol restarted at Day 1');
  });
}
