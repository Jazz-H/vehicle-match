/* Vehicle Match — scoring engine. Pure, deterministic, and transparent:
   match % = weighted average of the shopper's chosen priority scores,
   after hard/soft filters. No black box — every result can explain itself. */
(function () {
  // Ordered priorities get descending weights (top choice matters most).
  var WEIGHTS = [3, 2, 1];

  function drivetrainOk(need, have) {
    if (!need || need === 'any') return true;
    if (need === 'awd') return have === 'awd' || have === '4x4';   // a 4x4 satisfies "AWD"
    return have === need;
  }

  // Apply the Step-1/Step-3 filters. Returns the surviving vehicles.
  function filter(vehicles, sel) {
    return vehicles.filter(function (v) {
      if (sel.type && sel.type !== 'any' && v.type !== sel.type) return false;
      if (sel.priceMax && v.price > sel.priceMax) return false;
      if (sel.seats && v.seats < sel.seats) return false;
      if (!drivetrainOk(sel.drivetrain, v.drivetrain)) return false;
      return true;
    });
  }

  // Weighted match score (0–100) for one vehicle given ordered priorities.
  function scoreVehicle(v, priorities) {
    if (!priorities || !priorities.length) {
      // No priorities picked → average of all six, a neutral all-rounder score.
      var keys = ['budget', 'efficiency', 'performance', 'space', 'technology', 'towing'];
      var s = 0; keys.forEach(function (k) { s += v.scores[k]; });
      return Math.round(s / keys.length);
    }
    var num = 0, den = 0;
    priorities.slice(0, 3).forEach(function (p, i) {
      var w = WEIGHTS[i] || 1;
      num += w * (v.scores[p] || 0);
      den += w;
    });
    return Math.round(num / den);
  }

  // The "why" — the shopper's own priorities this vehicle is strong on.
  function reasons(v, priorities) {
    var picked = (priorities && priorities.length) ? priorities.slice(0, 3)
      : ['budget', 'efficiency', 'space'];
    var strong = picked.filter(function (p) { return (v.scores[p] || 0) >= 70; });
    return strong.length ? strong : picked.slice(0, 2); // always give at least a couple
  }

  // Main entry: returns { results:[{vehicle,score,why[]}], relaxed:bool, note }
  function match(vehicles, sel) {
    var pool = filter(vehicles, sel);
    var relaxed = false, note = '';

    // Graceful fallback: if filters are too tight, relax them in order.
    if (!pool.length && sel.drivetrain && sel.drivetrain !== 'any') {
      pool = filter(vehicles, Object.assign({}, sel, { drivetrain: 'any' }));
      if (pool.length) { relaxed = true; note = 'No exact drivetrain match — widened to all drivetrains.'; }
    }
    if (!pool.length && sel.type && sel.type !== 'any') {
      pool = filter(vehicles, Object.assign({}, sel, { type: 'any', drivetrain: 'any' }));
      if (pool.length) { relaxed = true; note = 'Nothing fit that body type in budget — showing the closest matches instead.'; }
    }
    if (!pool.length) {
      pool = vehicles.slice();
      relaxed = true; note = 'Your filters were strict — here are the best overall matches for your priorities.';
    }

    var ranked = pool.map(function (v) {
      return { vehicle: v, score: scoreVehicle(v, sel.priorities), why: reasons(v, sel.priorities) };
    }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.vehicle.price - b.vehicle.price; // tie-break: cheaper wins
    });

    return { results: ranked.slice(0, 3), relaxed: relaxed, note: note };
  }

  var api = { match: match, scoreVehicle: scoreVehicle, filter: filter, reasons: reasons };
  if (typeof window !== 'undefined') { window.VM = window.VM || {}; window.VM.score = api; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})();
