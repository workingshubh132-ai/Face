import { getState, subscribe, update } from './store.js';
import { navigate } from './router.js';
import { dayIndexFor, todayISO, isProtocolComplete, completedWeeksAsOf } from './dates.js';
import { weeklyReview } from './scoring.js';
import { ICONS } from './icons.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderHome } from './views/home.js';
import { renderToday } from './views/today.js';
import { renderProgress } from './views/progress.js';
import { renderAppearance } from './views/appearance.js';
import { renderFitness } from './views/fitness.js';
import { renderStyle } from './views/style.js';
import { renderHabitsPage } from './views/habitsPage.js';
import { renderSettings } from './views/settings.js';

const NAV = [
  { key: 'home',       label: 'Home',       icon: 'home',       render: renderHome },
  { key: 'today',      label: 'Today',      icon: 'today',      render: renderToday },
  { key: 'progress',   label: 'Progress',   icon: 'progress',   render: renderProgress },
  { key: 'appearance', label: 'Appearance', icon: 'appearance', render: renderAppearance },
  { key: 'fitness',    label: 'Fitness',    icon: 'fitness',    render: renderFitness },
  { key: 'style',      label: 'Style',      icon: 'style',      render: renderStyle },
  { key: 'habits',     label: 'Habits',     icon: 'habits',     render: renderHabitsPage },
  { key: 'settings',   label: 'Settings',   icon: 'settings',   render: renderSettings }
];

const appEl = document.getElementById('app');

function currentRoute(){
  const key = (location.hash || '#/home').replace('#/', '');
  return NAV.some(n => n.key === key) ? key : 'home';
}

function dayIndex(state){
  return dayIndexFor(todayISO(), state.protocol.startDate);
}

// Smart adaptation, part one: a week's review is generated once, the day
// after it closes, and never regenerated — it is a record of what actually
// happened that week, not a live number that would keep drifting as more
// days are logged.
function ensureWeeklyReviews(state, di){
  const completed = completedWeeksAsOf(di);
  if (state.weeklyReviews.length >= completed) return;
  update(s => {
    for (let w = s.weeklyReviews.length + 1; w <= completed; w++){
      s.weeklyReviews.push({ week: w, generatedAt: Date.now(), snapshot: weeklyReview(s, w) });
    }
  });
}

function navIcon(key){ return ICONS[key] || ''; }

function shellHTML(activeKey){
  const links = NAV.map(n => `
    <button class="navlink${n.key === activeKey ? ' active' : ''}" data-nav="${n.key}">
      ${navIcon(n.icon)}<span>${n.label}</span>
    </button>`).join('');

  return `
    <nav class="sidebar">
      <div class="brand">
        <div class="word">COMEBACK <b>// 60</b></div>
        <div class="sub">60 days. One system.</div>
      </div>
      ${links}
    </nav>
    <main class="view" id="view-root"></main>
    <nav class="bottomnav">${links}</nav>
  `;
}

function wireShellNav(){
  appEl.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.nav));
  });
}

function render(){
  const state = getState();
  document.documentElement.setAttribute('data-theme', state.theme || 'dark');

  if (!state.onboarded){
    if (appEl.querySelector('.onboard') === null || !appEl.dataset.mode || appEl.dataset.mode !== 'onboarding'){
      appEl.dataset.mode = 'onboarding';
      appEl.innerHTML = '<div id="onboard-root"></div>';
      renderOnboarding(document.getElementById('onboard-root'), {
        onComplete(protocol){
          update(s => {
            s.protocol = { ...s.protocol, ...protocol };
            s.onboarded = true;
          });
        }
      });
    }
    return;
  }

  const route = currentRoute();
  const di = dayIndex(state);
  ensureWeeklyReviews(state, di);

  // Re-paint the whole shell only when the mode or active tab actually
  // changed — otherwise typing in a focused input would get wiped out by a
  // full re-render triggered by an unrelated state update elsewhere.
  const needsShell = appEl.dataset.mode !== 'app' || appEl.dataset.route !== route;
  if (needsShell){
    appEl.dataset.mode = 'app';
    appEl.dataset.route = route;
    appEl.innerHTML = shellHTML(route);
    wireShellNav();
  }

  const viewRoot = document.getElementById('view-root');
  const view = NAV.find(n => n.key === route) || NAV[0];
  const ctx = {
    state,
    dayIndex: di,
    todayISO: todayISO(),
    protocolComplete: isProtocolComplete(di),
    navigate
  };
  view.render(viewRoot, ctx);
}

window.addEventListener('hashchange', render);
subscribe(render);
render();
