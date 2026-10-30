"""Build the in-app game page from the Ace x SLAB demo.

The demo (the "Ace x SLAB Training Demo" artifact) stays the design source. This script takes the
published demo HTML, wires it to the native app through tools/game/bridge.js, and writes
assets/game/game.html, which src/game/GameScreen.tsx loads in a WebView. It also writes
assets/game/login.html (the demo's opening and CRT login), the sign-in page src/game/LoginGameScreen.tsx loads.

    python3 tools/game/build.py path/to/demo.html

Every patch asserts its anchor appears exactly once, so a demo change that moves code fails loudly here
instead of shipping a half-wired page. Fix the anchor and run it again.
"""
import base64
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'assets', 'game', 'game.html')
LOGIN_OUT = os.path.join(ROOT, 'assets', 'game', 'login.html')


def rep(html, old, new, count=1):
    n = html.count(old)
    assert n == count, f'expected {count} of {old[:90]!r}, found {n}'
    return html.replace(old, new)


def cut(html, start, end):
    """The text from start through end, each found exactly once"""
    assert html.count(start) == 1, f'expected 1 of {start[:60]!r}'
    i = html.index(start)
    j = html.index(end, i)
    return html[i: j + len(end)]


def build_login(html):
    """assets/game/login.html: the demo's opening (SLAB intro, 4E CRT login) as the app's sign-in page"""
    css = cut(html, '  .bt{ position:absolute', '.bt-wipe{ transition:none; } }')
    intro = re.search(r'<div class="bt-layer bt-intro" id="bt-intro">.*?</div></div>', html, re.S).group(0)
    form = cut(html, '<form class="bt-layer bt-login"', '</form>')
    form = rep(form, 'placeholder="you@acecoop.com"', 'placeholder="you@company.com" autocapitalize="none" autocorrect="off"')
    demo_js = cut(html, 'const BT_BIG = ', "})($('bt-beaker'));")
    script = open(os.path.join(HERE, 'login.js'), encoding='utf-8').read().replace('/*BT_DEMO*/', demo_js)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{{ box-sizing:border-box; }}
  html,body{{ height:100%; margin:0; background:#000; overflow:hidden; -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent; }}
  body{{ position:relative; }}
  button{{ font:inherit; color:inherit; }}
{css}
  .bt-login{{ padding-top:calc(56px + env(safe-area-inset-top)); padding-bottom:calc(22px + env(safe-area-inset-bottom)); }}
</style>
</head>
<body>
<div class="bt live" id="boot">
{intro}
{form}
</div>
<script>
{script}
</script>
</body>
</html>
"""
    open(LOGIN_OUT, 'w', encoding='utf-8').write(page)
    print('wrote', LOGIN_OUT, len(page))


def vault_live(html):
    # ---- Vault: live days from the pipeline (src/game/vault.ts), several per rep ----
    # Each published day is its own entry in VX.reps (r.who is whose day it is); VX.people are the reps
    # the Vault groups them under. The pack in the app has one day per rep, so there who === id.
    html = rep(html, 'const VX = VX_DATA;',
               'const VX = APP && APP.vault ? APP.vault : VX_DATA;\n'
               'VX.reps.forEach(r => { r.who = r.who || r.id; });\n'
               'VX.people = VX.people || VX.reps;\n'
               'const vxDaysOf = (pid) => VX.reps.filter(r => r.who === pid);\n'
               "const vxStartHTML = () => { const r = vxRep(VX.start), d = r.days[0]; return `<b>Start with ${vxEsc(r.name.split(' ')[0])} · ${d.date}</b><small>${d.doors.length} doors, ${d.doors.filter(x => x.kind === 'sale').length} sales, ${vxFmt(d.mins * 60)}. Plug in and drive.</small>`; };")
    html = rep(html, "if (vxS.day.d !== vxToday()) vxS.day = { d:vxToday(), xp:0, sec:0 };\n// clips",
               "if (vxS.day.d !== vxToday()) vxS.day = { d:vxToday(), xp:0, sec:0 };\n"
               "if (vxS.prog && !vxRep(vxS.prog.rid)) vxS.prog = null;\n"
               "if (APP && APP.vault) vxS.tune.reps = VX.people.map(p => p.id);\n// clips")
    html = rep(html, '${VX.reps.map(r => { const ds = vxDoors(r.id); return',
               '${VX.people.map(r => { const ds = vxDaysOf(r.id).flatMap(x => x.days[0].doors); return')
    html = rep(html, '<b>Start with Marshall · May 11</b><small>17 doors, 4 sales, 1h 51m. Plug in and drive.</small>',
               "${VX.start ? vxStartHTML() : `<b>Start with Marshall · May 11</b><small>17 doors, 4 sales, 1h 51m. Plug in and drive.</small>`}")
    html = rep(html, "vxOpenDay('m', 1, 0)", "vxOpenDay(VX.start || 'm', 1, 0)")
    html = rep(html, '  const r = vxRep(rid), day = r.days[0], ds = day.doors;',
               '  const days = vxDaysOf(rid), r = VX.people.find(p => p.id === rid), ds = days.flatMap(x => x.days[0].doors);')
    html = rep(html, 'VX_TAG[rid]', "(VX_TAG[rid] || '')")
    html = rep(html, 'VX_TAG[r.id]', "(VX_TAG[r.id] || '')")
    html = rep(html, """<div class="vx-box"><div class="vx-day" id="vx-day"><b>${day.t}, ${day.date}</b><small>${day.area} · ${vxFmt(day.mins * 60)} · ${ds.length} doors · ${ds.filter(d => d.kind === 'sale').length} sales</small><div class="vx-chunks" id="vx-rch">${vxChunks(rid)}</div></div></div>""",
               """<div class="vx-box">${days.map(x => { const day = x.days[0], dd = day.doors; return `<div class="vx-day" data-day="${x.id}"><b>${day.t}, ${day.date}</b><small>${day.area ? day.area + ' · ' : ''}${vxFmt(day.mins * 60)} · ${dd.length} doors · ${dd.filter(d => d.kind === 'sale').length} sales</small><div class="vx-chunks">${vxChunks(x.id)}</div></div>`; }).join('')}</div>""")
    html = rep(html, """  $('vx-rch').onclick = (e) => { const c = e.target.closest('[data-i]'); vxOpenDay(rid, c ? +c.dataset.i + 1 : 1, 0); };
  $('vx-day').onclick = (e) => { if (!e.target.closest('[data-i]')) vxOpenDay(rid, vxS.prog && vxS.prog.rid === rid ? vxS.prog.n : 1, vxS.prog && vxS.prog.rid === rid ? vxS.prog.t : 0); };""",
               """  el.querySelectorAll('[data-day]').forEach(b => b.onclick = (e) => {
    const id = b.dataset.day, c = e.target.closest('[data-i]'), p = vxS.prog && vxS.prog.rid === id ? vxS.prog : null;
    if (c) vxOpenDay(id, +c.dataset.i + 1, 0); else vxOpenDay(id, p ? p.n : 1, p ? p.t : 0);
  });""")
    html = rep(html, '  if (!T.reps.includes(c.rep)) return false;', '  if (!T.reps.includes(vxRep(c.rep).who)) return false;')
    html = rep(html, '(T.reps.length < VX.reps.length ? 1 : 0)', '(T.reps.length < VX.people.length ? 1 : 0)')
    html = rep(html, '${VX.reps.map(r => `<button class="vx-chip', '${VX.people.map(r => `<button class="vx-chip')
    return html


def slab_pack(html):
    """SLAB's own merch for reps without a company; src/avatar/engine.ts carries the same edits"""
    L = 'GEAR_LETTERS'
    gear = (
        "// SLAB's own merch, for reps without a company: the SLAB S where Ace's A goes, orange for gold, and two lab pieces\n"
        f"const SLAB_PACK = {L}.join('') === 'SLAB';\n"
        "if (SLAB_PACK) {\n"
        "  const rn = (slot, id, name) => { const g = GEAR[slot].find(x => x.id === id); if (g) g.name = name; };\n"
        "  rn('top', 'blazer', 'Orange SLAB blazer'); rn('hat', 'snapback', 'Orange snapback'); rn('shoes', 'gold', 'Orange kicks');\n"
        "  GEAR.top.splice(GEAR.top.findIndex(x => x.id === 'varsity'), 0, { id:'labcoat', name:'SLAB lab coat', xp:1000 });\n"
        "  GEAR.extra.splice(GEAR.extra.findIndex(x => x.id === 'shades'), 0, { id:'goggles', name:'Lab goggles', xp:450 });\n"
        "}\n"
        "const ALL_GEAR = ")
    tops = (
        "TOPS.labcoat = { body:'#efeee8', sleeve:'long', back:true };\n"
        "if (SLAB_PACK) TOPS.blazer = { body:ACE_GOLD, sleeve:'long' };\n"
        "const PANTS = {")
    mark = (
        "\n// The chest and cap mark: Ace's A for Ace, otherwise the company's first letter (SLAB gets a chunkier S on caps)\n"
        f"const gearMark = () => {L}.join('') === 'ACE' ? null : (GLYPH[{L}[0]] || null);\n"
        "const capMarkRows = () => { const m = gearMark(); if (!m) return ['0110', '1001', '1111', '1001'];\n"
        f"  if ({L}[0] === 'S') return ['0111', '1100', '0011', '1110']; return [m[0], m[1], m[2], m[4]].map(r => r + '0'); }};\n")
    logo_old = "const logoA = (x, y, c) => { D(x + 1, y, c); D(x, y + 1, c); D(x + 2, y + 1, c); Dspan(y + 2, x, x + 2, c); D(x, y + 3, c); D(x + 2, y + 3, c); };"
    logo_new = ("const logoA = (x, y, c) => { const m = gearMark(); if (m) { m.forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(x + rx, y - 1 + ry, c); })); return; }"
                " D(x + 1, y, c); D(x, y + 1, c); D(x + 2, y + 1, c); Dspan(y + 2, x, x + 2, c); D(x, y + 3, c); D(x + 2, y + 3, c); };")
    labcoat = (
        "      case 'labcoat': for (let y = t; y <= t + 5; y++) { const k = Math.max(0, y - t - 3); Dspan(y, 16 + k, 19 - k, ACE_BLACK); }"
        " for (let y = t; y <= t + 6; y++) { const k = Math.max(0, y - t - 4); D(15 + k, y, d); D(20 - k, y, d); }"
        " for (let y = t + 7; y <= t + 12; y++) D(17, y, d); D(18, t + 8, '#b9b8b2'); D(18, t + 11, '#b9b8b2');"
        " Dspan(t + 5, 11, 13, d); D(12, t + 3, ACE_GOLD); D(12, t + 4, ACE_GOLD); logoA(21, t + 3, ACE_GOLD); Dspan(t + 10, 11, 14, d); Dspan(t + 10, 20, 23, d); break;\n"
        "      case 'robe':")
    goggles_front = ("    if (look.extra === 'goggles') { const gl = '#d6ecf5'; [ex0, ex1].forEach(x0 => { Dspan(y + 9, x0 - 1, x0 + 3, ACE_GOLD); Dspan(y + 12, x0 - 1, x0 + 3, ACE_GOLD);"
                     " D(x0 - 1, y + 10, ACE_GOLD); D(x0 - 1, y + 11, ACE_GOLD); D(x0 + 3, y + 10, ACE_GOLD); D(x0 + 3, y + 11, ACE_GOLD);"
                     " Dspan(y + 10, x0, x0 + 2, gl); Dspan(y + 11, x0, x0 + 2, gl); D(x0, y + 10, '#ffffff'); }); Dspan(y + 10, ex0 + 4, ex1 - 2, ACE_GOLD); }\n"
                     "    if (look.extra === 'shades' || look.extra === 'both') { [ex0, ex1]")
    goggles_side = ("    if (look.extra === 'goggles') { Dspan(y + 9, 15, 19, ACE_BLACK); Dspan(y + 9, 20, 24, ACE_GOLD); D(20, y + 10, ACE_GOLD); D(20, y + 11, ACE_GOLD);"
                    " Dspan(y + 10, 21, 24, '#d6ecf5'); Dspan(y + 11, 21, 24, '#d6ecf5'); Dspan(y + 12, 20, 24, ACE_GOLD); D(21, y + 10, '#ffffff'); }\n"
                    "    if (look.extra === 'shades' || look.extra === 'both') { Dspan(y + 9, 15, 24")
    cap_old = "D(17 + dx, y - 1, lg); D(18 + dx, y - 1, lg); D(16 + dx, y, lg); D(19 + dx, y, lg); Dspan(y + 1, 16 + dx, 19 + dx, lg); D(16 + dx, y + 2, lg); D(19 + dx, y + 2, lg);"
    cap_new = "capMarkRows().forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(16 + dx + rx, y - 1 + ry, lg); }));"
    for edit in [
        ("const ALL_GEAR = ", gear),
        ("const PANTS = {", tops),
        (logo_old, logo_new),
        ("logoA(16, t + 3, top.logo); D(19, t + 3, top.logo);", "logoA(16, t + 3, top.logo); if (!gearMark()) D(19, t + 3, top.logo);"),
        ("logoA(16, t + 3, ACE_GOLD); D(19, t + 3, ACE_GOLD);", "logoA(16, t + 3, ACE_GOLD); if (!gearMark()) D(19, t + 3, ACE_GOLD);"),
        ("      case 'robe':", labcoat),
        ("    if (look.extra === 'shades' || look.extra === 'both') { [ex0, ex1]", goggles_front),
        ("    if (look.extra === 'shades' || look.extra === 'both') { Dspan(y + 9, 15, 24", goggles_side),
        (cap_old, cap_new, 1),
        ('    legsFront(liftL, liftR);\n    const t = torso();', '    legsFront(liftL, liftR);\n    const t = torso();\n    coatTails(t);', 2),
        ('  function shoeDetails(view){', "  // the lab coat hangs to the knees: open at the front below the waist, closed at the back\n  function coatTails(t){\n    if (look.top !== 'labcoat') return;\n    for (let y = t + 13; y <= t + 18; y++) { span(Top, y, 10, 16); span(Top, y, 19, 25); if (dir === 'up' || y <= t + 14) span(Top, y, 17, 18); }\n  }\n  function shoeDetails(view){", 1),
        ('span(Top, t, 14, 21); for (let y = t + 1; y <= t + 12; y++) span(Top, y, 13, 22);', "span(Top, t, 14, 21); for (let y = t + 1; y <= t + 12; y++) span(Top, y, 13, 22);\n    if (look.top === 'labcoat') for (let y = t + 13; y <= t + 18; y++) span(Top, y, 12, 22);", 1),
        ('  function topBack(t){', "  function topBack(t){\n    if (look.top === 'labcoat') for (let y = t + 14; y <= t + 18; y++) D(17, y, shadow(body, 0.3));", 1),
        ('    const d = shadow(body, 0.35), l = light(body, 0.25);\n', "    const d = shadow(body, 0.35), l = light(body, 0.25);\n    // the SLAB logo in pixels: orange box, black SLAB, a flask for the A\n    const slabLogo = (x, y) => SLAB_LOGO.forEach((row, ry) => [...row].forEach((v, rx) => { if (v !== '.') D(x + rx, y + ry, v === 'o' ? ACE_GOLD : '#16161a'); }));\n", 1),
        (' for (let y = t + 7; y <= t + 12; y++) D(17, y, d);', ' for (let y = t + 7; y <= t + 14; y++) D(17, y, d);', 1),
        ('Dspan(t + 10, 11, 14, d); Dspan(t + 10, 20, 23, d);', 'Dspan(t + 14, 11, 14, d); Dspan(t + 14, 21, 24, d); Dspan(t + 18, 10, 16, d); Dspan(t + 18, 19, 25, d);', 1),
        ("  GEAR.top.splice(GEAR.top.findIndex(x => x.id === 'varsity'), 0, { id:'labcoat', name:'SLAB lab coat', xp:1000 });\n", "  GEAR.top.splice(1, 0, { id:'logotee', name:'SLAB logo tee', xp:0 });\n  GEAR.top.splice(GEAR.top.findIndex(x => x.id === 'varsity'), 0, { id:'labcoat', name:'SLAB lab coat', xp:1000 });\n"),
        ("TOPS.labcoat = { body:'#efeee8', sleeve:'long', back:true };\n", "TOPS.labcoat = { body:'#efeee8', sleeve:'long', back:true };\nTOPS.logotee = { body:'#f3f2ee', sleeve:'short', back:true };\nconst SLAB_LOGO = ['......oooo......','...ooo....ooo...','.oo..........oo.','o.......kkk....o','o.kk.k...k...kko','ok...k..k.k..k.k','o.k..k.k...k.kko','o..k.k.kk.kk.k.k','okk..kkkkkkk.kko','.ooo........ooo.','....ooo..ooo....','.......oo.......'];\n"),
        ("      case 'labcoat':", "      case 'logotee': Dspan(t, 15, 20, shadow(body, 0.1)); Dspan(t, 16, 19, skinD); slabLogo(10, t + 1); break;\n      case 'labcoat':"),
    ]:
        old, new, count = (*edit, 1)[:3]
        html = rep(html, old, new, count)
    html = rep(html, "const RARITY = { crown:1,", "const RARITY = { labcoat:8, goggles:25, crown:1,")
    return html, mark


def main(src):
    html = open(src, encoding='utf-8').read()

    # The artifact read wraps the page in a skeleton; keep only the demo's own document
    start = html.find('<!DOCTYPE html>')
    if start > 0:
        html = html[start:]
        end = html.find('</html>', html.rfind('</script>'))
        html = html[: end + len('</html>')] + '\n'

    build_login(html)
    bridge = open(os.path.join(HERE, 'bridge.js'), encoding='utf-8').read()

    # ---- state from the app ----
    html = rep(html, 'let currentXP = 340;',
               'const APP = window.SLAB_APP || null;\nlet currentXP = APP ? APP.me.xp : 340;')
    html = rep(html, 'let chatUnlockXP = 200;', 'let chatUnlockXP = APP ? APP.features.chatUnlockXp : 200;')
    html = rep(html, 'let audioUnlockXP = 500;', 'let audioUnlockXP = APP ? APP.features.vaultUnlockXp : 500;')
    html = rep(html, 'const streakDays = 5;', 'const streakDays = APP ? APP.me.streakDays : 5;')
    html = rep(html, '];\n\nconst repsData = {',
               '];\n'
               '// The street keeps the standard levels unless the company runs its own; finished ones come from the XP ledger\n'
               'if (APP && APP.features.companyLessons && APP.lessons && APP.lessons.length) categories.splice(0, categories.length, ...APP.lessons);\n'
               'else if (APP) { const done = new Set(APP.doneLessons || []); categories.forEach(c => c.subs.forEach(s => { s.status = APP.labOpen && done.has(s.id || s.title) ? \'done\' : \'locked\'; })); }\n'
               '\nconst repsData = {')

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
               "  let reply = rep.replies[Math.floor(Math.random() * rep.replies.length)], replyConnected = false, replyClips = [];\n"
               "  const replyReady = APP ? appCoachReply(text).then(r => { reply = r.reply; replyConnected = r.connected; replyClips = r.clips; }) : Promise.resolve();\n")
    html = rep(html, "  setTimeout(() => {\n    if (token !== replyToken) return;\n    avatar.set('talking');",
               "  replyReady.then(() => setTimeout(() => {\n    if (token !== replyToken) return;\n    avatar.set('talking');")
    html = rep(html, "      container.insertAdjacentHTML('beforeend', exampleChipHtml(rep, exampleTrack));\n",
               "      if (!APP) container.insertAdjacentHTML('beforeend', exampleChipHtml(rep, exampleTrack));\n"
               # The doors the answer drew on, as links to the full pitch in the Vault (bridge.js)
               "      else if (replyClips.length) container.insertAdjacentHTML('beforeend', appPitchLinks(replyClips));\n")
    html = rep(html, "    type();\n  }, 1500);\n}", "    type();\n  }, APP ? 300 : 1500));\n}")
    # Real answers come as short lists and run long: keep their line breaks, and type long ones faster
    html = rep(html, "    bubble.className = 'bubble bot';\n    container.appendChild(bubble);\n",
               "    bubble.className = 'bubble bot';\n    bubble.style.whiteSpace = 'pre-line';\n    container.appendChild(bubble);\n"
               "    const pace = reply.length > 300 ? 300 / reply.length : 1;\n")
    html = rep(html, "      setTimeout(type, /[.!?]/.test(ch) ? 260 : /[,:]/.test(ch) ? 160 : 26);",
               "      setTimeout(type, (/[.!?]/.test(ch) ? 260 : /[,:]/.test(ch) ? 160 : 26) * pace);")

    # ---- the rep: name and look live in the database ----
    html = rep(html, "function saveMe(){ try { localStorage.setItem('slabAce.rep', JSON.stringify(ME)); } catch (e) {} }",
               "function saveMe(){ try { localStorage.setItem('slabAce.rep', JSON.stringify(ME)); } catch (e) {} appSaveMe(); }\n"
               "if (APP) { ME.name = APP.me.name || ME.name; ME.email = APP.me.email; ME.level = APP.me.level || 'rookie'; if (APP.me.look) { ME.look = Object.assign({ ...DEFAULT_LOOK }, APP.me.look); ME.onboarded = true; } else ME.onboarded = false; }")
    html = rep(html, "function demoRole(){ try {", "function demoRole(){ if (APP) return APP.me.role || 'rep'; try {")
    # Role and level come from the account; reps and managers get no test switches, owners keep Owner view
    html = rep(html, "function roleCardHTML(){\n  const r = demoRole();\n",
               "function roleCardHTML(){\n  const r = demoRole();\n"
               "  if (APP) {\n"
               "    if (r !== 'owner') return '';\n"
               "    return `<div class=\"me-card me-role\"><span class=\"ow-lab\">Signed in as ${esc(APP.me.roleLabel || 'Owner')}</span>"
               "<button class=\"ow-btn\" id=\"me-owner\" type=\"button\">Open Owner view</button>"
               "<button class=\"ow-btn\" id=\"me-simple\" type=\"button\" style=\"background:#EDEAE2\">Switch to Simple mode</button></div>`;\n"
               "  }\n")
    html = rep(html, "  $('me-simple').onclick = () => setSimple(true);\n}", "  if ($('me-simple')) $('me-simple').onclick = () => setSimple(true);\n}")

    # ---- leaderboard: the company's real reps ----
    # (the swap itself happens in bridge.js, once DEFAULT_LOOK exists)

    # ---- boot: the app already signed them in ----
    html = rep(html, "  if (bootAuth.get()) { await btCompany(); return; }",
               "  if (APP) {\n"
               "    if (APP.brand && APP.brand.isAce) { await btCompany(); return; }\n"
               "    // SLAB's own reps open on the website's intro: the logo glitches in, then the screen slides up\n"
               "    if (APP.me && APP.me.solo) {\n"
               "      const img = intro.querySelector('img'), tag = intro.querySelector('.bt-tag');\n"
               "      $('bt-login').hidden = true; img.style.opacity = 0; tag.style.opacity = 0;\n"
               "      intro.classList.add('bt-on');\n"
               "      await btSleep(250); await btFlicker(img); await btSleep(350); tag.style.opacity = 1; await btSleep(550);\n"
               "      await btWipe(intro);\n"
               "    }\n"
               "    boot.classList.remove('live'); if (bootDone) { const f = bootDone; bootDone = null; f(); }\n"
               "    return;\n"
               "  }\n"
               "  if (bootAuth.get()) { await btCompany(); return; }")

    # ---- Rylan's own portrait in the Vault (the demo shows him with Austin's sheet) ----
    rylan = base64.b64encode(open(os.path.join(HERE, 'rylan-sprite.webp'), 'rb').read()).decode()
    html = rep(html, "const avatarSheets = { marshall: IMG.marshallSprite, austin: IMG.austinSprite };",
               "const avatarSheets = { marshall: IMG.marshallSprite, austin: IMG.austinSprite, rylan: 'data:image/webp;base64," + rylan + "' };")
    html = rep(html, "const VX_AVK = { m:'marshall', r:'austin' };", "const VX_AVK = { m:'marshall', r:'rylan' };")

    # ---- tour: steps can open another tab first, and the tour cleans up after itself ----
    html = rep(html, "    const step = TOUR[i];\n    const target = document.querySelector(step.sel);",
               "    const step = TOUR[i];\n    if (step.go) step.go();\n    const target = document.querySelector(step.sel);")
    html = rep(html, "  const end = () => { coach.remove(); scrollToActiveLesson(true, 200); };",
               "  const end = () => { coach.remove(); if (typeof tourDone === 'function') tourDone(); scrollToActiveLesson(true, 200); };")

    # ---- settings: account facts and actions go native ----
    html = rep(html, '<div><span>Role</span><b>Sales rep</b></div>',
               "<div><span>Role</span><b>${APP ? esc(APP.me.roleLabel) : 'Sales rep'}</b></div>")
    html = rep(html, '<div><span>Company</span><b>Ace Cooperatives</b></div>',
               "<div><span>Company</span><b>${APP ? esc(APP.me.companyName || 'Not registered yet') : 'Ace Cooperatives'}</b></div>")
    html = rep(html, "    if (id === 'push' && !on) showToast('Push notifications are off on this phone', 'ph-bell-slash');\n",
               "    if (APP) { appNotif(id, on, cb); return; }\n"
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
    html = rep(html, "function vxLoad(src, t, play){\n  const abs = new URL(src, location.href).href;",
               "function vxLoad(src, t, play){\n  let abs = new URL(src, location.href).href;")
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
    html, mark = slab_pack(html)
    html = rep(html, 'const GLYPH = ' + font + ';', 'const GLYPH = ' + font + ';' + mark)
    html = rep(html, "['A', 'C', 'E'].forEach((ch, i) => GLYPH[ch].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(12 + i * 4 + rx, t + 3 + ry, c); })));",
               "GEAR_LETTERS.forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') D(GEAR_X0 + i * 4 + rx, t + 3 + ry, c); })));")

    html = rep(html, 'More Ace gear unlocks as you earn XP.', "More ${APP_GEAR ? esc(APP_GEAR.name) : 'Ace'} gear unlocks as you earn XP.")
    html = rep(html, "and more XP unlocks more Ace gear.' }", "and more XP unlocks more ' + (APP_GEAR ? APP_GEAR.name : 'Ace') + ' gear.' }")

    html = rep(html, "[...'ACE'].forEach((ch, i) => F[ch].forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') g.fillRect(53 + i * 5 + x, 88 + y, 1, 1); })));",
               "const vx0 = 45 + Math.floor((30 - (GEAR_LETTERS.length * 5 - 2)) / 2);\n"
               "  GEAR_LETTERS.forEach((ch, i) => (GLYPH[ch] || GLYPH[' ']).forEach((row, y) => [...row].forEach((b, x) => { if (b === '1') g.fillRect(vx0 + i * 5 + x, 88 + y, 1, 1); })));")

    # ---- unlocks: the company's thresholds, not the demo's rookie/vet shortcut ----
    # The progress bar fills from the left by lessons passed, whichever doors a vet took them at
    html = rep(html, "  categories.forEach((c, i) => {\n    const done = c.subs.filter(s => s.status === 'done').length;\n    const seg = bar.children[i];",
               "  let doneLeft = doneLessons;\n  categories.forEach((c, i) => {\n    const done = Math.min(doneLeft, c.subs.length); doneLeft -= done;\n    const seg = bar.children[i];")
    # Companies without their own training: every door stays locked (the Vault and chat stay open)
    html = rep(html, "function normalizePath(){\n", "function normalizePath(){\n  if (APP && !APP.labOpen) return;\n")
    html = rep(html, "  const target = active >= 0 ? active : street.stops.length - 1;",
               "  const target = active >= 0 ? active : APP && !APP.labOpen ? 0 : street.stops.length - 1;")
    html = rep(html, "    showToast(s.kind === 'boss' ? 'Pass off every ' + s.unit + ' lesson first' : 'Pass off the lessons before this one first', 'ph-lock-simple');",
               "    showToast(APP && !APP.labOpen ? (APP.me.solo ? 'You’re not registered with a company' : 'Your company’s training isn’t set up yet') : s.kind === 'boss' ? 'Pass off every ' + s.unit + ' lesson first' : 'Pass off the lessons before this one first', 'ph-lock-simple');")
    html = rep(html, '  audioUnlockXP = isVet() ? 0 : 500;\n  chatUnlockXP = isVet() ? 0 : 200;',
               '  audioUnlockXP = isVet() ? 0 : APP ? APP.features.vaultUnlockXp : 500;\n'
               '  chatUnlockXP = isVet() ? 0 : APP ? APP.features.chatUnlockXp : 200;')

    # ---- the book library carries the company's name ----
    html = rep(html, "'Ace Library, ' + n", "libName() + ', ' + n")
    html = rep(html, "'<span class=\"bv-crumb\">Ace Library</span>'", "'<span class=\"bv-crumb\">' + libName() + '</span>'")
    html = rep(html, '<h2 class="lv-title">Ace Library</h2>', '<h2 class="lv-title">${libName()}</h2>')

    # ---- start-up: one failing step no longer stops the rest (and the app reports it) ----
    init_old = """updateXPBadge();
renderCourse();
renderRecordings();
switchChatRep('marshall');
renderLeaderboard(false);
applyLockStates();
renderShelves();
scrollToActiveLesson(true, 900);
applyStreak(false);
initRep();
"""
    init_new = """appSafe('xp badge', updateXPBadge);
appSafe('course', renderCourse);
appSafe('vault', renderRecordings);
appSafe('chat', () => switchChatRep('marshall'));
appSafe('leaderboard', () => renderLeaderboard(false));
appSafe('locks', applyLockStates);
appSafe('shelves', renderShelves);
appSafe('scroll', () => scrollToActiveLesson(true, 900));
appSafe('streak', () => applyStreak(false));
appSafe('rep', initRep);
"""
    html = rep(html, init_old, init_new)

    # ---- which update the phone runs, under Sign out ----
    html = rep(html, '    <button class="btn btn-quiet me-signout" id="me-signout">Sign out</button>\n',
               '    <button class="btn btn-quiet me-signout" id="me-signout">Sign out</button>\n'
               '    ${APP && APP.build ? `<div style="text-align:center;font-size:11px;opacity:.45;margin-top:10px;letter-spacing:.06em">BUILD ${esc(window.APP_BUILD || APP.build)}</div>` : \'\'}\n')

    # ---- reels: other companies don't get Ace's logo behind every card ----
    html = rep(html, '    <img class="logo" src="${IMG.ace}" alt="">', "    ${APP && !(APP.brand && APP.brand.isAce) ? '' : `<img class=\"logo\" src=\"${IMG.ace}\" alt=\"\">`}")

    # ---- owner view and My Team on real data (tools/game/bridge.js fills these from company_roster) ----
    html = rep(html, 'const OW_SEATS = 25;', 'let OW_SEATS = 25;')
    html = rep(html, 'const lessons = act.reduce((s, r) => s + Math.round(r.wk / 260), 0);', 'const lessons = act.reduce((s, r) => s + (APP ? r.lesson : Math.round(r.wk / 260)), 0);')
    html = rep(html, ": r.last === 0 ? 'Active today' : r.last === 1 ? 'Active yesterday' : 'Last active ' + r.last + ' days ago';",
               ": r.last == null ? 'Hasn\\'t opened the app yet' : r.last === 0 ? 'Active today' : r.last === 1 ? 'Active yesterday' : 'Last active ' + r.last + ' days ago';")
    html = rep(html, "${r.last === 0 ? 'Today' : r.last === 1 ? 'Yesterday' : r.last + ' days ago'}",
               "${r.last == null ? 'Not yet' : r.last === 0 ? 'Today' : r.last === 1 ? 'Yesterday' : r.last + ' days ago'}")
    html = rep(html, "const owTeam = (id) => OW_TEAMS.find(t => t.id === id);",
               "const OW_NO_TEAM = { id:'', name:'No team', manager:null, goal:0 };\nconst owTeam = (id) => OW_TEAMS.find(t => t.id === id) || OW_NO_TEAM;")
    html = rep(html, "const teamOpts = (sel) => OW_TEAMS.map(",
               "const teamOpts = (sel, none) => (none ? `<option value=\"\"${sel ? '' : ' selected'}>No team</option>` : '') + OW_TEAMS.map(")
    html = rep(html, '<select class="ow-sel" data-f="team">${teamOpts(r.team)}</select>', '<select class="ow-sel" data-f="team">${teamOpts(r.team, true)}</select>')
    html = rep(html, '<select class="ow-sel" id="inv-team">${teamOpts(\'hawks\')}</select>', '<select class="ow-sel" id="inv-team">${teamOpts(OW_TEAMS[0] ? OW_TEAMS[0].id : \'\', true)}</select>')
    html = rep(html, '<div class="ow-seats"><span>${used} of ${OW_SEATS} seats</span><div class="ow-bar"><i style="width:${used / OW_SEATS * 100}%"></i></div></div>',
               '${OW_SEATS ? `<div class="ow-seats"><span>${used} of ${OW_SEATS} seats</span><div class="ow-bar"><i style="width:${Math.min(100, used / OW_SEATS * 100)}%"></i></div></div>` : ``}')
    html = rep(html, '<div><b>${owEsc(top.name)}</b><small>Top team</small></div>', '<div><b>${top ? owEsc(top.name) : \'&mdash;\'}</b><small>Top team</small></div>')
    html = rep(html, "if (big) drawSprite(big, OW_REPS.find(r => r.name === mtState.rep).look, { crop:'bust' });",
               "const bigLook = big && OW_REPS.find(r => r.name === mtState.rep)?.look; if (bigLook) drawSprite(big, bigLook, { crop:'bust' });")
    html = rep(html, '<div class="ow-h2">Quiz scores</div>', '<div class="ow-h2">${APP ? \'Units\' : \'Quiz scores\'}</div>')
    html = rep(html, "${OW_BOSS.map((b, i) => `<div class=\"mt-line\"><span>${b}</span>${bar(r.boss[i])}</div>`).join('')}",
               "${OW_BOSS.map((b, i) => `<div class=\"mt-line\"><span>${b}</span>${APP ? (r.boss[i] != null ? '<div class=\"ow-bar\"><i style=\"width:100%\"></i></div><span class=\"v\">Beat</span>' : '<div class=\"ow-bar\"></div><span class=\"v na\">&mdash;</span>') : bar(r.boss[i])}</div>`).join('')}")
    html = rep(html, "${s.scheduled ? 'scheduled' : `read by ${s.read} of ${s.reach}`}", "${s.scheduled ? 'scheduled' : s.read == null ? 'sent' : `read by ${s.read} of ${s.reach}`}")

    # ---- Vault rep page: no door list (Duncan), and Marshall's videos play from it ----
    html = rep(html, """    <div class="vx-h"><span>DOORS</span><span>${ds.length}</span></div>
    <div class="vx-box">${ds.map(""", """    ${APP ? '' : `<div class="vx-h"><span>DOORS</span><span>${ds.length}</span></div>`}
    ${APP ? '' : `<div class="vx-box">${ds.map(""")
    html = rep(html, """<span class="lk">${vxFmt(d.dur)}</span></button>`).join('')}</div>
    <div class="vx-h"><span>VIDEOS</span><span></span></div>
    <div class="vx-box"><div class="vx-empty"><span class="tv"></span><span>No videos from ${r.name.split(' ')[0]} yet. When they're uploaded, they show up right here.</span></div></div>`;""",
               """<span class="lk">${vxFmt(d.dur)}</span></button>`).join('')}</div>`}
    <div class="vx-h"><span>VIDEOS</span><span>${APP ? appVaultVideoCount(rid) || '' : ''}</span></div>
    ${APP && appVaultVideoCount(rid) ? appVaultVideosHTML() : `<div class="vx-box"><div class="vx-empty"><span class="tv"></span><span>No videos from ${r.name.split(' ')[0]} yet. When they're uploaded, they show up right here.</span></div></div>`}`;""")
    html = rep(html, "  $('vx-back').onclick = () => { vxRepOpen = null; vxRenderDays(); updateChatDock(); };\n  vxFaces(el);",
               "  $('vx-back').onclick = () => { vxRepOpen = null; vxRenderDays(); updateChatDock(); };\n  vxFaces(el);\n  if (APP) appBindVaultVideos(el);")

    # ---- power hour: the countdown bar stays, the pretend push on every open goes (the app sends the real one) ----
    html = rep(html, "  if (on && !powerWasOn) {\n    pushNote('Power hour is live'", "  if (on && !powerWasOn && !APP) {\n    pushNote('Power hour is live'")

    html = vault_live(html)

    # ---- the bridge itself, just before start-up runs ----
    html = rep(html, '// ============ INIT ============', bridge + '\n\n// ============ INIT ============')

    # ---- styles for the real lesson player ----
    css = """
  .lv-real{ position:relative; aspect-ratio:16/9; border-radius:14px; overflow:hidden; background:#000; border:1px solid rgba(255,255,255,.08); }
  .lv-real iframe, .lv-real video{ position:absolute; inset:0; width:100%; height:100%; border:0; background:#000; }
  .not-ace .ace-search, .not-ace .ace-shelf, .not-ace .ace-group{ display:none !important; }
  /* Marshall is a bust in his round spot in the nav (Duncan's sketch): his shirt fills the circle to its
     bottom edge and only the top of his head peeks out above it. He sinks into the circle when he leaves
     for chat or the Vault and climbs back out when he returns */
  .nav-head .nav-slot, .nav-head.away .nav-slot, .nav-head.back .nav-slot{ opacity:1; transform:none; transition-delay:0s; }
  .nav-head::after{ display:none; }
  .nav-head .nav-clip{
    -webkit-mask:linear-gradient(#000, #000) top / 100% 28px no-repeat, radial-gradient(circle at 26px 34px, #000 13px, transparent 13.5px);
    mask:linear-gradient(#000, #000) top / 100% 28px no-repeat, radial-gradient(circle at 26px 34px, #000 13px, transparent 13.5px); }
  .nav-head .nav-clip canvas{ transform-origin:50% 100%; transform:translateY(2px) scale(1.3); }
  .nav-head.away .nav-clip canvas{ transform:translateY(150%) scale(1.3); transition:transform 0.42s cubic-bezier(.5,0,.75,0) 0.1s; }
  /* My Team floats just above the nav bar's top edge, wherever that is */
  .mt-fab{ bottom:calc(var(--nav-gap, var(--nav-h, 64px)) + 16px) !important; }
  .topbar .brand img, .topbar .brand .slab-logo{ height:28px; }
  .topbar .brand .x{ font-size:14px; }
  .fv-clock{ position:relative; height:22px; margin:0 0 8px; border-radius:11px; background:rgba(255,255,255,.08); overflow:hidden; }
  .fv-clock i{ position:absolute; inset:0; background:var(--accent, #daae5d); transform-origin:left; animation:fvClock linear forwards; }
  .fv-clock b{ position:relative; display:block; text-align:center; font-size:12px; line-height:22px; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.6); }
  .fv-clock.low i{ background:#e0664f; }
  @keyframes fvClock{ from{ transform:scaleX(1); } to{ transform:scaleX(0); } }
  .app-vid{ position:absolute; inset:0; z-index:95; background:#000; display:flex; flex-direction:column; }
  .app-vid-top{ display:flex; align-items:center; gap:10px; padding:calc(env(safe-area-inset-top, 0px) + 12px) 14px 12px; color:#EDEAE2; font:600 15px/1.25 'Barlow', sans-serif; }
  .app-vid-top b{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .app-vid-x{ width:36px; height:36px; border-radius:50%; border:0; background:#EDEAE2; color:#0b0b0d; font-size:18px; display:grid; place-items:center; flex:none; }
  .app-vid-box{ flex:1; display:grid; place-items:center; }
  .app-vid-box iframe, .app-vid-box video{ width:100%; aspect-ratio:16/9; border:0; background:#000; }
  .app-vid-wait{ color:#a39d90; font-size:14px; }
  .vx-vgroup{ padding:10px 2px 4px; font:400 9px/1.4 'Press Start 2P', monospace; color:var(--g, #daae5d); letter-spacing:1px; text-transform:uppercase; }
  .lv-real-wait{ position:absolute; inset:0; display:grid; place-items:center; color:#a39d90; font-size:14px; }
  /* Leaderboard: my company or everyone */
  .lb-scope{ display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:4px; margin:0 0 14px; background:var(--surface); border:1px solid var(--hairline); border-radius:var(--r-ctl); }
  .lb-scope button{ display:flex; align-items:center; justify-content:center; gap:6px; min-height:40px; border:0; border-radius:9px; background:none; color:var(--text-dim); font:600 14px/1 'Barlow', sans-serif; cursor:pointer; }
  .lb-scope button.on{ background:var(--amber); color:#0b0b0d; }
  .lb-scope button i{ font-size:15px; }
  .lb-scope .lb-globe{ width:17px; height:17px; flex:none; }
  .lb-co{ display:block; font-size:11.5px; font-weight:500; color:var(--text-dim); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  /* Solo: no company yet */
  .solo .navbtn.solo-lock{ opacity:.45; }
  /* the Vault door is drawn in Ace gold; SLAB's is orange */
  .solo .vx-door .dr canvas{ filter:hue-rotate(-18deg) saturate(1.5); }
  .solo-banner{ display:flex; align-items:center; gap:12px; width:calc(100% - 32px); margin:4px 16px 10px; padding:12px 14px; border-radius:var(--r-card); border:1px solid var(--amber-line); background:var(--amber-dim); color:var(--text); text-align:left; font:inherit; cursor:pointer; position:relative; z-index:3; }
  .solo-banner > i:first-child{ font-size:20px; color:var(--amber); flex:none; }
  .solo-banner > i:last-child{ color:var(--text-dim); flex:none; }
  .solo-banner span{ flex:1; font-size:12.5px; line-height:1.35; color:var(--text-dim); }
  .solo-banner b{ display:block; font-size:14.5px; color:var(--text); margin-bottom:2px; }
  .solo-kick{ font:700 11px/1 'Barlow', sans-serif; letter-spacing:.16em; color:var(--amber); margin:4px 0 8px; }
  .solo-sheet .solo-h{ font-size:26px; margin:0 0 6px; }
  .solo-p{ margin:0 0 14px; font-size:14px; line-height:1.4; color:var(--text-dim); }
  .solo-list{ list-style:none; margin:0 0 12px; padding:0; display:flex; flex-direction:column; gap:6px; }
  .solo-list li{ display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:var(--r-ctl); border:1px solid var(--hairline); background:var(--bg); }
  .solo-list li i{ font-size:22px; color:var(--amber); flex:none; }
  .solo-list li span{ display:flex; flex-direction:column; font-size:12.5px; color:var(--text-dim); line-height:1.35; }
  .solo-list li b{ font-size:14.5px; color:var(--text); }
  .solo-locked{ display:flex; align-items:center; gap:8px; margin:0 0 16px; font-size:12.5px; color:var(--text-dim); line-height:1.35; }
  .solo-locked i{ font-size:16px; flex:none; }
  .solo-sheet .btn{ width:100%; margin-top:6px; }
  /* SLAB admins: view the app as any company */
  .co-list{ display:flex; flex-direction:column; gap:6px; }
  .co-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:48px; padding:0 14px; border-radius:var(--r-ctl); border:1px solid var(--hairline); background:var(--bg); color:var(--text); font:600 15px/1.2 'Barlow', sans-serif; text-align:left; cursor:pointer; }
  .co-row.on{ border-color:var(--amber); }
  .co-row i{ color:var(--amber); font-size:18px; }
  .co-wait{ padding:18px 0; text-align:center; color:var(--text-dim); font-size:14px; }
"""
    i = html.index('</style>', html.index('<!DOCTYPE html>') if '<!DOCTYPE html>' in html else 0)
    html = html[:i] + css + html[i:]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(html)
    print('wrote', OUT, len(html))


if __name__ == '__main__':
    main(sys.argv[1])
