// The three levels as data. The player walks toward -z. Units are metres; the sea is at y = 0.
// Platforms: "stone" (round, r = radius), "cliff" (round island with rock sides), "plank"/"jetty" (box: w across, d along).
// move: { axis: "y" | "x" | "z", amp, period, phase } makes a platform bob or slide (level 2 driftwood, level 3 bridge).
// checkpoint: respawn here after a fall. goal: the lighthouse; reaching its door lights the lamp and ends the level.
//
// Each level is a chain: every step names the gap from the last platform's edge to the next one's edge, a turn, and the
// next platform. That keeps every jump inside what the keeper can do (a flat jump covers about 3.5 m, up to 0.6 m higher).

// How far a platform reaches from its centre along the walking direction.
const along = (p) => p.r ?? p.d / 2;

function chain(first, steps) {
  const out = [first];
  let heading = 0; // degrees; 0 walks toward -z, positive turns right (+x)
  for (const s of steps) {
    const prev = out[out.length - 1];
    heading += s.turn ?? 0;
    const p = { ...s.p };
    const dist = along(prev) + (s.gap ?? 1.4) + along(p);
    const a = (heading * Math.PI) / 180;
    p.x = +(prev.x + Math.sin(a) * dist).toFixed(2);
    p.z = +(prev.z - Math.cos(a) * dist).toFixed(2);
    if (p.kind === "plank" || p.kind === "jetty") p.rotY = p.rotY ?? -a;
    out.push(p);
  }
  return out;
}

const stone = (r, top, extra = {}) => ({ kind: "stone", r, top, ...extra });
const plank = (w, d, top, extra = {}) => ({ kind: "plank", w, d, top, ...extra });
const cliff = (r, top, extra = {}) => ({ kind: "cliff", r, top, ...extra });
const bob = (amp, period, phase) => ({ move: { axis: "y", amp, period, phase } });
const slide = (axis, amp, period, phase) => ({ move: { axis, amp, period, phase } });

// The goal sits on the last platform (a cliff), a little behind its centre.
function goalOn(plats, extra) {
  const c = plats[plats.length - 1];
  return { x: c.x + 1, z: c.z - 2.5, ...extra };
}

const L1 = chain({ kind: "stone", x: 0, z: 0, r: 2.2, top: 0.5, checkpoint: true }, [
  { gap: 1.0, turn: 8, p: stone(1.1, 0.45) },
  { gap: 1.4, turn: 22, p: stone(1.0, 0.45) },
  { gap: 1.5, turn: -40, p: stone(1.2, 0.45) },
  { gap: 1.6, turn: -18, p: stone(1.0, 0.5) },
  { gap: 1.6, turn: 30, p: stone(1.15, 0.45) },
  { gap: 1.3, turn: 6, p: { kind: "jetty", w: 2.2, d: 4.4, top: 0.7, checkpoint: true } },
  { gap: 1.4, turn: 20, p: stone(0.95, 0.5) },
  { gap: 1.8, turn: 10, p: stone(0.9, 0.55) },
  { gap: 1.8, turn: -30, p: stone(1.0, 0.5, { sink: true }) }, // sinks while you stand on it
  { gap: 1.9, turn: -20, p: stone(0.9, 0.6) },
  // A wide flat rock among tide pools: the second checkpoint.
  { gap: 1.6, turn: 15, p: stone(2.4, 0.6, { checkpoint: true }) },
  { gap: 1.4, turn: 35, p: stone(0.8, 0.55) },
  { gap: 1.4, turn: 10, p: stone(0.8, 0.6) },
  { gap: 1.5, turn: -25, p: stone(0.8, 0.55, { sink: true }) },
  { gap: 1.5, turn: -30, p: stone(0.8, 0.6) },
  { gap: 1.5, turn: -15, p: stone(0.85, 0.6) },
  { gap: 1.6, turn: 30, p: stone(1.0, 0.65) },
  // Up toward the island.
  { gap: 1.5, turn: 5, p: stone(1.2, 1.15) },
  { gap: 1.4, turn: -10, p: stone(1.0, 1.7) },
  { gap: 1.0, turn: 5, p: cliff(7.5, 2.3, { checkpoint: true }) },
]);

const L2 = chain({ kind: "cliff", x: 0, z: 2, r: 4, top: 1.0, checkpoint: true }, [
  { gap: 1.2, p: plank(1.3, 2.6, 0.55, bob(0.3, 3.2, 0)) },
  { gap: 1.3, turn: -20, p: plank(1.3, 2.6, 0.5, bob(0.35, 3.2, 1.6)) },
  { gap: 1.4, turn: 15, p: stone(1.0, 0.8) },
  { gap: 1.5, turn: 20, p: plank(1.3, 2.8, 0.8, slide("x", 1.8, 5, 0)) },
  { gap: 1.4, turn: -10, p: stone(1.1, 1.0, { checkpoint: true }) },
  { gap: 1.3, turn: -25, p: plank(1.2, 2.4, 0.9, bob(0.5, 2.6, 0.8)) },
  { gap: 1.3, turn: 20, p: plank(1.2, 2.4, 1.2, bob(0.5, 2.6, 2.1)) },
  { gap: 1.4, turn: 15, p: stone(0.9, 1.3) },
  { gap: 1.4, turn: -5, p: plank(1.2, 2.6, 1.4, slide("z", 1.2, 4.4, 0)) },
  { gap: 1.6, turn: -10, p: stone(1.1, 1.6, { checkpoint: true }) },
  { gap: 1.4, turn: -25, p: plank(1.2, 2.4, 1.7, slide("x", 2.0, 4, 1)) },
  { gap: 1.3, turn: 20, p: stone(0.85, 1.9, { sink: true }) },
  { gap: 1.3, turn: 20, p: plank(1.2, 2.4, 2.0, bob(0.6, 2.4, 0)) },
  { gap: 1.3, turn: -15, p: plank(1.2, 2.4, 2.1, bob(0.6, 2.4, 1.6)) },
  { gap: 1.4, turn: -10, p: stone(1.0, 2.3) },
  { gap: 1.0, turn: 5, p: cliff(6.5, 2.6, { checkpoint: true }) },
]);

// Rope-bridge planks, close enough to walk on; they sway, and the gusts are what make the bridge hard.
const bridge = (n, top, w = 1.5) => Array.from({ length: n }, (_, i) => ({ gap: 0.12, p: plank(w, 1.0, top, { bridge: true, ...bob(0.1, 2.2, i * 0.45) }) }));

const L3 = chain({ kind: "cliff", x: 0, z: 2, r: 4, top: 1.2, checkpoint: true }, [
  { gap: 1.3, turn: 10, p: stone(1.0, 1.0) },
  { gap: 1.5, turn: -25, p: stone(0.9, 1.3) },
  { gap: 1.5, turn: 20, p: stone(0.85, 1.6) },
  { gap: 1.4, turn: -5, p: cliff(3.2, 2.2, { checkpoint: true }) },
  { gap: 0.8, p: plank(1.5, 1.0, 2.25, { bridge: true, ...bob(0.1, 2.2, 0) }) },
  ...bridge(12, 2.25),
  { gap: 0.8, p: cliff(3.0, 2.6, { checkpoint: true }) },
  { gap: 1.4, turn: -30, p: stone(0.85, 2.9) },
  { gap: 1.5, turn: 25, p: stone(0.8, 3.3, { sink: true }) },
  { gap: 1.5, turn: 25, p: stone(0.85, 3.7) },
  { gap: 1.4, turn: -15, p: cliff(2.8, 4.0, { checkpoint: true }) },
  // A second, higher and narrower bridge.
  { gap: 0.8, turn: -10, p: plank(1.4, 1.0, 4.1, { bridge: true, ...bob(0.12, 2.0, 0) }) },
  ...bridge(8, 4.1, 1.4),
  { gap: 1.2, p: stone(0.9, 4.3) },
  { gap: 1.3, turn: 20, p: stone(0.85, 4.6) },
  { gap: 1.0, turn: -10, p: cliff(5.5, 4.9, { checkpoint: true }) },
]);

export const LEVELS = [
  {
    id: 1,
    name: "The Stepping Stones",
    subtitle: "Morning mist over the shallows",
    palette: {
      skyTop: "#e9d9cf", skyHorizon: "#f6e6da", fog: "#efe2d6", fogNear: 14, fogFar: 105,
      water: "#9ad4c8", waterDeep: "#66aca7", waves: 0.05, sun: "#ffe6c8", sunIntensity: 1.7, ambient: "#fff3e6", ambientIntensity: 1.15,
      lantern: 1.2,
    },
    start: { x: 0, z: 0 },
    platforms: L1,
    goal: goalOn(L1, { kind: "lighthouse", cottage: { dx: -4.5, dz: 1.0, rotY: 0.3 } }),
    scenery: [
      { kind: "cliff", x: -30, z: -80, r: 9, top: 9 },
      { kind: "cliff", x: 34, z: -100, r: 11, top: 12 },
      { kind: "cliff", x: -22, z: -25, r: 4, top: 3.5 },
      { kind: "cliff", x: 24, z: -40, r: 5, top: 5 },
      { kind: "cliff", x: -26, z: -55, r: 3.5, top: 2.5 },
      { kind: "stone", x: 9, z: -10, r: 2.2, top: 0.6 },
      { kind: "stone", x: -10, z: -36, r: 1.6, top: 0.4 },
      { kind: "stone", x: 14, z: -58, r: 1.8, top: 0.5 },
      { kind: "stone", x: -12, z: -64, r: 1.2, top: 0.4 },
    ],
  },
  {
    id: 2,
    name: "The Tide Caves",
    subtitle: "Driftwood rides the swell",
    palette: {
      skyTop: "#cfe3dc", skyHorizon: "#eef1e2", fog: "#d6e8e0", fogNear: 14, fogFar: 100,
      water: "#8fd3c3", waterDeep: "#4ea39c", waves: 0.08, sun: "#fff4d6", sunIntensity: 2.0, ambient: "#e8fff6", ambientIntensity: 1.15,
      lantern: 1.4,
    },
    start: { x: 0, z: 0 },
    platforms: L2,
    goal: goalOn(L2, { kind: "lighthouse", tint: { white: "#e9e4d4", red: "#3f8f8a" } }),
    // Rock pillars on both sides of the path make the cave corridor; arches meet over it.
    scenery: [
      ...L2.filter((_, i) => i % 2 === 0).flatMap((p, i) => [
        { kind: "cliff", x: p.x - 12 - (i % 2) * 2, z: p.z, r: 3.0, top: 11 + (i % 3) * 2 },
        { kind: "cliff", x: p.x + 13 + (i % 2) * 2, z: p.z - 3, r: 3.2, top: 10 + (i % 2) * 3 },
      ]),
      ...[4, 9, 13].map((i) => ({ kind: "arch", x: L2[i].x, z: L2[i].z, span: 27, top: 13 })),
    ],
  },
  {
    id: 3,
    name: "The Storm Light",
    subtitle: "Bring the light home",
    palette: {
      skyTop: "#0f1428", skyHorizon: "#262f4d", fog: "#1d2440", fogNear: 10, fogFar: 70,
      water: "#2c4a62", waterDeep: "#142235", waves: 0.32, sun: "#8ea3d6", sunIntensity: 0.55, ambient: "#5a6aa0", ambientIntensity: 0.6,
      lantern: 4.0,
    },
    storm: { rain: true, lightning: true, wind: { every: 7, length: 1.8, force: 2.2 } },
    start: { x: 0, z: 0 },
    platforms: L3,
    goal: goalOn(L3, { kind: "lighthouse_tall", beam: true }),
    scenery: [
      { kind: "cliff", x: -22, z: -40, r: 6, top: 10 },
      { kind: "cliff", x: 24, z: -60, r: 8, top: 14 },
      { kind: "cliff", x: -30, z: -95, r: 10, top: 16 },
      { kind: "cliff", x: 20, z: -20, r: 4, top: 6 },
      { kind: "ship", x: 45, z: -130 },
    ],
  },
];
