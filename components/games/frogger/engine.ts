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

const COLOR_WATER = "#0a3d62";
const COLOR_GRASS = "#1e6b2e";
const COLOR_ASPHALT = "#2b2b2b";
const COLOR_FROG = "#7CFC00";
const COLOR_HOME_EMPTY = "rgba(255,255,255,0.15)";
const COLOR_HOME_FROG = "#7CFC00";
const COLOR_LOG = "#8b5a2b";
const COLOR_TURTLE = "#2e8b57";

const VEHICLE_COLORS = ["#e74c3c", "#f39c12", "#9b59b6", "#e67e22", "#3498db"];

function makeRoadLanes(): RoadLane[] {
  const laneWidth = COLS * CELL;
  return ROAD_ROWS.map((row, i) => {
    const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
    const speed = 60 + i * 15;
    const lengthCells: 1 | 2 = i % 2 === 0 ? 1 : 2;
    const spacing = laneWidth / 3;
    const vehicles: Vehicle[] = [0, 1, 2].map((n) => ({
      x: n * spacing,
      lengthCells,
      color: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
    }));
    return { row, dir, speed, vehicles };
  });
}

function makeRiverLanes(): RiverLane[] {
  const laneWidth = COLS * CELL;
  return RIVER_ROWS.map((row, i) => {
    const dir: 1 | -1 = i % 2 === 0 ? -1 : 1;
    const speed = 40 + i * 10;
    const type: "log" | "turtle" = i % 2 === 0 ? "log" : "turtle";
    const lengthCells: 2 | 3 = type === "log" ? 3 : 2;
    const spacing = laneWidth / 2.5;
    const platforms: Platform[] = [0, 1, 2].map((n) => ({
      x: n * spacing,
      lengthCells,
      type,
    }));
    return { row, dir, speed, platforms };
  });
}

function wrapObject(
  obj: { x: number; lengthCells: number },
  dir: 1 | -1,
  laneWidth: number,
) {
  const w = obj.lengthCells * CELL;
  if (dir === 1 && obj.x > laneWidth) {
    obj.x = -w;
  } else if (dir === -1 && obj.x + w < 0) {
    obj.x = laneWidth;
  }
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
  let roadLanes: RoadLane[] = makeRoadLanes();
  let riverLanes: RiverLane[] = makeRiverLanes();
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

  function advanceLanes(dt: number) {
    const laneWidth = COLS * CELL;
    for (const lane of roadLanes) {
      for (const v of lane.vehicles) {
        v.x += lane.dir * lane.speed * speedMult * dt;
        wrapObject(v, lane.dir, laneWidth);
      }
    }
    for (const lane of riverLanes) {
      for (const p of lane.platforms) {
        p.x += lane.dir * lane.speed * speedMult * dt;
        wrapObject(p, lane.dir, laneWidth);
      }
    }
  }

  function update(dt: number) {
    advanceLanes(dt);
  }

  function drawBoard() {
    if (!ctx) return;

    // Fila 0: meta (agua con nenúfares).
    ctx.fillStyle = COLOR_WATER;
    ctx.fillRect(0, 0, COLS * CELL, CELL);

    // Filas 1-5: río.
    ctx.fillStyle = COLOR_WATER;
    ctx.fillRect(
      0,
      RIVER_ROWS[0] * CELL,
      COLS * CELL,
      RIVER_ROWS.length * CELL,
    );

    // Fila 6: mediana segura.
    ctx.fillStyle = COLOR_GRASS;
    ctx.fillRect(0, SAFE_MEDIAN_ROW * CELL, COLS * CELL, CELL);

    // Filas 7-11: autopista.
    ctx.fillStyle = COLOR_ASPHALT;
    ctx.fillRect(0, ROAD_ROWS[0] * CELL, COLS * CELL, ROAD_ROWS.length * CELL);

    // Fila 12: zona de inicio.
    ctx.fillStyle = COLOR_GRASS;
    ctx.fillRect(0, START_CELL.row * CELL, COLS * CELL, CELL);

    // Nenúfares (fila 0).
    HOME_COLS.forEach((col, i) => {
      const cx = col * CELL + CELL / 2;
      const cy = CELL / 2;
      ctx.fillStyle = COLOR_HOME_EMPTY;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (homeOccupied[i]) {
        ctx.fillStyle = COLOR_HOME_FROG;
        ctx.fillRect(
          col * CELL + CELL * 0.25,
          CELL * 0.25,
          CELL * 0.5,
          CELL * 0.5,
        );
      }
    });
  }

  function drawVehicles() {
    if (!ctx) return;
    for (const lane of roadLanes) {
      for (const v of lane.vehicles) {
        ctx.fillStyle = v.color;
        ctx.fillRect(
          v.x + 2,
          lane.row * CELL + 4,
          v.lengthCells * CELL - 4,
          CELL - 8,
        );
      }
    }
  }

  function drawPlatforms() {
    if (!ctx) return;
    for (const lane of riverLanes) {
      for (const p of lane.platforms) {
        const w = p.lengthCells * CELL;
        const y = lane.row * CELL;
        if (p.type === "log") {
          ctx.fillStyle = COLOR_LOG;
          ctx.fillRect(p.x + 2, y + 4, w - 4, CELL - 8);
        } else {
          ctx.fillStyle = COLOR_TURTLE;
          ctx.beginPath();
          ctx.ellipse(
            p.x + w / 2,
            y + CELL / 2,
            w / 2 - 2,
            CELL / 2 - 4,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }
  }

  function drawFrog() {
    if (!ctx) return;
    ctx.fillStyle = COLOR_FROG;
    ctx.fillRect(
      frog.x + CELL * 0.15,
      frog.y + CELL * 0.15,
      CELL * 0.7,
      CELL * 0.7,
    );
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
    drawBoard();
    drawPlatforms();
    drawVehicles();
    drawFrog();
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
    roadLanes = makeRoadLanes();
    riverLanes = makeRiverLanes();
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
