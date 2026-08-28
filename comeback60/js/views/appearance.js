import { update, ensureDay } from '../store.js';
import { taskConsistency, skinRatingHistory } from '../scoring.js';
import { isoForDayIndex } from '../dates.js';
import { escapeHtml, fmtDateHuman, addDaysISO, fmtPct, sparkline } from '../ui.js';
import { ACNE_CAUSES, ACNE_DIET, ACNE_PRODUCTS, ACNE_RAMP, ACNE_TIMELINE, SKIN_LOG_LABELS } from '../skinCare.js';

let activeTab = 'hair';

const SKIN_TASKS = {
  'Cleanser (AM)': 'cleanser-am', 'Moisturizer (AM)': 'moisturizer-am', 'Sunscreen': 'sunscreen-am',
  'Cleanser (PM)': 'cleanser-pm', 'Moisturizer (PM)': 'moisturizer-pm'
};
const GROOMING_TASKS = { 'Basic hygiene': 'hygiene-am', 'Facial grooming check': 'grooming-check', 'Brush & floss': 'oral-pm' };

function haircutTimelineHTML(haircutDate, todayISO){
  if (!haircutDate) return `<p class="small muted">Log your last haircut date to see the maintenance timeline.</p>`;
  const daysSince = Math.round((Date.parse(todayISO) - Date.parse(haircutDate)) / 86400000);
  const nodes = [
    { label: 'Haircut', atDay: 0 },
    { label: 'Week 1', atDay: 7 },
    { label: 'Week 2', atDay: 14 },
    { label: 'Week 3', atDay: 21 },
    { label: 'Maintenance', atDay: 28 }
  ];
  return `<div class="timeline">
    ${nodes.map((n, i) => `
      ${i > 0 ? `<div class="line ${daysSince >= n.atDay ? 'done' : ''}"></div>` : ''}
      <div class="node">
        <div class="dot ${daysSince >= n.atDay ? 'done' : ''} ${daysSince < n.atDay && (nodes[i-1] ? daysSince >= nodes[i-1].atDay : true) ? 'now' : ''}"></div>
        <div class="tl">${n.label}</div>
      </div>
    `).join('')}
  </div>
  <p class="small muted" style="margin-top:6px">${daysSince} days since your last cut. Next maintenance point: ${fmtDateHuman(addDaysISO(haircutDate, 28))}.</p>`;
}

function hairTab(ctx){
  const { state } = ctx;
  const h = state.hair;
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Maintenance timeline</div>
      ${haircutTimelineHTML(h.haircutDate, ctx.todayISO)}
    </div>
    <div class="card">
      <div class="card-title">Hair profile</div>
      <div class="field"><label>Last haircut date</label><input type="date" id="haircut-date" value="${escapeHtml(h.haircutDate || '')}"></div>
      <div class="grid grid-2">
        <div class="field"><label>Current style</label><input type="text" id="hair-current" value="${escapeHtml(h.current)}" placeholder="e.g. short taper"></div>
        <div class="field"><label>Desired style</label><input type="text" id="hair-desired" value="${escapeHtml(h.desired)}" placeholder="e.g. textured crop"></div>
      </div>
      <div class="field"><label>Products in rotation</label><input type="text" id="hair-products" value="${escapeHtml(h.products)}" placeholder="Keep it minimal — 1-2 products beats five"></div>
      <div class="field mt-0"><label>Notes</label><textarea id="hair-notes" placeholder="Anything your stylist should know next time">${escapeHtml(h.notes)}</textarea></div>
      <p class="hint">Keep the product list short. More product is not the goal here — consistency with a couple of the right ones is.</p>
    </div>
  `;
}

function skinTab(ctx){
  const { state, dayIndex } = ctx;
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const today = ensureDay(iso);
  const rows = Object.entries(SKIN_TASKS).map(([label, id]) => {
    const c = taskConsistency(state, [id], dayIndex, 14);
    return { label, ...c };
  });

  const history = skinRatingHistory(state, dayIndex, 30);
  const trendValues = history.map(h => h.rating * 20); // 1-5 -> 0-100 for the shared sparkline scale
  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const improved = first && latest && latest.day !== first.day ? latest.rating - first.rating : null;

  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Log today's skin</div>
      <div class="chip-row">
        ${SKIN_LOG_LABELS.map((label, i) => {
          const value = i + 1;
          return `<button type="button" class="chip${today.skin.rating === value ? ' on' : ''}" data-skin-rating="${value}">${escapeHtml(label)}</button>`;
        }).join('')}
      </div>
      ${history.length >= 2 ? `
      <div class="hairline-block">
        ${sparkline(trendValues, { w: 300, h: 50 })}
        <p class="small muted" style="margin-top:4px">Last ${history.length} logged days${improved !== null ? (improved > 0 ? ` — trending up ${improved} point${improved === 1 ? '' : 's'}` : improved < 0 ? ` — trending down ${Math.abs(improved)} point${Math.abs(improved) === 1 ? '' : 's'}` : ' — holding steady') : ''}.</p>
      </div>` : `<p class="hint">One tap a day. After a couple of weeks this becomes a real trend line instead of a memory you can't quite trust.</p>`}
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Consistency — last 14 days</div>
      ${rows.map(r => `
        <div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">
          <span class="small">${escapeHtml(r.label)}</span>
          <span class="small muted">${r.done}/${r.total} · ${fmtPct(r.pct)}</span>
        </div>
      `).join('')}
      <p class="hint">Consistency is the only thing tracked here — not a promised outcome. Skin responds to weeks of repetition, not any single day.</p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Why breakouts happen</div>
      <ol class="stack" style="list-style:none;counter-reset:n">
        ${ACNE_CAUSES.why.map((c, i) => `<li style="display:flex;gap:10px"><span class="num muted" style="width:16px">${i+1}.</span>${escapeHtml(c)}</li>`).join('')}
      </ol>
      <div class="hairline-block">
        <div class="label" style="margin-bottom:8px">WHAT MAKES IT WORSE</div>
        <ul class="stack">${ACNE_CAUSES.worse.map(w => `<li class="small">${escapeHtml(w)}</li>`).join('')}</ul>
      </div>
      <div class="hairline-block">
        <div class="label" style="margin-bottom:8px">WORTH KNOWING</div>
        <ul class="stack">${ACNE_CAUSES.myths.map(m => `<li class="small">${escapeHtml(m)}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Food worth thinking about</div>
      <div class="label" style="margin-bottom:8px">CUT BACK ON</div>
      <ul class="stack">${ACNE_DIET.avoid.map(a => `<li class="small">${escapeHtml(a)}</li>`).join('')}</ul>
      <div class="hairline-block">
        <div class="label" style="margin-bottom:8px">MORE USEFUL THAN AVOIDING</div>
        <ul class="stack">${ACNE_DIET.help.map(h => `<li class="small">${escapeHtml(h)}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">What to buy</div>
      ${ACNE_PRODUCTS.map(p => `
        <div class="row between" style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
          <div>
            <div class="small" style="font-weight:600">${escapeHtml(p.name)}</div>
            <div class="small muted" style="margin-top:2px">${escapeHtml(p.role)} — ${escapeHtml(p.why)}</div>
          </div>
          <span class="small muted" style="white-space:nowrap;padding-left:10px">${escapeHtml(p.price)}</span>
        </div>
      `).join('')}
      <p class="hint">Suggestions, not endorsements — no affiliate links, nothing tracked. Buy one thing at a time and give it six weeks.</p>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">How to start, week by week</div>
      ${ACNE_RAMP.map(w => `
        <div style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
          <div class="small" style="font-weight:600">${escapeHtml(w.week)} — ${escapeHtml(w.doing)}</div>
          <div class="small muted" style="margin-top:3px">${escapeHtml(w.why)}</div>
        </div>
      `).join('')}
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="card-title">What to expect, and when</div>
      ${ACNE_TIMELINE.map(t => `
        <div style="padding:10px 0;border-bottom:1px solid var(--line-soft)">
          <div class="small" style="font-weight:600">${escapeHtml(t.when)}</div>
          <div class="small muted" style="margin-top:3px">${escapeHtml(t.what)}</div>
        </div>
      `).join('')}
    </div>

    <div class="callout callout-warn" style="margin-bottom:14px">
      <b>DO NOT OVERDO IT.</b> Avoid: washing more than twice a day, aggressive scrubbing or physical exfoliants, picking at anything, bleaching or "fairness" products, and stacking multiple active ingredients at once. More steps is not the same as more progress.
    </div>
    <div class="callout callout-info">
      If something persistent or severe is going on with your skin, a dermatologist can actually diagnose and treat it. This app tracks consistency and points you at what usually helps — it does not and cannot diagnose anything.
    </div>
  `;
}

function groomingTab(ctx){
  const { state, dayIndex } = ctx;
  const rows = Object.entries(GROOMING_TASKS).map(([label, id]) => {
    const c = taskConsistency(state, [id], dayIndex, 14);
    return { label, ...c };
  });
  const maintenanceHabits = state.customHabits.filter(h => h.category === 'grooming' && h.tag === 'maintenance');
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Daily consistency — last 14 days</div>
      ${rows.map(r => `
        <div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line-soft)">
          <span class="small">${escapeHtml(r.label)}</span>
          <span class="small muted">${r.done}/${r.total} · ${fmtPct(r.pct)}</span>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="row between" style="margin-bottom:10px">
        <div class="card-title" style="margin:0">Maintenance cadence</div>
      </div>
      ${maintenanceHabits.length ? maintenanceHabits.map(h => `<div class="row between small" style="padding:8px 0;border-bottom:1px solid var(--line-soft)"><span>${escapeHtml(h.name)}</span><span class="muted">every ${h.frequency.replace('custom-', '')} days</span></div>`).join('')
        : `<p class="small muted" style="margin-bottom:12px">Nails, facial hair and eyebrows are easy to let slide because they are not daily. Add them as recurring habits so the app reminds you.</p>
           <button class="btn btn-ghost btn-sm" id="seed-grooming">+ Add nails / eyebrows / facial hair reminders</button>`}
    </div>
  `;
}

function glassesTab(ctx){
  const g = ctx.state.glasses;
  let verdict = '';
  if (g.frameWidthMm && g.faceWidthMm){
    const diff = g.frameWidthMm - g.faceWidthMm;
    if (Math.abs(diff) <= 2) verdict = `<span class="tag tag-good">PROPORTIONATE</span> Within 2mm of your face width — a safe match.`;
    else if (diff > 2) verdict = `<span class="tag tag-warn">TOO WIDE</span> About ${Math.round(diff)}mm wider than your face — it will likely overhang the temples.`;
    else verdict = `<span class="tag tag-warn">TOO NARROW</span> About ${Math.round(-diff)}mm narrower than your face — it may pinch or look undersized.`;
  }
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Current frame</div>
      <div class="grid grid-2">
        <div class="field"><label>Frame shape</label>
          <select id="g-shape">
            ${['','Rectangle','Round','Square','Cat-eye','Aviator','Oval','Wayfarer'].map(s => `<option ${g.frameShape===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Frame colour</label><input type="text" id="g-color" value="${escapeHtml(g.frameColor)}"></div>
      </div>
      <div class="field mt-0"><label>Notes</label><textarea id="g-notes" placeholder="What you like or don't about the current pair">${escapeHtml(g.notes)}</textarea></div>
    </div>
    <div class="card">
      <div class="card-title">Fit check</div>
      <div class="grid grid-2">
        <div class="field"><label>Frame width (mm)</label><input type="number" id="g-frame-width" value="${g.frameWidthMm ?? ''}" placeholder="e.g. 138"></div>
        <div class="field"><label>Your face width (mm)</label><input type="number" id="g-face-width" value="${g.faceWidthMm ?? ''}" placeholder="temple to temple"></div>
      </div>
      ${verdict ? `<div class="hairline-block small">${verdict}</div>` : `<p class="hint">Fill both to get a proportionate / too wide / too narrow read. This is a ruler comparison, not a photo analysis — it can't tell you the objectively "best" frame, only whether the size is in the right range.</p>`}
    </div>
  `;
}

const TABS = { hair: hairTab, skin: skinTab, grooming: groomingTab, glasses: glassesTab };

export function renderAppearance(root, ctx){
  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1>Appearance</h1>
        <p class="sub">Hair, skin, grooming and glasses — tracked for consistency, not chased for a number.</p>
      </div>
      <div class="chip-row" style="margin-bottom:16px">
        ${Object.keys(TABS).map(t => `<button type="button" class="chip${activeTab===t?' on':''}" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}
      </div>
      <div id="tab-body">${TABS[activeTab](ctx)}</div>
    </div>
  `;

  root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    renderAppearance(root, ctx);
  }));

  // Binds an input's change event straight to one field on one sub-object of
  // state (e.g. state.hair.current). `group` names which sub-object so the
  // producer can find it fresh inside update() rather than closing over a
  // possibly-stale reference.
  const bind = (id, group, key, transform = v => v) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', e => update(s => { s[group][key] = transform(e.target.value); }));
  };

  // Hair
  bind('haircut-date', 'hair', 'haircutDate');
  bind('hair-current', 'hair', 'current');
  bind('hair-desired', 'hair', 'desired');
  bind('hair-products', 'hair', 'products');
  bind('hair-notes', 'hair', 'notes');

  // Glasses
  bind('g-shape', 'glasses', 'frameShape');
  bind('g-color', 'glasses', 'frameColor');
  bind('g-notes', 'glasses', 'notes');
  bind('g-frame-width', 'glasses', 'frameWidthMm', v => v ? Number(v) : null);
  bind('g-face-width', 'glasses', 'faceWidthMm', v => v ? Number(v) : null);

  const skinIso = isoForDayIndex(ctx.state.protocol.startDate, ctx.dayIndex);
  root.querySelectorAll('[data-skin-rating]').forEach(btn => btn.addEventListener('click', () => {
    const value = Number(btn.dataset.skinRating);
    update(s => {
      const d = ensureDay(skinIso);
      d.skin.rating = d.skin.rating === value ? null : value; // tap again to clear
    });
  }));

  const seedBtn = document.getElementById('seed-grooming');
  if (seedBtn) seedBtn.addEventListener('click', () => {
    const now = Date.now();
    const createdAtDayIndex = ctx.dayIndex;
    update(s => {
      s.customHabits.push(
        { id: `h-${now}-1`, name: 'Trim nails', category: 'grooming', frequency: 'custom-7', tag: 'maintenance', difficulty: 'easy', importance: 'medium', createdAt: now, createdAtDayIndex, paused: false },
        { id: `h-${now}-2`, name: 'Tidy eyebrows', category: 'grooming', frequency: 'custom-14', tag: 'maintenance', difficulty: 'easy', importance: 'medium', createdAt: now, createdAtDayIndex, paused: false },
        { id: `h-${now}-3`, name: 'Facial hair shape-up', category: 'grooming', frequency: 'custom-7', tag: 'maintenance', difficulty: 'easy', importance: 'medium', createdAt: now, createdAtDayIndex, paused: false }
      );
    });
  });
}
