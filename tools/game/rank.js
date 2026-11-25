// ============ RANK DROP ALERTS ============
// Someone knocked the rep down inside their company's top 3, or off it (slabtech
// sql/rank-drop-alerts-migration.sql). The app sends the drops the rep hasn't seen as a 'rankDrop' event
// (on open, coming back to the app, or a push while it's open); a banner slides down from the top and a
// tap on it opens the leaderboard. The board itself is refreshed with an 'leaders' call so it shows the
// new order. Settings get a Leaderboard alerts switch (notification_preferences.rank_alerts).

NOTIF_CATS.push({ id:'rank', icon:'ph-trophy', name:'Leaderboard alerts', how:'When someone knocks you down in your top 3. At most one every 2 hours.' });
if (ME.notif && ME.notif.rank === undefined) ME.notif.rank = true;

document.head.insertAdjacentHTML('beforeend', `<style>
  .rk-drop{ position:absolute; left:12px; right:12px; top:calc(env(safe-area-inset-top, 0px) + 10px); z-index:120;
    display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:var(--r-card, 16px);
    background:var(--surface, #16161a); border:1px solid var(--amber-line, rgba(218,174,93,.45));
    box-shadow:0 12px 34px rgba(0,0,0,.55); color:var(--text, #EDEAE2); font:inherit; text-align:left; cursor:pointer;
    transform:translateY(calc(-100% - 40px)); transition:transform .42s cubic-bezier(.2,.9,.25,1.15); }
  .rk-drop.on{ transform:none; }
  .rk-drop .rk-ic{ width:42px; height:42px; flex:none; border-radius:12px; display:grid; place-items:center;
    background:var(--amber-dim, rgba(218,174,93,.14)); color:var(--amber, #daae5d); font-size:22px; }
  .rk-drop.crown .rk-ic{ animation:rkWobble .9s ease-in-out 2; }
  .rk-drop .rk-tx{ flex:1; min-width:0; }
  .rk-drop .rk-k{ display:block; font:700 10px/1 'Barlow', sans-serif; letter-spacing:.16em; text-transform:uppercase; color:var(--amber, #daae5d); margin-bottom:4px; }
  .rk-drop b{ display:block; font-size:15px; line-height:1.2; margin-bottom:2px; }
  .rk-drop .rk-b{ display:block; font-size:12.5px; line-height:1.35; color:var(--text-dim, #a39d90); }
  .rk-drop .rk-go{ flex:none; font-size:18px; color:var(--text-dim, #a39d90); }
  @keyframes rkWobble{ 0%,100%{ transform:rotate(0); } 25%{ transform:rotate(-14deg); } 75%{ transform:rotate(12deg); } }
</style>`);

let rkTimer = null;
function rkHide(){
  const el = document.getElementById('rk-drop');
  if (!el) return;
  el.classList.remove('on');
  setTimeout(() => el.remove(), 450);
}
function rkShow(alerts){
  if (!Array.isArray(alerts) || !alerts.length) return;
  const a = alerts[0];
  const more = alerts.length - 1;
  const crown = a.oldRank === 1;
  document.getElementById('rk-drop')?.remove();
  clearTimeout(rkTimer);
  const el = document.createElement('button');
  el.type = 'button';
  el.id = 'rk-drop';
  el.className = 'rk-drop' + (crown ? ' crown' : '');
  el.innerHTML = `<span class="rk-ic"><i class="ph-fill ${crown ? 'ph-crown-simple' : 'ph-trophy'}" aria-hidden="true"></i></span>
    <span class="rk-tx"><span class="rk-k">Leaderboard${more > 0 ? ` · +${more} more` : ''}</span><b>${esc(a.title)}</b><span class="rk-b">${esc(a.body)}</span></span>
    <i class="ph-fill ph-caret-right rk-go" aria-hidden="true"></i>`;
  el.addEventListener('click', () => {
    rkHide();
    const b = document.querySelector('.navbtn[data-page="leaderboard"]');
    if (b) b.click();
  });
  $('phone').appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  haptic('hit');
  rkTimer = setTimeout(rkHide, 7000);
  rkRefreshBoard();
}

// The company board as it stands now (the rep's own row keeps its live XP and look)
function rkRefreshBoard(){
  if (!APP || !lbBoards) return;
  appCall('leaders').then(rows => {
    if (!Array.isArray(rows) || !rows.length) return;
    const mine = lbBoards.company.find(l => l.you);
    lbBoards.company = rows.filter(l => !l.you).map(lbFill).concat(mine ? [mine] : []);
    if (lbScope === 'company') lbSetScope('company');
  }).catch(() => {});
}

const rkBaseAppEvent = window.__appEvent;
window.__appEvent = (type, data) => {
  if (type === 'rankDrop') { rkShow(data); return; }
  rkBaseAppEvent(type, data);
};
