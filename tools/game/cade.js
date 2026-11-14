// ============ CADE SUNDERLAND (company extras any company can switch on) ============
// Built for Cade's app (2026-11-13), the GOAT of pest control sales. Each piece is a tenant switch:
//   features.extraGear ['tux', 'pencap']  Cade's tux and his grey trucker cap with a pen in the side, free
//   features.extraRides ['goat']          a pet goat on a leash (2000 XP): walks ahead of you on the street,
//                                         grazes and yells BAAAA at the door and on the podium
//   brand.vaultGuests                     more top reps' cards in the Vault (Ronin in Cade's app)
//   brand.coach.vaultFirst                the coach's own card leads the Vault
//   brand.streetSign                      a green street sign where the road meets the first walkway
// Like the skateboard, every company's app draws the gear and the goat, so a rep wearing or walking them shows
// that way everywhere; only a company with the switch can pick them.

// ---- the tux and the pen cap ----
appSafe('cade gear', () => {
  const mine = (APP && APP.features && Array.isArray(APP.features.extraGear)) ? APP.features.extraGear : [];
  const ITEMS = [
    { slot:'top', id:'tux',    name:'Cade’s tux' },
    { slot:'hat', id:'pencap', name:'Grey trucker + pen' },
  ];
  ITEMS.forEach(it => {
    if (GEAR[it.slot].some(g => g.id === it.id)) return;
    // free for the company that has them; 'limited' keeps them out of everyone else's random looks
    GEAR[it.slot].push({ id:it.id, name:it.name, xp:0, limited:'cade' });
    if (!mine.includes(it.id)) document.head.insertAdjacentHTML('beforeend', `<style>.cr-tile[data-v="${it.id}"]{ display:none; }</style>`);
  });

  // the tux: black jacket with satin lapels, a white shirt down the middle and a black bow tie at the collar
  TOP_OF.tux = 'tux';
  WEAR.OUTFITS.tux = (x, y) => {
    const c = Math.abs(x - 18.5), top = 23;
    if (y <= top + 1 && c < 2.6) return (y === top && c < 0.6) ? '#2a2a30' : '#141418';   // bow tie
    const open = 3.2 - (y - top) * 0.28;                                                    // the shirt's V narrows down the chest
    if (c < open) return (x === 18 || x === 19) && (y - top) % 3 === 2 ? '#c9ccd2' : '#f4f5f7';   // shirt and studs
    if (c < open + 1.2) return '#3a3a42';                                                   // satin lapel
    return '#16161b';                                                                       // jacket
  };

  // the cap: the normal cap's shape in every pose, recolored grey (mesh on the sides), with a pen tucked
  // in over the right ear
  const PEN = { barrel:'#f4f4f2', shade:'#c9c9c4', cap:'#1f3f9a', tip:'#2b2b30' };
  const capCache = new Map();
  const baseSprite = spriteCanvas;
  spriteCanvas = function(look, pose, mood, flash){
    if (!look || look.hat !== 'pencap') return baseSprite(look, pose, mood, flash);
    const key = JSON.stringify([look, pose, mood, !!flash]); let c = capCache.get(key); if (c) return c;
    const a = baseSprite({ ...look, hat:'cap' }, pose, mood, flash), b = baseSprite({ ...look, hat:'none' }, pose, mood, flash);
    c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d'); g.drawImage(a, 0, 0);
    const A = a.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data, B = b.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data;
    const img = g.getImageData(0, 0, SPR_W, SPR_H), D = img.data;
    // the cap's pixels: only the top of the head, where the two sprites differ
    let y0 = 99, y1 = -1;
    const isCap = (x, y) => { const i = (y * SPR_W + x) * 4; return A[i + 3] > 0 && (A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2] || A[i + 3] !== B[i + 3]); };
    for (let y = 0; y < 16; y++) for (let x = 0; x < SPR_W; x++) if (isCap(x, y)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const side = /^side/.test(pose), back = /^up/.test(pose);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < SPR_W; x++) {
      if (!isCap(x, y)) continue;
      const i = (y * SPR_W + x) * 4, lum = (A[i] + A[i + 1] + A[i + 2]) / 3;
      let col;
      if (lum < 30) col = [26, 20, 32];                                          // the outline stays dark
      else if (!back && y >= y1 - 1 && !(side && x < 20)) col = [104, 108, 115];   // the brim
      else if (lum > 120) col = [236, 237, 240];                                 // the logo becomes a white patch
      else {
        const mesh = back || (side ? x < 17 : (x < 13 || x > 22));
        col = mesh ? ((x + y) % 2 ? [128, 132, 139] : [150, 154, 161]) : [176, 180, 186];
      }
      D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2];
    }
    g.putImageData(img, 0, 0);
    // the pen: tucked in under the cap's edge above the ear, sticking out at an angle, two pixels thick
    // with an outline so it reads on any hair
    if (y1 >= 0) {
      const [x0, y0, dx, dy, len] = side ? [17, y1 + 2, -1, -0.5, 6] : back ? [11, y1 + 2, -1, -1, 4] : [24, y1 + 2, 1, -1, 5];
      const px = new Map();
      for (let t = 0; t <= len; t++) {
        const x = x0 + Math.round(t * dx), y = y0 + Math.round(t * dy);
        const k = t === 0 ? 'tip' : t >= len - 1 ? 'cap' : 'barrel';
        px.set(x + ',' + y, PEN[k]);
        if (!px.has((x + 1) + ',' + y)) px.set((x + 1) + ',' + y, k === 'barrel' ? PEN.shade : PEN[k]);
      }
      g.fillStyle = '#1a1420';
      px.forEach((_, k) => { const [x, y] = k.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { if (!px.has((x + a) + ',' + (y + b))) g.fillRect(x + a, y + b, 1, 1); }); });
      px.forEach((col, k) => { const [x, y] = k.split(',').map(Number); g.fillStyle = col; g.fillRect(x, y, 1, 1); });
    }
    if (capCache.size > 300) capCache.clear();
    capCache.set(key, c); return c;
  };
});

// ---- the goat ----
// Side view facing right, (ox, oy) the ground under the middle of the goat. mode: 'walk' (legs move with
// frame), 'stand', 'graze' (head down at the grass, chewing on frame), 'baa' (head up, mouth open).
const GOAT = (() => {
  const C = { W:'#f3f0e9', w:'#d9d3c6', d:'#b3ab9c', O:'#2a2420', H:'#9b8a6c', h:'#c9b994', K:'#3a312b', E:'#e0ae3a', N:'#d9a49a', B:'#e6e0d3', G:'#4f9a3a', g:'#78c255', M:'#5a2a2a' };
  const cache = new Map();
  function sprite(mode, frame, collar){
    const key = mode + ':' + (frame & 7) + ':' + collar;
    let c = cache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = 44; c.height = 32;
    const g = c.getContext('2d'), OX = 20, OY = 31;
    const R = (x, y, w, h, col) => { g.fillStyle = C[col] || col; g.fillRect(OX + x, OY + y, w, h); };
    const step = mode === 'walk' ? (frame & 3) : 0;
    // legs: back pair and front pair swing opposite each other while walking
    const sw = [0, 1, 0, -1][step];
    const leg = (x, dx, far) => { const lift = mode === 'walk' && ((dx > 0) !== far) && step % 2 === 1 ? 1 : 0;
      R(x + dx, -7, 2, 6 - lift, far ? 'w' : 'W'); R(x + dx, -1 - lift, 2, 1, 'K'); if (!far) R(x + dx + 1, -7, 1, 6 - lift, 'w'); };
    leg(-9, -sw, true); leg(5, sw, true); leg(-7, sw, false); leg(7, -sw, false);
    // body: rounded barrel, shaded underneath
    R(-11, -13, 19, 6, 'W'); R(-10, -14, 17, 1, 'W'); R(-10, -7, 17, 1, 'w'); R(-12, -12, 1, 4, 'W');
    R(-11, -8, 19, 1, 'w'); R(-9, -7, 15, 1, 'd');
    R(-7, -12, 3, 1, 'w'); R(-2, -11, 3, 1, 'w');                                     // a little coat texture
    // tail: a short tuft standing up
    R(-13, -16, 2, 2, 'W'); R(-14, -17, 1, 2, 'W'); R(-13, -14, 1, 1, 'w');
    // neck and head, by pose
    const head = (hx, hy, open) => {
      R(hx, hy, 6, 5, 'W'); R(hx + 4, hy + 2, 3, 3, 'W'); R(hx + 6, hy + 3, 1, 1, 'N');   // skull, muzzle, nose
      R(hx + 1, hy + 4, 4, 1, 'w');
      R(hx + 3, hy + 1, 1, 1, 'E'); R(hx + 4, hy + 1, 1, 1, '#111');                       // eye with its sideways pupil
      R(hx - 1, hy + 1, 2, 1, 'B'); R(hx - 2, hy + 2, 1, 1, 'w');                          // ear
      R(hx + 1, hy - 1, 1, 1, 'H'); R(hx, hy - 2, 1, 1, 'h'); R(hx - 1, hy - 3, 2, 1, 'H'); // horns curling back
      R(hx + 2, hy - 1, 1, 1, 'h'); R(hx + 1, hy - 2, 1, 1, 'H');
      R(hx + 4, hy + 5, 2, 2, 'B'); R(hx + 5, hy + 7, 1, 1, 'B');                          // beard
      if (open) { R(hx + 5, hy + 4, 2, 1, 'M'); R(hx + 6, hy + 5, 1, 1, 'M'); }
    };
    if (mode === 'graze') {
      R(6, -13, 4, 5, 'W'); R(9, -9, 3, 4, 'W'); R(6, -9, 3, 1, 'w');                       // neck reaching down
      // head down at the grass, muzzle on the ground
      R(9, -8, 6, 5, 'W'); R(13, -5, 3, 4, 'W'); R(15, -2, 1, 1, 'N'); R(10, -4, 4, 1, 'w');
      R(11, -7, 1, 1, 'E'); R(12, -7, 1, 1, '#111');
      R(8, -7, 1, 2, 'B'); R(9, -9, 1, 1, 'H'); R(8, -10, 1, 1, 'h'); R(7, -11, 1, 1, 'H');
      // the tuft of grass it's pulling at, and the bit in its mouth while it chews
      R(15, -3, 1, 2, 'G'); R(17, -3, 1, 2, 'g'); R(16, -2, 1, 1, 'G'); R(18, -2, 1, 1, 'G');
      if (frame & 1) { R(15, -4, 2, 1, 'g'); R(14, -1, 1, 1, 'G'); } else R(16, -4, 1, 1, 'G');
    } else {
      const up = mode === 'baa' ? 2 : 0;
      R(5, -18 - up, 4, 6 + up, 'W'); R(5, -14, 1, 2, 'w');                                // neck
      head(8, -22 - up, mode === 'baa');
    }
    // collar with a gold tag
    if (mode === 'graze') { R(7, -12, 1, 4, collar); R(8, -10, 1, 1, '#f2c94c'); }
    else { R(5, -15, 4, 1, collar); R(7, -14, 1, 1, '#f2c94c'); }
    // dark outline around the whole goat
    const id = g.getImageData(0, 0, 44, 32), dd = id.data, A = (x, y) => x >= 0 && y >= 0 && x < 44 && y < 32 && dd[(y * 44 + x) * 4 + 3] > 0;
    const edge = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 44; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) edge.push([x, y]);
    g.fillStyle = C.O; edge.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    if (cache.size > 64) cache.clear();
    cache.set(key, c); return c;
  }
  const collar = () => (APP && APP.brand && APP.brand.accent) || '#cb272d';
  // draw at the ground point; flip: facing left
  function paint(g, ox, oy, mode, frame, flip){
    const s = sprite(mode, frame || 0, collar());
    g.save(); g.translate(Math.round(ox), Math.round(oy)); if (flip) g.scale(-1, 1);
    g.drawImage(s, -20, -31); g.restore();
  }
  // where the leash clips on, from the ground point (facing right)
  const clip = (mode) => mode === 'graze' ? { x:8, y:-10 } : { x:7, y:-14 };
  return { paint, clip };
})();
// a leash: a rope sagging a little between two points
function goatLeash(g, x0, y0, x1, y1, col){
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  g.fillStyle = col || '#7a1c20';
  for (let i = 0; i <= n; i++) { const t = i / n, sag = Math.sin(Math.PI * t) * 3; g.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t + sag), 1, 1); }
}
// the "BAAAA!" shout, in the brand accent over a white stroke (same as the skateboard's trick names)
function goatShout(g, x, y, size, alpha){
  const acc = (APP && APP.brand && APP.brand.accent) || '#cb272d';
  g.save(); g.globalAlpha = alpha; g.font = `${size}px 'Press Start 2P', monospace`; g.textAlign = 'center'; g.textBaseline = 'bottom';
  g.lineWidth = Math.max(3, size / 3); g.strokeStyle = '#ffffff'; g.lineJoin = 'round'; g.strokeText('BAAAA!', x, y);
  g.fillStyle = acc; g.fillText('BAAAA!', x, y); g.restore();
}

appSafe('goat', () => {
  const canUnlock = !!(APP && APP.features && Array.isArray(APP.features.extraRides) && APP.features.extraRides.includes('goat'));
  const NAME = 'Cade’s pet goat';
  RIDES.goat = { lift:0, name:NAME };
  if (!GEAR.ride.some(g => g.id === 'goat')) {
    const item = { id:'goat', name:NAME, xp:2000 };
    GEAR.ride.push(item);
    RARITY.goat = 4;
    if (canUnlock) { ALL_GEAR.push({ ...item, slot:'ride' }); ALL_GEAR.sort((a, b) => a.xp - b.xp); }
    else document.head.insertAdjacentHTML('beforeend', '<style>.cr-tile[data-v="goat"]{ display:none; }</style>');
  }
  // parked by a door (and anywhere else a ride is drawn on its own): the goat stands there
  const basePaint = paintRide;
  paintRide = function(g, kind, ox, oy, frame){
    if (kind !== 'goat') return basePaint(g, kind, ox, oy, frame);
    GOAT.paint(g, ox, oy, 'stand', 0, false);
  };
  const baseIcon = drawRideIcon;
  drawRideIcon = function(canvas, kind){
    if (kind !== 'goat') return baseIcon(canvas, kind);
    const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
    const TW = 34, TH = 28, t = document.createElement('canvas'); t.width = TW; t.height = TH;
    GOAT.paint(t.getContext('2d'), 15, 27, 'stand', 0, false);
    const s = Math.min(canvas.width / TW, canvas.height / TH);
    g.drawImage(t, Math.round((canvas.width - TW * s) / 2), Math.round((canvas.height - TH * s) / 2), TW * s, TH * s);
  };
  // with a goat the rep walks (no riding): the goat trots a step ahead on its leash, or stands beside them
  const gcache = new Map();
  const baseRider = riderCanvas;
  riderCanvas = function(look, pose, mood, frame, mounted){
    if (!look || look.ride !== 'goat') return baseRider(look, pose, mood, frame, mounted);
    const key = JSON.stringify([look, pose, mood, frame % 8, !!mounted]);
    let c = gcache.get(key); if (c) return c;
    c = document.createElement('canvas'); c.width = RIDER_W; c.height = RIDER_H;
    const g = c.getContext('2d');
    const walking = !!mounted;
    const p = walking ? `side-${Math.floor(frame / 2) % 4}` : pose;
    const spr = spriteCanvas({ ...look, ride:'none' }, p, mood);
    const rx = 16, gx = 62, mode = walking ? 'walk' : 'stand';
    GOAT.paint(g, gx, RIDER_OY, mode, frame, false);
    g.drawImage(spr, rx, RIDER_OY - 49);
    const cl = GOAT.clip(mode), side = /^side/.test(p);
    goatLeash(g, rx + (side ? 23 : 28), RIDER_OY - 49 + 31, gx + cl.x, RIDER_OY + cl.y);
    if (gcache.size > 300) gcache.clear();
    gcache.set(key, c); return c;
  };
});

// ---- the goat on the street: grazing and yelling at the door ----
if (typeof RIDES !== 'undefined' && RIDES.goat) appSafe('goat street', () => {
  document.head.insertAdjacentHTML('beforeend', `<style>
    .st-baa{ position:absolute; left:0; top:0; pointer-events:none; font:400 9px/1 'Press Start 2P', monospace; color:var(--goat-acc, #cb272d);
      background:#fff; border:2px solid #14161b; border-radius:6px; padding:5px 6px 4px; white-space:nowrap; opacity:0; transform-origin:0 100%; transition:opacity .15s; }
    .st-baa.on{ opacity:1; }
  </style>`);
  const acc = (APP && APP.brand && APP.brand.accent) || '#cb272d';
  let parked = null, baa = null;
  const baseRender = renderStreet;
  renderStreet = function(){ parked = null; if (baa) { baa.remove(); baa = null; } return baseRender.apply(this, arguments); };
  const basePark = parkRide;
  parkRide = function(s){ basePark(s); parked = ME.look && ME.look.ride === 'goat' ? s : null; };
  const t0 = performance.now();
  setInterval(() => {
    const r = street && street.rideEl;
    if (!parked || !r || !r.classList.contains('on') || !ME.look || ME.look.ride !== 'goat' || !document.contains(r)) { if (baa) baa.classList.remove('on'); return; }
    // every 7 seconds: graze and chew, look up, BAAAA, then graze again
    const ph = ((performance.now() - t0) % 7000) / 1000;
    const mode = reduceMotion ? 'stand' : ph < 4.2 ? 'graze' : ph < 4.9 ? 'stand' : ph < 6.3 ? 'baa' : 'stand';
    const g = r.getContext('2d'); g.clearRect(0, 0, 40, 34); g.imageSmoothingEnabled = false;
    g.save(); if (parked.flip) { g.translate(40, 0); g.scale(-1, 1); }
    GOAT.paint(g, 20, 33, mode, Math.floor(ph * 3), false); g.restore();
    if (!baa) { baa = document.createElement('div'); baa.className = 'st-baa'; baa.textContent = 'BAAAA!'; baa.style.setProperty('--goat-acc', acc); baa.setAttribute('aria-hidden', 'true'); r.parentNode.appendChild(baa); }
    const on = mode === 'baa';
    if (on) {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(r.style.transform || ''); if (!m) return;
      // over the goat's head, running out on the side away from the rep
      const S = street.S || 1, x = +m[1] + (parked.flip ? 12 : 28) * S, y = +m[2] + 6 * S;
      baa.style.transform = `translate(${Math.round(x - (parked.flip ? 0 : baa.offsetWidth))}px, ${Math.round(y - baa.offsetHeight)}px)`;
      baa.style.zIndex = (+r.style.zIndex || 0) + 2;
    }
    baa.classList.toggle('on', on);
  }, 150);
});

// ---- the goat on the podium ----
if (typeof RIDES !== 'undefined' && RIDES.goat) appSafe('goat podium', () => {
  const W = 72, H = 86, GROUND = 84;        // 18px of headroom over the usual 68 for the BAAAA
  const CYCLE = 6500;
  const isGoat = (canvas, look) => canvas && canvas.classList && canvas.classList.contains('pd-rep') && look && look.ride === 'goat';
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const og = off.getContext('2d'); og.imageSmoothingEnabled = false;
  function mountGoat(canvas, lookFn){
    if (canvas.dataset.goat) return;
    canvas.dataset.goat = '1';
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.aspectRatio = `${W * 2}/${H * 2}`;
    canvas.style.marginTop = `-${((H - 68) * 2 / (W * 2) * 100).toFixed(2)}%`;
    const rank = +canvas.dataset.rank || 1, mirror = rank === 3;
    const t0 = performance.now() - (rank === 1 ? 600 : rank === 2 ? 2900 : 4700);
    const g = canvas.getContext('2d');
    const frame = () => {
      if (!document.contains(canvas)) { clearInterval(id); return; }
      const look = lookFn();
      if (!look || look.ride !== 'goat') { clearInterval(id); delete canvas.dataset.goat; return; }
      const ph = (performance.now() - t0) % CYCLE;
      const mode = reduceMotion ? 'stand' : ph < 3400 ? 'graze' : ph < 4000 ? 'stand' : ph < 5600 ? 'baa' : 'stand';
      const bob = reduceMotion ? 0 : Math.floor(ph / 480) % 2;
      og.clearRect(0, 0, W, H);
      og.save();
      if (mirror) { og.translate(W, 0); og.scale(-1, 1); }
      // shadows, the goat to the rep's side facing in, then the rep and the leash
      og.fillStyle = 'rgba(0,0,0,0.16)'; og.fillRect(10, GROUND - 1, 30, 2); og.fillRect(43, GROUND - 1, 24, 2);
      const gx = 56;
      GOAT.paint(og, gx, GROUND, mode, Math.floor(ph / 260), true);
      const spr = spriteCanvas({ ...look, ride:'none' }, 'down-0', 'happy');
      og.drawImage(spr, 7, GROUND - 50 + bob);
      const cl = GOAT.clip(mode);
      goatLeash(og, 7 + 29, GROUND - 50 + 32 + bob, gx - cl.x, GROUND + cl.y);
      og.restore();
      g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
      g.drawImage(off, 0, 0, canvas.width, canvas.height);
      if (mode === 'baa') {
        const q = (ph - 4000) / 1600, s = Math.min(1, q / 0.15), a = q > 0.85 ? Math.max(0, 1 - (q - 0.85) / 0.15) : 1;
        const gxs = (mirror ? W - gx : gx) * 2;
        goatShout(g, Math.max(44, Math.min(canvas.width - 44, gxs)), (GROUND - 29) * 2 - Math.round(s * 6), Math.round(10 + 3 * s), a);
      }
    };
    frame();
    const id = setInterval(frame, 60);
  }
  const baseLive = liveSprite;
  liveSprite = function(canvas, lookFn, opts){
    if (isGoat(canvas, lookFn())) { mountGoat(canvas, lookFn); return { canvas, look:lookFn, opts:opts || {} }; }
    return baseLive(canvas, lookFn, opts);
  };
  const baseLeader = mountLeaderPrize;
  mountLeaderPrize = function(canvas, look){
    if (isGoat(canvas, look)) { mountGoat(canvas, () => look); return; }
    return baseLeader(canvas, look);
  };
});

// ---- the Vault: the coach's card first, and more top reps' cards ----
if (APP && APP.brand && typeof VX !== 'undefined' && ((APP.brand.coach && APP.brand.coach.vaultFirst) || (APP.brand.vaultGuests || []).length)) appSafe('vault guests', () => {
  if (VX.people === VX.reps) VX.people = VX.reps.slice();
  const guestIds = [];
  (APP.brand.vaultGuests || []).forEach((gst, i) => {
    if (!gst || !gst.name || !gst.sprite) return;
    const full = String(gst.name), first = full.split(' ')[0].toLowerCase();
    let p = VX.people.find(x => String(x.name).toLowerCase() === full.toLowerCase() || String(x.name).toLowerCase() === first);
    if (!p) VX.people.push(p = { id:'guest' + i, name:full, ini:'', color:APP.brand.accent });
    const key = 'guest' + i;
    buildAvatarFrames(gst.sprite).then(f => { avatarFrames[key] = f; }).catch(() => {});
    VX_AVK[p.id] = key; VX_TAG[p.id] = gst.tag || '';
    guestIds.push(p.id);
  });
  // the coach's own card leads
  if (APP_COACH && APP.brand.coach.vaultFirst) {
    const i = VX.people.findIndex(x => VX_AVK[x.id] === 'marshall');
    if (i > 0) VX.people.unshift(VX.people.splice(i, 1)[0]);
  }
  const baseRender = vxRenderDays;
  vxRenderDays = function(){
    baseRender();
    document.querySelectorAll('#vx-days .vx-rc canvas.vx-face[data-av^="guest"]').forEach(cv => {
      const w = cv.parentNode; w.classList.add('coach-frame');
      const m = getComputedStyle(w).boxShadow.match(/rgba?\([^)]*\)/); if (m) w.style.setProperty('--vx-frame', m[0]);
    });
    if (vxRepOpen) return;
    guestIds.forEach(id => {
      if (vxDaysOf(id).length) return;
      const card = document.querySelector(`#vx-days .vx-rc[data-rep="${id}"]`); if (!card) return;
      const sm = card.querySelector('small'); if (sm) sm.textContent = 'Days coming soon';
      const who = (VX.people.find(x => x.id === id) || {}).name || 'Their';
      card.onclick = () => { haptic('tap'); showToast(`${String(who).split(' ')[0]}’s recorded days are on the way`, 'ph-headphones'); };
    });
  };
});

// ---- a green street sign where the road meets the first walkway ----
if (APP && APP.brand && APP.brand.streetSign && typeof roadV === 'function') appSafe('street sign', () => {
  const { street:NAME, cross:CROSS } = APP.brand.streetSign;
  const K = 4;                                   // drawn 4x finer than the street, so the names read
  const W = 128, H = 92, PX = 63;                // in street units; the post stands at PX
  const BH = 12, FONT = 8.6, SUF = 4.6;          // blade height, name and suffix sizes
  document.head.insertAdjacentHTML('beforeend', '<style>.st-sign{ position:absolute; pointer-events:none; image-rendering:auto; }</style>');
  const split = (s) => { const m = /^(.*\S)\s+(st|ave|av|ln|rd|dr|ct|way|blvd|pl|cir)\.?$/i.exec(String(s).trim()); return m ? [m[1], m[2].toUpperCase()] : [String(s).trim(), '']; };
  const font = (size) => `700 ${Math.round(size * K)}px 'Barlow', 'Arial Narrow', sans-serif`;
  const paint = (cv) => {
    cv.width = W * K; cv.height = H * K;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x * K, y * K, w * K, h * K); };
    // the post: galvanized steel with its holes, two yellow reflectors, and its shadow on the grass
    const top = 8;
    P(PX - 4, H - 2, 11, 2, 'rgba(0,0,0,.22)');
    P(PX, top, 3, H - top - 1, '#9a9ea5'); P(PX, top, 1, H - top - 1, '#c9ccd1'); P(PX + 2, top, 1, H - top - 1, '#6f737a');
    for (let y = top + 2; y < H - 3; y += 3) P(PX + 1, y, 1, 1, '#55595f');
    P(PX - 1, 50, 5, 6, '#e0a41e'); P(PX - 1, 50, 5, 1, '#f6c94a'); P(PX - 1, 59, 5, 5, '#e0a41e'); P(PX - 1, 59, 5, 1, '#f6c94a');
    // a blade: green with a white border and the name in white (suffix small and raised, like the real
    // signs), skewed along the street's iso angle and running out one side of the post
    const blade = (name, dir, y) => {
      const [text, suffix] = split(name);
      const m = document.createElement('canvas').getContext('2d');
      m.font = font(FONT); const tw = m.measureText(text).width;
      m.font = font(SUF); const sw = suffix ? m.measureText(suffix).width + K : 0;
      const bw = Math.ceil(tw + sw + 7 * K), bh = BH * K, b = document.createElement('canvas'); b.width = bw; b.height = bh;
      const q = b.getContext('2d');
      q.fillStyle = '#0f5b34'; q.fillRect(0, 0, bw, bh);
      q.fillStyle = '#f4f6f2';
      q.fillRect(K * 0.8, K * 0.8, bw - K * 1.6, K * 0.7); q.fillRect(K * 0.8, bh - K * 1.5, bw - K * 1.6, K * 0.7);
      q.fillRect(K * 0.8, K * 0.8, K * 0.7, bh - K * 1.6); q.fillRect(bw - K * 1.5, K * 0.8, K * 0.7, bh - K * 1.6);
      q.fillStyle = '#ffffff'; q.textBaseline = 'alphabetic';
      const x0 = Math.round((bw - tw - sw) / 2), base = bh / 2 + FONT * K * 0.36;
      q.font = font(FONT); q.fillText(text, x0, base);
      if (suffix) { q.font = font(SUF); q.fillText(suffix, x0 + tw + K, base - FONT * K * 0.34); }
      g.save();
      g.translate((PX + 1.5) * K, y * K);
      g.transform(1, dir * 0.5, 0, 1, 0, 0);
      const x = dir > 0 ? -K * 2 : -bw + K * 2;
      g.fillStyle = '#073a20'; g.fillRect(x, K * 1.2, bw, bh);       // the blade's thickness, under it
      g.drawImage(b, x, 0);
      g.restore();
    };
    // the cross street on top, running back across the road; the street itself below, running along it
    blade(CROSS, -1, top + 2);
    blade(NAME, 1, top + 2 + BH + 4);
    P(PX - 1, top - 2, 5, 3, '#9a9ea5'); P(PX - 1, top - 2, 5, 1, '#c9ccd1');   // the cap bracket on top
  };
  const plant = () => {
    const wrap = $('path-wrap'); if (!wrap || !street || !street.verts || !street.verts[-1]) return;
    wrap.querySelectorAll('.st-sign').forEach(e => e.remove());
    const S = parseFloat(wrap.style.getPropertyValue('--S')) || street.S || 1, px = (v) => Math.round(v * S) + 'px';
    // on the near curb, just to the right of where the first walkway meets the road
    const q = { u:street.verts[-1].u + 16, v:roadV() + ROAD_HALF + 9 };
    const p = isoPt(q.u, q.v);
    const c = document.createElement('canvas'); c.className = 'st-sign'; c.setAttribute('aria-label', `Street sign: ${NAME} and ${CROSS}`);
    paint(c);
    c.style.left = px(p.x - PX - 1.5); c.style.top = px(p.y - H + 1);
    c.style.width = px(W); c.style.height = px(H);
    c.style.zIndex = objZ(q.u, q.v);
    wrap.appendChild(c);
  };
  const baseRender = renderStreet;
  renderStreet = function(){ baseRender.apply(this, arguments); try { plant(); } catch (e) {} };
  // the names are drawn in Barlow: paint again once the font is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { try { plant(); } catch (e) {} });
});
