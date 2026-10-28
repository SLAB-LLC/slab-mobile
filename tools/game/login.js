// The app's sign-in page: the demo's opening (SLAB intro flicker, then the 4E CRT login), signing in
// through the native app. build.py puts the demo's own beaker and SLAB letters (BT_DEMO) above this.
const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const btSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- talking to the app ----
let appSeq = 0;
const appWaits = {};
function appSend(type, payload, id) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, payload }));
}
function appCall(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++appSeq;
    appWaits[id] = { resolve, reject };
    appSend(type, payload, id);
  });
}
window.__appReply = (id, ok, result) => {
  const w = appWaits[id];
  if (!w) return;
  delete appWaits[id];
  ok ? w.resolve(result) : w.reject(new Error(String(result || 'Something went wrong')));
};
const haptic = (kind) => appSend('haptic', kind);

/*BT_DEMO*/

const LOGIN = window.SLAB_LOGIN || {};
if (LOGIN.build) document.querySelector('.bt-foot span').textContent = 'BUILD ' + LOGIN.build;

async function btFlicker(el) {
  if (reduceMotion) { el.style.opacity = 1; return; }
  for (let i = 0; i < 6; i++) { el.style.opacity = i % 2 ? 0 : 1; await btSleep(60); }
  el.style.opacity = 1;
}
async function btWipe(layer) {
  layer.classList.add('bt-wipe');
  layer.classList.remove('bt-on');
  await btSleep(reduceMotion ? 0 : 600);
  layer.classList.remove('bt-wipe');
}

(async function intro() {
  const intro = $('bt-intro'), img = intro.querySelector('img'), tag = intro.querySelector('.bt-tag');
  img.style.opacity = 0; tag.style.opacity = 0;
  intro.classList.add('bt-on');
  $('bt-login').hidden = false;
  await btSleep(250);
  await btFlicker(img);
  await btSleep(350); tag.style.opacity = 1;
  await btSleep(550);
  await btWipe(intro);
})();

function friendly(msg) {
  if (/invalid login|invalid credentials/i.test(msg)) return 'ERR: user id or passcode not recognized.';
  if (/not confirmed/i.test(msg)) return 'ERR: confirm your email first, then log on.';
  if (/network|fetch/i.test(msg)) return 'ERR: no signal. Check your connection.';
  return 'ERR: ' + msg;
}

let busy = false;
$('bt-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  const email = $('bt-email').value.trim(), pw = $('bt-pw').value;
  const bad = !/^\S+@\S+\.\S+$/.test(email) ? 'ERR: email not recognized. Use your work email.' : pw.length < 6 ? 'ERR: passcode too short (min 6).' : '';
  $('bt-err').textContent = bad;
  if (bad) { (bad.includes('email') ? $('bt-email') : $('bt-pw')).focus(); haptic('wrong'); return; }

  busy = true;
  document.activeElement && document.activeElement.blur();
  const msg = $('bt-msg');
  msg.innerHTML = '&gt; <span>CHECKING</span><i class="cur"></i><small></small>';
  msg.classList.add('on');
  let who;
  try {
    who = await appCall('signIn', { email, password: pw });
  } catch (err) {
    msg.classList.remove('on');
    $('bt-err').textContent = friendly(err.message);
    haptic('wrong');
    busy = false;
    return;
  }
  haptic('success');
  const line = msg.querySelector('span'), sm = msg.querySelector('small'), t = 'ACCESS GRANTED';
  for (let i = 1; i <= t.length; i++) { line.textContent = t.slice(0, i); await btSleep(reduceMotion ? 0 : 38); }
  if (who && who.company) sm.textContent = 'company: ' + String(who.company).toUpperCase();
  await btSleep(800);
  appSend('enter');
});

$('bt-forgot').addEventListener('click', async () => {
  const email = $('bt-email').value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { $('bt-err').textContent = 'ERR: type your user id (work email) first.'; $('bt-email').focus(); return; }
  $('bt-err').textContent = '> sending...';
  try {
    await appCall('reset', { email });
    $('bt-err').textContent = '> reset link sent to your work email';
  } catch (err) {
    $('bt-err').textContent = friendly(err.message);
  }
});
