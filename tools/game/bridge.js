// ============ APP BRIDGE ============
// Present only in the native app build (tools/game/build.py inserts it). The native shell injects
// window.SLAB_APP before the page loads (see src/game/boot.ts); everything here is skipped in the
// browser demo, where APP is null.
//
// Page -> native: appSend(type, payload) and appCall(type, payload) -> Promise.
// Native -> page: window.__appReply(id, ok, result) and window.__appEvent(type, data).
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

if (APP) {
  // The company's real reps, ranked by total XP; reps without a saved look show the default rep
  if (APP.leaders && APP.leaders.length) leaders.splice(0, leaders.length, ...APP.leaders.map(l => ({ props:0, lessons:0, bosses:0, books:0, badges:[], ...l, look: Object.assign({ ...DEFAULT_LOOK }, l.look || {}) })));

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
  // Monthly prize only for companies running one
  if (!APP.features.monthlyPrize) { const pz = document.querySelector('#page-leaderboard .prize'); if (pz) pz.style.display = 'none'; }
}
