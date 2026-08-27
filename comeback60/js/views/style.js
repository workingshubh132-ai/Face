import { update } from '../store.js';
import { addPhoto, deletePhoto, photoURL } from '../photos.js';
import { CLOTHING_CATEGORIES, FITS, FORMALITIES, OCCASIONS, COLOR_OPTIONS, scoreOutfit } from '../styleScore.js';
import { escapeHtml, toast } from '../ui.js';

let activeTab = 'closet';
let showAddForm = false;
let builder = { top: '', bottom: '', shoes: '', outerwear: '', accessory: '', occasion: 'casual' };
let lastScore = null;

function selectOptions(list, current, blankLabel){
  return `${blankLabel ? `<option value="">${blankLabel}</option>` : ''}` +
    list.map(v => {
      const val = typeof v === 'string' ? v : v.key;
      const label = typeof v === 'string' ? v[0].toUpperCase()+v.slice(1) : v.label;
      return `<option value="${val}" ${current===val?'selected':''}>${label}</option>`;
    }).join('');
}

async function closetCard(item){
  const url = item.photoId ? await photoURL(item.photoId) : null;
  return `<div class="closet-card" data-item="${item.id}">
    ${url ? `<img class="photo-thumb" src="${url}" alt="">` : `<div class="photo-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:0.7rem">NO PHOTO</div>`}
    <div class="meta">
      <div class="name">${escapeHtml(CLOTHING_CATEGORIES.find(c=>c.key===item.category)?.label || item.category)}</div>
      <div class="sub">${escapeHtml(item.color || '—')} · ${escapeHtml(item.fit || '—')}${item.clean === false ? ' · needs wash' : ''}</div>
    </div>
  </div>`;
}

async function closetTab(ctx){
  const items = ctx.state.closet;
  const cards = await Promise.all(items.map(closetCard));
  return `
    <div class="row" style="margin-bottom:14px">
      <button class="btn btn-primary" id="toggle-add">${showAddForm ? 'Close' : '+ Add clothing item'}</button>
    </div>
    ${showAddForm ? `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">New item</div>
      <div class="grid grid-2">
        <div class="field"><label>Category</label><select id="new-category">${selectOptions(CLOTHING_CATEGORIES)}</select></div>
        <div class="field"><label>Colour</label><select id="new-color">${selectOptions(COLOR_OPTIONS, '', 'Select')}</select></div>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>Fit</label><select id="new-fit">${selectOptions(FITS, '', 'Select')}</select></div>
        <div class="field"><label>Formality</label><select id="new-formality">${selectOptions(FORMALITIES, '', 'Select')}</select></div>
      </div>
      <div class="field"><label>Photo (optional)</label><input type="file" accept="image/*" id="new-photo"></div>
      <div class="field mt-0"><label>Notes</label><input type="text" id="new-notes" placeholder="e.g. slightly faded, great for layering"></div>
      <button class="btn btn-primary btn-block" id="save-item">Save item</button>
    </div>` : ''}
    ${items.length ? `<div class="grid grid-2 sm-grid-3">${cards.join('')}</div>` : `<div class="empty">Nothing in the closet yet. Add a few pieces to start building outfits.</div>`}
  `;
}

function outfitBuilderTab(ctx){
  const items = ctx.state.closet;
  const byCat = key => items.filter(i => i.category === key);
  const slot = (key, label, required) => `
    <div class="field">
      <label>${label}${required ? '' : ' (optional)'}</label>
      <select data-slot="${key}">
        <option value="">— none —</option>
        ${byCat(key).map(i => `<option value="${i.id}" ${builder[key]===i.id?'selected':''}>${escapeHtml(i.color || '')} ${escapeHtml(i.fit || '')} ${CLOTHING_CATEGORIES.find(c=>c.key===key)?.label}</option>`).join('')}
      </select>
    </div>`;

  return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-title">Build an outfit</div>
      ${slot('top', 'Top', true)}
      ${slot('bottom', 'Bottom', true)}
      ${slot('shoes', 'Shoes', true)}
      ${slot('outerwear', 'Outerwear')}
      ${slot('accessory', 'Accessory')}
      <div class="field mt-0"><label>Occasion</label>
        <select id="occasion">${selectOptions(OCCASIONS, builder.occasion)}</select>
      </div>
      <button class="btn btn-primary btn-block" id="score-outfit">Score this outfit</button>
    </div>
    ${lastScore ? scoreCard(lastScore) : ''}
  `;
}

function scoreCard(result){
  return `
    <div class="card" style="margin-bottom:14px">
      <div class="row between" style="margin-bottom:8px">
        <div class="card-title" style="margin:0">Style score</div>
        <div class="num" style="font-size:1.6rem;font-weight:700;color:var(--accent-soft)">${result.total}<span class="muted" style="font-size:0.9rem;font-weight:500">/10</span></div>
      </div>
      ${result.breakdown.map(b => `
        <div class="hairline-block" style="padding-top:10px;margin-top:10px">
          <div class="row between"><span class="small" style="font-weight:600">${escapeHtml(b.label)}</span><span class="small muted">${b.score}/10</span></div>
          <p class="small muted" style="margin-top:4px">${escapeHtml(b.reason)}</p>
        </div>
      `).join('')}
      <button class="btn btn-ghost btn-block" id="save-outfit" style="margin-top:14px">Save this outfit</button>
    </div>
  `;
}

function savedOutfitsTab(ctx){
  const outfits = ctx.state.outfits;
  if (!outfits.length) return `<div class="empty">No saved outfits yet — build one in the Outfit Builder tab.</div>`;
  const itemLabel = id => {
    const item = ctx.state.closet.find(i => i.id === id);
    return item ? `${item.color || ''} ${item.fit || ''}`.trim() : null;
  };
  return `<div class="stack">${outfits.slice().reverse().map(o => `
    <div class="card">
      <div class="row between">
        <span class="tag tag-phase">${escapeHtml(o.occasion)}</span>
        <div class="num" style="font-weight:700;color:var(--accent-soft)">${o.lastScore}/10</div>
      </div>
      <ul class="stack" style="margin-top:10px">
        ${Object.entries(o.itemIds).filter(([,v]) => v).map(([k,v]) => `<li class="small"><span class="muted">${k}:</span> ${escapeHtml(itemLabel(v) || 'removed item')}</li>`).join('')}
      </ul>
    </div>
  `).join('')}</div>`;
}

const TABS = { closet: closetTab, builder: outfitBuilderTab, saved: savedOutfitsTab };

export async function renderStyle(root, ctx){
  const body = await TABS[activeTab](ctx);
  root.innerHTML = `
    <div class="container">
      <div class="page-head">
        <h1>Style</h1>
        <p class="sub">A closet you actually track, and an outfit score you can see the reasoning behind.</p>
      </div>
      <div class="chip-row" style="margin-bottom:16px">
        <button type="button" class="chip${activeTab==='closet'?' on':''}" data-tab="closet">Closet</button>
        <button type="button" class="chip${activeTab==='builder'?' on':''}" data-tab="builder">Outfit builder</button>
        <button type="button" class="chip${activeTab==='saved'?' on':''}" data-tab="saved">Saved outfits</button>
      </div>
      <div id="tab-body">${body}</div>
    </div>
  `;

  root.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    renderStyle(root, ctx);
  }));

  const toggleAdd = document.getElementById('toggle-add');
  if (toggleAdd) toggleAdd.addEventListener('click', () => { showAddForm = !showAddForm; renderStyle(root, ctx); });

  const saveItem = document.getElementById('save-item');
  if (saveItem) saveItem.addEventListener('click', async () => {
    const category = document.getElementById('new-category').value;
    const color = document.getElementById('new-color').value;
    const fit = document.getElementById('new-fit').value;
    const formality = document.getElementById('new-formality').value;
    const notes = document.getElementById('new-notes').value;
    const fileInput = document.getElementById('new-photo');
    let photoId = null;
    if (fileInput.files[0]) photoId = await addPhoto({ blob: fileInput.files[0], type: 'closet' });
    update(s => {
      s.closet.push({ id: `c-${Date.now()}`, category, color, fit, formality, clean: true, notes, photoId, createdAt: Date.now() });
    });
    showAddForm = false;
    toast('Added to closet');
    renderStyle(root, ctx);
  });

  root.querySelectorAll('[data-item]').forEach(card => card.addEventListener('click', async () => {
    const id = card.dataset.item;
    const item = ctx.state.closet.find(i => i.id === id);
    if (!item) return;
    if (confirm('Remove this item from your closet?')){
      if (item.photoId) await deletePhoto(item.photoId);
      update(s => { s.closet = s.closet.filter(i => i.id !== id); });
      renderStyle(root, ctx);
    }
  }));

  root.querySelectorAll('[data-slot]').forEach(sel => sel.addEventListener('change', e => {
    builder[e.target.dataset.slot] = e.target.value;
  }));
  const occasionSel = document.getElementById('occasion');
  if (occasionSel) occasionSel.addEventListener('change', e => { builder.occasion = e.target.value; });

  const scoreBtn = document.getElementById('score-outfit');
  if (scoreBtn) scoreBtn.addEventListener('click', () => {
    const items = ['top','bottom','shoes','outerwear','accessory']
      .map(k => ctx.state.closet.find(i => i.id === builder[k]))
      .filter(Boolean);
    if (!items.length){ toast('Pick at least one item first'); return; }
    lastScore = scoreOutfit(items, builder.occasion);
    renderStyle(root, ctx);
  });

  const saveOutfitBtn = document.getElementById('save-outfit');
  if (saveOutfitBtn) saveOutfitBtn.addEventListener('click', () => {
    update(s => {
      s.outfits.push({
        id: `o-${Date.now()}`, name: '', occasion: builder.occasion,
        itemIds: { top: builder.top, bottom: builder.bottom, shoes: builder.shoes, outerwear: builder.outerwear, accessory: builder.accessory },
        lastScore: lastScore.total, createdAt: Date.now()
      });
    });
    toast('Outfit saved');
  });
}
