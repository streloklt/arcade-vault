import type { GameState } from "@/components/games/registry";

export interface FroggerGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // score=0, lives=3, level=1, nenúfares vacíos, rana en inicio, timer=30
  forceGameOver(): void; // fuerza status="gameover" (botón FIN)
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

const CELL = 40; // px por celda
const COLS = 15; // columnas (x: 0..14) → canvas 600px de ancho
const ROWS = 13; // filas (y: 0..12) → canvas 520px de alto
const START_CELL = { col: 7, row: 12 };
const HOME_COLS = [1, 4, 7, 10, 13]; // 5 nenúfares en la fila 0
const LIVES = 3;
const CROSSING_SECONDS = 30; // timer por cada rana/viaje
const LEVEL_SPEED_MULT = 1.15; // por nivel completado
const MAX_SPEED_MULT = 2.5; // tope acumulado del multiplicador de velocidad

// Scoring
const SCORE_FORWARD = 10; // por avanzar a una fila nueva más cercana a la meta
const SCORE_HOME = 50; // por ocupar un nenúfar
const SCORE_TIME_PER_SEC = 2; // bonus por segundo entero restante al ocupar un nenúfar
const SCORE_LEVEL_CLEAR = 1000; // por completar los 5 nenúfares

const RIVER_ROWS = [1, 2, 3, 4, 5];
const SAFE_MEDIAN_ROW = 6;
const ROAD_ROWS = [7, 8, 9, 10, 11];

interface Vehicle {
  x: number; // px, esquina izquierda
  lengthCells: 1 | 2;
  color: string;
}
interface RoadLane {
  row: number; // 7..11
  dir: 1 | -1;
  speed: number; // px/s base
  vehicles: Vehicle[];
}

interface Platform {
  x: number; // px, esquina izquierda
  lengthCells: 2 | 3;
  type: "log" | "turtle";
}
interface RiverLane {
  row: number; // 1..5
  dir: 1 | -1;
  speed: number; // px/s base
  platforms: Platform[];
}

interface FrogPos {
  x: number; // px
  y: number; // px
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
): FroggerGame {
  const ctx = canvas.getContext("2d");

  let frog: FrogPos = {
    x: START_CELL.col * CELL,
    y: START_CELL.row * CELL,
  };
  let furthestRow = START_CELL.row;
  const roadLanes: RoadLane[] = [];
  const riverLanes: RiverLane[] = [];
  let homeOccupied: boolean[] = HOME_COLS.map(() => false);

  let score = 0;
  let lives = LIVES;
  let level = 1;
  let speedMult = 1;
  let crossingTimeLeft = CROSSING_SECONDS;
  let status: "playing" | "gameover" = "playing";

  let animId: number | null = null;
  let lastTs: number | null = null;
  let running = false;

  function emitState() {
    onStateChange({
      score,
      lives,
      level,
      status,
      extraStats: [
        { label: "Metas", value: `${homeOccupied.filter(Boolean).length}/5` },
        {
          label: "Tiempo",
          value: `${Math.max(0, Math.ceil(crossingTimeLeft))}s`,
        },
      ],
    });
  }

  function handleKeyDown(_e: KeyboardEvent) {
    // implementado en el paso 4
  }

  function update(_dt: number) {
    // implementado en los pasos 3-5
  }

  function draw() {
    // implementado en el paso 2
  }

  function loop(ts: number) {
    if (!running) return;
    if (lastTs === null) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = null;
    window.addEventListener("keydown", handleKeyDown);
    animId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  function restart() {
    frog = { x: START_CELL.col * CELL, y: START_CELL.row * CELL };
    furthestRow = START_CELL.row;
    homeOccupied = HOME_COLS.map(() => false);
    score = 0;
    lives = LIVES;
    level = 1;
    speedMult = 1;
    crossingTimeLeft = CROSSING_SECONDS;
    status = "playing";
    emitState();
  }

  function forceGameOver() {
    status = "gameover";
    stop();
    emitState();
  }

  function destroy() {
    stop();
    window.removeEventListener("keydown", handleKeyDown);
  }

  return { start, stop, restart, forceGameOver, destroy };
}
