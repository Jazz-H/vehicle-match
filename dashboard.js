/* Vehicle Match — dealer dashboard (M4).
   Gated by Supabase auth (authenticated reads only). Pulls vm_leads +
   vm_events, aggregates client-side, and renders 4 stat tiles, 2 charts
   (priority popularity + step funnel) and a leads table. */
(function () {
  var VM = window.VM;
  var dash = document.getElementById('dash');
  var topRight = document.getElementById('topbar-right');

  var PRI_LABEL = {}, TYPE_LABEL = {};
  (VM.PRIORITIES || []).forEach(function (p) { PRI_LABEL[p.key] = p.label; });
  (VM.TYPES || []).forEach(function (t) { TYPE_LABEL[t.key] = t.label; });
  var STEP_LABEL = { type: 'Chose a type', priorities: 'Set priorities', prefs: 'Set preferences', result: 'Saw a match', lead: 'Requested a quote' };
  var STEP_ORDER = ['type', 'priorities', 'prefs', 'result', 'lead'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function priLabel(k) { return PRI_LABEL[k] || k; }
  function typeLabel(k) { return TYPE_LABEL[k] || k; }

  // ---------------- auth gate ----------------
  function boot() {
    if (!VM.auth || !VM.auth.isLive) return renderConfigNote();
    if (VM.auth.session()) return loadDashboard();
    renderLogin();
  }

  function setTopbar(authed) {
    if (authed) {
      topRight.innerHTML = '<a class="topbar-link" href="./">&larr; Shopper app</a>' +
        '<button class="btn ghost" id="signout" type="button">Sign out</button>';
      var so = document.getElementById('signout');
      if (so) so.addEventListener('click', function () {
        VM.auth.signOut().then(function () { setTopbar(false); renderLogin('Signed out.'); });
      });
    } else {
      topRight.innerHTML = '<a class="topbar-link" href="./">&larr; Shopper app</a>';
    }
  }

  function renderConfigNote() {
    setTopbar(false);
    dash.innerHTML = '<section class="auth"><div class="eyebrow">Dealer dashboard</div>' +
      '<h1>Not configured</h1><p>Add your Supabase project URL and anon key in <code>supabase.js</code> to enable the dealer dashboard.</p></section>';
  }

  function renderLogin(msg) {
    setTopbar(false);
    dash.innerHTML =
      '<section class="auth">' +
      '<div class="eyebrow">Dealer access</div>' +
      '<h1>Dashboard login</h1>' +
      '<p>Sign in to view session, lead and funnel analytics.</p>' +
      '<form id="loginform" novalidate>' +
      '<div class="field"><label for="email">Email</label>' +
      '<input id="email" type="email" autocomplete="username" inputmode="email" required placeholder="dealer@example.com"></div>' +
      '<div class="field"><label for="password">Password</label>' +
      '<input id="password" type="password" autocomplete="current-password" required placeholder="••••••••"></div>' +
      '<p class="err" id="loginerr" role="alert">' + (msg ? esc(msg) : '') + '</p>' +
      '<button class="btn primary block" id="loginbtn" type="submit">Sign in</button>' +
      '<p class="hint">Dealer accounts are created in Supabase → Authentication → Users.</p>' +
      '</form></section>';

    var form = document.getElementById('loginform');
    var err = document.getElementById('loginerr');
    var btn = document.getElementById('loginbtn');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      var pw = document.getElementById('password').value;
      if (!email || !pw) { err.textContent = 'Enter your email and password.'; return; }
      btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
      VM.auth.signIn(email, pw).then(function () {
        loadDashboard();
      }).catch(function (ex) {
        btn.disabled = false; btn.textContent = 'Sign in';
        err.textContent = /invalid/i.test(ex.message) ? 'Invalid email or password.' : ('Sign-in failed: ' + ex.message);
      });
    });
    document.getElementById('email').focus();
  }

  // ---------------- data + render ----------------
  function loadDashboard() {
    setTopbar(true);
    dash.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading analytics…</p></div>';
    Promise.all([
      VM.db.select('vm_leads?select=*&order=created_at.desc&limit=500'),
      VM.db.select('vm_events?select=session_id,step,choice,created_at&limit=10000')
    ]).then(function (res) {
      renderDashboard(res[0] || [], res[1] || []);
    }).catch(function (ex) {
      if (/not signed in|session expired|Supabase 401|Supabase 403/i.test(ex.message)) {
        setTopbar(false);
        renderLogin('Your session expired — please sign in again.');
      } else {
        renderDashboard(null, null, ex.message);
      }
    });
  }

  function aggregate(leads, events) {
    var sessions = {}, typeCount = {}, priCount = {}, stepSessions = {};
    STEP_ORDER.forEach(function (s) { stepSessions[s] = {}; });

    events.forEach(function (e) {
      if (e.session_id) sessions[e.session_id] = 1;
      if (stepSessions[e.step] && e.session_id) stepSessions[e.step][e.session_id] = 1;
      var c = e.choice || {};
      if (e.step === 'type' && c.type) typeCount[c.type] = (typeCount[c.type] || 0) + 1;
      if (e.step === 'priorities' && c.priorities) c.priorities.forEach(function (p) { priCount[p] = (priCount[p] || 0) + 1; });
    });

    var totalSessions = Object.keys(sessions).length;
    var totalLeads = leads.length;
    var topType = null, topTypeN = 0;
    Object.keys(typeCount).forEach(function (k) { if (typeCount[k] > topTypeN) { topTypeN = typeCount[k]; topType = k; } });

    var priBars = Object.keys(priCount).map(function (k) { return { key: k, label: priLabel(k), n: priCount[k] }; })
      .sort(function (a, b) { return b.n - a.n; });
    var funnel = STEP_ORDER.map(function (s) { return { key: s, label: STEP_LABEL[s], n: Object.keys(stepSessions[s]).length }; });

    return {
      totalSessions: totalSessions, totalLeads: totalLeads,
      conversion: totalSessions ? Math.round((totalLeads / totalSessions) * 100) : 0,
      topType: topType, priBars: priBars, funnel: funnel
    };
  }

  function barRows(rows, extraClass) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.n); }, 0) || 1;
    if (!rows.length) return '<p class="empty">No data yet.</p>';
    return '<div class="bars ' + (extraClass || '') + '">' + rows.map(function (r) {
      var pct = Math.round((r.n / max) * 100);
      return '<div class="bar-row" title="' + esc(r.label) + ': ' + r.n + '">' +
        '<span class="lab">' + esc(r.label) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="num">' + r.n + '</span></div>';
    }).join('') + '</div>';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function leadsTable(leads) {
    if (!leads.length) return '<p class="empty">No leads captured yet. Submit a quote in the shopper app to see it here.</p>';
    var rows = leads.map(function (l) {
      var pris = (l.priorities || []).map(function (p) { return '<span class="pri">' + esc(priLabel(p)) + '</span>'; }).join('');
      return '<tr>' +
        '<td class="name">' + esc(l.name) + '</td>' +
        '<td>' + esc(l.email) + '</td>' +
        '<td>' + esc(l.vehicle_interest || '—') + '</td>' +
        '<td>' + (pris || '—') + '</td>' +
        '<td class="when">' + fmtDate(l.created_at) + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table>' +
      '<thead><tr><th>Name</th><th>Email</th><th>Vehicle interest</th><th>Priorities</th><th>When</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  function renderDashboard(leads, events, errMsg) {
    setTopbar(true);
    if (errMsg) {
      dash.innerHTML = dashHead(null) +
        '<div class="banner">Couldn\'t load data: ' + esc(errMsg) + '</div>';
      wireHead(leads, events);
      return;
    }
    var a = aggregate(leads, events);
    dash.innerHTML =
      dashHead(a) +
      '<div class="tiles">' +
      tile('Sessions', String(a.totalSessions), 'Unique shoppers') +
      tile('Leads', String(a.totalLeads), 'Quote requests') +
      tile('Conversion', a.conversion + '%', 'Leads ÷ sessions') +
      tile('Top type', a.topType ? typeLabel(a.topType) : '—', 'Most-chosen body') +
      '</div>' +
      '<div class="charts">' +
      '<section class="card"><h2>Priority popularity</h2><div class="cap">How often each priority is picked</div>' + barRows(a.priBars) + '</section>' +
      '<section class="card"><h2>Session funnel</h2><div class="cap">Unique sessions reaching each step</div>' + barRows(a.funnel, 'funnel') + '</section>' +
      '</div>' +
      '<section class="card leads-card"><h2>Recent leads</h2><div class="cap">' + a.totalLeads + ' total &middot; newest first</div>' + leadsTable(leads) + '</section>';
    wireHead(leads, events);
  }

  function dashHead(a) {
    var s = VM.auth.session();
    return '<div class="dash-head"><div>' +
      '<div class="eyebrow">Vehicle Match &middot; Analytics</div>' +
      '<h1>Dealer dashboard</h1>' +
      '<div class="who">' + (s && s.email ? esc(s.email) : 'Signed in') + '</div>' +
      '</div><div class="actions"><button class="btn ghost" id="refresh" type="button">↻ Refresh</button></div></div>';
  }
  function wireHead() {
    var r = document.getElementById('refresh');
    if (r) r.addEventListener('click', loadDashboard);
  }
  function tile(k, v, s) {
    return '<div class="tile"><div class="k">' + k + '</div><div class="v">' + esc(v) + '</div><div class="s">' + s + '</div></div>';
  }

  boot();
})();
