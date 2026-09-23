export const W = 800;
export const H = 600;

export type Random = () => number;
export type Point = { x: number; y: number };
export type Input = { left: boolean; right: boolean; thrust: boolean; shoot: boolean };
export type AsteroidSize = 1 | 2 | 3;
export type PowerupType = "triple" | "shield";

export const RADII: Record<AsteroidSize, number> = { 1: 16, 2: 30, 3: 50 };
export const SPEEDS: Record<AsteroidSize, number> = { 1: 85, 2: 55, 3: 32 };
export const POINTS: Record<AsteroidSize, number> = { 1: 100, 2: 50, 3: 20 };

export const POWERUP_DROP = 0.15; // drop chance when an asteroid is destroyed
export const POWERUP_TTL = 8; // seconds the pickup stays on screen
export const TRIPLE_TIME = 5; // triple shot duration
export const TRIPLE_SPREAD = 0.22; // angular spread between bullets (rad)
export const SHIELD_TIME = 6; // shield duration
export const SHIELD_RADIUS = 20; // radius of the protective ring around the ship

export const wrap = (v: number, max: number) => ((v % max) + max) % max;
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (random: Random, min: number, max: number) =>
  min + random() * (max - min);
// Blink phase shared by spawn invincibility, the shield and expiring power-ups
export const blinking = (t: number) => Math.floor(t * 8) % 2 === 0;

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly radius = 2;
  ttl = 1.1;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    const SPEED = 520;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
}

export class Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  readonly size: AsteroidSize;
  readonly radius: number;
  readonly rotSpeed: number;
  readonly verts: [number, number][] = [];
  dead = false;

  constructor(random: Random, x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(random, 0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(random, -15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(random, -1.2, 1.2);
    this.rot = rand(random, 0, Math.PI * 2);

    // Irregular polygon
    const n = Math.floor(rand(random, 8, 14));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(random, 0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(random: Random): Asteroid[] {
    if (this.size <= 1) return [];
    const smaller = (this.size - 1) as AsteroidSize;
    return [
      new Asteroid(random, this.x, this.y, smaller),
      new Asteroid(random, this.x, this.y, smaller),
    ];
  }
}

export class Powerup {
  x: number;
  y: number;
  readonly type: PowerupType;
  readonly vx: number;
  readonly vy: number;
  readonly radius = 11;
  rot = 0;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(random: Random, x: number, y: number, type: PowerupType) {
    this.x = x;
    this.y = y;
    this.type = type;
    const angle = rand(random, 0, Math.PI * 2);
    const speed = rand(random, 20, 50);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += 2 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
}

export class Ship {
  x!: number;
  y!: number;
  vx!: number;
  vy!: number;
  angle!: number;
  thrusting!: boolean;
  invincible!: number;
  shootCooldown!: number;
  tripleShot!: number;
  shield!: number;
  dead!: boolean;
  readonly radius = 12;

  constructor() {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.tripleShot = 0;
    this.shield = 0;
    this.dead = false;
  }

  update(dt: number, input: Input) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    if (this.shield > 0) this.shield -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (input.left) this.angle -= ROT * dt;
    if (input.right) this.angle += ROT * dt;

    this.thrusting = input.thrust;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    const offsets = this.tripleShot > 0 ? [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD] : [0];
    return offsets.map((offset) => new Bullet(ox, oy, this.angle + offset));
  }
}

export class Particle {
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  readonly life: number;
  ttl: number;
  dead = false;

  constructor(random: Random, x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(random, 0, Math.PI * 2);
    const speed = rand(random, 30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(random, 0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
}
