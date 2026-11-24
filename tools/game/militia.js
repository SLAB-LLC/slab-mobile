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

// ============ MILITARY VAULT: A GUNMETAL DOOR IN A RIVETED STEEL WALL ============
// Duncan 2026-11-23: the Vault goes dark metal, the way Cade's and Ronin's went concrete. The wall around the
// door becomes riveted gunmetal plates (scuffed and brushed), and the door's brass turns to steel. The hole in
// the wall grows the same way when the door rolls away.
if (MIL && typeof vxDoorEl === 'function') appSafe('military vault', () => {
  const tex = (() => {
    const N = 96, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rowTone = [];
    for (let y = 0; y < N; y++) rowTone.push(Math.round((rnd() - 0.5) * 6));   // brushed grain runs sideways
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = rnd(); let v = 40 + rowTone[y] + Math.round((r - 0.5) * 4);
      if (r > 0.985) v = 58; else if (r < 0.012) v = 28;
      g.fillStyle = `rgb(${v},${v + 3},${v + 7})`; g.fillRect(x, y, 1, 1);
    }
    // plates 48 tall, staggered every other row like a bulkhead
    const seamH = (y) => { g.fillStyle = '#0d0e11'; g.fillRect(0, y, N, 1); g.fillStyle = '#4d525b'; g.fillRect(0, y + 1, N, 1); };
    const seamV = (x, y0, h) => { g.fillStyle = '#0d0e11'; g.fillRect(x, y0, 1, h); g.fillStyle = '#4d525b'; g.fillRect(x + 1, y0, 1, h); };
    seamH(0); seamH(48); seamV(0, 0, 48); seamV(48, 48, 48);
    // rivets along every seam
    const rivet = (x, y) => {
      g.fillStyle = '#0b0c0e'; g.fillRect(x - 1, y - 1, 4, 4);
      g.fillStyle = '#5c616b'; g.fillRect(x, y, 2, 2);
      g.fillStyle = '#9aa1ab'; g.fillRect(x, y, 1, 1);
    };
    for (let x = 6; x < N; x += 12) { rivet(x, 5); rivet(x, 53); }
    for (let y = 12; y < 48; y += 12) { rivet(5, y); rivet(53, y + 48); }
    // scuffs and scratches
    const scratch = (x, y, n, dy) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 3 ? '#565b64' : '#363a41'; g.fillRect(x, y, 1, 1); x++; if (rnd() < 0.3) y += dy; } };
    scratch(18, 24, 16, 1); scratch(62, 70, 20, -1); scratch(70, 20, 9, 1); scratch(10, 80, 12, -1);
    return c.toDataURL();
  })();
  document.head.insertAdjacentHTML('beforeend', `<style>
    .vx-door .vx-mil{ position:absolute; inset:0; pointer-events:none; --r:158px;
      background:url(${tex}) 0 0 / 288px 288px repeat; image-rendering:pixelated;
      -webkit-mask:radial-gradient(circle at 50% 46%, transparent var(--r), #000 calc(var(--r) + 1px));
              mask:radial-gradient(circle at 50% 46%, transparent var(--r), #000 calc(var(--r) + 1px)); }
    .vx-door .vx-mil::after{ content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 46%, transparent 170px, rgba(0,0,0,.45) 520px); }
    .skin-military .vx-door .hole{ box-shadow:0 0 0 8px #3b3f46, 0 0 0 12px #0c0d0f, 0 0 34px 18px rgba(0,0,0,.7); }
    .skin-military .vx-door.reveal .hole{ box-shadow:none; }
    .skin-military .vx-door .hint{ color:#B4BBC3; text-shadow:2px 2px 0 #000; }
    .vx-door.reveal .vx-mil{ --r:860px; transition:--r .8s cubic-bezier(.65,0,.35,1); }
  </style>`);
  if (window.CSS && CSS.registerProperty) { try { CSS.registerProperty({ name:'--r', syntax:'<length>', inherits:false, initialValue:'158px' }); } catch (e) {} }
  const baseDoorEl = vxDoorEl;
  vxDoorEl = function(){
    const had = $('vx-door'), d = baseDoorEl();
    if (!had && !d.querySelector('.vx-mil')) { const m = document.createElement('div'); m.className = 'vx-mil'; d.insertBefore(m, d.firstChild); }
    return d;
  };
  // the brass (or the company tint over it) turns to gunmetal steel, keeping its light and shade
  const steel = (cv) => {
    if (!cv || !cv.getContext) return;
    const g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      d[i] = Math.min(255, l * 0.93); d[i + 1] = Math.min(255, l * 0.98); d[i + 2] = Math.min(255, l * 1.06 + 4);
    }
    g.putImageData(im, 0, 0);
  };
  const doorBase = paintVaultDoor, wheelBase = paintVaultWheel;
  paintVaultDoor = function(c){ doorBase(c); steel(c); };
  paintVaultWheel = function(c){ wheelBase(c); steel(c); };
  const dd = $('vx-door');
  if (dd && !dd.querySelector('.vx-mil')) { const m = document.createElement('div'); m.className = 'vx-mil'; dd.insertBefore(m, dd.firstChild); }
  if (dd) { paintVaultDoor(dd.querySelector('.d')); paintVaultWheel(dd.querySelector('.w')); }
});


// ============ BOOT CAMP: A DESERT OUTPOST ============
// Duncan 2026-11-23 picked the Desert Outpost mockup (of Tent Camp / Barracks Base / Desert Outpost). For the
// military skin the street becomes a forward operating base: the houses are sand-colored buildings and tan tents
// in the same house engine, each boss holds a fortified compound, the lawns are sand and the walks packed gravel,
// palms stand in for the trees, and the yards get Hesco walls, sandbags, watchtowers, ammo crates (in place of
// the mailboxes) and a Militia flag. Ponds, gardens and the holiday street dressing stay out of the desert
// (holiday hats and outfits still unlock as usual). Gold trim on the buildings turns to dull khaki.
if (MIL && typeof renderStreet === 'function') appSafe('desert outpost', () => {
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const OUT = '#0b0b0e';
// outline everything drawn on a canvas, like the houses
const outline = (c) => { const g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data, a = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  const add = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) add.push([x, y]);
  add.forEach(([x, y]) => R(g, x, y, 1, 1, OUT)); };
const ART = {
  sandbags(c){ c.width = 34; c.height = 16; const g = c.getContext('2d');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - (r === 2 ? 1 : 0); i++) { const x = 1 + i * 8 + (r % 2) * 4, y = 11 - r * 4;
      R(g, x, y, 7, 4, '#7d6f4d'); R(g, x + 1, y, 5, 1, '#a39370'); R(g, x, y + 3, 7, 1, '#5b5036'); R(g, x + 3, y + 1, 1, 2, '#6a5e40'); }
    outline(c); R(g, 2, 15, 30, 1, 'rgba(0,0,0,.45)'); },
  crate(c){ c.width = 16; c.height = 15; const g = c.getContext('2d');
    R(g, 1, 4, 14, 10, '#4b5320'); R(g, 1, 1, 14, 3, '#66702e'); R(g, 1, 4, 14, 1, '#363b17'); R(g, 1, 9, 14, 1, '#3d4319');
    R(g, 3, 6, 1, 7, '#59622a'); R(g, 12, 6, 1, 7, '#59622a'); R(g, 6, 6, 4, 2, '#cdb95a'); R(g, 6, 11, 4, 1, '#cdb95a'); outline(c); },
  flag(c, t = 0){ c.width = 22; c.height = 66; const g = c.getContext('2d');
    R(g, 3, 3, 2, 60, '#9aa0a8'); R(g, 4, 3, 1, 60, '#6b7078'); R(g, 2, 1, 4, 2, '#cfd3d8'); R(g, 0, 61, 8, 4, '#55585e');
    for (let x = 0; x < 15; x++) { const dy = Math.round(Math.sin(x / 2.2 - t) * (0.6 + x * 0.12)); for (let y = 0; y < 10; y++) R(g, 5 + x, 4 + y + dy, 1, 1, '#0d0d0f'); }
    // the white M with its slash
    [[3,0],[3,1],[3,2],[3,3],[3,4],[4,1],[5,2],[6,1],[7,0],[7,1],[7,2],[7,3],[7,4],[9,4],[10,3],[11,2],[12,1]].forEach(([x, y]) => { const dy = Math.round(Math.sin((x + 1) / 2.2 - t) * (0.6 + (x + 1) * 0.12)); R(g, 6 + x, 7 + y + dy, 1, 1, '#f2f2ee'); });
    outline(c); },
  tower(c){ c.width = 44; c.height = 84; const g = c.getContext('2d');
    const W = '#5b4631', D = '#3b2c1e', L = '#7a6044';
    [[12, 30], [28, 30]].forEach(([x, y]) => R(g, x, y, 3, 50, D));
    [[5, 30], [36, 30]].forEach(([x, y]) => { R(g, x, y, 3, 52, W); R(g, x, y, 1, 52, L); });
    for (let i = 0; i < 24; i++) { R(g, 7 + i * 1.2 | 0, 36 + i, 2, 1, D); R(g, 36 - (i * 1.2 | 0), 36 + i, 2, 1, D); R(g, 7 + i * 1.2 | 0, 58 + (i * .9 | 0), 2, 1, D); }
    for (let y = 34; y < 80; y += 5) { R(g, 18, y, 7, 1, W); } R(g, 17, 32, 1, 48, D); R(g, 25, 32, 1, 48, D);
    R(g, 2, 28, 40, 4, W); R(g, 2, 28, 40, 1, L);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 5; i++) { const x = 3 + i * 8 + (r % 2) * 3, y = 24 - r * 4; if (x > 36) continue; R(g, x, y, 7, 4, '#7d6f4d'); R(g, x + 1, y, 5, 1, '#a39370'); R(g, x, y + 3, 7, 1, '#5b5036'); }
    R(g, 4, 6, 2, 10, D); R(g, 38, 6, 2, 10, D);
    for (let x = 0; x < 44; x++) { const y = 6 - Math.round(Math.abs(x - 22) / 9); R(g, x, y - 1, 1, 3, x % 4 === 0 ? '#7c8187' : '#5d6267'); }
    R(g, 8, 13, 5, 3, '#fff4c2'); outline(c); },
  hesco(c){ c.width = 32; c.height = 18; const g = c.getContext('2d');
    for (let i = 0; i < 3; i++) { const x = 1 + i * 10; R(g, x, 4, 10, 13, '#9a8763'); R(g, x, 2, 10, 3, '#b8a57e');
      for (let y = 5; y < 17; y += 3) R(g, x, y, 10, 1, '#7b6a48'); for (let xx = x + 2; xx < x + 10; xx += 3) R(g, xx, 4, 1, 13, '#857350'); R(g, x + 9, 2, 1, 15, '#5e4f33'); }
    outline(c); R(g, 2, 17, 28, 1, 'rgba(0,0,0,.4)'); },
  palm(c){ const W = 28, H = 46; c.width = W; c.height = H; const g = c.getContext('2d');
    for (let y = 12; y < 44; y++) R(g, 13 + Math.round(Math.sin(y / 9) * 2), y, 3, 1, y % 3 ? '#6b5236' : '#4f3b26');
    [[-1,-.2],[1,-.2],[-1,.5],[1,.5],[0,-1]].forEach(([dx, dy]) => { for (let t = 0; t < 11; t++) R(g, 14 + Math.round(dx * t), 11 + Math.round(dy * t + t * t * 0.06), 2, 2, t < 4 ? '#3f5a2a' : '#2e4520'); });
    outline(c); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(8, 44, 12, 1); },
};


  window.MIL_ART = ART;
  const none = () => [];
  const TENT = (wall, roof) => ({ H:14, roof:'gable', ridge:'perp', Hr:40, wall, tex:'batten', roofC:roof, roofTex:'metal', trim:'#24271a', door:'#16180e', doorStyle:'plain', front:none, side:(n) => [{ k:'win', s0:Math.round(n / 2) - 5, s1:Math.round(n / 2) + 5, z0:4, z1:10 }] });
  Object.assign(ISO_STYLES, {
    adobeA:{ H:32, roof:'flat', Hr:0, wall:'#9c8560', tex:'stucco', roofC:'#87714f', roofTex:'gravel', trim:'#5b4b33', door:'#3a3024', doorStyle:'panel',
      front:(n) => [{ k:'win', s0:n - 18, s1:n - 8, z0:14, z1:24 }], side:(n) => [{ k:'win', s0:10, s1:20, z0:14, z1:24 }] },
    adobeB:{ H:34, roof:'flat', Hr:0, wall:'#8f7a56', tex:'stucco', roofC:'#7c6848', roofTex:'gravel', trim:'#54452f', door:'#4b3f2d', doorStyle:'panel', front:none, side:(n) => [{ k:'win', s0:n - 22, s1:n - 10, z0:12, z1:20 }] },
    tentD: TENT('#a8916a', '#b39c73'),
    compound:{ H:56, roof:'flat', Hr:0, wall:'#8e7a58', tex:'stucco', roofC:'#76643f', roofTex:'gravel', trim:'#4e402a', door:'#3a3024', doorStyle:'panel', big:true,
      front:(n) => [{ k:'win', s0:40, s1:n - 10, z0:30, z1:42, cols:3 }], side:(n) => [{ k:'win', s0:10, s1:n - 10, z0:30, z1:42, cols:3 }] },
  });
  // shorter doors, so every door sits inside its wall (and inside the tents' sloped ends)
  ISO_DOOR.h = 26;
  HOUSE_SEQ.splice(0, HOUSE_SEQ.length, 'adobeA', 'tentD', 'adobeB');
  BOSS_SEQ.splice(0, BOSS_SEQ.length, 'compound');
  STREET_NAMES.splice(0, STREET_NAMES.length, 'Route Iron', 'Route Steel', 'Route Cobra', 'Route Viper', 'Route Hawk', 'Route Wolf');
  const YELL = 'Pick it up, private! Next door!';

  // no holiday dressing on the base (roof lights, leaves, pumpkins, snow)
  if (typeof decorateStreet === 'function') decorateStreet = function(){};
  if (typeof decorateRoof === 'function') decorateRoof = function(){};

  const baseHouse = paintIsoHouse;
  paintIsoHouse = function(canvas, geo, st){
    baseHouse(canvas, geo, st);
    const g = canvas.getContext('2d'), im = g.getImageData(0, 0, canvas.width, canvas.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue;
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, M = Math.max(r, gg, b), m = Math.min(r, gg, b), L = (M + m) / 2, D = M - m;
      if (D < 0.12 || M !== r || b > gg) continue; const S = D / (1 - Math.abs(2 * L - 1)); if (S < 0.45) continue;
      const H = ((gg - b) / D) / 6; if (H < 0.06 || H > 0.17) continue;
      const l = L * 255; d[i] = l * 1.02; d[i + 1] = l; d[i + 2] = l * 0.86; }
    g.putImageData(im, 0, 0);
  };
  // the ground: each lawn and walk color moves to sand and gravel, keeping whatever light fell on it
  const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const PAIRS = [['#2a3530', '#6b5a40'], ['#2f3b35', '#715f44'], ['#3a4740', '#82705a'], ['#212a25', '#5c4d37'], ['#2c2c31', '#544f47'], ['#28282d', '#504b43'],
    ['#1d1d21', '#423d36'], ['#b28a45', '#8b7a58'], ['#e3bd6e', '#a8966f'], ['#0b0b0d', '#2a251e'], ['#34343a', '#544f47'], ['#232327', '#423d36']].map(([s, t]) => [hex(s), hex(t)]);
  const baseGround = paintGround;
  paintGround = function(){
    baseGround.apply(this, arguments);
    const cv = street.ground, g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      let best = null, bd = 1e9;
      for (const p of PAIRS) { const s = p[0], dd = Math.abs(d[i] - s[0]) + Math.abs(d[i + 1] - s[1]) + Math.abs(d[i + 2] - s[2]); if (dd < bd) { bd = dd; best = p; } }
      if (bd > 70) continue;
      const [s, t] = best; for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, t[k] + (d[i + k] - s[k])));
    }
    g.putImageData(im, 0, 0);
  };
  paintTree = function(c){ ART.palm(c); };
  // nothing on the stoop corner (a crate there sat at the rep's feet), and the rep stands centered on the walk
  paintMailbox = function(c){ c.width = 12; c.height = 18; };
  if (typeof STAND_IN !== 'undefined') STAND_IN = 0;
  document.head.insertAdjacentHTML('beforeend', `<style>
    .skin-military .st-pond, .skin-military .st-frog, .skin-military .st-frogfly, .skin-military .st-fisher, .skin-military .st-garden, .skin-military .st-season{ display:none !important; }
    .st-camp{ position:absolute; image-rendering:pixelated; pointer-events:none; }
  </style>`);


  // ---- one desert-tan tank, parked at an angle in the yard between the tents ----
  const TANK_YARD = 4;
  const paintTank = (c) => {
    const W = 106, H = 58, OX = 38, OY = 36; c.width = W; c.height = H; const g = c.getContext('2d');
    const LEN = 42, WID = 24, th = -0.45, co = Math.cos(th), si = Math.sin(th);
    const pts = [];
    const hash = (a, b) => ((Math.floor(a) * 73856093) ^ (Math.floor(b) * 19349663)) >>> 0;
    const camo = (x, y) => { const h = Math.sin(x * 0.35) + Math.cos(y * 0.5 + x * 0.12) + Math.sin((x + y) * 0.21); return h > 1 ? 2 : h < -1.1 ? 1 : 0; };
    const add = (x, y, z, nx, ny, nz, col) => { const lx = x - LEN / 2, ly = y - WID / 2; pts.push([lx * co - ly * si, lx * si + ly * co, z, nx * co - ny * si, nx * si + ny * co, nz, col]); };
    const solid = (x0, x1, y0, y1, ztop, part) => {
      for (let x = x0; x <= x1; x += 0.5) for (let y = y0; y <= y1; y += 0.5) {
        const zt = ztop(x, y); if (zt <= 0) continue;
        add(x, y, zt, 0, 0, 1, part(x, y, zt, 'top'));
        const sides = [[x === x0, -1, 0], [x >= x1 - 0.25, 1, 0], [y === y0, 0, -1], [y >= y1 - 0.25, 0, 1]];
        sides.forEach(([on, nx, ny]) => { if (on) for (let z = 0; z < zt; z += 0.5) add(x, y, z, nx, ny, 0, part(x, y, z, 'side')); });
      }
    };
    const trackTop = (x) => 7 - Math.max(0, Math.abs(x - LEN / 2) - (LEN / 2 - 4)) * 0.9;
    const track = (x, y, z, f) => f === 'top' ? ((Math.floor(x * 2) % 3) ? '#3a342a' : '#2a251e') : (z > 1.5 && z < 5.5 && Math.hypot(((x % 6) + 6) % 6 - 3, z - 3.5) < 2.2 ? '#5d5547' : '#2c2720');
    solid(0, LEN, 0, 5, trackTop, track); solid(0, LEN, WID - 5, WID, trackTop, track);
    const hullTop = (x) => x > LEN - 9 ? 11 - (x - (LEN - 9)) * 0.55 : x < 4 ? 10 : 11;
    const hull = (x, y, z, f) => { const k = camo(x, y + z); const base = ['#a99266', '#7d6a48', '#c2ad7f'][k]; return f === 'top' ? base : z < 6.5 ? '#6b5a3d' : base; };
    solid(2, LEN - 2, 4, WID - 4, hullTop, hull);
    const TX = LEN * 0.42, TY = WID / 2;
    for (let x = TX - 10; x <= TX + 10; x += 0.5) for (let y = TY - 8; y <= TY + 8; y += 0.5) {
      const e = ((x - TX) / 10) ** 2 + ((y - TY) / 8) ** 2; if (e > 1) continue;
      const rim = e > 0.82;
      for (let z = 11; z < 17; z += 0.5) if (rim) add(x, y, z, (x - TX) / 10, (y - TY) / 8, 0, ['#a99266', '#7d6a48', '#c2ad7f'][camo(x + 7, y + z)]);
      add(x, y, 17, 0, 0, 1, Math.hypot(x - TX + 3, y - TY - 3) < 2.4 ? '#4a3f2c' : e > 0.7 ? '#9a8660' : ['#b8a274', '#8f7b55', '#cdb889'][camo(x + 7, y)]);
    }
    for (let x = TX + 8; x <= LEN + 20; x += 0.5) for (let a = 0; a < 6.28; a += 0.3) { const r = x > LEN + 16 ? 2 : 1.5; add(x, TY + Math.cos(a) * r, 14 + Math.sin(a) * r, 0, Math.cos(a), Math.sin(a), x > LEN + 16 ? '#2e271c' : '#4f4433'); }
    // painter's order: back to front, bottom to top
    pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
    const buf = new Map();
    const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
    pts.forEach(([u, v, z, nu, nv, nz, col]) => {
      if (nz < 0.5 && nu < -0.05 && nv < -0.05) return;            // faces turned away from the camera
      const k = nz > 0.5 ? 1.08 : nu > 0 && nu >= nv ? 0.72 : 0.95;
      buf.set(Math.round(u - v + OX) + ',' + Math.floor((u + v) / 2 - z + OY), shade(col, k));
    });
    // a shadow on the sand under it, then the tank, then its outline
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = -2; x <= LEN + 2; x += 0.5) for (let y = -2; y <= WID + 3; y += 0.5) { const lx = x - LEN / 2, ly = y - WID / 2, u = lx * co - ly * si, v = lx * si + ly * co; g.fillRect(Math.round(u - v + OX + 2), Math.floor((u + v) / 2 + OY + 1), 1, 1); }
    buf.forEach((col, key) => { const [x, y] = key.split(',').map(Number); g.fillStyle = col; g.fillRect(x, y, 1, 1); });
    const has = (x, y) => buf.has(x + ',' + y), edge = [];
    buf.forEach((_, key) => { const [x, y] = key.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (!has(x + a, y + b)) edge.push([x + a, y + b]); }); });
    g.fillStyle = '#16120c'; edge.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    return { ax:OX, ay:OY };
  };
  // the flag waves in the breeze
  if (!reduceMotion) setInterval(() => { const t = performance.now() / 260; document.querySelectorAll('canvas.st-flag').forEach(c => ART.flag(c, t)); }, 110);
  const baseRender = renderStreet;
  renderStreet = function(){
    baseRender.apply(this, arguments);
    const wrap = $('path-wrap'), S = street.S, N = street.stops.length, f = street.L / 180;
    const yard = (k, a, b) => { const p = street.verts[k]; return k % 2 === 0 ? { u:p.u + a * f, v:p.v - b * f } : { u:p.u - b * f, v:p.v + a * f }; };
    const put = (paint, q, ax, ay) => { const c = document.createElement('canvas'); c.className = 'st-camp'; c.setAttribute('aria-hidden', 'true'); paint(c);
      const p = isoPt(q.u, q.v); Object.assign(c.style, { left:Math.round((p.x - ax) * S) + 'px', top:Math.round((p.y - ay) * S) + 'px', width:Math.round(c.width * S) + 'px', height:Math.round(c.height * S) + 'px', zIndex:objZ(q.u, q.v) });
      wrap.appendChild(c); };
    if (TANK_YARD < N - 1) {
      const q = yard(TANK_YARD, 66, 60), c = document.createElement('canvas'), a = paintTank(c), p = isoPt(q.u, q.v);
      c.className = 'st-camp st-tank'; c.setAttribute('aria-hidden', 'true');
      const TK = 1.45;                                                            // drawn a size up, like the drop-off car
      Object.assign(c.style, { left:Math.round((p.x - a.ax * TK) * S) + 'px', top:Math.round((p.y - a.ay * TK) * S) + 'px', width:Math.round(c.width * TK * S) + 'px', height:Math.round(c.height * TK * S) + 'px', zIndex:objZ(q.u, q.v) });
      wrap.appendChild(c);
      // clear the palms it parks on
      wrap.querySelectorAll('.st-tree').forEach(t => { const bx = (parseFloat(t.style.left) + parseFloat(t.style.width) / 2) / S, by = (parseFloat(t.style.top) + parseFloat(t.style.height)) / S;
        if (Math.abs(bx - p.x) < 62 && by > p.y - 36 && by < p.y + 30) t.style.display = 'none'; });
    }
    for (let k = 0; k < N - 1; k++) {
      if (k === TANK_YARD) continue;
      [[36, 18], [62, 64], [100, 30]].forEach(([a, b], n) => { if ((k + n) % 3 !== 2) put(ART.hesco, yard(k, a, b), 16, 17); });
      if (k % 2 === 0) put(ART.sandbags, yard(k, 76, 40), 17, 15);
      if (k % 4 === 1) put(ART.tower, yard(k, 74, 78), 22, 82);
      if (k % 3 === 0) { put(ART.crate, yard(k, 88, 26), 8, 14); put(ART.crate, yard(k, 96, 22), 8, 14); }
      if (k === 0) put(ART.flag, yard(k, 50, 80), 4, 64);
    }
    // tag the flag so it can wave
    wrap.querySelectorAll('canvas.st-camp').forEach(c => { if (c.width === 22 && c.height === 66) c.classList.add('st-flag'); });
    (street.yellers || []).forEach(y => { y.bub.textContent = YELL; });
  };
});


// ============ THE OUTPOST COMES ALIVE: ROCKS, A LIZARD, TUMBLEWEEDS, AND A HELICOPTER DROP-OFF ============
// Duncan 2026-11-23: big rocks here and there, a stray lizard, a tumbleweed that blows through every so often, and
// the rep flies in on a helicopter that touches down on a helipad at the top (where other companies' road is).
if (MIL && typeof renderStreet === 'function' && typeof playDropoff === 'function') appSafe('outpost life', () => {
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const outline = (c, col) => { const g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data, a = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 200;
    const add = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) add.push([x, y]);
    add.forEach(([x, y]) => R(g, x, y, 1, 1, col || '#0b0b0e')); };
  // rocks in a few sizes and shapes: blobs lit from the top left, with a crack or two and a shadow
  const ROCKS = [
    { W:30, H:20, b:[[14, 13, 12, 6], [17, 9, 7, 5]] },                                   // a lumpy boulder (one rock, not two)
    { W:46, H:28, b:[[22, 15, 18, 11], [34, 19, 9, 7], [10, 20, 7, 5]], crack:true },     // a big outcrop
    { W:42, H:14, b:[[21, 8, 19, 5]] },                                                    // a flat slab
    { W:24, H:12, b:[[5, 7, 4, 3], [12, 8, 4, 3], [19, 6, 3, 2.5], [15, 4, 2.5, 2]] },   // pebbles
    { W:36, H:20, b:[[18, 13, 16, 6], [13, 9, 8, 5], [24, 10, 5, 3]], crack:true },      // a wide cracked boulder with a ridge
  ];
  const rock = (c, n) => { const R0 = ROCKS[n % ROCKS.length], { W, H } = R0; c.width = W; c.height = H; const g = c.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const inb = R0.b.find(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1); if (!inb) continue;
      const [cx, cy, rx, ry] = inb, lx = (x - cx) / rx, ly = (y - cy) / ry, lit = -lx * 0.6 - ly * 0.8, h = ((x * 7 + y * 13 + n) % 11 === 0);
      R(g, x, y, 1, 1, lit > 0.5 ? '#bba887' : lit > 0.05 ? (h ? '#8e7c60' : '#9d8a6b') : lit > -0.5 ? (h ? '#6c5d47' : '#78684f') : '#5a4c39'); }
    if (R0.crack) { let x = Math.round(W * 0.45), y = 3; const d = im => im; for (let i = 0; i < H - 6; i++) { R(g, x, y + i, 1, 1, '#463a2b'); if ((i * 5 + n) % 3 === 0) x += (i % 2 ? 1 : -1); } }
    outline(c); g.globalCompositeOperation = 'destination-over'; R(g, 3, H - 2, W - 4, 2, 'rgba(0,0,0,.35)'); g.globalCompositeOperation = 'source-over'; };
  // a desert lizard seen from above: spotted sandy back, splayed legs that swap as it runs, a long curled tail
  window.MIL_ART = Object.assign(window.MIL_ART || {}, { rock });
  const lizard = (c, f) => { c.width = 28; c.height = 14; const g = c.getContext('2d'); g.clearRect(0, 0, 28, 14);
    const B = '#c48c4a', D = '#8a5a2c', L = '#e3b878', S = '#6b4322';
    for (let x = 5; x <= 15; x++) { const t = (x - 5) / 10, half = Math.round(2.6 - Math.abs(t - 0.45) * 2.2); R(g, x, 7 - half, 1, half * 2 + 1, B); R(g, x, 7 - half, 1, 1, L); }
    R(g, 1, 6, 4, 3, B); R(g, 0, 7, 1, 1, B); R(g, 2, 5, 2, 1, L); R(g, 2, 6, 1, 1, '#120c06'); R(g, 2, 8, 1, 1, '#120c06');
    [[7, 6], [10, 8], [13, 6], [9, 5], [12, 8]].forEach(([x, y]) => R(g, x, y, 1, 1, S));
    for (let i = 0; i < 11; i++) { const x = 16 + i, y = 7 + Math.round(Math.sin(i / 3.2 + 0.6) * 2.2); R(g, x, y, 1, i < 4 ? 2 : 1, i % 3 ? D : B); }
    const k = f % 2;
    const leg = (x, y, dx, dy) => { R(g, x, y, 1, 1, D); R(g, x + dx, y + dy, 1, 1, D); R(g, x + dx * 2, y + dy, 1, 1, S); };
    leg(6, 4, k ? -1 : 0, -2); leg(6, 10, k ? 0 : -1, 2); leg(13, 4, k ? 0 : 1, -2); leg(13, 10, k ? 1 : 0, 2);
    outline(c, '#2a1a0c'); };
  const tumble = (c) => { c.width = 20; c.height = 20; const g = c.getContext('2d');
    for (let i = 0; i < 420; i++) { const a = i * 2.39996, r = 8.6 * Math.sqrt((i * 37 % 420) / 420), x = 10 + Math.cos(a) * r, y = 10 + Math.sin(a) * r * 0.92;
      R(g, Math.round(x), Math.round(y), 1, 1, i % 5 === 0 ? '#d8bf8c' : i % 3 === 0 ? '#5e4a2c' : '#a3875a'); }
    for (let k = 0; k < 7; k++) { const a = k * 0.9; for (let t = 2; t < 9; t++) R(g, Math.round(10 + Math.cos(a + t * 0.25) * t), Math.round(10 + Math.sin(a + t * 0.25) * t), 1, 1, '#4a3a22'); }
    outline(c, '#2a2014'); };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .skin-military .st-sign{ display:none !important; }
    .st-mil{ position:absolute; left:0; top:0; image-rendering:pixelated; pointer-events:none; will-change:transform; }
  </style>`);

  // ---- the helipad where the road was ----
  const PAD_R = 17;
  const padUV = () => ({ u:-4, v:roadV() + 2 });
  paintRoad = function(){
    const cv = street.ground; if (!cv) return;
    const g = cv.getContext('2d'), Wc = cv.width, Hc = Math.min(cv.height, 260), id = g.getImageData(0, 0, Wc, Hc), d = id.data, P = padUV(), { X0, Y0 } = street;
    for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
      const a = x - X0, b = 2 * (y - Y0), u = (b + a) / 2 - P.u, v = (b - a) / 2 - P.v, r = Math.hypot(u, v);
      if (r > PAD_R + 1.5) continue;
      const i = (y * Wc + x) * 4, n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      let c;
      if (r > PAD_R) c = [40, 36, 30];
      else if (r > PAD_R - 2) c = [196, 160, 58];                                                 // yellow ring
      else { c = [86 + (n % 7 === 0 ? 6 : 0), 84, 80];
        // the white H, set square to the walkway
        const H = (Math.abs(u) < 7 && Math.abs(v) < 1.4) || (Math.abs(v) > 4 && Math.abs(v) < 6.6 && Math.abs(u) < 8);
        if (H) c = [226, 224, 216];
        if (Math.abs(r - (PAD_R - 4)) < 0.6 && ((Math.atan2(v, u) * 6 / Math.PI) & 1)) c = [110, 108, 102]; }
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  };

  // ---- a helicopter, side on, nose to the left; frame turns the rotors ----
  const HELI = { W:76, H:40, AX:30, AY:35, K:1.35 };
  const paintHeli = (c, f) => {
    c.width = HELI.W; c.height = HELI.H; const g = c.getContext('2d');
    const B = '#4a5038', BL = '#5e6648', BD = '#33382a';
    for (let y = 15; y < 30; y++) { const t = (y - 22) / 7.5, half = Math.sqrt(Math.max(0, 1 - t * t)); const x0 = Math.round(28 - 21 * half), x1 = Math.round(28 + 18 * half);
      R(g, x0, y, x1 - x0, 1, y < 19 ? BL : y > 26 ? BD : B); }
    R(g, 44, 18, 22, 4, B); R(g, 44, 18, 22, 1, BL); R(g, 44, 21, 22, 1, BD); R(g, 62, 9, 5, 12, B); R(g, 62, 9, 2, 12, BL);
    R(g, 19, 11, 20, 5, BD); R(g, 21, 11, 16, 1, B); R(g, 28, 7, 2, 4, '#25281f');
    R(g, 9, 17, 9, 6, '#2a3e52'); R(g, 10, 17, 4, 2, '#5d7f9c'); R(g, 20, 18, 11, 8, '#1b1e17'); R(g, 33, 18, 5, 4, '#2a3e52');
    R(g, 48, 19, 2, 2, '#e8e6dc'); R(g, 51, 19, 1, 2, '#e8e6dc');
    R(g, 15, 29, 2, 5, '#1d1f1a'); R(g, 35, 29, 2, 5, '#1d1f1a'); R(g, 8, 34, 34, 2, '#24271f'); R(g, 7, 33, 2, 2, '#24271f');
    outline(c);
    // main rotor: a long blur that flickers; tail rotor: a spinning stroke
    g.fillStyle = 'rgba(30,32,28,0.85)'; const ln = f % 2 ? 66 : 54; g.fillRect(29 - ln / 2, 6, ln, 1);
    g.fillStyle = 'rgba(30,32,28,0.35)'; g.fillRect(29 - 36, 5, 72, 3);
    const a = f * 1.3; for (let t = -5; t <= 5; t++) R(g, Math.round(65 + Math.cos(a) * t), Math.round(13 + Math.sin(a) * t * 0.5), 1, 1, 'rgba(30,32,28,0.8)');
  };

  // ---- the drop-off, by helicopter ----
  const HELI_LINE = 'Boots on the ground! Go get \u2019em, recruit!';
  playDropoff = async function(force){
    if (dropoffRunning || (!force && dropoffSeen())) return;
    if (!street.el || !street.stops.length || street.busy || !$('page-courses').classList.contains('visible')) return;
    markDropoff();
    if (reduceMotion) return;
    dropoffRunning = true; street.busy = true; setBubble('');
    const wrap = $('path-wrap'), S = street.S, target = street.at, K = HELI.K;
    $('screen').scrollTo({ top:0, behavior:'smooth' });
    street.el.style.opacity = '0'; if (street.rideEl) street.rideEl.classList.remove('on');
    const pu = padUV(), pad = isoPt(pu.u, pu.v);
    const heli = document.createElement('canvas'); heli.className = 'st-mil';
    heli.style.width = Math.round(HELI.W * K * S) + 'px'; heli.style.height = Math.round(HELI.H * K * S) + 'px'; heli.style.zIndex = 1960000 - 10;
    const shade = document.createElement('div'); shade.className = 'st-mil';
    Object.assign(shade.style, { width:Math.round(46 * S) + 'px', height:Math.round(14 * S) + 'px', borderRadius:'50%', background:'rgba(0,0,0,.4)', zIndex:1400 });
    let frame = 0, alive = true;
    const at = (x, y, alt) => {
      heli.style.transform = `translate(${Math.round((x - HELI.AX * K) * S)}px, ${Math.round((y - alt - HELI.AY * K) * S)}px)`;
      const k = Math.max(0.35, 1 - alt / 220);
      shade.style.transform = `translate(${Math.round((x - 23) * S)}px, ${Math.round((y - 7) * S)}px) scale(${k})`; shade.style.opacity = String(k);
    };
    // painted and parked at its start (off to the right, up high) before it joins the page, so it never flashes at the corner
    paintHeli(heli, frame++); at(pad.x + 240, pad.y, 170);
    wrap.appendChild(shade); wrap.appendChild(heli);
    const spin = () => { if (!alive || !document.contains(heli)) return; paintHeli(heli, frame++); setTimeout(spin, 45); }; spin();
    const fly = (from, to, ms, ease) => new Promise(res => { const t0 = performance.now(); const tick = (now) => {
      if (!document.contains(heli)) { res(); return; } const f = Math.min(1, (now - t0) / ms), e = ease(f);
      at(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e, from[2] + (to[2] - from[2]) * e);
      if (f < 1) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    const dust = () => { for (let i = 0; i < 10; i++) { const p = document.createElement('div'); p.className = 'st-mil';
      const s = 6 + (i % 4) * 3, ang = i / 10 * Math.PI * 2;
      Object.assign(p.style, { width:Math.round(s * S) + 'px', height:Math.round(s * 0.6 * S) + 'px', borderRadius:'50%', background:'rgba(196,172,128,.55)', zIndex:1960000 - 20,
        transform:`translate(${Math.round((pad.x - s / 2) * S)}px, ${Math.round((pad.y - 3) * S)}px)`, transition:'transform 1.4s ease-out, opacity 1.4s ease-out' });
      wrap.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.transform = `translate(${Math.round((pad.x + Math.cos(ang) * 34 - s / 2) * S)}px, ${Math.round((pad.y + Math.sin(ang) * 12 - 6) * S)}px) scale(1.6)`; p.style.opacity = '0'; }));
      setTimeout(() => p.remove(), 1500); } };
    try {
      await wait(400);
      await fly([pad.x + 240, pad.y, 170], [pad.x, pad.y, 46], 2600, f => 1 - Math.pow(1 - f, 3));
      dust();
      await fly([pad.x, pad.y, 46], [pad.x, pad.y, 0], 1100, f => f * (2 - f));
      haptic('tap'); dust();
      // the rep hops out of the side door
      // he lands in front of the rep: the rep steps out from behind and walks clear of the rotors
      heli.style.zIndex = String(meZ(isoPt(pu.u + 4, pu.v + 4)) + 2);
      const hop = isoPt(pu.u - 6, pu.v + 2), out = isoPt(0, roadV() + ROAD_HALF + 14);
      street.el.style.opacity = ''; placeMe(hop, 'down-0', false);
      await walkPoints([hop, out]);
      const say = document.createElement('div');
      say.className = 'st-yell st-carsay'; say.setAttribute('aria-hidden', 'true'); say.textContent = HELI_LINE;
      // beside the helicopter, low enough to stay clear of the top of the screen
      const sx = Math.max(95, Math.min(street.WW - 95, pad.x - 96));
      say.style.left = Math.round(sx * S) + 'px'; say.style.top = Math.round((pad.y - 22) * S) + 'px';
      wrap.appendChild(say);
      requestAnimationFrame(() => say.classList.add('on'));
      await wait(3000);
      say.classList.remove('on'); setTimeout(() => say.remove(), 300);
      dust();
      heli.style.zIndex = String(1960000 - 10);
      await fly([pad.x, pad.y, 0], [pad.x - 320, pad.y - 40, 200], 2400, f => f * f);
      if (!document.contains(street.el) || !street.stops[target]) return;
      const pts = [out];
      for (let k = 0; k <= target; k++) pts.push(isoPt(street.verts[k].u, street.verts[k].v));
      pts.push(street.stops[target].stand);
      await walkPoints(pts);
    } finally {
      alive = false; heli.remove(); shade.remove();
      dropoffRunning = false; street.busy = false;
      if (street.el && document.contains(street.el) && street.stops[street.at]) {
        street.el.style.opacity = '';
        placeMe(street.stops[street.at].stand, 'down-0', false); parkRide(street.stops[street.at]);
        setBubble(street.at === street.activeIdx ? 'Tap to knock' : '');
      }
    }
  };

  // ---- rocks and lizards in the yards ----
  let lizards = [];
  const baseRender = renderStreet;
  renderStreet = function(){
    baseRender.apply(this, arguments);
    const wrap = $('path-wrap'), S = street.S, N = street.stops.length, f = street.L / 180;
    const yard = (k, a, b) => { const p = street.verts[k]; return k % 2 === 0 ? { u:p.u + a * f, v:p.v - b * f } : { u:p.u - b * f, v:p.v + a * f }; };
    const place = (c, q, ax, ay) => { const p = isoPt(q.u, q.v); c.className = 'st-camp'; c.setAttribute('aria-hidden', 'true');
      Object.assign(c.style, { left:Math.round((p.x - ax) * S) + 'px', top:Math.round((p.y - ay) * S) + 'px', width:Math.round(c.width * S) + 'px', height:Math.round(c.height * S) + 'px', zIndex:objZ(q.u, q.v) });
      wrap.appendChild(c); return p; };
    for (let k = 0; k < N - 1; k++) {
      if (k === 4) continue;                                                      // the tank's yard
      const stone = (n, q) => { const c = document.createElement('canvas'); rock(c, n); place(c, q, c.width / 2, c.height - 2); };
      if (k % 3 === 1) stone(k, yard(k, 104, 70));
      if (k % 4 === 2) stone(k + 3, yard(k, 24, 44));
      if (k % 5 === 3) stone(k + 1, yard(k, 120, 96));
    }
    // no dogs on the base
    (street.dogs || []).forEach(d => d.el && d.el.remove()); street.dogs = [];
    lizards = [];
    [1, 6, 12, 17].filter(k => k < N - 1).forEach((k, n) => {
      const c = document.createElement('canvas'); lizard(c, 0);
      const q = yard(k, 50 + n * 6, 30 + (n % 2) * 26), p = place(c, q, 9, 6);
      c.style.width = Math.round(36 * S) + 'px'; c.style.height = Math.round(18 * S) + 'px';
      lizards.push({ el:c, x0:p.x, y0:p.y, dx:0, dir:n % 2 ? 1 : -1, next:performance.now() + 1500 + n * 1300, S });
    });
    // Duncan 2026-11-23: the rep should never look like he walks across the front of the base's props. Anything
    // standing just behind the walks (where his body would cover it as he passes) is cleared; props in front of the
    // walks stay and he passes behind them.
    const route = [];
    for (let k = -1; k < N - 1; k++) { const a = isoPt(street.verts[k].u, street.verts[k].v), b = isoPt(street.verts[k + 1].u, street.verts[k + 1].v);
      for (let t = 0; t <= 1; t += 0.04) route.push({ x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t }); }
    street.stops.forEach(st => { const w = st.walk, d = st.stand; for (let t = 0; t <= 1; t += 0.25) route.push({ x:w.x + (d.x - w.x) * t, y:w.y + (d.y - w.y) * t }); });
    let cleared = 0;
    wrap.querySelectorAll('.st-camp, .st-tree').forEach(e => {
      if (e.style.display === 'none' || e.classList.contains('st-tank')) return;
      const l = parseFloat(e.style.left) / S, tp = parseFloat(e.style.top) / S, w = parseFloat(e.style.width) / S, h = parseFloat(e.style.height) / S, foot = tp + h;
      const pad = e.classList.contains('st-tree') ? 11 : 3;           // a palm's trunk is narrow; its canvas is not
      if (route.some(r => l + pad < r.x + 9 && l + w - pad > r.x - 9 && foot > r.y - 14 && foot < r.y + 2)) { e.style.display = 'none'; cleared++; }
    });
    street.propsCleared = cleared;
    // Duncan 2026-11-24: tapping the helipad flies the helicopter in again
    const houseTap = wrap.onclick;
    wrap.onclick = (e) => {
      const r = wrap.getBoundingClientRect(), wx = (e.clientX - r.left) / S, wy = (e.clientY - r.top) / S;
      const a = wx - street.X0, b = 2 * (wy - street.Y0), P = padUV();
      if (Math.hypot((b + a) / 2 - P.u, (b - a) / 2 - P.v) <= PAD_R + 4 && !street.busy && !dropoffRunning) { e.stopPropagation(); haptic('tap'); playDropoff(true); return; }
      if (houseTap) houseTap.call(wrap, e);
    };
  };
  // lizards dart a few steps, freeze, and turn around now and then; a tumbleweed rolls through every so often
  if (!reduceMotion) {
    setInterval(() => {
      const now = performance.now();
      lizards.forEach(z => {
        if (!document.contains(z.el) || now < z.next) return;
        if (Math.random() < 0.3) z.dir *= -1;
        const step = z.dir * (6 + Math.random() * 10); z.dx = Math.max(-22, Math.min(22, z.dx + step)); if (Math.abs(z.dx) >= 22) z.dir *= -1;
        lizard(z.el, (now / 90) | 0);
        z.el.style.transition = 'transform .35s steps(4)';
        z.el.style.transform = `translate(${Math.round(z.dx * z.S)}px, ${Math.round(z.dx * 0.5 * z.S)}px) scaleX(${z.dir > 0 ? -1 : 1})`;
        z.next = now + 1800 + Math.random() * 4200;
      });
    }, 300);
    const blowTumbleweed = () => {
      setTimeout(blowTumbleweed, 14000 + Math.random() * 16000);
      const wrap = $('path-wrap'), scr = $('screen');
      if (!wrap || !street.el || !$('page-courses').classList.contains('visible') || document.hidden) return;
      const S = street.S, c = document.createElement('canvas'); tumble(c); c.className = 'st-mil';
      const y = (scr.scrollTop + scr.clientHeight * (0.35 + Math.random() * 0.4)) / S - (wrap.offsetTop || 0) / S;
      const size = 22 + Math.random() * 6;
      Object.assign(c.style, { width:Math.round(size * S) + 'px', height:Math.round(size * S) + 'px', zIndex:1950000 });
      wrap.appendChild(c);
      const W = street.WW, t0 = performance.now(), ms = 5200 + Math.random() * 2000, ltr = Math.random() < 0.6;
      const tick = (now) => {
        if (!document.contains(c)) return;
        const f = (now - t0) / ms; if (f >= 1) { c.remove(); return; }
        const x = ltr ? -24 + (W + 48) * f : W + 24 - (W + 48) * f, hop = Math.abs(Math.sin(f * Math.PI * 7)) * 7 * (1 - f * 0.4);
        c.style.transform = `translate(${Math.round((x - size / 2) * S)}px, ${Math.round((y + f * 18 - hop - size) * S)}px) rotate(${(ltr ? 1 : -1) * f * 1440}deg)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    setTimeout(blowTumbleweed, 6000);
  }
});


// ============ BOOT CAMP: EVERY DOOR OPEN (for now) ============
// Duncan 2026-11-23: until Militia's own training is in, every door on the base is open with the standard demo
// lessons behind them (and every boss ready), whatever the rep's level.
if (MIL && typeof categories !== 'undefined') appSafe('all doors open', () => {
  APP.labOpen = true;
  if (!(APP.features.companyLessons && APP.lessons && APP.lessons.length)) {
    const done = new Set(APP.doneLessons || []);
    categories.forEach(c => c.subs.forEach(s => { s.status = done.has(s.id || s.title) ? 'done' : 'locked'; }));
  }
  ME.level = 'vet';
  if (typeof normalizePath === 'function') normalizePath();   // every door active before the street first draws, so the rep starts at the first one
  const chip = $('vet-chip'); if (chip) chip.textContent = 'All doors open';
});


// ============ THE BASE FILLS OUT (round 3) ============
// Duncan 2026-11-24: humvees by the helipad, a soldier doing pushups, pebbles in the sand, a drill sergeant in
// place of the old man on the bench (and on the name screen), props spread across the whole base instead of a
// line down the middle, and room above the helipad for the pilot's line.
if (MIL && typeof renderStreet === 'function') appSafe('outpost round 3', () => {
  const MIL_ART = window.MIL_ART || {};
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const outline = (c, col) => { const g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data, a = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 200;
    const add = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) add.push([x, y]);
    add.forEach(([x, y]) => R(g, x, y, 1, 1, col || '#0b0b0e')); };

  // the street may draw above its own top edge (the helicopter flies in from up there, and the pilot's line sits there)
  document.head.insertAdjacentHTML('beforeend', `<style>
    .skin-military #page-courses .path-wrap{ overflow-x:clip !important; overflow-y:visible !important; }
    .st-r3{ position:absolute; image-rendering:pixelated; pointer-events:none; }
  </style>`);

  // ---- a small voxel painter (the tank's, in general): solids in local x/y/z, turned by th, drawn back to front ----
  const voxel = (W, H, OX, OY, th, build) => (c) => {
    c.width = W; c.height = H; const g = c.getContext('2d'), co = Math.cos(th), si = Math.sin(th), pts = [];
    const add = (x, y, z, nx, ny, nz, col) => pts.push([x * co - y * si, x * si + y * co, z, nx * co - ny * si, nx * si + ny * co, nz, col]);
    const box = (x0, x1, y0, y1, ztop, col, z0 = 0) => {
      for (let x = x0; x <= x1; x += 0.5) for (let y = y0; y <= y1; y += 0.5) {
        const zt = typeof ztop === 'function' ? ztop(x, y) : ztop; if (zt <= z0) continue;
        add(x, y, zt, 0, 0, 1, col(x, y, zt, 'top'));
        [[x === x0, -1, 0], [x >= x1 - 0.25, 1, 0], [y === y0, 0, -1], [y >= y1 - 0.25, 0, 1]].forEach(([on, nx, ny]) => { if (on) for (let z = z0; z < zt; z += 0.5) add(x, y, z, nx, ny, 0, col(x, y, z, nx ? (nx > 0 ? 'front' : 'back') : 'side')); });
      }
    };
    const wheel = (cx, y0, y1, cz, r, tire, hub) => { for (let a = 0; a < 6.28; a += 0.12) for (let y = y0; y <= y1; y += 0.5) add(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r, Math.cos(a), 0, Math.sin(a), tire);
      [y0, y1].forEach((y, i) => { for (let rr = 0; rr <= r; rr += 0.5) for (let a = 0; a < 6.28; a += 0.25) add(cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr, 0, i ? 1 : -1, 0, rr < r * 0.55 ? hub : tire); }); };
    build({ add, box, wheel });
    pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[2] - b[2]);
    const buf = new Map(), shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
    pts.forEach(([u, v, z, nu, nv, nz, col]) => { if (nz < 0.5 && nu < -0.05 && nv < -0.05) return; const k = nz > 0.5 ? 1.08 : nu > 0 && nu >= nv ? 0.72 : 0.95; buf.set(Math.round(u - v + OX) + ',' + Math.floor((u + v) / 2 - z + OY), shade(col, k)); });
    g.fillStyle = 'rgba(0,0,0,0.33)';
    build({ add:() => {}, box:(x0, x1, y0, y1) => { for (let x = x0 - 1; x <= x1 + 1; x += 0.5) for (let y = y0 - 1; y <= y1 + 2; y += 0.5) { const u = x * co - y * si, v = x * si + y * co; g.fillRect(Math.round(u - v + OX + 2), Math.floor((u + v) / 2 + OY + 1), 1, 1); } }, wheel:() => {}, shadowOnly:true });
    buf.forEach((col, key) => { const [x, y] = key.split(',').map(Number); g.fillStyle = col; g.fillRect(x, y, 1, 1); });
    const edge = []; buf.forEach((_, key) => { const [x, y] = key.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (!buf.has((x + a) + ',' + (y + b))) edge.push([x + a, y + b]); }); });
    g.fillStyle = '#16120c'; edge.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  };
  // ---- a desert humvee, after Duncan's reference: tan body, olive-dark glass, grille, a gunner's ring and gun ----
  const HUMVEE = { W:84, H:56, OX:34, OY:36 };
  const paintHumvee = (th) => voxel(HUMVEE.W, HUMVEE.H, HUMVEE.OX, HUMVEE.OY, th, ({ add, box, wheel, shadowOnly }) => {
    const L = 34, Wd = 18, ox = -L / 2, oy = -Wd / 2;
    const T = '#c9a46a', TS = '#b08b55', TD = '#8a6a3a', GL = '#55552a';
    const X = (x) => x + ox, Y = (y) => y + oy;
    if (shadowOnly) { box(X(0), X(L), Y(0), Y(Wd)); return; }
    [[7, 0], [27, 0], [7, Wd - 3.5], [27, Wd - 3.5]].forEach(([x, y]) => wheel(X(x), Y(y), Y(y + 3.5), 4, 4, '#1f1d19', '#a8874f'));
    box(X(1), X(L - 1), Y(1), Y(Wd - 1), 9, (x, y, z, f) => f === 'top' ? T : z < 5.5 ? TD : f === 'front' && z > 5.5 && z < 8.5 ? ((Math.round(y * 2) % 2) ? '#3a3020' : '#d8d2bf') : TS, 4);
    box(X(23), X(L - 1), Y(1), Y(Wd - 1), (x) => 10.5 - (x - X(23)) * 0.12, (x, y, z, f) => f === 'top' ? (Math.abs(y - Y(Wd / 2)) < 3 && x > X(26) && x < X(31) && (Math.round(x * 2) % 2) ? '#3a3020' : T) : TS, 9);
    box(X(7), X(23), Y(1.5), Y(Wd - 1.5), 16.5, (x, y, z, f) => f === 'top' ? T : (z > 11 && z < 15.5 && (f === 'front' || (f === 'side' && ((x > X(9) && x < X(15)) || (x > X(16) && x < X(21.5)))))) ? GL : TS, 9);
    box(X(1), X(7), Y(1.5), Y(Wd - 1.5), 12, (x, y, z, f) => f === 'top' ? TS : TS, 9);
    for (let a = 0; a < 6.28; a += 0.2) for (let z = 16.5; z < 19; z += 0.5) add(X(15) + Math.cos(a) * 3.5, Y(Wd / 2) + Math.sin(a) * 3.5, z, Math.cos(a), Math.sin(a), 0, '#b99a62');
    for (let x = X(15); x <= X(27); x += 0.5) for (let a = 0; a < 6.28; a += 0.5) add(x, Y(Wd / 2) + Math.cos(a) * 0.8, 19.5 + Math.sin(a) * 0.8, 0, Math.cos(a), Math.sin(a), '#2e2a22');
    [[2.5], [Wd - 3.5]].forEach(([y]) => { for (let yy = y; yy <= y + 1; yy += 0.5) for (let z = 7; z <= 8; z += 0.5) add(X(L - 1) + 0.2, Y(yy), z, 1, 0, 0, '#fff5cf'); });
  });

  // ---- a soldier doing pushups, side on: arms straight (up) and bent (down) ----
  // pivots on the toes: the boots and hands stay planted, the body is one straight plank from toes to shoulders, and the arms bend
  const pushup = (c, down) => { c.width = 30; c.height = 14; const g = c.getContext('2d'); g.clearRect(0, 0, 30, 14);
    const F = '#5b6438', FD = '#3f4626', K = '#c58a5e', H = '#4b5320', B = '#16140f';
    const tx = 27, ty = 11.5, sx = 7, sy = down ? 9 : 4;                        // toe pivot and shoulder
    const yAt = x => ty + (sy - ty) * (tx - x) / (tx - sx);
    for (let x = sx - 1; x <= tx - 3; x++) { const y = Math.round(yAt(x) - 1); R(g, x, y, 1, x < 16 ? 3 : 2, ((x * 3) % 7 === 0) ? FD : F); }
    for (let x = tx - 3; x <= tx; x++) R(g, x, Math.round(yAt(x) - 1), 1, 2, B);   // boots ride the same line down to the toes
    const hy = Math.round(sy) - 2; R(g, sx - 6, hy - 2, 5, 3, H); R(g, sx - 5, hy + 1, 3, 2, K); R(g, sx - 7, hy - 1, 1, 1, H);
    if (down) { R(g, sx - 1, 10, 4, 1, F); R(g, sx - 1, 10, 2, 2, F); }       // elbows bent back over the hands
    else { R(g, sx - 1, sy + 1, 2, 12 - sy - 1, F); }                          // straight arms
    R(g, sx - 2, 12, 3, 1, K);                                                   // hands planted, same spot both frames
    outline(c, '#1a170f'); R(g, 3, 13, 25, 1, 'rgba(0,0,0,.35)'); };

  // ---- the drill sergeant (campaign hat, olive fatigues, boots) ----
  const DRILL = { skin:2, eyes:0, eyeStyle:'dot', hair:'buzz', hairColor:1, face:'none', top:'olivefatigues', hat:'campaignhat', pants:'olivecargo', shoes:'combat', extra:'none' };
  const DRILL_LINES = ['Pick it up, private! Next door!', 'Drop and give me twenty, recruit!', 'Knock like you mean it!', 'Did I say you could slow down?!', 'Move it, move it, MOVE IT!', 'That door ain’t gonna knock itself!'];
  // standing, not on a bench: he fills a taller canvas, and the street's box for him is resized after each render
  paintBench = function(canvas, frame){
    canvas.width = 44; canvas.height = 58; const g = canvas.getContext('2d'); g.clearRect(0, 0, 44, 58);
    g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(10, 56, 24, 2);
    g.drawImage(spriteCanvas(DRILL, frame ? 'win' : 'down-0', frame ? 'shout' : 'grumpy'), 4, 5);
  };
  // the name screen: he comes out instead of the lady, and he yells instead of cussing
  const SARGE = ['NAME?! Drop and give me twenty!', 'Is that a name or a sneeze, NAME?!', 'NAME! Front and center, recruit!', 'I can’t HEAR you, NAME!', 'NAME, you’re in my army now!'];
  if (typeof heckle === 'function') heckle = function(name){
    const h = $('ob-heckler'); if (!h) return;
    const b = h.querySelector('.ob-heckle');
    if (!name) { h.classList.remove('on'); return; }
    const line = SARGE[(name.length + name.charCodeAt(0)) % SARGE.length].replace('NAME', name);
    if (b.textContent === line && h.classList.contains('on')) return;
    b.textContent = line;
    h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
    drawSprite(h.querySelector('canvas'), DRILL, { crop:'bust', mood:'shout' });
  };

  // ---- pebbles in the sand ----
  const baseGround = paintGround;
  paintGround = function(){
    baseGround.apply(this, arguments);
    const cv = street.ground, g = cv.getContext('2d'), W = cv.width, H = cv.height, im = g.getImageData(0, 0, W, H), d = im.data;
    let seed = 29; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sandy = (x, y) => { if (x < 1 || y < 1 || x >= W - 2 || y >= H - 2) return false; const o = (y * W + x) * 4; return d[o] > 85 && d[o] > d[o + 2] + 18 && d[o + 1] > 70; };
    const set = (x, y, c) => { const o = (y * W + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; };
    const n = Math.round(W * H / 55);
    for (let i = 0; i < n; i++) {
      const x = (rnd() * W) | 0, y = (rnd() * H) | 0; if (!sandy(x, y) || !sandy(x + 1, y + 1)) continue;
      const big = rnd() < 0.25, tone = rnd();
      const dark = tone < 0.5 ? [84, 70, 52] : [96, 82, 62], lite = [158, 140, 110];
      set(x, y, dark); if (big) { set(x + 1, y, dark); set(x, y - 1, lite); set(x + 1, y + 1, [66, 55, 40]); } else if (tone > 0.8) set(x, y - 1, lite);
    }
    g.putImageData(im, 0, 0);
  };

  const MIL_DENSITY = 0.5;                                              // share of props kept across the base (1, 0.75 or 0.5)
  // a big pixel radar dish on a lattice mast with an olive shelter at its foot
  const paintRadar = (c) => { c.width = 54; c.height = 66; const g = c.getContext('2d');
    // shelter
    R(g, 10, 50, 34, 12, '#4b5320'); R(g, 10, 46, 34, 4, '#66702e'); R(g, 10, 50, 34, 1, '#363b17'); R(g, 14, 53, 6, 7, '#363b17'); R(g, 30, 53, 10, 3, '#59622a'); R(g, 9, 62, 36, 2, 'rgba(0,0,0,.35)');
    // lattice mast
    for (let y = 30; y < 47; y++) { const s = (y - 30) >> 2; R(g, 23 - s, y, 1, 1, '#55585e'); R(g, 31 + s, y, 1, 1, '#3e4146'); if ((y & 3) === 0) R(g, 23 - s, y, 9 + s * 2, 1, '#6b7078'); if ((y & 3) === 2) R(g, 26, y, 3, 1, '#55585e'); }
    R(g, 24, 26, 7, 5, '#6b7078'); R(g, 24, 30, 7, 1, '#3e4146');
    // dish, tipped up and to the right
    const cx = 27, cy = 16, rx = 23, ry = 12, an = -0.42, ca = Math.cos(an), sa = Math.sin(an);
    for (let y = 0; y < 34; y++) for (let x = 0; x < 54; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry, d = u * u + v * v;
      if (d > 1) continue; const col = d > 0.78 ? '#8a8576' : (u + v < -0.35 ? '#e4dfcf' : u + v < 0.35 ? '#c9c4b4' : '#aba696'); R(g, x, y, 1, 1, col); }
    // feed horn on three struts
    const fx = cx + 6, fy = cy - 9;
    [[-14, 6], [12, -3], [4, 9]].forEach(([ox, oy]) => { const sx = cx + ox, sy = cy + oy; for (let t = 0; t <= 1; t += 0.08) R(g, Math.round(sx + (fx - sx) * t), Math.round(sy + (fy - sy) * t), 1, 1, '#55585e'); });
    R(g, fx - 2, fy - 2, 4, 4, '#3e4146'); R(g, fx - 1, fy - 1, 2, 2, '#d9463b');
    outline(c); };
  // ---- a tracked rocket launcher: low tan hull on tracks, a cab up front, a six-tube pod raised over the cab ----
  const LAUNCHER = { W:96, H:84, OX:50, OY:56, TH:Math.PI / 2 - 0.35, A:0.55, muzzle:null, dir:null };
  const paintLauncher = (c, empty = -1) => voxel(LAUNCHER.W, LAUNCHER.H, LAUNCHER.OX, LAUNCHER.OY, LAUNCHER.TH, ({ add, box, wheel, shadowOnly }) => {
    const L = 36, Wd = 18, ox = -L / 2, oy = -Wd / 2, X = (x) => x + ox, Y = (y) => y + oy;
    const T = '#c4a066', TS = '#a8854f', TD = '#7c6238', TR = '#2a2620', OL = '#59622a';
    if (shadowOnly) { box(X(0), X(L), Y(0), Y(Wd)); return; }
    // tracks with road wheels
    [[0, 3.5], [Wd - 3.5, Wd]].forEach(([y0, y1]) => { box(X(1), X(L - 1), Y(y0), Y(y1), 5, (x, y, z, f) => f === 'top' ? '#3a352c' : (Math.round(x) % 2 ? TR : '#3a352c'));
      [5, 11, 17, 23, 29].forEach(x => { for (let a = 0; a < 6.28; a += 0.3) add(X(x) + Math.cos(a) * 1.8, Y(y0 < 1 ? -0.1 : Wd + 0.1), 2.6 + Math.sin(a) * 1.8, 0, y0 < 1 ? -1 : 1, 0, '#6b6250'); }); });
    // hull
    box(X(0.5), X(L - 0.5), Y(3.5), Y(Wd - 3.5), 9, (x, y, z, f) => f === 'top' ? T : z < 6 ? TD : TS, 4);
    // cab at the front (+x), windows dark
    box(X(L - 9), X(L - 0.5), Y(3), Y(Wd - 3), 15, (x, y, z, f) => f === 'top' ? T : (z > 11 && z < 14 && f !== 'back') ? '#3b3a22' : TS, 9);
    // the launch pod: a box tipped up by A, hinged at the back of the hull, its open end aimed forward and up over the cab
    const A = LAUNCHER.A, ca = Math.cos(A), sa = Math.sin(A), Lp = 22, Tk = 9, px0 = X(1), pz0 = 10, y0 = Y(1.5), y1 = Y(Wd - 1.5);
    const P = (s, t) => [px0 + s * ca - t * sa, pz0 + s * sa + t * ca];
    for (let s = 0; s <= Lp; s += 0.5) for (let y = y0; y <= y1; y += 0.5) { const [x, z] = P(s, Tk); add(x, y, z, -sa, 0, ca, (Math.round(s) % 6 === 0) ? TS : T); }
    for (let s = 0; s <= Lp; s += 0.5) for (let t = 0; t <= Tk; t += 0.5) [[y0, -1], [y1, 1]].forEach(([y, ny]) => { const [x, z] = P(s, t); add(x, y, z, 0, ny, 0, t < 1 ? TD : (Math.round(s) % 6 === 0 ? TD : OL)); });
    // the open end: six tubes, 2 rows of 3; a fired tube shows the flame-black hole only
    for (let t = 0; t <= Tk; t += 0.5) for (let y = y0; y <= y1; y += 0.5) { const [x, z] = P(Lp, t);
      const col = Math.min(2, Math.floor((y - y0) / ((y1 - y0) / 3))), row = t < Tk / 2 ? 0 : 1, cy = y0 + (col + 0.5) * (y1 - y0) / 3, ct = (row + 0.5) * Tk / 2, dd = Math.hypot(y - cy, t - ct);
      add(x, y, z, ca, 0, sa, dd < 1.9 ? (row * 3 + col === empty ? '#0c0b09' : dd < 0.9 ? '#e8e2cf' : '#1d1b16') : (dd < 2.4 ? '#6b5a3a' : '#d8be8a')); }
    // hydraulic rams under the pod
    [y0 + 1.5, y1 - 1.5].forEach(y => { for (let s = 0; s <= 8; s += 0.4) for (let w = -0.5; w <= 0.5; w += 0.5) add(X(16) - s * 0.55 + w, y, 9 + s * 0.75, 0, y < 0 ? -1 : 1, 0, '#3e4146'); });
    // where a rocket leaves, in canvas pixels, and which way it flies on screen
    const co = Math.cos(LAUNCHER.TH), si = Math.sin(LAUNCHER.TH), proj = (x, y, z) => { const u = x * co - y * si, v = x * si + y * co; return { x:u - v + LAUNCHER.OX, y:(u + v) / 2 - z + LAUNCHER.OY }; };
    const [mx, mz] = P(Lp + 1, Tk / 2), m = proj(mx, (y0 + y1) / 2, mz), [fx, fz] = P(Lp + 11, Tk / 2), f = proj(fx, (y0 + y1) / 2, fz);
    LAUNCHER.muzzle = m; const d = Math.hypot(f.x - m.x, f.y - m.y); LAUNCHER.dir = { x:(f.x - m.x) / d, y:(f.y - m.y) / d };
  })(c);
  const rocketArt = (c) => { c.width = 14; c.height = 5; const g = c.getContext('2d');
    R(g, 2, 1, 9, 3, '#c9c4b4'); R(g, 2, 3, 9, 1, '#8a8576'); R(g, 11, 1, 2, 3, '#d9463b'); R(g, 13, 2, 1, 1, '#d9463b'); R(g, 0, 0, 3, 1, '#55585e'); R(g, 0, 4, 3, 1, '#55585e'); R(g, 4, 1, 1, 3, '#55585e'); outline(c, '#16120c'); };
  // fire one: flash, a kick, a rocket that climbs away on a smoke trail; the tube reloads a moment later
  const fireLauncher = (el, wrap, S) => {
    const st = el._st || (el._st = { next:0, busy:0 }); if (st.busy >= 3) return; const n = st.next; st.next = (n + 1) % 6; st.busy++;
    paintLauncher(el, n); try { haptic('big'); } catch (e) {} [180, 380].forEach(ms => setTimeout(() => { try { haptic('hit'); } catch (e) {} }, ms));   // a hard kick, then the rumble of the motor
    const k = el._k, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top), m = LAUNCHER.muzzle, dir = LAUNCHER.dir;
    const x0 = ox + m.x * k * S, y0 = oy + m.y * k * S, z = 9000;
    el.animate([{ transform:'translate(0,0)' }, { transform:`translate(${-dir.x * 3}px,${-dir.y * 3 + 1}px)` }, { transform:'translate(0,0)' }], { duration:180 });
    const flash = document.createElement('div'); Object.assign(flash.style, { position:'absolute', left:(x0 - 14) + 'px', top:(y0 - 14) + 'px', width:'28px', height:'28px', borderRadius:'50%', background:'radial-gradient(#fff7cf,#ffb340 45%,rgba(255,90,20,0) 70%)', zIndex:z, pointerEvents:'none' });
    wrap.appendChild(flash); flash.animate([{ opacity:1, transform:'scale(.6)' }, { opacity:0, transform:'scale(1.6)' }], { duration:260 }).onfinish = () => flash.remove();
    const r = document.createElement('canvas'); rocketArt(r); Object.assign(r.style, { position:'absolute', width:Math.round(14 * S * 1.2) + 'px', height:Math.round(5 * S * 1.2) + 'px', imageRendering:'pixelated', zIndex:z + 1, pointerEvents:'none', transformOrigin:'50% 50%' });
    wrap.appendChild(r);
    const t0 = performance.now(), dur = 2200, rw = 14 * S * 1.2, rh = 5 * S * 1.2; let lastPuff = 0;
    const step = (now) => { const t = (now - t0) / 1000;
      const dist = (60 * t + 200 * t * t) * S, lift = 240 * t * t * S;                       // speeds up and bends skyward
      const x = x0 + dir.x * dist, y = y0 + dir.y * dist - lift, vx = dir.x * (60 + 400 * t), vy = dir.y * (60 + 400 * t) - 480 * t;
      r.style.left = (x - rw / 2) + 'px'; r.style.top = (y - rh / 2) + 'px'; r.style.transform = `rotate(${Math.atan2(vy, vx)}rad)`;
      if (now - lastPuff > 35) { lastPuff = now; const pf = document.createElement('div'), sz = (6 + Math.random() * 4) * S;
        Object.assign(pf.style, { position:'absolute', left:(x - dir.x * rw * 0.5 - sz / 2) + 'px', top:(y - dir.y * rw * 0.5 - sz / 2) + 'px', width:sz + 'px', height:sz + 'px', borderRadius:'50%', background:t < 0.15 ? '#ffcf70' : '#d8d2c4', zIndex:z, pointerEvents:'none', imageRendering:'pixelated' });
        wrap.appendChild(pf); pf.animate([{ opacity:0.9, transform:'scale(.6)' }, { opacity:0, transform:`scale(2.2) translate(${(Math.random() - 0.5) * 6}px,-4px)` }], { duration:1300, easing:'ease-out' }).onfinish = () => pf.remove(); }
      if (now - t0 < dur && y > -60) requestAnimationFrame(step); else r.remove(); };
    requestAnimationFrame(step);
    setTimeout(() => { st.busy--; if (document.contains(el)) paintLauncher(el, st.busy ? (st.next + 5) % 6 : -1); }, 1500);
  };
  // the tank fires its main gun: a heavy buzz, muzzle blast, the hull rocks back, smoke rolls out, dust kicks up, a tracer streaks away
  const puff = (wrap, x, y, sz, col, z, dur, dx = 0, dy = -6, grow = 2.4) => { const pf = document.createElement('div');
    Object.assign(pf.style, { position:'absolute', left:(x - sz / 2) + 'px', top:(y - sz / 2) + 'px', width:sz + 'px', height:sz + 'px', borderRadius:'50%', background:col, zIndex:z, pointerEvents:'none' });
    wrap.appendChild(pf); pf.animate([{ opacity:0.95, transform:'translate(0,0) scale(.5)' }, { opacity:0, transform:`translate(${dx}px,${dy}px) scale(${grow})` }], { duration:dur, easing:'ease-out' }).onfinish = () => pf.remove(); };
  const fireTank = (el, wrap, S) => {
    if (el._busy) return; el._busy = true; setTimeout(() => { el._busy = false; }, 900);
    try { haptic('big'); } catch (e) {}
    const k = el._k, ox = parseFloat(el.style.left), oy = parseFloat(el.style.top);
    const co = Math.cos(-0.45), si = Math.sin(-0.45), u = 41 * co, v = 41 * si;              // muzzle: barrel tip in the tank's own pixels
    const mx = ox + (u - v + 38) * k * S, my = oy + ((u + v) / 2 - 14 + 36) * k * S, dl = Math.hypot(co - si, (co + si) / 2), dir = { x:(co - si) / dl, y:(co + si) / 2 / dl };
    const z = 9000, base = el.style.transform || '';
    // recoil: the hull jolts back along the barrel and settles
    el.animate([{ transform:'translate(0,0) rotate(0)' }, { transform:`translate(${-dir.x * 5 * S}px,${-dir.y * 5 * S}px) rotate(-1.2deg)` }, { transform:`translate(${dir.x * 1.2 * S}px,0) rotate(.4deg)` }, { transform:'translate(0,0) rotate(0)' }], { duration:420, easing:'ease-out' });
    // a small camera shake
    wrap.animate([{ transform:'translate(0,0)' }, { transform:'translate(-2px,1px)' }, { transform:'translate(2px,-1px)' }, { transform:'translate(-1px,0)' }, { transform:'translate(0,0)' }], { duration:260 });
    // muzzle blast
    const flash = document.createElement('div'), fs = 34 * S;
    Object.assign(flash.style, { position:'absolute', left:(mx - fs / 2) + 'px', top:(my - fs / 2) + 'px', width:fs + 'px', height:fs + 'px', borderRadius:'50%', background:'radial-gradient(#fffbe0,#ffc24a 35%,#ff6a1a 55%,rgba(255,80,20,0) 72%)', zIndex:z + 2, pointerEvents:'none' });
    wrap.appendChild(flash); flash.animate([{ opacity:1, transform:'scale(.5)' }, { opacity:1, transform:'scale(1.15)', offset:0.3 }, { opacity:0, transform:'scale(1.5)' }], { duration:240 }).onfinish = () => flash.remove();
    // smoke rolling out of the barrel and drifting up
    for (let i = 0; i < 9; i++) { const d = (4 + i * 3.2) * S, spread = (Math.random() - 0.5) * 8 * S;
      setTimeout(() => puff(wrap, mx + dir.x * d - dir.y * spread, my + dir.y * d + dir.x * spread, (9 + Math.random() * 7) * S, i < 2 ? '#c9b48a' : '#bdb7aa', z + 1, 1500 + Math.random() * 500, dir.x * 10 * S, -10 * S, 2.8), i * 25); }
    // dust kicked up from under the tracks by the blast
    const fx = ox + 38 * k * S, fy = oy + 44 * k * S;
    for (let i = 0; i < 8; i++) puff(wrap, fx + (Math.random() - 0.3) * 60 * S, fy + (Math.random() - 0.5) * 14 * S, (7 + Math.random() * 6) * S, '#c8ad7e', z - 1, 900 + Math.random() * 400, (Math.random() - 0.5) * 16 * S, -6 * S, 2.2);
    // the round: a bright tracer streaking away down the barrel line
    const tr = document.createElement('div'), tl = 16 * S;
    Object.assign(tr.style, { position:'absolute', left:mx + 'px', top:(my - 1.5 * S) + 'px', width:tl + 'px', height:(3 * S) + 'px', borderRadius:'2px', background:'linear-gradient(90deg,rgba(255,170,60,0),#ffd36a 60%,#fffbe0)', zIndex:z + 3, pointerEvents:'none', transformOrigin:'0 50%', transform:`rotate(${Math.atan2(dir.y, dir.x)}rad)` });
    wrap.appendChild(tr); const far = 420 * S;
    tr.animate([{ transform:`translate(0,0) rotate(${Math.atan2(dir.y, dir.x)}rad)`, opacity:1 }, { transform:`translate(${dir.x * far}px,${dir.y * far}px) rotate(${Math.atan2(dir.y, dir.x)}rad)`, opacity:0.9 }], { duration:380, easing:'linear' }).onfinish = () => tr.remove();
    // a distant thud a beat later
    setTimeout(() => { try { haptic('hit'); } catch (e) {} }, 420);
  };
  let pushers = [];
  const baseRender = renderStreet;
  renderStreet = function(){
    baseRender.apply(this, arguments);
    const wrap = $('path-wrap'), S = street.S, N = street.stops.length, f = street.L / 180, WW = street.WW;
    const yard = (k, a, b) => { const p = street.verts[k]; return k % 2 === 0 ? { u:p.u + a * f, v:p.v - b * f } : { u:p.u - b * f, v:p.v + a * f }; };
    const place = (c, q, ax, ay, k = 1, cls = 'st-camp') => { const p = isoPt(q.u, q.v); c.className = cls; c.setAttribute('aria-hidden', 'true');
      Object.assign(c.style, { position:'absolute', imageRendering:'pixelated', pointerEvents:'none', left:Math.round((p.x - ax * k) * S) + 'px', top:Math.round((p.y - ay * k) * S) + 'px', width:Math.round(c.width * k * S) + 'px', height:Math.round(c.height * k * S) + 'px', zIndex:objZ(q.u, q.v) });
      wrap.appendChild(c); return p; };

    // the drill sergeant stands where the bench was
    (street.yellers || []).forEach(y => { const el = y.el; el.style.height = Math.round(58 * S) + 'px'; el.style.top = Math.round(parseFloat(el.style.top) - 12 * S) + 'px'; paintBench(el, 0); y.bub.style.top = Math.round(parseFloat(y.bub.style.top) - 10 * S) + 'px'; });

    // two humvees parked up the old road from the helipad
    const rv = roadV();
    // parked side by side, door to door, the same way round; offset across their width (local y), drawn 1.3x
    const HTH = -0.3, gap = 19 * 1.3, hu = -104, hv = rv + 62;
    [[hu + gap * Math.sin(-HTH), hv - gap * Math.cos(HTH), HTH], [hu - gap * Math.sin(-HTH), hv + gap * Math.cos(HTH), HTH]].forEach(([u, v, th]) => { const c = document.createElement('canvas'); paintHumvee(th)(c); place(c, { u, v }, HUMVEE.OX, HUMVEE.OY, 1.3, 'st-camp st-tank'); });

    // where things can go: open sand, off the walks, off the houses, on screen, and not on top of another prop
    const route = [];
    for (let k = -1; k < N - 1; k++) { const a = isoPt(street.verts[k].u, street.verts[k].v), b = isoPt(street.verts[k + 1].u, street.verts[k + 1].v);
      for (let t = 0; t <= 1; t += 0.03) route.push({ x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t }); }
    street.stops.forEach(st => { const w = st.walk, d = st.stand; for (let t = 0; t <= 1; t += 0.2) route.push({ x:w.x + (d.x - w.x) * t, y:w.y + (d.y - w.y) * t }); });
    const feet = [];
    wrap.querySelectorAll('.st-camp, .st-tree, .st-bench, .st-light').forEach(e => { if (e.style.display === 'none') return; const w = parseFloat(e.style.width) / S, h = parseFloat(e.style.height) / S;
      const tank = e.classList.contains('st-tank'); feet.push({ x:parseFloat(e.style.left) / S + w / 2, y:parseFloat(e.style.top) / S + h - (tank ? h * 0.35 : 0), r:tank ? w * 0.55 : Math.max(12, w * 0.45) }); });
    const pu = isoPt(-4, rv + 2); feet.push({ x:pu.x, y:pu.y, r:40 });
    const onHouse = (x, y) => street.stops.some(s => houseOpaque(s, x, y) || houseOpaque(s, x, y - 14) || houseOpaque(s, x - 10, y - 6) || houseOpaque(s, x + 10, y - 6) || houseOpaque(s, x, y + 6));
    const free = (x, y, r, need) => x > 8 && x < WW - 8 && y > 0 && !onHouse(x, y) && route.every(p => Math.hypot((p.x - x) * 0.8, p.y - y) > need) && feet.every(o => Math.hypot(o.x - x, (o.y - y) * 1.6) > Math.max(o.r, r));
    let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const spots = [];
    // the grid reaches past each yard's old edge so the outskirts of the base fill in too
    for (let k = 0; k < N - 1; k++) for (let a = 6; a < 216; a += 15) for (let b = 6; b < 236 - a; b += 15) spots.push([k, a + (rnd() - 0.5) * 10, b + (rnd() - 0.5) * 10, a + b < 186]);
    spots.sort(() => rnd() - 0.5);

    // the soldier doing pushups gets the first good open spot near the middle of the base
    pushers = [];
    const pk = Math.min(N - 2, 2 + ((Date.now() / 60000) | 0) % Math.max(1, N - 4));
    for (const [k, a, b, inner] of spots) { if (!inner || k !== pk && k !== pk + 1) continue; const q = yard(k, a, b), p = isoPt(q.u, q.v); if (!free(p.x, p.y, 34, 22)) continue;
      const c = document.createElement('canvas'); pushup(c, false); place(c, q, 15, 13, 1.7, 'st-camp st-keep'); feet.push({ x:p.x, y:p.y, r:34 }); pushers.push({ el:c, n:0, down:false, rest:0 }); break; }

    // one big radar dish out on the edge of the base, like the tank
    // the tank fires when tapped
    wrap.querySelectorAll('canvas.st-tank').forEach(t => { if (t.width !== 106 || t.height !== 58) return; t._k = 1.45;
      Object.assign(t.style, { pointerEvents:'auto', cursor:'pointer' }); t.setAttribute('role', 'button'); t.setAttribute('aria-label', 'Fire the tank'); t.removeAttribute('aria-hidden');
      t.addEventListener('click', e => { e.stopPropagation(); fireTank(t, wrap, S); }); });

    // the rocket launcher fills the empty bottom-right corner past the last walk; tap it to fire
    if (N >= 3) { const vq = street.verts[N - 2], lq = { u:vq.u + 80, v:vq.v + 112 }, lp = isoPt(lq.u, lq.v), LK = 1.75;
      wrap.querySelectorAll('.st-camp, .st-tree').forEach(t => { const bx = (parseFloat(t.style.left) + parseFloat(t.style.width) / 2) / S, by = (parseFloat(t.style.top) + parseFloat(t.style.height)) / S;
        if (Math.abs(bx - lp.x) < 76 && by > lp.y - 52 && by < lp.y + 34) t.style.display = 'none'; });
      const c = document.createElement('canvas'); paintLauncher(c); place(c, lq, LAUNCHER.OX, LAUNCHER.OY, LK, 'st-camp st-tank st-launcher'); c._k = LK;
      Object.assign(c.style, { pointerEvents:'auto', cursor:'pointer' }); c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'Fire a rocket');
      c.addEventListener('click', e => { e.stopPropagation(); fireLauncher(c, wrap, S); });
      feet.push({ x:lp.x, y:lp.y - 8, r:72 }); }

    // Duncan's spot: the open sand beside Hank the Haggler's stop, clear of the doors; fall back to the left side if that stop isn't there
    const RK = 11, rq = RK < N ? { u:street.verts[RK].u - 59.5, v:street.verts[RK].v + 71.5 } : null, rp = rq && isoPt(rq.u, rq.v);
    if (rq && !onHouse(rp.x, rp.y)) { const c = document.createElement('canvas'); paintRadar(c); place(c, rq, 27, 62, 1.35, 'st-camp st-tank'); feet.push({ x:rp.x, y:rp.y, r:46 }); }
    else for (const [k, a, b] of spots) { if (k < 1 || k > 3) continue; const q = yard(k, a, b), p = isoPt(q.u, q.v); if (p.x < 34 || p.x > 120 || !free(p.x, p.y, 46, 30)) continue;
      const c = document.createElement('canvas'); paintRadar(c); place(c, q, 27, 62, 1.35, 'st-camp st-tank'); feet.push({ x:p.x, y:p.y, r:46 }); break; }

    // fill the open sand: palms, Hesco, sandbags, crate stacks and rocks, spread across every yard
    const kinds = [['palm', 0.32], ['hesco', 0.16], ['sandbags', 0.16], ['crates', 0.14], ['rock', 0.22]];
    const pick = () => { let r = rnd(); for (const [k, w] of kinds) { if ((r -= w) <= 0) return k; } return 'rock'; };
    let added = 0, innerAdded = 0;
    const before = wrap.querySelectorAll('.st-camp, .st-tree').length;
    for (const [k, a, b, inner] of spots) {
      if (rnd() > 0.4) continue;
      const q = yard(k, a, b), p = isoPt(q.u, q.v), kind = pick(), r = kind === 'palm' ? 22 : kind === 'rock' ? 20 : 26;
      if (!free(p.x, p.y, r, kind === 'palm' ? 14 : 18)) continue;
      const c = document.createElement('canvas');
      if (kind === 'palm') { paintTree(c, 0); place(c, q, 14, 44, 1, 'st-tree'); }
      else if (kind === 'crates') { const c2 = document.createElement('canvas'); MIL_ART.crate(c); place(c, q, 8, 14); MIL_ART.crate(c2); place(c2, { u:q.u + 6, v:q.v - 4 }, 8, 14); }
      else if (kind === 'rock') { MIL_ART.rock(c, (rnd() * 5) | 0); place(c, q, c.width / 2, c.height - 2); }
      else { MIL_ART[kind](c); place(c, q, c.width / 2, c.height - 1); }
      feet.push({ x:p.x, y:p.y, r }); added++; if (inner) innerAdded++;
    }
    street.propsAdded = added;

    // thin it out: keep MIL_DENSITY of what the base used to carry, pulling from the most crowded spots (near the walks) first
    const dens = typeof window.MIL_DENSITY === 'number' ? window.MIL_DENSITY : MIL_DENSITY;
    const pts = [...wrap.querySelectorAll('.st-camp, .st-tree')].filter(e => e.style.display !== 'none' && !e.classList.contains('st-tank') && !e.classList.contains('st-flag') && !e.classList.contains('st-keep') && !(e.width === 44 && e.height === 84))
      .map(e => { const w = parseFloat(e.style.width) / S, h = parseFloat(e.style.height) / S, x = parseFloat(e.style.left) / S + w / 2, y = parseFloat(e.style.top) / S + h;
        return { e, x, y, near:route.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), 1e9) }; });
    const target = Math.round((before + innerAdded) * dens) - (wrap.querySelectorAll('.st-camp, .st-tree').length - pts.length);
    let live = pts.slice();
    while (live.length > Math.max(0, target)) {
      let worst = null, ws = -1;
      for (const a of live) { let n = 0; for (const o of live) if (o !== a && Math.hypot(o.x - a.x, (o.y - a.y) * 1.6) < 44) n++; const sc = n + (a.near < 34 ? 2 : 0) + rnd() * 0.5; if (sc > ws) { ws = sc; worst = a; } }
      worst.e.style.display = 'none'; live = live.filter(a => a !== worst);
    }
    street.propsShown = live.length;
  };
  if (!reduceMotion) setInterval(() => {
    pushers.forEach(z => { if (!document.contains(z.el)) return;
      if (z.rest > 0) { z.rest--; return; }
      z.down = !z.down; pushup(z.el, z.down);
      if (!z.down && ++z.n % 12 === 0) z.rest = 8;                    // a breather every twelve
    });
  }, 380);
});
