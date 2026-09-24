import type { AsteroidsGame } from "./game";
import {
  H,
  SHIELD_RADIUS,
  TRIPLE_SPREAD,
  W,
  blinking,
  rand,
  type Asteroid,
  type Bullet,
  type Particle,
  type PowerupType,
  type Powerup,
  type Ship,
} from "./entities";

const POWERUP_COLORS: Record<PowerupType, string> = {
  triple: "#4df",
  shield: "#6f6",
};

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(a.verts[0][0], a.verts[0][1]);
  for (let i = 1; i < a.verts.length; i++) ctx.lineTo(a.verts[i][0], a.verts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPowerup(ctx: CanvasRenderingContext2D, p: Powerup) {
  // Blink during the last seconds before disappearing
  if (p.ttl < 2 && blinking(p.ttl)) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.strokeStyle = POWERUP_COLORS[p.type];
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.stroke();

  if (p.type === "shield") {
    // Inner ring: the silhouette of the shield it grants
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Three fanned strokes: the silhouette of the shot it grants
    for (const offset of [-TRIPLE_SPREAD * 2, 0, TRIPLE_SPREAD * 2]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(offset) * 2, Math.sin(offset) * 2);
      ctx.lineTo(Math.cos(offset) * 7, Math.sin(offset) * 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, ship: Ship) {
  if (ship.dead) return;
  // Blink during respawn invincibility
  if (ship.invincible > 0 && blinking(ship.invincible)) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";

  // Classic silhouette: triangle with a rear notch
  ctx.beginPath();
  ctx.moveTo(20, 0); // nose
  ctx.lineTo(-12, -9); // left wing
  ctx.lineTo(-7, 0); // rear notch
  ctx.lineTo(-12, 9); // right wing
  ctx.closePath();
  ctx.stroke();

  // Thruster flame (visual only, so plain Math.random is fine)
  if (ship.thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-8 - rand(Math.random, 6, 14), 0);
    ctx.lineTo(-8, 4);
    ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
    ctx.stroke();
  }

  // Shield ring, blinking during the last second
  const shieldFadingOut = ship.shield < 1 && blinking(ship.shield);
  if (ship.shield > 0 && !shieldFadingOut) {
    ctx.beginPath();
    ctx.arc(0, 0, SHIELD_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = POWERUP_COLORS.shield;
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = p.ttl / p.life;
  ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
  ctx.stroke();
}

// Remaining time of each active power-up. Score, lives and level live in the vault HUD.
function drawPowerupTimers(ctx: CanvasRenderingContext2D, ship: Ship) {
  ctx.font = "15px monospace";
  ctx.textAlign = "left";
  if (ship.tripleShot > 0) {
    ctx.fillStyle = POWERUP_COLORS.triple;
    ctx.fillText(`TRIPLE ${ship.tripleShot.toFixed(1)}`, 14, 26);
  }
  if (ship.shield > 0) {
    ctx.fillStyle = POWERUP_COLORS.shield;
    ctx.fillText(`ESCUDO ${ship.shield.toFixed(1)}`, 14, 46);
  }
}

export function drawGame(ctx: CanvasRenderingContext2D, game: AsteroidsGame) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  game.particles.forEach((p) => drawParticle(ctx, p));
  game.asteroids.forEach((a) => drawAsteroid(ctx, a));
  game.bullets.forEach((b) => drawBullet(ctx, b));
  game.powerups.forEach((p) => drawPowerup(ctx, p));
  drawShip(ctx, game.ship);
  drawPowerupTimers(ctx, game.ship);
}
