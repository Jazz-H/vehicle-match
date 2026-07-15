/* Vehicle Match — data client (M3).
   The anon key is INSERT-only by design (see schema.sql RLS), so this is a
   tiny fetch wrapper over the Supabase REST API — no SDK, no extra requests,
   no read paths. Until a real project URL + anon key are filled in below,
   the client runs in DEMO mode: analytics is a no-op and lead submissions
   succeed locally so the full form UX is demonstrable without a backend. */
(function () {
  // ---- CONFIG — replace with your Supabase project values ----
  // Settings → API: "Project URL" and the public "anon" key.
  var SUPABASE_URL = 'https://umnuufbbhdfwvbcsnfpe.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtbnV1ZmJiaGRmd3ZiY3NuZnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzM0NTAsImV4cCI6MjA5OTY0OTQ1MH0.dusTuBnTNFoizidiCPx20mhOveHyW-0JU5ZuxMIY97g';
  // ------------------------------------------------------------

  function isPlaceholder(v) {
    return !v || v.indexOf('YOUR-PROJECT') > -1 || v.indexOf('YOUR_SUPABASE') > -1;
  }
  var LIVE = !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);

  // POST a row to a PostgREST table. Resolves on 2xx, rejects otherwise.
  function insert(table, row) {
    return fetch(SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1/' + table, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) {
        throw new Error('Supabase ' + res.status + ': ' + (t || res.statusText));
      });
      return true;
    });
  }

  // Fire-and-forget analytics. Never throws, never blocks the UI.
  function track(sessionId, step, choice) {
    if (!LIVE) { if (window.console && console.debug) console.debug('[vm demo] track', step, choice); return; }
    try {
      insert('vm_events', { session_id: sessionId, step: step, choice: choice })
        .catch(function (e) { if (window.console) console.warn('track failed', e.message); });
    } catch (e) { /* offline / blocked — analytics is best-effort */ }
  }

  // Submit a lead. Resolves true on success; rejects on real failure so the
  // form can show an error state. In demo mode it simulates a brief round-trip.
  function createLead(lead) {
    if (!LIVE) {
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          if (window.console && console.debug) console.debug('[vm demo] lead', lead);
          resolve(true);
        }, 650);
      });
    }
    return insert('vm_leads', lead);
  }

  // ============ Dealer auth + authenticated reads (M4) ============
  // The anon key is insert-only; reads require a logged-in (authenticated)
  // Supabase user, whose access token we send as the Bearer while keeping the
  // anon key as the apikey. Session is cached in localStorage and refreshed.
  var AUTH = SUPABASE_URL.replace(/\/+$/, '') + '/auth/v1';
  var REST = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';
  var SKEY = 'vm.dealer.session';

  function saveSession(d) {
    var s = {
      access_token: d.access_token, refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      email: (d.user && d.user.email) || (d.email) || ''
    };
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; }
  }
  function clearSession() { try { localStorage.removeItem(SKEY); } catch (e) {} }

  function authPost(grant, body) {
    return fetch(AUTH + '/token?grant_type=' + grant, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (j) {
        if (!res.ok) throw new Error(j.error_description || j.msg || j.error || ('Auth ' + res.status));
        return j;
      });
    });
  }

  function signIn(email, password) {
    return authPost('password', { email: email, password: password }).then(saveSession);
  }
  function signOut() {
    var s = readSession();
    clearSession();
    if (s && s.access_token) {
      fetch(AUTH + '/logout', { method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + s.access_token } })
        .catch(function () {});
    }
    return Promise.resolve();
  }
  // Resolve a currently-valid access token, refreshing if it's near expiry.
  function getToken() {
    var s = readSession();
    if (!s || !s.access_token) return Promise.reject(new Error('not signed in'));
    if (s.expires_at - Date.now() > 60000) return Promise.resolve(s.access_token);
    return authPost('refresh_token', { refresh_token: s.refresh_token })
      .then(function (d) { return saveSession(d).access_token; })
      .catch(function (e) { clearSession(); throw new Error('session expired'); });
  }

  // Authenticated GET against a PostgREST path (e.g. "vm_leads?select=*&order=created_at.desc").
  function select(pathAndQuery) {
    return getToken().then(function (token) {
      return fetch(REST + '/' + pathAndQuery, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
      }).then(function (res) {
        return res.text().then(function (t) {
          if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + (t || res.statusText));
          return t ? JSON.parse(t) : [];
        });
      });
    });
  }

  window.VM = window.VM || {};
  window.VM.db = { live: LIVE, insert: insert, track: track, createLead: createLead, select: select };
  window.VM.auth = {
    signIn: signIn, signOut: signOut, getToken: getToken,
    session: readSession, isLive: LIVE
  };
})();
