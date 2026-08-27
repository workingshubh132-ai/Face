import { PHASES, PHOTO_SCHEDULE_DAYS, nextPhotoDay } from '../dates.js';
import { scoreHistory, weeklyReview, finalReport, longestStreak, perfectDaysCount } from '../scoring.js';
import { addPhoto, deletePhoto, listPhotosByType, photoURL } from '../photos.js';
import { escapeHtml, sparkline, toast } from '../ui.js';

let activeTab = 'overview';
let captureAngle = 'front';
let compareA = 1, compareB = null;

function phaseTimelineHTML(dayIndex){
  return `<div class="timeline">
    ${PHASES.map((p, i) => `
      ${i > 0 ? `<div class="line ${dayIndex > p.start - 1 ? 'done' : ''}"></div>` : ''}
      <div class="node">
        <div class="dot ${dayIndex >= p.end ? 'done' : ''} ${dayIndex >= p.start && dayIndex <= p.end ? 'now' : ''}"></div>
        <div class="tl">${escapeHtml(p.name)}<br><span class="faint">${p.start}-${p.end}</span></div>
      </div>
    `).join('')}
  </div>`;
}

function overviewTab(ctx){
  const { state, dayIndex } = ctx;
  const history = scoreHistory(state, dayIndex);
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="row between" style="margin-bottom:6px">
        <div class="card-title" style="margin:0">Score history</div>
        <span class="small muted">Day 1 → ${dayIndex}</span>
      </div>
      ${sparkline(history.map(h => h.score), { w: 600, h: 90 })}
    </div>
    <div class="grid grid-2" style="margin-bottom:14px">
      <div class="stat-tile"><div class="v">${longestStreak(state, dayIndex)}</div><div class="l">LONGEST STREAK</div></div>
      <div class="stat-tile"><div class="v">${perfectDaysCount(state, dayIndex)}</div><div class="l">PERFECT DAYS</div></div>
    </div>
    <div class="card">
      <div class="card-title">Phases</div>
      ${phaseTimelineHTML(dayIndex)}
    </div>
  `;
}

function reviewsTab(ctx){
  const reviews = ctx.state.weeklyReviews;
  if (!reviews.length) return `<div class="empty">Your first weekly review lands after Day 7.</div>`;
  return `<div class="stack">${reviews.slice().reverse().map(r => {
    const s = r.snapshot;
    return `<div class="card">
      <div class="row between">
        <span class="tag tag-phase">WEEK ${s.week}</span>
        <span class="num" style="font-weight:700">${s.completionPct}%</span>
      </div>
      <div class="grid grid-2" style="margin-top:12px">
        <div class="small"><span class="muted">Strongest:</span> ${escapeHtml(s.strongestCategory.label)}</div>
        <div class="small"><span class="muted">Weakest:</span> ${escapeHtml(s.weakestCategory.label)}</div>
        <div class="small"><span class="muted">Workouts:</span> ${s.workouts}</div>
        <div class="small"><span class="muted">Sleep avg:</span> ${s.sleepAvg != null ? s.sleepAvg + 'h' : '—'}</div>
      </div>
      ${s.nextWeekFocus.length ? `
      <div class="hairline-block">
        <div class="label" style="margin-bottom:8px">NEXT WEEK'S FOCUS</div>
        <ol class="stack" style="list-style:none">${s.nextWeekFocus.map((f,i) => `<li class="small">${i+1}. ${escapeHtml(f)}</li>`).join('')}</ol>
      </div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

async function photosTab(ctx){
  const { dayIndex, todayISO } = ctx;
  const photos = await listPhotosByType('progress');
  const nextDue = nextPhotoDay(dayIndex);
  const byDay = {};
  photos.forEach(p => { (byDay[p.dayIndex] = byDay[p.dayIndex] || []).push(p); });

  const daysWithPhotos = Object.keys(byDay).map(Number).sort((a,b)=>a-b);
  const galleryDays = daysWithPhotos.length ? daysWithPhotos : [];

  const thumbs = await Promise.all(photos.map(async p => ({ ...p, url: await photoURL(p.id) })));

  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Capture schedule</div>
      <div class="chip-row">
        ${PHOTO_SCHEDULE_DAYS.map(d => `<span class="chip${byDay[d] ? ' on' : ''}" style="cursor:default">Day ${d}${byDay[d] ? ' ✓' : ''}</span>`).join('')}
      </div>
      ${nextDue ? `<p class="hint">Next scheduled photo: Day ${nextDue}${nextDue === dayIndex ? ' — today' : ''}.</p>` : `<p class="hint">Schedule complete.</p>`}
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Add a photo — Day ${dayIndex}</div>
      <div class="chip-row" style="margin-bottom:12px">
        ${['front','side','back'].map(a => `<button type="button" class="chip${captureAngle===a?' on':''}" data-angle="${a}">${a[0].toUpperCase()+a.slice(1)}</button>`).join('')}
      </div>
      <input type="file" accept="image/*" id="photo-input">
      <p class="hint">Stored on this device only, in this browser. Never uploaded, never used for anything but your own comparison.</p>
    </div>

    ${galleryDays.length >= 1 ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Compare two days</div>
      <div class="grid grid-2">
        <div class="field"><label>Day</label><select id="compare-a">${galleryDays.map(d => `<option value="${d}" ${compareA===d?'selected':''}>Day ${d}</option>`).join('')}</select></div>
        <div class="field"><label>Day</label><select id="compare-b"><option value="">— pick —</option>${galleryDays.map(d => `<option value="${d}" ${compareB===d?'selected':''}>Day ${d}</option>`).join('')}</select></div>
      </div>
      <div class="grid grid-2">
        <div>${(byDay[compareA]||[]).map(p => thumbs.find(t=>t.id===p.id)).filter(Boolean).map(p => `<img class="photo-thumb" src="${p.url}" style="margin-bottom:6px">`).join('') || '<div class="empty">No photo</div>'}</div>
        <div>${compareB ? ((byDay[compareB]||[]).map(p => thumbs.find(t=>t.id===p.id)).filter(Boolean).map(p => `<img class="photo-thumb" src="${p.url}" style="margin-bottom:6px">`).join('') || '<div class="empty">No photo</div>') : '<div class="empty">Pick a second day</div>'}</div>
      </div>
    </div>` : ''}

    <div class="card">
      <div class="row between" style="margin-bottom:12px">
        <div class="card-title" style="margin:0">All photos</div>
        ${photos.length ? `<button class="linkbtn" id="export-photos">Export all</button>` : ''}
      </div>
      ${thumbs.length ? `<div class="grid grid-3">${thumbs.sort((a,b)=>a.dayIndex-b.dayIndex).map(p => `
        <div>
          <img class="photo-thumb" src="${p.url}">
          <div class="row between" style="margin-top:4px">
            <span class="small muted">D${p.dayIndex} · ${escapeHtml(p.angle)}</span>
            <button class="linkbtn" style="color:var(--danger);font-size:0.72rem" data-delete-photo="${p.id}">Delete</button>
          </div>
        </div>
      `).join('')}</div>` : `<div class="empty">No photos yet.</div>`}
    </div>
  `;
}

function reportTab(ctx){
  const { state, dayIndex } = ctx;
  if (dayIndex < 56){
    return `<div class="empty">The 60-Day Comeback Report unlocks on Day 56, in the Final Form phase. ${56 - dayIndex} days to go.</div>`;
  }
  const r = finalReport(state, Math.min(dayIndex, 60));
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">60-DAY COMEBACK REPORT</div>
      <div class="row between" style="align-items:baseline">
        <div><div class="num" style="font-size:2.2rem;font-weight:700">${r.startScore} → ${r.finalScore}</div><div class="label">START → FINAL SCORE</div></div>
        <div class="tag ${r.improvementPct >= 0 ? 'tag-good' : 'tag-warn'}" style="font-size:0.85rem;padding:6px 12px">${r.improvementPct >= 0 ? '+' : ''}${r.improvementPct}%</div>
      </div>
    </div>
    <div class="grid grid-2 sm-grid-3" style="margin-bottom:14px">
      <div class="stat-tile"><div class="v">${r.habitsCompleted}</div><div class="l">HABITS COMPLETED</div></div>
      <div class="stat-tile"><div class="v">${r.totalWorkouts}</div><div class="l">TOTAL WORKOUTS</div></div>
      <div class="stat-tile"><div class="v">${r.averageSleep != null ? r.averageSleep+'h' : '—'}</div><div class="l">AVERAGE SLEEP</div></div>
      <div class="stat-tile"><div class="v">${r.longestStreak}</div><div class="l">LONGEST STREAK</div></div>
      <div class="stat-tile"><div class="v">${r.perfectDays}</div><div class="l">PERFECT DAYS</div></div>
      <div class="stat-tile"><div class="v">${r.overallScore}</div><div class="l">OVERALL SCORE</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Strongest improvements</div>
      <ul class="stack">${r.strongestImprovements.map(c => `<li class="row" style="gap:8px"><span style="color:var(--good)">✓</span> ${escapeHtml(c.label)}</li>`).join('')}</ul>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Still worth working on</div>
      <ul class="stack">${r.weakestAreas.map(c => `<li class="row" style="gap:8px"><span style="color:var(--warn)">⚠</span> ${escapeHtml(c.label)}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <div class="card-title">Next 90 days</div>
      <ol class="stack" style="list-style:none">${r.next90DayFocus.map((f,i) => `<li class="small">${i+1}. ${escapeHtml(f)}</li>`).join('')}</ol>
    </div>
  `;
}

const TABS = { overview: overviewTab, reviews: reviewsTab, photos: photosTab, report: reportTab };

export async function renderProgress(root, ctx){
  const body = await TABS[activeTab](ctx);
  root.innerHTML = `
    <div class="container">
      <div class="page-head"><h1>Progress</h1><p class="sub">The full run, not just today.</p></div>
      <div class="chip-row" style="margin-bottom:16px">
        ${Object.keys(TABS).map(t => `<button type="button" class="chip${activeTab===t?' on':''}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
      </div>
      <div id="tab-body">${body}</div>
    </div>
  `;

  root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    renderProgress(root, ctx);
  }));

  root.querySelectorAll('[data-angle]').forEach(btn => btn.addEventListener('click', () => {
    captureAngle = btn.dataset.angle;
    renderProgress(root, ctx);
  }));

  const photoInput = document.getElementById('photo-input');
  if (photoInput) photoInput.addEventListener('change', async () => {
    if (!photoInput.files[0]) return;
    await addPhoto({ blob: photoInput.files[0], type: 'progress', dayIndex: ctx.dayIndex, angle: captureAngle, dateISO: ctx.todayISO });
    toast('Photo saved to this device');
    renderProgress(root, ctx);
  });

  const compareASel = document.getElementById('compare-a');
  if (compareASel) compareASel.addEventListener('change', e => { compareA = Number(e.target.value); renderProgress(root, ctx); });
  const compareBSel = document.getElementById('compare-b');
  if (compareBSel) compareBSel.addEventListener('change', e => { compareB = e.target.value ? Number(e.target.value) : null; renderProgress(root, ctx); });

  root.querySelectorAll('[data-delete-photo]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this photo permanently?')) return;
    await deletePhoto(btn.dataset.deletePhoto);
    renderProgress(root, ctx);
  }));

  const exportBtn = document.getElementById('export-photos');
  if (exportBtn) exportBtn.addEventListener('click', async () => {
    const photos = await listPhotosByType('progress');
    for (const p of photos){
      const url = await photoURL(p.id);
      const a = document.createElement('a');
      a.href = url; a.download = `comeback60-day${p.dayIndex}-${p.angle}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise(r => setTimeout(r, 200)); // let the browser start each download before the next
    }
    toast(`Exporting ${photos.length} photo(s)`);
  });
}
