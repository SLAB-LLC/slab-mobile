// ============ MILITARY SKIN (theme.skin 'military') ============
// Built for Militia Marketing's pilot (2026-11-21): their reps run a fully military app. Each piece is a
// tenant switch, so any company can use it:
//   brand.tabs            bottom-bar names from labels.tabs (any company; Militia: Boot Camp, Intel, Comms,
//                         Ranks, Arsenal)
//   brand.skin 'military' stencil type, camo top and bottom bars, dog-tag XP pill, XP ranks from Recruit to
//                         General (in the XP pill, on the leaderboard, a "Promoted" toast), military copy in
//                         the toasts
//   features.extraGear    'fatigues' (urban camo), 'patrolcap' (camo patrol cap), 'helmet' (combat helmet,
//                         600 XP), 'dressuniform' (officer's dress uniform, 2000 XP), 'campaignhat' (drill
//                         sergeant's campaign hat, 2500 XP)
// Like Cade's tux, every company's app draws the military gear, so a rep wearing it shows that way everywhere;
// only a company with the switch can pick it.

const MIL = !!(APP && APP.brand && APP.brand.skin === 'military');

// ---- bottom-bar names (labels.tabs) ----
appSafe('tab names', () => {
  const tabs = (APP && APP.brand && APP.brand.tabs) || {};
  Object.entries(tabs).forEach(([page, name]) => {
    if (typeof name !== 'string' || !name.trim()) return;
    document.querySelectorAll(`.navbtn[data-page="${page}"]`).forEach(b => {
      const t = [...b.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
      if (t) t.textContent = ' ' + name.trim() + ' ';
      if (page !== 'chat') b.setAttribute('aria-label', name.trim());
    });
  });
});

// ---- the gear (drawn in every app, pickable where features.extraGear has it) ----
appSafe('military gear', () => {
  const mine = (APP && APP.features && Array.isArray(APP.features.extraGear)) ? APP.features.extraGear : [];
  const ITEMS = [
    { slot:'top', id:'fatigues',     name:'Urban camo fatigues',      xp:0 },
    { slot:'hat', id:'patrolcap',    name:'Camo patrol cap',          xp:0 },
    { slot:'hat', id:'helmet',       name:'Combat helmet',            xp:600 },
    { slot:'top', id:'dressuniform', name:'Officer’s dress uniform',  xp:2000 },
    { slot:'hat', id:'campaignhat',  name:'Drill sergeant’s hat',     xp:2500 },
  ];
  ITEMS.forEach(it => {
    if (GEAR[it.slot].some(g => g.id === it.id)) return;
    // 'limited' keeps them out of everyone else's random looks
    const g = { id:it.id, name:it.name, xp:it.xp, limited:'militia' };
    GEAR[it.slot].push(g);
    if (mine.includes(it.id)) { if (g.xp > 0) { ALL_GEAR.push({ ...g, slot:it.slot }); ALL_GEAR.sort((a, b) => a.xp - b.xp); } }
    else document.head.insertAdjacentHTML('beforeend', `<style>.cr-tile[data-v="${it.id}"]{ display:none; }</style>`);
  });

  // urban camo in Militia's black, white and steel: four greys in blobs, from a fixed hash so every sprite matches
  const WOOD = ['#6b7078', '#3a3e44', '#9aa1a9', '#1c1e22'];
  const h = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const camo = (x, y) => {
    const b = h(Math.floor((x + (y % 2)) / 3), Math.floor(y / 2));
    return b < 0.38 ? WOOD[0] : b < 0.64 ? WOOD[1] : b < 0.86 ? WOOD[2] : WOOD[3];
  };
  // shirts: recolored over the base shirt with its shading kept (the holiday outfits' way)
  TOP_OF.fatigues = 'fatigues';
  WEAR.OUTFITS.fatigues = (x, y) => {
    if ((y === 26 || y === 27) && ((x >= 12 && x <= 15) || (x >= 22 && x <= 25))) return y === 26 ? '#2a2d32' : camo(x, y);   // pocket flaps
    if (y === 27 && x >= 21 && x <= 25) return '#e9e4d2';                                                                   // name tape
    return camo(x, y);
  };
  TOP_OF.dressuniform = 'dressuniform';
  const RIB = ['#c8202a', '#f4f1ea', '#1f3fa8', '#e2b84a', '#2f9a46', '#c8202a'];
  WEAR.OUTFITS.dressuniform = (x, y) => {
    const c = Math.abs(x - 18.5);
    if (y <= 24 && c < 1.6) return '#d9d4c4';                                       // shirt and tie at the collar
    if (y <= 25 && c < 2.4) return '#5a3a1e';                                       // the tie
    if ((x === 18 || x === 19) && y >= 26 && y % 2 === 0) return '#e2b84a';         // brass buttons
    if (y >= 25 && y <= 26 && x >= 12 && x <= 16) return RIB[(x - 12 + (y - 25) * 2) % RIB.length];   // ribbon rack
    if (y === 24 && (x === 12 || x === 25)) return '#e2b84a';                       // collar brass
    if (y >= 23 && y <= 24 && (x <= 11 || x >= 26)) return '#e2b84a';               // shoulder boards
    return y % 7 === 0 ? '#101114' : '#1b1d22';
  };

  // hats: drawn over the head like the holiday hats (HAT_OF), headroom included
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const span = (g, y, x0, x1, c) => { g.fillStyle = c; g.fillRect(x0, y, x1 - x0 + 1, 1); };
  const O = '#140c0c';
  const rowsHat = (g, rows, fill, edge) => {
    for (const [y, [a, b]] of Object.entries(rows)) { span(g, +y, a - 1, b + 1, O); for (let x = a; x <= b; x++) px(g, x, +y, fill(x, +y)); px(g, b, +y, edge); }
  };
  HAT_OF.patrolcap = 'patrolcap';
  WEAR.HATS.patrolcap = (g) => {
    // flat top, straight sides, short stiff brim
    rowsHat(g, { 0:[9,26], 1:[9,26], 2:[9,26], 3:[9,26], 4:[9,26], 5:[9,26] }, camo, '#2a2d32');
    span(g, -1, 9, 26, O);
    span(g, 6, 7, 28, O); span(g, 7, 7, 28, '#3a3e44'); span(g, 8, 8, 27, O);
  };
  HAT_OF.helmet = 'helmet';
  WEAR.HATS.helmet = (g) => {
    rowsHat(g, { '-2':[13,22], '-1':[11,24], 0:[10,25], 1:[9,26], 2:[8,27], 3:[8,27], 4:[7,28], 5:[7,28], 6:[7,28] }, camo, '#2a2d32');
    span(g, -3, 13, 22, O);
    span(g, 3, 8, 27, '#1c1e22');                                                    // the elastic band
    [[11,2],[12,1],[24,2],[25,3]].forEach(([x, y]) => px(g, x, y, '#c9ced4'));        // scrim tucked in the band
    span(g, 7, 6, 29, O); span(g, 8, 6, 29, '#33373c'); span(g, 9, 6, 29, O);
  };
  HAT_OF.campaignhat = 'campaignhat';
  WEAR.HATS.campaignhat = (g) => {
    const T = '#9c7a4a', t = '#7c5e36';
    // the crown with its four dents, a dark band, and the wide flat brim
    rowsHat(g, { '-4':[14,21], '-3':[13,22], '-2':[12,23], '-1':[12,23], 0:[12,23], 1:[12,23], 2:[12,23] }, (x, y) => (y === -4 && (x === 17 || x === 18)) || (y < -1 && (x === 14 || x === 21)) ? t : T, t);
    span(g, -5, 14, 21, O);
    span(g, 3, 12, 23, '#3a2a1a'); span(g, 4, 12, 23, '#3a2a1a');
    span(g, 5, 1, 34, O); span(g, 6, 1, 34, T); span(g, 7, 2, 33, t); span(g, 8, 2, 33, O);
  };
});

if (MIL) appSafe('military skin', () => {
  document.documentElement.classList.add('skin-military');

  // ---- stencil type: everything set in Anton gets Black Ops One first ----
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap">');
  const STENCIL = "'Black Ops One'";
  [...document.styleSheets].forEach(sh => {
    let rules; try { rules = sh.cssRules; } catch (e) { return; }
    const walk = (list) => [...list].forEach(r => {
      if (r.cssRules) walk(r.cssRules);
      if (r.style && /Anton/.test(r.style.fontFamily || '') && !/Black Ops One/.test(r.style.fontFamily)) r.style.fontFamily = STENCIL + ', ' + r.style.fontFamily;
    });
    walk(rules);
  });

  // ---- camo bars and dog-tag pill ----
  const camoSvg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
    <rect width="160" height="96" fill="#0c0d0f"/>
    <path d="M-6 18c14-14 34-10 44 2s30 10 34 22-16 20-34 14-26 6-40-2-16-24-4-36z" fill="#1b1d21"/>
    <path d="M70 -4c18-6 40 4 42 18s-12 18-28 16-30-20-14-34z" fill="#24272c"/>
    <path d="M104 40c14-10 40-8 50 6s-4 30-22 30-38-4-40-16 0-14 12-20z" fill="#1b1d21"/>
    <path d="M30 62c16-4 30 4 32 16s-14 22-30 18-24-28-2-34z" fill="#17191c"/>
    <path d="M118 2c10-4 22 0 24 8s-10 12-20 10-14-14-4-18z" fill="#17191c"/>
    <path d="M64 48c8-6 22-4 24 4s-6 14-16 12-14-10-8-16z" fill="#08090a"/>
    <path d="M140 74c8-2 16 4 14 12s-14 10-20 4 0-14 6-16z" fill="#08090a"/>
  </svg>`);
  document.head.insertAdjacentHTML('beforeend', `<style>
    .skin-military .topbar, .skin-military .navbar{ background:linear-gradient(rgba(8,9,10,.35), rgba(8,9,10,.35)), url("data:image/svg+xml,${camoSvg}") 0 0 / 160px 96px; }
    .skin-military .navbar{ border-top:2px solid var(--amber-line); }
    .skin-military .page-title{ font-family:${STENCIL}, 'Barlow Condensed', sans-serif; font-weight:400; text-transform:uppercase; letter-spacing:.02em; font-size:30px; }
    .skin-military .navbtn{ font-family:${STENCIL}, 'Barlow Condensed', sans-serif; font-weight:400; font-size:10px; letter-spacing:.04em; text-transform:uppercase; }
    .skin-military .xp-pill{ border-radius:6px 14px 14px 6px; background:linear-gradient(180deg, #d4d8dc, #8e949c); border-color:#5c6168; color:#0c0d0f; box-shadow:inset 0 1px 0 rgba(255,255,255,.55); padding-left:7px; }
    .skin-military .xp-pill::before{ content:''; width:5px; height:5px; border-radius:50%; background:#0c0d0f; opacity:.6; margin-right:2px; }
    .skin-military .xp-pill i{ display:none; }
    .mil-rk{ font-family:${STENCIL}, sans-serif; font-weight:400; letter-spacing:.05em; margin-right:4px; }
    .fx-chip.mil-chip{ font-family:${STENCIL}, sans-serif; font-weight:400; letter-spacing:.05em; color:var(--amber); border:1px solid var(--amber-line); background:var(--amber-dim); }
    .fx-chip.mil-chip svg{ width:12px; height:12px; margin-right:3px; vertical-align:-1px; }
  </style>`);

  // ---- page titles: the street is the mission; the other pages take their tab's name ----
  const tabs = APP.brand.tabs || {};
  const TITLES = { 'Your route':'Your mission', 'Leaderboard':tabs.leaderboard || 'Ranks', 'Library':tabs.library || 'Arsenal' };
  document.querySelectorAll('.page-title').forEach(h => { const t = TITLES[h.textContent.trim()]; if (t) h.textContent = t; });

  // ---- ranks: XP to a rank, shown in the XP pill and on the leaderboard ----
  const RANKS = [
    [0, 'Recruit', 'RCT'], [100, 'Private', 'PVT'], [300, 'Private First Class', 'PFC'], [600, 'Corporal', 'CPL'],
    [1000, 'Sergeant', 'SGT'], [1500, 'Staff Sergeant', 'SSG'], [2500, 'Sergeant First Class', 'SFC'],
    [4000, 'Lieutenant', 'LT'], [6000, 'Captain', 'CPT'], [9000, 'Major', 'MAJ'], [13000, 'Colonel', 'COL'], [20000, 'General', 'GEN'],
  ];
  const rankOf = (xp) => { let r = RANKS[0]; for (const k of RANKS) if ((xp || 0) >= k[0]) r = k; return r; };
  // chevrons for enlisted ranks, a bar for officers, a star for General
  const insignia = (r) => {
    const i = RANKS.indexOf(r);
    if (i === 0) return '';
    if (r[2] === 'GEN') return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.5 3.3 3.6.4-2.7 2.4.8 3.5L6 8.6 2.8 10.4l.8-3.5L.9 4.5l3.6-.4z" fill="currentColor"/></svg>';
    if (i >= 7) return '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="1" width="6" height="10" rx="1" fill="currentColor"/></svg>';
    const n = Math.max(1, Math.min(3, i));
    return '<svg viewBox="0 0 12 12" aria-hidden="true">' + Array.from({ length:n }, (_, k) => `<path d="M1 ${3 + k * 3}l5 -2.4 5 2.4v1.6l-5 -2.4 -5 2.4z" fill="currentColor"/>`).join('') + '</svg>';
  };
  let shownRank = null;
  const baseBadge = updateXPBadge;
  updateXPBadge = function(){
    baseBadge();
    const r = rankOf(currentXP), el = $('xp-badge-value');
    if (el) el.innerHTML = `<b class="mil-rk">${r[2]}</b>${currentXP} XP`;
    if (shownRank && r[0] > shownRank[0]) { showToast('Promoted: ' + r[1], 'ph-medal'); haptic('success'); }
    shownRank = r;
  };
  updateXPBadge();
  const baseChips = lbChips;
  lbChips = function(rep){
    const r = rankOf(rep && rep.xp);
    return `<span class="fx-chip mil-chip" title="${r[1]}">${insignia(r)}${r[2]}</span>` + baseChips(rep);
  };

  // ---- military copy in the toasts ----
  const SAY = [
    [/^Unlocked: /, 'Issued: '], [/^New ride: /, 'New vehicle: '], [/^Chat unlocked$/, 'Comms online'],
    [/^The Vault is open$/, 'Intel cleared: the Vault is open'], [/^Lesson complete/, 'Mission complete'],
  ];
  const baseToast = showToast;
  showToast = function(text, icon){
    let t = String(text == null ? '' : text);
    SAY.forEach(([re, to]) => { t = t.replace(re, to); });
    return baseToast(t, icon);
  };
});
