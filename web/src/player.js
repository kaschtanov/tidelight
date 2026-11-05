// The keeper: movement, jumping, standing on platforms, falling into the sea, and a hand-made walk (bob, sway, squash).
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ink } from "./world.js";

export const GRAVITY = 24;
export const JUMP = 9.2;
export const SPEED = 5.6;
const ACCEL = 30;
export const AIR_ACCEL = 20;
const RADIUS = 0.3;
const COYOTE = 0.12; // a jump still counts this long after stepping off an edge
const BUFFER = 0.14; // a jump pressed this long before landing still happens

// Where on platform `p` (at its current position) the point (x, z) stands, or null if it is off the platform.
export function topAt(p, obj, x, z) {
  const ox = obj.position.x - (obj.userData.base.x - p.x);
  const oz = obj.position.z - (obj.userData.base.z - p.z);
  const top = p.top + (obj.position.y - obj.userData.base.y);
  if (p.kind === "stone" || p.kind === "cliff") {
    const r = p.kind === "cliff" ? p.r * 0.98 : p.r * 0.9;
    return Math.hypot(x - ox, z - oz) <= r + RADIUS * 0.5 ? top : null;
  }
  // Into the platform's own frame (the mesh is turned by rotY about y).
  const c = Math.cos(p.rotY ?? 0);
  const s = Math.sin(p.rotY ?? 0);
  const dx = x - ox;
  const dz = z - oz;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  return Math.abs(lx) <= p.w / 2 + RADIUS * 0.4 && Math.abs(lz) <= p.d / 2 + RADIUS * 0.4 ? top : null;
}

export class Player {
  constructor(scene) {
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // the model sits in here so the walk can bob and lean it
    this.root.add(this.body);
    scene.add(this.root);
    this.vel = new THREE.Vector3();
    this.grounded = false;
    this.ground = null;
    this.sinceGround = 0;
    this.jumpBuffered = 0;
    this.phase = 0;
    this.squash = 0;
    this.facing = 0;
    this.lantern = new THREE.PointLight("#ffc46b", 1.2, 9, 1.6);
    this.lantern.position.set(0.35, 0.75, 0.1);
    this.lanternBase = 1.2;
    this.root.add(this.lantern);
  }

  async loadModel() {
    try {
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/keeper.glb`);
      const m = gltf.scene;
      const box = new THREE.Box3().setFromObject(m);
      m.scale.setScalar(1.45 / (box.max.y - box.min.y));
      const b2 = new THREE.Box3().setFromObject(m);
      m.position.y -= b2.min.y;
      m.rotation.y = Math.PI; // the rigged keeper faces -z; the game's forward is +z
      this.body.add(m);
      m.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false; // skinned: the bind-pose bounds do not follow the animation
        }
      });
      // Idle when standing, the run when moving; the run's own forward drift is removed (the game moves her).
      this.mixer = new THREE.AnimationMixer(m);
      const clip = (n) => {
        const c = gltf.animations.find((a) => a.name.toLowerCase().includes(n));
        for (const t of c.tracks) {
          if (!t.name.endsWith(".position")) continue;
          const v = t.values;
          for (let i = 0; i < v.length; i += 3) {
            v[i] = v[0];
            v[i + 2] = v[2];
          }
        }
        return c;
      };
      this.idle = this.mixer.clipAction(clip("idle")).play();
      this.run = this.mixer.clipAction(clip("run")).play();
      this.run.setEffectiveWeight(0);
    } catch {
      // No model yet: a simple painted stand-in.
      const coat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.05, 12), new THREE.MeshToonMaterial({ color: "#e0b43c" }));
      coat.position.y = 0.6;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshToonMaterial({ color: "#f0c9a8" }));
      head.position.y = 1.25;
      const hat = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: "#c96a4e" }));
      hat.position.y = 1.29;
      this.body.add(ink(coat, 0.04), head, hat);
    }
  }

  place(x, y, z) {
    this.root.position.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.grounded = true;
    this.ground = null;
  }

  update(dt, input, camYaw, platforms, wind) {
    const pos = this.root.position;
    // Move relative to the camera: forward is away from it.
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const wishX = fx * input.forward + -fz * input.right;
    const wishZ = fz * input.forward + fx * input.right;
    const len = Math.hypot(wishX, wishZ);
    const tx = len > 0 ? (wishX / len) * SPEED : 0;
    const tz = len > 0 ? (wishZ / len) * SPEED : 0;
    const a = (this.grounded ? ACCEL : AIR_ACCEL) * dt;
    this.vel.x += THREE.MathUtils.clamp(tx - this.vel.x, -a, a);
    this.vel.z += THREE.MathUtils.clamp(tz - this.vel.z, -a, a);
    if (wind) {
      this.vel.x += wind.x * dt * (this.grounded ? 0.6 : 1);
      this.vel.z += wind.z * dt * (this.grounded ? 0.6 : 1);
    }
    if (len > 0.1) this.facing = Math.atan2(wishX, wishZ);

    // Jump with a little forgiveness on both sides.
    if (input.jumpPressed) this.jumpBuffered = BUFFER;
    else this.jumpBuffered = Math.max(0, this.jumpBuffered - dt);
    this.sinceGround = this.grounded ? 0 : this.sinceGround + dt;
    if (this.jumpBuffered > 0 && this.sinceGround < COYOTE) {
      this.vel.y = JUMP;
      this.grounded = false;
      this.ground = null;
      this.sinceGround = COYOTE;
      this.jumpBuffered = 0;
      this.squash = -0.12;
      this.onJump?.();
    }

    // Ride a moving platform.
    if (this.grounded && this.ground) {
      const d = this.ground.obj.position.clone().sub(this.ground.last);
      pos.add(d);
    }

    this.vel.y -= GRAVITY * dt;
    const prevY = pos.y;
    pos.x += this.vel.x * dt;
    pos.z += this.vel.z * dt;
    pos.y += this.vel.y * dt;

    // Land on the highest top below the feet that the feet crossed this frame (or are within a small step of).
    let best = null;
    for (const obj of platforms) {
      const p = obj.userData.platform;
      const top = topAt(p, obj, pos.x, pos.z);
      if (top === null) continue;
      if (prevY >= top - 0.35 && pos.y <= top + 0.05 && (!best || top > best.top)) best = { top, obj };
    }
    const wasGrounded = this.grounded;
    if (best && this.vel.y <= 0) {
      pos.y = best.top;
      if (!wasGrounded && this.vel.y < -6) this.squash = 0.14;
      if (!wasGrounded) this.onLand?.(best.obj, this.vel.y);
      this.vel.y = 0;
      this.grounded = true;
      this.ground = { obj: best.obj, last: best.obj.position.clone() };
    } else {
      this.grounded = false;
      this.ground = null;
    }

    // Rock sides: if the feet are well below a top, slide out of it.
    for (const obj of platforms) {
      const p = obj.userData.platform;
      if (p.kind !== "cliff" && p.kind !== "stone") continue;
      const dx = pos.x - p.x;
      const dz = pos.z - p.z;
      const d = Math.hypot(dx, dz);
      const r = (p.kind === "cliff" ? p.r * 1.02 : p.r * 0.95) + RADIUS;
      if (d < r && pos.y < p.top - 0.4 && pos.y > -1) {
        pos.x = p.x + (dx / (d || 1)) * r;
        pos.z = p.z + (dz / (d || 1)) * r;
      }
    }

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const walk = this.grounded ? Math.min(speed / SPEED, 1) : 0;
    this.squash += (0 - this.squash) * Math.min(dt * 10, 1);
    const air = this.grounded ? 0 : THREE.MathUtils.clamp(this.vel.y / JUMP, -1, 1) * 0.06;
    if (this.mixer) {
      // Blend idle into the run with speed; in the air the run slows to a held stride.
      const w = this.grounded ? walk : 0.6;
      this.run.setEffectiveWeight(w);
      this.idle.setEffectiveWeight(1 - w);
      this.run.timeScale = this.grounded ? 0.75 + walk * 0.35 : 0.15;
      this.mixer.update(dt);
    } else {
      // The stand-in has no skeleton: a hand-made bob and sway.
      this.phase += dt * speed * 2.4;
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.07 * walk;
      this.body.rotation.z = Math.sin(this.phase) * 0.07 * walk;
    }
    // Stretch in the air, squash on landing.
    this.body.scale.set(1 + this.squash * 0.6, 1 - this.squash + air, 1 + this.squash * 0.6);
    let dy = this.facing - this.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.root.rotation.y += dy * Math.min(dt * 12, 1);
    this.lantern.intensity = this.lanternBase * (0.92 + Math.sin(performance.now() * 0.013) * 0.04 + Math.sin(performance.now() * 0.031) * 0.04);
    return { speed };
  }
}
