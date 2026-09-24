import {
  Asteroid,
  Bullet,
  H,
  POINTS,
  POWERUP_DROP,
  Particle,
  Powerup,
  SHIELD_RADIUS,
  SHIELD_TIME,
  Ship,
  TRIPLE_TIME,
  W,
  dist,
  rand,
  type Input,
  type PowerupType,
  type Random,
} from "./entities";

export const MAX_DT = 0.05;
export const START_LIVES = 3;

/** Clamp a frame delta so a stalled tab cannot teleport objects. */
export const clampDt = (seconds: number) => Math.min(Math.max(seconds, 0), MAX_DT);

export type GameState = "playing" | "dead" | "gameover";
export type Stats = { score: number; lives: number; level: number };

export class AsteroidsGame {
  ship = new Ship();
  bullets: Bullet[] = [];
  asteroids: Asteroid[] = [];
  particles: Particle[] = [];
  powerups: Powerup[] = [];
  score = 0;
  lives = START_LIVES;
  level = 1;
  state: GameState = "playing";

  private deadTimer = 0;
  private lastPowerupType: PowerupType;
  private readonly random: Random;

  constructor(random: Random = Math.random) {
    this.random = random;
    // Seeded so the first drop of a game varies; later drops strictly alternate.
    this.lastPowerupType = random() < 0.5 ? "triple" : "shield";
    this.spawnAsteroids(4);
  }

  get stats(): Stats {
    return { score: this.score, lives: this.lives, level: this.level };
  }

  // The type alternates on every drop: independent draws produced long runs of one pickup.
  nextPowerupType(): PowerupType {
    this.lastPowerupType = this.lastPowerupType === "shield" ? "triple" : "shield";
    return this.lastPowerupType;
  }

  update(dt: number, input: Input) {
    if (this.state === "gameover") {
      this.tickParticles(dt);
      return;
    }

    if (this.state === "dead") {
      this.updateWhileDead(dt);
      return;
    }

    if (input.shoot) this.bullets.push(...this.ship.tryShoot());

    this.ship.update(dt, input);
    this.bullets.forEach((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));
    this.powerups.forEach((p) => p.update(dt));
    this.tickParticles(dt);
    this.bullets = this.bullets.filter((b) => !b.dead);
    this.powerups = this.powerups.filter((p) => !p.dead);

    const fragments: Asteroid[] = [];
    this.resolveBulletHits(fragments);
    this.resolveShipCollisions(fragments);
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(fragments);

    this.collectPowerups();

    if (this.asteroids.length === 0) this.nextLevel();
  }

  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(this.random, 0, W);
        y = rand(this.random, 0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(this.random, x, y, 3));
    }
  }

  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerups = [];
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private tickParticles(dt: number) {
    this.particles.forEach((p) => p.update(dt));
    this.particles = this.particles.filter((p) => !p.dead);
  }

  private updateWhileDead(dt: number) {
    this.deadTimer -= dt;
    this.tickParticles(dt);
    this.asteroids.forEach((a) => a.update(dt));
    this.powerups.forEach((p) => p.update(dt));
    this.powerups = this.powerups.filter((p) => !p.dead);
    if (this.deadTimer <= 0) {
      this.state = "playing";
      this.ship.reset();
    }
  }

  private explode(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(this.random, x, y));
  }

  // Scores, explodes and splits an asteroid. Shared by the bullet and the shield,
  // which differ only in whether they roll for a power-up drop.
  private destroyAsteroid(asteroid: Asteroid, fragments: Asteroid[]) {
    asteroid.dead = true;
    this.score += POINTS[asteroid.size];
    this.explode(asteroid.x, asteroid.y, asteroid.size * 5);
    fragments.push(...asteroid.split(this.random));
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.state = "gameover";
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  private resolveBulletHits(fragments: Asteroid[]) {
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          this.destroyAsteroid(a, fragments);
          if (this.random() < POWERUP_DROP) {
            this.powerups.push(
              new Powerup(this.random, a.x, a.y, this.nextPowerupType()),
            );
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  // Ship vs asteroid: the shield destroys it, otherwise contact is lethal.
  private resolveShipCollisions(fragments: Asteroid[]) {
    if (this.ship.shield > 0) {
      for (const a of this.asteroids) {
        if (!a.dead && dist(this.ship, a) < SHIELD_RADIUS + a.radius * 0.82) {
          this.destroyAsteroid(a, fragments);
        }
      }
    } else if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (!a.dead && dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }
  }

  // Picked up even during spawn invincibility; a repeat pickup resets its timer.
  private collectPowerups() {
    if (this.ship.dead) return;
    for (const p of this.powerups) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        if (p.type === "shield") this.ship.shield = SHIELD_TIME;
        else this.ship.tripleShot = TRIPLE_TIME;
      }
    }
    this.powerups = this.powerups.filter((p) => !p.dead);
  }
}
