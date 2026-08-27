// Minimal stroke icons, one weight, no external icon font — kept as tiny
// inline SVG strings so the whole app stays dependency-free.
const S = (paths) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  home:       S('<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/>'),
  today:      S('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16"/><path d="M8 3v3M16 3v3"/><path d="M8.5 13.5l2 2 4-4"/>'),
  progress:   S('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  appearance: S('<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20.5c0-4.1 3.36-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>'),
  fitness:    S('<path d="M6.5 8.5v7M17.5 8.5v7"/><path d="M3 10.5v3M21 10.5v3"/><path d="M6.5 12h11"/>'),
  style:      S('<path d="M9 4h6l1 2-2 2h-4L8 6z"/><path d="M8 6 4 8l1 4 3-1v9h8v-9l3 1 1-4-4-2"/>'),
  habits:     S('<path d="M9 11l2.5 2.5L16 8"/><rect x="4" y="4" width="16" height="16" rx="3"/>'),
  settings:   S('<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.9 7.9 0 0 0 0-3l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 2.6a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.9 7.9 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2.6 1.5L10 22h4l.4-2.6a8 8 0 0 0 2.6-1.5l2.4 1 2-3.4z"/>'),
  check:      '<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6"/>',
  chevronL:   S('<path d="M15 18l-6-6 6-6"/>'),
  flame:      S('<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1 0-2-1-3 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 3-6 5-10z"/>'),
  plus:       S('<path d="M12 5v14M5 12h14"/>'),
  x:          S('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash:      S('<path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>'),
  camera:     S('<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.3"/>')
};
