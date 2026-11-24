// ============ MILITARY SKIN (theme.skin 'military') ============
// Built for Militia Marketing's pilot (2026-11-21): their reps run a fully military app. Each piece is a
// tenant switch, so any company can use it:
//   brand.tabs            bottom-bar names from labels.tabs (any company; Militia: Boot Camp, Intel, Comms,
//                         Ranks, Arsenal)
//   brand.skin 'military' Militia's black camo as the backdrop behind every page, stencil type, dog-tag XP pill,
//                         XP ranks from Recruit to General (XP pill, leaderboard, "Promoted" toast), military
//                         copy in the toasts, and an all-military locker (civilian pieces come out; the whole
//                         kit below is theirs without listing it)
//   features.extraGear    the kit, for any other company: tops fatigues, olivefatigues, platecarrier (1200),
//                         dressuniform (2000), ghillie (3000); hats patrolcap, boonie, beret (450), helmet (600),
//                         opscap (1000, NVGs flipped up), campaignhat (2500); pants olivecargo, tactical,
//                         urbancamo (400), camopants (800); boots combat, desert (350); extras dogtags,
//                         facepaint (250), ballistic (500), nvg (1500)
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
  // the military skin comes with the whole kit; any other company picks pieces with features.extraGear
  const mine = (APP && APP.features && Array.isArray(APP.features.extraGear)) ? APP.features.extraGear.slice() : [];
  const ITEMS = [
    { slot:'top',   id:'fatigues',      name:'Urban camo fatigues',      xp:0 },
    { slot:'top',   id:'olivefatigues', name:'Woodland fatigues',        xp:0 },
    { slot:'top',   id:'platecarrier',  name:'Plate carrier',            xp:1200 },
    { slot:'top',   id:'dressuniform',  name:'Officer’s dress uniform',  xp:2000 },
    { slot:'top',   id:'ghillie',       name:'Ghillie suit',             xp:3000 },
    { slot:'hat',   id:'patrolcap',     name:'Camo patrol cap',          xp:0 },
    { slot:'hat',   id:'boonie',        name:'Boonie hat',               xp:0 },
    { slot:'hat',   id:'beret',         name:'Black beret',              xp:450 },
    { slot:'hat',   id:'helmet',        name:'Combat helmet',            xp:600 },
    { slot:'hat',   id:'opscap',        name:'Ops cap + NVGs',           xp:1000 },
    { slot:'hat',   id:'campaignhat',   name:'Drill sergeant’s hat',     xp:2500 },
    { slot:'pants', id:'olivecargo',    name:'Olive cargos',             xp:0 },
    { slot:'pants', id:'tactical',      name:'Black tactical pants',     xp:0 },
    { slot:'pants', id:'urbancamo',     name:'Urban camo pants',         xp:400 },
    { slot:'pants', id:'camopants',     name:'Woodland camo pants',      xp:800 },
    { slot:'shoes', id:'combat',        name:'Combat boots',             xp:0 },
    { slot:'shoes', id:'desert',        name:'Desert boots',             xp:350 },
    { slot:'extra', id:'dogtags',       name:'Dog tags',                 xp:0 },
    { slot:'extra', id:'facepaint',     name:'Face paint',               xp:250 },
    { slot:'extra', id:'ballistic',     name:'Ballistic glasses',        xp:500 },
    { slot:'extra', id:'nvg',           name:'Night vision goggles',     xp:1500 },
  ];
  if (MIL) ITEMS.forEach(it => { if (!mine.includes(it.id)) mine.push(it.id); });
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
  // ================= the full kit (2026-11-23, Duncan's inspo: black-ops plate carrier, olive fatigues,
  // ghillie suit, NVGs, dog tags, combat boots) =================
  // Solid pieces go straight into the sprite tables; patterns and details are painted over the composed
  // sprite (composeSprite below), so every pose, the street, the leaderboard and the locker all show them.
  TOPS.olivefatigues = { body:'#55633a', sleeve:'long' };
  TOPS.platecarrier  = { body:'#1d1f23', sleeve:'long', sleeveColor:'#34373d' };
  TOPS.ghillie       = { body:'#5d6b36', sleeve:'long' };
  TOPS.__milA = { body:'#010101', sleeve:'long', sleeveColor:'#010101' };   // probes: arms vs. torso
  TOPS.__milB = { body:'#010101', sleeve:'long', sleeveColor:'#fefefe' };
  PANTS.olivecargo = '#55603a'; PANTS.tactical = '#1d1e22'; PANTS.camopants = '#55633a'; PANTS.urbancamo = '#5f646b';
  SHOES.combat = '#16171a'; SHOES.desert = '#9c7b52';

  const WOODLAND = ['#55633a', '#3b4527', '#6e5a3c', '#1f2416', '#7d8c4c'];
  const URBAN = ['#6b7078', '#3a3e44', '#9aa1a9', '#1c1e22'];
  const GHILLIE = ['#6f7d3a', '#8a9a4a', '#4f5a2a', '#a59a5a', '#3c4422', '#76663e'];
  const blot = (pal, w) => (x, y) => {
    const b = h(Math.floor((x + (y % 2)) / 3) + 101, Math.floor(y / 2) + 37);
    return b < w[0] ? pal[0] : b < w[1] ? pal[1] : b < w[2] ? pal[2] : pal[3];
  };
  const woodland = (x, y) => { const c = blot(WOODLAND, [0.34, 0.6, 0.82])(x, y); return h(x * 7 + 3, y * 5 + 1) > 0.93 ? WOODLAND[4] : c; };
  const urban = blot(URBAN, [0.38, 0.64, 0.86]);

  const rgb = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lum = (c) => { const [r, g, b] = rgb(c); return r + g + b; };
  const MIL_TOP = new Set(['olivefatigues', 'platecarrier', 'ghillie']);
  const MIL_PANTS = new Set(['olivecargo', 'tactical', 'camopants', 'urbancamo']);
  const MIL_SHOES = new Set(['combat', 'desert']);
  const MIL_EXTRA = new Set(['dogtags', 'facepaint', 'ballistic', 'nvg']);
  const MIL_HAT = new Set(['opscap']);
  const isMil = (look) => look && (MIL_TOP.has(look.top) || MIL_PANTS.has(look.pants) || MIL_SHOES.has(look.shoes) || MIL_EXTRA.has(look.extra) || MIL_HAT.has(look.hat));

  const baseCompose = composeSprite;
  composeSprite = function(look, pose, mood){
    if (!isMil(look)) return baseCompose(look, pose, mood);
    const sub = { ...look };
    if (MIL_EXTRA.has(look.extra)) sub.extra = 'none';
    if (MIL_HAT.has(look.hat)) sub.hat = 'cap';
    const g0 = baseCompose(sub, pose, mood), g = g0.map(r => r.slice());   // masks compare against g0, paint goes on g
    const W = g[0].length, H = g.length;
    const dir = /^side|^knockside/.test(pose) ? 'side' : /^up|^knock-/.test(pose) ? 'up' : 'down';
    const other = (patch) => baseCompose({ ...sub, ...patch }, pose, mood);
    const mask = (a, b) => a.map((row, y) => row.map((c, x) => !!c && c !== OUTLINE && c !== b[y][x]));
    const each = (m, f) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y][x]) f(x, y); };
    const bbox = (m) => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; each(m, (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); return { x0, y0, x1, y1, ok:x1 >= 0 }; };
    // recolor keeping the sprite's own shading
    const recolor = (m, pick) => {
      let ref = 0, n = 0; each(m, (x, y) => { ref += lum(g0[y][x]); n++; }); ref /= Math.max(1, n);
      each(m, (x, y) => { const s = Math.max(0.55, Math.min(1.25, lum(g0[y][x]) / ref)), [r, gg, b] = rgb(pick(x, y)); g[y][x] = hex(r * s, gg * s, b * s); });
    };
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
    const shirt = () => mask(g0, other({ top: look.top === 'oxford' ? 'crew' : 'oxford' }));
    const pantsM = () => mask(g0, other({ pants: look.pants === 'khaki' ? 'black' : 'khaki' }));

    // ---- tops ----
    if (look.top === 'olivefatigues') recolor(shirt(), woodland);
    if (look.top === 'platecarrier') {
      const a = baseCompose({ ...sub, top:'__milA' }, pose, mood), b = baseCompose({ ...sub, top:'__milB' }, pose, mood);
      const arms = mask(b, a), sh = shirt();
      const torso = sh.map((row, y) => row.map((v, x) => v && !arms[y][x]));
      recolor(torso, () => '#141518');
      const t = bbox(torso);
      if (t.ok && dir !== 'side') {
        const cx = Math.round((t.x0 + t.x1) / 2), w = t.x1 - t.x0;
        if (dir === 'down') {
          // mag pouches across the belly: three blocks with red and amber mags poking out (the inspo's stripes)
          const py = t.y1 - 3;
          for (let k = -1; k <= 1; k++) {
            const x0 = cx + k * 4 - 1;
            for (let yy = py; yy <= t.y1 - 1; yy++) for (let xx = x0; xx <= x0 + 2; xx++) if (torso[yy] && torso[yy][xx]) put(xx, yy, yy === py ? '#2c2f35' : '#24262b');
          }
          for (let yy = t.y0 + 2; yy < py; yy++) { [cx - 2, cx + 1].forEach((xx, i) => { if (torso[yy] && torso[yy][xx]) put(xx, yy, (yy + i) % 2 ? '#b8322a' : '#d8a63a'); }); }
          // shoulder straps
          for (let yy = t.y0; yy <= t.y0 + 1; yy++) { put(t.x0 + 2, yy, '#2c2f35'); put(t.x1 - 2, yy, '#2c2f35'); }
        } else {
          // the back plate: a drag handle up top and a hydration strip
          for (let xx = cx - 2; xx <= cx + 1; xx++) put(xx, t.y0 + 1, '#3a3d43');
          for (let yy = t.y0 + 3; yy <= t.y1 - 2; yy++) put(cx - (w > 10 ? 0 : 0), yy, '#24262b');
        }
      }
    }
    if (look.top === 'ghillie') {
      // the whole body under leafy strands: shirt, sleeves, pants and hair (a hood), face and hands left clear
      const sh = shirt(), pm = pantsM(), hair = mask(g0, other({ hairColor:(look.hairColor === 3 ? 0 : 3) }));
      const all = g.map((row, y) => row.map((c, x) => sh[y][x] || pm[y][x] || hair[y][x]));
      each(all, (x, y) => { g[y][x] = GHILLIE[Math.floor(h(x * 3 + 11, y * 7 + 5) * GHILLIE.length)]; });
      // ragged fringe hanging off the edges
      const add = [];
      for (let y = 1; y < H - 4; y++) for (let x = 0; x < W; x++) {
        if (g[y][x] && g[y][x] !== OUTLINE) continue;
        const near = [[1, 0], [-1, 0], [0, -1], [1, -1], [-1, -1]].some(([dx, dy]) => all[y + dy] && all[y + dy][x + dx]);
        if (near && h(x * 13 + 7, y * 17 + 3) < 0.55) add.push([x, y, GHILLIE[Math.floor(h(x + 5, y + 9) * GHILLIE.length)]]);
      }
      add.forEach(([x, y, c]) => put(x, y, c));
    }

    // ---- pants ----
    if (look.pants === 'camopants') recolor(pantsM(), woodland);
    if (look.pants === 'urbancamo') recolor(pantsM(), urban);
    if ((look.pants === 'olivecargo' || look.pants === 'camopants' || look.pants === 'tactical') && dir !== 'up' && look.top !== 'ghillie') {
      // cargo pockets on the outer thighs
      const m = pantsM(), b = bbox(m);
      if (b.ok) for (let yy = b.y0 + 5; yy <= b.y0 + 6; yy++) {
        const cols = dir === 'side' ? [Math.round((b.x0 + b.x1) / 2)] : [b.x0 + 1, b.x1 - 1];
        cols.forEach(xx => { if (m[yy] && m[yy][xx]) put(xx, yy, look.pants === 'tactical' ? '#0f1012' : '#2f3720'); });
      }
    }

    // ---- boots: the shaft runs two rows up the leg, laces down the front ----
    if (MIL_SHOES.has(look.shoes) && look.pants !== 'shorts') {
      const shoes = mask(g0, other({ shoes: 'sneaker' })), pm = pantsM();
      const c = SHOES[look.shoes], lace = look.shoes === 'combat' ? '#3a3c42' : '#6e5434';
      for (let x = 0; x < W; x++) {
        let top = -1; for (let y = 0; y < H; y++) if (shoes[y][x]) { top = y; break; }
        if (top < 0) continue;
        for (let k = 1; k <= 2; k++) if (pm[top - k] && pm[top - k][x]) put(x, top - k, k === 2 ? hex(...rgb(c).map(v => v * 0.85)) : c);
        if (dir !== 'side' && x % 2 === 0) put(x, top, lace);
        // a dark lug sole in place of the sneaker's white one
        let y = top; while (y + 1 < H && g0[y + 1][x] && g0[y + 1][x] !== OUTLINE) y++;
        put(x, y, look.shoes === 'combat' ? '#2a2b30' : '#5a4630');
      }
    }

    // ---- extras ----
    if (look.extra === 'dogtags') {
      const ch = mask(other({ extra:'chain' }), g0), b = bbox(ch);
      each(ch, (x, y) => { g[y][x] = (x + y) % 2 ? '#c7ccd2' : '#8e949c'; });
      if (b.ok && dir !== 'up') {
        const tx = Math.round((b.x0 + b.x1) / 2) - 1, ty = b.y1;
        [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]].forEach(([dx, dy]) => put(tx + dx, ty + dy, dy === 2 ? '#9aa0a8' : '#e3e6ea'));
        put(tx + 2, ty + 1, '#b8bec6');
      }
    }
    const eyesM = () => mask(other({ extra:'shades' }), g0);
    if (look.extra === 'facepaint') {
      const e = bbox(eyesM()), skinM = mask(g0, other({ skin:(look.skin === 0 ? 4 : 0) }));
      if (e.ok) for (let y = e.y0 - 1; y <= e.y1 + 2; y++) for (let x = 0; x < W; x++) {
        if (!skinM[y] || !skinM[y][x]) continue;
        const band = Math.floor((x + y) / 2) % 3;
        put(x, y, band === 0 ? '#3e4a26' : band === 1 ? '#1e2216' : '#5a6a34');
      }
    }
    if (look.extra === 'ballistic') {
      const m = eyesM(), e = bbox(m);
      each(m, (x, y) => { g[y][x] = y === e.y0 ? '#2a2e34' : '#101114'; });
      if (e.ok && dir !== 'up') { put(e.x0, e.y0 + 1, '#6b7a88'); put(e.x1 - 1, e.y0 + 1, '#6b7a88'); }
    }
    if (look.extra === 'nvg') {
      const m = eyesM(), e = bbox(m);
      if (e.ok) {
        // housings over the eyes, a mount up the forehead, a green glow in each tube
        each(m, (x, y) => { g[y][x] = '#1b1d21'; });
        for (let x = e.x0; x <= e.x1; x++) if (m[e.y0][x]) put(x, e.y0 - 1, '#26292e');
        const mx = Math.round((e.x0 + e.x1) / 2);
        for (let y = e.y0 - 4; y < e.y0 - 1; y++) put(mx, y, '#2c2f35');
        if (dir === 'down') {
          const lenses = []; for (let x = e.x0; x <= e.x1; x++) if (m[e.y0 + 1] && m[e.y0 + 1][x]) lenses.push(x);
          const groups = []; lenses.forEach(x => { const last = groups[groups.length - 1]; if (last && x - last[last.length - 1] === 1) last.push(x); else groups.push([x]); });
          groups.filter(gr => gr.length >= 2).forEach(gr => { const c = gr[Math.floor(gr.length / 2)]; put(c, e.y0 + 1, '#8dff72'); put(c - 1, e.y0 + 1, '#3fbf3a'); });
        } else if (dir === 'side') {
          // the tube sticks out past the face
          put(e.x1 + 1, e.y0, '#1b1d21'); put(e.x1 + 1, e.y0 + 1, '#1b1d21'); put(e.x1 + 2, e.y0, '#1b1d21'); put(e.x1 + 2, e.y0 + 1, '#8dff72');
        }
      } else if (dir === 'up') {
        // from behind: the battery pack on the back of the head
        const hair = bbox(mask(g0, other({ hairColor:(look.hairColor === 3 ? 0 : 3) })));
        if (hair.ok) { const cx = Math.round((hair.x0 + hair.x1) / 2); for (let y = hair.y0 + 4; y <= hair.y0 + 6; y++) for (let x = cx - 2; x <= cx + 1; x++) put(x, y, y === hair.y0 + 4 ? '#3a3d43' : '#1b1d21'); }
      }
    }

    // ---- hats drawn in the sprite (know which way the rep faces) ----
    if (look.hat === 'opscap') {
      // a black cap with a gray velcro patch, NVGs flipped up on the front (the inspo's top piece)
      const cap = mask(g0, other({ hat:'none' })), b = bbox(cap);
      recolor(cap, () => '#1a1b1f');
      if (b.ok) {
        const cx = Math.round((b.x0 + b.x1) / 2);
        if (dir === 'down') {
          for (let x = cx - 3; x <= cx + 2; x++) for (let y = b.y0 + 1; y <= b.y0 + 2; y++) put(x, y, y === b.y0 + 1 ? '#2c2f35' : '#1b1d21');
          put(cx - 2, b.y0 + 2, '#8dff72'); put(cx + 1, b.y0 + 2, '#8dff72');
          put(cx, b.y0 + 3, '#3a3d43');
        } else if (dir === 'side') {
          for (let x = b.x1 - 4; x <= b.x1 - 1; x++) put(x, b.y0, '#2c2f35');
          put(b.x1, b.y0, '#8dff72'); put(b.x1, b.y0 + 1, '#1b1d21');
        } else {
          for (let x = cx - 2; x <= cx + 1; x++) for (let y = b.y0 + 2; y <= b.y0 + 3; y++) put(x, y, '#3a3d43');
        }
      }
    }
    return g;
  };

  // hats with no front or back to them, drawn over the head like the holiday hats
  HAT_OF.boonie = 'boonie';
  WEAR.HATS.boonie = (g) => {
    rowsHat(g, { '-1':[12,23], 0:[11,24], 1:[11,24], 2:[10,25], 3:[10,25] }, woodland, '#3b4527');
    span(g, -2, 12, 23, O);
    span(g, 3, 10, 25, '#2f3720');                                                      // the band
    span(g, 4, 4, 31, O); span(g, 5, 4, 31, '#4b5832'); span(g, 6, 5, 30, '#3b4527'); span(g, 7, 5, 30, O);
    [[6, 6], [29, 6], [5, 5], [30, 5]].forEach(([x, y]) => px(g, x, y, '#2f3720'));   // the floppy brim dips
  };
  HAT_OF.beret = 'beret';
  WEAR.HATS.beret = (g) => {
    // tilted to the right, steel badge over the left eye
    rowsHat(g, { '-1':[13,25], 0:[11,27], 1:[10,28], 2:[10,28], 3:[10,26] }, () => '#1b1c20', '#0f1012');
    span(g, -2, 14, 24, O);
    span(g, 4, 9, 26, O); span(g, 4, 10, 25, '#2a2b30'); span(g, 5, 9, 26, O);
    px(g, 13, 1, '#c9ced4'); px(g, 14, 1, '#8e949c'); px(g, 13, 2, '#8e949c'); px(g, 14, 2, '#c9ced4');
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

  // ---- the backdrop: Militia's black camo (Duncan's pick, 2026-11-23) behind every page, Comms included.
  //      The bars sit on it a little darker so the tabs and XP read ----
  const MIL_CAMO = 'data:image/webp;base64,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';
  document.head.insertAdjacentHTML('beforeend', `<style>
    .skin-military .phone, .skin-military .table-stage{ background:#0b0b0c url("${MIL_CAMO}") center / cover no-repeat !important; }
    .skin-military .topbar{ background:linear-gradient(rgba(6,6,7,.55), rgba(6,6,7,.2)); }
    .skin-military .navbar{ background:rgba(6,6,7,.72); border-top:2px solid var(--amber-line); -webkit-backdrop-filter:blur(2px); backdrop-filter:blur(2px); }
    .skin-military #page-chat, .skin-military .screen-wrap, .skin-military .screen{ background:transparent; }
    .skin-military .vx-box{ background:rgba(10,10,11,.55); }
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

  // ---- the locker is all military: civilian pieces come out (dog tags instead of the gold chain and glasses,
  //      combat boots instead of sneakers), Militia's own tee, hoodie and cap stay ----
  const CIVILIAN = {
    top:['polo', 'oxford', 'crew', 'zip', 'vest', 'varsity', 'blazer', 'logotee', 'labcoat'],
    hat:['back', 'snapback', 'bucket', 'beanie', 'crown'],
    pants:['khaki', 'jeans', 'shorts', 'joggers'],
    shoes:['sneaker', 'runner', 'boots', 'gold'],
    extra:['glasses', 'watch', 'shades', 'chain', 'both', 'goggles'],
  };
  Object.entries(CIVILIAN).forEach(([slot, ids]) => {
    GEAR[slot] = GEAR[slot].filter(g => !ids.includes(g.id));
    GEAR[slot].sort((a, b) => (a.limited && !a.xp ? 0 : a.xp) - (b.limited && !b.xp ? 0 : b.xp));
    for (let i = ALL_GEAR.length - 1; i >= 0; i--) if (ALL_GEAR[i].slot === slot && ids.includes(ALL_GEAR[i].id)) ALL_GEAR.splice(i, 1);
  });
  // a new recruit starts in uniform
  Object.assign(DEFAULT_LOOK, { top:'fatigues', hat:'patrolcap', pants:'olivecargo', shoes:'combat', extra:'dogtags' });
  if (!APP.me.look) Object.assign(ME.look, { top:'fatigues', hat:'patrolcap', pants:'olivecargo', shoes:'combat', extra:'dogtags' });

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
