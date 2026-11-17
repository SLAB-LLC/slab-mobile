// ============ REELS: GAMEPLAY BACKGROUNDS, TITLE CARD, ONE-WORD CAPTIONS ============
// Reels play like the story-time videos: muted gameplay fills the screen, a title card shows the hook
// for the first few seconds, and the rep's real recording drives captions one word at a time.
// Backgrounds come from the reel-backgrounds bucket's manifest.json (slab-pipeline backgrounds.py, fed
// by the team's Google Sheet). Each reel gets a random one from a random point, never the same one twice
// in a row. With no manifest a reel keeps its dark card, with the same title card and captions.
// Word timings are each clip's `w` (slab-pipeline reel_words.py); clips without them spread each
// line's words across the line, as the old captions did.
// Only where it's switched on: the company's features.reelsGameplay (Cade's company for now). Elsewhere
// APP.reelBackgrounds is null and Reels stay exactly as they were. The demo outside the app always has it.
const RB_CARD_MS = 3200;
const RB_ON = !APP || !!APP.reelBackgrounds;
if (RB_ON) document.documentElement.classList.add('rb-on');
let rbList = null, rbLast = null, rbCardTimer = 0;
const rbVid = [0, 1].map(() => { const v = document.createElement('video'); v.className = 'vx-bgv'; v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); return v; });
let rbNext = null; // { q, v, pick } the following card's background, already loading

function rbLoadList(){
  if (rbList) return rbList;
  const url = APP ? APP.reelBackgrounds : 'bg/manifest.json';
  rbList = !url ? Promise.resolve([]) : fetch(url, { cache:'no-cache' }).then(r => r.ok ? r.json() : { clips:[] })
    .then(m => (m.clips || []).filter(c => c && c.src && c.dur > 5).map(c => ({ ...c, url:new URL(c.src, new URL(url, location.href)).href })))
    .catch(() => []);
  return rbList;
}
function rbPick(list, len){
  const pool = list.length > 1 ? list.filter(b => b.id !== rbLast) : list;
  const b = pool[Math.floor(Math.random() * pool.length)];
  // start anywhere that leaves the whole clip's worth of footage before the loop point; footage shorter
  // than the clip loops anyway, so it can start anywhere
  const room = b.dur > len + 1 ? b.dur - len - 0.5 : b.dur - 1;
  return { b, at:Math.random() * room };
}
function rbCue(v, pick, play){
  const go = () => { try { v.currentTime = pick.at; } catch (e) {} if (play) v.play().catch(() => {}); };
  if (v.dataset.src !== pick.b.url) { v.dataset.src = pick.b.url; v.src = pick.b.url; v.addEventListener('loadedmetadata', go, { once:true }); v.load(); }
  else go();
}
function rbPlay(i){
  if (!RB_ON) return;
  const c = vxQueue[i], card = document.querySelector(`#vx-feed .vx-card[data-q="${i}"]`);
  if (!c || !card) return;
  // the title card, once each time a reel comes on screen
  document.querySelectorAll('#vx-feed .vx-card.tc').forEach(el => el.classList.remove('tc'));
  clearTimeout(rbCardTimer);
  card.classList.add('tc');
  rbCardTimer = setTimeout(() => card.classList.remove('tc'), RB_CARD_MS);
  rbLoadList().then(list => {
    if (vxActive !== i || !list.length) return;
    let v, pick;
    if (rbNext && rbNext.q === i) ({ v, pick } = rbNext);
    else { v = rbVid[0] === (rbNext && rbNext.v) ? rbVid[1] : rbVid[0]; pick = rbPick(list, c.en - c.st); rbCue(v, pick, false); }
    rbVid.forEach(x => { if (x !== v) x.pause(); });
    rbLast = pick.b.id;
    card.querySelector('.vx-bgw').appendChild(v);
    card.classList.add('bg');
    if (v.readyState >= 1) { try { v.currentTime = pick.at; } catch (e) {} }
    if (!vxAu.paused) v.play().catch(() => {});
    // the next reel's background starts loading now, so the swipe lands on moving footage
    const n = vxQueue[i + 1], other = v === rbVid[0] ? rbVid[1] : rbVid[0];
    rbNext = n ? { q:i + 1, v:other, pick:rbPick(list, n.en - n.st) } : null;
    if (rbNext) rbCue(other, rbNext.pick, false);
  });
}
// the footage follows the recording: tap to pause, leaving Reels, opening the full door
vxAu.addEventListener('pause', () => rbVid.forEach(v => v.pause()));
vxAu.addEventListener('play', () => { if (vxMode !== 'reel') return; const card = document.querySelector(`#vx-feed .vx-card[data-q="${vxActive}"]`), v = card && card.querySelector('.vx-bgv'); if (v) v.play().catch(() => {}); });

// [door seconds, who, word] for the clip: its own timings, or each line's words spread across the line
function rbWords(c){
  if (c._w) return c._w;
  if (Array.isArray(c.w) && c.w.length) return (c._w = c.w);
  const L = c.d.lines || [], out = [];
  L.forEach((l, k) => {
    const ws = l[2].split(' ').filter(Boolean), en = k + 1 < L.length ? L[k + 1][0] : c.d.dur, span = Math.max(.5, en - l[0] - .6);
    ws.forEach((w, j) => out.push([l[0] + span * j / ws.length, l[1], w]));
  });
  return (c._w = out.filter(x => x[0] >= c.st - 1 && x[0] < c.en));
}
const rbShow = (w) => w.includes('[REDACTED]') ? 'BLEEP' : w.replace(/[,.;:]+$/, '').replace(/^["“]|["”]$/g, '');
function rbTick(c, card){
  if (!RB_ON) return false;
  const t = vxAu.currentTime, W = rbWords(c), cap = card.querySelector('.vx-cap');
  let i = -1;
  for (let k = 0; k < W.length && W[k][0] <= t + .04; k++) i = k;
  // a word stays up until the next one, but not through a long pause
  const on = i >= 0 && t - W[i][0] < 1.4 ? W[i] : null, key = on ? String(i) : '';
  if (cap.dataset.k !== key) {
    cap.dataset.k = key;
    cap.innerHTML = on ? `<span class="w1 ${on[1]}${on[2].includes('[REDACTED]') ? ' bl' : ''}">${vxEsc(rbShow(on[2]))}</span>` : '';
  }
  card.querySelector('.vx-cprog i').style.width = Math.max(0, Math.min(1, (t - c.st) / (c.en - c.st))) * 100 + '%';
  return true;
}
function rbCardHTML(c){
  if (!RB_ON) return '';
  const r = vxRep(c.rep), d = c.d, ini = r.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return `<div class="vx-bgw" aria-hidden="true"></div>
    <div class="vx-tc" aria-hidden="true"><div class="hd"><span class="av">${vxEsc(ini)}</span><span class="nm"><b>${vxEsc(r.name)}</b><small>${vxEsc(r.days[0].date)} · Door ${d.n}</small></span>${c.obj ? `<span class="ob">${VX_OBJ[c.obj]}</span>` : ''}</div>
      <div class="tt">${vxEsc(d.title)}</div>
      <div class="ft"><span>${VX_I.heart}${vxK(vxLikes(c))}</span><span>${VX_I.chat}${c.cm + ((vxS.comments[c.id] || []).length)}</span><span class="ln">${vxFmt(c.en - c.st)}</span></div></div>`;
}
