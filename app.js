/* Vehicle Match — wizard engine. Renders each screen, runs the scoring
   engine, and shows transparent results. Analytics is stubbed for M4. */
(function () {
  var VM = window.VM;
  var app = document.getElementById('app');
  var announceEl = document.getElementById('vm-announce');

  function freshState() {
    return {
      screen: 'landing',   // landing | wizard | results
      step: 0,             // 0 type · 1 priorities · 2 preferences
      type: null,
      priorities: [],      // ordered, max 3
      prefs: { priceMax: 100000, seats: 2, drivetrain: 'any' },
      resultsReady: false  // gates the brief loading state before results
    };
  }
  var state = freshState();

  var STEP_LABELS = ['Vehicle type', 'Your priorities', 'Preferences'];

  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches);

  // ---- focus + screen-reader plumbing (M2 a11y) ----
  // focusIntent tells the next render where focus should land: the step
  // heading on navigation, or a specific control after an in-step toggle
  // (so keyboard users don't lose their place when the view re-renders).
  var focusIntent = null;
  var lastKey = null, animate = false;

  function announce(msg) {
    if (!announceEl || !msg) return;
    announceEl.textContent = '';               // reset so identical text re-announces
    announceEl.textContent = msg;
  }
  function applyFocus() {
    if (!focusIntent) return;
    var fi = focusIntent; focusIntent = null;
    var el = fi.heading ? app.querySelector('[data-fh]')
           : fi.sel ? app.querySelector(fi.sel) : null;
    if (el && el.focus) el.focus();
  }

  // ---- analytics stub (wired to Supabase in M4) ----
  var sessionId = (function () {
    try { var k = 'vm.session'; var s = localStorage.getItem(k);
      if (!s) { s = 's' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, s); }
      return s; } catch (e) { return 'anon'; }
  })();
  function track(step, choice) {
    if (VM.db && VM.db.track) VM.db.track(sessionId, step, choice);
  }

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
    // Animate only when the screen/step actually changes — not on the
    // in-step re-renders triggered by toggling a tile or segment.
    var key = state.screen === 'results'
      ? 'results:' + (state.resultsReady ? 'ready' : 'load')
      : state.screen + ':' + state.step;
    animate = !reduceMotion && key !== lastKey;
    lastKey = key;

    if (state.screen === 'landing') return renderLanding();
    if (state.screen === 'results') return renderResults();
    return renderWizard();
  }

  function renderLanding() {
    // Editorial stack on mobile → framed split (headline + live sample match) on desktop.
    var sampleCard =
      '<div class="payoff" aria-hidden="true"><span class="plabel">Sample match</span>' +
      '<div class="samplecard">' +
      '<div class="sc-flag">Your best match</div>' +
      '<div class="sc-visual">' + silhouette('suv') + '</div>' +
      '<div class="sc-info"><div class="sc-ey">2024 &middot; SUV</div><h3>Toyota RAV4</h3>' +
      '<div class="sc-badge"><b>94%</b><span>match</span></div>' +
      '<div class="sc-why"><span>Budget</span><span>Efficiency</span><span>Space</span></div></div>' +
      '<div class="sc-specs">' +
      '<div class="s"><span class="k">Price</span><span class="v">$29,000</span></div>' +
      '<div class="s"><span class="k">Efficiency</span><span class="v">30 mpg</span></div>' +
      '<div class="s"><span class="k">Drivetrain</span><span class="v">AWD</span></div>' +
      '</div></div></div>';

    var vstrip =
      '<div class="vstrip">' +
      '<div class="vcell"><div class="vn">01</div><h3>See the why</h3>' +
      '<p>Transparent scoring — every match explains exactly which of your priorities it fits.</p></div>' +
      '<div class="vcell"><div class="vn">02</div><h3>20 curated vehicles</h3>' +
      '<p>A hand-picked lineup across SUVs, sedans, trucks, coupes and EVs — no noise.</p></div>' +
      '<div class="vcell"><div class="vn">03</div><h3>60-second match</h3>' +
      '<p>Three questions, one clear result, plus alternates worth a look.</p></div>' +
      '</div>';

    app.innerHTML =
      '<section class="landing' + (animate ? ' anim-rise' : '') + '">' +
      '<div class="frame">' +
      '<span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>' +
      '<span class="meta mtl">MTRPL&mdash;VM // v1.0</span><span class="meta mtr">Rec. 2024</span>' +
      '<div class="hero">' +
      '<div class="lead">' +
      '<div class="kicker"><span class="eyebrow">Interactive vehicle finder</span>' +
      '<span class="kline"></span><span class="kidx">No. 01 &mdash; The match</span></div>' +
      '<h1 tabindex="-1" data-fh>Find your <span class="rev">match.</span></h1>' +
      '<p class="sub">Answer three quick questions about how you drive and what matters — get matched to the right vehicle, with the reasons why.</p>' +
      '<div class="cta-row"><button class="btn primary" id="start">Start &rarr;</button>' +
      '<span class="cta-note">Takes ~60 seconds</span></div>' +
      '</div>' +
      sampleCard +
      '</div>' +
      vstrip +
      '</div></section>';
    document.getElementById('start').addEventListener('click', function () {
      state.screen = 'wizard'; state.step = 0;
      focusIntent = { heading: true };
      announce('Step 1 of ' + STEP_LABELS.length + ': ' + STEP_LABELS[0]);
      render();
    });
    applyFocus();
  }

  function progress() {
    var pct = Math.round(((state.step + 1) / STEP_LABELS.length) * 100);
    return '<div class="prog"><div class="prog-top">' +
      '<span class="prog-step">Step ' + (state.step + 1) + ' / ' + STEP_LABELS.length + '</span>' +
      '<span class="prog-label">' + STEP_LABELS[state.step] + '</span></div>' +
      '<div class="prog-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" ' +
      'aria-valuenow="' + pct + '" aria-label="Wizard progress, step ' + (state.step + 1) +
      ' of ' + STEP_LABELS.length + '">' +
      '<div class="prog-fill" style="width:' + pct + '%"></div></div></div>';
  }

  function renderWizard() {
    var content = [renderTypeStep, renderPriorityStep, renderPrefStep][state.step]();
    var canNext = stepValid();
    app.innerHTML = '<section class="wiz">' + progress() +
      '<div class="q' + (animate ? ' anim-rise' : '') + '">' + content + '</div>' +
      '<div class="wiz-nav">' +
      '<button class="btn ghost" id="back">&larr; Back</button>' +
      '<button class="btn primary" id="next"' + (canNext ? '' : ' disabled') +
      ' aria-disabled="' + (canNext ? 'false' : 'true') + '">' +
      (state.step === STEP_LABELS.length - 1 ? 'See my match &rarr;' : 'Next &rarr;') + '</button>' +
      '</div></section>';
    wireWizard();
    applyFocus();
  }

  function stepValid() {
    if (state.step === 0) return !!state.type;
    if (state.step === 1) return state.priorities.length >= 1;
    return true;
  }

  function renderTypeStep() {
    var tiles = VM.TYPES.map(function (t) {
      var on = state.type === t.key;
      var ico = t.key === 'any' ? '' : '<div class="ico" aria-hidden="true">' + silhouette(t.key) + '</div>';
      return '<button class="tile' + (on ? ' on' : '') + '" data-type="' + t.key + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '">' + ico +
        '<span class="t">' + t.label + '</span></button>';
    }).join('');
    return '<h2 tabindex="-1" data-fh>What are you shopping for?</h2>' +
      '<p class="sub" id="q-help-0">Pick a body type — or keep it open and let your priorities decide.</p>' +
      '<div class="tiles" role="group" aria-labelledby="q-help-0">' + tiles + '</div>';
  }

  function renderPriorityStep() {
    var tiles = VM.PRIORITIES.map(function (p) {
      var idx = state.priorities.indexOf(p.key);
      var on = idx > -1;
      var rank = on ? '<span class="rank" aria-hidden="true">' + (idx + 1) + '</span>' : '';
      var label = on ? p.label + ', priority ' + (idx + 1) + ' of your ' + state.priorities.length
                     : p.label + ', ' + p.blurb;
      return '<button class="tile' + (on ? ' on' : '') + '" data-pri="' + p.key + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + label + '">' + rank +
        '<span class="t">' + p.label + '</span><span class="d">' + p.blurb + '</span></button>';
    }).join('');
    return '<h2 tabindex="-1" data-fh>What matters most?</h2>' +
      '<p class="sub" id="q-help-1">Choose up to three, in order of importance. Your first pick counts the most.</p>' +
      '<div class="tiles" role="group" aria-labelledby="q-help-1">' + tiles + '</div>';
  }

  function seg(label, name, opts, current, fmt) {
    var lid = 'seg-' + name;
    var btns = opts.map(function (o) {
      var on = String(current) === String(o);
      return '<button class="' + (on ? 'on' : '') + '" data-seg="' + name + '" data-val="' + o + '"' +
        ' aria-pressed="' + (on ? 'true' : 'false') + '">' + fmt(o) + '</button>';
    }).join('');
    return '<div class="field"><label id="' + lid + '">' + label + '</label>' +
      '<div class="seg" role="group" aria-labelledby="' + lid + '">' + btns + '</div></div>';
  }

  function renderPrefStep() {
    return '<h2 tabindex="-1" data-fh>Narrow it down</h2>' +
      '<p class="sub">A few hard limits so we only match what actually fits.</p>' +
      seg('Budget', 'priceMax', VM.PREFS.priceMax, state.prefs.priceMax, priceLabel) +
      seg('Seating', 'seats', VM.PREFS.seats, state.prefs.seats, seatLabel) +
      seg('Drivetrain', 'drivetrain', VM.PREFS.drivetrain, state.prefs.drivetrain, dtLabel);
  }

  function announceStep() {
    announce('Step ' + (state.step + 1) + ' of ' + STEP_LABELS.length + ': ' + STEP_LABELS[state.step]);
  }

  function wireWizard() {
    document.getElementById('back').addEventListener('click', function () {
      focusIntent = { heading: true };
      if (state.step === 0) { state.screen = 'landing'; render(); }
      else { state.step--; announceStep(); render(); }
    });
    document.getElementById('next').addEventListener('click', function () {
      if (!stepValid()) return;
      track(['type', 'priorities', 'prefs'][state.step],
        state.step === 0 ? { type: state.type } : state.step === 1 ? { priorities: state.priorities } : state.prefs);
      focusIntent = { heading: true };
      if (state.step === STEP_LABELS.length - 1) { state.screen = 'results'; state.resultsReady = false; render(); }
      else { state.step++; announceStep(); render(); }
    });
    // tile / seg clicks — keep focus on the control so keyboard users don't lose their place
    Array.prototype.forEach.call(app.querySelectorAll('[data-type]'), function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-type');
        state.type = k;
        focusIntent = { sel: '[data-type="' + k + '"]' };
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-pri]'), function (el) {
      el.addEventListener('click', function () {
        var k = el.getAttribute('data-pri'), i = state.priorities.indexOf(k);
        if (i > -1) state.priorities.splice(i, 1);
        else if (state.priorities.length < 3) state.priorities.push(k);
        else announce('You can choose up to three priorities. Deselect one to change it.');
        focusIntent = { sel: '[data-pri="' + k + '"]' };
        render();
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-seg]'), function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-seg'), val = el.getAttribute('data-val');
        state.prefs[name] = (name === 'drivetrain') ? val : parseInt(val, 10);
        focusIntent = { sel: '[data-seg="' + name + '"][data-val="' + val + '"]' };
        render();
      });
    });
  }

  // ============ RESULTS ============
  function renderResults() {
    // Brief, honest loading state before the reveal (skipped for reduced motion).
    if (!state.resultsReady) {
      app.innerHTML = '<section class="wiz"><div class="loading">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<p>Matching your answers&hellip;</p></div></section>';
      announce('Finding your match');
      window.setTimeout(function () { state.resultsReady = true; render(); }, reduceMotion ? 0 : 620);
      return;
    }

    var out = VM.score.match(VM.VEHICLES, {
      type: state.type, priorities: state.priorities,
      priceMax: state.prefs.priceMax, seats: state.prefs.seats, drivetrain: state.prefs.drivetrain
    });
    track('result', { top: out.results[0] && out.results[0].vehicle.id, relaxed: out.relaxed });

    var top = out.results[0], alts = out.results.slice(1);
    if (!top) { app.innerHTML = '<section class="res-head"><h2 tabindex="-1" data-fh>No matches</h2></section>'; return; }

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

    var note = out.relaxed
      ? '<p class="res-note">' + out.note +
        ' <button type="button" class="widen" id="widen">Adjust your filters</button></p>'
      : '';

    app.innerHTML =
      '<section class="res-head' + (animate ? ' anim-rise' : '') + '">' +
      '<div class="eyebrow">Based on your answers</div>' +
      '<h2 tabindex="-1" data-fh>We found your match</h2>' + note + '</section>' +
      '<div' + (animate ? ' class="anim-rise"' : '') + '>' + topHtml + altHtml + '</div>' +
      '<div class="res-foot"><button class="btn ghost" id="restart">Start over</button></div>';

    announce('Your best match: ' + top.score + ' percent, ' + v.name +
      (out.relaxed ? '. ' + out.note : ''));

    document.getElementById('restart').addEventListener('click', function () {
      state = freshState();
      focusIntent = { heading: true };
      render();
    });
    var widen = document.getElementById('widen');
    if (widen) widen.addEventListener('click', function () {
      // Jump back to the preferences step so the shopper can loosen the filters.
      state.screen = 'wizard'; state.step = STEP_LABELS.length - 1; state.resultsReady = false;
      focusIntent = { heading: true };
      announceStep();
      render();
    });
    var q = document.getElementById('quote');
    if (q) q.addEventListener('click', function () {
      openQuote(top.vehicle, alts.map(function (r) { return r.vehicle; }));
    });

    applyFocus();
  }

  // ============ QUOTE FORM (M3 — lead capture) ============
  var modalHost = document.getElementById('vm-modal');
  var lastTrigger = null;   // element focus returns to on close

  function emailValid(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function openQuote(topVehicle, altVehicles) {
    lastTrigger = document.activeElement;
    var picks = [topVehicle].concat(altVehicles || []);
    var opts = picks.map(function (v, i) {
      return '<option value="' + v.name + '"' + (i === 0 ? ' selected' : '') + '>' +
        v.name + (i === 0 ? ' — your best match' : '') + '</option>';
    }).join('') + '<option value="Not sure yet">Not sure yet</option>';

    modalHost.innerHTML =
      '<div class="modal-backdrop" id="qbackdrop">' +
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="qtitle" aria-describedby="qsub">' +
      '<button class="modal-x" id="qclose" type="button" aria-label="Close">&times;</button>' +
      '<div class="modal-head"><div class="ey">Personalized quote</div>' +
      '<h3 id="qtitle">Get your ' + topVehicle.name + ' quote</h3>' +
      '<p id="qsub" class="modal-sub">Tell us where to send it. A specialist follows up with pricing and availability — no obligation.</p></div>' +
      '<form id="qform" novalidate>' +
      field('q-name', 'Full name', '<input id="q-name" name="name" type="text" autocomplete="name" required maxlength="80" placeholder="Jordan Rivera">') +
      field('q-email', 'Email', '<input id="q-email" name="email" type="email" autocomplete="email" inputmode="email" required maxlength="120" placeholder="you@email.com">') +
      field('q-vehicle', 'Vehicle of interest',
        '<div class="select-wrap"><select id="q-vehicle" name="vehicle_interest">' + opts + '</select></div>') +
      '<p class="form-error" id="q-formerror" role="alert" hidden></p>' +
      '<button class="btn primary block" id="qsubmit" type="submit">Request my quote</button>' +
      '<p class="privacy">We only use your details to follow up on this request. No spam, no resale.</p>' +
      '</form></div></div>';

    var backdrop = document.getElementById('qbackdrop');
    var form = document.getElementById('qform');
    var closeBtn = document.getElementById('qclose');

    function close() {
      modalHost.innerHTML = '';
      document.removeEventListener('keydown', onKey);
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') trapTab(e, backdrop);
    }
    document.addEventListener('keydown', onKey);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) close(); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitQuote(form, topVehicle, close);
    });

    // focus the first field
    var first = document.getElementById('q-name');
    if (first) first.focus();
    announce('Quote form opened.');
  }

  function trapTab(e, container) {
    var f = container.querySelectorAll('button, input, select, textarea, a[href]');
    f = Array.prototype.filter.call(f, function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function submitQuote(form, topVehicle, close) {
    var nameEl = form.querySelector('#q-name');
    var emailEl = form.querySelector('#q-email');
    var vehEl = form.querySelector('#q-vehicle');
    var errEl = form.querySelector('#q-formerror');
    var name = nameEl.value.trim(), email = emailEl.value.trim();

    // ---- validation ----
    setFieldError(nameEl, !name ? 'Enter your name.' : '');
    setFieldError(emailEl, !email ? 'Enter your email.' : (!emailValid(email) ? 'Enter a valid email.' : ''));
    var firstBad = form.querySelector('[aria-invalid="true"]');
    if (firstBad) { firstBad.focus(); return; }
    errEl.hidden = true;

    var submitBtn = form.querySelector('#qsubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    VM.db.createLead({
      name: name, email: email,
      vehicle_interest: vehEl ? vehEl.value : topVehicle.name,
      priorities: state.priorities,
      session_id: sessionId
    }).then(function () {
      track('lead', { vehicle: vehEl ? vehEl.value : topVehicle.name });
      showQuoteSuccess(name, vehEl ? vehEl.value : topVehicle.name, close);
    }).catch(function (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request my quote';
      errEl.hidden = false;
      var detail = (err && err.message) ? err.message : 'unknown error';
      errEl.textContent = 'Something went wrong sending your request. Please try again. [' + detail + ']';
      if (window.console) console.warn('lead submit failed', err && err.message);
      errEl.focus();
    });
  }

  function showQuoteSuccess(name, vehicle, close) {
    var dialog = modalHost.querySelector('.modal');
    if (!dialog) return;
    var first = (name.split(' ')[0] || name);
    dialog.innerHTML =
      '<button class="modal-x" id="qclose2" type="button" aria-label="Close">&times;</button>' +
      '<div class="quote-done">' +
      '<div class="check" aria-hidden="true"><svg viewBox="0 0 52 52" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 27l8 8 16-18"/></svg></div>' +
      '<h3 tabindex="-1" data-qdone>Request sent, ' + escapeHtml(first) + '.</h3>' +
      '<p>A specialist will reach out about the <b>' + escapeHtml(vehicle) + '</b>. Watch your inbox.</p>' +
      (VM.db.live ? '' : '<p class="demo-tag">Demo mode — add Supabase keys in <code>supabase.js</code> to store real leads.</p>') +
      '<button class="btn ghost" id="qdoneclose" type="button">Done</button>' +
      '</div>';
    announce('Your quote request was sent. A specialist will follow up.');
    var done = dialog.querySelector('[data-qdone]'); if (done) done.focus();
    dialog.querySelector('#qclose2').addEventListener('click', close);
    dialog.querySelector('#qdoneclose').addEventListener('click', close);
  }

  function field(id, label, control) {
    return '<div class="form-field"><label for="' + id + '">' + label + '</label>' + control +
      '<span class="field-error" id="' + id + '-err" role="alert"></span></div>';
  }
  function setFieldError(el, msg) {
    var err = document.getElementById(el.id + '-err');
    if (msg) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', el.id + '-err');
      if (err) err.textContent = msg; }
    else { el.removeAttribute('aria-invalid'); if (err) err.textContent = ''; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function specCell(k, v) { return '<div class="s"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  function typeName(t) { var x = VM.TYPES.filter(function (y) { return y.key === t; })[0]; return x ? x.label : t; }

  render();
})();
