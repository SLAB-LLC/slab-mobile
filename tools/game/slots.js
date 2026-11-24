// ============ SLAB SLOTS ============
// A slot machine reps spin for XP, boosts, slot-only outfits, Zach Kornfeld pitch videos and real SLAB
// merch (Duncan, 2026-11-24; mockup https://claude.ai/artifact/HJi7UQEB5mX2M5ovjca6i2). Spins are earned
// only: Free Spin Saturday, streak and boss milestones, or trading XP. The server rolls every spin and pays
// it (slabtech sql/slot-machine-migration.sql: slot_state, slot_spin, slot_trade, slot_claim); this page only
// animates the result. A mini slot machine button sits bottom left, mirroring My Team.
// In the browser demo (no APP) it runs on local, made-up spins with the same odds.

const SLOT_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Denver'; } catch (e) { return 'America/Denver'; } })();
const SLOT_REDUCE = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
const slEsc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

// ---- prizes ----
const SLOT_TIERS = {
  miss:   { tier:'MISS',      color:'#ff6b5c', sym:'coin' },
  xp:     { tier:'COMMON',    color:'#b8b3a7', sym:'coin',   label:'XP drop' },
  boost:  { tier:'UNCOMMON',  color:'#4fd1a5', sym:'beaker', label:'Boost' },
  outfit: { tier:'RARE',      color:'#FF6C00', sym:'hoodie', label:'Slot-only outfit' },
  video:  { tier:'EPIC',      color:'#a77bff', sym:'tape',   label:'Zach Kornfeld full pitch' },
  merch:  { tier:'LEGENDARY', color:'#daae5d', sym:'door',   label:'Real SLAB merch' },
};
const SLOT_ODDS_DEFAULT = { miss:31, xp:33, boost:20, outfit:10, video:5, merch:1 };
// what each slot-only outfit puts on the rep (ids live in look.limited once won)
const SLOT_OUTFITS = {
  hawaiian:{ name:'Jackpot Hawaiian Shirt', wear:{ top:'sl_hawaiian' } },
  suit:    { name:'Black Suit + Black Tie', wear:{ top:'sl_suit' } },
  labcoat: { name:'Lab Coat + Goggles',     wear:{ top:'sl_labcoat', extra:'sl_goggles' } },
  hazmat:  { name:'Hazmat Suit',            wear:{ top:'sl_hazmat', hat:'sl_hood' } },
  trout:   { name:'Trout Bucket Hat',       wear:{ hat:'sl_trout' } },
  neon:    { name:'Neon Beaker Chain',      wear:{ extra:'sl_neon' } },
  visor:   { name:'777 Visor',              wear:{ hat:'sl_visor' } },
};
const SLOT_BOOST_NOTES = {
  xp2x:'Running now: +1x on top of your streak and power hour for 30 minutes.',
  shield:'Miss a day and your streak survives. It works on its own.',
  charm:'Your next spin can’t miss.',
  bonus:'Spin again right now.',
};

// ---- slot-only gear in the locker ----
const SLOT_GEAR = [
  ['top', 'sl_hawaiian', 'Jackpot Hawaiian shirt'], ['top', 'sl_suit', 'Black suit and tie'], ['top', 'sl_labcoat', 'Lab coat'],
  ['top', 'sl_hazmat', 'Hazmat suit'], ['hat', 'sl_hood', 'Hazmat hood'], ['hat', 'sl_trout', 'Trout bucket hat'],
  ['hat', 'sl_visor', '777 visor'], ['extra', 'sl_goggles', 'Lab goggles'], ['extra', 'sl_neon', 'Neon beaker chain'],
];
SLOT_GEAR.forEach(([slot, id, name]) => { if (GEAR[slot]) { GEAR[slot].push({ id, name, xp:0, limited:'slots' }); LIMITED[id] = { season:'slots', slot }; } });
const slotBaseHint = limitedHint;
limitedHint = function(id){ return LIMITED[id] && LIMITED[id].season === 'slots' ? 'Slot only: win it at SLAB Slots' : slotBaseHint(id); };
const SLOT_IDS = new Set(SLOT_GEAR.map(g => g[1]));

// ---- drawing the slot-only gear over the normal sprite ----
const SLOT_DRAW = (() => {
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const span = (g, y, x0, x1, c) => { g.fillStyle = c; g.fillRect(x0, y, x1 - x0 + 1, 1); };
  const O = '#140c0c';
  // shirts recolor the shirt pixels; (x, y, skin) picks the color, the sprite's own shading is kept
  const TOPS = {
    sl_hawaiian(x, y, skin){
      const open = y <= 31 && (x === 17 || x === 18 || (y <= 27 && (x === 16 || x === 19)) || (y <= 24 && (x === 15 || x === 20)));
      if (open) return y === 26 && (x === 17 || x === 18) ? '#e8b84a' : skin;
      if ((y === 28 && (x === 16 || x === 19)) || (y === 25 && (x === 15 || x === 20))) return '#e8b84a';
      const k = (x * 7 + y * 3) % 9;
      return k === 0 ? '#ffe08a' : k === 4 ? '#2fb59a' : k === 5 ? '#ffffff' : '#ff7a45';
    },
    sl_suit(x, y){
      if ((x === 17 || x === 18) && y >= 23 && y <= 31) return y === 23 ? '#2a2a30' : '#0b0b0e';
      if (y <= 23 && x >= 16 && x <= 19) return '#f4f1ea';
      if (y === 24 && (x === 16 || x === 19)) return '#f4f1ea';
      if ((x === 15 || x === 20) && y >= 23 && y <= 28) return '#34343c';
      return '#18181c';
    },
    sl_labcoat(x, y){
      if (y <= 24 && x >= 16 && x <= 19) return '#3a3f47';
      if (x === 17 || x === 18) return '#d2cdc2';
      if (x === 22 && (y === 26 || y === 27)) return '#4fd1a5';
      if (y === 28 && x >= 21 && x <= 24) return '#d2cdc2';
      return '#f4f0e6';
    },
    sl_hazmat(x, y){
      if (y === 30) return '#1b1b20';
      if (y >= 25 && y <= 27 && x >= 16 && x <= 19 && (x + y) % 2 === 0) return '#1b1b20';
      return '#f2c230';
    },
  };
  const HATS = {
    sl_trout(g){
      span(g, 0, 11, 24, O);
      for (let y = 1; y <= 5; y++) { span(g, y, 10, 25, O); span(g, y, 11, 24, y === 5 ? '#2c5038' : '#3e6b4c'); }
      span(g, 6, 4, 31, O); span(g, 7, 4, 31, '#355e43'); span(g, 8, 5, 30, O);
      span(g, 3, 15, 19, '#FF6C00'); span(g, 4, 16, 18, '#FF6C00'); px(g, 20, 3, '#FF6C00'); px(g, 21, 2, '#FF6C00'); px(g, 21, 4, '#FF6C00'); px(g, 16, 3, '#f4f1ea');
    },
    sl_visor(g){
      span(g, 5, 8, 27, O); span(g, 6, 8, 27, '#1f8a4f'); span(g, 7, 8, 27, '#1f8a4f');
      [13, 17, 21].forEach(x => { px(g, x, 6, '#ff3b3b'); px(g, x + 1, 6, '#ff3b3b'); px(g, x + 1, 7, '#ff3b3b'); });
      g.fillStyle = 'rgba(57,255,158,0.45)'; g.fillRect(6, 8, 24, 3); span(g, 8, 6, 29, '#1f8a4f');
    },
    sl_hood(g){
      span(g, 0, 10, 25, O);
      for (let y = 1; y <= 22; y++) {
        if (y <= 10) { span(g, y, 8, 27, O); span(g, y, 9, 26, '#f2c230'); }
        else { span(g, y, 7, 10, '#f2c230'); span(g, y, 25, 28, '#f2c230'); px(g, 6, y, O); px(g, 29, y, O); }
      }
      span(g, 10, 11, 24, '#d3a51f');
      g.fillStyle = 'rgba(140,210,230,0.22)'; g.fillRect(11, 11, 14, 10);
      span(g, 18, 14, 21, '#1b1b20'); span(g, 19, 14, 21, '#1b1b20'); span(g, 20, 15, 20, '#1b1b20');
      px(g, 12, 19, '#6b6b72'); px(g, 13, 19, '#6b6b72'); px(g, 22, 19, '#6b6b72'); px(g, 23, 19, '#6b6b72');
    },
  };
  const EXTRAS = {
    sl_goggles(g){
      span(g, 12, 8, 27, '#1b1b20');
      [11, 19].forEach(x0 => {
        for (let y = 11; y <= 16; y++) span(g, y, x0, x0 + 5, O);
        for (let y = 12; y <= 15; y++) span(g, y, x0 + 1, x0 + 4, '#4fd1a5');
        px(g, x0 + 1, 12, '#c8fff0'); px(g, x0 + 2, 12, '#9cf3d4');
      });
    },
    sl_neon(g){
      [[13, 22], [14, 23], [15, 24], [16, 25], [22, 22], [21, 23], [20, 24], [19, 25]].forEach(([x, y]) => px(g, x, y, '#39ff9e'));
      px(g, 17, 26, '#f2efe6'); px(g, 18, 26, '#f2efe6');
      span(g, 27, 16, 19, '#39ff9e'); span(g, 28, 16, 19, '#39ff9e'); px(g, 17, 27, '#c8ffe4');
    },
  };
  return { TOPS, HATS, EXTRAS };
})();
const slotWearCache = new Map();
const slotBaseSprite = spriteCanvas;
const slotWorn = (look) => look && (SLOT_IDS.has(look.top) || SLOT_IDS.has(look.hat) || SLOT_IDS.has(look.extra));
spriteCanvas = function(look, pose, mood, flash){
  if (!slotWorn(look)) return slotBaseSprite(look, pose, mood, flash);
  const key = JSON.stringify([look, pose, mood, !!flash]); let c = slotWearCache.get(key); if (c) return c;
  const plain = { ...look };
  const top = SLOT_DRAW.TOPS[look.top] ? look.top : null, hat = SLOT_DRAW.HATS[look.hat] ? look.hat : null, extra = SLOT_DRAW.EXTRAS[look.extra] ? look.extra : null;
  if (SLOT_IDS.has(plain.hat)) plain.hat = 'none';
  if (SLOT_IDS.has(plain.extra)) plain.extra = 'none';
  if (SLOT_IDS.has(plain.top)) plain.top = 'crew';
  c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d');
  const a = slotBaseSprite(plain, pose, mood, flash);
  g.drawImage(a, 0, 0);
  if (top) {
    // the shirt is wherever a crewneck and an oxford differ; recolor those pixels and keep their shading
    const b = slotBaseSprite({ ...plain, top:'oxford' }, pose, mood, flash);
    const A = a.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data, B = b.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data;
    const diff = (i) => A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2];
    let ref = 0, n = 0; for (let i = 0; i < A.length; i += 4) if (diff(i)) { ref += A[i] + A[i + 1] + A[i + 2]; n++; }
    ref /= Math.max(1, n);
    const si = (17 * SPR_W + 24) * 4, skin = '#' + [A[si], A[si + 1], A[si + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    const img = g.getImageData(0, 0, SPR_W, SPR_H), D = img.data;
    for (let y = 0; y < SPR_H; y++) for (let x = 0; x < SPR_W; x++) { const i = (y * SPR_W + x) * 4; if (!diff(i)) continue;
      const col = SLOT_DRAW.TOPS[top](x, y, skin), shade = col === skin ? 1 : Math.max(0.55, Math.min(1.25, (A[i] + A[i + 1] + A[i + 2]) / ref));
      D[i] = Math.min(255, parseInt(col.slice(1, 3), 16) * shade); D[i + 1] = Math.min(255, parseInt(col.slice(3, 5), 16) * shade); D[i + 2] = Math.min(255, parseInt(col.slice(5, 7), 16) * shade); }
    g.putImageData(img, 0, 0);
  }
  if (extra) SLOT_DRAW.EXTRAS[extra](g);
  if (hat) SLOT_DRAW.HATS[hat](g);
  if (slotWearCache.size > 300) slotWearCache.clear(); slotWearCache.set(key, c);
  return c;
};

// ---- pixel symbols for the reels ----
const SLOT_ART = {
  coin:['....KKKK....','..KKGGGGKK..','.KGGGGGGGGK.','.KGGGKKGGGK.','KGGGKWWKGGGK','KGGKWWWWKGGK','KGGKWWWWKGGK','KGGGKWWKGGGK','.KGGGKKGGGK.','.KgGGGGGGgK.','..KKggggKK..','....KKKK....'],
  beaker:['...KKKKKK...','....KWWK....','....KWWK....','....KWWK....','...KWWWWK...','..KWWWWWWK..','..KBBBBBBK..','.KBBWBBBBBK.','.KBBBBBBWBK.','KBBBBBBBBBBK','KBBBBBBBBBBK','.KKKKKKKKKK.'],
  hoodie:['...KKKKKK...','..KOOOOOOK..','.KOOKKKKOOK.','KOOOKWWKOOOK','KOOOOWWOOOOK','KOKOOOOOOKOK','KOKOOOOOOKOK','KOKOKKKKOKOK','KOKOKOOKOKOK','KKKOOOOOOKKK','..KOOOOOOK..','..KKKKKKKK..'],
  tape:['KKKKKKKKKKKK','KWKWKWKWKWKK','KKKKKKKKKKKK','KPPPPPPPPPPK','KPPPWPPPPPPK','KPPPWWPPPPPK','KPPPWWWPPPPK','KPPPWWPPPPPK','KPPPWPPPPPPK','KPPPPPPPPPPK','KKKKKKKKKKKK','............'],
  cap:['............','............','....KKKK....','..KKOOOOKK..','.KOOOWWOOOK.','.KOOWOOWOOK.','KOOOOWWOOOOK','KOOOOOOOOOOK','KKKKKKKKKKKK','KOOOOOOOOKKK','.KKKKKKKKK..','............'],
  stickers:['............','KKKKKKK.....','KWWWWWK.....','KWBBBWKKKKK.','KWBBBWKYYYK.','KWWWWWKYOYK.','KKKKKKKYYYK.','...KPPKKKKK.','..KPPPPK....','..KPWPPK....','...KPPK.....','....KK......'],
  door:['..KKKKKKKK..','.KYYYYYYYYK.','.KYGGGGGGYK.','.KYGggggGYK.','.KYGgGGgGYK.','.KYGgGGgGYK.','.KYGgGGgWYK.','.KYGgGGgGYK.','.KYGgGGgGYK.','.KYGggggGYK.','.KYGGGGGGYK.','KKKKKKKKKKKK'],
};
const SLOT_PAL = { K:'#0b0b0d', G:'#daae5d', g:'#9c7a35', W:'#f2efe6', B:'#4fd1a5', O:'#FF6C00', P:'#a77bff', Y:'#ffe08a' };
const SLOT_SYMS = ['coin', 'beaker', 'hoodie', 'tape', 'door'];
function slotIcon(key){
  const c = document.createElement('canvas'); c.width = 12; c.height = 12; const x = c.getContext('2d');
  SLOT_ART[key].forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = SLOT_PAL[ch]; x.fillRect(i, y, 1, 1); } }));
  return c;
}

// ---- styles ----
(function(){
  const st = document.createElement('style');
  st.textContent = `
  .sl-fab{ position:absolute; left:14px; bottom:calc(var(--nav-gap, var(--nav-h, 64px)) + 16px); z-index:60; width:60px; height:56px; display:grid; place-items:center; padding:0; background:var(--ace-gold, #daae5d); border:2px solid #0b0b0d; border-radius:4px; box-shadow:4px 4px 0 #EDEAE2; cursor:pointer; transition:transform 0.2s, opacity 0.2s; }
  .sl-fab[hidden]{ display:none; }
  .sl-fab:active{ transform:translate(3px,3px); box-shadow:1px 1px 0 #EDEAE2; }
  .sl-fab canvas{ width:52px; height:48px; image-rendering:pixelated; }
  .sl-fab.dim{ filter:saturate(0.55) brightness(0.8); }
  .sl-fab.hot{ animation:slHot 1.2s ease-in-out infinite; }
  @keyframes slHot{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-4px); box-shadow:4px 8px 0 #EDEAE2, 0 0 22px rgba(255,224,138,0.85); } }
  .sl-badge{ position:absolute; top:-10px; right:-10px; min-width:22px; height:22px; padding:0 4px; border-radius:11px; background:#ff3b3b; color:#fff; border:2px solid #0b0b0d; font:9px/18px 'Press Start 2P', monospace; text-align:center; }
  .sl-badge[hidden]{ display:none; }
  .sl-2x{ position:absolute; bottom:-8px; left:-8px; font:7px/1 'Press Start 2P', monospace; background:#4fd1a5; color:#0b0b0d; border:2px solid #0b0b0d; border-radius:3px; padding:3px 3px 2px; }
  .sl-2x[hidden]{ display:none; }
  .phone.lesson-open .sl-fab, .phone.me-open .sl-fab, .phone.mt-open .sl-fab, .phone.ow-open .sl-fab, .phone.mt-hide .sl-fab, .phone.sl-open .sl-fab{ opacity:0; pointer-events:none; transform:translateY(12px); }
  .phone.in-vault .sl-fab, .phone.bb-on .sl-fab{ display:none !important; }
  .sl{ position:absolute; inset:0; z-index:86; display:flex; flex-direction:column; background:#08080a; color:#EDEAE2; transform:translateY(100%); visibility:hidden; transition:transform 0.42s cubic-bezier(.2,.8,.2,1), visibility 0s linear 0.42s; }
  .phone.sl-open .sl{ transform:none; visibility:visible; transition:transform 0.42s cubic-bezier(.2,.8,.2,1), visibility 0s; }
  .sl-top{ display:flex; align-items:center; gap:10px; padding:calc(env(safe-area-inset-top, 0px) + 16px) 16px 12px; border-bottom:2px solid #EDEAE2; }
  .sl-top .t{ flex:1; font:13px/1 'Press Start 2P', monospace; color:#daae5d; }
  .sl-x{ width:38px; height:38px; display:grid; place-items:center; font-size:18px; color:#0b0b0d; background:#EDEAE2; border:0; border-radius:3px; cursor:pointer; flex:none; }
  .sl-chips{ display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
  .sl-chip{ font:9px/1 'Press Start 2P', monospace; padding:6px 7px; border-radius:999px; background:#1a1a1f; border:1px solid #2a2a30; color:#EDEAE2; white-space:nowrap; }
  .sl-chip.gold{ background:#daae5d; color:#0b0b0d; border-color:transparent; }
  .sl-chip.green{ background:#4fd1a5; color:#0b0b0d; border-color:transparent; }
  .sl-scroll{ flex:1; overflow-y:auto; position:relative; padding:14px 16px calc(env(safe-area-inset-bottom, 0px) + 28px); }
  .sl-machine{ display:flex; flex-direction:column; gap:12px; padding:14px 0 6px; background:radial-gradient(120% 60% at 50% 0%, rgba(218,174,93,0.14), transparent 70%); }
  .sl-marq{ text-align:center; }
  .sl-marq b{ display:block; font:16px/1.4 'Press Start 2P', monospace; color:#daae5d; text-shadow:0 0 12px rgba(218,174,93,0.5); }
  .sl-marq span{ font:700 11px/1 'Barlow', sans-serif; letter-spacing:0.16em; text-transform:uppercase; color:#9b968a; }
  .sl-bulbs{ display:flex; justify-content:space-between; padding:0 6px; }
  .sl-bulbs i{ width:6px; height:6px; border-radius:50%; background:#3a3122; }
  .sl-bulbs.on i:nth-child(odd){ background:#ffe08a; box-shadow:0 0 6px #ffe08a; }
  .sl-bulbs.on.alt i:nth-child(odd){ background:#3a3122; box-shadow:none; }
  .sl-bulbs.on.alt i:nth-child(even){ background:#ffe08a; box-shadow:0 0 6px #ffe08a; }
  .sl-cab{ display:flex; gap:10px; align-items:stretch; }
  .sl-cabinet{ flex:1; background:linear-gradient(#1c1812,#110f0b); border:3px solid #daae5d; border-radius:14px; padding:12px; box-shadow:inset 0 0 0 3px #0b0b0d, 0 0 24px rgba(218,174,93,0.18); }
  .sl-reels{ display:grid; grid-template-columns:repeat(3,1fr); gap:8px; position:relative; }
  .sl-reel{ height:92px; overflow:hidden; background:#f2efe6; border-radius:6px; position:relative; box-shadow:inset 0 10px 14px rgba(0,0,0,0.35), inset 0 -10px 14px rgba(0,0,0,0.35); }
  .sl-strip{ position:absolute; left:0; right:0; top:0; will-change:transform; }
  .sl-cell{ height:92px; display:flex; align-items:center; justify-content:center; }
  .sl-cell canvas{ width:60px; height:60px; image-rendering:pixelated; }
  .sl-pay{ position:absolute; left:-6px; right:-6px; top:50%; height:2px; background:rgba(255,107,92,0.7); pointer-events:none; }
  .sl-reel.thunk{ animation:slThunk .28s cubic-bezier(.3,1.6,.5,1); }
  @keyframes slThunk{ 30%{ transform:translateY(5px); } 100%{ transform:none; } }
  .sl-reel.lit{ box-shadow:inset 0 10px 14px rgba(0,0,0,0.35), 0 0 0 3px #ffe08a, 0 0 18px #ffe08a; }
  .sl-reel.tease{ animation:slTease .35s ease-in-out infinite alternate; }
  @keyframes slTease{ to{ box-shadow:0 0 0 3px #ff6b5c, 0 0 22px #ff6b5c; } }
  .sl-lever{ width:20px; position:relative; flex:none; }
  .sl-lever i{ position:absolute; left:8px; top:14px; bottom:30px; width:4px; background:#c9c5bb; border:1px solid #0b0b0d; border-radius:2px; transform-origin:50% 100%; transition:transform .18s; }
  .sl-lever b{ position:absolute; left:2px; top:2px; width:16px; height:16px; border-radius:50%; background:#ff3b3b; border:2px solid #0b0b0d; transition:transform .18s; }
  .sl-lever.pull i{ transform:scaleY(0.35); } .sl-lever.pull b{ transform:translateY(54px); }
  .sl-tension{ font:9px 'Press Start 2P', monospace; color:#ff6b5c; text-align:center; height:10px; opacity:0; }
  .sl-tension.on{ opacity:1; animation:slBlink .3s steps(2) infinite; }
  @keyframes slBlink{ 50%{ opacity:.3; } }
  .sl-result{ min-height:62px; text-align:center; display:flex; flex-direction:column; justify-content:center; gap:4px; }
  .sl-result .tier{ font:9px/1 'Press Start 2P', monospace; letter-spacing:.06em; }
  .sl-result .prize{ font:700 19px/1.2 'Barlow', sans-serif; }
  .sl-result .note{ font-size:12.5px; color:#9b968a; }
  .sl-result.miss .prize{ color:#ff6b5c; animation:slNope .4s; }
  @keyframes slNope{ 20%,60%{ transform:translateX(-5px); } 40%,80%{ transform:translateX(5px); } }
  .sl-btn{ appearance:none; border:2px solid #0b0b0d; border-radius:12px; font:12px/1 'Press Start 2P', monospace; padding:16px 12px; cursor:pointer; width:100%; }
  .sl-btn.spin{ background:#daae5d; color:#0b0b0d; box-shadow:0 5px 0 #8a6a2c; }
  .sl-btn.spin:not(:disabled){ animation:slBreathe 1.6s ease-in-out infinite; }
  @keyframes slBreathe{ 50%{ box-shadow:0 5px 0 #8a6a2c, 0 0 22px rgba(255,224,138,.55); } }
  .sl-btn.spin:active{ transform:translateY(3px); box-shadow:0 2px 0 #8a6a2c; }
  .sl-btn.ghost{ background:#1a1a1f; color:#EDEAE2; border:1px solid #2c2c33; font-size:9.5px; padding:12px; }
  .sl-btn:disabled{ opacity:.45; cursor:not-allowed; animation:none; }
  .sl-sec{ margin-top:20px; }
  .sl-sec h3{ margin:0 0 8px; font:700 12px/1 'Barlow', sans-serif; letter-spacing:.14em; text-transform:uppercase; color:#9b968a; }
  .sl-list{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
  .sl-list li{ display:flex; justify-content:space-between; gap:10px; align-items:center; font:500 13.5px/1.3 'Barlow', sans-serif; padding:9px 11px; border-radius:8px; background:#0f0f12; border:1px solid #222228; }
  .sl-list li em{ font-style:normal; color:#9b968a; font-size:12.5px; text-align:right; }
  .sl-list li canvas{ width:22px; height:22px; image-rendering:pixelated; flex:none; }
  .sl-list li .grow{ flex:1; min-width:0; }
  .sl-tag{ font:7.5px/1 'Press Start 2P', monospace; padding:4px 5px; border-radius:3px; color:#0b0b0d; white-space:nowrap; }
  .sl-li-btn{ font:700 12px 'Barlow', sans-serif; padding:6px 9px; border-radius:6px; border:0; background:#daae5d; color:#0b0b0d; cursor:pointer; }
  .sl-fx{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:9; }
  .sl-rev{ position:absolute; inset:0; z-index:8; display:flex; align-items:center; justify-content:center; background:rgba(5,5,7,.88); opacity:0; pointer-events:none; transition:opacity .25s; overflow:hidden; }
  .sl-rev.on{ opacity:1; pointer-events:auto; }
  .sl-rays{ position:absolute; left:50%; top:44%; width:640px; height:640px; margin:-320px 0 0 -320px; border-radius:50%; background:repeating-conic-gradient(from 0deg, var(--rc) 0 9deg, transparent 9deg 22.5deg); opacity:.22; animation:slSpin 9s linear infinite; -webkit-mask:radial-gradient(circle, #000 20%, transparent 62%); mask:radial-gradient(circle, #000 20%, transparent 62%); }
  @keyframes slSpin{ to{ transform:rotate(360deg); } }
  .sl-card{ position:relative; width:84%; max-height:88%; overflow-y:auto; background:#121014; border:3px solid var(--rc); border-radius:18px; padding:20px 16px 16px; text-align:center; display:flex; flex-direction:column; gap:10px; align-items:center; box-shadow:0 0 40px rgba(0,0,0,.5); transform:scale(.3) rotateY(180deg); opacity:0; }
  .sl-rev.on .sl-card{ animation:slCard .7s cubic-bezier(.2,1.5,.4,1) forwards; }
  @keyframes slCard{ 60%{ opacity:1; } to{ transform:none; opacity:1; } }
  .sl-card .won{ font:9px 'Press Start 2P', monospace; color:var(--rc); }
  .sl-card .ptier{ font:10px 'Press Start 2P', monospace; color:#0b0b0d; background:var(--rc); padding:6px 9px; border-radius:6px; }
  .sl-card .pic{ width:110px; height:110px; display:flex; align-items:center; justify-content:center; }
  .sl-card .pic canvas{ width:92px; height:92px; image-rendering:pixelated; animation:slBob 1.4s ease-in-out infinite; }
  .sl-card .pic canvas.rep{ width:80px; height:116px; }
  @keyframes slBob{ 50%{ transform:translateY(-6px) scale(1.04); } }
  .sl-card .pname{ font:700 24px/1.1 'Barlow', sans-serif; }
  .sl-card .pnote{ font-size:13px; color:#a8a396; max-width:30ch; line-height:1.35; }
  .sl-card .sl-btn{ background:var(--rc); color:#0b0b0d; box-shadow:0 5px 0 rgba(0,0,0,.45); }
  .sl-card .later{ background:none; border:0; color:#9b968a; font:600 13px 'Barlow', sans-serif; cursor:pointer; padding:6px; }
  .sl-form{ width:100%; display:flex; flex-direction:column; gap:8px; text-align:left; }
  .sl-form label{ font:700 11px 'Barlow', sans-serif; letter-spacing:.1em; text-transform:uppercase; color:#9b968a; display:flex; flex-direction:column; gap:4px; }
  .sl-form input, .sl-form textarea, .sl-form select{ font:500 15px 'Barlow', sans-serif; color:#EDEAE2; background:#0b0b0e; border:1px solid #2c2c33; border-radius:8px; padding:9px 10px; width:100%; box-sizing:border-box; }
  .sl-form textarea{ min-height:64px; resize:vertical; }
  .sl-sizes{ display:flex; gap:6px; flex-wrap:wrap; }
  .sl-sizes button{ font:700 13px 'Barlow', sans-serif; min-width:44px; padding:8px; border-radius:8px; border:1px solid #2c2c33; background:#0b0b0e; color:#EDEAE2; cursor:pointer; }
  .sl-sizes button.on{ background:var(--rc); color:#0b0b0d; border-color:transparent; }
  .phone.sl-shake{ animation:slShake .5s; }
  @keyframes slShake{ 10%,50%,90%{ transform:translate(-4px,1px) rotate(-.4deg); } 30%,70%{ transform:translate(4px,-1px) rotate(.4deg); } }
  @media (prefers-reduced-motion: reduce){ .sl-fab.hot, .sl-rays, .sl-card .pic canvas, .sl-btn.spin:not(:disabled), .sl-tension.on{ animation:none; } .sl-rev.on .sl-card{ animation:none; transform:none; opacity:1; } }
  `;
  document.head.appendChild(st);
})();

// ---- the mini slot machine button (bottom left, mirroring My Team) ----
const SLOT_MINI = [['#daae5d','#ffe08a'], ['#4fd1a5','#f2efe6'], ['#FF6C00','#ffb07a'], ['#a77bff','#e0d0ff'], ['#ffe08a','#daae5d']];
function slotMiniMachine(cv){
  const x = cv.getContext('2d'); let off = [0, 0, 0], sym = [0, 1, 4], rolling = false, lever = 0;
  const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  function draw(){
    x.clearRect(0, 0, 26, 24);
    R('#0b0b0d', 2, 3, 19, 20); R('#7a2f2f', 3, 4, 17, 18); R('#a84444', 3, 4, 17, 2); R('#5a2222', 3, 20, 17, 2);
    R('#0b0b0d', 8, 0, 7, 4); R('#a84444', 9, 1, 5, 3); R('#ffe08a', 11, 1, 1, 2);
    for (let i = 0; i < 3; i++) {
      const rx = 5 + i * 5; R('#0b0b0d', rx - 1, 8, 6, 8); R('#f2efe6', rx, 9, 4, 6);
      const y = Math.round(off[i]), a = SLOT_MINI[sym[i]], b = SLOT_MINI[(sym[i] + 1) % 5];
      x.save(); x.beginPath(); x.rect(rx, 9, 4, 6); x.clip(); R(a[0], rx, 10 + y, 4, 4); R(a[1], rx + 1, 11 + y, 1, 1); R(b[0], rx, 4 + y, 4, 4); x.restore();
    }
    R('#0b0b0d', 4, 17, 15, 2); R('#3a3a42', 5, 17, 13, 1);
    const ly = lever ? 13 : 5; R('#0b0b0d', 21, 6, 2, 12); R('#c9c5bb', 21, 7, 1, 10); R('#0b0b0d', 20, ly - 1, 4, 4); R('#ff3b3b', 21, ly, 2, 2);
  }
  function roll(){
    if (rolling || SLOT_REDUCE) return; rolling = true; lever = 1; draw();
    const t0 = performance.now(), stopAt = [500, 750, 1000].map(t => t0 + t);
    (function f(now){
      if (now - t0 > 150) lever = 0; let busy = false;
      for (let i = 0; i < 3; i++) { if (now < stopAt[i]) { busy = true; off[i] += 2; if (off[i] >= 6) { off[i] = 0; sym[i] = (sym[i] + 4) % 5; } } else off[i] = 0; }
      draw(); if (busy) requestAnimationFrame(f); else rolling = false;
    })(t0);
  }
  draw(); return roll;
}

const SLOT = { state:null, busy:false, ready:false, rollTimer:0, demo:!APP };
(function mount(){
  const phone = $('phone'); if (!phone) return;
  const fab = document.createElement('button');
  fab.className = 'sl-fab'; fab.id = 'sl-fab'; fab.type = 'button'; fab.hidden = true; fab.setAttribute('aria-label', 'SLAB Slots');
  fab.innerHTML = '<canvas width="26" height="24" aria-hidden="true"></canvas><span class="sl-badge" hidden></span><span class="sl-2x" hidden>2X</span>';
  phone.appendChild(fab);
  SLOT.miniRoll = slotMiniMachine(fab.querySelector('canvas'));
  fab.addEventListener('click', () => { SLOT.miniRoll(); slotOpen(); });

  const sheet = document.createElement('div');
  sheet.className = 'sl'; sheet.id = 'sl'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'SLAB Slots'); sheet.inert = true;
  sheet.innerHTML = `
    <div class="sl-top"><span class="t">SLAB SLOTS</span><span class="sl-chips" id="sl-chips"></span><button class="sl-x" id="sl-x" type="button" aria-label="Close"><i class="ph ph-x"></i></button></div>
    <div class="sl-scroll" id="sl-scroll">
      <canvas class="sl-fx" id="sl-fx"></canvas>
      <div class="sl-machine">
        <div class="sl-marq"><b>SLAB SLOTS</b><span>Earned, never bought</span></div>
        <div class="sl-bulbs" id="sl-bulbs">${'<i></i>'.repeat(14)}</div>
        <div class="sl-cab">
          <div class="sl-cabinet"><div class="sl-reels" id="sl-reels">
            <div class="sl-reel"><div class="sl-strip"></div></div><div class="sl-reel"><div class="sl-strip"></div></div><div class="sl-reel"><div class="sl-strip"></div></div>
            <div class="sl-pay"></div></div></div>
          <div class="sl-lever" id="sl-lever" aria-hidden="true"><i></i><b></b></div>
        </div>
        <div class="sl-tension" id="sl-tension">ONE MORE...</div>
        <div class="sl-result" id="sl-result" aria-live="polite"><div class="tier" style="color:#9b968a">READY</div><div class="prize">Pull for a prize</div><div class="note">&nbsp;</div></div>
        <button class="sl-btn spin" id="sl-spin" type="button">SPIN</button>
        <button class="sl-btn ghost" id="sl-trade" type="button">TRADE 250 XP FOR A SPIN</button>
      </div>
      <div class="sl-sec" id="sl-orders-sec" hidden><h3>Your prizes on the way</h3><ul class="sl-list" id="sl-orders"></ul></div>
      <div class="sl-sec"><h3>How to earn spins</h3><ul class="sl-list">
        <li><span>Free Spin Saturday</span><em>1 every Saturday</em></li>
        <li><span>Streak milestones</span><em>5, 15 and 30 days</em></li>
        <li><span>Beat a boss</span><em>first win on each boss</em></li>
        <li><span>Trade XP</span><em id="sl-trade-note">250 XP, 2 a week</em></li>
      </ul></div>
      <div class="sl-sec"><h3>What you can win</h3><ul class="sl-list" id="sl-odds"></ul></div>
      <div class="sl-sec" id="sl-feed-sec" hidden><h3>Big wins on your team</h3><ul class="sl-list" id="sl-feed"></ul></div>
      <div class="sl-rev" id="sl-rev"><div class="sl-rays"></div><div class="sl-card" id="sl-card"></div></div>
    </div>`;
  phone.appendChild(sheet);
  $('sl-x').addEventListener('click', slotClose);
  $('sl-spin').addEventListener('click', slotSpin);
  $('sl-trade').addEventListener('click', slotTrade);
  document.querySelectorAll('#sl-reels .sl-strip').forEach((s, i) => slotFill(s, [SLOT_SYMS[(i + 1) % 5]]));
})();

function slotFill(strip, list){
  strip.innerHTML = '';
  list.forEach(k => { const d = document.createElement('div'); d.className = 'sl-cell'; d.appendChild(slotIcon(k)); strip.appendChild(d); });
}
let slotBulbTimer = 0;
function slotBulbs(on){
  const b = $('sl-bulbs'); clearInterval(slotBulbTimer); b.classList.toggle('on', on);
  if (on && !SLOT_REDUCE) slotBulbTimer = setInterval(() => b.classList.toggle('alt'), 180);
}

// ---- haptics: ticks while it spins, a thunk per reel, a rumble that grows with the prize ----
if (typeof HAPTIC === 'object') { HAPTIC.tick = 5; HAPTIC.thunk = [26]; }
const SLOT_RUMBLE = {
  miss:['wrong'],
  xp:['hit', 120, 'success'],
  boost:['hit', 100, 'hit', 120, 'success'],
  outfit:['big', 110, 'hit', 110, 'big', 160, 'success'],
  video:['big', 90, 'big', 90, 'big', 140, 'hit', 120, 'success'],
  merch:['big', 80, 'big', 80, 'big', 80, 'big', 200, 'big', 140, 'hit', 140, 'success'],
};
function slotRumble(outcome){
  let t = 0;
  (SLOT_RUMBLE[outcome] || ['hit']).forEach(s => { if (typeof s === 'number') t += s; else setTimeout(() => haptic(s), t); });
}

// ---- state ----
async function slotCall(op, extra){
  if (APP) return appCall('slots', Object.assign({ op, tz:SLOT_TZ }, extra || {}));
  return slotDemo(op, extra || {});
}
// the browser demo: local spins, same odds, nothing saved
const SLOT_DEMO = { spins:2, total:null, trades:0, owned:[], boostEndsAt:null, charm:false, shield:false, orders:[] };
function slotDemo(op, extra){
  if (SLOT_DEMO.total == null) SLOT_DEMO.total = currentXP;
  const pick = (w) => { let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) { r -= v; if (r < 0) return k; } return Object.keys(w)[0]; };
  const state = () => ({ enabled:true, spins:SLOT_DEMO.spins, total:SLOT_DEMO.total, tradeCost:250, tradesLeft:2 - SLOT_DEMO.trades, tradesPerWeek:2, odds:SLOT_ODDS_DEFAULT,
    boostEndsAt:SLOT_DEMO.boostEndsAt, charm:SLOT_DEMO.charm, shield:SLOT_DEMO.shield, owned:SLOT_DEMO.owned, saturday:new Date().getDay() === 6, granted:[],
    feed:[{ name:'Rylan', outcome:'outfit', prize:'Jackpot Hawaiian Shirt' }, { name:'Ronin', outcome:'video', prize:'Zach Kornfeld full pitch' }], orders:SLOT_DEMO.orders });
  if (op === 'state') return Promise.resolve(state());
  if (op === 'trade') {
    if (SLOT_DEMO.trades >= 2) return Promise.reject(new Error('You’ve used your 2 XP trades this week'));
    if (SLOT_DEMO.total < 250) return Promise.reject(new Error('You need 250 XP to trade for a spin'));
    SLOT_DEMO.trades++; SLOT_DEMO.spins++; SLOT_DEMO.total -= 250; return Promise.resolve(state());
  }
  if (op === 'claim') { const o = SLOT_DEMO.orders.find(x => x.id === extra.spinId); if (o) o.claimed = true; return Promise.resolve({ ok:true }); }
  if (op === 'spin') {
    if (SLOT_DEMO.spins < 1) return Promise.reject(new Error('No spins left'));
    SLOT_DEMO.spins--;
    const odds = { ...SLOT_ODDS_DEFAULT }; if (SLOT_DEMO.charm) { delete odds.miss; SLOT_DEMO.charm = false; }
    const outcome = extra.force || pick(odds), id = 'demo-' + Date.now();
    let key = null, name = null, xp = 0, dupe = false;
    if (outcome === 'xp') { xp = +pick({ 50:40, 100:40, 150:20 }); key = String(xp); name = '+' + xp + ' XP'; }
    if (outcome === 'boost') { key = pick({ xp2x:40, shield:25, charm:20, bonus:15 }); name = { xp2x:'Double XP, 30 minutes', shield:'Streak shield', charm:'Lucky charm', bonus:'Bonus spin' }[key];
      if (key === 'xp2x') SLOT_DEMO.boostEndsAt = new Date(Math.max(Date.now(), +new Date(SLOT_DEMO.boostEndsAt || 0)) + 30 * 60000).toISOString();
      if (key === 'charm') SLOT_DEMO.charm = true; if (key === 'shield') SLOT_DEMO.shield = true; if (key === 'bonus') SLOT_DEMO.spins++; }
    if (outcome === 'outfit') { key = pick(Object.fromEntries(Object.keys(SLOT_OUTFITS).map(k => [k, 1]))); name = SLOT_OUTFITS[key].name; dupe = SLOT_DEMO.owned.includes(key); if (dupe) xp = 100; else SLOT_DEMO.owned.push(key); }
    if (outcome === 'video') { key = 'zach'; name = 'Zach Kornfeld full pitch'; SLOT_DEMO.orders.unshift({ id, outcome, prize:name, status:'requested', claimed:false }); }
    if (outcome === 'merch') { key = pick({ snapback:45, stickers:40, sloodie:15 }); name = { snapback:'SLAB Snapback', stickers:'Specimen Sticker Pack + Hat', sloodie:'The Sloodie' }[key]; SLOT_DEMO.orders.unshift({ id, outcome, prize:name, status:'requested', claimed:false }); }
    SLOT_DEMO.total += xp;
    return Promise.resolve({ spinId:id, outcome, prizeKey:key, prizeName:name, xp, dupe, needsClaim:outcome === 'merch', requested:outcome === 'video' || outcome === 'merch',
      spins:SLOT_DEMO.spins, total:SLOT_DEMO.total, boostEndsAt:SLOT_DEMO.boostEndsAt, charm:SLOT_DEMO.charm, shield:SLOT_DEMO.shield });
  }
  return Promise.reject(new Error('unknown'));
}

function slotSetXP(total){
  if (typeof total !== 'number') return;
  currentXP = total;
  try { updateXPBadge(); applyLockStates(); renderLeaderboard(false); } catch (e) {}
}
// outfits the server says you've won go into your locker (look.limited), once
function slotSyncOwned(keys){
  if (!ME.look || !Array.isArray(keys)) return;
  const have = new Set(ME.look.limited || []); let added = false;
  keys.forEach(k => { const o = SLOT_OUTFITS[k]; if (!o) return; Object.values(o.wear).forEach(id => { if (!have.has(id)) { have.add(id); added = true; } }); });
  if (added) { ME.look.limited = [...have]; saveMe(); }
}
async function slotRefresh(quiet){
  let s; try { s = await slotCall('state'); } catch (e) { if (!quiet) showToast(e.message || 'SLAB Slots didn’t load', 'ph-warning'); return; }
  if (!s) return;
  SLOT.state = s; SLOT.ready = true;
  slotSyncOwned(s.owned);
  if (typeof s.total === 'number' && APP) slotSetXP(s.total);
  slotRender();
  (s.granted || []).forEach((g, i) => setTimeout(() => { showToast('+1 spin: ' + g.label, 'ph-star'); haptic('success'); }, 900 + i * 2600));
}
function slotRender(){
  const s = SLOT.state, fab = $('sl-fab'); if (!s || !fab) return;
  fab.hidden = !s.enabled;
  const badge = fab.querySelector('.sl-badge'); badge.hidden = !(s.spins > 0); badge.textContent = s.spins > 9 ? '9+' : s.spins;
  fab.classList.toggle('dim', !(s.spins > 0));
  fab.classList.toggle('hot', !!(s.saturday && s.spins > 0));
  const boosting = s.boostEndsAt && new Date(s.boostEndsAt) > new Date();
  fab.querySelector('.sl-2x').hidden = !boosting;
  fab.setAttribute('aria-label', `SLAB Slots, ${s.spins || 0} spin${s.spins === 1 ? '' : 's'}`);
  // the sheet
  const mins = boosting ? Math.max(1, Math.round((new Date(s.boostEndsAt) - Date.now()) / 60000)) : 0;
  $('sl-chips').innerHTML = `<span class="sl-chip gold">SPINS ${s.spins || 0}</span>` + (boosting ? `<span class="sl-chip green">2X ${mins}M</span>` : '')
    + (s.charm ? '<span class="sl-chip">CHARM</span>' : '') + (s.shield ? '<span class="sl-chip">SHIELD</span>' : '');
  const spin = $('sl-spin'); spin.disabled = SLOT.busy || !(s.spins > 0); spin.textContent = s.spins > 0 ? 'SPIN' : 'NO SPINS LEFT';
  const tr = $('sl-trade'); tr.textContent = `TRADE ${s.tradeCost} XP FOR A SPIN`; tr.disabled = SLOT.busy || !(s.tradesLeft > 0) || currentXP < s.tradeCost;
  $('sl-trade-note').textContent = `${s.tradeCost} XP, ${s.tradesLeft} of ${s.tradesPerWeek} left this week`;
  const odds = Object.assign({}, SLOT_ODDS_DEFAULT, s.odds || {});
  $('sl-odds').innerHTML = '';
  ['xp', 'boost', 'outfit', 'video', 'merch'].forEach(k => {
    const t = SLOT_TIERS[k], li = document.createElement('li'); li.appendChild(slotIcon(t.sym));
    li.insertAdjacentHTML('beforeend', `<span class="grow">${t.label}</span><span class="sl-tag" style="background:${t.color}">${t.tier}</span><em>${odds[k]}%</em>`);
    $('sl-odds').appendChild(li);
  });
  $('sl-odds').insertAdjacentHTML('beforeend', `<li><span class="grow">Nothing</span><span class="sl-tag" style="background:#ff6b5c">MISS</span><em>${odds.miss}%</em></li>`);
  const feed = s.feed || []; $('sl-feed-sec').hidden = !feed.length;
  $('sl-feed').innerHTML = feed.map(f => `<li><span class="grow"><b style="color:#daae5d">${slEsc(f.name)}</b> won ${slEsc(f.prize)}</span><span class="sl-tag" style="background:${(SLOT_TIERS[f.outcome] || SLOT_TIERS.xp).color}">${(SLOT_TIERS[f.outcome] || SLOT_TIERS.xp).tier}</span></li>`).join('');
  const orders = (s.orders || []).filter(o => o.status === 'requested'); $('sl-orders-sec').hidden = !orders.length;
  $('sl-orders').innerHTML = orders.map(o => `<li><span class="grow">${slEsc(o.prize)}</span>${o.outcome === 'merch' && !o.claimed ? `<button class="sl-li-btn" data-claim="${slEsc(o.id)}" data-prize="${slEsc(o.prize)}" type="button">Add shipping</button>` : `<em>${o.outcome === 'video' ? 'Coming to your Vault' : 'Shipping soon'}</em>`}</li>`).join('');
  $('sl-orders').querySelectorAll('[data-claim]').forEach(b => b.onclick = () => slotReveal({ outcome:'merch', prizeName:b.dataset.prize, spinId:b.dataset.claim, needsClaim:true }, true));
}
function slotOpen(){
  $('phone').classList.add('sl-open'); $('sl').inert = false; $('sl-scroll').scrollTop = 0;
  slotRender(); slotRefresh(true);
}
function slotClose(){
  if (SLOT.busy) return;
  $('phone').classList.remove('sl-open'); $('sl').inert = true; $('sl-rev').classList.remove('on'); slotBulbs(false);
}

// ---- spin ----
function slotMissKeys(){
  const a = SLOT_SYMS[Math.floor(Math.random() * 5)]; let b; do { b = SLOT_SYMS[Math.floor(Math.random() * 5)]; } while (b === a);
  const r = Math.random(); return r < 0.6 ? [a, a, b] : r < 0.8 ? [a, b, a] : [b, a, a];
}
async function slotSpin(force){
  if (SLOT.busy || !SLOT.state || !(SLOT.state.spins > 0)) return;
  SLOT.busy = true; slotRender();
  haptic('hit'); $('sl-lever').classList.add('pull'); setTimeout(() => $('sl-lever').classList.remove('pull'), 260);
  let res;
  try { res = await slotCall('spin', typeof force === 'string' ? { force } : null); }
  catch (e) { SLOT.busy = false; slotRender(); showToast(e.message || 'Spin didn’t go through', 'ph-warning'); haptic('wrong'); return; }
  SLOT.state.spins = res.spins; SLOT.state.boostEndsAt = res.boostEndsAt; SLOT.state.charm = res.charm; SLOT.state.shield = res.shield;
  slotRender(); $('sl-spin').disabled = true; $('sl-trade').disabled = true;
  slotBulbs(true);
  const t = SLOT_TIERS[res.outcome] || SLOT_TIERS.miss;
  const land = res.outcome === 'miss' ? slotMissKeys() : [t.sym, t.sym, t.sym];
  const tease = land[0] === land[1];
  const reels = [...document.querySelectorAll('#sl-reels .sl-reel')], strips = [...document.querySelectorAll('#sl-reels .sl-strip')];
  reels.forEach(r => r.classList.remove('lit', 'tease', 'thunk'));
  $('sl-result').className = 'sl-result';
  $('sl-result').innerHTML = '<div class="tier" style="color:#9b968a">SPINNING</div><div class="prize">...</div><div class="note">&nbsp;</div>';
  const CELL = reels[0].offsetHeight || 92, durs = [1.1, 1.55, tease ? 3.2 : 2.0];
  strips.forEach((s, i) => {
    const n = Math.round(durs[i] * 16), list = []; for (let j = 0; j < n; j++) list.push(SLOT_SYMS[Math.floor(Math.random() * 5)]); list.push(land[i]);
    slotFill(s, list); s.style.transition = 'none'; s.style.transform = 'translateY(0)'; void s.offsetHeight;
    s.style.transition = SLOT_REDUCE ? 'none' : `transform ${durs[i]}s cubic-bezier(.15,.9,.25,1.04)`;
    s.style.transform = `translateY(${-n * CELL}px)`;
  });
  const T = SLOT_REDUCE ? [0, 0, 0] : durs.map(d => d * 1000);
  if (!SLOT_REDUCE) { let tt = 0, gap = 70; const end = T[2] - 140; (function tk(){ if (tt > end) return; haptic('tick'); tt += gap; gap *= 1.04; setTimeout(tk, gap); })(); }
  T.forEach((ms, i) => setTimeout(() => {
    const r = reels[i]; r.classList.remove('tease', 'thunk'); void r.offsetWidth; r.classList.add('thunk'); haptic('thunk');
    if (i === 1 && tease && !SLOT_REDUCE) { reels[2].classList.add('tease'); $('sl-tension').classList.add('on'); }
  }, ms));
  setTimeout(() => {
    $('sl-tension').classList.remove('on');
    SLOT.busy = false;
    if (typeof res.total === 'number') slotSetXP(res.total);
    if (res.outcome === 'miss') {
      slotBulbs(false); slotRumble('miss'); $('sl-result').className = 'sl-result miss';
      $('sl-result').innerHTML = `<div class="tier" style="color:${t.color}">MISS</div><div class="prize">${['So close', 'Not this time', 'Almost had it'][Math.floor(Math.random() * 3)]}</div><div class="note">Earn another spin out there.</div>`;
      slotRender(); return;
    }
    reels.forEach(r => r.classList.add('lit'));
    $('sl-result').innerHTML = `<div class="tier" style="color:${t.color}">${t.tier}</div><div class="prize">${slEsc(res.prizeName)}</div><div class="note">&nbsp;</div>`;
    slotRender();
    setTimeout(() => slotReveal(res), SLOT_REDUCE ? 0 : 450);
  }, SLOT_REDUCE ? 50 : T[2] + 180);
}

// ---- the prize reveal ----
function slotReveal(res, claimOnly){
  const t = SLOT_TIERS[res.outcome] || SLOT_TIERS.xp, rev = $('sl-rev'), card = $('sl-card');
  rev.style.setProperty('--rc', t.color);
  let note = '', btn = 'NICE', after = null;
  if (res.outcome === 'xp') { note = 'Added to your XP.'; btn = 'COLLECT'; }
  if (res.outcome === 'boost') { note = SLOT_BOOST_NOTES[res.prizeKey] || ''; btn = res.prizeKey === 'bonus' ? 'SPIN AGAIN' : 'LET’S GO'; if (res.prizeKey === 'bonus') after = () => setTimeout(slotSpin, 350); }
  if (res.outcome === 'outfit') {
    const o = SLOT_OUTFITS[res.prizeKey];
    if (res.dupe) { note = 'You already have this one, so it paid 100 XP.'; btn = 'COLLECT 100 XP'; }
    else { note = 'Slot only. It’s in your locker now.'; btn = 'WEAR IT'; after = () => { if (o) { slotSyncOwned([res.prizeKey]); Object.assign(ME.look, o.wear); saveMe(); try { applyMe(); refreshStreetRide(); } catch (e) {} showToast('Wearing: ' + o.name, 'ph-t-shirt'); } }; }
  }
  if (res.outcome === 'video') { note = 'SLAB got your request. The full pitch lands in your Vault soon.'; }
  card.innerHTML = `<span class="won">${claimOnly ? 'YOUR PRIZE' : 'YOU WON'}</span><span class="ptier">${t.tier}</span><div class="pic" id="sl-pic"></div><div class="pname">${slEsc(res.prizeName)}</div><div class="pnote">${slEsc(note)}</div><div id="sl-card-act" style="width:100%"></div>`;
  const pic = $('sl-pic');
  if (res.outcome === 'outfit' && !res.dupe && SLOT_OUTFITS[res.prizeKey]) {
    const c = document.createElement('canvas'); c.className = 'rep'; c.width = 80; c.height = 116; pic.appendChild(c);
    try { drawSprite(c, { ...ME.look, ...SLOT_OUTFITS[res.prizeKey].wear }, { crop:'full' }); } catch (e) { pic.innerHTML = ''; pic.appendChild(slotIcon(t.sym)); }
  } else pic.appendChild(slotIcon(res.outcome === 'merch' ? ({ snapback:'cap', stickers:'stickers', sloodie:'hoodie' }[res.prizeKey] || t.sym) : t.sym));
  const act = $('sl-card-act');
  const done = () => { rev.classList.remove('on'); slotBulbs(false); if (after) after(); slotRefresh(true); };
  if (res.outcome === 'merch' && res.needsClaim) slotClaimForm(act, res, done);
  else { act.innerHTML = `<button class="sl-btn" type="button">${btn}</button>`; act.querySelector('button').onclick = () => { haptic('tap'); done(); }; }
  rev.classList.remove('on'); void rev.offsetWidth; rev.classList.add('on');
  if (claimOnly) return;
  slotRumble(res.outcome);
  if ((res.outcome === 'merch' || res.outcome === 'video') && !SLOT_REDUCE) { const p = $('phone'); p.classList.remove('sl-shake'); void p.offsetWidth; p.classList.add('sl-shake'); setTimeout(() => p.classList.remove('sl-shake'), 600); }
  slotConfetti(t.color, { xp:40, boost:60, outfit:90, video:140, merch:240 }[res.outcome] || 40);
}
function slotClaimForm(act, res, done){
  const hat = /snapback|hat/i.test(res.prizeName || '') && !/sloodie/i.test(res.prizeName || '');
  const sizes = hat ? [] : ['S', 'M', 'L', 'XL', '2XL'];
  act.innerHTML = `<div class="sl-form">
    <div class="pnote" style="text-align:center;margin:0 auto 4px">Real merch, on SLAB. Tell us where to send it.</div>
    ${sizes.length ? `<label>Size<div class="sl-sizes">${sizes.map(z => `<button type="button" data-size="${z}">${z}</button>`).join('')}</div></label>` : ''}
    <label>Name<input id="sl-c-name" type="text" maxlength="120" autocomplete="name" value="${slEsc(ME.name || '')}"></label>
    <label>Shipping address<textarea id="sl-c-addr" maxlength="400" autocomplete="street-address"></textarea></label>
    <label>Phone (for the shipping label)<input id="sl-c-phone" type="tel" maxlength="40" autocomplete="tel"></label>
    <button class="sl-btn" id="sl-c-go" type="button">SEND IT TO ME</button>
    <button class="later" id="sl-c-later" type="button">I’ll add this later</button>
  </div>`;
  let size = '';
  act.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { size = b.dataset.size; act.querySelectorAll('[data-size]').forEach(x => x.classList.toggle('on', x === b)); });
  $('sl-c-later').onclick = done;
  $('sl-c-go').onclick = async () => {
    const claim = { size, name:$('sl-c-name').value.trim(), address:$('sl-c-addr').value.trim(), phone:$('sl-c-phone').value.trim() };
    if (sizes.length && !size) { showToast('Pick a size', 'ph-warning'); haptic('wrong'); return; }
    if (!claim.name || !claim.address) { showToast('Add your name and shipping address', 'ph-warning'); haptic('wrong'); return; }
    $('sl-c-go').disabled = true;
    try { await slotCall('claim', { spinId:res.spinId, claim }); haptic('success'); showToast('Got it. SLAB will ship it to you.', 'ph-package'); done(); }
    catch (e) { $('sl-c-go').disabled = false; showToast(e.message || 'Didn’t save, try again', 'ph-warning'); }
  };
}
let slotParts = [], slotRaf = 0;
function slotConfetti(color, n){
  if (SLOT_REDUCE) return;
  const fx = $('sl-fx'), box = $('sl-scroll'); const w = box.clientWidth, h = box.clientHeight;
  fx.style.top = box.scrollTop + 'px'; fx.style.height = h + 'px'; fx.width = w; fx.height = h;
  const cols = [color, '#ffe08a', '#daae5d', '#f2efe6', color];
  for (let i = 0; i < n; i++) slotParts.push({ x:w / 2, y:h * 0.42, vx:(Math.random() - 0.5) * 11, vy:-Math.random() * 11 - 3, s:3 + (Math.random() * 4 | 0), c:cols[i % cols.length], life:90 + Math.random() * 60, rot:Math.random() * 6 });
  if (!slotRaf) slotRaf = requestAnimationFrame(slotConfettiLoop);
}
function slotConfettiLoop(){
  const fx = $('sl-fx'), g = fx.getContext('2d'); g.clearRect(0, 0, fx.width, fx.height);
  slotParts = slotParts.filter(p => p.life-- > 0);
  slotParts.forEach(p => { p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += 0.2; g.globalAlpha = Math.min(1, p.life / 30); g.fillStyle = p.c; g.fillRect(p.x | 0, p.y | 0, p.s, Math.max(1, p.s * Math.abs(Math.cos(p.rot))) | 0); });
  g.globalAlpha = 1; slotRaf = slotParts.length ? requestAnimationFrame(slotConfettiLoop) : 0;
}

async function slotTrade(){
  const s = SLOT.state; if (SLOT.busy || !s) return;
  SLOT.busy = true; slotRender();
  try { const r = await slotCall('trade'); s.spins = r.spins; s.tradesLeft = r.tradesLeft; slotSetXP(r.total); haptic('success'); showToast(`Spin added. ${r.tradesLeft} trade${r.tradesLeft === 1 ? '' : 's'} left this week.`, 'ph-star'); }
  catch (e) { showToast(e.message || 'Trade didn’t go through', 'ph-warning'); haptic('wrong'); }
  SLOT.busy = false; slotRender();
}

// ---- start: load, keep fresh, and roll the mini machine now and then ----
setTimeout(() => slotRefresh(true), APP ? 3000 : 600);
setInterval(() => slotRefresh(true), 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) slotRefresh(true); });
setInterval(() => { const s = SLOT.state; if (!s || !s.enabled || document.hidden || $('phone').classList.contains('sl-open')) return;
  if (s.spins > 0 || Math.random() < 0.3) SLOT.miniRoll(); }, 4500);
setInterval(() => { if (SLOT.state && SLOT.state.boostEndsAt) slotRender(); }, 30000);
