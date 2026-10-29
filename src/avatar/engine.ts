// @ts-nocheck
/* eslint-disable */
/**
 * Pixel rep engine, ported from the Ace x SLAB demo (sprite.js + rides.js).
 *
 * Pure functions only: composeSprite() returns a 36x52 grid of colors (null =
 * transparent) and paintRide() paints into anything with fillStyle/fillRect.
 * Rendering lives in PixelSprite.tsx. The demo's hardcoded Ace gold/black,
 * "ACE" letters and "Ace" gear names come from the `brand` passed in, so every
 * company dresses its reps in its own colors.
 *
 * Kept close to the demo source on purpose so fixes can be copied across;
 * that's why this file is untyped.
 */
import { GLYPHS_3X5 } from './glyphs'

export function createSpriteEngine(brand) {
const B = brand.name
const LETTERS = brand.letters
const LETTER_X0 = Math.round(17.5 - (LETTERS.length * 4 - 1) / 2)

const SPR_W = 36, SPR_H = 52, OUTLINE = '#1a1420';
const ACE_GOLD = brand.primary, ACE_BLACK = brand.dark;

function shade(hex, f){
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = f < 0 ? 0 : 255, p = Math.abs(f);
  r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function mix(a, b, t){
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1);
}
// shadows lean purple-red, highlights lean warm, like hand-shaded sprites
const shadow = (c, t) => mix(c, '#2b1638', t == null ? 0.3 : t);
const light = (c, t) => mix(c, '#fff3dc', t == null ? 0.2 : t);

const SKINS = ['#f7d7bb', '#ebb994', '#cf946b', '#ad7049', '#7f4d2f', '#57341f', '#f3c9a6', '#966042'];
const HAIR_COLORS = ['#231b17', '#5b3a22', '#8d5b2c', '#e2b65a', '#a5452a', '#a3a8b0', '#f6d77a', '#2d4fa8', '#3a2e2b', '#e9e4d8'];
const EYE_COLORS = ['#3d8fe0', '#6b4226', '#3f9a54', '#8a7a3a', '#6f8597', '#2b2220'];
const HAIR_STYLES = [
  { id:'short', name:'Short' }, { id:'buzz', name:'Buzz' }, { id:'fade', name:'Fade' }, { id:'swoop', name:'Swoop' },
  { id:'messy', name:'Messy' }, { id:'curly', name:'Curly' }, { id:'afro', name:'Afro' }, { id:'waves', name:'Wavy' },
  { id:'long', name:'Long' }, { id:'bob', name:'Bob' }, { id:'pony', name:'Ponytail' }, { id:'bun', name:'Bun' },
  { id:'locs', name:'Locs' }, { id:'bald', name:'Bald' },
];
// how each style is built: top shape, fringe, how far it falls (row), texture, extra width
const HAIR_SPEC = {
  short: { top:'cap', fringe:'jag', len:0 },
  buzz:  { top:'buzz', fringe:'none', len:0 },
  fade:  { top:'tall', fringe:'none', len:0, fade:true },
  swoop: { top:'tall', fringe:'swoop', len:0 },
  messy: { top:'spiky', fringe:'jag', len:0 },
  curly: { top:'curly', fringe:'curl', len:0, tex:'curly' },
  afro:  { top:'afro', fringe:'curl', len:0, tex:'curly', vol:2 },
  waves: { top:'cap', fringe:'part', len:33, tex:'wavy', vol:2 },
  long:  { top:'cap', fringe:'part', len:32, tex:'straight', vol:1 },
  bob:   { top:'cap', fringe:'bangs', len:21, tex:'straight', vol:1 },
  pony:  { top:'cap', fringe:'part', len:0, pony:true },
  bun:   { top:'cap', fringe:'part', len:0, bun:true },
  locs:  { top:'cap', fringe:'none', len:30, tex:'locs', vol:1 },
  bald:  { top:'none', fringe:'none', len:0 },
};
const FACES = [ { id:'none', name:'Clean' }, { id:'stubble', name:'Stubble' }, { id:'mustache', name:'Mustache' }, { id:'goatee', name:'Goatee' }, { id:'beard', name:'Beard' } ];

// Company gear. `xp` is the total XP that unlocks it. No currency: more XP simply opens more options.
const GEAR = {
  top: [
    { id:'tee',     name:B + ' tee',          xp:0 },
    { id:'polo',    name:B + ' polo',         xp:0 },
    { id:'oxford',  name:'Oxford shirt',     xp:0 },
    { id:'crew',    name:'Crewneck',         xp:0 },
    { id:'zip',     name:B + ' quarter-zip',  xp:400 },
    { id:'vest',    name:B + ' puffer vest',  xp:550 },
    { id:'hoodie',  name:B + ' hoodie',       xp:700 },
    { id:'varsity', name:B + ' varsity',      xp:1200 },
    { id:'blazer',  name:'Gold ' + B + ' blazer',  xp:2000 },
  ],
  hat: [
    { id:'none',     name:'No hat',          xp:0 },
    { id:'cap',      name:B + ' cap',         xp:0 },
    { id:'back',     name:'Backwards cap',   xp:0 },
    { id:'snapback', name:'Gold snapback',   xp:300 },
    { id:'bucket',   name:'Bucket hat',      xp:450 },
    { id:'beanie',   name:B + ' beanie',      xp:600 },
    { id:'crown',    name:'Closer\'s crown', xp:2500 },
  ],
  pants: [
    { id:'black',   name:'Black pants',  xp:0 },
    { id:'khaki',   name:'Khakis',       xp:0 },
    { id:'jeans',   name:'Jeans',        xp:0 },
    { id:'shorts',  name:'Shorts',       xp:0 },
    { id:'joggers', name:B + ' joggers',  xp:800 },
  ],
  shoes: [
    { id:'sneaker', name:'White sneakers', xp:0 },
    { id:'runner',  name:'Black runners',  xp:0 },
    { id:'boots',   name:'Work boots',     xp:0 },
    { id:'gold',    name:'Gold kicks',     xp:1000 },
  ],
  extra: [
    { id:'none',    name:'Nothing',          xp:0 },
    { id:'glasses', name:'Glasses',          xp:0 },
    { id:'watch',   name:'Gold watch',       xp:350 },
    { id:'shades',  name:'Shades',           xp:500 },
    { id:'chain',   name:'Gold chain',       xp:1500 },
    { id:'both',    name:'Shades and chain', xp:1500 },
  ],
  ride: [
    { id:'none',    name:'On foot',          xp:0 },
    { id:'segway',  name:'Segway',           xp:500 },
    { id:'scooter', name:B + ' e-scooter',    xp:1500 },
  ],
};
// SLAB's own merch, for reps without a company: the SLAB S where Ace's A goes, orange for gold, and two lab pieces
const SLAB_PACK = LETTERS.join('') === 'SLAB';
if (SLAB_PACK) {
  const rn = (slot, id, name) => { const g = GEAR[slot].find(x => x.id === id); if (g) g.name = name; };
  rn('top', 'blazer', 'Orange SLAB blazer'); rn('hat', 'snapback', 'Orange snapback'); rn('shoes', 'gold', 'Orange kicks');
  GEAR.top.splice(GEAR.top.findIndex(x => x.id === 'varsity'), 0, { id:'labcoat', name:'SLAB lab coat', xp:1000 });
  GEAR.extra.splice(GEAR.extra.findIndex(x => x.id === 'shades'), 0, { id:'goggles', name:'Lab goggles', xp:450 });
}
const ALL_GEAR = Object.entries(GEAR).flatMap(([slot, list]) => list.filter(g => g.xp > 0).map(g => ({ ...g, slot }))).sort((a, b) => a.xp - b.xp);

const DEFAULT_LOOK = { skin:2, eyes:0, hair:'short', hairColor:1, face:'none', top:'tee', hat:'none', pants:'black', shoes:'sneaker', extra:'none', ride:'none' };

// body: main color, sleeve length, optional sleeve color and logo color
const TOPS = {
  tee:     { body:ACE_BLACK, sleeve:'short', logo:ACE_GOLD, back:true },
  polo:    { body:ACE_GOLD,  sleeve:'short' },
  oxford:  { body:'#e9eef5', sleeve:'long' },
  crew:    { body:'#6d7f95', sleeve:'long' },
  zip:     { body:'#3a3d46', sleeve:'long' },
  vest:    { body:ACE_BLACK, sleeve:'long', sleeveColor:'#e9eef5' },
  hoodie:  { body:'#18181d', sleeve:'long', logo:ACE_GOLD, back:true },
  varsity: { body:ACE_BLACK, sleeve:'long', sleeveColor:ACE_GOLD, back:true },
  blazer:  { body:'#c99a45', sleeve:'long' },
  // homeowners (bosses only)
  robe:     { body:'#8fb3d6', sleeve:'long' },
  flannel:  { body:'#a6372d', sleeve:'long' },
  cardigan: { body:'#7c6650', sleeve:'long' },
  tank:     { body:'#eeeeea', sleeve:'none' },
  sweater:  { body:'#4c6b5a', sleeve:'long' },
};
TOPS.labcoat = { body:'#efeee8', sleeve:'long', back:true };
if (SLAB_PACK) TOPS.blazer = { body:ACE_GOLD, sleeve:'long' };
const PANTS = { black:'#2a2b33', khaki:'#b59b6b', jeans:'#3d5a86', shorts:'#a8916a', joggers:'#1f1f25', sweats:'#8b8f98', slacks:'#5a5048' };
const SHOES = { sneaker:'#f1f0ea', runner:'#26262c', boots:'#5a3d26', gold:ACE_GOLD, slippers:'#a07a6a', loafers:'#4a2e22' };

// 3x5 pixel letters for the back of company gear
const GLYPH = GLYPHS_3X5;

// The chest and cap mark: Ace's A for Ace, otherwise the company's first letter (SLAB gets a chunkier S on caps)
const gearMark = () => LETTERS.join('') === 'ACE' ? null : (GLYPH[LETTERS[0]] || null);
const capMarkRows = () => { const m = gearMark(); if (!m) return ['0110', '1001', '1111', '1001'];
  if (LETTERS[0] === 'S') return ['0111', '1100', '0011', '1110']; return [m[0], m[1], m[2], m[4]].map(r => r + '0'); };

function composeSprite(look, pose, mood){
  const W = SPR_W, H = SPR_H;
  const col = Array.from({ length:H }, () => Array(W).fill(null));
  const part = Array.from({ length:H }, () => Array(W).fill(null));
  const zOf = {}; let zNext = 0;
  const inb = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
  // base paint (shaded later)
  const P = (p, c) => (x, y) => { if (!(p in zOf)) zOf[p] = zNext++; if (inb(x, y)) { col[y][x] = c; part[y][x] = p; } };
  const span = (put, y, x0, x1) => { for (let x = x0; x <= x1; x++) put(x, y); };
  const box = (put, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) span(put, y, x0, x1); };
  const erase = (x, y) => { if (inb(x, y)) { col[y][x] = null; part[y][x] = null; } };
  // details (drawn after shading, never shaded)
  const details = [];
  const D = (x, y, c) => details.push([x, y, c]);
  const Dspan = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) D(x, y, c); };

  // ---- pose ----
  let dir = 'down', step = 0, act = 'idle', knock = 0;
  if (/^(down|side|up)-\d$/.test(pose)) { dir = pose.split('-')[0]; step = +pose.split('-')[1]; }
  else if (/^knock-\d$/.test(pose)) { dir = 'up'; act = 'knock'; knock = +pose.split('-')[1]; }
  else if (/^knockside-\d$/.test(pose)) { dir = 'side'; act = 'knockside'; knock = +pose.split('-')[1]; }
  else act = pose || 'idle';
  const walking = step % 2 === 1;
  const bob = walking ? -1 : 0;                         // the body rises on each stride
  const L = act === 'attack' ? 1 : act === 'hit' ? -1 : 0;   // head lean in fights

  // ---- palette ----
  const skin = SKINS[look.skin] != null ? SKINS[look.skin] : SKINS[2];
  const skinD = shadow(skin, 0.22), skinDD = shadow(skin, 0.4);
  const hair = HAIR_COLORS[look.hairColor] != null ? HAIR_COLORS[look.hairColor] : HAIR_COLORS[1];
  const hairL = light(hair, 0.28), hairD = shadow(hair, 0.35);
  const eye = EYE_COLORS[look.eyes] != null ? EYE_COLORS[look.eyes] : EYE_COLORS[0];
  const top = TOPS[look.top] || TOPS.tee;
  const body = top.body, sleeve = top.sleeveColor || body;
  const pc = PANTS[look.pants] || PANTS.black;
  const sc = SHOES[look.shoes] || SHOES.sneaker;
  const spec = HAIR_SPEC[look.hair] || HAIR_SPEC.short;
  const vol = spec.vol || 0;
  const mouthC = mix(skin, '#7a2b28', 0.55);

  const Skin = P('skin', skin), Neck = P('neck', skinD), HairBack = P('hairback', hairD), HairP = P('hair', hair);
  const Top = P('top', body), Pants = P('pants', pc), ShoeL = P('shoeL', sc), ShoeR = P('shoeR', sc);
  const ArmL = P('armL', sleeve), ArmR = P('armR', sleeve), HandL = P('handL', skin), HandR = P('handR', skin);
  const LegSkinL = P('legL', skin), LegSkinR = P('legR', skin);

  // ================= shared pieces =================
  // legs + shoes. cx0/cx1: columns of each leg; lift: rows a foot is raised
  const shorts = look.pants === 'shorts';
  function legsFront(liftL, liftR){
    const by = 34 + bob;
    box(Pants, 11, by, 24, by + 2);
    const leg = (x0, x1, lift, skinPut, shoe, side) => {
      const end = 45 - lift;
      for (let y = by + 3; y <= end; y++) {
        if (shorts && y > by + 6) { span(skinPut, y, x0 + 1, x1 - 1); }
        else span(Pants, y, x0, x1);
      }
      if (shorts) { Dspan(end, x0 + 1, x1 - 1, '#f4f2ec'); }
      box(shoe, x0 - (side < 0 ? 1 : 0), end + 1, x1 + (side > 0 ? 1 : 0), end + 3);
    };
    leg(11, 16, liftL, LegSkinL, ShoeL, -1);
    leg(19, 24, liftR, LegSkinR, ShoeR, 1);
    if (look.pants === 'joggers') for (let y = by + 1; y <= 45; y++) { D(11, y, ACE_GOLD); D(24, y, ACE_GOLD); }
    return { by };
  }
  function shoeDetails(view){
    // soles and accents, found from where the shoes landed
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = part[y][x];
      if (p !== 'shoeL' && p !== 'shoeR') continue;
      const below = inb(x, y + 1) ? part[y + 1][x] : null;
      if (below !== p) {
        const sole = look.shoes === 'boots' ? '#2e1f15' : look.shoes === 'runner' ? '#f1f0ea' : look.shoes === 'gold' ? '#f6e3a8' : look.shoes === 'loafers' ? '#2a1a12' : '#cfcac0';
        D(x, y, sole);
      }
    }
    if (look.shoes === 'sneaker' && view !== 'up') { tagShoe('shoeL', ACE_GOLD); tagShoe('shoeR', ACE_GOLD); }
    if (look.shoes === 'runner') { tagShoe('shoeL', '#e2574c'); tagShoe('shoeR', '#e2574c'); }
  }
  function tagShoe(p, c){
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (part[y][x] === p && part[y - 1] && part[y - 1][x] !== p) { if ((x + y) % 3 === 0) D(x, y + 1, c); }
  }

  // torso (front or back): shoulders 11..24, chest 10..25, waist 11..24
  function torso(){
    const t = 22 + bob;
    span(Top, t, 11, 24);
    for (let y = t + 1; y <= t + 9; y++) span(Top, y, 10, 25);
    span(Top, t + 10, 11, 24); span(Top, t + 11, 11, 24); span(Top, t + 12, 11, 24);
    if (top.sleeve === 'none') { box(Skin, 10, t, 12, t + 3); box(Skin, 23, t, 25, t + 3); }
    return t;
  }
  // a straight arm hanging down (x0 is its left column); sleeve then forearm then hand
  function armDown(x0, put, hand, t, swing){
    const len = top.sleeve === 'short' ? 4 : top.sleeve === 'none' ? 0 : 11;
    for (let y = t + 1; y <= t + 11; y++) {
      const dx = swing && y > t + 6 ? swing : 0;
      if (y - t - 1 < len) span(put, y, x0 + dx, x0 + 2 + dx);
      else span(hand === HandL ? SkinArmL : SkinArmR, y, x0 + dx, x0 + 2 + dx);
    }
    box(hand, x0 + (swing || 0), t + 12, x0 + 2 + (swing || 0), t + 13);
  }
  const SkinArmL = P('farmL', skin), SkinArmR = P('farmR', skin);

  // head shapes
  const HEAD_FRONT = [[13, 22], [11, 24], [10, 25], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [9, 26], [10, 25], [10, 25], [11, 24], [13, 22]];
  const HEAD_SIDE = [[13, 21], [11, 23], [10, 24], [10, 25], [10, 25], [10, 25], [10, 25], [10, 25], [10, 25], [10, 26], [10, 26], [10, 25], [10, 25], [11, 25], [11, 24], [12, 24], [14, 22]];
  const HY = 4;   // head top row
  function headFront(dx){
    HEAD_FRONT.forEach(([a, b], i) => span(Skin, HY + i + bob, a + dx, b + dx));
    // ears
    box(Skin, 8 + dx, HY + 8 + bob, 8 + dx, HY + 11 + bob); box(Skin, 27 + dx, HY + 8 + bob, 27 + dx, HY + 11 + bob);
    box(Neck, 15, HY + 17 + bob, 20, HY + 18 + bob);
  }
  function headSide(){
    HEAD_SIDE.forEach(([a, b], i) => span(Skin, HY + i + bob, a, b));
    box(Neck, 15, HY + 17 + bob, 19, HY + 18 + bob);
  }

  // ================= hair =================
  // back layer (falls behind the body), drawn first
  function hairBackLayer(view){
    if (spec.top === 'afro') {
      // a round cloud behind (or, seen from behind, over) the head
      const cx = view === 'side' ? 16 : 17.5, cy = HY + 5 + bob, rx = view === 'side' ? 11.5 : 12.5, ry = 9.5;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const k = 1 - ((y - cy) / ry) ** 2; if (k <= 0) continue;
        const hw = rx * Math.sqrt(k);
        span(HairBack, y, Math.round(cx - hw), Math.round(cx + hw - 1));
      }
      return;
    }
    if (!spec.len) return;
    const endY = spec.len + bob;
    const x0 = 8 - vol, x1 = 27 + vol;
    for (let y = HY + 4 + bob; y <= endY; y++) {
      let a = x0, b = x1;
      if (spec.tex === 'wavy') { const w = Math.floor((y / 3)) % 2; a += w; b -= w; }
      if (spec.tex === 'curly') { const w = (y % 3 === 0) ? 1 : 0; a += w; b -= w; }
      if (y > endY - 2) { a += 2; b -= 2; }
      if (view === 'side') { a = Math.max(a, 7 - vol); b = Math.min(b, 18); }
      span(HairBack, y, a, b);
    }
  }
  function hairFront(view, dx){
    dx = dx || 0;
    const y0 = HY + bob;
    const H_ = (x, y) => HairP(x + dx, y);
    const sp = (y, a, b) => { for (let x = a; x <= b; x++) H_(x, y); };
    if (spec.top === 'none') { if (view !== 'up') return; return; }
    if (view === 'up') {
      // from behind the whole head is hair
      HEAD_FRONT.forEach(([a, b], i) => { if (spec.top === 'buzz' && i > 11) return; if (spec.fade && i > 9) return; sp(y0 + i, a, b); });
      sp(y0 - 1, 12, 23);
      if (spec.top === 'curly') { sp(y0 - 2, 11, 24); for (let y = y0 - 1; y <= y0 + 10; y++) sp(y, 8, 27); }
      if (spec.bun) { box(HairP, 15, y0 - 4, 20, y0 - 1); }
      if (spec.pony) { box(HairP, 15, y0 + 14, 20, y0 + 20); box(HairP, 16, y0 + 21, 19, y0 + 24); D(15, y0 + 13, '#d34b5e'); D(20, y0 + 13, '#d34b5e'); }
      return;
    }
    if (view === 'side') {
      // cap over the top and the back of the head
      const shape = [[13, 21], [11, 23], [10, 24], [10, 24], [10, 22], [10, 18], [10, 17], [10, 16], [10, 15], [10, 15], [10, 14], [10, 14], [11, 14], [11, 13]];
      shape.forEach(([a, b], i) => { if (spec.top === 'buzz' && i > 9) return; if (spec.fade && i > 7) return; sp(y0 - 1 + i, a, b); });
      if (spec.top === 'tall' || spec.top === 'spiky') { sp(y0 - 2, 12, 22); if (spec.top === 'spiky') { H_(14, y0 - 3); H_(18, y0 - 3); H_(22, y0 - 2); H_(25, y0); } }
      if (spec.top === 'curly') { sp(y0 - 2, 11, 23); for (let y = y0 - 1; y <= y0 + 10; y++) sp(y, 8, 22); }
      if (spec.fringe === 'swoop') { sp(y0 + 3, 20, 26); sp(y0 + 4, 23, 26); }
      else if (spec.fringe !== 'none') { sp(y0 + 4, 21, 25); H_(24, y0 + 5); }
      if (spec.bun) { box(HairP, 13, y0 - 4, 17, y0 - 1); }
      if (spec.pony) { box(HairP, 7, y0 + 7, 10, y0 + 15); box(HairP, 6, y0 + 15, 9, y0 + 20); D(10, y0 + 7, '#d34b5e'); }
      return;
    }
    // front
    if (spec.top === 'buzz') { sp(y0 - 1, 12, 23); sp(y0, 10, 25); sp(y0 + 1, 9, 26); sp(y0 + 2, 9, 26); H_(9, y0 + 3); H_(26, y0 + 3); return; }
    sp(y0 - 1, 12, 23); sp(y0, 10, 25); sp(y0 + 1, 9, 26); sp(y0 + 2, 9, 26); sp(y0 + 3, 9, 26);
    if (!spec.fade) { sp(y0 + 4, 9, 10); sp(y0 + 4, 25, 26); box(HairP, 9 + dx, y0 + 5, 9 + dx, y0 + 7); box(HairP, 26 + dx, y0 + 5, 26 + dx, y0 + 7); }
    if (spec.top === 'tall' || spec.top === 'spiky') { sp(y0 - 2, 12, 23); sp(y0 - 3, 14, 21); }
    if (spec.top === 'spiky') { [11, 15, 19, 23].forEach(x => { H_(x, y0 - 3); H_(x + 1, y0 - 4); }); }
    if (spec.top === 'curly') { sp(y0 - 2, 11, 24); for (let x = 9; x <= 26; x += 3) H_(x, y0 - 3 + (x % 2)); for (let y = y0; y <= y0 + 8; y++) { H_(8, y); H_(27, y); } }
    
    // fringe
    if (spec.fringe === 'jag') { sp(y0 + 4, 11, 15); sp(y0 + 4, 19, 22); H_(12, y0 + 5); H_(15, y0 + 5); H_(20, y0 + 5); }
    if (spec.fringe === 'swoop') { sp(y0 + 4, 10, 18); sp(y0 + 5, 10, 15); sp(y0 + 6, 10, 12); sp(y0 - 2, 11, 24); sp(y0 - 3, 13, 22); }
    if (spec.fringe === 'part') { sp(y0 + 4, 10, 16); sp(y0 + 5, 10, 13); sp(y0 + 4, 20, 25); sp(y0 + 5, 23, 25); }
    if (spec.fringe === 'bangs') { sp(y0 + 4, 10, 25); sp(y0 + 5, 10, 25); for (let x = 11; x <= 24; x += 3) H_(x, y0 + 6); }
    if (spec.fringe === 'curl') { for (let x = 10; x <= 25; x += 2) H_(x, y0 + 4); sp(y0 + 4, 10, 12); sp(y0 + 4, 23, 25); }
    // long styles frame the face
    if (spec.len) { for (let y = y0 + 4; y <= Math.min(spec.len + bob, y0 + 19); y++) { H_(9, y); H_(26, y); if (y < y0 + 12) { H_(10, y); H_(25, y); } } }
    if (spec.bun) box(HairP, 15 + dx, y0 - 5, 20 + dx, y0 - 2);
    if (spec.pony) { box(HairP, 27 + dx, y0 + 6, 28 + dx, y0 + 14); }
  }
  function hairTexture(){
    // strands and a shine band, so it reads as hair and not a helmet
    const curly = spec.tex === 'curly' || spec.top === 'curly' || spec.top === 'afro';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = part[y][x];
      if (p !== 'hair' && p !== 'hairback') continue;
      const edge = !(part[y][x + 1] === p) || !(part[y][x - 1] === p) || !(part[y - 1] && part[y - 1][x] === p) || !(part[y + 1] && part[y + 1][x] === p);
      if (edge) continue;
      if (spec.tex === 'locs') { if (x % 2 === 0) D(x, y, shadow(hair, 0.3)); else if (y % 4 === 0) D(x, y, hairL); continue; }
      if (curly) {
        // little C-shaped curls on a 4x4 grid
        const gx = (x + (Math.floor(y / 4) % 2) * 2) % 4, gy = y % 4;
        if (gy === 0 && gx < 2) D(x, y, hairL); else if (gx === 3 && gy === 2) D(x, y, hairD);
        continue;
      }
      if (p === 'hair') {
        if (y >= HY - 2 + bob && y <= HY + bob && x >= 12 && x <= 18) D(x, y, hairL);          // shine
        else if ((x * 7 + Math.floor(y / 3)) % 5 === 0) D(x, y, shadow(hair, 0.18));             // strands
      } else if (x % 3 === 0) D(x, y, shadow(hair, 0.2));
      else if (x % 3 === 1 && y % 5 === 0) D(x, y, light(hair, 0.12));
    }
  }
  // ================= face =================
  function faceFront(dx){
    const y = HY + bob;
    const ex = [12 + dx, 21 + dx];
    const lash = mix(hair, '#1a1210', 0.55);
    const grumpy = mood === 'grumpy';
    // brows
    if (grumpy) { D(ex[0], y + 7, lash); D(ex[0] + 1, y + 8, lash); D(ex[0] + 2, y + 8, lash); D(ex[1] + 2, y + 7, lash); D(ex[1] + 1, y + 8, lash); D(ex[1], y + 8, lash); }
    else { Dspan(y + 7, ex[0], ex[0] + 2, hairD); Dspan(y + 7, ex[1], ex[1] + 2, hairD); }
    if (mood === 'hit') { Dspan(y + 10, ex[0], ex[0] + 2, OUTLINE); Dspan(y + 10, ex[1], ex[1] + 2, OUTLINE); }
    else if ((look.eyeStyle || 'dot') === 'simple' || (look.eyeStyle || 'dot') === 'dot') {
      // simple eyes: a small dark pupil (1x2, or 2x2 with a glint)
      const pc = mix(shadow(eye, 0.6), '#1a1210', 0.55);
      [[ex[0], 1], [ex[1], -1]].forEach(([x0, s]) => {
        const c = s > 0 ? x0 + 1 : x0 + 1;
        if ((look.eyeStyle || 'dot') === 'simple') { D(c, y + 10, pc); D(c, y + 11, pc); }
        else { const c2 = s > 0 ? c + 1 : c - 1; D(c, y + 10, pc); D(c2, y + 10, pc); D(c, y + 11, pc); D(c2, y + 11, pc); D(s > 0 ? c2 : c, y + 10, '#ffffff'); }
        if (grumpy) D(c, y + 9, lash);
      });
    }
    else {
      // eyes: lash line, white on the outside, two-tone iris with a glint
      [[ex[0], 1], [ex[1], -1]].forEach(([x0, s]) => {
        const out = s > 0 ? x0 : x0 + 2, a = x0 + 1, b = s > 0 ? x0 + 2 : x0;
        Dspan(y + 9, x0, x0 + 2, lash); D(s > 0 ? x0 - 1 : x0 + 3, y + 9, lash);
        D(out, y + 10, '#ffffff'); D(out, y + 11, '#ffffff'); D(out, y + 12, '#d9d4e2');
        D(a, y + 10, shadow(eye, 0.5)); D(b, y + 10, '#ffffff');
        D(a, y + 11, eye); D(b, y + 11, shadow(eye, 0.15));
        D(a, y + 12, light(eye, 0.3)); D(b, y + 12, light(eye, 0.45));
        if (grumpy) { D(out, y + 10, lash); D(a, y + 10, lash); }
      });
    }
    // nose + mouth
    D(18 + dx, y + 13, skinD); D(17 + dx, y + 13, shadow(skin, 0.1));
    if (mood === 'shout' || mood === 'hit') { Dspan(y + 14, 16 + dx, 19 + dx, mouthC); Dspan(y + 15, 16 + dx, 19 + dx, '#4a1f18'); }
    else if (grumpy) Dspan(y + 15, 16 + dx, 19 + dx, mouthC);
    else { D(15 + dx, y + 14, mouthC); D(20 + dx, y + 14, mouthC); Dspan(y + 15, 16 + dx, 19 + dx, mouthC); }
    // cheeks
    D(11 + dx, y + 12, mix(skin, '#e2786e', 0.25)); D(24 + dx, y + 12, mix(skin, '#e2786e', 0.25));
    // facial hair
    const fh = shadow(hair, 0.1);
    if (look.face === 'stubble') for (let yy = y + 14; yy <= y + 16; yy++) for (let x = 11; x <= 24; x++) if ((x + yy) % 2 === 0 && !(yy === y + 15 && x >= 15 && x <= 20)) D(x + dx, yy, skinDD);
    if (look.face === 'mustache') { Dspan(y + 14, 15 + dx, 20 + dx, fh); D(14 + dx, y + 15, fh); D(21 + dx, y + 15, fh); }
    if (look.face === 'goatee') { Dspan(y + 14, 15 + dx, 20 + dx, fh); Dspan(y + 16, 16 + dx, 19 + dx, fh); Dspan(y + 17, 16 + dx, 19 + dx, fh); }
    if (look.face === 'beard') { for (let yy = y + 12; yy <= y + 16; yy++) { const a = yy < y + 15 ? 9 : 11, b = yy < y + 15 ? 26 : 24; for (let x = a; x <= b; x++) { if (yy === y + 15 && x >= 16 && x <= 19) continue; if (yy < y + 14 && x > a + 1 && x < b - 1) continue; D(x + dx, yy, fh); } } Dspan(y + 17, 13 + dx, 22 + dx, fh); Dspan(y + 14, 15 + dx, 20 + dx, hairD); }
    // glasses + shades + readers
    const ex0 = ex[0], ex1 = ex[1];
    if (look.extra === 'goggles') { const gl = '#d6ecf5'; [ex0, ex1].forEach(x0 => { Dspan(y + 9, x0 - 1, x0 + 3, ACE_GOLD); Dspan(y + 12, x0 - 1, x0 + 3, ACE_GOLD); D(x0 - 1, y + 10, ACE_GOLD); D(x0 - 1, y + 11, ACE_GOLD); D(x0 + 3, y + 10, ACE_GOLD); D(x0 + 3, y + 11, ACE_GOLD); Dspan(y + 10, x0, x0 + 2, gl); Dspan(y + 11, x0, x0 + 2, gl); D(x0, y + 10, '#ffffff'); }); Dspan(y + 10, ex0 + 4, ex1 - 2, ACE_GOLD); }
    if (look.extra === 'shades' || look.extra === 'both') { [ex0, ex1].forEach(x0 => { Dspan(y + 9, x0 - 1, x0 + 3, '#101014'); Dspan(y + 10, x0 - 1, x0 + 3, '#101014'); Dspan(y + 11, x0, x0 + 2, '#101014'); D(x0, y + 10, '#7fa7d1'); }); Dspan(y + 9, ex0 + 4, ex1 - 2, '#101014'); }
    if (look.extra === 'glasses' || look.extra === 'readers') {
      const f = look.extra === 'readers' ? '#7a5a3a' : '#22222a';
      [ex0, ex1].forEach(x0 => { Dspan(y + (look.extra === 'readers' ? 10 : 9), x0 - 1, x0 + 3, f); D(x0 - 1, y + 10, f); D(x0 + 3, y + 10, f); D(x0 - 1, y + 11, f); D(x0 + 3, y + 11, f); Dspan(y + 12, x0 - 1, x0 + 3, f); });
      Dspan(y + 10, ex0 + 4, ex1 - 2, f);
    }
    if (look.extra === 'curlers') [[11, -1], [15, -2], [20, -2], [24, -1]].forEach(([x, yy]) => { D(x + dx, y + yy, '#e88aa8'); D(x + 1 + dx, y + yy, '#e88aa8'); D(x + dx, y + yy + 1, '#c96a8a'); D(x + 1 + dx, y + yy + 1, '#c96a8a'); });
  }
  function faceSide(){
    const y = HY + bob;
    const lash = mix(hair, '#1a1210', 0.55);
    if (mood === 'grumpy') { D(21, y + 7, lash); D(22, y + 8, lash); D(23, y + 8, lash); } else Dspan(y + 7, 21, 23, hairD);
    if ((look.eyeStyle || 'dot') === 'simple' || (look.eyeStyle || 'dot') === 'dot') {
      const pc = mix(shadow(eye, 0.6), '#1a1210', 0.55);
      D(23, y + 10, pc); D(23, y + 11, pc); if ((look.eyeStyle || 'dot') === 'dot') { D(22, y + 10, pc); D(22, y + 11, pc); D(23, y + 10, '#ffffff'); }
    } else {
      Dspan(y + 9, 21, 23, lash);
      D(21, y + 10, '#ffffff'); D(21, y + 11, '#ffffff'); D(21, y + 12, '#d9d4e2');
      D(22, y + 10, shadow(eye, 0.5)); D(23, y + 10, '#ffffff'); D(22, y + 11, eye); D(23, y + 11, shadow(eye, 0.15)); D(22, y + 12, light(eye, 0.3)); D(23, y + 12, light(eye, 0.45));
    }
    // nose bump + mouth
    if (inb(26, y + 12)) { Skin(26, y + 12); Skin(26, y + 13); }
    D(25, y + 13, skinD);
    Dspan(y + 15, 23, 24, mouthC);
    D(20, y + 12, mix(skin, '#e2786e', 0.25));
    // ear
    D(15, y + 9, skinD); D(15, y + 10, skinDD); D(16, y + 10, skinD); D(15, y + 11, skinD);
    const fh = shadow(hair, 0.1);
    if (look.face === 'beard') { for (let yy = y + 11; yy <= y + 17; yy++) for (let x = 15; x <= 25; x++) { if (part[yy] && part[yy][x] === 'skin' && !(yy === y + 14 && x >= 22)) { if (yy < y + 13 && x > 17 && x < 24) continue; D(x, yy, fh); } } }
    if (look.face === 'mustache' || look.face === 'goatee') { Dspan(y + 13, 22, 25, fh); if (look.face === 'goatee') Dspan(y + 15, 22, 24, fh); }
    if (look.face === 'stubble') for (let yy = y + 13; yy <= y + 16; yy++) for (let x = 17; x <= 24; x++) if ((x + yy) % 2 === 0 && part[yy][x] === 'skin') D(x, yy, skinDD);
    if (look.extra === 'goggles') { Dspan(y + 9, 15, 19, ACE_BLACK); Dspan(y + 9, 20, 24, ACE_GOLD); D(20, y + 10, ACE_GOLD); D(20, y + 11, ACE_GOLD); Dspan(y + 10, 21, 24, '#d6ecf5'); Dspan(y + 11, 21, 24, '#d6ecf5'); Dspan(y + 12, 20, 24, ACE_GOLD); D(21, y + 10, '#ffffff'); }
    if (look.extra === 'shades' || look.extra === 'both') { Dspan(y + 9, 15, 24, '#101014'); Dspan(y + 10, 21, 24, '#101014'); Dspan(y + 11, 21, 23, '#101014'); D(22, y + 10, '#7fa7d1'); }
    if (look.extra === 'glasses' || look.extra === 'readers') { const f = look.extra === 'readers' ? '#7a5a3a' : '#22222a'; Dspan(y + 9, 16, 24, f); D(20, y + 10, f); D(20, y + 11, f); D(24, y + 10, f); D(24, y + 11, f); Dspan(y + 12, 20, 24, f); }
    if (look.extra === 'curlers') [[13, -1], [18, -2], [22, -1]].forEach(([x, yy]) => { D(x, y + yy, '#e88aa8'); D(x + 1, y + yy, '#e88aa8'); });
  }

  // ================= tops (details) =================
  function topFront(t){
    const d = shadow(body, 0.35), l = light(body, 0.25);
    const logoA = (x, y, c) => { const m = gearMark(); if (m) { m.forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(x + rx, y - 1 + ry, c); })); return; } D(x + 1, y, c); D(x, y + 1, c); D(x + 2, y + 1, c); Dspan(y + 2, x, x + 2, c); D(x, y + 3, c); D(x + 2, y + 3, c); };
    switch (look.top) {
      case 'tee': Dspan(t, 15, 20, shadow(body, 0.1)); Dspan(t, 16, 19, skinD); logoA(16, t + 3, top.logo); if (!gearMark()) D(19, t + 3, top.logo); break;
      case 'polo': Dspan(t, 14, 15, ACE_BLACK); Dspan(t, 20, 21, ACE_BLACK); Dspan(t, 16, 19, skinD); D(17, t + 1, skinD); D(18, t + 1, skinD); D(17, t + 2, ACE_BLACK); D(18, t + 3, ACE_BLACK); D(22, t + 3, ACE_BLACK); D(21, t + 3, ACE_BLACK); break;
      case 'oxford': Dspan(t, 15, 16, '#ffffff'); Dspan(t, 19, 20, '#ffffff'); Dspan(t, 17, 18, skinD); for (let y = t + 1; y <= t + 12; y++) D(17, y, shadow(body, 0.18)); for (let y = t + 3; y <= t + 11; y += 3) D(18, y, '#b8c0cc'); D(13, t + 3, shadow(body, 0.22)); D(14, t + 3, shadow(body, 0.22)); break;
      case 'crew': Dspan(t, 14, 21, shadow(body, 0.25)); Dspan(t + 12, 11, 24, shadow(body, 0.25)); break;
      case 'zip': Dspan(t, 13, 22, shadow(body, 0.3)); Dspan(t - 1, 14, 21, shadow(body, 0.3)); for (let y = t; y <= t + 6; y++) D(17, y, ACE_GOLD); D(17, t + 7, '#fff2c0'); D(13, t + 3, ACE_GOLD); D(14, t + 3, ACE_GOLD); break;
      case 'vest': for (let y = t + 1; y <= t + 12; y++) { D(17, y, shadow(body, 0.4)); } for (let y = t + 3; y <= t + 12; y += 3) Dspan(y, 11, 24, shadow(body, 0.3)); Dspan(t, 14, 21, '#e9eef5'); D(13, t + 2, ACE_GOLD); D(14, t + 2, ACE_GOLD); break;
      case 'hoodie': Dspan(t - 1, 12, 23, shadow(body, 0.2)); Dspan(t, 12, 23, light(body, 0.08)); D(15, t + 1, ACE_GOLD); D(15, t + 2, ACE_GOLD); D(20, t + 1, ACE_GOLD); D(20, t + 2, ACE_GOLD); Dspan(t + 8, 13, 22, shadow(body, 0.3)); for (let y = t + 9; y <= t + 10; y++) { D(13, y, shadow(body, 0.3)); D(22, y, shadow(body, 0.3)); } logoA(16, t + 3, ACE_GOLD); if (!gearMark()) D(19, t + 3, ACE_GOLD); break;
      case 'varsity': Dspan(t, 13, 22, ACE_GOLD); Dspan(t + 12, 11, 24, ACE_GOLD); for (let y = t + 1; y <= t + 11; y++) D(17, y, shadow(body, 0.3)); for (let y = t + 2; y <= t + 11; y += 3) D(18, y, ACE_GOLD); logoA(12, t + 3, ACE_GOLD); break;
      case 'blazer': for (let y = t; y <= t + 7; y++) Dspan(y, 16, 19, '#f2f2f2'); D(17, t + 1, '#1a1a1f'); D(18, t + 1, '#1a1a1f'); for (let y = t + 2; y <= t + 6; y++) { D(17, y, '#1a1a1f'); D(18, y, '#1a1a1f'); } for (let y = t; y <= t + 6; y++) { D(15, y, d); D(20, y, d); } D(16, t + 9, '#1a1a1f'); D(16, t + 11, '#1a1a1f'); D(22, t + 3, '#ffffff'); D(23, t + 3, '#d2402f'); break;
      case 'labcoat': for (let y = t; y <= t + 5; y++) { const k = Math.max(0, y - t - 3); Dspan(y, 16 + k, 19 - k, ACE_BLACK); } for (let y = t; y <= t + 6; y++) { const k = Math.max(0, y - t - 4); D(15 + k, y, d); D(20 - k, y, d); } for (let y = t + 7; y <= t + 12; y++) D(17, y, d); D(18, t + 8, '#b9b8b2'); D(18, t + 11, '#b9b8b2'); Dspan(t + 5, 11, 13, d); D(12, t + 3, ACE_GOLD); D(12, t + 4, ACE_GOLD); logoA(21, t + 3, ACE_GOLD); Dspan(t + 10, 11, 14, d); Dspan(t + 10, 20, 23, d); break;
      case 'robe': for (let y = t; y <= t + 4; y++) Dspan(y, 16, 19 - Math.max(0, y - t - 2), skin); Dspan(t + 7, 10, 25, d); D(15, t + 8, d); D(20, t + 8, d); for (let y = t + 1; y <= t + 12; y++) D(15 + (y > t + 6 ? 1 : 0), y, d); break;
      case 'flannel': for (let y = t; y <= t + 12; y++) for (let x = 10; x <= 25; x++) if (part[y] && part[y][x] === 'top' && (x % 4 === 0 || y % 4 === 0)) D(x, y, (x % 4 === 0 && y % 4 === 0) ? '#2a0f0d' : '#5a1a16'); for (let y = t + 1; y <= t + 12; y++) D(17, y, '#7a2620'); break;
      case 'cardigan': for (let y = t; y <= t + 12; y++) Dspan(y, 16, 19, '#e9e2d4'); for (let y = t + 3; y <= t + 11; y += 3) D(15, y, '#d8c49a'); break;
      case 'tank': Dspan(t, 16, 19, skin); Dspan(t + 1, 17, 18, skin); break;
      case 'sweater': Dspan(t, 14, 21, shadow(body, 0.3)); for (let x = 11; x <= 24; x += 2) { D(x, t + 6, l); D(x + 1, t + 7, l); } break;
    }
    if (look.extra === 'chain' || look.extra === 'both') { [[14, t], [15, t + 1], [16, t + 2], [17, t + 2], [18, t + 2], [19, t + 2], [20, t + 1], [21, t]].forEach(([x, y]) => D(x, y, '#f3cf72')); D(17, t + 3, '#f3cf72'); D(18, t + 3, '#c79a32'); D(17, t + 4, '#c79a32'); }
  }
  function topBack(t){
    if (look.top === 'hoodie') { Dspan(t, 13, 22, light(body, 0.1)); Dspan(t + 1, 14, 21, light(body, 0.1)); Dspan(t + 2, 15, 20, shadow(body, 0.2)); }
    else if (look.top === 'varsity') { Dspan(t + 12, 11, 24, ACE_GOLD); }
    else if (look.top === 'flannel') for (let y = t; y <= t + 12; y++) for (let x = 10; x <= 25; x++) if (part[y] && part[y][x] === 'top' && (x % 4 === 0 || y % 4 === 0)) D(x, y, '#5a1a16');
    else if (look.top === 'vest') for (let y = t + 3; y <= t + 12; y += 3) Dspan(y, 11, 24, shadow(body, 0.3));
    else if (look.top === 'polo' || look.top === 'oxford') { Dspan(t, 14, 21, light(body, 0.2)); }
    if (top.back) {
      // the company's letters across the shoulders, so the rep is branded walking up to the door
      const c = look.top === 'varsity' ? '#f7e2a8' : ACE_GOLD;
      LETTERS.forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(LETTER_X0 + i * 4 + rx, t + 3 + ry, c); })));
    }
  }

  // ================= hats =================
  function hatFront(dx){
    const y = HY + bob, hat = look.hat;
    if (hat === 'none' || !hat) return;
    const Hat = P('hat', hat === 'snapback' ? ACE_GOLD : hat === 'beanie' ? ACE_BLACK : hat === 'bucket' ? '#c9b48a' : hat === 'crown' ? '#f3c64e' : ACE_BLACK);
    const Brim = P('brim', hat === 'snapback' ? ACE_BLACK : hat === 'bucket' ? '#b39d72' : shadow(ACE_BLACK, 0.1));
    const sp = (put, yy, a, b) => span(put, yy, a + dx, b + dx);
    if (hat === 'cap' || hat === 'snapback' || hat === 'back') {
      sp(Hat, y - 3, 13, 22); sp(Hat, y - 2, 11, 24); sp(Hat, y - 1, 10, 25); sp(Hat, y, 9, 26); sp(Hat, y + 1, 9, 26); sp(Hat, y + 2, 9, 26);
      if (hat === 'back') { sp(Hat, y + 3, 9, 26); Dspan(y + 3, 15 + dx, 20 + dx, OUTLINE); D(15 + dx, y + 2, OUTLINE); D(20 + dx, y + 2, OUTLINE); Dspan(y + 2, 16 + dx, 19 + dx, skin); }
      else { sp(Brim, y + 3, 8, 27); sp(Brim, y + 4, 10, 25); const lg = hat === 'cap' ? ACE_GOLD : ACE_BLACK; capMarkRows().forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(16 + dx + rx, y - 1 + ry, lg); })); }
    }
    if (hat === 'beanie') { sp(Hat, y - 4, 14, 21); sp(Hat, y - 3, 12, 23); sp(Hat, y - 2, 10, 25); sp(Hat, y - 1, 9, 26); sp(Hat, y, 9, 26); sp(Brim, y + 1, 8, 27); sp(Brim, y + 2, 8, 27); sp(Brim, y + 3, 8, 27); Dspan(y + 1, 8 + dx, 27 + dx, ACE_GOLD); for (let x = 9; x <= 26; x += 2) D(x + dx, y + 2, shadow(ACE_BLACK, 0.3)); D(17 + dx, y - 5, ACE_GOLD); D(18 + dx, y - 5, ACE_GOLD); }
    if (hat === 'bucket') { sp(Hat, y - 3, 12, 23); sp(Hat, y - 2, 11, 24); sp(Hat, y - 1, 10, 25); sp(Hat, y, 10, 25); sp(Hat, y + 1, 10, 25); sp(Brim, y + 2, 7, 28); sp(Brim, y + 3, 6, 29); Dspan(y + 1, 10 + dx, 25 + dx, '#8a7650'); }
    if (hat === 'crown') { sp(Hat, y - 1, 11, 24); sp(Hat, y, 11, 24); sp(Hat, y + 1, 11, 24); [11, 14, 17, 18, 21, 24].forEach(x => { Hat(x + dx, y - 2); }); [11, 17, 18, 24].forEach(x => Hat(x + dx, y - 3)); Hat(14 + dx, y - 3); Hat(21 + dx, y - 3); D(14 + dx, y, '#d2402f'); D(21 + dx, y, '#d2402f'); D(17 + dx, y, '#3e7fd6'); D(18 + dx, y, '#3e7fd6'); }
  }
  function hatSide(){
    const y = HY + bob, hat = look.hat;
    if (hat === 'none' || !hat) return;
    const Hat = P('hat', hat === 'snapback' ? ACE_GOLD : hat === 'beanie' ? ACE_BLACK : hat === 'bucket' ? '#c9b48a' : hat === 'crown' ? '#f3c64e' : ACE_BLACK);
    const Brim = P('brim', hat === 'snapback' ? ACE_BLACK : hat === 'bucket' ? '#b39d72' : shadow(ACE_BLACK, 0.1));
    if (hat === 'cap' || hat === 'snapback' || hat === 'back') {
      span(Hat, y - 3, 13, 21); span(Hat, y - 2, 11, 23); span(Hat, y - 1, 10, 24); box(Hat, 10, y, 24, y + 2);
      if (hat === 'back') { span(Brim, y + 3, 5, 12); span(Brim, y + 2, 7, 10); }
      else { span(Brim, y + 3, 20, 29); span(Brim, y + 2, 24, 28); if (hat === 'cap') { D(19, y, ACE_GOLD); D(20, y, ACE_GOLD); D(19, y + 1, ACE_GOLD); } }
    }
    if (hat === 'beanie') { span(Hat, y - 4, 14, 20); span(Hat, y - 3, 12, 22); span(Hat, y - 2, 10, 24); box(Hat, 9, y - 1, 25, y); box(Brim, 9, y + 1, 25, y + 3); Dspan(y + 1, 9, 25, ACE_GOLD); }
    if (hat === 'bucket') { span(Hat, y - 3, 12, 22); box(Hat, 10, y - 2, 24, y + 1); span(Brim, y + 2, 7, 28); span(Brim, y + 3, 6, 29); }
    if (hat === 'crown') { box(Hat, 11, y - 1, 23, y + 1); [11, 15, 19, 23].forEach(x => { Hat(x, y - 2); Hat(x, y - 3); }); D(15, y, '#d2402f'); D(19, y, '#3e7fd6'); }
  }
  function hatBack(){
    const y = HY + bob, hat = look.hat;
    if (hat === 'none' || !hat) return;
    if (hat === 'back') { hatFront(0); return; }
    const Hat = P('hat', hat === 'snapback' ? ACE_GOLD : hat === 'beanie' ? ACE_BLACK : hat === 'bucket' ? '#c9b48a' : hat === 'crown' ? '#f3c64e' : ACE_BLACK);
    if (hat === 'cap' || hat === 'snapback') {
      span(Hat, y - 3, 13, 22); span(Hat, y - 2, 11, 24); span(Hat, y - 1, 10, 25); box(Hat, 9, y, 26, y + 3);
      Dspan(y + 3, 15, 20, OUTLINE); D(15, y + 2, OUTLINE); D(20, y + 2, OUTLINE); Dspan(y + 2, 16, 19, hair);
    } else hatFront(0);
  }

  // ================= build each view =================
  if (dir === 'down') {
    hairBackLayer('down');
    const liftL = step === 1 ? 2 : 0, liftR = step === 3 ? 2 : 0;
    legsFront(liftL, liftR);
    const t = torso();
    const sw = act === 'idle' && step ? (step === 1 ? 0 : 0) : 0;
    if (act === 'crossed') {
      box(ArmL, 7, t + 1, 9, t + 5); box(ArmR, 26, t + 1, 28, t + 5);
      const Fold = P('fold', shade(sleeve, -0.08));
      box(Fold, 9, t + 5, 26, t + 7);
      box(HandL, 9, t + 4, 11, t + 6); box(HandR, 24, t + 4, 26, t + 6);
    } else {
      armDown(7, ArmL, HandL, t, sw);
      if (act === 'attack') {
        // right arm straight out: the pitch, the point, the handshake
        for (let x = 26; x <= 31; x++) for (let y = t + 1; y <= t + 3; y++) (x - 26 < (top.sleeve === 'short' ? 3 : top.sleeve === 'none' ? 0 : 6) ? ArmR : SkinArmR)(x, y);
        box(HandR, 32, t, 34, t + 4); HandR(35, t + 1);
      } else if (act === 'win') {
        for (let y = HY + 5; y <= t; y++) for (let x = 26; x <= 28; x++) (t - y < (top.sleeve === 'short' ? 3 : top.sleeve === 'none' ? 0 : 12) ? ArmR : SkinArmR)(x, y);
        box(HandR, 26, HY + 1, 28, HY + 4); HandR(29, HY + 2);
      } else armDown(26, ArmR, HandR, t, sw);
    }
    const dx = L;
    headFront(dx);
    hairFront('down', dx);
    hatFront(dx);
    finish(() => {
      hairTexture(); topFront(t); faceFront(dx); shoeDetails('down');
      if (look.extra === 'watch') { D(7, t + 11, '#f3cf72'); D(8, t + 11, '#f3cf72'); D(9, t + 11, '#c79a32'); }
    });
  } else if (dir === 'up') {
    const liftL = step === 1 ? 2 : 0, liftR = step === 3 ? 2 : 0;
    legsFront(liftL, liftR);
    const t = torso();
    armDown(7, ArmL, HandL, t, 0);
    if (act === 'knock') {
      // right arm raised to the door, fist taps forward on frame 1
      const fy = HY + 8 - knock;
      for (let y = fy + 3; y <= t; y++) for (let x = 25; x <= 27; x++) (t - y < (top.sleeve === 'short' ? 3 : top.sleeve === 'none' ? 0 : 12) ? ArmR : SkinArmR)(x, y);
      box(HandR, 25, fy, 28, fy + 3);
    } else armDown(26, ArmR, HandR, t, 0);
    headFront(0);
    hairBackLayer('up');
    hairFront('up', 0);
    hatBack();
    finish(() => { hairTexture(); topBack(t); shoeDetails('up'); if (spec.top === 'none' || spec.top === 'buzz' || spec.fade) { D(8, HY + 10 + bob, skinD); D(27, HY + 10 + bob, skinD); } });
  } else {
    // side view, facing right (the street flips it for walking left)
    hairBackLayer('side');
    const by = 34 + bob;
    // far arm swings opposite the near arm, mostly hidden behind the body
    const swing = step === 1 ? 2 : step === 3 ? -2 : 0;
    const FarArm = P('farArm', shadow(sleeve, 0.25)), FarHand = P('farHand', skinD);
    for (let y = 23 + bob; y <= 32 + bob; y++) { const dx = Math.round(-swing * (y - 23 - bob) / 9); span(FarArm, y, 16 + dx, 18 + dx); }
    box(FarHand, 16 - swing, 33 + bob, 18 - swing, 34 + bob);
    // legs: far leg first (darker), then the near leg
    const FarLeg = P('farLeg', shadow(pc, 0.25)), FarShoe = P('farShoe', shadow(sc, 0.25));
    const legSlant = (put, shoe, k, skinPut) => {     // k: -1 back, 0 straight, 1 forward
      for (let y = by + 3; y <= 45; y++) {
        const dx = Math.round(k * 3 * (y - by - 3) / 8);
        if (shorts && y > by + 6) span(skinPut, y, 15 + dx, 18 + dx); else span(put, y, 14 + dx, 19 + dx);
      }
      const fx = 14 + k * 3;
      box(shoe, fx, 46, fx + 6, 47); span(shoe, 45, fx + 3, fx + 6);
    };
    const kNear = step === 1 ? 1 : step === 3 ? -1 : 0;
    if (kNear) legSlant(FarLeg, FarShoe, -kNear, P('farLegSkin', skinD));
    box(Pants, 13, by, 21, by + 2);
    legSlant(Pants, ShoeR, kNear, LegSkinR);
    // torso
    const t = 22 + bob;
    span(Top, t, 14, 21); for (let y = t + 1; y <= t + 12; y++) span(Top, y, 13, 22);
    if (top.sleeve === 'none') box(Skin, 16, t, 19, t + 2);
    // near arm
    const len = top.sleeve === 'short' ? 4 : top.sleeve === 'none' ? 0 : 11;
    if (act === 'knockside') {
      // near arm raised forward to the door, fist taps forward on frame 1
      box(top.sleeve === 'none' ? SkinArmR : ArmR, 16, t + 1, 18, t + 3);
      const sl = top.sleeve === 'long' ? 7 : top.sleeve === 'short' ? 3 : 0;
      for (let x = 19; x <= 27 + knock; x++) { const o = -Math.round((x - 19) / 4); box(x - 19 < sl ? ArmR : SkinArmR, x, t + 2 + o, x, t + 4 + o); }
      box(HandR, 28 + knock, t - 1, 30 + knock, t + 2);
    } else {
      for (let y = t + 1; y <= t + 11; y++) { const dx = Math.round(swing * (y - t - 1) / 10); span(y - t - 1 < len ? ArmR : SkinArmR, y, 16 + dx, 18 + dx); }
      box(HandR, 16 + swing, t + 12, 18 + swing, t + 13);
    }
    headSide();
    hairFront('side');
    hatSide();
    finish(() => {
      hairTexture(); faceSide(); shoeDetails('side');
      if (look.pants === 'joggers') for (let y = by + 1; y <= 44; y++) { const dx = Math.round(kNear * 3 * Math.max(0, y - by - 3) / 8); D(16 + dx, y, ACE_GOLD); }
      if (look.top === 'hoodie') { Dspan(t, 13, 16, light(body, 0.1)); Dspan(t + 1, 13, 14, light(body, 0.1)); }
      if (look.top === 'varsity') Dspan(t + 12, 13, 22, ACE_GOLD);
      if (look.top === 'zip' || look.top === 'polo' || look.top === 'tee' || look.top === 'oxford' || look.top === 'crew') Dspan(t, 18, 21, shadow(body, 0.25));
      if (look.extra === 'chain' || look.extra === 'both') { D(20, t, '#f3cf72'); D(21, t + 1, '#f3cf72'); D(21, t + 2, '#c79a32'); }
      if (look.top === 'flannel') for (let y = t; y <= t + 12; y++) for (let x = 13; x <= 22; x++) if (part[y][x] === 'top' && (x % 4 === 0 || y % 4 === 0)) D(x, y, '#5a1a16');
      if (look.top === 'blazer') { Dspan(t, 20, 22, '#f2f2f2'); D(21, t + 1, '#1a1a1f'); }
    });
  }

  // ---- shading, overlap lines, details, outline ----
  function finish(drawDetails){
    const out = col.map(r => r.slice());
    const z = (x, y) => (inb(x, y) && part[y][x]) ? zOf[part[y][x]] : -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = part[y][x]; if (!p) continue;
      const c = col[y][x];
      const same = (xx, yy) => inb(xx, yy) && part[yy][xx] === p;
      let v = c;
      if (!same(x + 1, y)) v = shadow(c, 0.3);
      else if (!same(x + 2, y) && p !== 'hair') v = shadow(c, 0.14);
      if (!same(x, y + 1)) v = shadow(v, 0.18);
      if (!same(x - 1, y) || !same(x, y - 1)) { if (v === c) v = light(c, 0.16); }
      // a darker line wherever this part sits in front of another one
      const myZ = zOf[p];
      const behind = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([xx, yy]) => { const zz = z(xx, yy); return zz >= 0 && zz < myZ && part[yy][xx] !== p; });
      if (behind) v = shadow(c, 0.42);
      out[y][x] = v;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) col[y][x] = out[y][x];
    drawDetails();
    details.forEach(([x, y, c]) => { if (inb(x, y) && col[y][x]) col[y][x] = c; });
  }

  // outline: any empty pixel touching the character becomes the outline color
  const res = col.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (col[y][x]) continue;
    if ((col[y - 1] && col[y - 1][x]) || (col[y + 1] && col[y + 1][x]) || col[y][x - 1] || col[y][x + 1]) res[y][x] = OUTLINE;
  }
  return res;
}


// ============ RIDES ============
const RIDES = {
  scooter: { lift:17, name:B + ' e-scooter' },
  segway:  { lift:15, name:'Segway' },
};
const RIDER_W = 84, RIDER_H = 68, RIDER_OX = 42, RIDER_OY = 65;
const hasRide = (look) => !!(look && RIDES[look.ride]);

function paintWheel(g, cx, cy, r, frame, col){
  const R = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const a0 = frame * 0.9;
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r + 0.35) continue;
    let c = d > r - 0.9 ? (dy < -r * 0.4 ? '#34343a' : '#121214') : col.tire;
    if (col.hub && d <= col.hub) {
      c = col.hubC;
      if (col.ring && d > col.hub - 1.1) c = col.ring;
      // spokes turn with the wheel
      const ang = Math.atan2(dy, dx) - a0, k = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      if (d > 0.9 && d < col.hub - 1.1 && k < 0.42) c = col.spoke;
      if (d <= 0.9) c = '#1a1a1e';
    }
    R(x, y, c);
  }
}

function paintRide(g, kind, ox, oy, frame){
  frame = frame || 0;
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, oy + y, w, h); };
  if (kind === 'segway') {
    const W = '#f2f3f5', W2 = '#c9ccd3', W3 = '#9ea3ad', BK = '#141416';
    // far wheel peeks out behind
    paintWheel(g, ox + 2.5, oy - 7.5, 7, frame + 0.5, { tire:'#0e0e10', hub:4.2, hubC:'#8a8e98', ring:'#245fa8', spoke:'#6d717b' });
    // knee stem up the middle and its black pad, a little ahead of the shins
    R(5, -27, 3, 13, '#0b0b0e'); R(6, -26, 1, 12, W); 
    R(4, -31, 6, 6, '#0b0b0e'); R(5, -30, 4, 4, '#26262b'); R(5, -30, 4, 1, '#3a3a41');
    paintWheel(g, ox, oy - 7, 7, frame, { tire:'#1b1b1f', hub:4.2, hubC:'#e9eaee', ring:'#3b9bff', spoke:'#b8bcc6' });
    // white body wrapped over the wheel, black foot pad on top
    R(-9, -16, 19, 1, '#0b0b0e');
    R(-8, -15, 17, 1, BK); R(-9, -15, 1, 3, '#0b0b0e'); R(9, -15, 1, 3, '#0b0b0e');
    R(-8, -14, 17, 1, W); R(-7, -13, 15, 1, W2); R(-6, -12, 13, 1, W3);
    R(-8, -14, 1, 1, W2); R(8, -14, 1, 1, W2); R(-8, -13, 1, 1, '#0b0b0e'); R(8, -13, 1, 1, '#0b0b0e');
    R(-1, -14, 3, 1, '#3b9bff');             // blue light strip
    return;
  }
  if (kind === 'scooter') {
    // v30: a beefy dual-motor e-scooter (black and Ace gold, big knobby tires, gold swingarms, LED deck)
    const K = '#0b0b0e', BK = '#1a1a1f', B2 = '#2a2a31', B3 = '#3a3a43', GD = '#daae5d', GL = '#f3d48a', GD2 = '#9c7a3a';
    const knobby = (cx, cy, r, f) => {
      paintWheel(g, cx, cy, r, f, { tire:'#131316', hub:3.6, hubC:'#2b2b31', ring:GD, spoke:'#c9c9cf' });
      for (let k = 0; k < 14; k++) {                // tread blocks turn with the wheel
        const an = k / 14 * Math.PI * 2 + f * 0.9;
        g.fillStyle = k % 2 ? '#2e2e34' : '#060607';
        g.fillRect(Math.round(cx + Math.cos(an) * (r + 0.3) - 0.5), Math.round(cy + Math.sin(an) * (r + 0.3) - 0.5), 1, 1);
      }
    };
    const fy = -7, rx = -15, frx = 17;
    knobby(ox + rx, oy + fy + 0.5, 6.4, frame);
    knobby(ox + frx, oy + fy + 0.5, 6.4, frame + 0.3);
    // fenders over both wheels
    R(rx - 4, -16, 9, 2, K); R(rx - 3, -15, 7, 1, B3);
    R(frx - 3, -16, 8, 2, K); R(frx - 2, -15, 6, 1, B3);
    // gold swingarms from the hubs up to the deck, with a spring on each
    for (let i = 0; i < 8; i++) { R(rx + 1 + i, fy - 1 - Math.round(i * 0.75), 2, 2, i % 3 === 2 ? GL : GD); }
    for (let i = 0; i < 7; i++) { R(frx - 1 - i, fy - 1 - Math.round(i * 0.9), 2, 2, i % 3 === 2 ? GL : GD); }
    R(rx + 5, -16, 1, 4, GL); R(rx + 6, -16, 1, 4, GD2);
    R(rx, fy - 1, 2, 2, GL); R(frx, fy - 1, 2, 2, GL);
    // chunky deck: black body, gold side rail, LED strip, red tail light
    R(-14, -18, 29, 1, K);
    R(-14, -17, 29, 1, BK); R(-14, -16, 29, 1, B3);
    R(-13, -15, 27, 2, BK);
    for (let x = -11; x < 12; x += 2) R(x, -14, 1, 1, ['#3bd1ff', '#9b5cff', '#ff4fb0', '#ffd35c'][((x + 11) / 2 + frame) & 3]);
    R(-13, -13, 27, 1, GD2); R(-12, -12, 25, 1, K);
    R(-15, -17, 1, 5, K); R(-15, -16, 1, 2, '#e8382f');                     // tail light
    // neck block where the stem meets the deck
    R(12, -22, 6, 6, K); R(13, -21, 4, 4, B2); R(13, -21, 4, 1, GD);
    // thick stem leaning back, gold folding clamp halfway up
    for (let i = 0; i < 19; i++) {
      const x = 14 - Math.round(i * 0.2);
      R(x - 1, -22 - i, 1, 1, K); R(x, -22 - i, 3, 1, i % 5 === 0 ? B3 : B2); R(x + 3, -22 - i, 1, 1, K);
    }
    R(11, -31, 6, 3, GD); R(12, -30, 4, 1, GL);
    // twin headlights on the stem
    R(17, -26, 4, 3, K); R(18, -25, 1, 1, '#fff6d8'); R(20, -25, 1, 1, '#fff6d8');
    // gold head tube, display and wide bars with grips
    R(9, -44, 7, 4, K); R(10, -43, 5, 2, GD);
    R(11, -46, 4, 2, K); R(12, -45, 2, 1, '#3bd1ff');                       // little display
    R(3, -42, 17, 2, K); R(4, -42, 15, 1, B3);
    R(1, -42, 4, 2, '#111'); R(18, -42, 4, 2, '#111');
    R(5, -44, 1, 2, '#c9c9cf'); R(17, -44, 1, 2, '#c9c9cf');                 // brake levers
    return;
  }
}

// a rider on (or beside) their ride, in an 84x68 canvas; mounted rides are drawn under the feet

return {
  SPR_W, SPR_H, OUTLINE, SKINS, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, FACES, GEAR, ALL_GEAR, DEFAULT_LOOK,
  RIDES, RIDER_W, RIDER_H, RIDER_OX, RIDER_OY,
  composeSprite, paintRide,
}
}
