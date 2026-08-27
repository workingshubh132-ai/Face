// Small render helpers shared across every view — kept framework-free: each
// view still just builds an HTML string and wires listeners after mounting,
// the same pattern Skinprint itself uses, just split across files because
// this app has substantially more surface area.

export function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function ringSVG(pct, opts = {}){
  const size = opts.size || 96;
  const stroke = opts.stroke || 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  const label = opts.label || '';
  const valueText = opts.valueText ?? `${pct}`;
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}">
      <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"></circle>
      <circle class="fill" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
    </svg>
    <div class="center"><div class="v">${escapeHtml(valueText)}</div>${label ? `<div class="l">${escapeHtml(label)}</div>` : ''}</div>
  </div>`;
}

// Inlines the checkmark path directly rather than importing icons.js, since
// every view already imports this module and a cycle back to icons.js buys
// nothing.
const CHECK_PATH = '<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6"/>';

export function checkRow(id, label, done, dataAttr = 'data-task'){
  return `<div class="checkrow${done ? ' done' : ''}" ${dataAttr}="${escapeHtml(id)}">
    <span class="checkbox"><svg viewBox="0 0 24 24" fill="none" stroke="#fff">${CHECK_PATH}</svg></span>
    <span class="checklabel">${escapeHtml(label)}</span>
  </div>`;
}

export function fmtPct(n){ return `${Math.round(n)}%`; }

export function fmtDateHuman(iso){
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function addDaysISO(iso, days){
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
}

export function scoreTone(pct){
  if (pct >= 70) return 'good';
  if (pct >= 40) return 'accent';
  return 'warn';
}

export function toast(msg){
  let el = document.getElementById('toast');
  if (!el){
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:var(--surface-2);border:1px solid var(--line);color:var(--text);padding:10px 18px;border-radius:999px;font-size:0.82rem;z-index:200;box-shadow:var(--shadow-lift);opacity:0;transition:opacity .2s ease;pointer-events:none';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

// `w`/`h` are only the logical coordinate space the path math is drawn in —
// the rendered element is always width:100% of its container (height stays
// fixed in px), so a 600-unit-wide history on a 340px-wide phone screen
// scales down to fit rather than forcing the page to scroll sideways.
export function sparkline(values, opts = {}){
  const w = opts.w || 280, h = opts.h || 56, pad = 4;
  if (!values.length) return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}"></svg>`;
  const max = Math.max(100, ...values);
  const min = 0;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length-1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
    <path d="${area}" fill="var(--accent-wash)" stroke="none"></path>
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></path>
  </svg>`;
}
