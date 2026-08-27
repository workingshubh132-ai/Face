import { CATEGORIES } from '../habits.js';
import { isHabitDueOnDay, habitStreak } from '../scoring.js';
import { isoForDayIndex } from '../dates.js';
import { update } from '../store.js';
import { escapeHtml, toast } from '../ui.js';

let showAddForm = false;
let categoryFilter = 'all';

function habitRow(habit, ctx){
  const { state, dayIndex } = ctx;
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const dueToday = isHabitDueOnDay(habit, dayIndex);
  const doneToday = !!state.habitCompletions[habit.id]?.[iso];
  const streak = habitStreak(state, habit, dayIndex);
  const catLabel = CATEGORIES.find(c => c.key === habit.category)?.label || habit.category;
  const freqLabel = habit.frequency === 'daily' ? 'Daily' : habit.frequency === 'weekly' ? 'Weekly' : `Every ${habit.frequency.split('-')[1]} days`;

  return `
    <div class="card" style="margin-bottom:10px;${habit.paused ? 'opacity:0.55' : ''}">
      <div class="row between">
        <div>
          <div style="font-weight:600;font-size:0.92rem">${escapeHtml(habit.name)}</div>
          <div class="small muted" style="margin-top:2px">${escapeHtml(catLabel)} · ${freqLabel}${streak > 0 ? ` · 🔥 ${streak}` : ''}</div>
        </div>
        <div class="row" style="gap:6px;align-items:center">
          ${dueToday && !habit.paused ? `<button class="btn ${doneToday ? 'btn-ghost' : 'btn-primary'} btn-sm" data-toggle-habit="${habit.id}">${doneToday ? '✓ Done' : 'Mark done'}</button>` : ''}
          <button class="linkbtn small" data-pause-habit="${habit.id}">${habit.paused ? 'Resume' : 'Pause'}</button>
          <button class="linkbtn small" style="color:var(--danger)" data-delete-habit="${habit.id}">Delete</button>
        </div>
      </div>
    </div>
  `;
}

function addFormHTML(){
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">New habit</div>
      <div class="field"><label>Name</label><input type="text" id="h-name" placeholder="e.g. Cold shower, Read 10 pages"></div>
      <div class="grid grid-2">
        <div class="field"><label>Category</label>
          <select id="h-category">${CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Frequency</label>
          <select id="h-frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (opportunistic)</option>
            <option value="custom-2">Every 2 days</option>
            <option value="custom-3">Every 3 days</option>
            <option value="custom-7">Every 7 days</option>
            <option value="custom-14">Every 14 days</option>
          </select>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>Difficulty</label>
          <select id="h-difficulty"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select>
        </div>
        <div class="field"><label>Importance</label>
          <select id="h-importance"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="save-habit">Add habit</button>
    </div>
  `;
}

export function renderHabitsPage(root, ctx){
  const { state } = ctx;
  const filtered = categoryFilter === 'all' ? state.customHabits : state.customHabits.filter(h => h.category === categoryFilter);

  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <div class="row between">
          <h1>Habits</h1>
          <button class="btn btn-primary btn-sm" id="toggle-add">${showAddForm ? 'Close' : '+ New habit'}</button>
        </div>
        <p class="sub">Recurring habits beyond the daily checklist — the things easy to let slide because they're not every day.</p>
      </div>

      ${showAddForm ? addFormHTML() : ''}

      <div class="chip-row" style="margin-bottom:16px">
        <button type="button" class="chip${categoryFilter==='all'?' on':''}" data-filter="all">All</button>
        ${CATEGORIES.map(c => `<button type="button" class="chip${categoryFilter===c.key?' on':''}" data-filter="${c.key}">${c.label}</button>`).join('')}
      </div>

      ${filtered.length ? filtered.map(h => habitRow(h, ctx)).join('') : `<div class="empty">No custom habits yet${categoryFilter !== 'all' ? ' in this category' : ''}. Add one, or seed grooming maintenance reminders from Appearance.</div>`}
    </div>
  `;

  document.getElementById('toggle-add').addEventListener('click', () => { showAddForm = !showAddForm; renderHabitsPage(root, ctx); });
  root.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { categoryFilter = btn.dataset.filter; renderHabitsPage(root, ctx); }));

  const saveBtn = document.getElementById('save-habit');
  if (saveBtn) saveBtn.addEventListener('click', () => {
    const name = document.getElementById('h-name').value.trim();
    if (!name){ toast('Give the habit a name first'); return; }
    const category = document.getElementById('h-category').value;
    const frequency = document.getElementById('h-frequency').value;
    const difficulty = document.getElementById('h-difficulty').value;
    const importance = document.getElementById('h-importance').value;
    update(s => {
      s.customHabits.push({
        id: `h-${Date.now()}`, name, category, frequency, difficulty, importance,
        createdAt: Date.now(), createdAtDayIndex: ctx.dayIndex, paused: false
      });
    });
    showAddForm = false;
    toast('Habit added');
    renderHabitsPage(root, ctx);
  });

  const iso = isoForDayIndex(state.protocol.startDate, ctx.dayIndex);
  root.querySelectorAll('[data-toggle-habit]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.toggleHabit;
    update(s => {
      if (!s.habitCompletions[id]) s.habitCompletions[id] = {};
      s.habitCompletions[id][iso] = !s.habitCompletions[id][iso];
    });
  }));
  root.querySelectorAll('[data-pause-habit]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.pauseHabit;
    update(s => { const h = s.customHabits.find(x => x.id === id); if (h) h.paused = !h.paused; });
  }));
  root.querySelectorAll('[data-delete-habit]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('Delete this habit? Its history will be removed too.')) return;
    const id = btn.dataset.deleteHabit;
    update(s => {
      s.customHabits = s.customHabits.filter(h => h.id !== id);
      delete s.habitCompletions[id];
    });
  }));
}
