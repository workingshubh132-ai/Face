import { CATEGORIES, defaultWeights } from '../habits.js';
import { LEVELS, EQUIPMENT } from '../workouts.js';
import { escapeHtml } from '../ui.js';
import { todayISO, PROTOCOL_LENGTH } from '../dates.js';

const PRIORITY_LABELS = {
  appearance: 'Hair, skin & grooming',
  fitness:    'Physique & fitness',
  grooming:   'Grooming detail',
  sleep:      'Sleep & recovery',
  posture:    'Posture',
  style:      'Clothing & style',
  presence:   'Presence & confidence',
  consistency:'Discipline & consistency'
};

export function renderOnboarding(root, { onComplete }){
  let step = 0;
  const draft = {
    startDate: todayISO(),
    priorities: ['appearance', 'fitness', 'consistency'],
    workoutLevel: 'beginner',
    equipment: 'none',
    sleepTargetHours: 8.5
  };

  function paint(){
    root.innerHTML = view();
    wire();
  }

  function screen(big, med, note){
    return `<div class="onboard">
      <h1 class="big">${big}</h1>
      ${med ? `<p class="med">${med}</p>` : ''}
      ${note || ''}
      <div class="onboard-dots">${[0,1,2].map(i => `<i class="${i===step?'on':''}"></i>`).join('')}</div>
      <button class="btn btn-primary" id="ob-next" style="margin-top:8px">${step < 2 ? 'Continue' : "Let's set it up"}</button>
    </div>`;
  }

  function setupScreen(){
    return `<div class="onboard" style="justify-content:flex-start;padding-top:56px;text-align:left;max-width:480px;margin:0 auto;gap:0">
      <h1 class="big" style="font-size:1.6rem;align-self:flex-start;margin-bottom:24px">Set up the protocol</h1>

      <div class="field" style="width:100%">
        <label>Start date</label>
        <input type="date" id="ob-start" value="${draft.startDate}">
        <p class="hint">Day 1 begins on this date. Today works fine.</p>
      </div>

      <div class="field" style="width:100%">
        <label>Where do you want the sharpest focus first? (pick up to 3)</label>
        <div class="chip-row" id="ob-priorities">
          ${CATEGORIES.map(c => `<button type="button" class="chip${draft.priorities.includes(c.key) ? ' on' : ''}" data-cat="${c.key}">${escapeHtml(PRIORITY_LABELS[c.key])}</button>`).join('')}
        </div>
      </div>

      <div class="field" style="width:100%">
        <label>Workout level</label>
        <div class="chip-row">
          ${LEVELS.map(l => `<button type="button" class="chip${draft.workoutLevel===l.key?' on':''}" data-level="${l.key}">${escapeHtml(l.label)}</button>`).join('')}
        </div>
      </div>

      <div class="field" style="width:100%">
        <label>Equipment</label>
        <div class="chip-row">
          ${EQUIPMENT.map(e => `<button type="button" class="chip${draft.equipment===e.key?' on':''}" data-equipment="${e.key}">${escapeHtml(e.label)}</button>`).join('')}
        </div>
      </div>

      <div class="field" style="width:100%">
        <label>Sleep target (hours)</label>
        <input type="number" id="ob-sleep" min="6" max="10" step="0.5" value="${draft.sleepTargetHours}">
        <p class="hint">8–9 hours is the realistic target — recovery drives everything else here.</p>
      </div>

      <button class="btn btn-primary btn-block" id="ob-start-protocol" style="margin-top:8px">Day 1 starts now →</button>
    </div>`;
  }

  function view(){
    if (step === 0) return screen(`${PROTOCOL_LENGTH} DAYS.`, 'One system. Executed daily. Nothing random.');
    if (step === 1) return screen("This isn't about<br>becoming someone else.", 'It\'s about removing what\'s in the way.');
    if (step === 2) return screen('It\'s about becoming<br>the sharpest version of yourself.', 'Identify the highest-impact changes. Execute them consistently. Track it honestly.');
    return setupScreen();
  }

  function wire(){
    const next = document.getElementById('ob-next');
    if (next) next.addEventListener('click', () => { step++; paint(); });

    const startInput = document.getElementById('ob-start');
    if (startInput) startInput.addEventListener('change', e => { draft.startDate = e.target.value || todayISO(); });

    const sleepInput = document.getElementById('ob-sleep');
    if (sleepInput) sleepInput.addEventListener('change', e => { draft.sleepTargetHours = Number(e.target.value) || 8.5; });

    root.querySelectorAll('[data-cat]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.cat;
      if (draft.priorities.includes(key)) draft.priorities = draft.priorities.filter(p => p !== key);
      else if (draft.priorities.length < 3) draft.priorities.push(key);
      paint();
    }));
    root.querySelectorAll('[data-level]').forEach(btn => btn.addEventListener('click', () => { draft.workoutLevel = btn.dataset.level; paint(); }));
    root.querySelectorAll('[data-equipment]').forEach(btn => btn.addEventListener('click', () => { draft.equipment = btn.dataset.equipment; paint(); }));

    const finish = document.getElementById('ob-start-protocol');
    if (finish) finish.addEventListener('click', () => {
      onComplete({
        startDate: draft.startDate,
        priorities: draft.priorities,
        workoutLevel: draft.workoutLevel,
        equipment: draft.equipment,
        sleepTargetHours: draft.sleepTargetHours,
        weights: defaultWeights(),
        units: 'metric'
      });
    });
  }

  paint();
}
