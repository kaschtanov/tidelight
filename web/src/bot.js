// The autopilot that plays a level: walks to the next platform and jumps when it can land there.
// Used for the automated playtest (tools/playtest.mjs) and for recording the demo (?bot=1). It plays like a careful
// beginner, so it also shows where a level is too hard: every fall is logged with the platform it was going for.
import { AIR_ACCEL, GRAVITY, JUMP, SPEED } from "./player.js";

// How far a platform reaches from its centre in the direction (ux, uz).
function extent(p, ux, uz) {
  if (p.r) return p.r * (p.kind === "cliff" ? 0.95 : 0.85);
  const c = Math.cos(p.rotY ?? 0);
  const s = Math.sin(p.rotY ?? 0);
  const lx = ux * c - uz * s;
  const lz = ux * s + uz * c;
  return Math.min(Math.abs(lx) > 1e-3 ? p.w / 2 / Math.abs(lx) : Infinity, Math.abs(lz) > 1e-3 ? p.d / 2 / Math.abs(lz) : Infinity) * 0.9;
}

// Horizontal distance of a full-speed jump that lands `rise` metres higher.
function jumpReach(rise) {
  const disc = JUMP * JUMP - 2 * GRAVITY * rise;
  if (disc <= 0) return 0;
  return SPEED * ((JUMP + Math.sqrt(disc)) / GRAVITY);
}

export function createBot(T) {
  let idx = 1;
  let lastFalls = 0;
  const log = [];

  function step() {
    const s = T.state;
    if (s.mode !== "play" || s.lit) return;
    const plats = T.platformsNow();
    if (s.falls > lastFalls) {
      lastFalls = s.falls;
      log.push({ fellGoingTo: idx, kind: plats[idx]?.kind });
      const cp = plats.findIndex((p) => p.checkpoint && Math.hypot(p.x - s.x, p.z - s.z) < 1.6);
      idx = Math.max(1, cp + 1);
    }
    if (s.grounded && s.groundIndex >= idx) idx = s.groundIndex + 1;
    const last = idx >= plats.length;
    const tgt = last ? { ...T.goalDoor(), r: 0.8 } : plats[idx];
    const dx = tgt.x - s.x;
    const dz = tgt.z - s.z;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d;
    const uz = dz / d;
    T.bot.right = ux;
    T.bot.forward = -uz;
    if (!s.grounded) {
      // In the air: brake when the speed toward the target would carry past its middle.
      const v = s.vx * ux + s.vz * uz;
      if (v > 0 && (v * v) / (2 * AIR_ACCEL) > d - 0.2) {
        const sp = Math.hypot(s.vx, s.vz) || 1;
        T.bot.right = -s.vx / sp;
        T.bot.forward = s.vz / sp;
      }
      return;
    }
    if (last) return;

    const cur = plats[s.groundIndex];
    const near = d - extent(tgt, -ux, -uz); // to the target's near edge
    // How much of our own platform is still ahead of us in that direction.
    const own = cur ? Math.max(extent(cur, ux, uz) - ((s.x - cur.x) * ux + (s.z - cur.z) * uz), 0) : 0;
    if (near - own < 0.3) return; // touching (the rope bridge): just walk on
    const reach = jumpReach(Math.max((tgt.top ?? s.y) - s.y, 0)) * 0.85;
    // A platform sliding sideways or along: wait at the edge until it comes into reach.
    if (tgt.moving && tgt.move.axis !== "y" && near - 0.3 > reach) {
      if (own < 0.4) T.bot.right = T.bot.forward = 0;
      return;
    }
    // Jump close to the edge, when the near edge is in reach and the landing is not past the far side.
    if (own < 0.35 && near < reach && d - reach < extent(tgt, ux, uz) * 0.8) T.bot.jump = true;
  }

  return { step, log, get index() { return idx; } };
}
