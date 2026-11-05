// The watercolour world: sky, sea, toon materials, and the level built from the Blender models.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();
const cache = new Map();

export function loadModel(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`).then((g) => g.scene));
  return cache.get(name).then((s) => s.clone(true));
}

// Three soft bands of light, like layered washes of paint.
const ramp = (() => {
  const data = new Uint8Array([125, 195, 255]);
  const t = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

// Colours the Blender models carry, repainted to the concept art (refs/key-a.png).
const PALETTE = { rock: "#a09b90", grass: "#a7ab6c", wood: "#8b6c52", white: "#efe6d6", red: "#c9645a", brass: "#c79a55", roof: "#9a5a4c", lamp: "#f2dfae" };

// A toon material with watercolour in it: mottled washes in world space, and a darker wet band at the waterline.
export function toon(color, { wash = 0.22, wet = true } = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vWPos;\n${NOISE}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float w1 = fbm(vWPos.xz * 0.45 + vWPos.y * 0.3);
        float w2 = fbm(vWPos.xz * 1.7 - vWPos.y * 0.9 + 7.0);
        diffuseColor.rgb *= mix(1.0 - ${wash.toFixed(2)}, 1.0 + ${(wash * 0.5).toFixed(2)}, w1) * mix(0.93, 1.05, w2);
        ${wet ? "diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(-0.05, 0.35, vWPos.y));" : ""}`,
      );
  };
  return m;
}

// Swap every material for a toon one in the same colour; materials named in `tint` get a new colour.
export function paint(root, tint = {}) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.material?.name ?? "";
    const color = new THREE.Color(tint[name] ?? PALETTE[name] ?? `#${o.material?.color?.getHexString() ?? "999999"}`);
    const m = toon(color);
    m.name = name;
    o.material = m;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return root;
}

// An ink outline: the same mesh, a touch larger, drawn from the inside in a warm dark brown.
const inkMat = new THREE.MeshBasicMaterial({ color: "#4a3a30", side: THREE.BackSide, transparent: true, opacity: 0.55 });
export function ink(root, width = 0.035) {
  const add = [];
  root.traverse((o) => {
    if (o.isMesh && !o.userData.ink) add.push(o);
  });
  for (const o of add) {
    const hull = new THREE.Mesh(o.geometry, inkMat);
    hull.userData.ink = true;
    hull.scale.setScalar(1 + width);
    hull.castShadow = false;
    o.add(hull);
  }
  return root;
}

var NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
`;

export function makeSky(palette) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(palette.skyTop) },
      horizon: { value: new THREE.Color(palette.skyHorizon) },
      blush: { value: new THREE.Color(palette.skyTop).lerp(new THREE.Color("#f2b8a0"), 0.5) },
      time: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, horizon, blush; uniform float time; varying vec3 vDir;
      ${NOISE}
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(h, 0.6));
        // loose cloud washes drifting slowly
        vec2 uv = vDir.xz / max(vDir.y + 0.25, 0.08) * 0.9 + vec2(time * 0.004, 0.0);
        float cl = smoothstep(0.45, 0.85, fbm(uv * 1.3));
        c = mix(c, blush, cl * 0.55 * smoothstep(0.0, 0.35, h));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat);
}

export function makeSea(palette) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      shallow: { value: new THREE.Color(palette.water) },
      deep: { value: new THREE.Color(palette.waterDeep) },
      fogColor: { value: new THREE.Color(palette.fog) },
      fogNear: { value: palette.fogNear },
      fogFar: { value: palette.fogFar },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorld; varying float vDepth;
      uniform float time;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        w.y += sin(w.x * 0.35 + time * 0.9) * 0.05 + cos(w.z * 0.3 + time * 0.7) * 0.05;
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 shallow, deep, fogColor; uniform float time, fogNear, fogFar;
      varying vec3 vWorld; varying float vDepth;
      ${NOISE}
      void main(){
        vec2 p = vWorld.xz * 0.12;
        float n = fbm(p + vec2(time * 0.03, time * 0.02));
        vec3 c = mix(deep, shallow, smoothstep(0.25, 0.75, n));
        // pale painted ripples
        float rr = fbm(p * 4.0 - vec2(time * 0.05, 0.0));
        float r = smoothstep(0.6, 0.62, rr) - smoothstep(0.63, 0.66, rr);
        c = mix(c, vec3(1.0), r * 0.4);
        float f = smoothstep(fogNear, fogFar, vDepth);
        gl_FragColor = vec4(mix(c, fogColor, f), 0.84);
        #include <colorspace_fragment>
      }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(800, 800, 160, 160), mat);
  sea.rotation.x = -Math.PI / 2;
  sea.receiveShadow = true;
  return sea;
}

// Model geometry, measured in Blender: stones span y -0.6..0.5 at unit radius; cliffs span -2..5 with a top radius of 6.
async function placeStone(p, variant) {
  const m = paint(await loadModel(`stone_${variant % 5}`), { rock: p.bridge ? "#6b5a4a" : undefined });
  const sy = Math.max(1, (p.top + 0.6) / 1.1);
  m.scale.set(p.r, sy, p.r);
  m.position.set(p.x, p.top - 0.5 * sy, p.z);
  m.rotation.y = variant * 1.3;
  return ink(m, 0.02);
}

async function placeCliff(p, variant) {
  const m = paint(await loadModel(`cliff_${variant % 2}`));
  const s = p.r / 6;
  const sy = (p.top + 2) / 7;
  m.scale.set(s, sy, s);
  m.position.set(p.x, p.top - 5 * sy, p.z);
  m.rotation.y = variant * 2.1;
  return ink(m, 0.012);
}

async function placePlank(p) {
  const m = paint(await loadModel("plank"), p.kind === "jetty" ? { wood: "#8a6a4f" } : {});
  // plank.glb is 2.4 × 1.0 × 0.22 (x, z, y after export)
  m.scale.set(p.w / 2.4, p.kind === "jetty" ? 1.4 : 1, p.d / 1.0);
  m.position.set(p.x, p.top - 0.11, p.z);
  m.rotation.y = p.rotY ?? 0;
  if (p.kind === "jetty") {
    const post = new THREE.CylinderGeometry(0.1, 0.12, 2.2, 6);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(post, toon("#6b5240"));
      leg.position.set(dx * 1.1, -0.8, dz * 0.45); // in the plank's own (unscaled) space
      leg.scale.set(1 / m.scale.x, 1 / m.scale.y, 1 / m.scale.z);
      m.add(leg);
    }
  }
  return ink(m, 0.03);
}

function arch(p) {
  const g = new THREE.TorusGeometry(p.span / 2, 2.2, 10, 28, Math.PI);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 0.7) * 0.5 + Math.cos(v.y * 0.9 + v.z) * 0.4;
    pos.setXYZ(i, v.x + n * 0.3, v.y + n * 0.4, v.z + n * 0.3);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, toon("#8c8478"));
  m.position.set(p.x, p.top - p.span / 2, p.z);
  m.castShadow = true;
  return ink(m, 0.01);
}

function ship(p) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 1.8), toon("#3b2f2a"));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), toon("#3b2f2a"));
  mast.position.y = 3.5;
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), new THREE.MeshBasicMaterial({ color: "#c9c3b5", side: THREE.DoubleSide }));
  sail.position.set(0.4, 3.8, 0);
  g.add(hull, mast, sail);
  g.position.set(p.x, 0.4, p.z);
  g.rotation.y = -0.6;
  return g;
}

export async function buildLevel(level, scene) {
  const group = new THREE.Group();
  const moving = [];
  let i = 0;
  for (const p of [...level.platforms, ...level.scenery.map((s) => ({ ...s, scenery: true }))]) {
    let obj;
    if (p.kind === "stone") obj = await placeStone(p, i);
    else if (p.kind === "cliff") obj = await placeCliff(p, i);
    else if (p.kind === "plank" || p.kind === "jetty") obj = await placePlank(p);
    else if (p.kind === "arch") obj = arch(p);
    else if (p.kind === "ship") obj = ship(p);
    if (!obj) continue;
    obj.userData.platform = p;
    obj.userData.base = obj.position.clone();
    if (p.move || p.sink) moving.push(obj);
    group.add(obj);
    i++;
  }

  // The goal: a lighthouse (and the cottage on level 1).
  const g = level.goal;
  const tint = g.tint ? { white: g.tint.band, red: g.tint.stripe } : {};
  const lh = ink(paint(await loadModel(g.kind), tint), 0.015);
  const top = level.platforms.find((p) => p.kind === "cliff" && Math.hypot(p.x - g.x, p.z - g.z) < p.r)?.top ?? 0;
  lh.position.set(g.x, top, g.z);
  group.add(lh);
  let lamp = null;
  lh.traverse((o) => {
    if (o.isMesh && o.material.name === "lamp") lamp = o;
  });
  const lampLight = new THREE.PointLight("#ffd27a", 0, 40, 1.4);
  const lampY = g.kind === "lighthouse_tall" ? 12.65 : 7.65;
  lampLight.position.set(g.x, top + lampY, g.z);
  group.add(lampLight);
  let beam = null;
  if (g.beam) {
    const cone = new THREE.ConeGeometry(4, 60, 24, 1, true);
    cone.translate(0, -30, 0);
    cone.rotateZ(Math.PI / 2);
    beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: "#ffe2a0", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.copy(lampLight.position);
    group.add(beam);
  }
  if (g.cottage) {
    const c = ink(paint(await loadModel("cottage")), 0.02);
    c.position.set(g.cottage.x, top, g.cottage.z);
    c.rotation.y = g.cottage.rotY;
    group.add(c);
  }

  scene.add(group);
  return { group, moving, goal: { ...g, y: top, lamp, lampLight, beam } };
}
