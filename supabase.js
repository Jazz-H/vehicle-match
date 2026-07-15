/* Vehicle Match — data client (M3).
   The anon key is INSERT-only by design (see schema.sql RLS), so this is a
   tiny fetch wrapper over the Supabase REST API — no SDK, no extra requests,
   no read paths. Until a real project URL + anon key are filled in below,
   the client runs in DEMO mode: analytics is a no-op and lead submissions
   succeed locally so the full form UX is demonstrable without a backend. */
(function () {
  // ---- CONFIG — replace with your Supabase project values ----
  // Settings → API: "Project URL" and the public "anon" key.
  var SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
  var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
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

  window.VM = window.VM || {};
  window.VM.db = { live: LIVE, insert: insert, track: track, createLead: createLead };
})();
