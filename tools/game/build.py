"""Build the in-app game page from the Ace x SLAB demo.

The demo (the "Ace x SLAB Training Demo" artifact) stays the design source. This script takes the
published demo HTML, wires it to the native app through tools/game/bridge.js, and writes
assets/game/game.html, which src/game/GameScreen.tsx loads in a WebView.

    python3 tools/game/build.py path/to/demo.html

Every patch asserts its anchor appears exactly once, so a demo change that moves code fails loudly here
instead of shipping a half-wired page. Fix the anchor and run it again.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'game', 'game.html')


def rep(html, old, new, count=1):
    n = html.count(old)
    assert n == count, f'expected {count} of {old[:90]!r}, found {n}'
    return html.replace(old, new)


def main(src):
    html = open(src, encoding='utf-8').read()

    # The artifact read wraps the page in a skeleton; keep only the demo's own document
    start = html.find('<!DOCTYPE html>')
    if start > 0:
        html = html[start:]
        end = html.find('</html>', html.rfind('</script>'))
        html = html[: end + len('</html>')] + '\n'

    bridge = open(os.path.join(HERE, 'bridge.js'), encoding='utf-8').read()

    # ---- state from the app ----
    html = rep(html, 'let currentXP = 340;',
               'const APP = window.SLAB_APP || null;\nlet currentXP = APP ? APP.me.xp : 340;')
    html = rep(html, 'let chatUnlockXP = 200;', 'let chatUnlockXP = APP ? APP.features.chatUnlockXp : 200;')
    html = rep(html, 'let audioUnlockXP = 500;', 'let audioUnlockXP = APP ? APP.features.vaultUnlockXp : 500;')
    html = rep(html, 'const streakDays = 5;', 'const streakDays = APP ? APP.me.streakDays : 5;')
    html = rep(html, '];\n\nconst repsData = {',
               '];\nif (APP && APP.lessons && APP.lessons.length) categories.splice(0, categories.length, ...APP.lessons);\n\nconst repsData = {')

    # ---- lessons: real videos and quizzes ----
    html = rep(html, 'function showWatch(){\n', 'function showWatch(){\n  if (appLessonWatchable()) return appShowWatch();\n')
    html = rep(html, "  const set = quizzes[lesson.ref.title] || quizzes[\"Framing the service, not the price\"];\n",
               '  const set = quizSet();\n')
    html = rep(html, "<span class=\"q-key\">${'ABC'[i]}</span>", "<span class=\"q-key\">${'ABCD'[i]}</span>", 2)
    html = rep(html, '  const passed = lesson.score >= PASS_MARK;\n', '  const passed = lessonPassed();\n')
    html = rep(html, '<h3>Nice review</h3><p>You got ${lesson.score} of 3.',
               '<h3>Nice review</h3><p>You got ${lesson.score} of ${quizSet().length}.')
    html = rep(html, '<h3>Lesson passed</h3><p>You got ${lesson.score} of 3 right. +15 XP',
               '<h3>Lesson passed</h3><p>${appLessonWatchable() && !(lesson.ref.quiz || []).length ? \'\' : `You got ${lesson.score} of ${quizSet().length} right. `}+15 XP')
    html = rep(html, '<h3>Almost there</h3><p>You got ${lesson.score} of 3. You need ${PASS_MARK} to pass',
               '<h3>Almost there</h3><p>You got ${lesson.score} of ${quizSet().length}. You need ${passMark()} to pass')
    html = rep(html, "function closeLesson(){\n  if (!$('phone').classList.contains('lesson-open')) return;\n",
               "function closeLesson(){\n  if (!$('phone').classList.contains('lesson-open')) return;\n"
               "  clearTimeout(lesson.ytTimer);\n"
               "  const rv = document.querySelector('#lv-real video'); if (rv) rv.pause();\n"
               "  const rf = document.querySelector('#lv-real iframe'); if (rf) rf.remove();\n")

    # ---- XP goes through the server ----
    html = rep(html, "  awardXP(15, 'lesson complete');",
               "  xpEvent('lesson_complete', subRef.id || subRef.title, 15, 'lesson complete');")
    html = rep(html, "awardXP(8, 'asked ' + rep.name.split(' ')[0]);",
               "if (!APP || replyConnected) xpEvent('coach_ask', null, 8, 'asked ' + rep.name.split(' ')[0]);")
    html = rep(html, "awardXP(BOOK_XP, 'book passed off');", "xpEvent('book_pass', b.id || b.i, BOOK_XP, 'book passed off');")
    html = rep(html, "awardXP(first ? BOSS_XP : BOSS_REMATCH_XP, first ? 'boss beaten' : 'boss rematch');",
               "xpEvent('boss_win', fight.unit, first ? BOSS_XP : BOSS_REMATCH_XP, first ? 'boss beaten' : 'boss rematch');")
    html = rep(html, "awardXP(5, it.k === 'audio' ? 'listened' : 'watched');",
               "xpEvent('library_open', it.i, 5, it.k === 'audio' ? 'listened' : 'watched');")
    html = rep(html, '      currentXP += VX_PER_MIN; updateXPBadge();', '      vaultMinuteXP();')

    # ---- Ask Marshall: real coach replies ----
    html = rep(html, "  const reply = rep.replies[Math.floor(Math.random() * rep.replies.length)];\n",
               "  let reply = rep.replies[Math.floor(Math.random() * rep.replies.length)], replyConnected = false;\n"
               "  const replyReady = APP ? appCoachReply(text).then(r => { reply = r.reply; replyConnected = r.connected; }) : Promise.resolve();\n")
    html = rep(html, "  setTimeout(() => {\n    if (token !== replyToken) return;\n    avatar.set('talking');",
               "  replyReady.then(() => setTimeout(() => {\n    if (token !== replyToken) return;\n    avatar.set('talking');")
    html = rep(html, "      container.insertAdjacentHTML('beforeend', exampleChipHtml(rep, exampleTrack));\n",
               "      if (!APP) container.insertAdjacentHTML('beforeend', exampleChipHtml(rep, exampleTrack));\n")
    html = rep(html, "    type();\n  }, 1500);\n}", "    type();\n  }, APP ? 300 : 1500));\n}")

    # ---- the rep: name and look live in the database ----
    html = rep(html, "function saveMe(){ try { localStorage.setItem('slabAce.rep', JSON.stringify(ME)); } catch (e) {} }",
               "function saveMe(){ try { localStorage.setItem('slabAce.rep', JSON.stringify(ME)); } catch (e) {} appSaveMe(); }\n"
               "if (APP) { ME.name = APP.me.name || ME.name; ME.email = APP.me.email; if (APP.me.look) { ME.look = Object.assign({ ...DEFAULT_LOOK }, APP.me.look); ME.onboarded = true; } else ME.onboarded = false; }")
    html = rep(html, "function demoRole(){ try {", "function demoRole(){ if (APP) return 'rep'; try {")

    # ---- leaderboard: the company's real reps ----
    # (the swap itself happens in bridge.js, once DEFAULT_LOOK exists)

    # ---- boot: the app already signed them in ----
    html = rep(html, "  if (bootAuth.get()) { await btCompany(); return; }",
               "  if (APP) { if (APP.brand && APP.brand.isAce) await btCompany(); else { boot.classList.remove('live'); if (bootDone) { const f = bootDone; bootDone = null; f(); } } return; }\n"
               "  if (bootAuth.get()) { await btCompany(); return; }")

    # ---- settings: account facts and actions go native ----
    html = rep(html, '<div><span>Role</span><b>Sales rep</b></div>',
               "<div><span>Role</span><b>${APP ? esc(APP.me.roleLabel) : 'Sales rep'}</b></div>")
    html = rep(html, '<div><span>Company</span><b>Ace Cooperatives</b></div>',
               "<div><span>Company</span><b>${APP ? esc(APP.me.companyName || '') : 'Ace Cooperatives'}</b></div>")
    html = rep(html, "    if (id === 'push' && !on) showToast('Push notifications are off on this phone', 'ph-bell-slash');\n",
               "    if (APP) appSend('notif', { id, on });\n"
               "    if (id === 'push' && !on) showToast('Push notifications are off on this phone', 'ph-bell-slash');\n")
    html = rep(html, "    $('pw-1').value = $('pw-2').value = ''; showToast('Password updated', 'ph-check-circle'); haptic('success');",
               "    if (APP) { appCall('password', { password:a }).then(() => { $('pw-1').value = $('pw-2').value = ''; showToast('Password updated', 'ph-check-circle'); haptic('success'); })"
               ".catch(err => showToast(err.message || 'Could not update password', 'ph-lock-simple')); return; }\n"
               "    $('pw-1').value = $('pw-2').value = ''; showToast('Password updated', 'ph-check-circle'); haptic('success');")
    html = rep(html, "  $('me-terms').addEventListener('click', () => {\n",
               "  $('me-terms').addEventListener('click', () => {\n    if (APP) { appSend('navigate', 'TermsOfService'); return; }\n")
    html = rep(html, '    bootAuth.set(null); closeProfile(); runBoot();',
               "    if (APP) { appSend('signOut'); return; }\n    bootAuth.set(null); closeProfile(); runBoot();")

    # ---- haptics: iPhones only buzz through the native app ----
    html = rep(html, "function haptic(kind){\n  if (!ME.haptics || !navigator.vibrate) return;",
               "function haptic(kind){\n  if (APP && ME.haptics) { appSend('haptic', kind); return; }\n  if (!ME.haptics || !navigator.vibrate) return;")

    # ---- Vault audio: served from the app's media host ----
    html = rep(html, "  if (vxAu.src !== abs) { vxAu.src = src;",
               "  if (APP && APP.media && !/^(https?|data|blob):/.test(src)) { src = APP.media + src.replace(/^audio\\//, ''); abs = src; }\n"
               "  if (vxAu.src !== abs) { vxAu.src = src;")

    # ---- company gear: colors and the letters on the back come from the tenant ----
    glyphs = open(os.path.join(ROOT, 'src', 'avatar', 'glyphs.ts'), encoding='utf-8').read()
    font = glyphs[glyphs.index('{', glyphs.index('GLYPHS_3X5')): glyphs.rindex('}') + 1]
    html = rep(html, "const ACE_GOLD = '#daae5d', ACE_BLACK = '#1b1b20';",
               "const APP_GEAR = (APP && APP.brand && APP.brand.gear) || null;\n"
               "const ACE_GOLD = (APP_GEAR && APP_GEAR.primary) || '#daae5d', ACE_BLACK = (APP_GEAR && APP_GEAR.dark) || '#1b1b20';\n"
               "const GEAR_LETTERS = ((APP_GEAR && APP_GEAR.letters) || 'ACE').split('');\n"
               "const GEAR_X0 = Math.round(17.5 - (GEAR_LETTERS.length * 4 - 1) / 2);")
    html = rep(html, "const GLYPH = { A:['010','101','111','101','101'], C:['011','100','100','100','011'], E:['111','100','110','100','111'] };",
               'const GLYPH = ' + font + ';')
    html = rep(html, "['A', 'C', 'E'].forEach((ch, i) => GLYPH[ch].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(12 + i * 4 + rx, t + 3 + ry, c); })));",
               "GEAR_LETTERS.forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(GEAR_X0 + i * 4 + rx, t + 3 + ry, c); })));")

    html = rep(html, 'More Ace gear unlocks as you earn XP.', "More ${APP_GEAR ? esc(APP_GEAR.name) : 'Ace'} gear unlocks as you earn XP.")
    html = rep(html, "and more XP unlocks more Ace gear.' }", "and more XP unlocks more ' + (APP_GEAR ? APP_GEAR.name : 'Ace') + ' gear.' }")

    # ---- unlocks: the company's thresholds, not the demo's rookie/vet shortcut ----
    html = rep(html, '  audioUnlockXP = isVet() ? 0 : 500;\n  chatUnlockXP = isVet() ? 0 : 200;',
               '  audioUnlockXP = APP ? APP.features.vaultUnlockXp : isVet() ? 0 : 500;\n'
               '  chatUnlockXP = APP ? APP.features.chatUnlockXp : isVet() ? 0 : 200;')

    # ---- the book library carries the company's name ----
    html = rep(html, "'Ace Library, ' + n", "libName() + ', ' + n")
    html = rep(html, "'<span class=\"bv-crumb\">Ace Library</span>'", "'<span class=\"bv-crumb\">' + libName() + '</span>'")
    html = rep(html, '<h2 class="lv-title">Ace Library</h2>', '<h2 class="lv-title">${libName()}</h2>')

    # ---- the bridge itself, just before start-up runs ----
    html = rep(html, '// ============ INIT ============', bridge + '\n\n// ============ INIT ============')

    # ---- styles for the real lesson player ----
    css = """
  .lv-real{ position:relative; aspect-ratio:16/9; border-radius:14px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,.08); }
  .lv-real iframe, .lv-real video{ position:absolute; inset:0; width:100%; height:100%; border:0; background:#000; }
  .not-ace .ace-search, .not-ace .ace-shelf, .not-ace .ace-group{ display:none !important; }
  .lv-real-wait{ position:absolute; inset:0; display:grid; place-items:center; color:#a39d90; font-size:14px; }
"""
    i = html.index('</style>', html.index('<!DOCTYPE html>') if '<!DOCTYPE html>' in html else 0)
    html = html[:i] + css + html[i:]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(html)
    print('wrote', OUT, len(html))


if __name__ == '__main__':
    main(sys.argv[1])
