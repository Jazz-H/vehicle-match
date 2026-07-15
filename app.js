/* Vehicle Match — wizard engine. Renders each screen, runs the scoring
   engine, and shows transparent results. Analytics is stubbed for M4. */
(function () {
  var VM = window.VM;
  var app = document.getElementById('app');

  var state = {
    screen: 'landing',   // landing | wizard | results
    step: 0,             // 0 type · 1 priorities · 2 preferences
    type: null,
    priorities: [],      // ordered, max 3
    prefs: { priceMax: 100000, seats: 2, drivetrain: 'any' }
  };

  var STEP_LABELS = ['Vehicle type', 'Your priorities', 'Preferences'];

  // ---- analytics stub (wired to Supabase in M4) ----
  var sessionId = (function () {
    try { var k = 'vm.session'; var s = localStorage.getItem(k);
      if (!s) { s = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, s); }
      return s; } catch (e) { return 'anon'; }
  })();
  function track(step, choice) { /* M4: VM.analytics.track(sessionId, step, choice) */ }

  // ---- body-type silhouettes (used for tile icons + result visuals) ----
  function silhouette(type) {
    var wheels = '<circle cx="30" cy="34" r="6.5"/><circle cx="76" cy="34" r="6.5"/>' +
                 '<circle cx="30" cy="34" r="2.4"/><circle cx="76" cy="34" r="2.4"/>';
    var body = {
      sedan:  'M8 30 C8 24 12 23 18 22 L32 22 L42 13 L62 13 L70 22 L88 23 C93 24 95 26 95 30',
      suv:    'M8 30 C8 22 11 21 17 21 L31 21 L37 11 L74 11 L80 21 L88 22 C93 23 95 25 95 30',
      truck:  'M8 30 L8 23 C8 21 10 20 14 20 L31 20 L37 12 L55 12 L59 20 L95 20 L95 30',
      coupe:  'M8 30 C8 25 12 24 18 23 L35 22 L47 14 L64 15 L85 24 C91 25 95 26 95 30',
      electric:'M8 30 C8 24 12 23 18 22 L32 22 L42 13 L62 13 L70 22 L88 23 C93 24 95 26 95 30'
    };
    var d = body[type] || body.sedan;
    var extra = (type === 'electric')
      ? '<path d="M53 15 L47 24 L52 24 L49 30 L58 20 L53 20 Z" fill="currentColor" stroke="none" opacity=".9"/>'
      : '';
    return '<svg viewBox="0 0 103 42" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' +
      '<path d="' + d + '"/>' + wheels + extra + '</svg>';
  }

  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function priceLabel(n) { return n >= 100000 ? 'No limit' : 'Under ' + money(n); }
  function seatLabel(n) { return n <= 2 ? 'Any' : n + '+ seats'; }
  function dtLabel(k) { return { any: 'Any', fwd: 'FWD', rwd: 'RWD', awd: 'AWD', '4x4': '4x4' }[k] || k; }
  function priLabel(k) { var p = VM.PRIORITIES.filter(function (x) { return x.key === k; })[0]; return p ? p.label : k; }

  // ============ RENDER ============
  function render() {
    if (state.screen === 'landing') return renderLanding();
    if (state.screen === 'results') return renderResults();
    return renderWizard();
  }

  function renderLanding() {
    app.innerHTML =
      '<section class="land">' +
      '<div class="eyebrow">Interactive vehicle finder</div>' +
      '<h1>Find your <span class="rev">match.</span></h1>' +
      '<p>Answer three quick questions about how you drive and what matters — get matched to the right vehicle, with the reasons why.</p>' +
      '<div class="steps"><span><b>1</b>&nbsp; Type</span><span><b>2</b>&nbsp; Priorities</span><span><b>3</b>&nbsp; Preferences</span><span><b>&#10003;</b>&nbsp; Your match</span></div>' +
      '<button class="btn primary" id="start">Start &rarr;</button>' +
      '</section>';
    document.getElementById('start').addEventListener('click', function () {
      state.screen = 'wizard'; state.step = 0; render();
    });
  }

  function progress() {
    var pct = ((state.step) / STEP_LABELS.length) * 100 + (100 / STEP_LABELS.length) * 0; // start of step
    pct = (state.step / STEP_LABELS.length) * 100;
    return '<div class="prog"><div class="prog-top">' +
      '<span class="prog-step">Step ' + (state.step + 1) + ' / ' + STEP_LABELS.length + '</span>' +
      '<span class="prog-label">' + STEP_LABELS[state.step] + '</span></div>' +
      '<div class="prog-bar"><div class="prog-fill" style="width:' + (((state.step + 1) / STEP_LABELS.length) * 100) + '%"></div></div></div>';
  }

  function renderWizard() {
    var content = [renderTypeStep, renderPriorityStep, renderPrefStep][state.step]();
    var canNext = stepValid();
    app.innerHTML = '<section class="wiz">' + progress() +
      '<div class="q">' + content + '</div>' +
      '<div class="wiz-nav">' +
      '<button class="btn ghost" id="back">&larr; Back</button>' +
      '<button class="btn primary" id="next"' + (canNext ? '' : ' disabled') + '>' +
      (state.step === STEP_LABELS.length - 1 ? 'See my match &rarr;' : 'Next &rarr;') + '</button>' +
      '</div></section>';
    wireWizard();
  }

  function stepValid() {
    if (state.step === 0) return !!state.type;
    if (state.step === 1) return state.priorities.length >= 1;
    return true;
  }

  function renderTypeStep() {
    var tiles = VM.TYPES.map(function (t) {
      var on = state.type === t.key ? ' on' : '';
      var ico = t.key === 'any' ? '' : '<div class="ico">' + silhouette(t.key) + '</div>';
      return '<button class="tile' + on + '" data-type="' + t.key + '">' + ico +
        '<span class="t">' + t.label + '</span></button>';
    }).join('');
    return '<h2>What are you shopping for?</h2>' +
      '<p class="sub">Pick a body type — or keep it open and let your priorities decide.</p>' +
      '<div class="tiles">' + tiles + '</div>';
  }

  function renderPriorityStep() {
    var tiles = VM.PRIORITIES.map(function (p) {
      var idx = state.priorities.indexOf(p.key);
      var on = idx > -1 ? ' on' : '';
      var rank = idx > -1 ? '<span class="rank">' + (idx + 1) + '</span>' : '';
      return '<button class="tile' + on + '" data-pri="' + p.key + '">' + rank +
        '<span class="t">' + p.label + '</span><span class="d">' + p.blurb + '</span></button>';
    }).join('');
    return '<h2>What matters most?</h2>' +
      '<p class="sub">Choose up to three, in order of importance. Your first pick counts the most.</p>' +
      '<div class="tiles">' + tiles + '</div>';
  }

  function seg(label, name, opts, current, fmt) {
    var btns = opts.map(function (o) {
      var on = String(current) === String(o) ? ' on' : '';
      return '<button class="' + on.trim() + '" data-seg="' + name + '" data-val="' + o + '">' + fmt(o) + '</button>';
    }).join('');
    return '<div class="field"><label>' + label + '</label><div class="seg">' + btns + '</div></div>';
  }

  function renderPrefStep() {
    return '<h2>Narrow it down</h2>' +
      '<p class="sub">A few hard limits so we only match what actually fits.</p>' +
      seg('Budget', 'priceMax', VM.PREFS.priceMax, state.prefs.priceMax, priceLabel) +
      seg('Seating', 'seats', VM.PREFS.seats, state.prefs.seats, seatLabel) +
      seg('Drivetrain', 'drivetrain', VM.PREFS.drivetrain, state.prefs.drivetrain, dtLabel);
  }

  function wireWizard() {
    document.getElementById('back').addEventListener('click', function () {
      if (state.step === 0) { state.screen = 'landing'; render(); }
      else { state.step--; render(); }
    });
    document.getElementById('next').addEventListener('click', function () {
      if (!stepValid()) return;
      track(['type', 'priorities', 'prefs'][state.step],
        state.step === 0 ? { type: state.type } : state.step === 1 ? { priorities: state.priorities } : state.prefs);
      if (state.step === STEP_LABELS.length - 1) { state.screen = 'results'; render(); }
      else { state.step++; render(); }
    });
    // tile / seg clicks
    Array.prototype.forEach.call(app.querySelectorAll('[data-type]'), function (el) {
      el.addEventListener('click', function () { state.type = el.getAttribute('data-type'); render(); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-pri]'), function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-pri'), i = state.priorities.indexOf(k);
        if (i > -1) state.priorities.splice(i, 1);
        else if (state.priorities.length < 3) state.priorities.push(k);
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-seg]'), function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-seg'), val = el.getAttribute('data-val');
        state.prefs[name] = (name === 'drivetrain') ? val : parseInt(val, 10);
        render();
      });
    });
  }

  // ============ RESULTS ============
  function renderResults() {
    var out = VM.score.match(VM.VEHICLES, {
      type: state.type, priorities: state.priorities,
      priceMax: state.prefs.priceMax, seats: state.prefs.seats, drivetrain: state.prefs.drivetrain
    });
    track('result', { top: out.results[0] && out.results[0].vehicle.id, relaxed: out.relaxed });

    var top = out.results[0], alts = out.results.slice(1);
    if (!top) { app.innerHTML = '<section class="res-head"><h2>No matches</h2></section>'; return; }

    var whyChips = top.why.map(function (w) { return '<span>' + priLabel(w) + '</span>'; }).join('');
    var v = top.vehicle;
    var topHtml =
      '<div class="card top-pick"><div class="flag">Your best match</div>' +
      '<div class="pick-body">' +
      '<div class="pick-visual">' + silhouette(v.type) + '</div>' +
      '<div class="pick-info">' +
      '<div class="ey">' + v.year + ' &middot; ' + typeName(v.type) + '</div>' +
      '<h3>' + v.name + '</h3>' +
      '<div class="match-badge"><b>' + top.score + '%</b><span>match</span></div>' +
      '<div class="why">' + whyChips + '</div>' +
      '<p class="blurb">' + v.blurb + '</p>' +
      '</div></div>' +
      '<div class="specs">' +
      specCell('Price', money(v.price)) + specCell('Efficiency', v.spec) + specCell('Power', v.hp + ' hp') +
      specCell('Seats', String(v.seats)) + specCell('Drivetrain', dtLabel(v.drivetrain).toUpperCase()) +
      specCell('Towing', v.tow ? v.tow.toLocaleString() + ' lb' : '—') +
      '</div>' +
      '<div class="pick-cta"><button class="btn primary" id="quote">Get a personalized quote</button>' +
      '<span style="font-family:\'IBM Plex Mono\',monospace;font-size:.66rem;letter-spacing:.06em;color:var(--ink-soft)">Matched to your top priorities</span></div>' +
      '</div>';

    var altHtml = alts.length ? '<div class="alts">' + alts.map(function (r) {
      return '<div class="card alt"><div class="ey">Also worth a look</div>' +
        '<h4>' + r.vehicle.name + '</h4>' +
        '<div class="altmatch">' + r.score + '% match</div>' +
        '<div class="altspec">' + money(r.vehicle.price) + ' &middot; ' + r.vehicle.spec + ' &middot; ' + r.vehicle.hp + ' hp</div>' +
        '</div>';
    }).join('') + '</div>' : '';

    var note = out.relaxed ? '<div class="res-note">' + out.note + '</div>' : '';

    app.innerHTML =
      '<section class="res-head"><div class="eyebrow">Based on your answers</div>' +
      '<h2>We found your match</h2>' + note + '</section>' +
      topHtml + altHtml +
      '<div class="res-foot"><button class="btn ghost" id="restart">Start over</button></div>';

    document.getElementById('restart').addEventListener('click', function () {
      state = { screen: 'landing', step: 0, type: null, priorities: [], prefs: { priceMax: 100000, seats: 2, drivetrain: 'any' } };
      render();
    });
    var q = document.getElementById('quote');
    if (q) q.addEventListener('click', function () { alert('Lead capture form — coming in M3.'); });
  }

  function specCell(k, v) { return '<div class="s"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function typeName(t) { var x = VM.TYPES.filter(function (y) { return y.key === t; })[0]; return x ? x.label : t; }

  render();
})();
