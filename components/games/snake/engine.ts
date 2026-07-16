import type { GameState } from "@/components/games/registry";
import {
  FRUIT_ATLAS,
  FRUIT_ATLAS_SOURCE,
  COMMON_FRUITS,
  RARE_FRUITS,
} from "@/components/games/snake/fruitAtlas";

const GRID_SIZE = 20;
const CELL = 40;

const BASE_MOVE_INTERVAL = 160; // ms
const MIN_MOVE_INTERVAL = 60; // ms
const LEVEL_SPEED_MULT = 0.9;
const FRUITS_PER_LEVEL = 5;
const INPUT_QUEUE_MAX = 2;

const BODY_COLOR = "#16a34a";
const HEAD_COLOR = "#4ade80";
const BG_COLOR = "#0a0a0a";
const GRID_LINE_COLOR = "rgba(255,255,255,0.05)";

interface Vec2 {
  x: number;
  y: number;
}

interface ActiveFruit extends Vec2 {
  key: string;
  points: 10 | 25;
}

const KEY_DIRECTIONS: Record<string, Vec2> = {
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  D: { x: 1, y: 0 },
};

export interface SnakeGame {
  start(): void; // arranca el loop de requestAnimationFrame
  stop(): void; // cancela el loop (PAUSA/unmount)
  restart(): void; // score=0, lives=3, level=1, serpiente en largo/posición inicial
  forceGameOver(): void; // fuerza status="gameover"
  destroy(): void; // limpia listeners de teclado y cancela el loop
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
): SnakeGame {
  const ctx = canvas.getContext("2d")!;

  let fruitImg: HTMLImageElement | null = null;
  let fruitImgLoaded = false;
  {
    const img = new Image();
    img.onload = () => {
      fruitImg = img;
      fruitImgLoaded = true;
    };
    img.onerror = () => console.error("Failed to load fruits spritesheet");
    img.src = FRUIT_ATLAS_SOURCE;
  }

  const center: Vec2 = {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
  };

  let segments: Vec2[] = [];
  let direction: Vec2 = { x: 1, y: 0 };
  let inputQueue: Vec2[] = [];
  let fruit: ActiveFruit | null = null;

  let score = 0;
  let lives = 3;
  let level = 1;
  let fruitsEaten = 0;
  let moveInterval = BASE_MOVE_INTERVAL;
  let moveAccumulator = 0;
  let status: "playing" | "gameover" = "playing";

  let rafId: number | null = null;
  let lastTime: number | null = null;

  function pickFreeCell(): Vec2 {
    const occupied = new Set(segments.map((s) => `${s.x},${s.y}`));
    const free: Vec2[] = [];
    for (let gx = 0; gx < GRID_SIZE; gx++)
      for (let gy = 0; gy < GRID_SIZE; gy++)
        if (!occupied.has(`${gx},${gy}`)) free.push({ x: gx, y: gy });
    return free[Math.floor(Math.random() * free.length)];
  }

  function spawnFruit() {
    const tier = Math.random() < 0.5 ? COMMON_FRUITS : RARE_FRUITS;
    const key = tier[Math.floor(Math.random() * tier.length)];
    const cell = pickFreeCell();
    fruit = { x: cell.x, y: cell.y, key, points: FRUIT_ATLAS[key].points };
  }

  function buildResetSegments(length: number): Vec2[] {
    const segs: Vec2[] = [{ x: center.x, y: center.y }];
    let x = center.x;
    let y = center.y;
    let dir = -1;
    while (segs.length < length) {
      x += dir;
      if (x < 0) {
        dir = 1;
        x = 0;
        y = (y - 1 + GRID_SIZE) % GRID_SIZE;
      } else if (x >= GRID_SIZE) {
        dir = -1;
        x = GRID_SIZE - 1;
        y = (y - 1 + GRID_SIZE) % GRID_SIZE;
      }
      segs.push({ x, y });
    }
    return segs;
  }

  function resetPosition() {
    segments = buildResetSegments(segments.length);
    direction = { x: 1, y: 0 };
    inputQueue = [];
    moveAccumulator = 0;
    if (fruit && segments.some((s) => s.x === fruit!.x && s.y === fruit!.y)) {
      spawnFruit();
    }
  }

  function notifyState() {
    onStateChange({
      score,
      lives,
      level,
      status,
    });
  }

  function handleCollision() {
    lives--;
    if (lives <= 0) {
      lives = 0;
      status = "gameover";
      notifyState();
      return;
    }
    resetPosition();
    notifyState();
  }

  function tick() {
    if (status !== "playing") return;

    if (inputQueue.length > 0) direction = inputQueue.shift()!;

    const head = segments[0];
    const newHead: Vec2 = { x: head.x + direction.x, y: head.y + direction.y };

    const hitsWall =
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE;

    const willEat = !!fruit && newHead.x === fruit.x && newHead.y === fruit.y;
    const bodyToCheck = willEat ? segments : segments.slice(0, -1);
    const hitsSelf = bodyToCheck.some(
      (s) => s.x === newHead.x && s.y === newHead.y,
    );

    if (hitsWall || hitsSelf) {
      handleCollision();
      return;
    }

    segments.unshift(newHead);

    if (willEat && fruit) {
      score += fruit.points;
      fruitsEaten++;
      if (fruitsEaten % FRUITS_PER_LEVEL === 0) {
        level++;
        moveInterval = Math.max(
          MIN_MOVE_INTERVAL,
          moveInterval * LEVEL_SPEED_MULT,
        );
      }
      spawnFruit();
    } else {
      segments.pop();
    }

    notifyState();
  }

  function update(dt: number) {
    if (status !== "playing") return;
    moveAccumulator += dt * 1000;
    while (moveAccumulator >= moveInterval && status === "playing") {
      moveAccumulator -= moveInterval;
      tick();
    }
  }

  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    if (fruit && fruitImgLoaded && fruitImg) {
      const sprite = FRUIT_ATLAS[fruit.key];
      ctx.drawImage(
        fruitImg,
        sprite.x,
        sprite.y,
        sprite.w,
        sprite.h,
        fruit.x * CELL + 2,
        fruit.y * CELL + 2,
        CELL - 4,
        CELL - 4,
      );
    }

    segments.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? HEAD_COLOR : BODY_COLOR;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function loop(timestamp: number) {
    if (lastTime === null) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    draw();

    if (status !== "playing") {
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const newDir = KEY_DIRECTIONS[e.key];
    if (!newDir) return;
    e.preventDefault();

    const lastDir =
      inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;
    const isOpposite = newDir.x === -lastDir.x && newDir.y === -lastDir.y;
    const isSame = newDir.x === lastDir.x && newDir.y === lastDir.y;
    if (isOpposite || isSame) return;

    if (inputQueue.length < INPUT_QUEUE_MAX) inputQueue.push(newDir);
  };

  function initGame() {
    status = "playing";
    score = 0;
    lives = 3;
    level = 1;
    fruitsEaten = 0;
    moveInterval = BASE_MOVE_INTERVAL;
    moveAccumulator = 0;
    direction = { x: 1, y: 0 };
    inputQueue = [];
    segments = [
      { x: center.x, y: center.y },
      { x: center.x - 1, y: center.y },
      { x: center.x - 2, y: center.y },
    ];
    spawnFruit();
  }

  function beginLoop() {
    if (rafId !== null) return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  initGame();
  draw();

  return {
    start() {
      window.addEventListener("keydown", handleKeyDown);
      beginLoop();
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
      status = "gameover";
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      notifyState();
    },
    destroy() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("keydown", handleKeyDown);
    },
  };
}
