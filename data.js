/* Vehicle Match — demo dataset + wizard config (curated, ~20 vehicles).
   Per-priority scores are 0–100 and drive the transparent match logic.
   `image` is null for now → the UI falls back to a body-type silhouette;
   real photos can be dropped in later without touching the logic. */
(function () {
  // The six things a shopper can prioritize (Step 2).
  var PRIORITIES = [
    { key: 'budget',      label: 'Budget',          blurb: 'Get the most for the money' },
    { key: 'efficiency',  label: 'Fuel efficiency', blurb: 'Sip fuel or run on electrons' },
    { key: 'performance', label: 'Performance',      blurb: 'Power and driving feel' },
    { key: 'space',       label: 'Space',            blurb: 'People and cargo room' },
    { key: 'technology',  label: 'Technology',       blurb: 'Screens, assists, connectivity' },
    { key: 'towing',      label: 'Towing',           blurb: 'Pull trailers and toys' }
  ];

  // Body types (Step 1). `any` lets the shopper skip the filter.
  var TYPES = [
    { key: 'any',      label: 'No preference' },
    { key: 'suv',      label: 'SUV' },
    { key: 'sedan',    label: 'Sedan' },
    { key: 'truck',    label: 'Truck' },
    { key: 'coupe',    label: 'Coupe' },
    { key: 'electric', label: 'Electric' }
  ];

  // Preference controls (Step 3) — hard/soft filters applied before scoring.
  var PREFS = {
    priceMax: [30000, 40000, 55000, 100000],           // budget ceilings
    seats:    [2, 4, 5, 7],                             // minimum seats needed
    drivetrain: ['any', 'fwd', 'rwd', 'awd', '4x4']     // required drivetrain
  };

  // ---- Curated demo vehicles ----
  // scores: budget efficiency performance space technology towing  (0–100)
  var VEHICLES = [
    // ---------- SUV ----------
    { id: 'rav4',     name: 'Toyota RAV4',            year: 2024, type: 'suv',   price: 29000, spec: '30 mpg', hp: 203, seats: 5, drivetrain: 'awd', tow: 1750,
      blurb: 'The default-safe compact SUV — cheap to run, roomy, endlessly reliable.',
      scores: { budget: 82, efficiency: 78, performance: 45, space: 72, technology: 62, towing: 30 } },
    { id: 'crv',      name: 'Honda CR-V',             year: 2024, type: 'suv',   price: 30500, spec: '30 mpg', hp: 190, seats: 5, drivetrain: 'awd', tow: 1500,
      blurb: 'Comfortable, practical, and quietly excellent at everything a family needs.',
      scores: { budget: 80, efficiency: 77, performance: 44, space: 74, technology: 64, towing: 28 } },
    { id: 'telluride',name: 'Kia Telluride',          year: 2024, type: 'suv',   price: 39000, spec: '23 mpg', hp: 291, seats: 8, drivetrain: 'awd', tow: 5500,
      blurb: 'Three rows, premium feel, big-vehicle value — the family hauler that punches up.',
      scores: { budget: 58, efficiency: 52, performance: 60, space: 95, technology: 82, towing: 66 } },
    { id: 'grandchero',name: 'Jeep Grand Cherokee',   year: 2024, type: 'suv',   price: 42000, spec: '22 mpg', hp: 293, seats: 5, drivetrain: '4x4', tow: 6200,
      blurb: 'Genuine off-road capability with an upscale cabin — trail-ready and tow-ready.',
      scores: { budget: 50, efficiency: 48, performance: 64, space: 76, technology: 78, towing: 74 } },

    // ---------- SEDAN ----------
    { id: 'accord',   name: 'Honda Accord',           year: 2024, type: 'sedan', price: 28500, spec: '32 mpg', hp: 192, seats: 5, drivetrain: 'fwd', tow: 0,
      blurb: 'The benchmark midsize sedan — efficient, spacious for its class, and refined.',
      scores: { budget: 80, efficiency: 82, performance: 50, space: 66, technology: 70, towing: 5 } },
    { id: 'camry',    name: 'Toyota Camry',           year: 2024, type: 'sedan', price: 27500, spec: '32 mpg', hp: 203, seats: 5, drivetrain: 'fwd', tow: 0,
      blurb: 'Dependable, efficient, and hard to wear out — the sensible-money sedan.',
      scores: { budget: 82, efficiency: 83, performance: 52, space: 64, technology: 68, towing: 5 } },
    { id: '3series',  name: 'BMW 3 Series',           year: 2024, type: 'sedan', price: 46000, spec: '28 mpg', hp: 255, seats: 5, drivetrain: 'rwd', tow: 0,
      blurb: 'The driver’s sedan — sharp handling and a premium, tech-forward cabin.',
      scores: { budget: 40, efficiency: 62, performance: 80, space: 60, technology: 90, towing: 5 } },
    { id: 'sonata',   name: 'Hyundai Sonata',         year: 2024, type: 'sedan', price: 27000, spec: '31 mpg', hp: 191, seats: 5, drivetrain: 'fwd', tow: 0,
      blurb: 'Style and features for the price — a value play with a long warranty.',
      scores: { budget: 84, efficiency: 79, performance: 48, space: 63, technology: 74, towing: 5 } },

    // ---------- TRUCK ----------
    { id: 'f150',     name: 'Ford F-150',             year: 2024, type: 'truck', price: 42000, spec: '20 mpg', hp: 400, seats: 6, drivetrain: '4x4', tow: 13000,
      blurb: 'The do-anything full-size — massive towing, huge aftermarket, work-or-play.',
      scores: { budget: 46, efficiency: 38, performance: 74, space: 82, technology: 80, towing: 98 } },
    { id: 'tacoma',   name: 'Toyota Tacoma',          year: 2024, type: 'truck', price: 33000, spec: '21 mpg', hp: 278, seats: 5, drivetrain: '4x4', tow: 6500,
      blurb: 'The mid-size that holds its value — trail-capable and famously durable.',
      scores: { budget: 62, efficiency: 44, performance: 62, space: 66, technology: 66, towing: 72 } },
    { id: 'ram1500',  name: 'Ram 1500',               year: 2024, type: 'truck', price: 43000, spec: '22 mpg', hp: 305, seats: 6, drivetrain: '4x4', tow: 12750,
      blurb: 'The comfort-first full-size — the nicest cabin in the class, still tows big.',
      scores: { budget: 44, efficiency: 42, performance: 70, space: 84, technology: 84, towing: 96 } },
    { id: 'colorado', name: 'Chevrolet Colorado',     year: 2024, type: 'truck', price: 31000, spec: '20 mpg', hp: 310, seats: 5, drivetrain: '4x4', tow: 7700,
      blurb: 'Punchy mid-size with strong towing for its size and a modern cabin.',
      scores: { budget: 64, efficiency: 40, performance: 68, space: 64, technology: 72, towing: 78 } },

    // ---------- COUPE ----------
    { id: 'mustanggt',name: 'Ford Mustang GT',        year: 2024, type: 'coupe', price: 44000, spec: '18 mpg', hp: 480, seats: 4, drivetrain: 'rwd', tow: 0,
      blurb: 'V8 muscle and everyday attitude — the affordable American performance icon.',
      scores: { budget: 48, efficiency: 30, performance: 92, space: 34, technology: 66, towing: 3 } },
    { id: 'gr86',     name: 'Toyota GR86',            year: 2024, type: 'coupe', price: 29000, spec: '25 mpg', hp: 228, seats: 4, drivetrain: 'rwd', tow: 0,
      blurb: 'A lightweight, tail-happy purist — the most fun-per-dollar on the list.',
      scores: { budget: 74, efficiency: 58, performance: 82, space: 30, technology: 50, towing: 3 } },
    { id: 'camaro',   name: 'Chevrolet Camaro',       year: 2024, type: 'coupe', price: 32000, spec: '19 mpg', hp: 335, seats: 4, drivetrain: 'rwd', tow: 0,
      blurb: 'Aggressive looks and strong V6/V8 muscle at a keen price.',
      scores: { budget: 62, efficiency: 34, performance: 85, space: 32, technology: 60, towing: 3 } },
    { id: 'm240i',    name: 'BMW M240i',              year: 2024, type: 'coupe', price: 50000, spec: '26 mpg', hp: 382, seats: 4, drivetrain: 'awd', tow: 0,
      blurb: 'A pocket rocket — huge grip, quick, premium tech in a compact package.',
      scores: { budget: 34, efficiency: 56, performance: 90, space: 38, technology: 88, towing: 3 } },

    // ---------- ELECTRIC ----------
    { id: 'model3',   name: 'Tesla Model 3',          year: 2024, type: 'electric', price: 40000, spec: '272 mi range', hp: 283, seats: 5, drivetrain: 'rwd', tow: 0,
      blurb: 'The default EV — long range, the best charging network, and killer software.',
      scores: { budget: 58, efficiency: 96, performance: 78, space: 60, technology: 98, towing: 5 } },
    { id: 'machE',    name: 'Ford Mustang Mach-E',    year: 2024, type: 'electric', price: 43000, spec: '250 mi range', hp: 266, seats: 5, drivetrain: 'awd', tow: 2000,
      blurb: 'A genuinely fun electric crossover — quick, roomy, and tech-loaded.',
      scores: { budget: 52, efficiency: 92, performance: 76, space: 70, technology: 90, towing: 40 } },
    { id: 'ioniq5',   name: 'Hyundai Ioniq 5',        year: 2024, type: 'electric', price: 42000, spec: '266 mi range', hp: 225, seats: 5, drivetrain: 'awd', tow: 0,
      blurb: 'Retro-futurist design, ultra-fast charging, and a lounge-like interior.',
      scores: { budget: 54, efficiency: 93, performance: 66, space: 72, technology: 88, towing: 8 } },
    { id: 'boltEUV',  name: 'Chevrolet Bolt EUV',     year: 2024, type: 'electric', price: 28000, spec: '247 mi range', hp: 200, seats: 5, drivetrain: 'fwd', tow: 0,
      blurb: 'The value EV — cheapest way into electric with usable everyday range.',
      scores: { budget: 86, efficiency: 90, performance: 55, space: 58, technology: 70, towing: 3 } }
  ];

  window.VM = window.VM || {};
  window.VM.PRIORITIES = PRIORITIES;
  window.VM.TYPES = TYPES;
  window.VM.PREFS = PREFS;
  window.VM.VEHICLES = VEHICLES;
})();
