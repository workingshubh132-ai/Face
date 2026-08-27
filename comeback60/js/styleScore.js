// An explainable outfit score: five fixed criteria, each computed from a
// simple stated rule, shown with its own contribution. Never a black-box
// number — the whole point of "explainable" is that a person can see exactly
// why an outfit scored what it did and know what to change.

export const CLOTHING_CATEGORIES = [
  { key: 'top',        label: 'Top' },
  { key: 'bottom',      label: 'Bottom' },
  { key: 'shoes',       label: 'Shoes' },
  { key: 'outerwear',   label: 'Outerwear' },
  { key: 'accessory',   label: 'Accessory' }
];

export const FITS = ['slim', 'regular', 'oversized'];
export const FORMALITIES = ['casual', 'smart-casual', 'formal'];
export const OCCASIONS = ['casual', 'smart-casual', 'formal', 'gym'];

export const COLOR_OPTIONS = [
  { key: 'black', label: 'Black', neutral: true },
  { key: 'white', label: 'White', neutral: true },
  { key: 'grey',  label: 'Grey',  neutral: true },
  { key: 'navy',  label: 'Navy',  neutral: true },
  { key: 'beige', label: 'Beige', neutral: true },
  { key: 'brown', label: 'Brown', neutral: true },
  { key: 'olive', label: 'Olive', neutral: true },
  { key: 'red',    label: 'Red',    neutral: false },
  { key: 'blue',   label: 'Blue',   neutral: false },
  { key: 'green',  label: 'Green',  neutral: false },
  { key: 'yellow', label: 'Yellow', neutral: false },
  { key: 'orange', label: 'Orange', neutral: false },
  { key: 'purple', label: 'Purple', neutral: false },
  { key: 'pink',   label: 'Pink',   neutral: false }
];

const isNeutral = colorKey => COLOR_OPTIONS.find(c => c.key === colorKey)?.neutral ?? true;
const formalityIndex = f => Math.max(0, FORMALITIES.indexOf(f));

function colorCoordinationScore(items){
  const accents = new Set(items.filter(i => i.color && !isNeutral(i.color)).map(i => i.color));
  if (accents.size === 0) return { score: 8, reason: 'All neutral tones — safe and coordinated, though never the flashiest choice.' };
  if (accents.size === 1) return { score: 10, reason: 'One accent colour against neutrals — a clean, deliberate look.' };
  if (accents.size === 2) return { score: 6, reason: 'Two accent colours competing for attention — pick one to lead.' };
  return { score: 3, reason: 'Three or more accent colours — likely to look busy rather than intentional.' };
}

function fitBalanceScore(items){
  const top = items.find(i => i.category === 'top');
  const bottom = items.find(i => i.category === 'bottom');
  if (!top?.fit || !bottom?.fit) return { score: 6, reason: 'Set a fit on the top and bottom to score this properly.' };
  if (top.fit === bottom.fit && top.fit === 'oversized') return { score: 5, reason: 'Oversized top and oversized bottom together tends to read as shapeless.' };
  if (top.fit === bottom.fit) return { score: 8, reason: `Matching ${top.fit} fit top-to-bottom — clean and safe.` };
  return { score: 10, reason: `${top.fit[0].toUpperCase()+top.fit.slice(1)} top with a ${bottom.fit} bottom — a deliberate silhouette contrast.` };
}

function formalityMatchScore(items){
  const withFormality = items.filter(i => i.formality);
  if (withFormality.length < 2) return { score: 7, reason: 'Set formality on more pieces to score this properly.' };
  const idxs = withFormality.map(i => formalityIndex(i.formality));
  const spread = Math.max(...idxs) - Math.min(...idxs);
  if (spread === 0) return { score: 10, reason: 'Every piece sits at the same formality level.' };
  if (spread === 1) return { score: 7, reason: 'One tier of formality spread — still reads as coherent.' };
  return { score: 4, reason: 'Casual and formal pieces mixed — usually reads as a mistake rather than a style choice.' };
}

function cleanlinessScore(items){
  const rated = items.filter(i => typeof i.clean === 'boolean');
  if (!rated.length) return { score: 6, reason: 'Mark each piece clean or not to score this properly.' };
  const cleanCount = rated.filter(i => i.clean).length;
  const pct = cleanCount / rated.length;
  if (pct === 1) return { score: 10, reason: 'Every piece is clean and ready.' };
  if (pct >= 0.5) return { score: 6, reason: 'Some pieces need a wash before this outfit is really ready.' };
  return { score: 2, reason: 'Most of this outfit needs washing first — that undoes everything else here.' };
}

function occasionScore(items, occasion){
  if (!occasion) return { score: 6, reason: 'Pick an occasion to score suitability.' };
  const withFormality = items.filter(i => i.formality);
  if (!withFormality.length) return { score: 6, reason: 'Set formality on the pieces to score suitability.' };
  const avgIdx = withFormality.reduce((a, i) => a + formalityIndex(i.formality), 0) / withFormality.length;
  const targetIdx = occasion === 'gym' ? 0 : formalityIndex(occasion);
  const diff = Math.abs(avgIdx - targetIdx);
  if (diff < 0.5) return { score: 10, reason: `Formality matches a ${occasion} occasion well.` };
  if (diff < 1.5) return { score: 6, reason: `Close to right for ${occasion}, but not a precise match.` };
  return { score: 2, reason: `This reads as too ${avgIdx > targetIdx ? 'formal' : 'casual'} for ${occasion}.` };
}

const CRITERIA = [
  { key: 'color',      label: 'Colour coordination', weight: 30, fn: colorCoordinationScore },
  { key: 'fit',        label: 'Fit balance',         weight: 25, fn: fitBalanceScore },
  { key: 'formality',  label: 'Formality match',     weight: 20, fn: formalityMatchScore },
  { key: 'clean',      label: 'Cleanliness',         weight: 15, fn: cleanlinessScore },
  { key: 'occasion',   label: 'Occasion suitability',weight: 10, fn: occasionScore }
];

// items: array of closet items actually included in the outfit (skip empty
// slots). Total is out of 10, matching "STYLE SCORE 8.4/10" — each criterion
// contributes its 0-10 score scaled by its weight-as-a-fraction, so the parts
// always sum to the same 0-10 scale as the whole.
export function scoreOutfit(items, occasion){
  const populated = items.filter(Boolean);
  const breakdown = CRITERIA.map(c => {
    const { score, reason } = c.key === 'occasion' ? c.fn(populated, occasion) : c.fn(populated);
    return { key: c.key, label: c.label, weight: c.weight, score, reason, contribution: Math.round(score * c.weight) / 100 };
  });
  const total = breakdown.reduce((a, b) => a + b.contribution, 0);
  return { total: Math.round(total * 10) / 10, breakdown };
}
