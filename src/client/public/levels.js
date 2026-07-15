// GraphQuest levels 4-30.
//
// Courses are authored equation-first: each solution defines the flight path,
// stars are sampled from that path, and varied obstacle layouts are built
// safely around it.
(function () {
  "use strict";

  const round = value => Number(value.toFixed(3));

  function buildObstacles(path, index) {
    const clearance = Math.max(0.46, 0.92 - index * 0.016);
    const variant = Math.floor(index / 9);
    const shift = (variant - 1) * 0.22;
    const obstacles = [];

    const bounds = (x0, x1) => {
      let low = Infinity;
      let high = -Infinity;
      for (let x = x0; x <= x1 + 1e-9; x += 0.02) {
        const y = path(x);
        low = Math.min(low, y);
        high = Math.max(high, y);
      }
      return { low, high };
    };
    const add = (x0, y0, x1, y1) => {
      x0 = Math.max(-7.6, round(x0));
      x1 = Math.min(7.6, round(x1));
      y0 = Math.max(-8, round(y0));
      y1 = Math.min(8, round(y1));
      if (x1 - x0 > 0.25 && y1 - y0 > 0.25) obstacles.push({ x0, y0, x1, y1 });
    };
    const below = (x0, x1, height = Infinity, gap = clearance) => {
      const edge = bounds(x0, x1).low - gap;
      add(x0, Number.isFinite(height) ? edge - height : -8, x1, edge);
    };
    const above = (x0, x1, height = Infinity, gap = clearance) => {
      const edge = bounds(x0, x1).high + gap;
      add(x0, edge, x1, Number.isFinite(height) ? edge + height : 8);
    };
    const pair = (x0, x1, gap = clearance) => {
      below(x0, x1, Infinity, gap);
      above(x0, x1, Infinity, gap);
    };

    switch (index % 9) {
      case 0: // Classic alternating slalom.
        below(-6.4 + shift, -5.1 + shift);
        above(-3.2 - shift, -1.7 - shift);
        below(0.2 + shift, 1.65 + shift);
        above(3.8 - shift, 5.45 - shift);
        if (variant > 0) below(6.25, 7.15, 2.2);
        break;
      case 1: // Floating asteroid field, with no edge-to-edge walls.
        above(-6.7, -5.0 + shift, 1.2 + variant * 0.3);
        below(-4.5 - shift, -3.0, 1.8);
        above(-2.1, -0.5 + shift, 1.45);
        below(0.5 - shift, 2.0, 1.2 + variant * 0.35);
        above(2.9, 4.65 - shift, 1.9);
        below(5.3 + shift, 6.9, 1.35);
        break;
      case 2: // Two tight tunnels separated by an open recovery zone.
        pair(-5.9 + shift, -3.9 + shift);
        above(-1.5, 0.45, 1.35);
        below(1.1, 2.7, 1.5);
        pair(4.15 - shift, 6.25 - shift, clearance * 0.9);
        break;
      case 3: // Broad stair-step shelves.
        below(-6.8, -4.15 + shift, 1.1);
        above(-4.0 - shift, -1.55, 1.45);
        below(-1.25, 1.25, 1.8);
        above(1.55, 4.0 + shift, 1.15);
        below(4.25 - shift, 6.8, 1.55);
        break;
      case 4: // Sparse oversized monoliths.
        above(-6.3 + shift, -3.85 + shift);
        below(-1.25 - shift, 1.3 - shift);
        above(3.7 + shift, 6.35 + shift);
        if (variant === 2) below(6.75, 7.35, 1.4);
        break;
      case 5: // Broken corridor with unequal gate widths.
        pair(-6.55, -5.45 + shift);
        pair(-2.9 - shift, -1.05, clearance * 1.08);
        pair(1.25, 2.2 + shift, clearance * 0.92);
        pair(4.35 - shift, 6.65, clearance * 1.04);
        break;
      case 6: // Dense constellation of small floating blocks.
        below(-7.0, -5.75, 1.0);
        above(-5.15, -3.75 + shift, 1.25);
        below(-3.1 - shift, -1.8, 1.45);
        above(-1.0, 0.35, 0.95);
        below(1.0, 2.55 + shift, 1.2);
        above(3.2 - shift, 4.75, 1.55);
        below(5.5, 7.0, 1.05);
        break;
      case 7: // One central tunnel plus asymmetric approach hazards.
        below(-6.6, -5.0 + shift);
        above(-4.05, -2.5, 1.5);
        pair(-0.9 - shift, 1.15 - shift, clearance * 0.88);
        below(2.4, 4.15 + shift, 1.7);
        above(5.0 - shift, 6.9, 1.25);
        break;
      default: // Final mixed gauntlet: walls, shelves, and floating blocks.
        above(-6.8, -5.65 + shift);
        below(-5.05, -3.8, 1.3);
        pair(-2.65 - shift, -1.35 - shift, clearance * 0.9);
        above(-0.1, 1.3 + shift, 1.15);
        below(2.0 - shift, 3.55, 1.55);
        above(4.15, 5.2 + shift);
        below(5.75, 7.0, 1.15);
    }
    return obstacles;
  }

  function buildLevel(spec, index) {
    const at = x => round(spec.path(x));
    const obstacles = buildObstacles(spec.path, index);

    const starXs = [-6, 0, 6];
    return {
      id: "l" + (index + 4),
      name: spec.name,
      teaches: spec.teaches,
      start: { x: -8, y: at(-8) },
      goal: { x: 8, y: at(8) },
      obstacles,
      stars: starXs.map(x => ({ x, y: at(x) })),
      hints: [spec.solution, spec.hint],
      knownSolution: spec.solution,
    };
  }

  const specs = [
    { name: "Vector Lift", teaches: "Start with slope and intercept.", solution: "0.5*x - 1", hint: "a rising line threads the gates", path: x => 0.5*x - 1 },
    { name: "Parabolic Pass", teaches: "A quadratic bends once.", solution: "0.08*x^2 - 0.25*x - 3", hint: "shape a shallow upward parabola", path: x => 0.08*x*x - 0.25*x - 3 },
    { name: "Cubic Crossing", teaches: "Odd powers reverse direction smoothly.", solution: "0.015*x^3 - 0.4*x", hint: "balance a cubic against a line", path: x => 0.015*x*x*x - 0.4*x },
    { name: "Absolute Divide", teaches: "Absolute value creates a sharp turn.", solution: "0.5*abs(x) - 2", hint: "use an absolute-value valley", path: x => 0.5*Math.abs(x) - 2 },
    { name: "Sine Drift", teaches: "Amplitude and frequency shape a wave.", solution: "1.4*sin(0.35*x)", hint: "tune one gentle sine wave", path: x => 1.4*Math.sin(0.35*x) },
    { name: "Cosine Current", teaches: "Add drift to an oscillation.", solution: "2*cos(0.4*x) + 0.15*x", hint: "tilt a cosine with a line", path: x => 2*Math.cos(0.4*x) + 0.15*x },
    { name: "Harmonic Arch", teaches: "Quadratic and sine terms can cooperate.", solution: "0.06*x^2 + 1.2*sin(0.45*x) - 2", hint: "place a ripple on a parabola", path: x => 0.06*x*x + 1.2*Math.sin(0.45*x) - 2 },
    { name: "Polynomial Descent", teaches: "Three polynomial powers control the route.", solution: "0.01*x^3 - 0.06*x^2 - 0.2*x + 1", hint: "combine cubic, square, and line terms", path: x => 0.01*x*x*x - 0.06*x*x - 0.2*x + 1 },
    { name: "Radical Run", teaches: "Square roots rise quickly, then flatten.", solution: "0.6*sqrt(x + 10) - 2 + 0.15*x", hint: "add a small slope to a square root", path: x => 0.6*Math.sqrt(x + 10) - 2 + 0.15*x },
    { name: "Phase Pair", teaches: "Two frequencies create a compound wave.", solution: "1.5*sin(0.55*x) + 0.8*cos(0.25*x)", hint: "superpose a sine and a slower cosine", path: x => 1.5*Math.sin(0.55*x) + 0.8*Math.cos(0.25*x) },
    { name: "Folded Wave", teaches: "A cusp can carry an oscillation.", solution: "0.35*abs(x) - 1.4*cos(0.5*x) - 2", hint: "fold a cosine inside an absolute rise", path: x => 0.35*Math.abs(x) - 1.4*Math.cos(0.5*x) - 2 },
    { name: "Cubic Resonance", teaches: "A wave can correct a polynomial path.", solution: "0.009*x^3 - 0.35*x + 1.2*sin(0.6*x)", hint: "counter a cubic with line and sine terms", path: x => 0.009*x*x*x - 0.35*x + 1.2*Math.sin(0.6*x) },
    { name: "Gravity Well", teaches: "A rational curve rises, turns, and settles.", solution: "5*x/(x^2 + 16)", hint: "divide a line by a quadratic", path: x => 5*x/(x*x + 16) },
    { name: "Counterwave", teaches: "Opposing cosines carve narrow turns.", solution: "1.8*cos(0.4*x) - 1.1*cos(0.8*x) + 0.12*x", hint: "subtract the faster cosine, then add drift", path: x => 1.8*Math.cos(0.4*x) - 1.1*Math.cos(0.8*x) + 0.12*x },
    { name: "Exponential Wake", teaches: "Exponential growth starts quiet and accelerates.", solution: "0.55*exp(0.22*x) - 1.2", hint: "use a controlled exponential rise", path: x => 0.55*Math.exp(0.22*x) - 1.2 },
    { name: "Orbital Cubic", teaches: "Polynomial drift changes a cosine orbit.", solution: "0.006*x^3 - 0.18*x + 1.6*cos(0.55*x)", hint: "mix odd powers with one cosine", path: x => 0.006*x*x*x - 0.18*x + 1.6*Math.cos(0.55*x) },
    { name: "Tangent Vector", teaches: "A restrained tangent produces accelerating bends.", solution: "0.7*tan(0.13*x) + 0.3*sin(0.8*x)", hint: "steady a tangent with a small sine", path: x => 0.7*Math.tan(0.13*x) + 0.3*Math.sin(0.8*x) },
    { name: "Echoed Modulus", teaches: "Folded distance can anchor two waves.", solution: "0.22*abs(x) - 1.6*sin(0.5*x) + 0.7*cos(x) - 1", hint: "combine a cusp with sine and cosine", path: x => 0.22*Math.abs(x) - 1.6*Math.sin(0.5*x) + 0.7*Math.cos(x) - 1 },
    { name: "Logarithmic Pulse", teaches: "Logarithmic growth flattens while a pulse continues.", solution: "1.4*log(x + 10) - 2 + 0.6*sin(0.8*x)", hint: "carry a sine on a logarithmic rise", path: x => 1.4*Math.log(x + 10) - 2 + 0.6*Math.sin(0.8*x) },
    { name: "Polynomial Orbit", teaches: "A full cubic trend can steer a cosine.", solution: "0.004*x^3 - 0.04*x^2 - 0.2*x + 1.5*cos(0.65*x)", hint: "use every polynomial degree plus cosine", path: x => 0.004*x*x*x - 0.04*x*x - 0.2*x + 1.5*Math.cos(0.65*x) },
    { name: "Damped Signal", teaches: "A rational envelope quiets a rapid wave.", solution: "3*sin(0.9*x)/(1 + 0.06*x^2)", hint: "divide a sine by a growing quadratic", path: x => 3*Math.sin(0.9*x)/(1 + 0.06*x*x) },
    { name: "Folded Harmonic", teaches: "Quadratic curvature and a cusp can coexist.", solution: "0.025*x^2 - 0.3*abs(x) + 1.5*sin(0.75*x) + 0.5", hint: "weave a sine through curved folded space", path: x => 0.025*x*x - 0.3*Math.abs(x) + 1.5*Math.sin(0.75*x) + 0.5 },
    { name: "Cubic Interference", teaches: "Four terms shape an asymmetric wave.", solution: "0.005*x^3 - 0.05*x^2 + 1.2*sin(0.55*x) + 0.8*cos(1.05*x)", hint: "merge polynomial drift with two waves", path: x => 0.005*x*x*x - 0.05*x*x + 1.2*Math.sin(0.55*x) + 0.8*Math.cos(1.05*x) },
    { name: "Reciprocal Current", teaches: "A rational current can carry a harmonic ripple.", solution: "4*x/(x^2 + 9) + 0.8*cos(1.1*x)", hint: "add cosine to a reciprocal-shaped turn", path: x => 4*x/(x*x + 9) + 0.8*Math.cos(1.1*x) },
    { name: "Radical Interference", teaches: "Radical, folded, and periodic terms interact.", solution: "0.35*sqrt(x + 10) - 0.18*abs(x) + 1.3*sin(0.7*x) + 0.7*cos(1.2*x)", hint: "balance a radical and cusp against two waves", path: x => 0.35*Math.sqrt(x + 10) - 0.18*Math.abs(x) + 1.3*Math.sin(0.7*x) + 0.7*Math.cos(1.2*x) },
    { name: "Polynomial Chorus", teaches: "A polynomial trend can conduct three waves.", solution: "0.003*x^3 - 0.035*x^2 - 0.12*x + 1.2*sin(0.6*x) + 0.8*cos(1.1*x) + 0.4*sin(1.5*x)", hint: "coordinate three waves with cubic drift", path: x => 0.003*x*x*x - 0.035*x*x - 0.12*x + 1.2*Math.sin(0.6*x) + 0.8*Math.cos(1.1*x) + 0.4*Math.sin(1.5*x) },
    { name: "Final Superposition", teaches: "Master every term in one final corridor.", solution: "0.002*x^3 - 0.025*x^2 + 0.18*x + 1.1*sin(0.45*x) + 0.8*cos(0.9*x) + 0.55*sin(1.35*x) - 0.35*cos(1.7*x)", hint: "superpose four waves on a cubic course", path: x => 0.002*x*x*x - 0.025*x*x + 0.18*x + 1.1*Math.sin(0.45*x) + 0.8*Math.cos(0.9*x) + 0.55*Math.sin(1.35*x) - 0.35*Math.cos(1.7*x) },
  ];

  globalThis.GraphQuestLevels = specs.map(buildLevel);
})();
