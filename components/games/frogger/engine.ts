import type { GameState } from "@/components/games/registry";
import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import { drawGlowSprite, getGlowSprite } from "@/components/games/glowSprite";

export interface FroggerGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // score=0, lives=3, level=1, nenúfares vacíos, rana en inicio, timer=30
  forceGameOver(): void; // fuerza status="gameover" (botón FIN)
  setSkin(id: SkinId): void; // cambia la paleta activa en caliente y redibuja
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
  colorIndex: number; // índice en palette.vehicles; el color se resuelve al dibujar
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

// Tokens de color que el motor de Frogger realmente usa. Cada skin del contrato
// compartido (`SkinId`) define una paleta completa; `clasico` preserva exacto el
// look original hardcodeado.
interface FroggerPalette {
  water: string; // agua de la meta (fila 0) y del río (filas 1-5)
  grass: string; // mediana segura (fila 6) y zona de inicio (fila 12)
  asphalt: string; // autopista (filas 7-11)
  frog: string; // la rana y las ranas ya en meta
  homeEmpty: string; // nenúfar vacío
  homeFrog: string; // nenúfar ocupado
  log: string; // tronco flotante
  turtle: string; // tortuga flotante
  vehicles: [string, string, string, string, string]; // 5 colores de vehículos por lane
  glow: number; // shadowBlur para efecto neón (0 = sin glow)
}

const PALETTES: Record<SkinId, FroggerPalette> = {
  // Look original preservado exacto.
  clasico: {
    water: "#0a3d62",
    grass: "#1e6b2e",
    asphalt: "#2b2b2b",
    frog: "#7CFC00",
    homeEmpty: "rgba(255,255,255,0.15)",
    homeFrog: "#7CFC00",
    log: "#8b5a2b",
    turtle: "#2e8b57",
    vehicles: ["#e74c3c", "#f39c12", "#9b59b6", "#e67e22", "#3498db"],
    glow: 0,
  },
  // Saturado, alto contraste, con glow tipo tubo de neón sobre superficies casi
  // negras: el agua y el asfalto se oscurecen para que rana, troncos y vehículos
  // brillen.
  neon: {
    water: "#001b33",
    grass: "#0d2b1a",
    asphalt: "#0a0a12",
    frog: "#39ff14",
    homeEmpty: "rgba(0,255,180,0.18)",
    homeFrog: "#39ff14",
    log: "#ff8c1a",
    turtle: "#00e5c7",
    vehicles: ["#ff2079", "#faff00", "#b026ff", "#ff5e00", "#00e5ff"],
    glow: 12,
  },
  // Paleta apagada/terrosa 8-bit, estética CRT sin glow.
  retro: {
    water: "#1b3a4a",
    grass: "#35502a",
    asphalt: "#3a3a34",
    frog: "#b0cf72",
    homeEmpty: "rgba(220,210,180,0.14)",
    homeFrog: "#b0cf72",
    log: "#6e4a2a",
    turtle: "#4a7a5a",
    vehicles: ["#b5533f", "#c99a3f", "#7a5a8f", "#b5763f", "#4a7391"],
    glow: 0,
  },
};

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
      colorIndex: i % 5,
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

const KEY_DIRECTIONS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  w: { dx: 0, dy: -1 },
  W: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  s: { dx: 0, dy: 1 },
  S: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  a: { dx: -1, dy: 0 },
  A: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  d: { dx: 1, dy: 0 },
  D: { dx: 1, dy: 0 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  initialSkin: SkinId = DEFAULT_SKIN,
): FroggerGame {
  const ctx = canvas.getContext("2d");

  let palette: FroggerPalette = PALETTES[initialSkin];
  let currentSkin: SkinId = initialSkin;

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
  let lastEmitted: GameState | null = null;

  function sameExtraStats(
    a: GameState["extraStats"],
    b: GameState["extraStats"],
  ) {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every(
      (stat, i) => stat.label === b[i].label && stat.value === b[i].value,
    );
  }

  function emitState() {
    const state: GameState = {
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
    };
    if (
      lastEmitted &&
      lastEmitted.score === state.score &&
      lastEmitted.lives === state.lives &&
      lastEmitted.level === state.level &&
      lastEmitted.status === state.status &&
      sameExtraStats(lastEmitted.extraStats, state.extraStats)
    ) {
      return;
    }
    lastEmitted = state;
    onStateChange(state);
  }

  function frogCell() {
    return {
      col: Math.round(frog.x / CELL),
      row: Math.round(frog.y / CELL),
    };
  }

  function respawnFrog() {
    frog = { x: START_CELL.col * CELL, y: START_CELL.row * CELL };
    furthestRow = START_CELL.row;
    crossingTimeLeft = CROSSING_SECONDS;
  }

  function loseLife() {
    lives -= 1;
    if (lives <= 0) {
      lives = 0;
      status = "gameover";
      stop();
    } else {
      respawnFrog();
    }
  }

  function handleHomeArrival(col: number) {
    const homeIndex = HOME_COLS.indexOf(col);
    if (homeIndex === -1 || homeOccupied[homeIndex]) {
      loseLife();
      return;
    }
    homeOccupied[homeIndex] = true;
    score += SCORE_HOME + Math.floor(crossingTimeLeft) * SCORE_TIME_PER_SEC;
    if (homeOccupied.every(Boolean)) {
      score += SCORE_LEVEL_CLEAR;
      level += 1;
      speedMult = Math.min(MAX_SPEED_MULT, speedMult * LEVEL_SPEED_MULT);
      homeOccupied = HOME_COLS.map(() => false);
    }
    respawnFrog();
  }

  function moveFrog(dx: number, dy: number) {
    if (status !== "playing") return;
    const cell = frogCell();
    const newCol = clamp(cell.col + dx, 0, COLS - 1);
    const newRow = clamp(cell.row + dy, 0, ROWS - 1);
    frog.x = newCol * CELL;
    frog.y = newRow * CELL;
    if (newRow < furthestRow) {
      score += SCORE_FORWARD;
      furthestRow = newRow;
    }
    if (newRow === 0) {
      handleHomeArrival(newCol);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const dir = KEY_DIRECTIONS[e.key];
    if (!dir) return;
    e.preventDefault();
    moveFrog(dir.dx, dir.dy);
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

    if (status !== "playing") {
      emitState();
      return;
    }

    crossingTimeLeft -= dt;
    if (crossingTimeLeft <= 0) {
      loseLife();
      emitState();
      return;
    }

    const { row } = frogCell();
    if (ROAD_ROWS.includes(row)) {
      const lane = roadLanes.find((l) => l.row === row);
      const hit = lane?.vehicles.some(
        (v) => frog.x + CELL > v.x && frog.x < v.x + v.lengthCells * CELL,
      );
      if (hit) {
        loseLife();
        emitState();
        return;
      }
    } else if (RIVER_ROWS.includes(row)) {
      const lane = riverLanes.find((l) => l.row === row);
      const platform = lane?.platforms.find(
        (p) => frog.x + CELL > p.x && frog.x < p.x + p.lengthCells * CELL,
      );
      if (!platform) {
        loseLife();
        emitState();
        return;
      }
      if (lane) frog.x += lane.dir * lane.speed * speedMult * dt;
      if (frog.x < 0 || frog.x + CELL > COLS * CELL) {
        loseLife();
        emitState();
        return;
      }
    }

    emitState();
  }

  function drawBoard() {
    if (!ctx) return;

    // Fila 0: meta (agua con nenúfares).
    ctx.fillStyle = palette.water;
    ctx.fillRect(0, 0, COLS * CELL, CELL);

    // Filas 1-5: río.
    ctx.fillStyle = palette.water;
    ctx.fillRect(
      0,
      RIVER_ROWS[0] * CELL,
      COLS * CELL,
      RIVER_ROWS.length * CELL,
    );

    // Fila 6: mediana segura.
    ctx.fillStyle = palette.grass;
    ctx.fillRect(0, SAFE_MEDIAN_ROW * CELL, COLS * CELL, CELL);

    // Filas 7-11: autopista.
    ctx.fillStyle = palette.asphalt;
    ctx.fillRect(0, ROAD_ROWS[0] * CELL, COLS * CELL, ROAD_ROWS.length * CELL);

    // Fila 12: zona de inicio.
    ctx.fillStyle = palette.grass;
    ctx.fillRect(0, START_CELL.row * CELL, COLS * CELL, CELL);

    // Nenúfares (fila 0).
    HOME_COLS.forEach((col, i) => {
      const cx = col * CELL + CELL / 2;
      const cy = CELL / 2;
      ctx.fillStyle = palette.homeEmpty;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.4, 0, Math.PI * 2);
      ctx.fill();
      if (homeOccupied[i]) {
        const hx = col * CELL + CELL * 0.25;
        const hy = CELL * 0.25;
        const hw = CELL * 0.5;
        const hh = CELL * 0.5;
        if (palette.glow > 0) {
          const sprite = getGlowSprite(
            `frogger:home:${currentSkin}`,
            hw,
            hh,
            palette.glow,
            palette.homeFrog,
            (sctx) => {
              sctx.fillStyle = palette.homeFrog;
              sctx.fillRect(0, 0, hw, hh);
            },
          );
          drawGlowSprite(ctx, sprite, hx, hy);
        } else {
          ctx.fillStyle = palette.homeFrog;
          ctx.fillRect(hx, hy, hw, hh);
        }
      }
    });
  }

  function drawVehicles() {
    if (!ctx) return;
    for (const lane of roadLanes) {
      for (const v of lane.vehicles) {
        const color = palette.vehicles[v.colorIndex];
        const vx = v.x + 2;
        const vy = lane.row * CELL + 4;
        const vw = v.lengthCells * CELL - 4;
        const vh = CELL - 8;
        if (palette.glow > 0) {
          const sprite = getGlowSprite(
            `frogger:vehicle:${currentSkin}:${v.colorIndex}:${v.lengthCells}`,
            vw,
            vh,
            palette.glow,
            color,
            (sctx) => {
              sctx.fillStyle = color;
              sctx.fillRect(0, 0, vw, vh);
            },
          );
          drawGlowSprite(ctx, sprite, vx, vy);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(vx, vy, vw, vh);
        }
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
          const lx = p.x + 2;
          const ly = y + 4;
          const lw = w - 4;
          const lh = CELL - 8;
          if (palette.glow > 0) {
            const sprite = getGlowSprite(
              `frogger:log:${currentSkin}:${p.lengthCells}`,
              lw,
              lh,
              palette.glow,
              palette.log,
              (sctx) => {
                sctx.fillStyle = palette.log;
                sctx.fillRect(0, 0, lw, lh);
              },
            );
            drawGlowSprite(ctx, sprite, lx, ly);
          } else {
            ctx.fillStyle = palette.log;
            ctx.fillRect(lx, ly, lw, lh);
          }
        } else {
          const drawTurtle = (sctx: CanvasRenderingContext2D) => {
            sctx.fillStyle = palette.turtle;
            sctx.beginPath();
            sctx.ellipse(
              w / 2,
              CELL / 2,
              w / 2 - 2,
              CELL / 2 - 4,
              0,
              0,
              Math.PI * 2,
            );
            sctx.fill();
          };
          if (palette.glow > 0) {
            const sprite = getGlowSprite(
              `frogger:turtle:${currentSkin}:${p.lengthCells}`,
              w,
              CELL,
              palette.glow,
              palette.turtle,
              drawTurtle,
            );
            drawGlowSprite(ctx, sprite, p.x, y);
          } else {
            ctx.translate(p.x, y);
            drawTurtle(ctx);
            ctx.translate(-p.x, -y);
          }
        }
      }
    }
  }

  function drawFrog() {
    if (!ctx) return;
    const fx = frog.x + CELL * 0.15;
    const fy = frog.y + CELL * 0.15;
    const fs = CELL * 0.7;
    if (palette.glow > 0) {
      const sprite = getGlowSprite(
        `frogger:frog:${currentSkin}`,
        fs,
        fs,
        palette.glow,
        palette.frog,
        (sctx) => {
          sctx.fillStyle = palette.frog;
          sctx.fillRect(0, 0, fs, fs);
        },
      );
      drawGlowSprite(ctx, sprite, fx, fy);
    } else {
      ctx.fillStyle = palette.frog;
      ctx.fillRect(fx, fy, fs, fs);
    }
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
    if (running) {
      animId = requestAnimationFrame(loop);
    }
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
    running = false;
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    lastTs = null;
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
    draw();
    emitState();
  }

  function forceGameOver() {
    status = "gameover";
    stop();
    emitState();
  }

  function setSkin(id: SkinId) {
    palette = PALETTES[id];
    currentSkin = id;
    draw();
  }

  function destroy() {
    stop();
    window.removeEventListener("keydown", handleKeyDown);
  }

  return { start, stop, restart, forceGameOver, setSkin, destroy };
}
