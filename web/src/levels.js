// The three levels as data. The player walks toward -z. Units are metres; the sea is at y = 0.
// Platforms: "stone" (round, r = radius), "cliff" (round island with rock sides), "plank" (box: w × d, rotY), "jetty" (box).
// move: { axis: "y" | "x" | "z", amp, period, phase } makes a platform bob or slide (level 2 driftwood, level 3 bridge).
// checkpoint: respawn here after a fall. goal: the lighthouse; reaching its door lights the lamp and ends the level.

const stone = (x, z, r, top = 0.45, extra = {}) => ({ kind: "stone", x, z, r, top, ...extra });
const plank = (x, z, w, d, top, extra = {}) => ({ kind: "plank", x, z, w, d, top, rotY: 0, ...extra });

export const LEVELS = [
  {
    id: 1,
    name: "The Stepping Stones",
    subtitle: "Morning mist over the shallows",
    palette: {
      skyTop: "#e9d9cf", skyHorizon: "#f6e6da", fog: "#efe2d6", fogNear: 14, fogFar: 105,
      water: "#9ad4c8", waterDeep: "#66aca7", sun: "#ffe6c8", sunIntensity: 1.7, ambient: "#fff3e6", ambientIntensity: 1.15,
      lantern: 1.2,
    },
    start: { x: 0, z: 0 },
    platforms: [
      stone(0, 0, 2.2, 0.5, { checkpoint: true }),
      stone(0.6, -4.2, 1.1),
      stone(2.2, -7.6, 1.0),
      stone(1.0, -11.2, 1.2),
      stone(-1.4, -14.2, 1.0, 0.5),
      stone(-2.0, -18.0, 1.15),
      // A wooden jetty halfway: the first checkpoint.
      plank(-1.0, -22.6, 2.2, 4.4, 0.7, { kind: "jetty", checkpoint: true }),
      stone(1.2, -27.0, 0.95, 0.5),
      stone(3.0, -30.4, 0.9, 0.55),
      stone(2.0, -34.0, 1.0, 0.5, { sink: true }), // sinks a little while you stand on it
      stone(-0.4, -37.2, 0.9, 0.6),
      stone(-0.6, -41.0, 1.2, 1.1),
      stone(0.8, -44.4, 1.0, 1.7),
      { kind: "cliff", x: 1.5, z: -53, r: 7.5, top: 2.3, checkpoint: true },
    ],
    goal: { x: 2.5, z: -56, kind: "lighthouse", cottage: { x: -2.6, z: -55.5, rotY: 0.3 } },
    scenery: [
      { kind: "cliff", x: -26, z: -70, r: 9, top: 9 },
      { kind: "cliff", x: 30, z: -85, r: 11, top: 12 },
      { kind: "cliff", x: -18, z: -20, r: 4, top: 3.5 },
      { kind: "cliff", x: 20, z: -30, r: 5, top: 5 },
      { kind: "stone", x: 9, z: -10, r: 2.2, top: 0.6 },
      { kind: "stone", x: -9, z: -32, r: 1.6, top: 0.4 },
      { kind: "stone", x: 10, z: -46, r: 1.8, top: 0.5 },
    ],
  },
  {
    id: 2,
    name: "The Tide Caves",
    subtitle: "Driftwood rides the swell",
    palette: {
      skyTop: "#cfe3dc", skyHorizon: "#eef1e2", fog: "#d6e8e0", fogNear: 14, fogFar: 100,
      water: "#8fd3c3", waterDeep: "#4ea39c", sun: "#fff4d6", sunIntensity: 2.0, ambient: "#e8fff6", ambientIntensity: 1.15,
      lantern: 1.4,
    },
    start: { x: 0, z: 0 },
    platforms: [
      { kind: "cliff", x: 0, z: 2, r: 4, top: 1.0, checkpoint: true },
      plank(0.5, -4.9, 1.3, 2.6, 0.55, { move: { axis: "y", amp: 0.3, period: 3.2, phase: 0 } }),
      plank(-1.2, -9.2, 1.3, 2.6, 0.45, { rotY: 0.4, move: { axis: "y", amp: 0.35, period: 3.2, phase: 1.6 } }),
      stone(-1.5, -13.2, 1.0, 0.8),
      plank(0.8, -16.8, 1.3, 2.8, 0.8, { move: { axis: "x", amp: 2.2, period: 5, phase: 0 } }),
      stone(1.0, -20.8, 1.1, 1.0, { checkpoint: true }),
      plank(-1.2, -24.4, 1.2, 2.4, 0.9, { move: { axis: "y", amp: 0.5, period: 2.6, phase: 0.8 } }),
      plank(-0.2, -28.0, 1.2, 2.4, 1.2, { rotY: -0.5, move: { axis: "y", amp: 0.5, period: 2.6, phase: 2.1 } }),
      plank(1.6, -31.6, 1.2, 2.6, 1.4, { move: { axis: "z", amp: 1.6, period: 4.4, phase: 0 } }),
      stone(1.4, -35.6, 1.1, 1.6, { checkpoint: true }),
      plank(-0.6, -39.2, 1.2, 2.4, 1.7, { move: { axis: "x", amp: 2.4, period: 4, phase: 1 } }),
      plank(0.4, -43.0, 1.2, 2.4, 2.0, { move: { axis: "y", amp: 0.6, period: 2.4, phase: 0 } }),
      { kind: "cliff", x: 0.5, z: -51, r: 6.5, top: 2.6, checkpoint: true },
    ],
    goal: { x: 1.0, z: -53.5, kind: "lighthouse", tint: { band: "#e9e4d4", stripe: "#3f8f8a" } },
    // Rock pillars on both sides make the cave corridor; two arches meet over it.
    scenery: [
      ...[-4, -12, -20, -28, -36, -44].flatMap((z, i) => [
        { kind: "cliff", x: -9 - (i % 2) * 2, z, r: 3.2, top: 14 + (i % 3) * 2 },
        { kind: "cliff", x: 10 + (i % 2) * 2, z: z - 3, r: 3.4, top: 13 + (i % 2) * 3 },
      ]),
      { kind: "arch", x: 0, z: -18, span: 22, top: 15 },
      { kind: "arch", x: 0, z: -38, span: 24, top: 16 },
    ],
  },
  {
    id: 3,
    name: "The Storm Light",
    subtitle: "Bring the light home",
    palette: {
      skyTop: "#1d2340", skyHorizon: "#3a4466", fog: "#2b3352", fogNear: 12, fogFar: 85,
      water: "#2f4f66", waterDeep: "#1a2b3d", sun: "#9fb3d9", sunIntensity: 0.9, ambient: "#6f7fb0", ambientIntensity: 0.9,
      lantern: 3.2,
    },
    storm: { rain: true, lightning: true, wind: { every: 7, length: 1.8, force: 2.2 } },
    start: { x: 0, z: 0 },
    platforms: [
      { kind: "cliff", x: 0, z: 2, r: 4, top: 1.2, checkpoint: true },
      stone(1.0, -4.6, 1.0, 1.0),
      stone(-0.6, -8.2, 0.9, 1.3),
      stone(0.8, -11.8, 0.85, 1.6),
      { kind: "cliff", x: 0, z: -18, r: 3.2, top: 2.2, checkpoint: true },
      // The rope bridge: narrow planks that sway.
      // The rope bridge: planks close enough to walk on; it sways, and the gusts are what make it hard.
      ...Array.from({ length: 13 }, (_, i) =>
        plank(0, -22.0 - i * 1.15, 1.5, 1.0, 2.25, { bridge: true, move: { axis: "y", amp: 0.1, period: 2.2, phase: i * 0.45 } })),
      { kind: "cliff", x: 0, z: -40.5, r: 3.0, top: 2.6, checkpoint: true },
      stone(-2.2, -45.2, 0.85, 2.9),
      stone(-0.4, -48.8, 0.8, 3.3, { sink: true }),
      stone(1.8, -52.2, 0.85, 3.7),
      { kind: "cliff", x: 0.5, z: -60, r: 5.5, top: 4.3, checkpoint: true },
    ],
    goal: { x: 1.0, z: -61.5, kind: "lighthouse_tall", beam: true },
    scenery: [
      { kind: "cliff", x: -22, z: -40, r: 6, top: 10 },
      { kind: "cliff", x: 24, z: -55, r: 8, top: 14 },
      { kind: "cliff", x: -30, z: -75, r: 10, top: 16 },
      { kind: "ship", x: 40, z: -110 },
    ],
  },
];
