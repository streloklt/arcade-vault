import type { GameState } from "@/components/games/registry";
import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import { drawGlowSprite, getGlowSprite } from "@/components/games/glowSprite";

const CANVAS_W = 800;

// Paleta de Arkanoid por skin. Solo tokens que este motor realmente dibuja:
// fondo, colores de bloque por nombre (las mismas claves que BLOCK_SPRITES),
// paleta, pelota y el shadowBlur del glow.
//
// El skin `clasico` conserva el spritesheet original (`sprites: true`): render
// idéntico al look previo, sin regresión. `neon`/`retro` ignoran el spritesheet
// y dibujan primitivas de canvas (rects/círculos) con estos colores, de modo que
// la estética la define enteramente la paleta.
interface ArkanoidPalette {
  bg: string;
  sprites: boolean; // true = usa spritesheet original (solo clasico)
  blocks: Record<string, string>; // nombre-de-color -> relleno (neon/retro)
  paddle: string;
  ball: string;
  glow: number; // shadowBlur; 0 = sin glow
}

const PALETTES: Record<SkinId, ArkanoidPalette> = {
  // clasico: spritesheet original intacto; los colores de bloque solo sirven de
  // fallback si el sprite faltara (no se usan mientras sprites=true).
  clasico: {
    bg: "#000",
    sprites: true,
    blocks: {
      red: "#e5533b",
      yellow: "#e5c33b",
      cyan: "#3bc9e5",
      magenta: "#c83be5",
      hotpink: "#e53b9c",
      green: "#3be55a",
      gray: "#9aa0a6",
    },
    paddle: "#d0d4d8",
    ball: "#ffffff",
    glow: 0,
  },
  // neon: bloques saturados de alto contraste con glow tipo tubo de neón.
  neon: {
    bg: "#03030a",
    sprites: false,
    blocks: {
      red: "#ff1f5a",
      yellow: "#faff00",
      cyan: "#00f5ff",
      magenta: "#c800ff",
      hotpink: "#ff5ec4",
      green: "#00ff85",
      gray: "#8ab4ff",
    },
    paddle: "#00f5ff",
    ball: "#faff00",
    glow: 12,
  },
  // retro: paleta apagada/terrosa, estética CRT 8-bit, sin glow.
  retro: {
    bg: "#0d0b07",
    sprites: false,
    blocks: {
      red: "#a6533b",
      yellow: "#c9a227",
      cyan: "#5a8f8f",
      magenta: "#8a6a8f",
      hotpink: "#b0748c",
      green: "#6a8f5a",
      gray: "#8a8a7a",
    },
    paddle: "#d8c9a0",
    ball: "#e6dcc0",
    glow: 0,
  },
};

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

const SPRITESHEET_SRC = "/games/arkanoid/spritesheet-breakout.png";
const BOUNCE_SOUND_SRC = "/games/arkanoid/sounds/ball-bounce.mp3";
const BREAK_SOUND_SRC = "/games/arkanoid/sounds/break-sound.mp3";

interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const EXPLOSION_FRAMES: Record<string, SpriteFrame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

const SPRITES: { paddle: SpriteFrame; ball: SpriteFrame } = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
};

const BLOCK_SPRITES: Record<string, SpriteFrame> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

interface LevelBlockDef {
  col: number;
  row: number;
  color: string;
}

interface LevelDef {
  speed: number;
  blocks: LevelBlockDef[];
}

const LEVELS: LevelDef[] = (() => {
  const rowColors1 = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlockDef[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlockDef[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({
          col,
          row,
          color: isCross && !isFrame ? "hotpink" : "cyan",
        });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface GameBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}

export interface ArkanoidGame {
  start(): void; // arranca el requestAnimationFrame loop (espera a que el spritesheet cargue)
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce initPaddle()+loadLevel(1): score=0, lives=3, nivel=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  setSkin(id: SkinId): void; // cambia la paleta activa en caliente y redibuja
  destroy(): void; // limpia listeners de teclado/mouse y cancela el loop (unmount)
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
  initialSkin: SkinId = DEFAULT_SKIN,
): ArkanoidGame {
  const ctx = canvas.getContext("2d")!;

  let palette: ArkanoidPalette = PALETTES[initialSkin];

  const bounceSound = new Audio(BOUNCE_SOUND_SRC);
  const breakSound = new Audio(BREAK_SOUND_SRC);

  const playSound = (sound: HTMLAudioElement) => {
    (sound.cloneNode() as HTMLAudioElement).play().catch(() => {});
  };

  let ssImg: HTMLCanvasElement | null = null;
  let ssLoaded = false;
  let ssLoadStarted = false;
  const ssCallbacks: (() => void)[] = [];

  function loadSpritesheet(cb: () => void) {
    if (ssLoaded) {
      cb();
      return;
    }
    ssCallbacks.push(cb);
    if (ssLoadStarted) return;
    ssLoadStarted = true;

    const rawImg = new Image();
    rawImg.onload = () => {
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d")!;
      octx.drawImage(rawImg, 0, 0);
      ssImg = oc;
      ssLoaded = true;
      ssCallbacks.forEach((f) => f());
      ssCallbacks.length = 0;
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = SPRITESHEET_SRC;
  }

  function drawFrame(
    frame: SpriteFrame,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!ssLoaded || !ssImg) return;
    ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  }

  function drawSprite(
    sprite: SpriteFrame | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    if (!ssLoaded || !ssImg || !sprite) return;
    ctx.drawImage(
      ssImg,
      sprite.sx,
      sprite.sy,
      sprite.sw,
      sprite.sh,
      x,
      y,
      w,
      h,
    );
  }

  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  let blocks: GameBlock[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let gameState: "playing" | "gameover" = "playing";
  let currentLevel = 1;

  const keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let startPending = false;

  function initPaddle() {
    paddle.x = (canvas.width - paddle.w) / 2;
  }

  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * level.speed;
    ball.vy = BASE_BALL_VY * level.speed;
  }

  function collideAABB(block: GameBlock): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function notifyState() {
    onStateChange({
      score,
      lives,
      level: currentLevel,
      status: gameState === "gameover" ? "gameover" : "playing",
      extraStats: [{ label: "Nivel", value: `${currentLevel}/5` }],
    });
  }

  function update(dt: number) {
    if (gameState !== "playing") return;

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight)
      paddle.x = Math.min(
        canvas.width - paddle.w,
        paddle.x + PADDLE_SPEED * dt,
      );

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.x + ball.w >= canvas.width) {
      ball.x = canvas.width - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playSound(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playSound(bounceSound);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playSound(bounceSound);
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        ball.vy = -ball.vy;
        playSound(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else gameState = "gameover";
        }
        break;
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > canvas.height) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        gameState = "gameover";
      } else {
        initBall();
      }
    }

    notifyState();
  }

  // Bloque como primitiva de canvas (neon/retro): relleno + borde interior claro
  // para dar sensación de bisel, con glow opcional.
  function drawBlockRect(block: GameBlock) {
    const fill = palette.blocks[block.color] ?? palette.blocks.gray;
    const bx = block.x + 1;
    const by = block.y + 1;
    const bw = block.w - 2;
    const bh = block.h - 2;
    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `arkanoid:block:${fill}:${palette.glow}`,
        bw,
        bh,
        palette.glow,
        fill,
        (sctx) => {
          sctx.fillStyle = fill;
          sctx.fillRect(0, 0, bw, bh);
        },
      );
      drawGlowSprite(ctx, sprite, bx, by);
    } else {
      ctx.fillStyle = fill;
      ctx.fillRect(bx, by, bw, bh);
    }
  }

  // Flash de destrucción cuando no hay spritesheet: rect del color del bloque que
  // se expande y se desvanece según `elapsed`.
  function drawExplosionRect(exp: Explosion) {
    const t = exp.elapsed / EXPLOSION_DURATION; // 0..1
    const alpha = Math.max(0, 1 - t);
    const grow = t * 6;
    const fill = palette.blocks[exp.color] ?? palette.blocks.gray;
    const destX = exp.x - grow;
    const destY = exp.y - grow;
    const destW = exp.w + grow * 2;
    const destH = exp.h + grow * 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (palette.glow > 0) {
      // Sprite pre-renderizado al tamaño base del bloque, bliteado escalado al
      // tamaño creciente de la explosión: evita volver a setear
      // shadowBlur/shadowColor por frame sin re-renderizar el offscreen canvas.
      const sprite = getGlowSprite(
        `arkanoid:explosion:${fill}:${palette.glow}`,
        exp.w,
        exp.h,
        palette.glow,
        fill,
        (sctx) => {
          sctx.fillStyle = fill;
          sctx.fillRect(0, 0, exp.w, exp.h);
        },
      );
      const scaleX = destW / exp.w;
      const scaleY = destH / exp.h;
      ctx.drawImage(
        sprite.canvas,
        destX - sprite.offsetX * scaleX,
        destY - sprite.offsetY * scaleY,
        sprite.width * scaleX,
        sprite.height * scaleY,
      );
    } else {
      ctx.fillStyle = fill;
      ctx.fillRect(destX, destY, destW, destH);
    }
    ctx.restore();
  }

  function drawPaddleRect() {
    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `arkanoid:paddle:${palette.paddle}:${palette.glow}`,
        paddle.w,
        paddle.h,
        palette.glow,
        palette.paddle,
        (sctx) => {
          sctx.fillStyle = palette.paddle;
          sctx.fillRect(0, 0, paddle.w, paddle.h);
        },
      );
      drawGlowSprite(ctx, sprite, paddle.x, paddle.y);
    } else {
      ctx.fillStyle = palette.paddle;
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
  }

  function drawBallCircle() {
    const cx = ball.x + ball.w / 2;
    const cy = ball.y + ball.h / 2;
    const r = ball.w / 2;
    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `arkanoid:ball:${palette.ball}:${palette.glow}`,
        r * 2,
        r * 2,
        palette.glow,
        palette.ball,
        (sctx) => {
          sctx.fillStyle = palette.ball;
          sctx.beginPath();
          sctx.arc(0, 0, r, 0, Math.PI * 2);
          sctx.fill();
        },
        true,
      );
      drawGlowSprite(ctx, sprite, cx, cy);
    } else {
      ctx.fillStyle = palette.ball;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const block of blocks) {
      if (!block.alive) continue;
      if (palette.sprites)
        drawSprite(
          BLOCK_SPRITES[block.color],
          block.x,
          block.y,
          block.w,
          block.h,
        );
      else drawBlockRect(block);
    }

    for (const exp of explosions) {
      if (palette.sprites) {
        const frameIndex = Math.min(
          Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
          3,
        );
        const frame = EXPLOSION_FRAMES[exp.color]?.[frameIndex];
        if (frame) drawFrame(frame, exp.x, exp.y, exp.w, exp.h);
      } else {
        drawExplosionRect(exp);
      }
    }

    if (palette.sprites) {
      drawSprite(SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite(SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
    } else {
      drawPaddleRect();
      drawBallCircle();
    }
  }

  function loop(timestamp: number) {
    if (lastTime === null) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    if (gameState !== "playing") {
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key in keys) {
      e.preventDefault();
      keys[e.key] = true;
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) {
      e.preventDefault();
      keys[e.key] = false;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(
      0,
      Math.min(canvas.width - paddle.w, mouseX - paddle.w / 2),
    );
  };

  function initGame() {
    gameState = "playing";
    score = 0;
    lives = 3;
    initPaddle();
    loadLevel(1);
  }

  function beginLoop() {
    if (rafId !== null) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  loadSpritesheet(() => {
    draw();
  });

  return {
    start() {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousemove", handleMouseMove);

      if (ssLoaded) {
        beginLoop();
      } else if (!startPending) {
        startPending = true;
        loadSpritesheet(() => {
          startPending = false;
          beginLoop();
        });
      }
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    restart() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTime = null;
      initGame();
      draw();
      notifyState();
    },
    forceGameOver() {
      gameState = "gameover";
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      notifyState();
    },
    setSkin(id: SkinId) {
      palette = PALETTES[id];
      // Redibuja de inmediato para reflejar el cambio aunque el loop esté detenido
      // (juego en pausa, aún sin arrancar o en game over).
      draw();
    },
    destroy() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
    },
  };
}
