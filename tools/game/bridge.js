// ============ APP BRIDGE ============
// Present only in the native app build (tools/game/build.py inserts it). The native shell injects
// window.SLAB_APP before the page loads (see src/game/boot.ts); everything here is skipped in the
// browser demo, where APP is null.
//
// Page -> native: appSend(type, payload) and appCall(type, payload) -> Promise.
// Native -> page: window.__appReply(id, ok, result) and window.__appEvent(type, data).
// Errors: in the app, show them on screen (tap to dismiss) and pass them to the native log,
// so a screenshot is enough to debug a phone we can't attach to
function appReportError(where, err){
  const msg = (err && (err.message || err.reason || String(err))) || 'error';
  const at = err && err.stack ? String(err.stack).split('\n').slice(0, 2).join(' | ') : '';
  try { console.error('[game]', where, msg, at); } catch (e) {}
  if (!APP) return;
  appSend('log', { where, msg, at });
  let box = document.getElementById('app-errors');
  if (!box) {
    box = document.createElement('div'); box.id = 'app-errors';
    box.style.cssText = 'position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:99999;background:#b3261e;color:#fff;font:12px/1.35 -apple-system,sans-serif;padding:8px 10px;border-radius:10px;max-height:40vh;overflow:auto;box-shadow:0 6px 20px rgba(0,0,0,.5)';
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = where + ': ' + msg + (at ? '  (' + at.slice(0, 160) + ')' : '');
  box.appendChild(line);
}
function appSafe(where, f){ try { f(); } catch (e) { appReportError(where, e); } }
window.addEventListener('error', (e) => appReportError('page', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => appReportError('promise', e.reason));

const appPending = new Map();
let appSeq = 0;
function appSend(type, payload){
  if (!APP || !window.ReactNativeWebView) return;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload: payload === undefined ? null : payload }));
}
function appCall(type, payload){
  if (!APP || !window.ReactNativeWebView) return Promise.reject(new Error('no app'));
  const id = ++appSeq;
  return new Promise((resolve, reject) => {
    appPending.set(id, { resolve, reject });
    window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, payload: payload === undefined ? null : payload }));
  });
}
window.__appReply = (id, ok, result) => {
  const p = appPending.get(id); if (!p) return;
  appPending.delete(id);
  if (ok) p.resolve(result); else p.reject(new Error(result || 'failed'));
};
window.__appEvent = (type, data) => {
  if (type === 'xp' && data) { currentXP = data.total; updateXPBadge(); applyLockStates(); renderLeaderboard(false); }
  if (type === 'tab' && data) { const b = document.querySelector(`.navbtn[data-page="${data}"]`); if (b) b.click(); }
};

// XP: amounts come from the server (grant_xp), which applies streak, power hour and caps.
// In the browser demo it falls through to the local awardXP.
function xpEvent(reason, sourceId, amount, label){
  if (!APP) { awardXP(amount, label); return; }
  appCall('grant', { reason, sourceId: sourceId == null ? null : String(sourceId) }).then(g => {
    if (!g || !g.granted || !g.amount) return;
    const prev = currentXP;
    const boosts = [g.multiplier > 1 ? g.multiplier + 'x streak' : '', g.powerHour ? '2x power hour' : ''].filter(Boolean);
    if (g.powerHour) flexPower = true;
    baseAwardXP(g.amount, boosts.length ? label + ' (' + boosts.join(', ') + ')' : label);
    currentXP = g.total; updateXPBadge(); applyLockStates();
    haptic('success');
    ALL_GEAR.filter(x => prev < x.xp && currentXP >= x.xp).forEach(x => showToast((x.slot === 'ride' ? 'New ride: ' : 'Unlocked: ') + x.name, 'ph-star'));
    if ($('phone').classList.contains('me-open')) renderProfile(true);
  }).catch(() => {});
}
// One Vault minute, without a toast (the Vault shows its own daily goal)
function vaultMinuteXP(){
  if (!APP) { currentXP += VX_PER_MIN; updateXPBadge(); return; }
  appCall('grant', { reason:'vault_minute', sourceId:null }).then(g => {
    if (g && g.granted) { currentXP = g.total; updateXPBadge(); applyLockStates(); }
  }).catch(() => {});
}

// Real lessons: video from the company's training library, and quiz questions when the lesson has them
const appLessonWatchable = () => APP && lesson.ref && lesson.ref.video;
function appShowWatch(){
  setSteps('watch');
  const ref = lesson.ref, v = ref.video, hasQuiz = !!(ref.quiz && ref.quiz.length);
  const ready = lesson.watched || lesson.review;
  const cta = hasQuiz ? (lesson.review ? 'Practice the quiz' : 'Take the quiz') : (lesson.review ? 'Watched' : 'Complete lesson');
  $('lv-body').innerHTML = `
    <div class="lv-panel">
      <div class="lv-real" id="lv-real"><div class="lv-real-wait">Loading video...</div></div>
      ${ref.description ? `<p class="lv-note">${esc(ref.description)}</p>` : ''}
      <div class="lv-cta">
        <button class="btn ${ready ? 'btn-primary' : 'btn-disabled'}" id="lv-to-quiz" ${ready && !(lesson.review && !hasQuiz) ? '' : 'disabled'}>
          <i class="ph${ready ? '-fill' : ''} ${ready ? 'ph-play' : 'ph-lock-simple'}" aria-hidden="true"></i>${cta}
        </button>
        <div class="lv-hint" id="lv-hint">${ready ? (hasQuiz ? `${passMark()} of ${ref.quiz.length} correct to pass` : '') : 'Watch the video to unlock ' + (hasQuiz ? 'the quiz' : 'the next lesson')}</div>
      </div>
    </div>`;
  const unlock = () => {
    if (lesson.watched) return;
    lesson.watched = true;
    const btn = $('lv-to-quiz'); if (!btn) return;
    btn.className = 'btn btn-primary pop-in'; btn.disabled = false;
    btn.innerHTML = `<i class="ph-fill ph-play" aria-hidden="true"></i>${cta}`;
    $('lv-hint').textContent = hasQuiz ? `${passMark()} of ${ref.quiz.length} correct to pass` : '';
  };
  const host = $('lv-real');
  const mount = (url) => {
    if (!host || lesson.ref !== ref) return;
    if (v.type === 'youtube') {
      host.innerHTML = `<iframe src="${url}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      // YouTube doesn't report the end inside a web view; open the next step after a fair watch
      clearTimeout(lesson.ytTimer);
      lesson.ytTimer = setTimeout(unlock, Math.min(90, Math.max(20, (v.duration || 120) * 0.6)) * 1000);
    } else {
      host.innerHTML = `<video src="${url}" controls playsinline preload="metadata"></video>`;
      const el = host.querySelector('video');
      el.addEventListener('timeupdate', () => { if (el.duration && el.currentTime >= el.duration * 0.9) unlock(); });
      el.addEventListener('ended', unlock);
    }
  };
  if (v.url) mount(v.url);
  else appCall('videoUrl', { id: ref.id }).then(mount).catch(() => { if (host) host.innerHTML = '<div class="lv-real-wait">Video could not load. Check your connection.</div>'; });
  $('lv-to-quiz').addEventListener('click', () => {
    if (!hasQuiz) { if (!lesson.review) { lesson.score = 0; showResult(); } return; }
    lesson.qi = 0; lesson.score = 0; lesson.picks = []; showQuestion();
  });
}
const quizSet = () => (lesson.ref && lesson.ref.quiz && lesson.ref.quiz.length) ? lesson.ref.quiz : (quizzes[lesson.ref.title] || quizzes["Framing the service, not the price"]);
const passMark = () => lesson.ref && lesson.ref.passMark != null ? lesson.ref.passMark : PASS_MARK;
const lessonPassed = () => (APP && lesson.ref && lesson.ref.video && !(lesson.ref.quiz && lesson.ref.quiz.length)) || lesson.score >= passMark();

// Ask the coach: the native shell forwards the conversation to the coach service
const appCoachHistory = [];
function appCoachReply(text){
  appCoachHistory.push({ role:'user', content:text });
  return appCall('coach', { messages: appCoachHistory.slice(-40) }).then(r => {
    const reply = (r && r.reply) || 'Marshall could not answer right now. Try again in a minute.';
    appCoachHistory.push({ role:'assistant', content:reply });
    return { reply, connected: !!(r && r.connected) };
  }).catch(() => ({ reply:'Marshall could not answer right now. Try again in a minute.', connected:false }));
}

const libName = () => APP && !(APP.brand && APP.brand.isAce) ? 'Book Library' : 'Ace Library';

let appSaveTimer = 0;
function appSaveMe(){
  if (!APP) return;
  clearTimeout(appSaveTimer);
  appSaveTimer = setTimeout(() => appSend('saveLook', { look: ME.look }), 700);
}

// ---- Marshall's videos in the Vault ----
const appVaultVideos = () => (APP && APP.vaultVideos) || [];
const appVaultVideoCount = (rid) => rid === 'm' ? appVaultVideos().reduce((n, g) => n + g.videos.length, 0) : 0;
function appVaultVideosHTML(){
  return appVaultVideos().map(g => `${appVaultVideos().length > 1 ? `<div class="vx-vgroup">${vxEsc(g.title)}</div>` : ''}<div class="vx-box">${g.videos.map(v =>
    `<button class="vx-tr" data-vid="${vxEsc(v.id)}" style="grid-template-columns:28px minmax(0,1fr) auto"><span class="rk">${VX_I.play.replace('<svg', '<svg width="14" height="14"')}</span><span><b>${vxEsc(v.title)}</b><small>Video</small></span><span class="lk">${v.duration ? vxFmt(v.duration) : ''}</span></button>`).join('')}</div>`).join('');
}
function appBindVaultVideos(el){
  el.querySelectorAll('[data-vid]').forEach(b => b.onclick = () => {
    haptic('tap');
    const v = appVaultVideos().flatMap(g => g.videos).find(x => x.id === b.dataset.vid);
    appPlayVideo(b.dataset.vid, v ? v.title : '');
  });
}
function appPlayVideo(id, title){
  if (!vxAu.paused) vxAu.pause();
  const box = document.createElement('div');
  box.className = 'app-vid';
  box.innerHTML = `<div class="app-vid-top"><b></b><button class="app-vid-x" type="button" aria-label="Close"><i class="ph ph-x" aria-hidden="true"></i></button></div><div class="app-vid-box"><span class="app-vid-wait">Loading video...</span></div>`;
  box.querySelector('b').textContent = title;
  box.querySelector('.app-vid-x').onclick = () => box.remove();
  $('phone').appendChild(box);
  appCall('videoUrl', { id }).then(url => {
    if (!box.isConnected) return;
    const holder = box.querySelector('.app-vid-box');
    if (!url) { holder.innerHTML = '<span class="app-vid-wait">This video isn\'t available right now.</span>'; return; }
    holder.innerHTML = /youtube\.com\/embed|player\.vimeo/.test(url)
      ? `<iframe src="${url}${url.includes('?') ? '&' : '?'}autoplay=1&playsinline=1" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`
      : `<video src="${url}" controls autoplay playsinline></video>`;
  }).catch(e => { if (box.isConnected) box.querySelector('.app-vid-box').innerHTML = `<span class="app-vid-wait">${vxEsc((e && e.message) || 'Video could not load')}</span>`; });
}

// ---- Owner view and My Team on real data ----
// The demo's roster, teams and announcements are filled from the account's company (company_roster)
// and every change goes to the server: role, level, team, on/off, teams, invite links, pushes.
const ownerApp = () => !!(APP && (APP.me.role === 'owner' || APP.me.role === 'manager'));
const owIds = new Map();
const owDays = (t) => t ? Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 864e5)) : null;
const owFirst = (n) => String(n || '').split(/[\s@]/)[0];
const owErr = (e) => showToast((e && e.message) || 'That didn\'t save. Try again.', 'ph-warning');
// lessons passed in order -> % of each unit done
function owUnitPct(n){
  const size = [0, 0, 0, 0, 0], done = [0, 0, 0, 0, 0];
  for (let i = 0; i < OW_TOTAL; i++) { const u = owUnitOf(i); size[u]++; if (i < n) done[u]++; }
  return size.map((s, u) => done[u] ? Math.round(done[u] / s * 100) : null);
}
function owFromServer(d){
  const byId = new Map((d.reps || []).map(r => [r.id, r]));
  OW_TEAMS.splice(0, OW_TEAMS.length, ...(d.teams || []).map(t => ({ id:t.id, name:t.name, goal:t.goal, managerId:t.managerId,
    manager: t.managerId === APP.me.id ? 'you' : (byId.get(t.managerId) ? byId.get(t.managerId).name : null) })));
  owIds.clear();
  const reps = (d.reps || []).filter(r => r.id !== APP.me.id).map(r => {
    owIds.set(r.name, r.id);
    const last = owDays(r.lastActive), lesson = Math.min(OW_TOTAL, r.lessons || 0);
    return { id:r.id, email:r.email, name:r.name, team:r.teamId || '', level:r.level,
      role: r.role === 'manager' ? 'manager' : (r.role === 'company_admin' || r.role === 'super_admin') ? 'owner' : 'rep',
      status: r.active ? undefined : 'off', streak:r.streak || 0, wk:r.weekXp || 0, xp:r.totalXp || 0, lesson, last,
      listen: Math.round((r.vaultMinutes || 0) / 6) / 10, look:r.look || null, quiz:owUnitPct(lesson),
      boss: OW_UNITS.map((u, i) => (r.bosses || []).some(b => b === u || (categories[i] && b === categories[i].title)) ? 100 : null),
      flag: !r.active ? undefined : last == null ? 'Hasn\'t opened the app yet' : last >= 3 ? `Hasn't opened the app in ${last} days` : undefined };
  });
  const invites = (d.invites || []).map(i => ({ id:null, email:i.email, name:i.email, team:i.teamId || '', role:i.role === 'manager' ? 'manager' : 'rep',
    level:'rookie', status:'invited', streak:0, wk:0, xp:0, lesson:0, last:null, listen:0, look:null, quiz:[], boss:[null, null, null, null, null] }));
  OW_REPS.splice(0, OW_REPS.length, ...reps, ...invites);
  OW_SEATS = d.seats || 0;
  if (!owTeam(owState.audTeam).id && OW_TEAMS[0]) owState.audTeam = OW_TEAMS[0].id;
  if (!OW_REPS.some(r => r.name === owState.audRep) && reps[0]) owState.audRep = reps[0].name;
}
let owLoad = null;
function owRefresh(){
  owLoad = appCall('roster').then(d => { owFromServer(d || {}); }).catch(owErr);
  return owLoad;
}
const owRerender = () => {
  if ($('phone').classList.contains('ow-open')) renderOwner();
  if ($('phone').classList.contains('mt-open')) renderMyTeam();
};
function owSentFromServer(rows){
  const label = (r) => r.target_type === 'team' ? owTeam(r.target_id).name : r.target_type === 'user' ? ([...owIds].find(([, id]) => id === r.target_id) || ['One rep'])[0] : 'Everyone';
  OW_SENT.splice(0, OW_SENT.length, ...(rows || []).map(r => ({ title:r.title, body:r.body, to:label(r), read:null,
    when:new Date(r.created_at).toLocaleString('en-US', { weekday:'short', hour:'numeric', minute:'2-digit' }) })));
}
let owTrainTimer = 0;
const owSaveTraining = () => { clearTimeout(owTrainTimer); owTrainTimer = setTimeout(() => appCall('saveTraining', OW_TRAIN).catch(owErr), 700); };

function owBindReal(el){
  // roster: role, level, team and on/off
  el.querySelectorAll('[data-edit]').forEach(box => {
    const rep = OW_REPS.find(r => r.name === box.dataset.edit);
    if (!rep) return;
    box.querySelectorAll('select').forEach(s => {
      if (!rep.id) { s.disabled = true; return; }
      if (s.dataset.f === 'role' && rep.role === 'owner') { s.innerHTML = '<option>Owner</option>'; s.disabled = true; return; }
      s.onchange = () => {
        const f = s.dataset.f, before = rep[f], v = s.value;
        rep[f] = v; renderOwner();
        const p = { id:rep.id };
        if (f === 'team') p.teamId = v || null; else if (f === 'role') p.role = v === 'manager' ? 'manager' : 'user'; else p.level = v;
        appCall('manageRep', p).then(() => {
          showToast(f === 'team' ? `${owFirst(rep.name)} moved to ${owTeam(v).name}` : f === 'level' ? `${owFirst(rep.name)} is now a ${v === 'vet' ? 'Vet' : 'Rookie'}` : `${owFirst(rep.name)} is now a ${v}`, 'ph-check');
          if (f === 'role') owRefresh().then(owRerender);
        }).catch(e => { rep[f] = before; renderOwner(); owErr(e); });
      };
    });
    box.querySelectorAll('[data-act]').forEach(b => {
      const a = b.dataset.act;
      if (a === 'off') b.onclick = () => owTwoTap(b, 'Tap again', () => appCall('manageRep', { id:rep.id, active:false })
        .then(() => { rep.status = 'off'; owState.open = null; showToast(`${rep.name} is turned off. Their seat is free.`, 'ph-lock-simple'); renderOwner(); }).catch(owErr));
      else if (a === 'on') b.onclick = () => appCall('manageRep', { id:rep.id, active:true })
        .then(() => { delete rep.status; showToast(`${rep.name} is back on`, 'ph-check'); renderOwner(); }).catch(owErr);
      else if (a === 'resend') b.onclick = () => appCall('invite', { email:rep.email, role:rep.role === 'manager' ? 'manager' : 'user', teamId:rep.team || null })
        .then(r => { if (r && r.shared) showToast(`New link sent to ${rep.email}`, 'ph-paper-plane-right'); }).catch(owErr);
    });
  });
  // invites: an email, then the share sheet sends the link
  const form = $('ow-invform');
  if (form) {
    const to = $('inv-to'), lab = to.previousElementSibling;
    if (lab) lab.textContent = 'Email';
    to.placeholder = 'jordan@company.com'; to.type = 'email'; to.setAttribute('autocapitalize', 'off');
    $('inv-err').textContent = 'You send them the link by text or email. It works for 7 days.';
    $('inv-send').textContent = 'Make invite link';
    $('inv-send').onclick = () => {
      const email = to.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('inv-err').textContent = '> add their email'; return; }
      $('inv-send').disabled = true;
      appCall('invite', { email, role:$('inv-role').value === 'manager' ? 'manager' : 'user', teamId:$('inv-team').value || null }).then(r => {
        owState.inviting = false; owState.filter = 'all';
        showToast(r && r.shared ? `Invite sent to ${email}` : 'Invite made. Resend it from their row any time.', 'ph-paper-plane-right');
        return owRefresh().then(renderOwner);
      }).catch(e => { $('inv-send').disabled = false; $('inv-err').textContent = '> ' + ((e && e.message) || 'that didn\'t work'); });
    };
  }
  // teams
  el.querySelectorAll('[data-tedit]').forEach(box => box.querySelector('[data-act=save]').onclick = () => {
    const t = owTeam(box.dataset.tedit);
    const m = box.querySelector('[data-f=manager]').value;
    const managerId = m === 'you' ? APP.me.id : owIds.get(m) || null;
    const goal = Math.max(500, parseInt(box.querySelector('[data-f=goal]').value, 10) || t.goal || 3000);
    const name = box.querySelector('[data-f=name]').value.trim() || t.name;
    const real = /^[0-9a-f-]{36}$/i.test(t.id);
    appCall('saveTeam', { id:real ? t.id : null, name, managerId, goal }).then(() => {
      owState.teamOpen = null; showToast(`${name} saved`, 'ph-check');
      return owRefresh().then(renderOwner);
    }).catch(owErr);
  });
  // announcements go out as pushes; no scheduling yet
  const when = $('an-when'); if (when && when.parentElement) when.parentElement.remove();
  if ($('an-at')) $('an-at').remove();
  owState.when = 'now';
  if ($('an-send')) $('an-send').onclick = () => {
    const a = owState;
    a.title = $('an-title').value; a.body = $('an-body').value;
    if (!a.title.trim() || !a.body.trim()) { $('an-err').textContent = '> add a title and a message'; return; }
    const p = { title:a.title.trim(), body:a.body.trim(), to:a.aud };
    if (a.aud === 'team') p.teamId = a.audTeam;
    if (a.aud === 'rep') p.repId = owIds.get(a.audRep);
    $('an-send').disabled = true;
    appCall('notify', p).then(r => {
      haptic('success');
      showToast(`Sent to ${r.reach} ${r.reach === 1 ? 'rep' : 'reps'}`, 'ph-paper-plane-right');
      OW_SENT.unshift({ title:p.title, body:p.body, to:a.aud === 'all' ? 'Everyone' : a.aud === 'team' ? owTeam(a.audTeam).name : a.audRep, when:'Just now', read:null });
      a.title = ''; a.body = ''; renderOwner();
    }).catch(e => { $('an-send').disabled = false; owErr(e); });
  };
  // training choices are kept for the company
  el.querySelectorAll('[data-unit], [data-book], [data-step]').forEach(b => b.addEventListener('click', owSaveTraining));
}

function owBindTeam(){
  const el = $('mt-scroll');
  el.querySelectorAll('[data-level]').forEach(b => b.onclick = () => {
    const r = OW_REPS.find(x => x.name === mtState.rep); if (!r || !r.id) return;
    const before = r.level; r.level = b.dataset.level; haptic('tap'); renderMyTeam();
    appCall('manageRep', { id:r.id, level:r.level }).then(() => showToast(`${owFirst(r.name)} is now a ${r.level === 'vet' ? 'Vet' : 'Rookie'}`, 'ph-check'))
      .catch(e => { r.level = before; renderMyTeam(); owErr(e); });
  });
  el.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => {
    const r = OW_REPS.find(x => x.name === mtState.rep); if (!r || !r.id) return;
    const kind = mtState.pick;
    appCall('notify', { title:kind === 'nudge' ? `${owFirst(ME.name) || 'Your manager'} nudged you` : `Shout-out from ${owFirst(ME.name) || 'your manager'}`, body:b.dataset.msg, to:'rep', repId:r.id })
      .then(() => { haptic('success'); showToast(`Sent to ${owFirst(r.name)}`, kind === 'nudge' ? 'ph-lightning' : 'ph-star'); mtState.pick = null; renderMyTeam(); })
      .catch(owErr);
  });
}

if (ownerApp()) {
  OW_REPS.length = 0; OW_TEAMS.length = 0; OW_SENT.length = 0;
  const T = APP.training;
  if (T) {
    (T.units || []).forEach((u, i) => { if (OW_TRAIN.units[i]) OW_TRAIN.units[i].req = !!u.req; });
    (T.books || []).forEach((b, i) => { if (OW_TRAIN.books[i]) OW_TRAIN.books[i].req = !!b.req; });
    if (T.pass) OW_TRAIN.pass = T.pass;
    if (T.bossPass) OW_TRAIN.bossPass = T.bossPass;
  }
  owRefresh();
  const baseBind = bindOwner;
  bindOwner = function(el){ baseBind(el); owBindReal(el); };
  const baseOpen = openOwner;
  openOwner = function(){
    baseOpen();
    owRefresh().then(owRerender);
    appCall('sentList').then(rows => { owSentFromServer(rows); owRerender(); }).catch(() => {});
  };
  const baseTeam = renderMyTeam;
  renderMyTeam = function(){ baseTeam(); owBindTeam(); };
  const baseOpenTeam = openMyTeam;
  openMyTeam = function(team, rep){
    // the button opens the team you manage (owners: the first team)
    if (!team || !owTeam(team).id && !rep) {
      const mine = OW_TEAMS.find(t => t.managerId === APP.me.id) || (APP.me.role === 'owner' ? OW_TEAMS[0] : null);
      if (!mine) { showToast(APP.me.role === 'owner' ? 'Make a team in Owner view first' : 'You aren\'t managing a team yet', 'ph-users-three'); return; }
      team = mine.id;
    }
    baseOpenTeam(team, rep);
    (owLoad || owRefresh()).then(owRerender);
  };
  // the button passes the demo's team id
  const fab = $('mt-fab'), fresh = fab.cloneNode(true);
  fab.replaceWith(fresh);
  fresh.addEventListener('click', () => { haptic('tap'); openMyTeam(null); });
}

if (APP) {
  // The company's real reps, ranked by total XP; reps without a saved look show the default rep
  if (APP.leaders && APP.leaders.length) leaders.splice(0, leaders.length, ...APP.leaders.map(l => ({ props:0, lessons:0, bosses:0, books:0, badges:[], ...l, look: Object.assign({ ...DEFAULT_LOOK }, l.look || {}) })));
  // The page needs the rep's own row
  if (!leaders.some(l => l.you)) leaders.push({ name: APP.me.name, streak: APP.me.streakDays, xp: APP.me.xp, you:true, props:0 });

  // Company branding: accent color and co-brand line from the tenant config
  const accent = APP.brand && APP.brand.accent;
  if (accent && !APP.brand.isAce) document.documentElement.style.setProperty('--amber', accent);
  if (APP.brand && APP.brand.cobrand) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (/SLAB\s*[×x]\s*ACE/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/SLAB\s*[×x]\s*ACE/ig, APP.brand.cobrand);
    }
  }
  document.documentElement.classList.add('in-app');
  // Ask Marshall starts fresh: the demo's sample conversation is not real
  Object.values(repsData).forEach(r => { r.conversation = [{ who:'bot', text:"Hey, what are you running into out there today?" }]; });
  const disc = document.querySelector('#page-chat .disclaimer'); if (disc) disc.remove();
  // Marshall is the one coach for now
  const repTabs = $('chat-rep-tabs'); if (repTabs) repTabs.style.display = 'none';
  if (!APP.brand || !APP.brand.isAce) {
    document.documentElement.classList.add('not-ace');
    // Another company: their logo (if they have one) takes Ace's spot next to SLAB, and Ace's own
    // resource library stays out
    document.querySelectorAll('.topbar .brand img[data-img="ace"]').forEach(img => {
      if (APP.brand && APP.brand.logoUrl) img.src = APP.brand.logoUrl;
      else { img.remove(); document.querySelectorAll('.topbar .brand .x').forEach(x => x.remove()); }
    });
    ACE.splice(0, ACE.length);
    const gearName = (APP.brand && APP.brand.gear && APP.brand.gear.name) || APP.brand.cobrand || 'Team';
    const rename = (g) => { g.name = g.name.replace(/\bAce\b/, gearName); };
    Object.values(GEAR).forEach(list => list.forEach(rename));
    ALL_GEAR.forEach(rename);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (/Ace Library|Search Ace resources/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace('Ace Library', 'Book Library').replace('Search Ace resources', 'Search resources');
    }
    const bv = $('book-view'); if (bv) bv.setAttribute('aria-label', 'Book Library');
  }
  // My Team sits above the nav bar, which is taller in the app (it pads for the home bar); keep the gap from its top edge current
  const navEl = document.querySelector('.navbar');
  const navGap = () => { const ph = $('phone'); if (navEl && ph) ph.style.setProperty('--nav-gap', Math.max(0, Math.round(ph.getBoundingClientRect().bottom - navEl.getBoundingClientRect().top)) + 'px'); };
  if (navEl && window.ResizeObserver) { const ro = new ResizeObserver(navGap); ro.observe(navEl, { box:'border-box' }); ro.observe($('phone')); }
  window.addEventListener('resize', navGap); navGap(); setTimeout(navGap, 500);
  // Opening chat, Marshall climbs into the big box from below like he left the nav for it (the leftover
  // swap class from picking a coach otherwise wins and he just fades in)
  const dockBase = updateChatDock;
  updateChatDock = function(){
    const was = $('phone').classList.contains('chat-open');
    dockBase();
    if (was || !$('phone').classList.contains('chat-open')) return;
    const dock = $('avatar-dock'), cv = dock && dock.querySelector('canvas');
    if (!cv) return;
    dock.classList.remove('swap'); cv.style.animation = 'none'; void cv.offsetWidth; cv.style.animation = '';
  };
  // Monthly prize only for companies running one
  if (!APP.features.monthlyPrize) { const pz = document.querySelector('#page-leaderboard .prize'); if (pz) pz.style.display = 'none'; }
}

// ============ TYPED BOSS FIGHTS (graded by Claude through the website) ============
// The demo asks Claude through the viewer's `sample` capability. In the app the same prompts
// go to slabtech /api/app/ai; errors come back as their code ('rate_limited', ...).
if (APP) {
  bossAI = {
    json: (msgs) => appCall('ai', { messages: typeof msgs === 'string' ? [{ role:'user', content:msgs }] : msgs })
      .catch((e) => { e.code = e && e.message; throw e; }),
  };
}
