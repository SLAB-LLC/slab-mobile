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
  if (type === 'voice' && data) appVoiceEvent(data);
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

// YouTube won't play an embed made straight from this page (a local file, so no website for YouTube to see:
// error 153, "watch on YouTube"). Its videos play through the SLAB site's player page instead.
const YT_PLAYER = 'https://www.slabtraining.com/yt.html';
function ytPlayer(url, autoplay){
  const m = String(url || '').match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/);
  return m ? `${YT_PLAYER}?v=${m[1]}${autoplay ? '&autoplay=1' : ''}` : url;
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
      host.innerHTML = `<iframe src="${ytPlayer(url)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
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
    const reply = (r && r.reply) || `${coachName()} could not answer right now. Try again in a minute.`;
    appCoachHistory.push({ role:'assistant', content:reply });
    return { reply, connected: !!(r && r.connected), clips: (r && r.clips) || [] };
  }).catch(() => ({ reply:`${coachName()} could not answer right now. Try again in a minute.`, connected:false, clips:[] }));
}

// The doors an answer drew on, each a link that opens the full pitch in the Vault at the moment cited
const appPitches = [];
function appPitchLinks(clips){
  // Two moments from one door are one pitch to listen to
  const doors = new Set();
  clips = clips.filter(c => { const k = `${c.prefix}/${c.door}`; return doors.has(k) ? false : doors.add(k); });
  return clips.map(c => {
    const k = appPitches.push(c) - 1;
    return `<button class="example-chip pitch-link" type="button" data-pk="${k}">
      <span class="play-btn" aria-hidden="true"><i class="ph-fill ph-play"></i></span>
      <span><span class="example-label">Listen to the full pitch</span><span class="example-title">${esc(c.title)}</span></span>
    </button>`;
  }).join('');
}
async function appOpenPitch(c){
  if (currentXP < audioUnlockXP) { haptic('wrong'); showToast(`The Vault opens at ${audioUnlockXP} XP.`, 'ph-lock-simple'); return; }
  let r = VX.reps.find(x => x.days[0].doors.some(d => d.prefix === c.prefix && d.orig === c.door));
  if (!r) {
    // Not one of the featured days the Vault loaded: fetch that day and add it
    r = await appCall('vaultDay', { prefix: c.prefix }).catch(() => null);
    if (!r) { showToast("That door isn't in the Vault yet.", 'ph-warning'); return; }
    VX.reps.push(r);
    if (VX.people && !VX.people.some(p => p.id === r.who)) VX.people.push({ id:r.who, name:r.name, ini:r.ini, color:r.color });
  }
  const k = r.days[0].doors.findIndex(d => d.prefix === c.prefix && d.orig === c.door);
  if (k < 0) { showToast("That door isn't in the Vault yet.", 'ph-warning'); return; }
  haptic('tap');
  vxOpened = true;   // straight to the door, no Vault entrance
  tourGo('recordings');
  vxOpenDay(r.id, k + 1, Math.max(0, c.st - 2));
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.pitch-link');
  if (b) appSafe('pitch link', () => appOpenPitch(appPitches[+b.dataset.pk]));
});
document.head.insertAdjacentHTML('beforeend', '<style>.pitch-link{ font:inherit; color:inherit; text-align:left; cursor:pointer; }'
  + ' .pitch-link .play-btn{ display:grid; place-items:center; border-radius:50%; background:var(--amber); color:#14161b; flex:none; }</style>');

const libName = () => APP && !(APP.brand && APP.brand.isAce) ? 'Book Library' : 'Ace Library';

let appSaveTimer = 0;
function appSaveMe(){
  if (!APP) return;
  clearTimeout(appSaveTimer);
  appSaveTimer = setTimeout(() => appSend('saveLook', { look: { ...ME.look, shout: ME.shout || '' } }), 700);
}
// The podium message rides along in the saved look, so it shows on every phone. A message set on this
// phone before that was saved goes up once; after that the account's copy wins.
if (APP) {
  const saved = APP.me.look && typeof APP.me.look.shout === 'string' ? APP.me.look.shout : null;
  if (saved !== null) ME.shout = saved;
  else if (ME.shout && APP.me.look) appSaveMe();
  if (ME.look) delete ME.look.shout;
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
      ? `<iframe src="${/youtube\.com\/embed/.test(url) ? ytPlayer(url, true) : `${url}${url.includes('?') ? '&' : '?'}autoplay=1&playsinline=1`}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`
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
      showToast(`Sent to ${r.reach} ${r.reach === 1 ? 'rep' : 'reps'}` + (r.sent ? `, ${r.sent} ${r.sent === 1 ? 'phone' : 'phones'} notified` : ', but nobody has notifications on yet'), 'ph-paper-plane-right');
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

// ---- Billing: its own Owner view tab; opens the company's Billing page on the website (Stripe) ----
// The link leaves the app: GameScreen's onShouldStart hands any outside URL to the phone's browser.
if (APP && APP.me.billingUrl) {
  const tabs = document.querySelector('.ow-tabs');
  tabs.style.gridTemplateColumns = 'repeat(5,1fr)';
  const bt = document.createElement('button');
  bt.type = 'button'; bt.dataset.tab = 'billing';
  bt.innerHTML = '<svg class="ow-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.2" fill="currentColor"/><rect x="2" y="8.2" width="20" height="2.6" fill="#08080a"/><rect x="5" y="14" width="6" height="2" rx="1" fill="#08080a"/></svg>Billing';
  bt.addEventListener('click', () => { owState.tab = 'billing'; $('ow-scroll').scrollTop = 0; haptic('tap'); renderOwner(); });
  tabs.appendChild(bt);
  const baseTraining = trainingHTML;
  trainingHTML = function(){
    if (owState.tab !== 'billing') return baseTraining();
    return `<div class="ow-h"><h2>Billing</h2></div>
      <div class="ow-card ow-form"><p class="ow-note" style="margin:0 0 12px">Set up your company's payment, see invoices and receipts, or change the bank account or card on file. It opens in your browser on the SLAB website, where payments are handled securely by Stripe.</p>
      <a class="ow-btn" href="${owEsc(APP.me.billingUrl)}" style="display:flex;text-decoration:none">Open billing</a></div>
      <p class="ow-note">Sign in with the same email and password you use in the app.</p>`;
  };
}

// SLAB's logo in its true colors (tools/game/slab-true.png, filled in by build.py)
const SLAB_TRUE = '/*SLAB_TRUE*/';

if (APP) {
  // The company's real reps, ranked by total XP; reps without a saved look show the default rep
  if (APP.leaders && APP.leaders.length) leaders.splice(0, leaders.length, ...APP.leaders.map(l => ({ props:0, lessons:0, bosses:0, books:0, badges:[], ...l, look: Object.assign({ ...DEFAULT_LOOK }, l.look || {}) })));
  // The page needs the rep's own row
  if (!leaders.some(l => l.you)) leaders.push({ name: APP.me.name, streak: APP.me.streakDays, xp: APP.me.xp, you:true, props:0 });

  // Company branding: accent color and co-brand line from the tenant config
  const accent = APP.brand && APP.brand.accent;
  if (!APP.brand || !APP.brand.isAce) {
    // SLAB's own logo in its true colors (white letters, orange box) everywhere but Ace, whose app
    // tints it Ace gold
    // A company may want SLAB in one of its colors instead (theme.slabLogo; ProTerra: its pink), the way
    // Ace's app shows it in Ace gold: the corner logo and the opening splash keep SLAB's white letters
    // and turn the orange box that color
    const tint = APP.brand && APP.brand.slabLogo;
    const st = document.createElement('style');
    const logoCss = (url) => `.slab-logo{ background:url(${url}) center / contain no-repeat !important; -webkit-mask:none !important; mask:none !important; }`;
    st.textContent = logoCss(SLAB_TRUE);
    document.head.appendChild(st);
    const splashSlab = [...document.querySelectorAll('#bt-co .bt-logos img:first-child')];
    splashSlab.forEach(img => { img.src = SLAB_TRUE; });
    if (tint && /^#?[0-9a-f]{6}$/i.test(tint.trim())) {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
        const px = g.getImageData(0, 0, cv.width, cv.height), d = px.data, h = tint.trim().replace('#', '');
        const T = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
        for (let i = 0; i < d.length; i += 4) {
          if (!d[i + 3]) continue;
          const r = d[i], gg = d[i + 1], b = d[i + 2];
          if (r - b < 60 || r < gg) continue;                       // white letters and dark ink stay
          const k = Math.min(1.25, (r + gg + b) / (0xF4 + 0x71 + 0x1E));  // keep the box's shading
          d[i] = Math.min(255, Math.round(T[0] * k)); d[i + 1] = Math.min(255, Math.round(T[1] * k)); d[i + 2] = Math.min(255, Math.round(T[2] * k));
        }
        g.putImageData(px, 0, 0);
        const url = cv.toDataURL();
        splashSlab.forEach(img => { img.src = url; });
        st.textContent = logoCss(url);
      };
      im.src = SLAB_TRUE;
    }
  }
  // (only companies set up with their own look: older company records carry a blue default)
  if (APP.brand && APP.brand.background && APP.brand.splash) document.documentElement.style.setProperty('--bg', APP.brand.background);
  if (accent && !APP.brand.isAce && /^#?[0-9a-f]{6}$/i.test(accent.trim())) {
    // The demo also draws Ace gold straight into its styles (glows, 3D button shading, rings); every
    // one of those follows the company accent, darker shades as darker mixes of it. Golden Door and
    // coin golds are other colors and stay gold.
    const n = parseInt(accent.trim().replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const mix = (to, t) => '#' + c.map(v => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
    const GOLDS = [
      [/#daae5d/gi, accent], [/rgba\(\s*218\s*,\s*174\s*,\s*93\s*,/g, `rgba(${c.join(',')},`],
      [/#f3d48a/gi, mix(255, 0.35)], [/#b4883a/gi, mix(0, 0.25)], [/#6b4f1c/gi, mix(0, 0.6)],
      // (the darkest shades are fills behind gold on black; on a light theme they are light tints instead)
      ...(APP.brand.light ? [[/#4a3b1c/gi, mix(255, 0.72)], [/#2e2614/gi, mix(255, 0.8)], [/#1a1408/gi, mix(255, 0.9)]]
        : [[/#4a3b1c/gi, mix(0, 0.72)], [/#2e2614/gi, mix(0, 0.8)], [/#1a1408/gi, mix(0, 0.9)]]),
    ];
    document.querySelectorAll('style').forEach(s => {
      let t = s.textContent, was = t;
      GOLDS.forEach(([re, to]) => { t = t.replace(re, to); });
      if (t !== was) s.textContent = t;
    });
  }
  // The owner screens name the rep's own company (the demo says Ace Cooperatives)
  if (APP.me.companyName) {
    const CO = String(APP.me.companyName).toUpperCase();
    document.querySelectorAll('.rv-kick').forEach(k => { k.textContent = `${CO} · OWNER`; });
    document.querySelectorAll('.ow-co').forEach(k => { k.textContent = CO; });
  }
  if (accent && !APP.brand.isAce && /^#?[0-9a-f]{6}$/i.test(accent.trim())) {
    // The Vault door's brass (painted pixel by pixel) takes the company accent: gold pixels keep their
    // light and shade but turn the accent's hue
    const hex = accent.trim().replace('#', ''), A = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const mx = Math.max(...A), mn = Math.min(...A), dl = mx - mn;
    const aH = dl === 0 ? 0 : mx === A[0] ? ((A[1] - A[2]) / dl + 6) % 6 / 6 : mx === A[1] ? ((A[2] - A[0]) / dl + 2) / 6 : ((A[0] - A[1]) / dl + 4) / 6;
    const tintGold = (cv) => {
      if (!cv || !cv.getContext) return;
      const g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, M = Math.max(r, gg, b), m = Math.min(r, gg, b), L = (M + m) / 2, D = M - m;
        if (D < 0.08 || M !== r || b > gg) continue;                       // greys, steel and non-gold stay
        const S = D / (1 - Math.abs(2 * L - 1)), H = ((gg - b) / D) / 6;
        if (H < 0.06 || H > 0.17 || S < 0.25) continue;
        const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q;
        const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        d[i] = Math.round(f(aH + 1 / 3) * 255); d[i + 1] = Math.round(f(aH) * 255); d[i + 2] = Math.round(f(aH - 1 / 3) * 255);
      }
      g.putImageData(im, 0, 0);
    };
    const doorBase = paintVaultDoor, wheelBase = paintVaultWheel;
    paintVaultDoor = function(c){ doorBase(c); tintGold(c); };
    paintVaultWheel = function(c){ wheelBase(c); tintGold(c); };
    paintVaultDoor($('vault-door')); paintVaultWheel($('vault-wheel'));
  }
  if (accent && !APP.brand.isAce) {
    // the accent's dim fill, hairline and light tint follow it (SLAB's own is orange)
    const m = /^#?([0-9a-f]{6})$/i.exec(accent.trim()), rs = document.documentElement.style;
    rs.setProperty('--amber', accent);
    rs.setProperty('--ace-gold', accent);
    if (m) {
      const n = parseInt(m[1], 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      const mix = (to, t) => '#' + c.map(v => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
      rs.setProperty('--amber-dim', mix(12, 0.8));
      rs.setProperty('--amber-line', `rgba(${c.join(',')},0.38)`);
      rs.setProperty('--amber-soft', mix(255, 0.35));
    }
  }
  if (APP.brand && APP.brand.cobrand) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (/SLAB\s*[×x]\s*ACE/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/SLAB\s*[×x]\s*ACE/ig, APP.brand.cobrand);
    }
  }
  // The app holds its own SLAB × company curtain over start-up (src/launch/LaunchCurtain.tsx) and parts it
  // once this page has painted, so the page's own opening is skipped on the first boot; what follows it
  // (the owner's "Where to?", onboarding) waits until the curtain starts to part
  if (APP.nativeCurtain) {
    const pageBoot = runBoot;
    let firstBoot = true;
    runBoot = async function(){
      if (!firstBoot) return pageBoot();
      firstBoot = false;
      $('boot').classList.remove('live');
      let opened = false;
      const open = () => { if (opened) return; opened = true; if (bootDone) { const f = bootDone; bootDone = null; f(); } };
      window.__appCurtainOpen = open;
      setTimeout(open, 15000);
      requestAnimationFrame(() => requestAnimationFrame(() => appSend('ready')));
    };
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
    // A company with its own co-brand and logo (APP.brand.splash) also opens on SLAB × their logo,
    // with their name under it, the way Ace reps open on SLAB × Ace
    if (APP.brand && APP.brand.splash && APP.brand.logoUrl) {
      document.querySelectorAll('#bt-co img[data-img="ace"]').forEach(img => { img.src = APP.brand.logoUrl; });
      document.querySelectorAll('#bt-co .bt-tag').forEach(t => { t.textContent = String(APP.brand.splash).toUpperCase(); });
    }
    ACE.splice(0, ACE.length);
    // Nothing of the company's own in the library yet: say so under the Book Library
    const aceBase = renderAce;
    renderAce = function(){
      aceBase();
      if (!ACE.length && !aceState.section && !aceState.q.trim()) $('ace-body').innerHTML = '<div class="lib-empty">Nothing Added Yet</div>';
    };
    renderAce();
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

// A rep gets 50 seconds to answer the boss (was 30; Alston added 20 on 2026-11-13). When time runs out whatever is typed
// goes in; with nothing typed the round counts as a miss.
const REPLY_SECONDS = 50;
if (APP) {
  const baseRoundAI = nextRoundAI;
  nextRoundAI = async function(){
    await baseRoundAI();
    const form = $('fv-type');
    if (!form || form.hidden || fight.over) return;
    form.insertAdjacentHTML('beforebegin', `<div class="fv-clock" id="fv-clock"><i style="animation-duration:${REPLY_SECONDS}s"></i><b class="num">${REPLY_SECONDS}</b></div>`);
    const clock = $('fv-clock'), end = Date.now() + REPLY_SECONDS * 1000;
    const tick = setInterval(() => {
      if (fight.over || !form.isConnected) { clearInterval(tick); clock.remove(); return; }
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      clock.querySelector('b').textContent = left;
      clock.classList.toggle('low', left <= 5);
      if (left > 0) return;
      clearInterval(tick); clock.remove();
      if ($('fv-in').value.trim()) { $('fv-send').click(); return; }
      const box = document.createElement('div'); box.className = 'fv-box fv-mine';
      box.innerHTML = `<div class="fv-speaker">${bookEsc(meName())}</div><p class="fv-hint">...</p>`;
      form.replaceWith(box);
      const said = ($('fv-say') ? $('fv-say').textContent : '').replace(/^"|"$/g, '');
      fight.aiSay = 'Hello? You gonna say something or should I shut the door?';
      fight.turns.push({ role:'user', content:`Homeowner just said: "${said}"\nRep froze and said nothing for ${REPLY_SECONDS} seconds.` },
                       { role:'assistant', content:JSON.stringify({ tier:'bad', reply:fight.aiSay, sold:false }) });
      choose({ tier:'bad', k:-1 }, { tip:'Out of time. At the door, dead air loses the sale, so say something even if it isn\'t perfect.', o:[{ tier:'best', t:'Totally fair. Quick question though, have you noticed any spiders or ants this season?' }] });
    }, 250);
  };
}

// ============ NOTIFICATION SWITCHES (profile settings) ============
// Push asks the phone for permission and registers it; the others are saved to the account.
if (APP && APP.notif) ME.notif = Object.assign({}, ME.notif, APP.notif);
function appNotif(id, on, cb){
  cb.disabled = true;
  appCall('notif', { id, on }).then(() => {
    ME.notif[id] = on; saveMe(); haptic('tap');
    if (id === 'push') { showToast(on ? 'Notifications are on' : 'Notifications are off', on ? 'ph-lightning' : 'ph-bell-slash'); renderProfile(true); }
    else cb.disabled = false;
  }).catch(e => {
    cb.checked = !on; cb.disabled = false;
    showToast((e && e.message) || 'Couldn\'t save that', 'ph-bell-slash');
  });
}

// The Vault door goes up in the same frame the Vault page shows (the demo waited a tick, so the
// page flashed for a frame before the door covered it). Registered after the page switch handler.
document.querySelectorAll('.navbtn').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.page === 'recordings') appSafe('vault door', vxSync);
}));

// ============ TOUR: WHAT'S WAITING IN THE VAULT AND ON THE LEADERBOARD ============
// New reps get a peek inside the Vault (even while it's locked) and see this month's prize, so they
// know what the XP is for. The peek is undone when the tour ends.
let tourPeek = null;
function tourGo(page){
  const b = document.querySelector(`.navbtn[data-page="${page}"]`);
  if (b && !b.classList.contains('active')) b.click();
}
function tourVault(){
  if (!tourPeek) tourPeek = { opened: vxOpened };
  vxOpened = true;   // no door during the tour
  $('recordings-lock').style.display = 'none';
  $('recordings-content').classList.remove('locked-blur');
  tourGo('recordings');
  $('phone').classList.remove('vault-locked');
  if (vxView !== 'days') vxView = 'days';
  vxRenderDays(); vxSync();
}
function tourDone(){
  if (tourPeek) { vxOpened = tourPeek.opened; tourPeek = null; }
  tourGo('courses');
  applyLockStates(); applyVaultLock(); vxSync();
}
const vaultLockLine = () => currentXP < audioUnlockXP ? ` It opens at ${audioUnlockXP} XP.` : '';
const tourAt = TOUR.findIndex(t => t.sel === '#me-btn');
TOUR.splice(tourAt < 0 ? TOUR.length : tourAt, 0,
  { sel:'#vx .vx-reps', go: tourVault, get text(){ return 'This is the Vault: full days of the best reps knocking doors. Pick a rep and listen door by door while you drive.' + vaultLockLine(); } },
  { sel:'#vx .vx-seg button[data-v="reels"]', go: tourVault, text:'Reels is a feed of the best moments: closes, objections, switchovers. Tune it to hear exactly what you need to work on.' },
  { sel:'#prize-stage', go: () => tourGo('leaderboard'), get text(){ return 'The rep with the most XP this month wins the prize. Every lesson, boss and Vault minute counts.'; } },
);

// Steps whose target isn't in the app (the old lesson path) would show as gaps in "3 of 10"
const baseRunTour = runTour;
runTour = function(){
  for (let i = TOUR.length - 1; i >= 0; i--) if (!TOUR[i].go && !document.querySelector(TOUR[i].sel)) TOUR.splice(i, 1);
  TOUR.forEach(t => { if (!t.go) t.go = () => tourGo('courses'); });
  baseRunTour();
};

// ============ EVERY REP IN THEIR OWN COMPANY'S GEAR ============
// The global board mixes companies. global_leaderboard puts each rep's company gear inside their look
// (look.gear: name, letters, primary, dark), so a SLAB rep's tee stays SLAB orange and an Ace rep's stays
// Ace gold whoever is looking. The sprite engine reads the brand from a few globals; drawing a rep with
// look.gear swaps them in for that one sprite.
const GEAR_HOME = { name: (APP_GEAR && APP_GEAR.name) || 'Ace', letters: GEAR_LETTERS.join(''), primary: ACE_GOLD, dark: ACE_BLACK };
function setGearBrand(g){
  ACE_GOLD = g.primary; ACE_BLACK = g.dark;
  GEAR_LETTERS = String(g.letters || 'SLAB').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).split('');
  if (!GEAR_LETTERS.length) GEAR_LETTERS = ['S'];
  GEAR_X0 = Math.round(17.5 - (GEAR_LETTERS.length * 4 - 1) / 2);
  Object.assign(TOPS.tee, { body:ACE_BLACK, logo:ACE_GOLD }); TOPS.polo.body = ACE_GOLD; TOPS.vest.body = ACE_BLACK;
  TOPS.hoodie.logo = ACE_GOLD; Object.assign(TOPS.varsity, { body:ACE_BLACK, sleeveColor:ACE_GOLD }); SHOES.gold = ACE_GOLD;
}
const repGear = (look) => {
  const g = look && look.gear;
  if (!g || !/^#[0-9a-f]{6}$/i.test(g.primary || '')) return null;
  return { name: g.name || 'SLAB', letters: g.letters || g.name || 'SLAB', primary: g.primary, dark: /^#[0-9a-f]{6}$/i.test(g.dark || '') ? g.dark : '#1b1b20' };
};
const composeHome = composeSprite;
composeSprite = function(look, pose, mood){
  const g = repGear(look);
  if (!g || (g.primary.toLowerCase() === GEAR_HOME.primary.toLowerCase() && g.dark.toLowerCase() === GEAR_HOME.dark.toLowerCase() && g.letters === GEAR_HOME.letters)) return composeHome(look, pose, mood);
  setGearBrand(g);
  try { return composeHome(look, pose, mood); } finally { setGearBrand(GEAR_HOME); }
};
// and their flex chips name their own company's gear ("SLAB hoodie", not "Proterra hoodie")
const flexItemsHome = flexItems;
flexItems = function(rep){
  const items = flexItemsHome(rep), g = repGear(rep.look);
  if (!g || g.name === GEAR_HOME.name) return items;
  const re = new RegExp('\\b' + GEAR_HOME.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  return items.map(it => ({ ...it, name: it.name.replace(re, g.name) }));
};

// ============ LEADERBOARD: MY COMPANY OR EVERYONE ============
// Every rep can flip between their company's board and the global one (global_leaderboard, every
// SLAB rep by total XP). Reps without a company only have the global board.
const NO_COMPANY = 'You’re not registered with a company';
const appSolo = () => !!(APP && APP.me.solo);
const lbFill = (l) => ({ props:0, lessons:0, bosses:0, books:0, badges:[], ...l, look: Object.assign({ ...DEFAULT_LOOK }, l.look || {}) });
const lbBoards = APP ? { company: leaders.slice(), global: APP.globalLeaders ? APP.globalLeaders.map(lbFill) : null } : null;
let lbScope = 'company';
if (APP) {
  try { if (localStorage.getItem('slab.lbScope') === 'global') lbScope = 'global'; } catch (e) {}
  if (appSolo()) lbScope = 'global';
  if (!lbBoards.global) lbScope = 'company';
}
function lbSetScope(scope){
  lbScope = scope;
  try { localStorage.setItem('slab.lbScope', scope); } catch (e) {}
  const board = lbBoards[scope] || lbBoards.company;
  // the rep's own row keeps its live XP and look whichever board shows
  leaders.splice(0, leaders.length, ...board);
  if (!leaders.some(l => l.you)) leaders.push(lbFill({ name: APP.me.name, streak: APP.me.streakDays, xp: currentXP, you:true }));
  const pz = document.querySelector('#page-leaderboard .prize');
  if (pz) pz.style.display = scope === 'global' || !APP.features.monthlyPrize ? 'none' : '';
  const sub = document.querySelector('#page-leaderboard .page-sub');
  if (sub) sub.textContent = scope === 'global' ? 'Every SLAB rep, ranked by total XP' : 'Your company, ranked by total XP';
  document.querySelectorAll('#lb-scope button').forEach(b => {
    const on = b.dataset.scope === scope;
    b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
  });
  renderLeaderboard(false);
}
if (APP) {
  const list = $('leaderboard');
  list.insertAdjacentHTML('beforebegin', `<div class="lb-scope" id="lb-scope" role="tablist" aria-label="Which leaderboard">
    <button type="button" role="tab" data-scope="company">${appSolo() ? '<i class="ph-fill ph-lock-simple" aria-hidden="true"></i>' : ''}My Company</button>
    <button type="button" role="tab" data-scope="global"><svg class="lb-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.5 3.9 5.5 3.9 9s-1.3 6.5-3.9 9c-2.6-2.5-3.9-5.5-3.9-9s1.3-6.5 3.9-9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>Global</button></div>`);
  $('lb-scope').addEventListener('click', (e) => {
    const b = e.target.closest('[data-scope]'); if (!b || b.dataset.scope === lbScope) return;
    if (b.dataset.scope === 'company' && appSolo()) { haptic('wrong'); showToast(NO_COMPANY, 'ph-lock-simple'); return; }
    if (b.dataset.scope === 'global' && !lbBoards.global) { showToast('The global leaderboard isn\u2019t live yet', 'ph-trophy'); return; }
    haptic('tap'); lbSetScope(b.dataset.scope);
  });
  // On the global board each rep shows their company
  const baseRenderLb = renderLeaderboard;
  renderLeaderboard = function(changed){
    baseRenderLb(changed);
    if (lbScope !== 'global') return;
    document.querySelectorAll('#leaderboard .lb-row').forEach(row => {
      const l = leaders.find(x => x.name === row.dataset.name), n = row.querySelector('.lb-name');
      if (l && n && !l.you) n.insertAdjacentHTML('beforeend', `<small class="lb-co">${esc(l.company || 'Solo')}</small>`);
    });
  };
  lbSetScope(lbScope);
}

// ============ SOLO: NO COMPANY YET ============
// Reps who aren't registered with a company get the Vault, Ask Marshall, Marshall's videos and the
// global leaderboard. The Lab (and its boss fights) and the Library stay locked, and say why when tapped.
if (appSolo()) {
  document.documentElement.classList.add('solo');
  document.querySelectorAll('.navbtn[data-page="library"]').forEach(b => b.classList.add('solo-lock'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbtn[data-page="library"]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    haptic('wrong'); showToast(NO_COMPANY, 'ph-lock-simple');
  }, true);
  const stats = document.querySelector('#page-courses .stats');
  if (stats) stats.insertAdjacentHTML('afterend', `<button class="solo-banner" id="solo-banner" type="button">
    <i class="ph-fill ph-lock-simple" aria-hidden="true"></i>
    <span><b>${NO_COMPANY}</b>The Lab opens when you join one. Your Vault, Marshall and the global leaderboard are open now.</span>
    <i class="ph ph-caret-right" aria-hidden="true"></i></button>`);
  const sb = $('solo-banner'); if (sb) sb.addEventListener('click', () => { haptic('tap'); openSoloWelcome(); });

  // The walkthrough: what's theirs, then a tour of it
  TOUR.splice(0, TOUR.length,
    { sel:'#xp-pill', go: () => tourGo('courses'), text:'This is your XP. Every minute in the Vault and every question you ask Marshall adds to it, and more XP unlocks more gear.' },
    { sel:'#vx .vx-reps', go: tourVault, text:'This is the Vault: real pitches, full days of top reps knocking doors. Pick a rep and listen door by door while you drive. Marshall’s page has his videos too.' },
    { sel:'#vx .vx-seg button[data-v="reels"]', go: tourVault, text:'Reels is a feed of the best moments: closes, objections, switchovers. Tune it to hear exactly what you need to work on.' },
    { sel:'.nav-marshall', go: () => tourGo('courses'), text:'Tap Marshall to ask him anything: objections, price, what to say at the door.' },
    { sel:'#lb-scope', go: () => tourGo('leaderboard'), text:'Tap Global to see every SLAB rep, ranked by XP. See where you stack up.' },
    { sel:'.navbtn[data-page="library"]', go: () => tourGo('courses'), text:'The Lab, boss fights and the Library come with a company. When yours signs up, they unlock.' },
    { sel:'#me-btn', go: () => tourGo('courses'), text:'Tap your rep anytime to change your gear and check when power hour starts.' },
  );
}
const SOLO_SEEN = 'slab.soloWelcome';
function openSoloWelcome(){
  closeSoloWelcome();
  try { localStorage.setItem(SOLO_SEEN, '1'); } catch (e) {}
  const wrap = document.createElement('div');
  wrap.className = 'ss-wrap solo-wrap'; wrap.id = 'solo-wrap';
  const item = (icon, title, text) => `<li><i class="ph-fill ${icon}" aria-hidden="true"></i><span><b>${title}</b>${text}</span></li>`;
  wrap.innerHTML = `<div class="ss-backdrop" data-close></div>
    <div class="streak-sheet solo-sheet" role="dialog" aria-modal="true" aria-labelledby="solo-h">
      <div class="ss-grab" aria-hidden="true"></div>
      <div class="solo-kick">NO COMPANY YET</div>
      <h2 class="solo-h" id="solo-h">Here’s what’s yours</h2>
      <p class="solo-p">You’re not registered with a company, but you can start training now.</p>
      <ul class="solo-list">
        ${item('ph-headphones', 'Real pitches', 'Full days of top reps in the Vault, door by door.')}
        ${item('ph-chat-teardrop-text', 'Ask Marshall', 'Objections, price, what to say. Ask anything.')}
        ${item('ph-play-circle', 'Marshall’s videos', 'On his page in the Vault.')}
        ${item('ph-trophy', 'Global leaderboard', 'Every SLAB rep, ranked by XP.')}
      </ul>
      <div class="solo-locked"><i class="ph-fill ph-lock-simple" aria-hidden="true"></i>The Lab, boss fights and the Library unlock when you join a company.</div>
      <button class="btn btn-primary" id="solo-tour" type="button">Show me around</button>
      <button class="btn btn-quiet" type="button" data-close>Not now</button>
    </div>`;
  $('phone').appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeSoloWelcome()));
  $('solo-tour').addEventListener('click', () => { closeSoloWelcome(); setTimeout(runTour, 380); });
}
function closeSoloWelcome(){
  const w = $('solo-wrap'); if (!w) return;
  w.classList.remove('show'); setTimeout(() => w.remove(), 320);
}
if (appSolo()) {
  // New reps build their rep first and their onboarding ends on the tour; reps who already have a
  // look see the welcome once
  const baseTour = runTour;
  runTour = function(){ try { localStorage.setItem(SOLO_SEEN, '1'); } catch (e) {} baseTour(); };
  setTimeout(() => {
    let seen = false; try { seen = !!localStorage.getItem(SOLO_SEEN); } catch (e) {}
    if (!seen && ME.onboarded && !document.querySelector('.coach, #onboard')) openSoloWelcome();
  }, 1200);
}

// ============ SLAB ADMINS: VIEW THE APP AS ANY COMPANY ============
// A super admin picks a company (or none, for solo) in their profile; the account moves there
// (admin_switch_company) and the app reloads as that company's reps see it.
if (APP && APP.me.superAdmin) {
  const baseRoleCard = roleCardHTML;
  roleCardHTML = function(){
    return `<div class="me-card me-role"><span class="ow-lab">SLAB admin · viewing the app as</span>
      <button class="ow-btn" id="me-switch-co" type="button">${esc(APP.me.companyName || 'No company (solo)')} &middot; Switch</button></div>` + baseRoleCard();
  };
  const baseRenderProfile = renderProfile;
  renderProfile = function(keep){
    baseRenderProfile(keep);
    const b = $('me-switch-co'); if (b) b.onclick = () => { haptic('tap'); openCompanySwitch(); };
  };
}
function openCompanySwitch(){
  const old = $('co-wrap'); if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.className = 'ss-wrap co-wrap'; wrap.id = 'co-wrap';
  wrap.innerHTML = `<div class="ss-backdrop" data-close></div>
    <div class="streak-sheet co-sheet" role="dialog" aria-modal="true" aria-labelledby="co-h">
      <div class="ss-grab" aria-hidden="true"></div>
      <h2 id="co-h">View the app as</h2>
      <p class="ss-sub">Your account moves to that company until you switch back. XP you earn counts there.</p>
      <div class="co-list" id="co-list"><div class="co-wait">Loading companies...</div></div>
    </div>`;
  $('phone').appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 320); };
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  appCall('companies').then(list => {
    const rows = [{ id:'', name:'No company (solo)' }, ...(list || [])];
    $('co-list').innerHTML = rows.map(c => {
      const on = c.id === '' ? APP.me.solo : !APP.me.solo && c.name === APP.me.companyName;
      return `<button class="co-row${on ? ' on' : ''}" type="button" data-co="${esc(c.id || '')}"><span>${esc(c.name || 'Company')}</span>${on ? '<i class="ph-fill ph-check-circle" aria-hidden="true"></i>' : ''}</button>`;
    }).join('');
    $('co-list').querySelectorAll('[data-co]').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('on')) { close(); return; }
      haptic('tap');
      $('co-list').innerHTML = '<div class="co-wait">Switching...</div>';
      appCall('switchCompany', { id: b.dataset.co || null }).catch(e => { showToast((e && e.message) || 'Couldn’t switch', 'ph-warning'); close(); });
    }));
  }).catch(e => { $('co-list').innerHTML = `<div class="co-wait">${esc((e && e.message) || 'Couldn’t load companies')}</div>`; });
}

// ---- Ask Marshall by voice: the mic beside the chat box (src/game/voice.ts does the listening) ----
// Words fill the chat box as they're heard; the rep checks them and taps send. Marshall doesn't talk back yet.
let appVoiceOn = false, appVoiceBase = '';
function appVoiceSet(on){
  appVoiceOn = on;
  const b = $('chat-mic-btn'); if (!b) return;
  b.classList.toggle('on', on);
  b.setAttribute('aria-label', on ? 'Stop listening' : 'Talk');
  chatInput.placeholder = on ? 'Listening...' : 'Ask anything...';
}
function appVoiceEvent(d){
  if (d.state === 'listening' && typeof d.text === 'string') {
    chatInput.value = (appVoiceBase ? appVoiceBase + ' ' : '') + d.text;
    sendBtn.disabled = !chatInput.value.trim() || awaitingReply;
  }
  if (d.state === 'idle') appVoiceSet(false);
  if (d.state === 'error') { appVoiceSet(false); showToast(d.error || 'Couldn’t hear that', 'ph-warning'); }
}
function appVoiceInit(){
  const b = $('chat-mic-btn');
  if (!b || !APP || !APP.voice) return;
  b.hidden = false;
  b.addEventListener('click', () => {
    haptic('tap');
    if (appVoiceOn) { appSend('listenStop'); return; }
    appVoiceBase = chatInput.value.trim();
    appVoiceSet(true);
    appCall('listen').catch(e => { appVoiceSet(false); showToast((e && e.message) || 'Mic isn’t available', 'ph-warning'); });
  });
  // Sending stops the mic so a late word doesn't land in the next message
  sendBtn.addEventListener('click', () => { if (appVoiceOn) appSend('listenStop'); });
}
appSafe('voice', appVoiceInit);

// ---- Vault days that arrive without transcripts (the index view keeps start-up light) ----
// Opening such a day fetches its doors' transcripts first, then opens it as usual.
function appNeedLines(rid){ const r = vxRep(rid); return !!r && r.days[0].doors.some(d => !d.lines); }
async function appFillLines(rid){
  const ds = vxRep(rid).days[0].doors;
  const prefixes = [...new Set(ds.filter(d => !d.lines && d.prefix).map(d => d.prefix))];
  if (prefixes.length) showToast('Loading that day...', 'ph-headphones');
  try {
    const got = prefixes.length ? await appCall('vaultLines', { prefixes }) : {};
    ds.forEach(d => { if (!d.lines) d.lines = ((got || {})[d.prefix] || {})[d.orig] || []; });
    return true;
  } catch (e) {
    showToast((e && e.message) || 'That day could not load', 'ph-warning');
    return false;
  }
}

// ============ THE COMPANY'S OWN COACH ============
// A company with its own coach sheet (APP.brand.coach.sprite, build.py puts it in Marshall's slot) gets
// that coach's name everywhere the chat is named. Marshall keeps his page in the Vault; with a Vault card
// of their own the coach climbs out of the nav onto that card instead of Marshall's.
const coachName = () => (APP && APP.brand && APP.brand.coach && APP.brand.coach.name) || 'Marshall';
if (APP_COACH) appSafe('coach', () => {
  const nm = APP_COACH.name || 'Coach', full = APP_COACH.fullName || nm;
  const r = repsData.marshall;
  r.name = full;
  r.chatTitle = `Ask ${nm}`;
  r.status = 'Trained on top reps’ real door interactions';
  $('chat-rep-name').textContent = r.chatTitle;
  $('chat-rep-status').textContent = r.status;
  const nav = document.querySelector('.nav-marshall'); if (nav) nav.setAttribute('aria-label', `Chat with ${nm}`);
  const lockDesc = document.querySelector('#chat-lock .lock-desc'); if (lockDesc) lockDesc.textContent = `Earn XP in the course to unlock Ask ${nm}.`;
  TOUR.forEach(s => { if (s.sel === '.navbar' || s.sel === '.nav-marshall') s.text = s.text.replace(/\bMarshall\b/g, nm); });
  vxHeadSync = function(){
    const e = navHead.el, want = $('phone').classList.contains('chat-open');
    if (want === e.classList.contains('away')) return;
    e.classList.toggle('away', want);
    if (want) { navHead.clear(); return; }
    e.classList.remove('back'); void e.offsetWidth; e.classList.add('back');
    setTimeout(() => e.classList.remove('back'), 700);
    if (avatarFrames.marshall && !reduceMotion) { navHead.draw(0); navHead.later(() => navHead.idle(), 450); }
  };
  // Simple mode shows the coach's still face
  const wait = setInterval(() => {
    const f = avatarFrames.marshall; if (!f) return;
    clearInterval(wait);
    r.photo = f[0].toDataURL('image/png');
  }, 150);
});

// The coach's own card in the Vault (APP.brand.coach.vaultTag), after Marshall and Rylan. Their days, once
// published under their name, play from it; until then it says they're on the way.
if (APP_COACH && APP_COACH.vaultTag) appSafe('coach vault card', () => {
  if (VX.people === VX.reps) VX.people = VX.reps.slice();   // the pack in the app lists its days as its people
  const full = APP_COACH.fullName || APP_COACH.name, first = String(full).split(' ')[0].toLowerCase();
  let p = VX.people.find(x => String(x.name).toLowerCase() === String(full).toLowerCase() || String(x.name).toLowerCase() === first);
  if (!p) VX.people.push(p = { id:'coach', name:full, ini:'', color:APP.brand.accent });
  VX_AVK[p.id] = 'marshall';                  // the coach's frames (build.py)
  VX_TAG[p.id] = APP_COACH.vaultTag;
  const cid = p.id;
  document.head.insertAdjacentHTML('beforeend', '<style>.vx-reps > .vx-rc:nth-child(odd):last-child{ grid-column:1 / -1; justify-self:center; width:calc(50% - 6px); }</style>');
  const baseRender = vxRenderDays;
  vxRenderDays = function(){
    baseRender();
    // the coach (not Marshall) climbs out of the nav onto their own card while the Days list is open
    document.querySelectorAll('#vx-days canvas.vx-face.rise').forEach(cv => cv.classList.remove('rise'));
    const face = document.querySelector(`#vx-days .vx-rc[data-rep="${cid}"] canvas.vx-face`); if (face) face.classList.add('rise');
    if (vxRepOpen || vxDaysOf(cid).length) return;
    const card = document.querySelector(`#vx-days .vx-rc[data-rep="${cid}"]`); if (!card) return;
    const sm = card.querySelector('small'); if (sm) sm.textContent = 'Days coming soon';
    card.onclick = () => { haptic('tap'); showToast(`${APP_COACH.name}’s recorded days are on the way`, 'ph-headphones'); };
  };
  const headOut = () => vxOnPage() && vxUnlocked() && vxView === 'days' && !vxDoorCovering() && (!vxRepOpen || vxRepOpen === cid) && !($('vx-pl') && $('vx-pl').classList.contains('on'));
  vxHeadSync = function(){
    const e = navHead.el, want = $('phone').classList.contains('chat-open') || headOut();
    if (want === e.classList.contains('away')) return;
    e.classList.toggle('away', want);
    if (want) { navHead.clear(); document.querySelectorAll('canvas.vx-face.rise').forEach(cv => { cv.classList.remove('rise'); void cv.offsetWidth; cv.classList.add('rise'); }); return; }
    e.classList.remove('back'); void e.offsetWidth; e.classList.add('back');
    setTimeout(() => e.classList.remove('back'), 700);
    if (avatarFrames.marshall && !reduceMotion) { navHead.draw(0); navHead.later(() => navHead.idle(), 450); }
  };
});

// A wide wordmark (rather than a square badge) gets room on the opening splash next to SLAB
if (APP && APP.brand && APP.brand.splash && APP.brand.logoUrl) appSafe('splash logo', () => {
  document.querySelectorAll('#bt-co .bt-logos img:last-child').forEach(img => {
    const fit = () => {
      if (img.naturalWidth <= img.naturalHeight * 2) return;
      img.style.width = '168px';
      const slab = img.parentNode && img.parentNode.querySelector('img:first-child'); if (slab && slab !== img) slab.style.width = '112px';
    };
    if (img.complete && img.naturalWidth) fit(); else img.addEventListener('load', fit, { once:true });
  });
});

// ============ LIBRARY NOT OPEN YET ============
// features.library false (company_app_config): the Library tab stays in the nav, dimmed, and says it's coming.
if (APP && APP.features && APP.features.library === false && !appSolo()) {
  document.head.insertAdjacentHTML('beforeend', '<style>.navbtn.lib-lock{ opacity:.45; }</style>');
  document.querySelectorAll('.navbtn[data-page="library"]').forEach(b => { b.classList.add('lib-lock'); b.setAttribute('aria-label', 'Library, coming soon'); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbtn[data-page="library"]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    haptic('wrong'); showToast('The Library is coming soon', 'ph-lock-simple');
  }, true);
}

// ============ LIGHT THEME ============
// A company on a light background (APP.brand.light, from its theme's background) gets the page in light:
// white surfaces, the theme's text color for ink, and the dark textured plate behind the top bar turned
// light with the same texture. The street itself is a scene and keeps its own colors.
if (APP && APP.brand && APP.brand.light) appSafe('light theme', () => {
  const ink = /^#?[0-9a-f]{6}$/i.test(String(APP.brand.ink || '').trim()) ? APP.brand.ink.trim() : '#14161b';
  const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mixC = (a, b, t) => '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  const I = hex(ink), W = [255, 255, 255];
  const acc = /^#?[0-9a-f]{6}$/i.test(String(APP.brand.accent || '').trim()) ? hex(APP.brand.accent.trim()) : I;
  const bg = APP.brand.background || '#ffffff';
  const rs = document.documentElement.style;
  const vars = {
    '--bg': bg,
    '--surface': mixC(W, I, 0.045),
    '--surface-2': mixC(W, I, 0.09),
    '--border': mixC(W, I, 0.17),
    '--hairline': mixC(W, I, 0.11),
    '--text': ink,
    '--text-dim': mixC(I, W, 0.42),
    '--amber-dim': mixC(W, acc, 0.12),
    '--amber-soft': mixC(acc, [0, 0, 0], 0.18),
    '--amber-line': `rgba(${acc.join(',')},0.35)`,
    '--green-dim': '#dcf3e6',
  };
  Object.entries(vars).forEach(([k, v]) => rs.setProperty(k, v));
  document.documentElement.classList.add('light');
  const st = document.createElement('style');
  st.textContent = `
    html.light body, html.light .phone{ background:${bg}; color:${ink}; }
    html.light .table-stage{ background:var(--bg-plate, ${bg}) center / cover no-repeat, ${bg}; }
    html.light .table-stage::after{ background:linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.45)); }
    html.light .grain-overlay{ mix-blend-mode:multiply; opacity:0.035; }
    html.light .bt-intro, html.light .bt-half{ background:${bg}; }
    html.light .vx-best span{ color:${ink}; text-shadow:2px 2px 0 ${mixC(W, acc, 0.3)}; }
    /* the boss fight stays a dark scene: its text keeps the dark theme's light colors, not the page ink */
    html.light #fight-view{ --bg:#0c0c0e; --surface:#161618; --surface-2:#1f1f22; --border:#2b2a27; --hairline:#211f1c; --text:#f2f0e9; --text-dim:#b9b3a6; --amber-dim:#2e2614; --amber-soft:#f3d48a; --green-dim:#173325; color:#f2f0e9; }
  `;
  document.head.appendChild(st);
  // The app's own screens draw some greys straight into their styles. In those rules every neutral color
  // flips: dark fills turn near white, light text and lines turn ink, by how light they were. Colored ones
  // (accent, gold, green, red) keep their color, dark shadows stay dark. Scenes (the street, boss fights,
  // the Vault door, the video player) aren't touched.
  const SCREENS = /\.(vx-|vault|mt-|mt\b|ow-|ow\b|bb-|bb\b|lb-|lb\b|pd-|me-|prize|lv-|q-opt|lib-|ace-|shelf|ob-|sheet|toast|bubble|example|chat-|seg\b|seg-|mascot|lock-|stats|leader|podium|lesson-view|cr-|onboard|pn-|push-note|ss-backdrop|avatar-frame|deck-dots|fx-badge|fx-props|vet-chip|pw-live|bv-check|btn-primary|unit-seg)/;
  const SCENES = /\.(vx-door|app-vid|st-|fv-|bt-)/;
  const parse = (c) => {
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { const x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]; const n = parseInt(x, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(c);
    return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null;
  };
  const flip = (c, lightOnly) => {
    const p = parse(c); if (!p) return c;
    const [r, g, b, a] = p;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 34) return c;            // a real color: keep it
    const L = (r + g + b) / 765;
    if (lightOnly && L < 0.55) return c;
    const o = W.map((v, i) => Math.round(v + (I[i] - v) * L));
    return a >= 1 ? '#' + o.map(v => v.toString(16).padStart(2, '0')).join('') : `rgba(${o.join(',')},${a})`;
  };
  const COLORS = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]*\)/gi;
  const flipDecls = (body) => body.replace(/([a-z-]+)\s*:([^;]*)/gi, (all, prop, val) => {
    const p = prop.toLowerCase();
    if (/^(color|background|background-color|background-image|border|border-[a-z-]+|outline|outline-color|fill|stroke|caret-color|text-decoration-color|accent-color)$/.test(p)) return `${prop}:${val.replace(COLORS, c => flip(c))}`;
    if (/^(box-shadow|text-shadow)$/.test(p)) return `${prop}:${val.replace(COLORS, c => flip(c, true))}`;
    return all;
  });
  document.querySelectorAll('style').forEach(s => {
    if (s === st) return;
    const was = s.textContent;
    const t = was.replace(/([^{}]+)\{([^{}]*)\}/g, (all, sel, body) => (SCREENS.test(sel) && !SCENES.test(sel) && !/^\s*@/.test(sel)) ? `${sel}{${flipDecls(body)}}` : all);
    if (t !== was) s.textContent = t;
  });
  // The little night-time houses on reels (Trending, Saved) turn daytime in the company's colors: pale sky
  // and ground, ink walls, accent roof, cream windows. The door keeps its color, since it says how the door went.
  const accHex = '#' + acc.map(v => v.toString(16).padStart(2, '0')).join('');
  const THUMB = { '#16140f': mixC(W, I, 0.05), '#2d2a24': '#ffffff', '#141a14': mixC(W, I, 0.16), '#2a2722': ink,
                  '#3d3830': accHex, '#f3d48a': '#f6ead0', '#3a3730': mixC(I, W, 0.3) };
  const thumbBase = vxThumb;
  vxThumb = function(cv, kind, seed){
    thumbBase(cv, kind, seed);
    const g = cv.getContext('2d'), im = g.getImageData(0, 0, cv.width, cv.height), d = im.data;
    const map = Object.entries(THUMB).map(([from, to]) => [hex(from), hex(to)]);
    for (let i = 0; i < d.length; i += 4) {
      const hit = map.find(([f]) => f[0] === d[i] && f[1] === d[i + 1] && f[2] === d[i + 2]);
      if (hit) { d[i] = hit[1][0]; d[i + 1] = hit[1][1]; d[i + 2] = hit[1][2]; }
    }
    g.putImageData(im, 0, 0);
  };
  // The plate: the same texture, inverted and pulled up toward white
  const plate = new Image();
  plate.onload = () => {
    const c = document.createElement('canvas'); c.width = plate.naturalWidth; c.height = plate.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(plate, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = 255 - Math.round(Math.min(d[i + k], 24) * 0.8);   // its few bright specks would show as grey dots
    g.putImageData(im, 0, 0);
    $('table-stage').style.setProperty('--bg-plate', `url(${c.toDataURL('image/png')})`);
  };
  plate.src = IMG.bgPlate;
  // SLAB's logo: its white letters would vanish on white, so they take the ink color (the box stays orange)
  const logo = new Image();
  logo.onload = () => {
    const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(logo, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mn > 170) { d[i] = I[0]; d[i + 1] = I[1]; d[i + 2] = I[2]; }
      // SLAB's orange takes the company accent, so the logo wears the same two colors as theirs
      else if (mx - mn > 60 && d[i] === mx) { const k = mx / 244; d[i] = Math.min(255, Math.round(acc[0] * k)); d[i + 1] = Math.min(255, Math.round(acc[1] * k)); d[i + 2] = Math.min(255, Math.round(acc[2] * k)); }
    }
    g.putImageData(im, 0, 0);
    const url = c.toDataURL('image/png');
    const s2 = document.createElement('style');
    s2.textContent = `.slab-logo{ background:url(${url}) center / contain no-repeat !important; -webkit-mask:none !important; mask:none !important; }`;
    document.head.appendChild(s2);
    document.querySelectorAll('#bt-co .bt-logos img:first-child').forEach(img => { img.src = url; });
  };
  logo.src = SLAB_TRUE;
});

// ============ LIGHT STREET: WHITE LESSON BUBBLES ============
// On a light-themed company the lesson names over the houses sit in white bubbles in the brand's ink,
// with the accent marking the lesson you're on and the boss.
if (APP && APP.brand && APP.brand.light) appSafe('light street labels', () => {
  const ink = /^#?[0-9a-f]{6}$/i.test(String(APP.brand.ink || '').trim()) ? APP.brand.ink.trim() : '#14161b';
  const acc = APP.brand.accent || '#e8413a';
  document.head.insertAdjacentHTML('beforeend', `<style>
    html.light .st-label span{ background:#fff; color:${ink}; border:1px solid ${ink}2e; box-shadow:0 1px 0 ${ink}26, 0 2px 6px rgba(0,0,0,.18); }
    html.light .st-label i{ color:${acc}; }
    html.light .st-label.active span, html.light .st-label.ready span{ background:#fff; color:${ink}; border:2px solid ${acc}; }
    html.light .st-label.active i, html.light .st-label.ready i{ color:${acc}; }
    html.light .st-label.locked span{ color:${ink}; border-color:${ink}2e; }
    html.light .st-label.locked i{ color:${ink}8c; }
    html.light .st-label.boss span{ background:#fff; color:${ink}; border-color:${acc}; }
    html.light .st-label.boss i{ color:${acc}; }
  </style>`);
});

// ============ LIGHT VAULT: A DOOR SET IN CONCRETE ============
// The dark wall around the vault door becomes pixel concrete (slabs, speckles, a few cracks). The hole in it
// grows the same way the dark one did when the door rolls away.
if (APP && APP.brand && APP.brand.light) appSafe('concrete vault', () => {
  const tex = (() => {
    const N = 96, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const r = rnd(); let v = 158 + Math.round((r - 0.5) * 10);
      if (r > 0.965) v = 128; else if (r > 0.93) v = 176; else if (r < 0.03) v = 140;
      g.fillStyle = `rgb(${v},${v + 1},${v + 4})`; g.fillRect(x, y, 1, 1);
    }
    // slab joints on two sides, so the tiles meet in a grid
    g.fillStyle = '#7f8287'; g.fillRect(0, 0, N, 1); g.fillRect(0, 0, 1, N);
    g.fillStyle = '#b3b5b9'; g.fillRect(0, 1, N, 1); g.fillRect(1, 0, 1, N);
    // hairline cracks
    const crack = (x, y, n, dx) => { for (let i = 0; i < n; i++) { g.fillStyle = '#85888d'; g.fillRect(x, y, 1, 1); y++; if (rnd() < 0.5) x += dx; } };
    crack(30, 14, 18, 1); crack(70, 52, 22, -1); crack(14, 66, 10, 1);
    return c.toDataURL();
  })();
  document.head.insertAdjacentHTML('beforeend', `<style>
    .vx-door .vx-cc{ position:absolute; inset:0; pointer-events:none; --r:158px;
      background:url(${tex}) 0 0 / 288px 288px repeat; image-rendering:pixelated;
      -webkit-mask:radial-gradient(circle at 50% 46%, transparent var(--r), #000 calc(var(--r) + 1px));
              mask:radial-gradient(circle at 50% 46%, transparent var(--r), #000 calc(var(--r) + 1px)); }
    html.light .vx-door .hole{ box-shadow:0 0 0 6px #5c5f65, 0 0 0 10px #34363a, 0 0 22px 12px rgba(0,0,0,.32); }
    html.light .vx-door.reveal .hole{ box-shadow:none; }
    html.light .vx-door .hint{ color:#fff; text-shadow:2px 2px 0 #34363a; }
    .vx-door.reveal .vx-cc{ --r:860px; transition:--r .8s cubic-bezier(.65,0,.35,1); }
  </style>`);
  // the hole's radius animates as a length (older phones without @property just open it in one step)
  if (window.CSS && CSS.registerProperty) { try { CSS.registerProperty({ name:'--r', syntax:'<length>', inherits:false, initialValue:'158px' }); } catch (e) {} }
  const baseDoorEl = vxDoorEl;
  vxDoorEl = function(){
    const had = $('vx-door'), d = baseDoorEl();
    if (!had) { const cc = document.createElement('div'); cc.className = 'vx-cc'; d.insertBefore(cc, d.firstChild); }
    return d;
  };
});

// ============ THE COACH'S VAULT PORTRAIT STAYS IN ITS FRAME ============
// The coach's sheet is drawn wider than Marshall's and Rylan's, so their card's frame is drawn over the portrait.
if (APP_COACH && APP_COACH.vaultTag) appSafe('coach frame', () => {
  document.head.insertAdjacentHTML('beforeend', `<style>
    .vx-rc .vx-fwrap{ position:relative; }
    .vx-rc .vx-fwrap.coach-frame::after{ content:""; position:absolute; inset:0; box-shadow:inset 0 0 0 2px var(--vx-frame, #2e281e); pointer-events:none; z-index:2; }
  </style>`);
  const baseRender = vxRenderDays;
  vxRenderDays = function(){
    baseRender();
    const cv = document.querySelector('#vx-days .vx-rc canvas.vx-face[data-av="marshall"]'); if (!cv) return;
    const w = cv.parentNode; w.classList.add('coach-frame');
    // the same color the theme gave the other frames
    const m = getComputedStyle(w).boxShadow.match(/rgba?\([^)]*\)/); if (m) w.style.setProperty('--vx-frame', m[0]);
  };
});

// ============ EXTRA RIDES (features.extraRides) ============
// A company can add rides to the Segway and e-scooter. 'skateboard': a deck in the brand's colors
// (dark deck, accent stripe, cream wheels), unlocked at 2000 XP.
if (APP && APP.features && Array.isArray(APP.features.extraRides) && APP.features.extraRides.includes('skateboard')) appSafe('skateboard', () => {
  const gb = (APP.brand && APP.brand.gear) || {};
  const DECK = gb.dark || '#0b243b', STRIPE = gb.primary || APP.brand.accent || '#cb272d', GRIP = '#1b1e23';
  const who = (gb.name && gb.name !== 'SLAB') ? gb.name + ' ' : '';
  RIDES.skateboard = { lift:10, name:`${who}skateboard` };
  if (!GEAR.ride.some(g => g.id === 'skateboard')) {
    const item = { id:'skateboard', name:`${who}skateboard`, xp:2000 };
    GEAR.ride.push(item);
    ALL_GEAR.push({ ...item, slot:'ride' }); ALL_GEAR.sort((a, b) => a.xp - b.xp);
    RARITY.skateboard = 4;
  }
  const basePaint = paintRide;
  paintRide = function(g, kind, ox, oy, frame){
    if (kind !== 'skateboard') return basePaint(g, kind, ox, oy, frame);
    frame = frame || 0;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(ox + x, oy + y, w, h); };
    const wheel = (cx) => {
      R(cx - 1, -5, 2, 1, '#8f8b80'); R(cx - 2, -4, 4, 3, '#f3efe4'); R(cx - 1, -1, 2, 1, '#8f8b80');
      R(cx - 2, -4, 1, 3, '#d9d4c6'); R(cx + 1, -4, 1, 3, '#d9d4c6');
      const k = Math.floor(frame) & 3;                                   // a mark on the wheel turns as it rolls
      R(cx - 1 + (k === 1 || k === 2 ? 1 : 0), -4 + (k >= 2 ? 1 : 0), 1, 1, '#a9a597');
    };
    // trucks: baseplate under the deck, hanger and axle down to the wheels
    [-9, 9].forEach(cx => { R(cx - 1, -7, 3, 1, '#5d636c'); R(cx - 2, -6, 5, 1, '#b9bec6'); R(cx, -6, 1, 1, '#8b919a'); });
    wheel(-9); wheel(9);
    // deck: grip tape on top, the dark ply, an accent stripe along the edge, kicked up at both ends
    R(-13, -10, 27, 1, GRIP); R(-13, -9, 27, 1, DECK); R(-13, -8, 27, 1, STRIPE);
    R(-15, -11, 2, 1, GRIP); R(-15, -10, 2, 1, DECK); R(-14, -9, 1, 1, STRIPE);
    R(-16, -12, 1, 1, GRIP); R(-16, -11, 1, 1, DECK);
    R(14, -11, 2, 1, GRIP); R(14, -10, 2, 1, DECK); R(14, -9, 1, 1, STRIPE);
    R(16, -12, 1, 1, GRIP); R(16, -11, 1, 1, DECK);
    R(-11, -10, 3, 1, '#2a2e35'); R(7, -10, 3, 1, '#2a2e35');           // bolts showing through the grip
  };
  // the board on its own: framed tighter than the bigger rides so it doesn't look tiny on the tiles
  const baseIcon = drawRideIcon;
  drawRideIcon = function(canvas, kind){
    if (kind !== 'skateboard') return baseIcon(canvas, kind);
    const g = canvas.getContext('2d'); g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
    const TW = 36, TH = 16, t = document.createElement('canvas'); t.width = TW; t.height = TH;
    paintRide(t.getContext('2d'), 'skateboard', 18, 15, 1);
    const s = Math.min(canvas.width / TW, canvas.height / TH);
    g.drawImage(t, Math.round((canvas.width - TW * s) / 2), Math.round((canvas.height - TH * s) / 2), TW * s, TH * s);
  };
});

// ============ FINISHED LESSONS STAND OUT (light street) ============
// A finished lesson's bubble goes solid ink with white text, and the house gets a pixel SOLD sign in the
// yard beside its front walk. Locked bubbles fade a little, so done / up next / locked read at a glance.
if (APP && APP.brand && APP.brand.light) appSafe('sold signs', () => {
  const ink = /^#?[0-9a-f]{6}$/i.test(String(APP.brand.ink || '').trim()) ? APP.brand.ink.trim() : '#14161b';
  const acc = /^#?[0-9a-f]{6}$/i.test(String(APP.brand.accent || '').trim()) ? APP.brand.accent.trim() : '#cb272d';
  document.head.insertAdjacentHTML('beforeend', `<style>
    html.light .st-label.done span{ background:${ink}; color:#fff; border:1px solid ${ink}; box-shadow:0 1px 0 rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.2); }
    html.light .st-label.done i{ color:#fff; }
    html.light .st-label.locked span{ opacity:.82; }
    .st-sold{ position:absolute; image-rendering:pixelated; pointer-events:none; }
  </style>`);
  // 21 x 25: a red board with white SOLD on a white post
  const SIGN_W = 21, SIGN_H = 25;
  const FONT = { S:['111','100','111','001','111'], O:['111','101','101','101','111'], L:['100','100','100','100','111'], D:['110','101','101','101','110'] };
  const paintSold = (cv) => {
    cv.width = SIGN_W; cv.height = SIGN_H;
    const g = cv.getContext('2d'), P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    P(9, 9, 3, 16, '#e8e6e0'); P(9, 9, 1, 16, '#ffffff'); P(11, 9, 1, 16, '#a9a69d');     // white post
    P(8, 23, 5, 2, 'rgba(0,0,0,.25)');                                                       // where it meets the grass
    P(0, 0, 21, 11, '#2a0a0c'); P(1, 1, 19, 9, acc); P(1, 1, 19, 1, 'rgba(255,255,255,.28)'); // board
    [...'SOLD'].forEach((ch, i) => FONT[ch].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') P(3 + i * 4 + rx, 3 + ry, 1, 1, '#fff'); })));
  };
  const plant = () => {
    const wrap = $('path-wrap'); if (!wrap || !street || !street.stops) return;
    wrap.querySelectorAll('.st-sold').forEach(e => e.remove());
    const S = parseFloat(wrap.style.getPropertyValue('--S')) || 1, px = (v) => Math.round(v * S) + 'px';
    street.stops.forEach(s => {
      if (s.kind === 'boss' || !s.ref || s.ref.status !== 'done' || !s.doorUV || !s.walkUV) return;
      // out in the front yard by the sidewalk, on the other side of the front walk from the mailbox
      const even = s.i % 2 === 0, w = s.walkUV;
      const q = even ? { u:w.u - 6, v:w.v + 10 } : { u:w.u + 10, v:w.v - 6 };
      const p = isoPt(q.u, q.v);
      const c = document.createElement('canvas'); c.className = 'st-sold'; c.setAttribute('aria-hidden', 'true');
      paintSold(c);
      c.style.left = px(p.x - SIGN_W / 2); c.style.top = px(p.y - SIGN_H + 1);
      c.style.width = px(SIGN_W); c.style.height = px(SIGN_H);
      c.style.zIndex = objZ(q.u, q.v);
      wrap.appendChild(c);
    });
  };
  const baseRender = renderStreet;
  renderStreet = function(){ baseRender.apply(this, arguments); try { plant(); } catch (e) {} };
});

// ============ SKATEBOARD: PUSHING AND KICKFLIPS ============
// On the skateboard the rep rides like a skater: a couple of pushes off the ground, then a glide, over and
// over, and one kickflip halfway along each stretch between houses (the rep pops up, the board spins a full
// flip under their feet, they land it). Everything else on the street draws as before.
if (typeof RIDES !== 'undefined' && RIDES.skateboard) appSafe('skate tricks', () => {
  const SK = { odo:0, lx:null, ly:null, trick:null, done:new Set() };
  const PUSH_EVERY = 96, TRICK_LEN = 52, JUMP = 15;
  const board = document.createElement('canvas'); board.width = 48; board.height = 16;
  const bg = board.getContext('2d');
  const legLen = () => Math.hypot(street.L, street.L / 2);
  // the sprite's lowest drawn row (the soles), cached per sprite canvas
  const feetCache = new WeakMap();
  const feetRow = (c) => {
    if (feetCache.has(c)) return feetCache.get(c);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let y = c.height - 1;
    for (; y > 0; y--) { let any = false; for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { any = true; break; } if (any) break; }
    feetCache.set(c, y); return y;
  };
  // the stretch you're on: the two bends you're between, and how far you are from the nearer one
  const where = (x, y) => {
    let a = -1, b = -1, da = Infinity, db = Infinity;
    street.verts.forEach((q, i) => {
      const p = isoPt(q.u, q.v), d = Math.hypot(p.x - x, p.y - y);
      if (d < da) { b = a; db = da; a = i; da = d; } else if (d < db) { b = i; db = d; }
    });
    return { leg:Math.min(a, b), near:da };
  };
  const baseDrawMe = drawMe;
  drawMe = function(bob){
    const m = street.me, el = street.el;
    if (!(m && m.mounted && ME.look && ME.look.ride === 'skateboard') || !el) {
      SK.lx = null; SK.trick = null; SK.done.clear();
      if (el) el.style.transform = el.style.transform.replace(/ translateY\([^)]*\)$/, '');
      return baseDrawMe(bob);
    }
    // how far the board has rolled
    if (SK.lx != null) SK.odo += Math.hypot(m.x - SK.lx, m.y - SK.ly);
    SK.lx = m.x; SK.ly = m.y;

    // kickflip once per stretch, as you pass its middle
    if (!SK.trick && !reduceMotion && street.verts.length > 1) {
      const w = where(m.x, m.y);
      if (w.leg >= 0 && w.near > legLen() * 0.4 && !SK.done.has(w.leg)) { SK.done.add(w.leg); SK.trick = { start:SK.odo }; haptic('tap'); }
    }
    let p = -1;
    if (SK.trick) { p = (SK.odo - SK.trick.start) / TRICK_LEN; if (p >= 1) { SK.trick = null; p = -1; haptic('tap'); } }

    // pose: in the air they stand tall over the board; on the ground two pushes (one leg back), then a glide
    let jump = 0, flipY = 1, boardLag = 0, push = 0;
    if (p >= 0) {
      jump = Math.round(Math.sin(Math.PI * p) * JUMP);
      const spin = Math.min(1, p / 0.8);                         // the board finishes its flip just before landing
      flipY = Math.cos(2 * Math.PI * spin);
      boardLag = Math.round(Math.sin(Math.PI * p) * 3);          // the board hangs a little below their feet
    } else {
      // two pushes (the back foot reaches down to the street and sweeps back), then a glide
      const c = SK.odo % PUSH_EVERY;
      if (c < 22) push = Math.sin(Math.PI * c / 22); else if (c < 44) push = Math.sin(Math.PI * (c - 22) / 22);
    }

    const g = street.meCanvas.getContext('2d');
    g.clearRect(0, 0, RIDER_W, RIDER_H); g.imageSmoothingEnabled = false;
    g.save(); if (m.flip) { g.translate(RIDER_W, 0); g.scale(-1, 1); }
    const lift = RIDES.skateboard.lift;
    // the board, flipping end over end around its length
    bg.clearRect(0, 0, 48, 16); paintRide(bg, 'skateboard', 24, 15, m.frame || 0);
    g.save();
    g.translate(RIDER_OX, RIDER_OY - 9 + boardLag);
    g.scale(1, Math.abs(flipY) < 0.18 ? (flipY < 0 ? -0.18 : 0.18) : flipY);
    g.drawImage(board, -24, -6);
    g.restore();
    // the rep on top; while pushing, a copy of their legs slants back and down to the street (the pushing leg)
    const spr = spriteCanvas(ME.look, 'side-0', 'happy'), sy = RIDER_OY - 49 - lift + (bob || 0);
    if (push > 0.05) {
      // the legs from the hip down, stretched to reach the street and slanted back from the hip
      const feet = feetRow(spr), top = feet - 11, h = feet - top + 1, H = h + Math.round((lift + 1) * push);
      g.save();
      g.translate(24, sy + top);
      g.transform(1, 0, -(9 * push) / H, 1, 0, 0);
      g.drawImage(spr, 0, top, SPR_W, h, 0, 0, SPR_W, H);
      g.restore();
    }
    g.drawImage(spr, 24, sy);
    g.restore();

    // the whole rider (rep and board) rises off the ground for the trick
    const base = el.style.transform.replace(/ translateY\([^)]*\)$/, '');
    el.style.transform = jump ? `${base} translateY(${-Math.round(jump * street.S)}px)` : base;
    $('st-bubble').style.bottom = Math.round((RIDER_H - (RIDER_OY - 49 - lift)) * street.S) + 'px';
    el.classList.add('riding');
    if (street.rideEl) street.rideEl.classList.remove('on');
  };
});

// ============ SKATEBOARD TRICKS ON THE PODIUM ============
// A podium rep on the skateboard stands on it side-on, facing the middle, and every 5 seconds throws a trick:
// ollie, kickflip, heelflip, 360 or tre flip. Big on purpose (Ronin was a sponsored skater): a deep crouch
// to load up, high air, the board flipping and spinning, a squash and a dust puff on landing, and the
// trick's name popping above. The canvas gets extra headroom above the podium for the air.
if (typeof RIDES !== 'undefined' && RIDES.skateboard) appSafe('podium tricks', () => {
  const W = 72, H = 102, GROUND = 100, LIFT = RIDES.skateboard.lift;   // 34px of headroom over the usual 68 for big air and the trick name
  const CYCLE = 5000, TRICK_MS = 1500;
  const TRICKS = [
    { name:'OLLIE',    jump:22, board:(q) => ({ rot:-0.55 * Math.max(0, 1 - q / 0.35) + 0.1 * Math.max(0, (q - 0.75) / 0.25), sx:1, sy:1 }) },
    { name:'KICKFLIP', jump:23, board:(q) => ({ rot:-0.18 * Math.sin(Math.PI * q), sx:1, sy:Math.cos(2 * Math.PI * Math.min(1, q / 0.78)) }) },
    { name:'HEELFLIP', jump:23, board:(q) => ({ rot:0.18 * Math.sin(Math.PI * q), sx:1, sy:Math.cos(2 * Math.PI * Math.min(1, q / 0.78)), dx:3 * Math.sin(Math.PI * q) }) },
    { name:'360',      jump:25, spin:true, board:(q) => ({ rot:0, sx:Math.cos(2 * Math.PI * Math.min(1, q / 0.85)), sy:1 }) },
    { name:'TRE FLIP', jump:26, board:(q) => { const s = Math.min(1, q / 0.8); return { rot:-0.1 * Math.sin(Math.PI * q), sx:Math.cos(2 * Math.PI * s), sy:Math.cos(2 * Math.PI * s) }; } },
  ];
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const og = off.getContext('2d'); og.imageSmoothingEnabled = false;
  const brd = document.createElement('canvas'); brd.width = 48; brd.height = 16;
  const bgc = brd.getContext('2d');
  const accent = (APP && APP.brand && APP.brand.accent) || '#cb272d';
  const clampS = (v) => Math.abs(v) < 0.14 ? (v < 0 ? -0.14 : 0.14) : v;

  const isSkater = (canvas, look) => canvas && canvas.classList && canvas.classList.contains('pd-rep') && look && look.ride === 'skateboard';

  function mountSkate(canvas, lookFn){
    if (canvas.dataset.skate) return;
    canvas.dataset.skate = '1';
    // headroom for the air: taller canvas, pulled up by the same amount so the podium below doesn't move
    canvas.width = W * 2; canvas.height = H * 2;
    canvas.style.aspectRatio = `${W * 2}/${H * 2}`;
    canvas.style.marginTop = `-${((H - 68) * 2 / (W * 2) * 100).toFixed(2)}%`;
    const rank = +canvas.dataset.rank || 1;
    const faceLeft = rank === 3;                     // second place stands on the left and faces in, third on the right
    const t0 = performance.now() - (rank === 1 ? 900 : rank === 2 ? 2600 : 4200);   // podium reps don't all go at once
    let cycleNo = -1, trick = TRICKS[0], lastPick = -1;
    const g = canvas.getContext('2d');

    // at: a moment in the cycle to draw (for checking a trick frame by frame); the live loop passes nothing
    const frame = (at, pick) => {
      if (!document.contains(canvas)) { clearInterval(id); return; }
      const look = lookFn();
      if (!look || look.ride !== 'skateboard') { clearInterval(id); delete canvas.dataset.skate; return; }
      const el = at != null ? at : performance.now() - t0, n = Math.floor(el / CYCLE), ph = el % CYCLE;
      if (pick != null) trick = TRICKS[pick];
      else if (n !== cycleNo) {
        cycleNo = n;
        let k = Math.floor(Math.random() * TRICKS.length); if (k === lastPick) k = (k + 1) % TRICKS.length;
        lastPick = k; trick = TRICKS[k];
      }
      const start = CYCLE - TRICK_MS, p = (!reduceMotion && ph >= start) ? (ph - start) / TRICK_MS : -1;

      // timing: load up (crouch), air, land (squash)
      let crouch = 0, jump = 0, boardUp = 0, land = 0, q = -1;
      if (p >= 0) {
        if (p < 0.16) crouch = Math.sin((p / 0.16) * Math.PI / 2) * 4;
        else if (p < 0.84) { q = (p - 0.16) / 0.68; jump = Math.sin(Math.PI * q) * trick.jump; boardUp = jump - Math.sin(Math.PI * q) * 3; }
        else land = Math.sin(((p - 0.84) / 0.16) * Math.PI) * 4;
      } else {
        crouch = Math.floor(ph / 600) % 2 ? 1 : 0;   // a little bounce while they wait
      }

      og.clearRect(0, 0, W, H);
      og.save();
      if (faceLeft) { og.translate(W, 0); og.scale(-1, 1); }
      // shadow on the ground, shrinking as they go up
      const sh = Math.max(4, 14 - jump * 0.35);
      og.fillStyle = 'rgba(0,0,0,0.18)'; og.fillRect(Math.round(W / 2 - sh), GROUND - 1, Math.round(sh * 2), 2);
      // board
      const b = q >= 0 ? trick.board(q) : (p >= 0 && p < 0.16 ? { rot:0, sx:1, sy:1 } : { rot:0, sx:1, sy:1 });
      bgc.clearRect(0, 0, 48, 16); paintRide(bgc, 'skateboard', 24, 15, Math.floor(ph / 120));
      og.save();
      og.translate(W / 2 + (b.dx || 0), GROUND - 6 - Math.round(boardUp));
      og.rotate(b.rot || 0); og.scale(clampS(b.sx), clampS(b.sy));
      og.drawImage(brd, -24, -9);
      og.restore();
      // rider: in a 360 they spin all the way round (side, front, side the other way, back, side)
      let pose = 'side-0', mirror = false;
      if (trick.spin && q >= 0) {
        const k = Math.floor(Math.min(0.999, q) * 5);
        pose = ['side-0', 'down-0', 'side-0', 'up-0', 'side-0'][k]; mirror = k === 2;
      } else if (q >= 0) pose = 'side-1';                 // legs tucked apart in the air
      const spr = spriteCanvas(look, pose, 'happy');
      const ry = GROUND - 49 - LIFT + Math.round(crouch + land - jump);
      og.save();
      if (mirror) { og.translate(W, 0); og.scale(-1, 1); }
      og.drawImage(spr, W / 2 - 18, ry);
      og.restore();
      // dust kicked up on landing
      if (p >= 0.84) {
        const s = (p - 0.84) / 0.16, spread = 6 + s * 12;
        og.fillStyle = `rgba(200,196,186,${(1 - s).toFixed(2)})`;
        [[-1, 0], [-0.7, -2], [-0.4, -1], [0.4, -1], [0.7, -2], [1, 0]].forEach(([dx, dy]) => og.fillRect(Math.round(W / 2 + dx * spread), GROUND - 3 + Math.round(dy * (1 + s * 2)), 2, 2));
      }
      og.restore();

      g.clearRect(0, 0, canvas.width, canvas.height); g.imageSmoothingEnabled = false;
      g.drawImage(off, 0, 0, canvas.width, canvas.height);
      // the trick's name pops above them
      if (p >= 0.16) {
        const s = Math.min(1, (p - 0.16) / 0.12), a = p > 0.88 ? Math.max(0, 1 - (p - 0.88) / 0.12) : 1;
        g.save();
        g.globalAlpha = a;
        g.font = `${Math.round(11 + 3 * s)}px 'Press Start 2P', monospace`;
        g.textAlign = 'center'; g.textBaseline = 'top';
        const ty = 4 + Math.round((1 - s) * 6);
        g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.strokeText(trick.name + '!', canvas.width / 2, ty);
        g.fillStyle = accent; g.fillText(trick.name + '!', canvas.width / 2, ty);
        g.restore();
      }
    };
    frame();
    const id = setInterval(() => frame(), 40);
    canvas.skateFrame = frame;
  }

  const baseLive = liveSprite;
  liveSprite = function(canvas, lookFn, opts){
    if (isSkater(canvas, lookFn())) { mountSkate(canvas, lookFn); return { canvas, look:lookFn, opts:opts || {} }; }
    return baseLive(canvas, lookFn, opts);
  };
  const baseLeader = mountLeaderPrize;
  mountLeaderPrize = function(canvas, look){
    if (isSkater(canvas, look)) { mountSkate(canvas, () => look); return; }
    return baseLeader(canvas, look);
  };
});
