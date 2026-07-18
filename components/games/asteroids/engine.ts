import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import {
  drawGlowSprite,
  getGlowSprite,
  getInstanceGlowSprite,
} from "@/components/games/glowSprite";

const W = 800;
const H = 600;

// Paleta de Asteroids por skin. Solo tokens que este motor realmente dibuja:
// fondo, nave, llama de propulsión, roca, bala, chispa de explosión, power-up,
// textos de overlay y el shadowBlur del glow (0 = sin glow).
interface AsteroidsPalette {
  bg: string;
  ship: string;
  thrust: string;
  asteroid: string;
  bullet: string;
  particle: string; // "r,g,b" para interpolar alpha en la estela de partículas
  powerup: string;
  overlayTitle: string;
  overlaySub: string;
  glow: number; // shadowBlur; 0 = sin glow
}

const PALETTES: Record<SkinId, AsteroidsPalette> = {
  // clasico preserva EXACTAMENTE los colores originales del motor (vectorial B/N).
  clasico: {
    bg: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    particle: "255,255,255",
    powerup: "#0ff",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    glow: 0,
  },
  // neon: vectores saturados de alto contraste con glow tipo tubo de neón.
  neon: {
    bg: "#03030a",
    ship: "#00f5ff",
    thrust: "rgba(255, 90, 0, 0.9)",
    asteroid: "#c800ff",
    bullet: "#faff00",
    particle: "0,245,255",
    powerup: "#00ff85",
    overlayTitle: "#ff1f5a",
    overlaySub: "rgba(0,245,255,0.75)",
    glow: 10,
  },
  // retro: paleta ámbar/terrosa apagada, estética CRT fósforo, sin glow.
  retro: {
    bg: "#0d0b07",
    ship: "#d8c9a0",
    thrust: "rgba(192, 123, 63, 0.85)",
    asteroid: "#8a8a7a",
    bullet: "#c9a227",
    particle: "201,162,39",
    powerup: "#5a8f8f",
    overlayTitle: "#c9a227",
    overlaySub: "rgba(216,201,160,0.6)",
    glow: 0,
  },
};

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `asteroids:bullet:${palette.bullet}:${palette.glow}`,
        this.radius * 2,
        this.radius * 2,
        palette.glow,
        palette.bullet,
        (sctx) => {
          sctx.fillStyle = palette.bullet;
          sctx.beginPath();
          sctx.arc(0, 0, this.radius, 0, Math.PI * 2);
          sctx.fill();
        },
        true,
      );
      drawGlowSprite(ctx, sprite, this.x, this.y);
    } else {
      ctx.fillStyle = palette.bullet;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    if (palette.glow > 0) {
      const sprite = getInstanceGlowSprite(
        this,
        `${palette.asteroid}:${palette.glow}`,
        this.radius * 2,
        this.radius * 2,
        palette.glow,
        palette.asteroid,
        (sctx) => {
          sctx.strokeStyle = palette.asteroid;
          sctx.lineWidth = 1.5;
          sctx.lineJoin = "round";
          sctx.beginPath();
          sctx.moveTo(this.verts[0][0], this.verts[0][1]);
          for (let i = 1; i < this.verts.length; i++)
            sctx.lineTo(this.verts[i][0], this.verts[i][1]);
          sctx.closePath();
          sctx.stroke();
        },
        true,
      );
      drawGlowSprite(ctx, sprite, 0, 0);
    } else {
      ctx.strokeStyle = palette.asteroid;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(this.verts[0][0], this.verts[0][1]);
      for (let i = 1; i < this.verts.length; i++)
        ctx.lineTo(this.verts[i][0], this.verts[i][1]);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    if (palette.glow > 0) {
      ctx.shadowBlur = palette.glow;
      ctx.shadowColor = palette.powerup;
    }
    ctx.strokeStyle = palette.powerup;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = palette.powerup;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 0;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;

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
    this.dead = false;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys.ArrowLeft) this.angle -= ROT * dt;
    if (keys.ArrowRight) this.angle += ROT * dt;

    this.thrusting = !!keys.ArrowUp;
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
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `asteroids:ship:${palette.ship}:${palette.glow}`,
        32,
        18,
        palette.glow,
        palette.ship,
        (sctx) => {
          sctx.strokeStyle = palette.ship;
          sctx.lineWidth = 1.5;
          sctx.lineJoin = "round";
          sctx.beginPath();
          sctx.moveTo(20, 0);
          sctx.lineTo(-12, -9);
          sctx.lineTo(-7, 0);
          sctx.lineTo(-12, 9);
          sctx.closePath();
          sctx.stroke();
        },
      );
      drawGlowSprite(ctx, sprite, 0, 0);
    } else {
      ctx.strokeStyle = palette.ship;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-12, -9);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-12, 9);
      ctx.closePath();
      ctx.stroke();
    }

    if (this.thrusting && Math.random() > 0.35) {
      if (palette.glow > 0) {
        ctx.shadowBlur = palette.glow;
        ctx.shadowColor = palette.ship;
      }
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = palette.thrust;
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, palette: AsteroidsPalette) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${palette.particle},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  tripleShotRemaining: number; // segundos restantes, 0 si no está activo
  status: "playing" | "dead" | "gameover"; // igual al `state` original del juego
}

export interface AsteroidsGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce initGame(): score=0, lives=3, level=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  setSkin(id: SkinId): void; // cambia la paleta activa en caliente y redibuja
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: AsteroidsState) => void,
  initialSkin: SkinId = DEFAULT_SKIN,
): AsteroidsGame {
  const ctx = canvas.getContext("2d")!;

  let palette: AsteroidsPalette = PALETTES[initialSkin];

  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  function pressed(code: string): boolean {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  }

  const GAME_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
  ]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys[e.code] = false;
  };

  let ship: Ship;
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: "playing" | "dead" | "gameover" = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastEmitted: AsteroidsState | null = null;

  function emitState() {
    const nextState: AsteroidsState = {
      score,
      lives,
      level,
      tripleShotRemaining: ship.tripleShot,
      status: state,
    };
    if (
      lastEmitted &&
      lastEmitted.score === nextState.score &&
      lastEmitted.lives === nextState.lives &&
      lastEmitted.level === nextState.level &&
      lastEmitted.status === nextState.status &&
      lastEmitted.tripleShotRemaining.toFixed(1) ===
        nextState.tripleShotRemaining.toFixed(1)
    ) {
      return;
    }
    lastEmitted = nextState;
    onStateChange(nextState);
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      if (pressed("Space")) initGame();
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      emitState();
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      emitState();
      return;
    }

    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    if (asteroids.length === 0) nextLevel();

    emitState();
  }

  function drawHUD() {
    if (ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.font = "15px monospace";
      ctx.fillStyle = palette.powerup;
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    }
  }

  function drawOverlay(title: string, sub: string) {
    ctx.textAlign = "center";
    ctx.fillStyle = palette.overlayTitle;
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = palette.overlaySub;
    ctx.fillText(sub, W / 2, H / 2 + 22);
  }

  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx, palette));
    asteroids.forEach((a) => a.draw(ctx, palette));
    powerUps.forEach((p) => p.draw(ctx, palette));
    bullets.forEach((b) => b.draw(ctx, palette));
    ship.draw(ctx, palette);

    drawHUD();

    if (state === "gameover")
      drawOverlay(
        "GAME OVER",
        `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`,
      );
  }

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  initGame();

  return {
    start() {
      if (rafId !== null) return;
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      lastTime = null;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
    restart() {
      lastTime = null;
      initGame();
      draw();
      emitState();
    },
    forceGameOver() {
      state = "gameover";
      emitState();
    },
    setSkin(id: SkinId) {
      palette = PALETTES[id];
      draw();
    },
    destroy() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    },
  };
}
