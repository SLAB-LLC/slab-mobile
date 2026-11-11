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
  .fx-name .gd-badge{ margin-left:6px; }
  @media (prefers-reduced-motion: reduce){ .gd-name, .lb-row.gd::after, .pd-spot.gd .pd-block::after, .gd-doorway, .gd-doorway i{ animation:none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
