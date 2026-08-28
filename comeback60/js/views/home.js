import { phaseForDay, daysRemaining, nextMilestone, isoForDayIndex, PROTOCOL_LENGTH } from '../dates.js';
import {
  comebackExecutionScore, currentStreak, weeklyConsistency, adaptationInsights,
  recoveryWarning, dailyCategoryTotals, dailyOverallPct
} from '../scoring.js';
import { escapeHtml, ringSVG, fmtPct, scoreTone } from '../ui.js';
import { navigate } from '../router.js';

export function renderHome(root, ctx){
  const { state, dayIndex } = ctx;
  const phase = phaseForDay(dayIndex);
  const remaining = daysRemaining(dayIndex);
  const milestone = nextMilestone(dayIndex);
  const score = comebackExecutionScore(state, dayIndex);
  const streak = currentStreak(state, dayIndex);
  const weekly = weeklyConsistency(state, dayIndex);

  const todayIso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const todayDay = state.days[todayIso];
  const todayTotals = dailyCategoryTotals(todayDay, dayIndex, state.customHabits, state.habitCompletions, todayIso);
  const todayPct = dailyOverallPct(todayTotals);
  const todayDone = Object.values(todayTotals).reduce((a, c) => a + c.done, 0);
  const todayTotal = Object.values(todayTotals).reduce((a, c) => a + c.total, 0);

  const insights = adaptationInsights(state, dayIndex);
  const recovery = recoveryWarning(state, dayIndex);

  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <div class="row between">
          <div>
            <span class="tag tag-phase">${escapeHtml(phase.name.toUpperCase())} · PHASE</span>
          </div>
          ${milestone ? `<span class="small muted">Next milestone: Day ${milestone.day}</span>` : ''}
        </div>
        <h1 style="margin-top:12px">DAY ${dayIndex} <span class="muted" style="font-weight:500">/ ${PROTOCOL_LENGTH}</span></h1>
        <p class="sub">${remaining > 0 ? `${remaining} days remaining` : 'Protocol complete'} — ${escapeHtml(phase.goal)}</p>
      </div>

      ${recovery.warning ? `
      <div class="callout callout-warn" style="margin-bottom:14px">
        <b>RECOVERY WARNING.</b> Average sleep the last few nights is ${recovery.avgHours}h against an ${recovery.target}h target.
        Today's intensity should come down — protect sleep before anything else.
      </div>` : ''}

      <div class="grid grid-2 sm-grid-3" style="margin-bottom:14px">
        <div class="card center" style="grid-column: span 1">
          ${ringSVG(score, { label: 'SCORE', valueText: String(score) })}
          <div class="label" style="margin-top:10px">COMEBACK SCORE</div>
        </div>
        <div class="stat-tile ${scoreTone(todayPct)}">
          <div class="v">${todayDone}/${todayTotal}</div>
          <div class="l">TODAY COMPLETE (${fmtPct(todayPct)})</div>
        </div>
        <div class="stat-tile accent">
          <div class="v">${streak}</div>
          <div class="l">CURRENT STREAK (DAYS)</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:14px">
        <div class="stat-tile">
          <div class="v">${weekly}%</div>
          <div class="l">WEEKLY CONSISTENCY</div>
        </div>
        <div class="stat-tile">
          <div class="v" style="font-size:1.1rem;line-height:1.3">${escapeHtml(insights.biggestImprovement.label)}</div>
          <div class="l">STRONGEST RIGHT NOW</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-title">Current focus</div>
        <p style="font-size:0.95rem">${escapeHtml(insights.whatsHoldingBack[0]?.label || insights.biggestWeakness.label)} needs the most attention this week.</p>
        <div class="row" style="margin-top:14px">
          <button class="btn btn-primary btn-block" id="go-today">Open today's checklist →</button>
        </div>
      </div>

      ${insights.whatChanged.length ? `
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">What changed</div>
        <ul class="stack">
          ${insights.whatChanged.map(c => `<li class="row" style="gap:8px"><span style="color:var(--good)">✓</span> ${escapeHtml(c.label)} — ${c.recentPct}% this week</li>`).join('')}
        </ul>
      </div>` : ''}

      ${insights.whatsHoldingBack.length ? `
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">What's holding you back</div>
        <ul class="stack">
          ${insights.whatsHoldingBack.map(c => `<li class="row" style="gap:8px"><span style="color:var(--warn)">⚠</span> ${escapeHtml(c.label)} — ${c.recentPct}% this week</li>`).join('')}
        </ul>
      </div>` : ''}

      ${insights.next7Days.length ? `
      <div class="card">
        <div class="card-title">Next 7 days</div>
        <ol class="stack" style="list-style:none;counter-reset:n">
          ${insights.next7Days.map((r, i) => `<li style="display:flex;gap:10px"><span class="num muted" style="width:16px">${i+1}.</span>${escapeHtml(r)}</li>`).join('')}
        </ol>
      </div>` : ''}
    </div>
  `;

  const goToday = document.getElementById('go-today');
  if (goToday) goToday.addEventListener('click', () => navigate('today'));
}
