// ============ GOLDEN DOOR ============
// Reps who've won a Golden Door (rep_awards, set by SLAB admins on the website's user page) get a gold door
// badge after their name (with x2, x3... in its corner), a shiny gold row with a gold name on the leaderboard,
// and a golden doorway behind their rep on their flex card.
const GD_DOOR = '<svg viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">'
  + '<rect x="2" y="0" width="8" height="12" fill="#c79a32"/><rect x="3" y="1" width="6" height="11" fill="#f3cf72"/>'
  + '<rect x="4" y="2" width="4" height="3" fill="#c79a32"/><rect x="4" y="6" width="4" height="4" fill="#c79a32"/>'
  + '<rect x="4" y="2" width="1" height="1" fill="#fff2c0"/><rect x="7" y="6" width="1" height="1" fill="#16161a"/></svg>';

function goldenDoorsOf(rep){
  if (!rep) return 0;
  if (rep.you && typeof APP !== 'undefined' && APP && APP.me) return APP.me.goldenDoors || rep.goldenDoors || 0;
  return rep.goldenDoors || 0;
}
function gdBadgeEl(n){
  const s = document.createElement('span');
  s.className = 'gd-badge';
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', n > 1 ? `Golden Door winner, ${n} times` : 'Golden Door winner');
  s.innerHTML = GD_DOOR + (n > 1 ? `<b>×${n}</b>` : '');
  return s;
}
// gold name + badge right after the name (before the crown or company)
function gdDecorateName(nm, n){
  if (!nm || nm.querySelector('.gd-badge')) return;
  const t = nm.firstChild;
  if (t && t.nodeType === 3) {
    const span = document.createElement('span');
    span.className = 'gd-name';
    span.textContent = t.textContent.replace(/\s+$/, '');
    t.replaceWith(span);
    span.after(gdBadgeEl(n));
  } else nm.prepend(gdBadgeEl(n));
}

const gdBaseRenderLb = renderLeaderboard;
renderLeaderboard = function(changed){
  gdBaseRenderLb(changed);
  document.querySelectorAll('#leaderboard [data-name]').forEach(el => {
    const n = goldenDoorsOf(leaders.find(l => l.name === el.dataset.name));
    if (!n) return;
    el.classList.add('gd');
    gdDecorateName(el.querySelector('.pd-name, .lb-name'), n);
  });
};

const gdBaseOpenFlex = openFlexCard;
openFlexCard = function(rep){
  gdBaseOpenFlex(rep);
  const n = goldenDoorsOf(rep), wrap = $('fx-wrap');
  if (!n || !wrap) return;
  wrap.classList.add('gd');
  const deco = () => {
    const stage = wrap.querySelector('.fx-stage');
    if (stage && !stage.querySelector('.gd-doorway')) stage.insertAdjacentHTML('afterbegin',
      `<span class="gd-doorway" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
       <span class="gd-tag">${GD_DOOR}Golden Door${n > 1 ? ` ×${n}` : ''}</span>`);
    gdDecorateName(wrap.querySelector('.fx-name'), n);
  };
  deco();
  // the card re-renders (props, featured flex): put the doorway back each time
  new MutationObserver(deco).observe(wrap, { childList:true, subtree:false });
};

(function(){
  const css = `
  .gd-badge{ position:relative; display:inline-flex; width:18px; height:18px; flex:none; vertical-align:middle; }
  .gd-badge svg{ width:18px; height:18px; filter:drop-shadow(0 0 3px rgba(243,207,114,.55)); }
  .gd-badge b{ position:absolute; right:-7px; bottom:-4px; font:800 9px/11px 'Barlow',sans-serif; color:#f3cf72;
    background:#16161a; border:1px solid #c79a32; border-radius:4px; padding:0 2px; letter-spacing:0; }
  .gd-name{ background:linear-gradient(100deg,#c79a32 0%,#f3cf72 30%,#fff6d6 45%,#f3cf72 60%,#c79a32 100%);
    background-size:220% 100%; -webkit-background-clip:text; background-clip:text; color:transparent;
    -webkit-text-fill-color:transparent; font-weight:800; animation:gdText 3.2s linear infinite; }
  @keyframes gdText{ from{ background-position:120% 0; } to{ background-position:-120% 0; } }
  .lb-row.gd{ overflow:hidden; background:linear-gradient(90deg,rgba(243,207,114,.16),rgba(199,154,50,.06) 60%,rgba(243,207,114,.12)); }
  .lb-row.gd .lb-avatar{ box-shadow:0 0 0 2px #f3cf72, 0 0 10px rgba(243,207,114,.6); }
  .lb-row.gd .lb-score{ color:#f3cf72; }
  .lb-row.gd::after, .pd-spot.gd .pd-block::after{ content:""; position:absolute; top:0; bottom:0; left:-40%; width:30%; pointer-events:none;
    background:linear-gradient(100deg,transparent,rgba(255,240,190,.28),transparent); transform:skewX(-18deg); animation:gdShine 3.6s ease-in-out infinite; }
  @keyframes gdShine{ 0%,55%{ left:-40%; } 100%{ left:130%; } }
  .lb-row.gd .lb-name{ gap:8px; }
  .pd-spot.gd .pd-block{ position:relative; overflow:hidden; box-shadow:inset 0 2px 0 #f3cf72, 0 0 16px rgba(243,207,114,.35); }
  .pd-spot.gd .pd-name{ gap:6px; }
  .fx-wrap.gd .fx-stage{ background:radial-gradient(55% 90% at 50% 100%, rgba(243,207,114,.42), transparent 72%); }
  .gd-doorway{ position:absolute; left:50%; bottom:2px; width:128px; height:146px; transform:translateX(-50%); z-index:0;
    border:5px solid #f3cf72; border-bottom:0; outline:2px solid #c79a32; outline-offset:-9px;
    box-shadow:0 0 18px rgba(243,207,114,.7), inset 0 0 26px rgba(243,207,114,.45);
    background:radial-gradient(70% 60% at 50% 70%, rgba(255,236,170,.35), rgba(243,207,114,.06) 75%); animation:gdGlow 2.6s ease-in-out infinite; }
  @keyframes gdGlow{ 0%,100%{ box-shadow:0 0 14px rgba(243,207,114,.55), inset 0 0 22px rgba(243,207,114,.35); } 50%{ box-shadow:0 0 26px rgba(243,207,114,.9), inset 0 0 32px rgba(243,207,114,.55); } }
  .gd-doorway i{ position:absolute; width:7px; height:7px; background:
      linear-gradient(#fff6d6,#fff6d6) center/7px 1px no-repeat, linear-gradient(#fff6d6,#fff6d6) center/1px 7px no-repeat;
    animation:gdTwinkle 1.8s ease-in-out infinite; }
  .gd-doorway i:nth-child(1){ left:-24px; top:14px; } .gd-doorway i:nth-child(2){ right:-26px; top:40px; animation-delay:.4s; }
  .gd-doorway i:nth-child(3){ left:-30px; top:78px; animation-delay:.9s; } .gd-doorway i:nth-child(4){ right:-22px; top:100px; animation-delay:1.3s; }
  .gd-doorway i:nth-child(5){ left:-14px; top:-10px; animation-delay:.6s; } .gd-doorway i:nth-child(6){ right:-12px; top:-4px; animation-delay:1.1s; }
  @keyframes gdTwinkle{ 0%,100%{ opacity:.15; transform:scale(.6); } 50%{ opacity:1; transform:scale(1.2); } }
  .gd-tag{ position:absolute; top:8px; right:20px; z-index:2; display:flex; align-items:center; gap:4px; font:700 11px/1 'Barlow',sans-serif;
    color:#16161a; background:linear-gradient(#fff2c0,#f3cf72); border-radius:999px; padding:3px 8px 3px 5px; box-shadow:0 0 10px rgba(243,207,114,.5); }
  .gd-tag svg{ width:13px; height:13px; }
  .fx-name .gd-badge{ margin:0 8px 0 6px; }
  @media (prefers-reduced-motion: reduce){ .gd-name, .lb-row.gd::after, .pd-spot.gd .pd-block::after, .gd-doorway, .gd-doorway i{ animation:none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

// ---- Golden Door armor: Duncan's gold suit (open-face helmet, chest plate, gold legs and boots) ----
// It's a top in the locker that only Golden Door winners own. It's drawn over the rep's own body so it fits every
// pose: each part of the sprite (skin, hair, shirt, pants, shoes) is found by rendering it twice with that part
// changed, then repainted in Duncan's gold, with a light sweeping across it so it glimmers.
const GD_ARMOR = 'goldarmor';
const GA = { Y:'#ffeb3b', O:'#ff9800', W:'#ffffff', K:'#101014', S:'#fff6c4' };
GEAR.top.push({ id:GD_ARMOR, name:'Golden Door armor', xp:0, limited:'goldendoor' });
LIMITED[GD_ARMOR] = { season:'goldendoor', slot:'top' };
const isArmor = (look) => !!look && look.top === GD_ARMOR;
const armorMaskCache = new Map(), armorCache = new Map();
function armorMasks(look, pose, mood){
  const plain = { ...look, top:'crew', hat:'none', extra:'none' };
  const key = JSON.stringify([plain, pose, mood]); let m = armorMaskCache.get(key); if (m) return m;
  const px = (lk) => baseArmorSprite(lk, pose, mood).getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data;
  const A = px(plain);
  const diff = (B) => { const out = new Uint8Array(SPR_W * SPR_H); for (let i = 0; i < out.length; i++) { const j = i * 4; out[i] = A[j] !== B[j] || A[j + 1] !== B[j + 1] || A[j + 2] !== B[j + 2] ? 1 : 0; } return out; };
  m = {
    base: A,
    skin: diff(px({ ...plain, skin:(plain.skin || 0) === 4 ? 0 : 4 })),
    hair: diff(px({ ...plain, hairColor:(plain.hairColor || 0) === 3 ? 0 : 3 })),
    top: diff(px({ ...plain, top:'oxford' })),
    pants: diff(px({ ...plain, pants:plain.pants === 'khaki' ? 'jeans' : 'khaki' })),
    shoes: diff(px({ ...plain, shoes:plain.shoes === 'gold' ? 'boots' : 'gold' })),
  };
  if (armorMaskCache.size > 200) armorMaskCache.clear();
  armorMaskCache.set(key, m); return m;
}
function armorCanvas(look, pose, mood, flash, phase){
  const key = JSON.stringify([look, pose, mood, !!flash, phase]); let c = armorCache.get(key); if (c) return c;
  const m = armorMasks(look, pose, mood), A = m.base, N = SPR_W * SPR_H;
  const ol = [parseInt(OUTLINE.slice(1, 3), 16), parseInt(OUTLINE.slice(3, 5), 16), parseInt(OUTLINE.slice(5, 7), 16)];
  const solid = (i) => A[i * 4 + 3] > 0 && !(A[i * 4] === ol[0] && A[i * 4 + 1] === ol[1] && A[i * 4 + 2] === ol[2]);
  // the neck: the first row of shirt
  let neck = SPR_H; for (let i = 0; i < N; i++) if (m.top[i]) { neck = Math.floor(i / SPR_W); break; }
  // rows of each part: the left edge is lit, the right edge in shadow
  const span = (y, test) => { let a = -1, b = -1; for (let x = 0; x < SPR_W; x++) { const i = y * SPR_W + x; if (solid(i) && test(i)) { if (a < 0) a = x; b = x; } } return [a, b]; };
  const isLeg = (i) => m.pants[i] || m.shoes[i];
  let faceTop = SPR_H; for (let i = 0; i < neck * SPR_W; i++) if (m.skin[i]) { faceTop = Math.floor(i / SPR_W); break; }
  let torsoBottom = neck; for (let i = 0; i < N; i++) if (m.top[i]) torsoBottom = Math.floor(i / SPR_W);
  let legTop = SPR_H, legBottom = 0; for (let i = 0; i < N; i++) if (isLeg(i) && solid(i)) { const y = Math.floor(i / SPR_W); if (y < legTop) legTop = y; legBottom = y; }
  const bootTop = legTop + Math.round((legBottom - legTop) * 0.5);
  c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d');
  const img = g.createImageData(SPR_W, SPR_H), D = img.data;
  const put = (i, hex) => { D[i * 4] = parseInt(hex.slice(1, 3), 16); D[i * 4 + 1] = parseInt(hex.slice(3, 5), 16); D[i * 4 + 2] = parseInt(hex.slice(5, 7), 16); D[i * 4 + 3] = 255; };
  for (let y = 0; y < SPR_H; y++) {
    const head = y < neck, [ha, hb] = head ? span(y, () => true) : [0, 0];
    const [ta, tb] = span(y, (i) => !head && !isLeg(i)), [la, lb] = span(y, isLeg);
    for (let x = 0; x < SPR_W; x++) {
      const i = y * SPR_W + x;
      if (!A[i * 4 + 3]) continue;
      if (!solid(i)) { put(i, flash ? GA.W : GA.K); continue; }
      let col;
      if (head) {
        // gold helmet; the face behind a black visor with a gold rim on each side
        // an open-face helmet: gold over the hair and forehead, the rep's own face (and beard) showing below it
        const face = !String(pose).startsWith('up') && y >= faceTop + 3 && x > ha && x < hb - 1 && !(String(pose).startsWith('side') && x < (ha + hb) / 2) && (!m.hair[i] || y >= faceTop + 4);
        if (face && !flash) { D[i * 4] = A[i * 4]; D[i * 4 + 1] = A[i * 4 + 1]; D[i * 4 + 2] = A[i * 4 + 2]; D[i * 4 + 3] = 255; continue; }
        col = x >= hb - 1 ? GA.O : GA.Y;
        if (!face && y <= faceTop - 2 && x - ha >= 2 && x - ha <= 4 && y >= faceTop - 4) col = GA.W;
      } else if (isLeg(i)) {
        // two gold legs: each leg's outer half lit, inner half shadowed, boots darker at the toe
        const mid = (la + lb) / 2, left = x < mid, out = left ? x - la : lb - x;
        col = out <= 1 ? GA.Y : GA.O;
        // a black belt where the legs start, and black cuffs where the boots start
        if (y === legTop || y === bootTop) col = GA.K;
        else if (y >= bootTop && y >= legBottom - 1) col = out <= 2 ? GA.Y : GA.O;
        if ((y === legTop + 1 || y === legTop + 2) && out === 1 && left) col = GA.W;
        if (y === bootTop + 2 && out === 0) col = GA.W;
      } else {
        // chest plate: lit on the left, shadow down the right and along the bottom
        const t = tb > ta ? (x - ta) / (tb - ta) : 0;
        col = t > 0.74 || y >= torsoBottom - 1 ? GA.O : GA.Y;
        if (y >= neck + 2 && y <= neck + 3 && x - ta >= 3 && x - ta <= 4 && !(y === neck + 3 && x - ta === 4)) col = GA.W;
      }
      if (flash) col = GA.W;
      // the glimmer: a bright band sweeps across the armor
      if (!flash && col !== GA.K && phase >= 0) { const d = (x + y) - (phase * 7 - 14); if (d >= 0 && d < 3) col = d === 1 ? GA.W : GA.S; }
      put(i, col);
    }
  }
  g.putImageData(img, 0, 0);
  if (armorCache.size > 400) armorCache.clear();
  armorCache.set(key, c); return c;
}
// a sweep every ~2.5 seconds: 14 steps across, then a rest
const armorPhase = () => (typeof reduceMotion !== 'undefined' && reduceMotion) ? -1 : Math.floor(Date.now() / 110) % 24;
const baseArmorSprite = spriteCanvas;
spriteCanvas = function(look, pose, mood, flash){
  if (!isArmor(look)) return baseArmorSprite(look, pose, mood, flash);
  const p = armorPhase();
  return armorCanvas(look, pose, mood, flash, p < 14 ? p : -1);
};
// rep previews redraw a couple of times a second; armor redraws faster so the sweep runs smoothly
setInterval(() => {
  if (typeof liveSprites === 'undefined') return;
  liveSprites.forEach(entry => {
    if (!document.contains(entry.canvas)) return;
    const look = entry.look(); if (!isArmor(look)) return;
    const o = Object.assign({}, entry.opts, { bob: reduceMotion || entry.opts.turn ? 0 : liveTick % 2 });
    if (o.turn) return;
    drawSprite(entry.canvas, look, o);
  });
}, 110);
// winners own the armor (and put it on once by default); it goes away if the award is taken back
(function(){
  if (typeof APP === 'undefined' || !APP || !APP.me || !ME.look) return;
  const n = APP.me.goldenDoors || 0, owned = new Set(ME.look.limited || []);
  let changed = false;
  if (n > 0 && !owned.has(GD_ARMOR)) { owned.add(GD_ARMOR); changed = true; }
  if (n === 0 && owned.has(GD_ARMOR) && !APP.me.superAdmin) { owned.delete(GD_ARMOR); changed = true; }
  if (n === 0 && ME.look.top === GD_ARMOR && !APP.me.superAdmin) { ME.look.top = DEFAULT_LOOK.top; changed = true; }
  let first = false; try { first = n > 0 && !localStorage.getItem('slab.gdArmor.v1'); if (first) localStorage.setItem('slab.gdArmor.v1', '1'); } catch (e) {}
  if (first) { ME.look.top = GD_ARMOR; changed = true; }
  if (changed) { ME.look.limited = [...owned]; if (typeof saveMe === 'function') saveMe(); }
})();
