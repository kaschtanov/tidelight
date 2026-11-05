import * as THREE from "three";
import { LEVELS } from "./levels.js";
import { Player } from "./player.js";
import { buildLevel, makeSea, makeSky } from "./world.js";
import { createBot } from "./bot.js";

const params = new URLSearchParams(location.search);
const MANUAL = params.has("manual"); // the playtest and the demo recording step the game frame by frame
if (params.has("clean")) document.body.classList.add("clean"); // no HUD text: for thumbnails and trailers
const FRAME_RIGHT = params.has("right"); // the keeper in the right third of the picture
import "./style.css";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 900);

const sun = new THREE.DirectionalLight("#fff", 2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
sun.shadow.bias = -0.0005;
const hemi = new THREE.HemisphereLight("#fff", "#6a8f8c", 1.5);
scene.add(sun, sun.target, hemi);

const player = new Player(scene);
const ui = {
  title: document.querySelector("#title"),
  hud: document.querySelector("#hud"),
  levelName: document.querySelector("#level-name"),
  card: document.querySelector("#card"),
  toast: document.querySelector("#toast"),
  done: document.querySelector("#done"),
  flash: document.querySelector("#flash"),
};

// ---------- input ----------
const keys = new Set();
let jumpQueued = false;
addEventListener("keydown", (e) => {
  if (e.code === "Space" && !e.repeat) jumpQueued = true;
  if (e.code === "Escape" && state.mode === "play") showTitle();
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
});
addEventListener("keyup", (e) => keys.delete(e.code));
let camYaw = 0;
let camPitch = 0.14;
let dragging = false;
canvas.addEventListener("pointerdown", () => (dragging = true));
addEventListener("pointerup", () => (dragging = false));
addEventListener("pointermove", (e) => {
  if (!dragging) return;
  camYaw -= e.movementX * 0.005;
  camPitch = THREE.MathUtils.clamp(camPitch + e.movementY * 0.003, 0.08, 0.9);
});

// The test hook drives the same input the keyboard does (used by the automated playtest and the demo recording).
const bot = { forward: 0, right: 0, jump: false, active: false };
function readInput() {
  if (bot.active) {
    const j = bot.jump;
    bot.jump = false;
    return { forward: bot.forward, right: bot.right, jumpPressed: j };
  }
  const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const r = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  if (keys.has("KeyQ")) camYaw += 0.03;
  if (keys.has("KeyE")) camYaw -= 0.03;
  const j = jumpQueued;
  jumpQueued = false;
  return { forward: f, right: r, jumpPressed: j };
}

// ---------- level state ----------
const state = { mode: "title", levelIndex: 0, level: null, built: null, checkpoint: null, time: 0, falls: 0, lit: false, sky: null, sea: null, rain: null, gulls: [], wind: null, unlocked: 1 };
try {
  state.unlocked = Math.max(1, Number(localStorage.getItem("tidelight.unlocked")) || 1);
} catch {}

function clearLevel() {
  for (const o of [state.built?.group, state.sky, state.sea, state.rain, ...state.gulls]) if (o) scene.remove(o);
  state.gulls = [];
  state.rain = null;
}

async function startLevel(i) {
  clearLevel();
  const level = LEVELS[i];
  state.levelIndex = i;
  state.level = level;
  state.lit = false;
  state.falls = 0;
  fx.done = 0;
  const pal = level.palette;
  scene.fog = new THREE.Fog(pal.fog, pal.fogNear, pal.fogFar);
  renderer.setClearColor(pal.fog);
  state.sky = makeSky(pal);
  state.sea = makeSea(pal);
  scene.add(state.sky, state.sea);
  sun.color.set(pal.sun);
  sun.intensity = pal.sunIntensity;
  hemi.color.set(pal.ambient);
  hemi.intensity = pal.ambientIntensity;
  player.lanternBase = pal.lantern;
  state.built = await buildLevel(level, scene);
  if (level.storm?.rain) state.rain = makeRain();
  if (level.id !== 3) for (let g = 0; g < 6; g++) state.gulls.push(makeGull(g));
  state.gulls.forEach((g) => scene.add(g));
  if (state.rain) scene.add(state.rain);
  const start = level.platforms[0];
  state.checkpoint = { x: level.start.x, y: start.top, z: level.start.z };
  player.place(state.checkpoint.x, state.checkpoint.y, state.checkpoint.z);
  player.facing = Math.PI;
  player.root.rotation.y = Math.PI;
  camYaw = 0;
  state.mode = "play";
  ui.title.hidden = true;
  ui.done.hidden = true;
  ui.hud.hidden = false;
  ui.levelName.textContent = `${level.id} · ${level.name}`;
  document.body.classList.toggle("night", !!level.storm);
  showCard(`Chapter ${level.id}`, level.name, level.subtitle);
}

// Card, fall flash and lightning run on game time (not CSS clocks), so a recording stepped frame by frame shows them right.
const fx = { card: -99, flash: -99, bolt: -99, toast: -99, done: 0, doneHtml: "" };
function showCard(kicker, title, sub) {
  ui.card.innerHTML = `<p class="kicker">${kicker}</p><h2>${title}</h2><p class="sub">${sub}</p>`;
  fx.card = state.time;
}

function drawFx() {
  const t = state.time;
  const c = t - fx.card;
  ui.card.style.opacity = c < 0 || c > 4.2 ? 0 : c < 0.6 ? c / 0.6 : c > 3 ? 1 - (c - 3) / 1.2 : 1;
  ui.card.style.transform = `translate(-50%, ${c < 0.6 ? 8 * (1 - c / 0.6) : 0}px)`;
  const f = t - fx.flash;
  const b = t - fx.bolt;
  const flash = f >= 0 && f < 0.7 ? 0.9 * (1 - f / 0.7) : 0;
  const bolt = b >= 0 && b < 0.5 ? (b < 0.08 ? 0.5 : b < 0.15 ? 0.1 : 0.45 * (1 - (b - 0.15) / 0.35)) : 0;
  ui.flash.style.background = bolt > flash ? "#e8ecff" : "#f3ebdf";
  ui.flash.style.opacity = Math.max(flash, bolt);
  if (fx.done && t >= fx.done) {
    fx.done = 0;
    ui.done.innerHTML = fx.doneHtml;
    ui.done.hidden = false;
    ui.done.querySelector("button").focus();
  }
  const o = t - fx.toast;
  const on = o >= 0 && o < 1.8 ? Math.min(o / 0.25, 1, (1.8 - o) / 0.25) : 0;
  ui.toast.style.opacity = on;
  ui.toast.style.transform = `translate(-50%, ${8 * (1 - on)}px)`;
}

function toast(text) {
  ui.toast.textContent = text;
  fx.toast = state.time;
}

player.onLand = (obj) => {
  const p = obj.userData.platform;
  if (p.checkpoint && (state.checkpoint.x !== p.x || state.checkpoint.z !== p.z)) {
    state.checkpoint = { x: p.x, y: p.top, z: p.z, obj };
    if (p !== state.level.platforms[0]) toast("Checkpoint");
  }
  if (p.sink) obj.userData.sinkT = 0.0001;
};

function respawn() {
  state.falls++;
  const c = state.checkpoint;
  player.place(c.x, c.y + 0.05, c.z);
  fx.flash = state.time;
}

function lightTheLamp() {
  state.lit = true;
  const g = state.built.goal;
  toast("The lamp is lit");
  const next = state.levelIndex + 1;
  state.unlocked = Math.max(state.unlocked, Math.min(next + 1, LEVELS.length));
  try {
    localStorage.setItem("tidelight.unlocked", String(state.unlocked));
  } catch {}
  fx.done = state.time + 3.2; // the end card waits until the lamp has had its moment (drawFx shows it)
  fx.doneHtml = (() => {
    const last = next >= LEVELS.length;
    return last
      ? `<p class="kicker">The coast is lit</p><h2>Thank you, keeper.</h2><p class="sub">All three lamps burn again. Falls: ${state.falls}</p><button data-act="title">Back to the title</button>`
      : `<p class="kicker">Chapter ${state.level.id} complete</p><h2>${state.level.name}</h2><p class="sub">Falls: ${state.falls}</p><button data-act="next">Continue</button>`;
  })();
  g.lit = 0;
}

ui.done.addEventListener("click", (e) => {
  const act = e.target.closest("button")?.dataset.act;
  if (act === "next") startLevel(state.levelIndex + 1);
  if (act === "title") showTitle();
});

// ---------- small living things ----------
function makeGull(i) {
  const g = new THREE.Group();
  const wing = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.9, 0.25, 0), new THREE.Vector3(-0.35, 0, 0), new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0.35, 0, 0), new THREE.Vector3(0.9, 0.25, 0)]);
  const line = new THREE.Line(wing, new THREE.LineBasicMaterial({ color: "#5b5049" }));
  g.add(line);
  g.userData = { r: 10 + i * 4, h: 9 + (i % 3) * 3, speed: 0.12 + (i % 4) * 0.03, off: i * 1.7, cz: -20 - i * 6 };
  return g;
}

function makeRain() {
  const n = 2200;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * 60;
    const y = Math.random() * 30;
    const z = (Math.random() - 0.5) * 60;
    pos.set([x, y, z, x + 0.15, y - 0.9, z], i * 6);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: "#9fb0d0", transparent: true, opacity: 0.45 }));
  rain.frustumCulled = false;
  return rain;
}

// ---------- loop ----------
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(0, 4, 8);
const look = new THREE.Vector3();

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

function tick() {
  frame(Math.min(clock.getDelta(), 1 / 30));
  if (!MANUAL) requestAnimationFrame(tick);
}

function frame(dt) {
  state.time += dt;
  const t = state.time;
  if (state.sky) state.sky.material.uniforms.time.value = t;
  if (state.sea) state.sea.material.uniforms.time.value = t;

  if (state.mode === "play" && state.built) {
    // Platforms that bob, slide or sink.
    for (const obj of state.built.moving) {
      const p = obj.userData.platform;
      const b = obj.userData.base;
      obj.position.copy(b);
      if (p.move) {
        const off = Math.sin((t / p.move.period) * Math.PI * 2 + p.move.phase) * p.move.amp;
        obj.position[p.move.axis] += off;
        if (p.bridge) obj.rotation.z = Math.sin(t * 1.7 + p.move.phase) * 0.06;
      }
      if (p.sink && obj.userData.sinkT) {
        obj.userData.sinkT = Math.min(obj.userData.sinkT + dt, 6);
        const standing = player.ground?.obj === obj;
        if (!standing) obj.userData.sinkT = Math.max(0, obj.userData.sinkT - dt * 3);
        obj.position.y -= Math.min(obj.userData.sinkT * 0.12, 0.5);
      }
    }

    // Wind gusts in the storm.
    let wind = null;
    const w = state.level.storm?.wind;
    if (w) {
      const cyc = t % w.every;
      const on = cyc > w.every - w.length;
      if (on && !state.wind) toast("A gust of wind!");
      state.wind = on;
      if (on) wind = { x: w.force * Math.sin((t / w.every) | 0) >= 0 ? w.force : -w.force, z: 0 };
    }

    if (autopilot) autopilot.step(dt);
    const input = state.lit ? { forward: 0, right: 0, jumpPressed: false } : readInput();
    player.update(dt, input, camYaw, state.built.group.children.filter((o) => o.userData.platform && !o.userData.platform.scenery), wind);

    if (player.root.position.y < -0.6) respawn();

    // Reaching the lighthouse door lights the lamp.
    const g = state.built.goal;
    if (!state.lit && Math.hypot(player.root.position.x - g.x, player.root.position.z - (g.z + 2)) < 2.2 && player.grounded) lightTheLamp();
    if (state.lit) {
      g.lit = Math.min((g.lit ?? 0) + dt * 0.6, 1);
      g.lampLight.intensity = g.lit * 14;
      if (g.lamp) {
        g.lamp.material.emissive = new THREE.Color("#ffcf6a");
        g.lamp.material.emissiveIntensity = g.lit * 1.5;
      }
      if (g.beam) {
        g.beam.material.opacity = g.lit * 0.22;
        g.beam.rotation.y = t * 0.6;
      }
    }

    // Camera: behind and above, easing after the player; drag or Q/E to turn.
    const target = player.root.position;
    const dist = 6.8;
    const want = new THREE.Vector3(target.x + Math.sin(camYaw) * Math.cos(camPitch) * dist, target.y + 1.6 + Math.sin(camPitch) * dist, target.z + Math.cos(camYaw) * Math.cos(camPitch) * dist);
    if (state.lit) {
      // Pull back along the way she came, so the camera stays in the open (the cave walls are to the sides).
      const plats = state.level.platforms;
      const prev = plats[plats.length - 2];
      const back = new THREE.Vector3(prev.x - g.x, 0, prev.z - g.z).normalize();
      want.set(g.x + back.x * 20 + back.z * 4, g.y + 7, g.z + back.z * 20 - back.x * 4);
    }
    if (FRAME_RIGHT) {
      // For the thumbnail: the camera steps left, so the keeper runs in the right third and the title has room on the left.
      const left = new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw)).multiplyScalar(2.6);
      want.add(left);
    }
    camPos.lerp(want, 1 - Math.exp(-dt * (state.lit ? 1.2 : 6)));
    const lookAt = state.lit ? new THREE.Vector3(g.x, g.y + 5, g.z) : new THREE.Vector3(target.x, target.y + 1.9, target.z);
    if (FRAME_RIGHT) lookAt.add(new THREE.Vector3(-Math.cos(camYaw), 0, Math.sin(camYaw)).multiplyScalar(state.lit ? 7 : 3.4));
    look.lerp(lookAt, 1 - Math.exp(-dt * 8));
    camera.position.copy(camPos);
    camera.lookAt(look);

    sun.position.set(target.x + 18, target.y + 30, target.z + 10);
    sun.target.position.copy(target);

    // Gulls circle; rain follows the camera; lightning now and then.
    for (const gull of state.gulls) {
      const u = gull.userData;
      const a = t * u.speed + u.off;
      gull.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.off), u.cz + Math.sin(a) * u.r);
      gull.rotation.y = -a;
      gull.children[0].scale.y = 1 + Math.sin(t * 6 + u.off) * 0.6;
    }
    if (state.rain) {
      state.rain.position.set(camPos.x, camPos.y - 12, camPos.z);
      const arr = state.rain.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] -= dt * 22;
        if (arr[i] < 0) arr[i] += 30;
      }
      state.rain.geometry.attributes.position.needsUpdate = true;
      if (Math.random() < dt * 0.12) {
        hemi.intensity = 3;
        fx.bolt = state.time;
      }
      hemi.intensity += (state.level.palette.ambientIntensity - hemi.intensity) * Math.min(dt * 4, 1);
    }
  } else if (state.mode === "title") {
    camera.position.set(Math.sin(t * 0.05) * 3, 3.2, 10);
    camera.lookAt(0, 2, -20);
  }

  drawFx();
  renderer.render(scene, camera);
}

// ---------- title ----------
function showTitle() {
  state.mode = "title";
  document.body.classList.remove("night");
  ui.title.hidden = false;
  ui.hud.hidden = true;
  ui.done.hidden = true;
  const list = ui.title.querySelector("#chapters");
  list.innerHTML = LEVELS.map((l, i) => `<li><button data-level="${i}" ${i + 1 > state.unlocked ? "disabled" : ""}>${l.id} · ${l.name}</button></li>`).join("");
  ui.title.querySelector("#continue").hidden = state.unlocked <= 1;
}

ui.title.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.id === "new") startLevel(0);
  if (b.id === "continue") startLevel(state.unlocked - 1);
  if (b.dataset.level) startLevel(Number(b.dataset.level));
  if (b.id === "controls") ui.title.querySelector("#help").hidden = !ui.title.querySelector("#help").hidden;
});

let autopilot = null;
await player.loadModel();
showTitle();
requestAnimationFrame(tick);

// For the automated playtest and the demo recording (Claude plays through this hook).
window.__tidelight = {
  LEVELS,
  start: (i) => startLevel(i),
  bot,
  get state() {
    const p = player.root.position;
    return { mode: state.mode, level: state.levelIndex, x: p.x, y: p.y, z: p.z, grounded: player.grounded, lit: state.lit, falls: state.falls, camYaw, groundIndex: window.__tidelight.groundIndex, time: state.time, vx: player.vel.x, vz: player.vel.z };
  },
  setYaw: (y) => (camYaw = y),
  // Where each level platform is right now (moving ones included), in the order of the level data.
  platformsNow: () =>
    state.level.platforms.map((p) => {
      const o = state.built.group.children.find((c) => c.userData.platform === p);
      const b = o.userData.base;
      return { ...p, x: p.x + o.position.x - b.x, z: p.z + o.position.z - b.z, top: p.top + o.position.y - b.y, moving: !!p.move };
    }),
  get groundIndex() {
    return player.ground ? state.level.platforms.indexOf(player.ground.obj.userData.platform) : -1;
  },
  goalDoor: () => ({ x: state.built.goal.x, z: state.built.goal.z + 2, top: state.built.goal.y }),
  botLog: () => autopilot?.log ?? [],
  enableBot() {
    bot.active = true;
    camYaw = 0;
    autopilot = createBot(window.__tidelight);
    return autopilot;
  },
  advance(n = 1, dt = 1 / 30) {
    for (let i = 0; i < n; i++) frame(dt);
  },
};
if (params.has("bot")) {
  await startLevel(Number(params.get("level") ?? 1) - 1);
  window.__tidelight.enableBot();
}
