// ============ THE DROP-OFF ============
// A two-lane road runs along the top of the street, where the first walkway starts. The first time a rep opens the
// Lab after setting up (or after the tour), their "manager" pulls up in his car, drops them off, says his line, and
// drives off. Then the rep walks down to their door. Plays once per phone.
const ROAD_ROOM = 48;                 // extra lawn above the first house (build.py adds it to street.Y0)
const ROAD_HALF = 21;                 // half the road's width, across it, in street units
const CAR = { LEN:34, WID:12, W:58, H:44, OX:15, OY:26, K:1.5 };   // K: drawn a size up so it reads next to the rep
const DROP_KEY = 'slab.dropoff.v2';
const DROP_LINE = 'Bro this hood is gas! I should\u2019ve drawn it up for myself';

// the road follows the u axis and tees into the far end of the first walkway
function roadV(){ return street.verts[-1].v - ROAD_HALF + 3; }
function paintRoad(){
  const cv = street.ground; if (!cv) return;
  const g = cv.getContext('2d'), Wc = cv.width, Hc = Math.min(cv.height, 260), id = g.getImageData(0, 0, Wc, Hc), d = id.data;
  const vR = roadV(), { X0, Y0 } = street;
  const set = (i, c) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; };
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
    const a = x - X0, b = 2 * (y - Y0), u = (b + a) / 2, v = (b - a) / 2, off = v - vR, ao = Math.abs(off);
    if (ao > ROAD_HALF + 1.5) continue;
    const i = (y * Wc + x) * 4, n = ((x * 73856093) ^ (y * 19349663)) >>> 0;
    if (ao > ROAD_HALF) set(i, off > 0 ? [58, 58, 64] : [28, 28, 32]);                    // curbs: lit near side, shadowed far side
    else if (ao < 0.6 && ((Math.floor(u) % 12) + 12) % 12 < 6) set(i, [214, 170, 70]);  // dashed center line
    else if (ROAD_HALF - ao < 1) set(i, [92, 92, 98]);                                   // edge lines
    else { const k = n % 9 === 0 ? 6 : n % 7 === 0 ? -4 : 0; set(i, [33 + k, 34 + k, 38 + k]); }
  }
  g.putImageData(id, 0, 0);
}

// a little sedan, drawn in the street's own iso angle, heading down and to the right
function paintCar(c, wheel){
  c.width = CAR.W; c.height = CAR.H;
  const g = c.getContext('2d'), { LEN, WID, OX, OY } = CAR;
  const P = (u, v, z, col) => { g.fillStyle = col; g.fillRect(Math.round(u - v + OX), Math.floor((u + v) / 2 - z + OY), 1, 1); };
  const box = (u0, u1, v0, v1, z0, z1, top, left, right) => {
    for (let u = u0; u <= u1; u += 0.5) for (let z = z0; z <= z1; z += 0.5) P(u, v1, z, typeof left === 'function' ? left(u, z) : left);
    for (let v = v0; v <= v1; v += 0.5) for (let z = z0; z <= z1; z += 0.5) P(u1, v, z, typeof right === 'function' ? right(v, z) : right);
    for (let u = u0; u <= u1; u += 0.5) for (let v = v0; v <= v1; v += 0.5) P(u, v, z1, typeof top === 'function' ? top(u, v) : top);
  };
  const RED = '#b8322a', REDL = '#d4483a', REDD = '#7e1f1a', GLASS = '#2a3e52', GLASSL = '#4a6a86';
  // body, then the cabin on top of it
  box(0, LEN, 0, WID, 2, 9, (u, v) => u > LEN - 7 || u < 4 ? REDL : RED, (u, z) => z < 3 ? REDD : u > 7 && u < 8 || u > 20 && u < 21 ? REDD : RED, (v, z) => z < 3 ? '#5a1612' : REDD);
  box(9, 26, 1.5, WID - 1.5, 9.5, 15, REDL, (u, z) => z > 14 ? RED : (u > 10 && u < 17.5) || (u > 18.5 && u < 25) ? GLASS : RED, (v, z) => z > 14 ? REDD : v > 2.5 && v < WID - 2.5 ? GLASSL : REDD);
  // the manager at the wheel: a head and sunglasses in the far window
  for (let u = 20; u <= 23; u += 0.5) for (let z = 10.5; z <= 13.5; z += 0.5) P(u, WID - 1.5, z, z > 12.8 ? '#2a1a12' : '#c58a5e');
  P(22, WID - 1.5, 12, '#0b0b0d'); P(22.5, WID - 1.5, 12, '#0b0b0d'); P(21, WID - 1.5, 12, '#0b0b0d');
  // headlights and grille on the nose, a stripe of trim, a door handle
  [[2, 4.5], [WID - 4.5, WID - 2]].forEach(([a, b]) => { for (let v = a; v <= b; v += 0.5) for (let z = 5.5; z <= 7; z += 0.5) P(LEN, v, z, '#fff3b0'); });
  for (let v = 5; v <= WID - 5; v += 0.5) for (let z = 4; z <= 6; z += 0.5) P(LEN, v, z, (v * 2) % 2 ? '#1a1a1e' : '#3a3a40');
  for (let u = 1; u <= LEN - 1; u += 0.5) P(u, WID, 6, '#e8c46a');
  P(15, WID, 7.5, '#e8c46a'); P(15.5, WID, 7.5, '#e8c46a');
  // wheels on the near side, spokes turning
  [7, LEN - 7].forEach(cu => { for (let du = -3; du <= 3; du += 0.5) for (let dz = -3; dz <= 3; dz += 0.5) { const r = Math.hypot(du, dz); if (r > 3) continue;
    const spoke = r > 1 && r < 2.4 && Math.abs(Math.sin(Math.atan2(dz, du) * 2 + wheel * 0.8)) < 0.35;
    P(cu + du, WID + 0.3, 3 + dz, r < 1 ? '#9a9aa2' : spoke ? '#55555c' : '#121214'); } });
  // a dark outline, then a soft shadow on the road under the car
  const id = g.getImageData(0, 0, CAR.W, CAR.H), dd = id.data, A = (x, y) => x >= 0 && y >= 0 && x < CAR.W && y < CAR.H && dd[(y * CAR.W + x) * 4 + 3] > 0;
  const edge = [];
  for (let y = 0; y < CAR.H; y++) for (let x = 0; x < CAR.W; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) edge.push([x, y]);
  g.fillStyle = '#140c0c'; edge.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(0,0,0,0.38)';
  for (let u = -1; u <= LEN + 2; u += 0.5) for (let v = -1; v <= WID + 2; v += 0.5) g.fillRect(Math.round(u - v + OX), Math.floor((u + v) / 2 + OY), 1, 1);
  g.globalCompositeOperation = 'source-over';
}

function dropoffSeen(){ try { return localStorage.getItem(DROP_KEY) === '1'; } catch (e) { return true; } }
function markDropoff(){ try { localStorage.setItem(DROP_KEY, '1'); } catch (e) {} }

// walk the rep along a list of street points (same pace and poses as walkTo)
function walkPoints(pts){
  return new Promise(resolve => {
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); if (dd > 0) { segs.push({ a:pts[i - 1], b:pts[i], d:dd, t0:total }); total += dd; } }
    if (!segs.length || reduceMotion) { resolve(); return; }
    const speed = Math.max(90, total / 3.2);
    let t0 = 0, last = 0;
    const tick = (now) => {
      if (!t0) t0 = now;
      if (!document.contains(street.el)) { resolve(); return; }
      const dist = Math.min(total, (now - t0) / 1000 * speed);
      const seg = segs.find(s => dist <= s.t0 + s.d) || segs[segs.length - 1];
      const f = Math.min(1, (dist - seg.t0) / seg.d), dx = seg.b.x - seg.a.x, dy = seg.b.y - seg.a.y;
      const dir = Math.abs(dx) < 0.5 ? (dy > 0 ? 'down' : 'up') : 'side', step = Math.floor(dist / 5) % 4;
      placeMe({ x:seg.a.x + dx * f, y:seg.a.y + dy * f }, `${dir}-${step}`, dir === 'side' && dx < 0);
      if (step !== last && step % 2 === 1) haptic('tap');
      last = step; followMe(seg.a.y + dy * f);
      if (dist < total) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
function driveCar(car, from, to, ms, ease){
  return new Promise(resolve => {
    const lane = roadV() + ROAD_HALF / 2, S = street.S, K = CAR.K, t0 = performance.now();
    const tick = (now) => {
      if (!document.contains(car)) { resolve(); return; }
      const f = Math.min(1, (now - t0) / ms), e = ease(f), u = from + (to - from) * e;
      const p = isoPt(u - CAR.LEN * K / 2, lane - CAR.WID * K / 2);
      car.style.transform = `translate(${Math.round((p.x - CAR.OX * K) * S)}px, ${Math.round((p.y - CAR.OY * K) * S)}px)`;
      paintCar(car, u / 2);
      if (f < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

let dropoffRunning = false;
async function playDropoff(force){
  if (dropoffRunning || (!force && dropoffSeen())) return;
  if (!street.el || !street.stops.length || street.busy || !$('page-courses').classList.contains('visible')) return;
  markDropoff();
  if (reduceMotion) return;
  dropoffRunning = true; street.busy = true; setBubble('');
  const wrap = $('path-wrap'), S = street.S, target = street.at;
  $('screen').scrollTo({ top:0, behavior:'smooth' });
  street.el.style.opacity = '0'; if (street.rideEl) street.rideEl.classList.remove('on');
  const car = document.createElement('canvas');
  car.className = 'st-car'; car.setAttribute('aria-hidden', 'true');
  car.style.width = Math.round(CAR.W * CAR.K * S) + 'px'; car.style.height = Math.round(CAR.H * CAR.K * S) + 'px';
  car.style.zIndex = 1500;
  wrap.appendChild(car);
  try {
    await wait(500);
    const STOP = -(CAR.LEN * CAR.K / 2 + 4);   // pulls up just short of the walk, so the rep steps out onto it
    await driveCar(car, -300, STOP, 2400, f => 1 - Math.pow(1 - f, 3));
    haptic('tap');
    // the rep hops out on the near side and the manager says his piece
    const lane = roadV() + ROAD_HALF / 2, out = isoPt(0, roadV() + ROAD_HALF + 5);
    street.el.style.opacity = ''; placeMe(out, 'down-0', false);
    const pc = isoPt(STOP, lane), sx = Math.max(95, Math.min(street.WW - 95, pc.x));
    const say = document.createElement('div');
    say.className = 'st-yell st-carsay'; say.setAttribute('aria-hidden', 'true'); say.textContent = DROP_LINE;
    say.style.left = Math.round(sx * S) + 'px'; say.style.top = Math.round((pc.y - 34) * S) + 'px';
    wrap.appendChild(say);
    requestAnimationFrame(() => say.classList.add('on'));
    await wait(3200);
    say.classList.remove('on'); setTimeout(() => say.remove(), 300);
    await driveCar(car, STOP, 360, 2000, f => f * f);
    car.remove();
    // then down the walk to their door
    if (!document.contains(street.el) || !street.stops[target]) return;
    const pts = [out];
    for (let k = 0; k <= target; k++) pts.push(isoPt(street.verts[k].u, street.verts[k].v));
    pts.push(street.stops[target].stand);
    await walkPoints(pts);
  } finally {
    car.remove();
    dropoffRunning = false; street.busy = false;
    if (street.el && document.contains(street.el) && street.stops[street.at]) {
      street.el.style.opacity = '';
      placeMe(street.stops[street.at].stand, 'down-0', false); parkRide(street.stops[street.at]);
      setBubble(street.at === street.activeIdx ? 'Tap to knock' : '');
    }
  }
}

const baseRenderStreetRoad = renderStreet;
renderStreet = function(){ baseRenderStreetRoad(); paintRoad(); };

// once set up (onboarding and any tour closed), the manager drops them off
(function watchForDropoff(){
  let tries = 0;
  const check = () => {
    if (dropoffSeen() || ++tries > 240) return;
    const ready = ME.onboarded && !document.querySelector('#onboard, .coach, #solo-wrap') && street.el && !street.busy && $('page-courses').classList.contains('visible');
    if (ready) setTimeout(() => playDropoff(), 900); else setTimeout(check, 1000);
  };
  setTimeout(check, 2500);
})();

const dropCss = document.createElement('style');
dropCss.textContent = `.st-car{ position:absolute; left:0; top:0; image-rendering:pixelated; pointer-events:none; will-change:transform; }
  .st-carsay{ max-width:calc(var(--S) * 170px); white-space:normal; text-align:center; z-index:1960000; }`;
document.head.appendChild(dropCss);
