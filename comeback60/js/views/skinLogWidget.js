// The daily skin-rating log is shown in two places — Home (for the one-tap
// daily glance) and Appearance -> Skin (alongside the full acne protocol) —
// and both must read and write the exact same day.skin.rating field. Shared
// here so there is one card markup and one click handler, not two copies
// that could quietly drift apart.

import { ensureDay, update } from '../store.js';
import { skinRatingHistory } from '../scoring.js';
import { isoForDayIndex } from '../dates.js';
import { escapeHtml, sparkline } from '../ui.js';
import { SKIN_LOG_LABELS } from '../skinCare.js';

export function skinLogCardHTML(ctx, opts = {}){
  const { state, dayIndex } = ctx;
  const iso = isoForDayIndex(state.protocol.startDate, dayIndex);
  const today = ensureDay(iso);
  const windowDays = opts.windowDays || 30;
  const history = skinRatingHistory(state, dayIndex, windowDays);
  const trendValues = history.map(h => h.rating * 20); // 1-5 -> 0-100, the shared sparkline scale
  const latest = history.length ? history[history.length - 1] : null;
  const first = history.length ? history[0] : null;
  const improved = first && latest && latest.day !== first.day ? latest.rating - first.rating : null;

  return `
    <div class="card"${opts.marginBottom !== false ? ' style="margin-bottom:14px"' : ''}>
      <div class="card-title">${opts.title || "Log today's skin"}</div>
      <div class="chip-row">
        ${SKIN_LOG_LABELS.map((label, i) => {
          const value = i + 1;
          return `<button type="button" class="chip${today.skin.rating === value ? ' on' : ''}" data-skin-rating="${value}">${escapeHtml(label)}</button>`;
        }).join('')}
      </div>
      ${history.length >= 2 ? `
      <div class="hairline-block">
        ${sparkline(trendValues, { w: opts.sparkWidth || 300, h: 50 })}
        <p class="small muted" style="margin-top:4px">Last ${history.length} logged days${improved !== null ? (improved > 0 ? ` — trending up ${improved} point${improved === 1 ? '' : 's'}` : improved < 0 ? ` — trending down ${Math.abs(improved)} point${Math.abs(improved) === 1 ? '' : 's'}` : ' — holding steady') : ''}.</p>
      </div>` : `<p class="hint">One tap a day. After a couple of weeks this becomes a real trend line instead of a memory you can't quite trust.</p>`}
    </div>
  `;
}

export function wireSkinLogCard(root, ctx){
  const iso = isoForDayIndex(ctx.state.protocol.startDate, ctx.dayIndex);
  root.querySelectorAll('[data-skin-rating]').forEach(btn => btn.addEventListener('click', () => {
    const value = Number(btn.dataset.skinRating);
    update(s => {
      const d = ensureDay(iso);
      d.skin.rating = d.skin.rating === value ? null : value; // tap again to clear
    });
  }));
}
