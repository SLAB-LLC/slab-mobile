// ============ HOLIDAY SEASONS ============
// The street dresses up for eight holidays (Duncan, 2026-11-06). Each holiday has a limited hat and a
// limited outfit: keep a 7-day streak inside the window for the hat, and also earn 1,000 XP in the window for
// the outfit. Valentine's and St. Patrick's are one day: 200 XP that day for the hat, 500 for the outfit.
// Earned pieces are saved with the rep's look (look.limited) and stay in the locker for good.
const SEASON_DEFS = {
  thanksgiving:{ name:'Thanksgiving', hat:['pilgrim', 'Pilgrim hat'], top:['fallflannel', 'Fall flannel'] },
  hanukkah:{ name:'Hanukkah', hat:['hanukkahbeanie', 'Blue and white beanie'], top:['israel', 'Israel flag tee'] },
  xmas:{ name:'Christmas', hat:['santa', 'Santa hat'], top:['ugly', 'Ugly Christmas sweater'] },
  valentines:{ name:'Valentine’s Day', oneDay:true, hat:['boppers', 'Heart boppers'], top:['heart', 'Heart tee'] },
  stpats:{ name:'St. Patrick’s Day', oneDay:true, hat:['leprechaun', 'Leprechaun hat'], top:['shamrock', 'Shamrock tee'] },
  easter:{ name:'Easter', hat:['bunny', 'Bunny ears'], top:['spring', 'Spring button-up'] },
  fourth:{ name:'Fourth of July', hat:['unclesam', 'Uncle Sam top hat'], top:['starsstripes', 'Stars and stripes shirt'] },
  halloween:{ name:'Halloween', hat:['witch', 'Witch hat'], top:['skeleton', 'Skeleton hoodie'] },
};
const SEASON_GOALS = { streakDays:7, outfitXp:1000, dayHatXp:200, dayOutfitXp:500 };
// Hanukkah moves every year (first candle at sundown on the first date)
const HANUKKAH_DATES = { 2026:['2026-12-04', '2026-12-12'], 2027:['2027-12-24', '2028-01-01'], 2028:['2028-12-12', '2028-12-20'], 2029:['2029-12-01', '2029-12-09'], 2030:['2030-12-20', '2030-12-28'], 2031:['2031-12-09', '2031-12-17'] };
const dayKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const mkDay = (y, m, d) => new Date(y, m - 1, d);
function easterSunday(y){
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return mkDay(y, month, day);
}
// every holiday window that touches year y, as [key, first day, last day]
function seasonWindows(y){
  const tg = mkDay(y, 11, 1); while (tg.getDay() !== 4) tg.setDate(tg.getDate() + 1); tg.setDate(tg.getDate() + 21);   // 4th Thursday
  const tgEnd = new Date(tg); tgEnd.setDate(tg.getDate() + 3);
  const ea = easterSunday(y), palm = new Date(ea); palm.setDate(ea.getDate() - 7);
  const out = [['valentines', mkDay(y, 2, 14), mkDay(y, 2, 14)], ['stpats', mkDay(y, 3, 17), mkDay(y, 3, 17)], ['easter', palm, ea],
    ['fourth', mkDay(y, 6, 28), mkDay(y, 7, 4)], ['halloween', mkDay(y, 10, 15), mkDay(y, 10, 31)], ['thanksgiving', mkDay(y, 11, 1), tgEnd], ['xmas', mkDay(y, 12, 1), mkDay(y, 12, 31)]];
  [y - 1, y].forEach(hy => { const h = HANUKKAH_DATES[hy]; if (h) { const [a, b] = h.map(s => { const [Y, M, D] = s.split('-').map(Number); return mkDay(Y, M, D); }); out.push(['hanukkah', a, b]); } });
  return out;
}
// the holidays on now: one, or Hanukkah and Christmas together; a preview can be forced from the profile (super admins)
let seasonPreview = null;
try { seasonPreview = localStorage.getItem('slab.seasonPreview') || null; } catch (e) {}
function activeSeasons(now){
  if (seasonPreview && SEASON_DEFS[seasonPreview]) return [{ key:seasonPreview, from:now, to:now, preview:true }];
  now = now || new Date(); const t = dayKey(now);
  return seasonWindows(now.getFullYear()).filter(([, a, b]) => dayKey(a) <= t && t <= dayKey(b)).map(([key, from, to]) => ({ key, from, to }))
    .sort((a, b) => (a.key === 'hanukkah' ? 0 : 1) - (b.key === 'hanukkah' ? 0 : 1));
}

// ---- the limited pieces in the locker ----
const LIMITED = {};   // id -> { season, slot }
Object.entries(SEASON_DEFS).forEach(([key, s]) => {
  GEAR.hat.push({ id:s.hat[0], name:s.hat[1], xp:0, limited:key }); LIMITED[s.hat[0]] = { season:key, slot:'hat' };
  GEAR.top.push({ id:s.top[0], name:s.top[1], xp:0, limited:key }); LIMITED[s.top[0]] = { season:key, slot:'top' };
});
const limitedOwned = (id) => !!(ME.look && Array.isArray(ME.look.limited) && ME.look.limited.includes(id));
const limitedLocked = (id) => !!LIMITED[id] && !limitedOwned(id) && !(APP && APP.me && APP.me.superAdmin);
// in the locker: pieces you own, and the ones you can earn right now (super admins see them all)
const gearVisible = (g) => !g.limited || !limitedLocked(g.id) || activeSeasons().some(s => s.key === g.limited);
function limitedHint(id){
  const L = LIMITED[id], s = SEASON_DEFS[L.season], hat = L.slot === 'hat';
  if (s.oneDay) return `${s.name} only: earn ${hat ? SEASON_GOALS.dayHatXp : SEASON_GOALS.dayOutfitXp} XP that day`;
  return hat ? `${s.name} only: keep a ${SEASON_GOALS.streakDays}-day streak this holiday` : `${s.name} only: a ${SEASON_GOALS.streakDays}-day streak and ${SEASON_GOALS.outfitXp.toLocaleString()} XP this holiday`;
}

// ---- drawing: holiday hats and outfits over the normal sprite ----
const WEAR = (() => {
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const span = (g, y, x0, x1, c) => { g.fillStyle = c; g.fillRect(x0, y, x1 - x0 + 1, 1); };
  const O = '#140c0c';
  const topHat = (g, crown, band, brim, top, extra) => {
    for (let y = top; y <= 5; y++) { span(g, y, 10, 25, O); span(g, y, 11, 24, crown(y)); }
    span(g, top - 1, 11, 24, O);
    span(g, 3, 11, 24, band); span(g, 4, 11, 24, band);
    span(g, 6, 5, 30, O); span(g, 7, 5, 30, brim); span(g, 8, 6, 29, O);
    if (extra) extra(g);
  };
  const HATS = {
    santa(g){ const R = '#c8202a', r = '#8e141c', W = '#f4f1ea', w = '#cfc8bb';
      const rows = { '-4':[15,21], '-3':[12,24], '-2':[10,26], '-1':[9,28], 0:[8,29], 1:[8,30], 2:[8,30], 3:[8,27], 4:[8,27], 5:[8,27], 6:[8,27] };
      for (const [y, [a, b]] of Object.entries(rows)) { span(g, +y, a - 1, b + 1, O); span(g, +y, a, b, R); px(g, b, +y, r); }
      span(g, -5, 15, 21, O);
      [[29,3],[30,3],[29,4],[30,4],[30,5],[31,5]].forEach(([x,y]) => px(g, x, y, R));
      for (let y = 5; y <= 9; y++) for (let x = 30; x <= 34; x++) { const d = (x - 32) ** 2 + (y - 7) ** 2; if (d <= 5) px(g, x, y, d <= 2 ? W : w); else if (d <= 8) px(g, x, y, O); }
      span(g, 7, 6, 29, O); span(g, 8, 6, 29, W); span(g, 9, 6, 29, w); span(g, 10, 6, 29, O); for (let x = 8; x < 28; x += 3) px(g, x, 8, w); },
    witch(g){ const P = '#3a1f5c', p = '#24123b', B = '#ff8a1e';
      [[-9,22,23],[-8,21,24],[-7,20,24],[-6,19,24],[-5,18,24],[-4,17,24],[-3,16,24],[-2,15,24],[-1,14,25],[0,13,25],[1,12,25],[2,11,26],[3,11,26],[4,10,26],[5,10,27]].forEach(([y,a,b]) => { span(g, y, a - 1, b + 1, O); span(g, y, a, b, P); px(g, b, y, p); });
      span(g, -10, 22, 25, O); px(g, 25, -9, P); px(g, 26, -9, O); px(g, 26, -8, O);
      span(g, 4, 10, 26, B); span(g, 5, 10, 27, B); span(g, 4, 17, 19, '#ffd34a'); px(g, 18, 4, O);
      span(g, 6, 3, 32, O); span(g, 7, 2, 33, P); span(g, 8, 3, 32, p); span(g, 9, 4, 31, O); px(g, 6, 7, '#7be04a'); px(g, 28, 7, '#7be04a'); },
    bunny(g){ const W = '#f7f2ec', w = '#d9cfc4', K = '#f5a6c0';
      span(g, 3, 8, 27, O); span(g, 4, 8, 27, K); span(g, 5, 8, 27, O);
      const ear = (x0, top) => { for (let y = top; y <= 3; y++) { span(g, y, x0 - 1, x0 + 5, O); span(g, y, x0, x0 + 4, W); if (y > top + 1 && y < 2) span(g, y, x0 + 1, x0 + 3, K); px(g, x0 + 4, y, w); } span(g, top - 1, x0, x0 + 4, O); };
      ear(10, -12); ear(21, -10); },
    hanukkah(g){ const B = '#1f4fbf', b = '#163a8c', W = '#eef3ff', Y = '#ffd34a';
      const rows = { 0:[11,24], 1:[9,26], 2:[8,27], 3:[8,27], 4:[7,28], 5:[7,28], 6:[7,28] };
      for (const [y, [a, c]] of Object.entries(rows)) { span(g, +y, a - 1, c + 1, O); span(g, +y, a, c, +y % 3 === 1 ? W : B); px(g, c, +y, +y % 3 === 1 ? '#c9d4ee' : b); }
      span(g, -1, 11, 24, O);
      ['..X..','XXXXX','.X.X.','XXXXX','..X..'].forEach((r, j) => [...r].forEach((c, i) => { if (c === 'X') px(g, 16 + i, 1 + j, Y); }));
      span(g, 7, 6, 29, O); span(g, 8, 6, 29, W); span(g, 9, 6, 29, '#c9d4ee'); span(g, 10, 6, 29, O);
      for (let y = -5; y <= -1; y++) for (let x = 15; x <= 21; x++) { const d = (x - 18) ** 2 + (y + 3) ** 2; if (d <= 5) px(g, x, y, (x + y) % 2 ? W : '#c9d4ee'); else if (d <= 9) px(g, x, y, O); } },
    pilgrim(g){ topHat(g, () => '#1e1b1c', '#3a3536', '#1e1b1c', -6, (g) => { span(g, 3, 16, 20, '#e2b84a'); span(g, 4, 16, 20, '#e2b84a'); px(g, 18, 3, '#3a3536'); px(g, 18, 4, '#3a3536'); }); },
    unclesam(g){ topHat(g, (y) => '#f4f1ea', '#1f3fa8', '#1f3fa8', -8, (g) => { for (let y = -8; y <= 2; y++) for (let x = 12; x <= 24; x += 3) px(g, x, y, '#c8202a'); for (let x = 12; x <= 23; x += 3) { px(g, x, 3, '#ffffff'); px(g, x + 1, 4, '#ffffff'); } }); },
    leprechaun(g){ topHat(g, () => '#1f8a3a', '#141414', '#17702e', -6, (g) => { span(g, 3, 16, 20, '#ffd34a'); span(g, 4, 16, 20, '#ffd34a'); px(g, 18, 3, '#141414'); px(g, 18, 4, '#141414');
      [[23,-3],[24,-3],[22,-2],[23,-2],[24,-2],[25,-2],[23,-1],[24,-1],[24,0],[24,1]].forEach(([x,y]) => px(g, x + 1, y, '#52d16a')); }); },
    boppers(g){ const K = '#e0306a', P = '#ff8db6';
      span(g, 3, 8, 27, O); span(g, 4, 8, 27, '#e0306a'); span(g, 5, 8, 27, O);
      [[12,-1],[11,-3],[11,-5],[10,-7]].forEach(([x,y]) => { px(g, x, y, O); px(g, x, y + 1, O); });
      [[23,-1],[24,-3],[24,-5],[25,-7]].forEach(([x,y]) => { px(g, x, y, O); px(g, x, y + 1, O); });
      const heart = (cx, cy) => { [[-2,0],[-1,-1],[-1,0],[-1,1],[0,0],[0,1],[0,2],[1,-1],[1,0],[1,1],[2,0],[-2,-1],[2,-1]].forEach(([a,b]) => px(g, cx + a, cy + b, K)); px(g, cx - 1, cy - 1, P); };
      heart(10, -9); heart(25, -9); },
  };
  // outfits recolor the shirt; pattern(x, y) picks the color, the shirt's own shading is kept
  const tree = new Set(['18,25','17,26','18,26','19,26','16,27','17,27','18,27','19,27','20,27','15,28','16,28','17,28','18,28','19,28','20,28','21,28','18,29','18,30']);
  const ribs = (x, y) => (y === 25 || y === 27 || y === 29) && x >= 13 && x <= 24 && Math.abs(x - 18.5) > 1.2 || (x === 18 || x === 19) && y >= 23 && y <= 31;
  const SHAM = ['...XXX...','..XXXXX..','XX.XXX.XX','XXXX.XXXX','XXXXXXXXX','.XX.X.XX.','....X....','...X.....'];
  const HEART = ['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...'];
  const ISTAR = ['..X..','XXXXX','.X.X.','XXXXX','..X..'];
  const OUTFITS = {
    ugly:      (x, y) => y === 23 || y === 32 ? ((x + y) % 2 ? '#f4f1ea' : '#2f9a4a') : y === 24 || y === 31 ? ((x % 4 < 2) === (y === 24) ? '#2f9a4a' : '#b81f2a') : tree.has(x + ',' + y) ? (x === 18 && y === 25 ? '#ffd34a' : (x * 5 + y) % 7 === 0 ? '#ffd34a' : '#2f9a4a') : '#b81f2a',
    skeleton:  (x, y) => ribs(x, y) ? '#ece8dc' : '#1b1b20',
    spring:    (x, y) => (x === 18 || x === 19) ? ((y % 3 === 0) ? '#ffffff' : '#cdbcf2') : ((x * 3 + y * 5) % 11 === 0 ? ['#ffe27a', '#ff9ec4', '#ffffff'][(x + y) % 3] : '#b7a3e6'),
    israel: (x, y) => (y === 23 || y === 24 || y === 32 || y === 33) ? '#1f4fbf' : (ISTAR[y - 26] || '')[x - 16] === 'X' ? '#1f4fbf' : '#f4f6fb',
    flannel:   (x, y) => { const v = x % 4 === 0, h = y % 4 === 0; return v && h ? '#3a1a08' : v || h ? '#6b2f10' : (x + y) % 8 === 0 ? '#d07a2a' : '#b5561c'; },
    starsstripes: (x, y) => x <= 16 && y <= 27 ? ((x + y) % 2 === 0 && y % 2 === 0 ? '#ffffff' : '#1f3fa8') : y % 2 ? '#f4f1ea' : '#c8202a',
    shamrock:  (x, y) => (SHAM[y - 23] || '')[x - 14] === 'X' ? '#9cf09e' : '#2f9a46',
    heart:     (x, y) => (HEART[y - 25] || '')[x - 15] === 'X' ? '#d81b45' : '#f28bb3',
  };
  // warm clothes for the street's regulars at Christmas: a red scarf
  function scarf(g){ const R = '#c8202a', r = '#8e141c'; span(g, 21, 12, 24, O); span(g, 22, 12, 24, R); span(g, 23, 12, 24, r); for (let y = 24; y <= 28; y++) { px(g, 21, y, R); px(g, 22, y, r); } span(g, 29, 21, 22, '#f4f1ea'); }
  return { HATS, OUTFITS, scarf };
})();
const HAT_OF = { pilgrim:'pilgrim', hanukkahbeanie:'hanukkah', santa:'santa', boppers:'boppers', leprechaun:'leprechaun', bunny:'bunny', unclesam:'unclesam', witch:'witch' };
const TOP_OF = { fallflannel:'flannel', israel:'israel', ugly:'ugly', heart:'heart', shamrock:'shamrock', spring:'spring', starsstripes:'starsstripes', skeleton:'skeleton' };
const HAT_HEADROOM = 12;
const baseSpriteCanvas = spriteCanvas;
const wearCache = new Map();
const hasHolidayWear = (look) => look && (HAT_OF[look.hat] || TOP_OF[look.top] || look.scarf);
// the body with the holiday outfit swapped in for the shirt (no holiday hat yet)
function holidayBody(look, pose, mood, flash){
  const plain = { ...look, hat:HAT_OF[look.hat] ? 'none' : look.hat };
  const outfit = TOP_OF[look.top];
  if (!outfit) return baseSpriteCanvas(plain, pose, mood, flash);
  const a = baseSpriteCanvas({ ...plain, top:'crew' }, pose, mood, flash), b = baseSpriteCanvas({ ...plain, top:'oxford' }, pose, mood, flash);
  const c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d'); g.drawImage(a, 0, 0);
  const A = a.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data, B = b.getContext('2d').getImageData(0, 0, SPR_W, SPR_H).data;
  const diff = (i) => A[i] !== B[i] || A[i + 1] !== B[i + 1] || A[i + 2] !== B[i + 2];
  let ref = 0, n = 0; for (let i = 0; i < A.length; i += 4) if (diff(i)) { ref += A[i] + A[i + 1] + A[i + 2]; n++; }
  ref /= Math.max(1, n);
  const img = g.getImageData(0, 0, SPR_W, SPR_H), D = img.data;
  for (let y = 0; y < SPR_H; y++) for (let x = 0; x < SPR_W; x++) { const i = (y * SPR_W + x) * 4; if (!diff(i)) continue;
    const shade = Math.max(0.55, Math.min(1.25, (A[i] + A[i + 1] + A[i + 2]) / ref)), col = WEAR.OUTFITS[outfit](x, y);
    D[i] = Math.min(255, parseInt(col.slice(1, 3), 16) * shade); D[i + 1] = Math.min(255, parseInt(col.slice(3, 5), 16) * shade); D[i + 2] = Math.min(255, parseInt(col.slice(5, 7), 16) * shade); }
  g.putImageData(img, 0, 0);
  return c;
}
function wearHat(g, look){ const h = HAT_OF[look.hat]; if (h) WEAR.HATS[h](g); if (look.scarf) WEAR.scarf(g); }
// the sprite itself stays 36x52, so tall hats are cut at the top here; drawSprite and the rider add the headroom back
spriteCanvas = function(look, pose, mood, flash){
  if (!hasHolidayWear(look)) return baseSpriteCanvas(look, pose, mood, flash);
  const key = JSON.stringify([look, pose, mood, !!flash]); let c = wearCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H; const g = c.getContext('2d');
  g.drawImage(holidayBody(look, pose, mood, flash), 0, 0); wearHat(g, look);
  if (wearCache.size > 300) wearCache.clear(); wearCache.set(key, c); return c;
};
function tallSprite(look, pose, mood, flash){
  const key = JSON.stringify(['tall', look, pose, mood, !!flash]); let c = wearCache.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = SPR_W; c.height = SPR_H + HAT_HEADROOM; const g = c.getContext('2d');
  g.drawImage(holidayBody(look, pose, mood, flash), 0, HAT_HEADROOM); g.save(); g.translate(0, HAT_HEADROOM); wearHat(g, look); g.restore();
  wearCache.set(key, c); return c;
}
const baseDrawSprite = drawSprite;
drawSprite = function(canvas, look, opts){
  const o = Object.assign({ pose:'idle', mood:'happy', crop:'full', bob:0, flip:false }, opts);
  if (!look || !HAT_OF[look.hat] || (o.ride && o.crop === 'full' && hasRide(look))) return baseDrawSprite(canvas, look, opts);
  // crops that start at the top of the head reach up into the headroom so the hat isn't cut off
  const [cx, cy, cw, ch] = CROPS[o.crop], up = cy === 0 ? HAT_HEADROOM : 0;
  const ctx = canvas.getContext('2d'), s = Math.min(canvas.width / cw, canvas.height / (ch + up));
  const w = cw * s, h = (ch + up) * s, dx = (canvas.width - w) / 2, dy = (canvas.height - h) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false; ctx.save();
  if (o.flip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(tallSprite(look, o.pose, o.mood, o.flash), cx, cy + HAT_HEADROOM - up, cw, ch + up, dx, dy + o.bob * s, w, h);
  ctx.restore();
};
const baseRiderCanvas = riderCanvas;
riderCanvas = function(look, pose, mood, frame, mounted){
  const c = baseRiderCanvas(look, pose, mood, frame, mounted);
  if (!look || !HAT_OF[look.hat] || c.__hat) return c;
  // the rider has room above the head: draw the whole hat again on top of the cut one
  const ride = RIDES[look.ride] ? look.ride : null, oy = RIDER_OY - 49 - (ride && mounted ? RIDES[ride].lift : 0);
  const g = c.getContext('2d'); g.save(); g.translate(24, oy); wearHat(g, look); g.restore(); c.__hat = true;
  return c;
};

// ---- earning: checked when the app opens and every so often while it's open ----
let seasonDays = null, seasonDaysAt = 0;
async function seasonXpDays(since){
  if (seasonDays && Date.now() - seasonDaysAt < 60000) return seasonDays;
  const rows = await appCall('xpDays', { since });
  seasonDays = {}; (rows || []).forEach(r => { seasonDays[r.d] = (seasonDays[r.d] || 0) + (+r.xp || 0); }); seasonDaysAt = Date.now();
  return seasonDays;
}
async function checkSeasonUnlocks(){
  if (!APP || !ME.look || seasonPreview) return;
  const now = new Date(), live = activeSeasons(now); if (!live.length) return;
  const since = live.map(s => dayKey(s.from)).sort()[0];
  let days; try { days = await seasonXpDays(since); } catch (e) { return; }
  const owned = new Set(ME.look.limited || []), got = [];
  live.forEach(({ key, from }) => {
    const def = SEASON_DEFS[key], today = dayKey(now);
    let hat = false, outfit = false;
    if (def.oneDay) { const xp = days[today] || 0; hat = xp >= SEASON_GOALS.dayHatXp; outfit = xp >= SEASON_GOALS.dayOutfitXp; }
    else {
      let run = 0, best = 0, total = 0;
      for (const d = new Date(from); dayKey(d) <= today; d.setDate(d.getDate() + 1)) { const xp = days[dayKey(d)] || 0; total += xp; run = xp > 0 ? run + 1 : 0; best = Math.max(best, run); }
      hat = best >= SEASON_GOALS.streakDays; outfit = hat && total >= SEASON_GOALS.outfitXp;
    }
    if (hat && !owned.has(def.hat[0])) { owned.add(def.hat[0]); got.push(def.hat[1]); }
    if (outfit && !owned.has(def.top[0])) { owned.add(def.top[0]); got.push(def.top[1]); }
  });
  if (!got.length) return;
  ME.look.limited = [...owned]; saveMe();
  got.forEach((n, i) => setTimeout(() => { showToast('Unlocked: ' + n + ' (limited)', 'ph-star'); haptic('success'); }, i * 2600));
}
if (APP) { setTimeout(checkSeasonUnlocks, 2500); setInterval(checkSeasonUnlocks, 90000); document.addEventListener('visibilitychange', () => { if (!document.hidden) checkSeasonUnlocks(); }); }

// ---- the street ----
const SEASON_YELLS = {
  xmas:'It’s CHRISTMAS, you #@$%! Go home!',
  halloween:'No candy for salesmen! @#$%!',
  easter:'Why the ^#&$ are you knocking on Easter!',
  hanukkah:'Eight nights and you ruin every one! #@$%',
  thanksgiving:'I’m carving a turkey, not buying pest control! $#@!',
  fourth:'It’s Independence Day! I’m independent of YOU! #@$%',
  stpats:'Not even the luck of the Irish closes me! $#@%',
  valentines:'Go knock on your girlfriend’s door! #@$%!',
};
const SEASON_LIGHTS = { xmas:['#ff3b3b','#3bd16f','#ffd34a','#4aa8ff'], halloween:['#ff8a1e','#a35bff'], easter:['#ffb3d1','#b3e5ff','#fff2a8','#c8f7c5'], hanukkah:['#4a8cff','#ffffff'],
  thanksgiving:['#ffd27a'], fourth:['#ff3b3b','#ffffff','#3b6bff'], stpats:['#3bd16f','#ffd34a'], valentines:['#ff5c8a','#ffffff','#ff2a55'] };
const SEASON_GROUND = { xmas:(r,g,b) => { const l = (r + g + b) / 3, v = Math.min(255, 52 + l * 1.25); return [v * 0.80, v * 0.86, v]; },
  halloween:(r,g,b) => [r * 1.1 + 10, g * 0.8, b * 1.25 + 14], easter:(r,g,b) => [r * 1.5 + 22, g * 1.75 + 30, b * 1.1 + 8],
  hanukkah:(r,g,b) => [r * 0.9, g * 1.05 + 4, b * 1.3 + 9], thanksgiving:(r,g,b) => [r * 1.55 + 16, g * 1.12 + 4, b * 0.6],
  fourth:(r,g,b) => [r * 1.1, g * 1.45 + 14, b * 0.9], stpats:(r,g,b) => [r * 0.7, g * 1.6 + 16, b * 0.95 + 4], valentines:(r,g,b) => [r * 1.15 + 8, g * 1.05, b * 1.1 + 4] };
// look knobs: lights along the house fronts too, and how thick the fall leaves lie
const SEASON_STYLE = { frontLights:false, leafDensity:0.020 };
const SEASON_SCATTER = { easter:[['#ffb3d1','#ffe27a','#ffffff','#b9a6ff','#ff9ec4'], 0.010, 'flower'], thanksgiving:[['#e2621c','#c8341a','#f2b134','#a8461a'], SEASON_STYLE.leafDensity, 'leaf'],
  stpats:[['#7be06a','#52c45a'], 0.006, 'clover'], valentines:[['#ff2a55','#ff8db6'], 0.008, 'petal'], hanukkah:[['#d8e6ff'], 0.004, 'dot'] };
const FALL_LEAVES = ['#c8341a','#e2621c','#f2b134','#a8461a','#d84a1e'];
// each fall tree gets one look: the mixed brown, or a yellow, orange or red one
const FALL_TREES = [FALL_LEAVES, ['#f2c230','#e8a81c','#ffd75a'], ['#e8741c','#d4581a','#f29a3a'], ['#c8281a','#a81e18','#e04a2a'], FALL_LEAVES];
const sPx = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
const sGrid = (rows, pal) => (g) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) sPx(g, x, y, pal[ch]); }));
const SO = '#140c0c';
const SEASON_ART = (() => { const O = SO, px = sPx, grid = sGrid; return {

    pumpkin: grid(['.....g.....','....gg.....','..OOOOOOO..','.OBBbBBbBO.','OBYBbBBYBbO','OBYYbBYYBbO','OBBbBBbBBbO','OBbYYYYYbbO','.OBbBBbBBO.','..OOOOOOO..'], { O, B:'#ff8a1e', b:'#c85e08', Y:'#ffe34a', g:'#3a7a2a' }),
    cane: grid(['.WRW.','R...W','W...R','....W','....R','....W','....R','....W','....R','....W','....R','....W'], { W:'#ffffff', R:'#e02a2a' }),
    pumpkinPlain: grid(['.....g.....','....gg.....','..OOOOOOO..','.OBBbBBbBO.','OBBBbBBBBbO','OBBBbBBBBbO','OBBbBBbBBbO','OBbBBbBBbbO','.OBbBBbBBO.','..OOOOOOO..'], { O, B:'#e8842a', b:'#b8601a', g:'#5a6a2a' }),
    gourds: grid(['..g.......t..','.OYO....OOWO.','OYyYO..OWwWWO','OYYyO..OWWwWO','.OOO....OOOO.'], { O, Y:'#f2c23a', y:'#c8962a', W:'#7aa84a', w:'#e8e2b0', g:'#5a6a2a', t:'#5a6a2a' }),
    menorahTable: (g) => {
      const M = ['......f......','f.f.f.W.f.f.f','W.W.W.W.W.W.W','W.W.W.W.W.W.W','W.W.W.W.W.W.W','YYYYYYYYYYYYY','......Y......','......Y......','....YYYYY....'];
      M.forEach((r, y) => [...r].forEach((ch, x) => { const c = { f:'#ffb02e', W:'#eef3ff', Y:'#ffd34a' }[ch]; if (c) px(g, x + 5, y, c); }));
      // a small round table with a blue cloth
      for (let y = 9; y < 14; y++) for (let x = 1; x < 22; x++) { const e = ((x - 11) / 10) ** 2 + ((y - 11) / 2.6) ** 2; if (e <= 1) px(g, x, y, e > 0.7 ? '#163a8c' : '#1f4fbf'); }
      for (let y = 13; y < 17; y++) for (let x = 2; x < 21; x++) if ((x - 2) % 6 === 0 || y === 13) px(g, x, y, y === 13 ? '#163a8c' : '#eef3ff');
      [[5, 17], [11, 18], [17, 17]].forEach(([x, y]) => { for (let k = 0; k < 6; k++) px(g, x, y + k, '#4a2e1a'); });
    },
    dinner: (g) => {
      const W = 60, H = 44, R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      // the table top in the street's 2:1 angle, long side running like the houses
      const A = [6, 24], B = [38, 8], C = [54, 16], D = [22, 32];
      const inTop = (x, y) => { const cross = (p, q) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]); return cross(A, B) >= 0 && cross(B, C) >= 0 && cross(C, D) >= 0 && cross(D, A) >= 0; };
      // legs and the cloth hanging over the near edges
      [[7, 25], [22, 33], [53, 17]].forEach(([x, y]) => R(x, y, 2, 9, '#4a2e1a'));
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (!inTop(x, y) && inTop(x, y - 3) && (x < 22 ? y > 24 : y > 16)) px(g, x, y, x < 22 ? '#c9c1b0' : '#b3ab9a');
      for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (inTop(x, y)) px(g, x, y, (x + 2 * y) % 9 === 0 ? '#e9e2d0' : '#f4efe2');
      // a runner down the middle
      for (let t = 0; t < 1; t += 0.01) { const x = Math.round(14 + t * 32), y = Math.round(27 - t * 16); R(x, y - 1, 2, 3, '#b8601a'); }
      // plates along both long sides
      const plate = (x, y) => { R(x - 2, y, 5, 2, '#ffffff'); R(x - 1, y - 1, 3, 1, '#ffffff'); px(g, x, y, '#e2b84a'); };
      [[14, 21], [22, 17], [30, 13], [22, 29], [30, 25], [38, 21]].forEach(([x, y]) => plate(x, y));
      // the turkey on its platter
      R(24, 19, 11, 4, '#d6d1c4'); R(26, 16, 7, 5, '#9a5a24'); R(27, 15, 5, 1, '#b8743a'); R(25, 18, 2, 2, '#9a5a24'); R(32, 18, 2, 2, '#9a5a24'); px(g, 24, 17, '#f4efe2'); px(g, 34, 17, '#f4efe2'); px(g, 28, 16, '#d08a4a');
      // pie, corn, cranberries, candles
      R(40, 12, 5, 3, '#c87a2a'); R(41, 12, 3, 1, '#e8a24a');
      R(15, 25, 4, 2, '#f2c23a'); px(g, 18, 25, '#7aa84a');
      R(44, 16, 3, 2, '#c8203a');
      [[20, 23], [36, 15]].forEach(([x, y]) => { R(x, y - 5, 1, 5, '#f4efe2'); px(g, x, y - 6, '#ffb02e'); px(g, x, y - 7, '#ffe27a'); });
    },
    turkey: (g, frame) => {
      const O = '#140c0c';
      // a big fanned tail behind him
      const fan = ['#7a3a14', '#c8341a', '#e2621c', '#f2b134', '#e2621c', '#c8341a', '#7a3a14'];
      for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) { const dx = x - 7, dy = y - 11, r = Math.hypot(dx, dy); if (r > 9.5 || dy > 0) continue;
        if (r > 8.6) { px(g, x, y, O); continue; } const band = Math.floor(r / 2.2), ray = Math.floor((Math.atan2(dy, dx) + Math.PI) / Math.PI * 7) % fan.length; px(g, x, y, r > 6.5 ? fan[(ray + 3) % fan.length] : fan[(band + ray) % fan.length]); }
      // body and wing
      for (let y = 8; y < 16; y++) for (let x = 4; x < 16; x++) { const e = ((x - 10) / 6) ** 2 + ((y - 12) / 3.8) ** 2; if (e <= 1) px(g, x, y, e > 0.8 ? O : x < 9 && y < 13 ? '#4a2a14' : '#6b3a1a'); }
      for (let x = 7; x < 12; x++) px(g, x, 11, '#8a5a2a');
      // neck, head, beak and wattle
      [[15, 9], [16, 8], [16, 7], [17, 6], [17, 5], [18, 5], [18, 6]].forEach(([x, y]) => px(g, x, y, '#a88a7a'));
      px(g, 18, 5, O); px(g, 19, 6, '#e8a22a'); px(g, 18, 7, '#e02a2a'); px(g, 18, 8, '#e02a2a'); px(g, 17, 4, O); px(g, 18, 4, O);
      const l = frame ? 1 : 0; for (let k = 0; k < 3; k++) { px(g, 9 + l, 16 + k, '#e8a22a'); px(g, 12 - l, 16 + k, '#e8a22a'); }
      px(g, 8 + l, 18, '#e8a22a'); px(g, 13 - l, 18, '#e8a22a');
    },
    tomb: grid(['.GGGGG.','GGGgGGG','GGgggGG','GGGgGGG','GGGgGGG','GGGGGGG','GGGGGGG','ggggggg'], { G:'#8a8f99', g:'#5b606a' }),
    menorah: grid(['......f......','f.f.f.W.f.f.f','W.W.W.W.W.W.W','W.W.W.W.W.W.W','W.W.W.W.W.W.W','YYYYYYYYYYYYY','......Y......','......Y......','....YYYYY....'], { f:'#ffb02e', W:'#eef3ff', Y:'#ffd34a' }),
    hay: grid(['OOOOOOOOOOO','OHhHHhHHhHO','OHHhHHHhHHO','OhHHhHHHhHO','OHHHHhHHHHO','OOOOOOOOOOO'], { O:'#6a4a14', H:'#e2b84a', h:'#b8902e' }),
    flag: grid(['PBBbRRRR','PBbBWWWW','PBBbRRRR','PWWWWWWW','PRRRRRRR','P.......','P.......','P.......','P.......','P.......'], { P:'#d6d1c4', B:'#1f3fa8', b:'#ffffff', R:'#c8202a', W:'#f4f1ea' }),
    gold: grid(['..y.Y.y..','.YyYYyYY.','.OOOOOOO.','OKKKKKKKO','OKkKKKkKO','.OKKKKKO.','..OOOOO..'], { O, Y:'#ffd34a', y:'#ffe98a', K:'#2a2a30', k:'#44444c' }),
    balloon: grid(['.RR.RR.','RrRRRRR','RRRRRRR','.RRRRR.','..RRR..','...R...','...S...','...S...','....S..','....S..','...S...','...S...'], { R:'#e0306a', r:'#ff9cc0', S:'#d6d1c4' }),
    cross: (g) => { const Wd = '#7a4a26', wd = '#5a3418', hi = '#9a6436', C = '#f4f1ea', c = '#d4cfc4', L = '#ffffff', st = '#3f8a3a', lf = '#2f6e2c', Or = '#ff9a2e';
      const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      R(11, 2, 6, 38, O); R(12, 3, 4, 37, Wd); R(12, 3, 1, 37, hi); R(15, 3, 1, 37, wd);           // upright
      R(2, 10, 24, 6, O); R(3, 11, 22, 4, Wd); R(3, 11, 22, 1, hi); R(3, 14, 22, 1, wd);             // crossbar
      R(3, 10, 22, 2, C); [[3,12],[4,12],[4,13],[23,12],[24,12],[23,13]].forEach(([x,y]) => px(g, x, y, C));   // cloth over the bar
      for (let y = 12; y < 26; y++) { R(3 + ((y / 5) | 0) % 2, y, 3, 1, y % 3 ? C : c); R(22 - ((y / 6) | 0) % 2, y, 3, 1, y % 3 ? C : c); }   // tails hanging down both sides
      for (let x = 7; x <= 20; x++) { const sag = Math.round(3 * Math.sin((x - 7) / 13 * Math.PI)); R(x, 12 + sag, 1, 2, x % 2 ? C : c); }     // the swag in the middle
      // lilies at the foot
      [[8,33],[19,32],[13,30]].forEach(([x, y]) => { R(x + 1, y + 2, 1, 40 - y - 2, st); px(g, x, y + 4, lf); px(g, x + 2, y + 5, lf);
        px(g, x, y, L); px(g, x + 1, y, L); px(g, x + 2, y, L); px(g, x - 1, y - 1, L); px(g, x + 3, y - 1, L); px(g, x + 1, y + 1, L); px(g, x + 1, y - 1, Or); });
      R(5, 38, 18, 2, lf); [[6,37],[9,36],[18,36],[21,37],[14,37]].forEach(([x,y]) => px(g, x, y, st)); },
  };
})();
// which holiday a house dresses for: when two overlap, every other house takes the second one
const stopSeason = (list, s) => list[s.i % list.length].key;
let streetSeasons = [];
function decorateRoof(s){
  if (!streetSeasons.length) return;
  const season = stopSeason(streetSeasons, s), snow = streetSeasons.some(x => x.key === 'xmas'), lights = SEASON_LIGHTS[season];
  const c = s.canvas, g = c.getContext('2d'), W = c.width, H = c.height, d = g.getImageData(0, 0, W, H).data;
  const top = []; for (let x = 0; x < W; x++) { let y = 0; while (y < H && !d[(y * W + x) * 4 + 3]) y++; top[x] = y; }
  for (let x = 0; x < W; x++) { const y = top[x]; if (y >= H) continue;
    if (snow) { sPx(g, x, y, '#f2f6ff'); sPx(g, x, y + 1, '#dfe7f5'); if (x % 5 === 0) sPx(g, x, y + 2, '#dfe7f5'); }
    if (x % 4 === 1 && Math.abs(top[x + 1] - y) < 3) { const col = lights[(((x / 4) | 0) + s.i) % lights.length], yy = y + (snow ? 2 : 1);
      g.globalAlpha = 0.35; g.fillStyle = col; g.fillRect(x - 1, yy - 1, 4, 4); g.globalAlpha = 1; g.fillRect(x, yy, 2, 2); } }
  if (SEASON_STYLE.frontLights && s.geo && ISO_STYLES[s.geo.style]) { // a strand hung under the front eaves, following the roof's own edge
    const sp = ISO_STYLES[s.geo.style], { U, V, ox, oy } = s.geo, Hw = sp.H, o = sp.roof === 'flat' ? 0 : 4;
    const ridgeU = sp.roof === 'gable' && ((sp.ridge === 'par') === (s.geo.front === 'L'));
    const zAt = (u, v) => { if (sp.roof === 'flat') return Hw + 1;
      if (sp.roof === 'gable') { const half = (ridgeU ? V : U) / 2, dd = ridgeU ? Math.abs(v - V / 2) : Math.abs(u - U / 2); return Hw + sp.Hr * (1 - dd / half); }
      const k = sp.Hr / (Math.min(U, V) / 2); return Hw + Math.min(sp.Hr, k * Math.min(u, U - u, v, V - v)); };
    const bulb = (u, v, n) => { const x = Math.round(u - v + ox), y = Math.floor((u + v) / 2 - zAt(u, v)) + oy + 3, col = lights[(n + s.i) % lights.length];
      g.globalAlpha = 0.35; g.fillStyle = col; g.fillRect(x - 1, y - 1, 4, 4); g.globalAlpha = 1; g.fillRect(x, y, 2, 2); };
    let n = 0; for (let u = -o + 1; u <= U + o - 1; u += 4) bulb(u, V + o, n++);
    for (let v = V + o - 3; v >= -o + 1; v -= 4) bulb(U + o, v, n++); }
  if (season === 'xmas') { const dx = Math.round(s.door.x - s.left), dy = Math.round(s.door.y - s.top);
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const r = x * x + y * y; if (r >= 4 && r <= 10) sPx(g, dx + x, dy - 15 + y, (x + y) % 2 ? '#2f9a4a' : '#1f6a32'); }
    [[0,3],[-1,4],[1,4]].forEach(([x, y]) => sPx(g, dx + x, dy - 15 + y, '#e02a2a')); }
}
const basePaintStop = paintStop;
paintStop = function(s){ basePaintStop(s); decorateRoof(s); };
const basePaintPond = paintPond;
paintPond = function(canvas, kind, t){
  basePaintPond(canvas, kind, t);
  if (!streetSeasons.some(x => x.key === 'xmas')) return;
  // frozen over at Christmas
  const g = canvas.getContext('2d'), id = g.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const x = (i / 4) % canvas.width, y = (i / 4 / canvas.width) | 0;
    if (d[i + 2] > d[i] + 10 && d[i + 2] >= d[i + 1] - 5) { const streak = (x + y * 2) % 13 === 0 || (x - y * 3) % 17 === 0; d[i] = streak ? 236 : 168; d[i + 1] = streak ? 245 : 200; d[i + 2] = streak ? 252 : 224; }
    else if (d[i + 1] > d[i] && d[i + 1] > d[i + 2]) { d[i] = 220; d[i + 1] = 228; d[i + 2] = 240; } }
  g.putImageData(id, 0, 0);
};
// the regulars bundle up for Christmas
const NPC_WARM = { top:'vest', hat:'beanie', scarf:true };
const NPC_BASE = { fisher:{ ...FISHER_LOOK }, bench:{ ...BENCH_GUY } };
function dressNpcs(){
  const xmas = streetSeasons.some(x => x.key === 'xmas');
  Object.assign(FISHER_LOOK, NPC_BASE.fisher, xmas ? NPC_WARM : {}); Object.assign(BENCH_GUY, NPC_BASE.bench, xmas ? { ...NPC_WARM, top:'zip' } : {});
  if (!xmas) { delete FISHER_LOOK.scarf; delete BENCH_GUY.scarf; }
}
function decorateStreet(){
  const wrap = $('path-wrap'), S = street.S, list = streetSeasons;
  wrap.querySelectorAll('.st-season').forEach(e => e.remove());
  if (!list.length) return;
  const keys = list.map(x => x.key), main = keys.includes('xmas') ? 'xmas' : keys[0];
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const sprite = (w, h, x, y, z, paint, k = 1.7) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.className = 'st-season'; c.setAttribute('aria-hidden', 'true'); paint(c.getContext('2d'));
    Object.assign(c.style, { left:Math.round(x * S) + 'px', top:Math.round((y - h * (k - 1)) * S) + 'px', width:Math.round(w * S * k) + 'px', height:Math.round(h * S * k) + 'px', zIndex:z });
    wrap.appendChild(c); return c; };
  // stoops (dropped onto the ground in front so nothing sits on the wall)
  const STOOP_DROP = 12;
  street.stops.forEach((s, i) => {
    const season = stopSeason(list, s), z = s.z + 5000, side = s.flip ? -1 : 1;
    const at = (dist, up, w, h, paint, k) => sprite(w, h, s.stand.x + (side < 0 ? -dist - w : dist), s.stand.y - up + STOOP_DROP, z, paint, k);
    if (season === 'halloween') at(6, 8, 11, 10, SEASON_ART.pumpkin);
    if (season === 'easter') ['#ff9ec4','#9ed8ff','#ffe27a','#a8f0a0'].forEach((col, k) => sprite(4, 6, s.stand.x + side * (14 + k * 6) - 2, s.stand.y - 3 + (k % 2) * 3, z, (g) => { for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) if (((x - 1.5) / 2) ** 2 + ((y - 3.2) / 3) ** 2 <= 1) sPx(g, x, y, y === 3 ? '#ffffff' : col); }));
    if (season === 'thanksgiving') { at(6, 6, 11, 6, SEASON_ART.hay); at(9, 13, 11, 10, SEASON_ART.pumpkinPlain, 1.2); if (i % 2) at(20, 5, 13, 5, SEASON_ART.gourds, 1.2); }
    if (season === 'fourth' && i % 2 === 1) at(6, 16, 8, 10, SEASON_ART.flag);
    if (season === 'valentines' && i % 2 === 0) at(6, 20, 7, 12, SEASON_ART.balloon);
  });
  // along the walk
  for (let k = 0; k < street.stops.length - 1; k++) { const a = isoPt(street.verts[k].u, street.verts[k].v), b2 = isoPt(street.verts[k + 1].u, street.verts[k + 1].v);
    for (const t of [0.3, 0.7]) { const x = a.x + (b2.x - a.x) * t, y = a.y + (b2.y - a.y) * t;
      if (keys.includes('xmas')) sprite(5, 12, x + 6, y - 12, objZ(0, 0) + 1, SEASON_ART.cane);
      if (main === 'halloween' && (k + (t > 0.5)) % 3 === 0) sprite(7, 8, x + 10, y - 8, 1, SEASON_ART.tomb);
      if (main === 'fourth' && (k + (t > 0.5)) % 2 === 0) sprite(8, 10, x + 8, y - 10, 1, SEASON_ART.flag, 1); } }
  // pieces that stand out in the yards (yard k, a along its walkway, b back from it, in the street's own units)
  const f = street.L / 180;
  const yardPt = (k, a, b) => { const q = street.verts[k]; return k % 2 === 0 ? { u:q.u + a * f, v:q.v - b * f } : { u:q.u - b * f, v:q.v + a * f }; };
  const inYard = (k, a, b, w, h, ax, ay, paint, scale = 1) => { if (!street.verts[k] || k >= street.stops.length - 1) return;
    const q = yardPt(k, a, b), p = isoPt(q.u, q.v), x0 = p.x - ax * scale, y0 = p.y - ay * scale;
    wrap.querySelectorAll('.st-tree').forEach(t => { const tl = parseFloat(t.style.left) / S, tt = parseFloat(t.style.top) / S, tw = parseFloat(t.style.width) / S, th = parseFloat(t.style.height) / S;
      if (tl < x0 + w * scale && tl + tw > x0 && tt + th > y0 + h * scale * 0.4 && tt + th < y0 + h * scale + 16) t.style.visibility = 'hidden'; });
    const c = sprite(w, h, x0, y0 + h * (scale - 1), objZ(q.u, q.v), paint, scale); return c; };
  if (keys.includes('hanukkah')) [3, 8, 13, 17].forEach(k => inYard(k, 52, 46, 23, 23, 11, 22, SEASON_ART.menorahTable, 2.1));
  if (main === 'thanksgiving') {
    inYard(17, 50, 44, 60, 44, 30, 36, SEASON_ART.dinner, 1.9);
    // a turkey that wanders its yard and gobbles, like the dogs
    [6, 14].forEach(k => { if (k >= street.stops.length - 1) return; const c = document.createElement('canvas'); c.className = 'st-dog st-season'; c.setAttribute('aria-hidden', 'true');
      c.style.width = Math.round(25 * S) + 'px'; c.style.height = Math.round(23 * S) + 'px'; wrap.appendChild(c);
      const d = { el:c, k, a0:24 * f, a1:70 * f, b:58 * f, a:44 * f, dir:1, pause:6, frame:0, kind:'turkey' }; street.dogs.push(d); moveDog(d);
      // clear the trees along his walk
      const p0 = isoPt(yardPt(k, 24, 58).u, yardPt(k, 24, 58).v), p1 = isoPt(yardPt(k, 70, 58).u, yardPt(k, 70, 58).v);
      wrap.querySelectorAll('.st-tree').forEach(t => { const bx = (parseFloat(t.style.left) + parseFloat(t.style.width) / 2) / S, by = (parseFloat(t.style.top) + parseFloat(t.style.height)) / S;
        if (bx > Math.min(p0.x, p1.x) - 16 && bx < Math.max(p0.x, p1.x) + 16 && by > Math.min(p0.y, p1.y) - 10 && by < Math.max(p0.y, p1.y) + 26) t.style.visibility = 'hidden'; }); });
  }
  // the ground
  const GT = SEASON_GROUND[main], SC = SEASON_SCATTER[main];
  const gr = street.ground, gg = gr.getContext('2d'), gd = gg.getImageData(0, 0, gr.width, gr.height), D = gd.data, Wg = gr.width, grass = new Uint8Array(D.length / 4);
  for (let i = 0; i < D.length; i += 4) { const r = D[i], g = D[i + 1], b = D[i + 2]; if (g > r && g >= b) { grass[i / 4] = 1; const [nr, ng, nb] = GT(r, g, b); D[i] = Math.min(255, nr); D[i + 1] = Math.min(255, ng); D[i + 2] = Math.min(255, nb); } }
  if (SC) { const [cols, dens, kind] = SC; const put = (x, y, c) => { const j = y * Wg + x; if (x < 0 || x >= Wg || !grass[j]) return; D[j * 4] = parseInt(c.slice(1,3),16); D[j * 4 + 1] = parseInt(c.slice(3,5),16); D[j * 4 + 2] = parseInt(c.slice(5,7),16); };
    for (let j = 0; j < grass.length; j++) { if (!grass[j] || rnd() > dens) continue; const x = j % Wg, y = (j / Wg) | 0, c = cols[(rnd() * cols.length) | 0];
      if (kind === 'flower') { put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, '#3f8a3a'); put(x, y, '#ffe27a'); }
      else if (kind === 'leaf') { put(x, y, c); put(x + 1, y, c); if (rnd() < 0.5) put(x, y + 1, c); }
      else if (kind === 'clover') { put(x, y, c); put(x + 1, y, c); put(x, y + 1, c); put(x + 1, y + 1, '#2f8a3a'); }
      else put(x, y, c); } }
  gg.putImageData(gd, 0, 0);
  // trees
  wrap.querySelectorAll('.st-tree').forEach((c, n) => { const g = c.getContext('2d'), W = c.width, H = c.height, id = g.getImageData(0, 0, W, H), d = id.data;
    if (main === 'thanksgiving') { for (let i = 0; i < d.length; i += 4) { if (!d[i + 3] || !(d[i + 1] > d[i] && d[i + 1] > d[i + 2])) continue; const l = d[i + 1] / 160, pal = FALL_TREES[(n * 7 + 3) % 11 % FALL_TREES.length], c2 = pal[((i / 4) * 7 + n * 3 + ((i / 4 / W) | 0)) % pal.length]; const lb = pal === FALL_LEAVES ? l : Math.min(1.2, l * 1.7);
      d[i] = Math.min(255, parseInt(c2.slice(1,3),16) * lb); d[i + 1] = Math.min(255, parseInt(c2.slice(3,5),16) * lb); d[i + 2] = Math.min(255, parseInt(c2.slice(5,7),16) * lb); } g.putImageData(id, 0, 0); }
    if (main === 'xmas') for (let x = 0; x < W; x++) { let seen = 0; for (let y = 0; y < H; y++) { const j = (y * W + x) * 4; if (!d[j + 3]) { seen = 0; continue; } if (seen < 1) sPx(g, x, y, '#eef3ff'); if (seen > 2 && (x * 7 + y * 3 + n) % 23 === 0) sPx(g, x, y, SEASON_LIGHTS.xmas[(x + y) % 4]); seen++; } }
    if (main === 'easter' || main === 'valentines') for (let i = 0; i < d.length; i += 4) { const x = (i / 4) % W, y = (i / 4 / W) | 0; if (d[i + 3] && d[i + 1] > d[i] && (x * 5 + y * 11 + n) % 17 === 0) sPx(g, x, y, main === 'easter' ? '#ffd1e6' : '#ff8db6'); }
  });
  // Easter: a cross with a white cloth and lilies where the fisherman stands
  if (main === 'easter') (street.fishers || []).forEach(f => { const l = parseFloat(f.el.style.left) / S, t = parseFloat(f.el.style.top) / S, flip = /scaleX\(-1\)/.test(f.el.style.transform);
    sprite(28, 41, l + (flip ? 30 : 14) - 21, t + 11, f.el.style.zIndex, SEASON_ART.cross, 1.5); f.el.style.visibility = 'hidden'; });
  // St. Patrick's: a pot of gold by the first pond
  if (main === 'stpats') { const p = wrap.querySelector('.st-pond'); if (p) sprite(9, 7, parseFloat(p.style.left) / S + 52, parseFloat(p.style.top) / S + 16, +p.style.zIndex + 500, SEASON_ART.gold, 1.6); }
  // the old man's holiday line
  (street.yellers || []).forEach(y => { y.bub.textContent = SEASON_YELLS[main]; });
  // the sky
  const H = Math.round(wrap.clientHeight / S), sky = document.createElement('canvas'); sky.width = street.WW; sky.height = Math.max(1, H); sky.className = 'st-season st-sky';
  Object.assign(sky.style, { left:0, top:0, width:'100%', height:wrap.clientHeight + 'px', zIndex:1900000 });
  const sg = sky.getContext('2d');
  if (main === 'xmas') for (let i = 0; i < street.WW * H / 220; i++) { const x = rnd() * street.WW | 0, y = rnd() * H | 0; sPx(sg, x, y, 'rgba(255,255,255,0.9)'); if (rnd() < 0.3) { sPx(sg, x + 1, y, 'rgba(255,255,255,0.6)'); sPx(sg, x, y + 1, 'rgba(255,255,255,0.6)'); } }
  if (main === 'halloween') for (let i = 0; i < H / 70; i++) { const x = rnd() * (street.WW - 12) | 0, y = rnd() * H | 0; [[0,0],[1,1],[2,1],[3,2],[4,1],[5,2],[6,1],[7,1],[8,0],[4,2]].forEach(([a, b]) => sPx(sg, x + a, y + b, '#0a0a0e')); }
  if (main === 'thanksgiving') for (let i = 0; i < H / 25; i++) { const x = rnd() * street.WW | 0, y = rnd() * H | 0, c = FALL_LEAVES[i % FALL_LEAVES.length]; sPx(sg, x, y, c); sPx(sg, x + 1, y + 1, c); }
  if (main === 'valentines') for (let i = 0; i < H / 60; i++) { const x = rnd() * (street.WW - 8) | 0, y = rnd() * H | 0; ['.XX.XX.','XXXXXXX','.XXXXX.','..XXX..','...X...'].forEach((r, j) => [...r].forEach((ch, k) => { if (ch === 'X') sPx(sg, x + k, y + j, 'rgba(255,90,140,0.85)'); })); }
  if (main === 'fourth') for (let i = 0; i < H / 260; i++) { const cx = 20 + rnd() * (street.WW - 40), cy = rnd() * H, col = ['#ff4a4a','#ffffff','#5b8cff','#ffd34a'][i % 4];
    for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; for (let r = 4; r < 13; r += 2) sPx(sg, Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.9), r > 9 ? col + '99' : col); } sPx(sg, cx | 0, cy | 0, '#ffffff'); }
  if (main === 'stpats') for (let i = 0; i < H / 50; i++) sPx(sg, rnd() * street.WW | 0, rnd() * H | 0, '#ffd34a');
  wrap.appendChild(sky);
}
const basePaintDog = paintDog;
paintDog = function(canvas, kind, frame, wag){
  if (kind !== 'turkey') return basePaintDog(canvas, kind, frame, wag);
  const g = pixelCanvasCtx(canvas, 21, 19); SEASON_ART.turkey(g, frame);
};
const baseDogWoof = dogWoof;
dogWoof = function(d){
  baseDogWoof(d);
  if (d.kind === 'turkey') { const fx = $('path-wrap').querySelectorAll('.st-woof'); if (fx.length) fx[fx.length - 1].textContent = 'gobble'; }
};
// the last fisherman stood on the walk; he and his pond move to the open lawn past the last house
function moveLastFisher(){
  const f = (street.fishers || []).find(x => x.pond && street.stops.length >= 21 && x === street.fishers[street.fishers.length - 1]); if (!f) return;
  const S = street.S, last = street.stops[street.stops.length - 2];
  const o = isoPt(0, 0), du = isoPt(1, 0), dv = isoPt(0, 1);
  const toUV = (x, y) => { const a = du.x - o.x, b = dv.x - o.x, c = du.y - o.y, d = dv.y - o.y, det = a * d - b * c, X = x - o.x, Y = y - o.y; return { u:(d * X - b * Y) / det, v:(a * Y - c * X) / det }; };
  const px0 = parseFloat(f.pond.style.left) / S, py0 = parseFloat(f.pond.style.top) / S;
  const tx = street.WW - 74, ty = last.top + last.geo.H + 26;        // pond's top-left in world pixels
  const dx = tx - px0, dy = ty - py0, q = toUV(tx + 32, ty + 26);
  f.pond.style.left = Math.round(tx * S) + 'px'; f.pond.style.top = Math.round(ty * S) + 'px'; f.pond.style.zIndex = objZ(q.u, q.v) - 400;
  f.el.style.left = Math.round((parseFloat(f.el.style.left) / S + dx) * S) + 'px'; f.el.style.top = Math.round((parseFloat(f.el.style.top) / S + dy) * S) + 'px'; f.el.style.zIndex = objZ(q.u, q.v) + 10;
}
const baseRenderStreet = renderStreet;
renderStreet = function(){
  streetSeasons = activeSeasons();
  dressNpcs();
  baseRenderStreet.apply(this, arguments);
  try { moveLastFisher(); } catch (e) {}
  try { decorateStreet(); } catch (e) { console.warn('season', e); }
};
document.head.insertAdjacentHTML('beforeend', '<style>.st-season{ position:absolute; image-rendering:pixelated; pointer-events:none; }</style>');
