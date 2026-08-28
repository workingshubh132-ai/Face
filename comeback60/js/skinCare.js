// Acne-specific content, adapted from the same source as Skinprint's "pimples"
// concern (this repo's other app) so the two apps say the same true things in
// the same voice. Cosmetic and lifestyle guidance only — no diagnosis, no
// prescription actives, no promises. Severe or persistent acne is a
// dermatologist's job; this module says so rather than pretending a tracker
// can treat it.

export const ACNE_CAUSES = {
  why: [
    'A pore blocks when dead skin cells that should shed stick together and plug the opening.',
    'Oil keeps being produced behind that plug, so it builds up with nowhere to go.',
    "Bacteria that live on everyone's skin feed on that trapped oil and multiply inside the blocked pore.",
    'Your immune system reacts to them — that reaction is the redness, the swelling and the soreness. The white tip is white blood cells, not dirt.'
  ],
  worse: [
    'Hormonal shifts — puberty, periods, stress — increase oil production directly. This is why spots cluster on the jaw and chin for many people.',
    'Friction and pressure: helmet straps, phone screens, masks, resting your chin on your hand.',
    'Heavy or oily products sitting on the skin, including thick hair oils that migrate onto the forehead.',
    'Picking. It pushes the contents deeper, widens the inflammation, and turns a spot that would have healed cleanly into a mark that lasts months.'
  ],
  myths: [
    'Not caused by being unclean. Washing more often makes it worse, not better.',
    'Chocolate and oily food are not established causes, though a very high-sugar diet may play a role for some people.'
  ]
};

export const ACNE_DIET = {
  avoid: [
    'High-glycemic foods eaten often — white bread, white rice, sugary drinks, pastries. Cut back rather than cut out; this is a modest lever, not a fix.',
    'A lot of daily milk specifically shows a real but modest link to more breakouts for some people. Cheese and yoghurt show a weaker link.',
    'Whey protein powder taken daily, for the same hormonal reason as milk — worth a two-month break if you are on it and breaking out along the jaw.'
  ],
  help: [
    'Nothing you eat clears skin on its own. The routine and consistency below do the real work — this is maybe an extra 10%.',
    'If you want to test a change, drop one thing for six to eight weeks and watch — not everything at once, or you will not know what changed.'
  ]
};

export const ACNE_PRODUCTS = [
  { role: 'Cleanser',    name: 'Minimalist Salicylic Acid 2% Face Wash',      why: 'Gets into the pore lining instead of just cleaning the surface.', price: '~₹300' },
  { role: 'Treatment',   name: 'The Derma Co 2% Salicylic Acid Serum',        why: 'Apply only where you break out, starting 3 nights a week.', price: '~₹500' },
  { role: 'Moisturiser', name: 'Minimalist Sepicalm 3% Moisturizer',          why: 'Oil-free, and calms the redness around active spots.', price: '~₹350' },
  { role: 'Sunscreen',   name: "Re'equil Ultra Matte Dry Touch SPF 50",       why: 'Does not feel greasy over acne-prone skin, and stops marks darkening.', price: '~₹700' }
];

// A four-week ramp mirrors Skinprint's rampSchedule pattern: one new thing at
// a time, so a reaction is easy to trace and easy to reverse.
export const ACNE_RAMP = [
  { week: 'Week 1', doing: 'Only the basics: a gentle cleanser, the oil-free moisturiser, and sunscreen every morning. Nothing active yet.', why: 'A week of just the boring steps shows you what your skin does with no treatment acting on it — most people never see this baseline.' },
  { week: 'Week 2', doing: 'Add the salicylic acid treatment, two nights only — say Tuesday and Saturday, only on the areas that actually break out.', why: 'Two nights is enough to see how your skin takes it and few enough that a reaction is easy to walk back.' },
  { week: 'Week 3', doing: 'If week 2 was comfortable, go to three or four nights. If it stung or flaked, stay at two.', why: 'Going up slowly is the difference between a routine that lasts and one abandoned after a bad week.' },
  { week: 'Weeks 4-8', doing: 'Change nothing else. Photograph your face in the same light on the same day each week.', why: 'Skin turns over on a four-to-six week cycle. Judging it sooner means judging it before it has actually had a chance to work.' }
];

export const ACNE_TIMELINE = [
  { when: 'First two weeks', what: 'Often no visible change, sometimes slightly more spots as things already forming come to the surface. This is the stage most people quit at — do not.' },
  { when: 'Weeks 3-6', what: 'Fewer new spots. The ones that do appear settle faster and leave less behind.' },
  { when: 'Weeks 6-12', what: 'The overall picture calms. Marks left behind are still fading on their own slower clock.' },
  { when: 'See a dermatologist if', what: 'It is cystic or deeply painful, it is spreading rather than settling, nothing here has helped after 8-10 honest weeks, or it is affecting how you feel about leaving the house. That is not this app\'s job — a dermatologist can prescribe things a tracker never will, and there is no shame in needing that.' }
];

// A 1-5 self-rating, logged per day from the Skin tab — separate from the
// fixed daily checklist so it never inflates the 26-item count, but tracked
// exactly like sleep quality is: a number over time, not a diagnosis.
export const SKIN_LOG_LABELS = ['Flared up', 'Rough', 'Okay', 'Calm', 'Clear'];
