import type { GameState } from "@/components/games/registry";
import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import { drawGlowSprite, getGlowSprite } from "@/components/games/glowSprite";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Paleta de Tetris por skin. `pieces` está indexado 0..7 y se accede con
// `colorIndex - 1` (los índices de pieza en el grid van de 1 a 8: I,O,T,S,Z,J,L,N).
interface TetrisPalette {
  pieces: [string, string, string, string, string, string, string, string];
  grid: string; // líneas de la grilla
  highlight: string; // franja superior brillante del bloque
  glow: number; // shadowBlur; 0 = sin glow
}

const PALETTES: Record<SkinId, TetrisPalette> = {
  // clasico preserva EXACTAMENTE los colores originales del motor.
  clasico: {
    pieces: [
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca (gris metálico)
    ],
    grid: "#22222e",
    highlight: "rgba(255,255,255,0.12)",
    glow: 0,
  },
  // neon: saturado, alto contraste y glow tipo tubo de neón sobre el CRT negro.
  neon: {
    pieces: [
      "#00f5ff", // I
      "#faff00", // O
      "#c800ff", // T
      "#00ff85", // S
      "#ff1f5a", // Z
      "#2b6bff", // J
      "#ff8a00", // L
      "#00ffd0", // N
    ],
    grid: "rgba(0,245,255,0.16)",
    highlight: "rgba(255,255,255,0.28)",
    glow: 12,
  },
  // retro: paleta apagada/terrosa, estética CRT 8-bit, sin glow.
  retro: {
    pieces: [
      "#5a8f8f", // I
      "#c9a227", // O
      "#8a6d9e", // T
      "#6b8f5a", // S
      "#b5563f", // Z
      "#4f6d99", // J
      "#c07b3f", // L
      "#8a8a7a", // N
    ],
    grid: "#2a2620",
    highlight: "rgba(255,240,200,0.08)",
    glow: 0,
  },
};

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

export interface TetrisGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce init(): board vacío, score=0, lines=0, level=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  setSkin(id: SkinId): void; // cambia la paleta activa en caliente y redibuja
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

export function createTetrisGame(
  board: HTMLCanvasElement,
  nextPreview: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
  initialSkin: SkinId = DEFAULT_SKIN,
): TetrisGame {
  const ctx = board.getContext("2d")!;
  const nextCtx = nextPreview.getContext("2d")!;

  let palette: TetrisPalette = PALETTES[initialSkin];

  let grid: number[][];
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let gameOver: boolean;
  let dropAccum: number;
  let dropInterval: number;

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastEmitted: GameState | null = null;

  function createBoard(): number[][] {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length,
      cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        const ny = current.y + r;
        // Igual que collide(): las celdas por encima del tablero (ny < 0)
        // son válidas durante el spawn/lock cerca del tope, pero grid no
        // tiene filas negativas — sin este guard, mergear ahí tira y
        // corta el loop antes de llegar a clearLines()/spawn().
        if (ny < 0 || ny >= ROWS) continue;
        grid[ny][current.x + c] = current.shape[r][c];
      }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every((v) => v !== 0)) {
        grid.splice(r, 1);
        grid.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
    notifyState();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
    notifyState();
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      gameOver = true;
    }
    drawNext();
  }

  function notifyState() {
    const state: GameState = {
      score,
      lives: gameOver ? 0 : 1,
      level,
      status: gameOver ? "gameover" : "playing",
      extraStats: [{ label: "Líneas", value: String(lines) }],
    };
    if (
      lastEmitted &&
      lastEmitted.score === state.score &&
      lastEmitted.lives === state.lives &&
      lastEmitted.level === state.level &&
      lastEmitted.status === state.status &&
      lastEmitted.extraStats?.[0]?.value === state.extraStats?.[0]?.value
    ) {
      return;
    }
    lastEmitted = state;
    onStateChange(state);
  }

  function drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha?: number,
  ) {
    if (!colorIndex) return;
    const color = palette.pieces[colorIndex - 1];
    const isGhost = alpha !== undefined && alpha < 1;
    context.globalAlpha = alpha ?? 1;
    const bx = x * size + 1;
    const by = y * size + 1;
    const bs = size - 2;
    // Glow tipo neón solo en bloques opacos (no en la ghost piece).
    if (palette.glow > 0 && !isGhost) {
      const sprite = getGlowSprite(
        `tetris:block:${color}:${size}:${palette.glow}`,
        bs,
        bs,
        palette.glow,
        color,
        (sctx) => {
          sctx.fillStyle = color;
          sctx.fillRect(0, 0, bs, bs);
        },
      );
      drawGlowSprite(context, sprite, bx, by);
    } else {
      context.fillStyle = color;
      context.fillRect(bx, by, bs, bs);
    }
    context.fillStyle = palette.highlight;
    context.fillRect(bx, by, bs, 4);
    context.globalAlpha = 1;
  }

  function drawGrid() {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, board.width, board.height);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, grid[r][c], BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            gy + r,
            current.shape[r][c],
            BLOCK,
            0.2,
          );

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BLOCK,
          );
  }

  function drawNext() {
    const NB = 30;
    nextCtx.clearRect(0, 0, nextPreview.width, nextPreview.height);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  }

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;

    if (!gameOver) {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
        notifyState();
      }
    }

    draw();

    if (gameOver) {
      notifyState();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  function initGame() {
    grid = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    dropInterval = 1000;
    dropAccum = 0;
    next = randomPiece();
    spawn();
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
    if (gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        return;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        return;
      default:
        return;
    }
    notifyState();
  };

  initGame();

  return {
    start() {
      if (rafId !== null) return;
      window.addEventListener("keydown", handleKeyDown);
      lastTime = null;
      rafId = requestAnimationFrame(loop);
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
      gameOver = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      notifyState();
    },
    setSkin(id: SkinId) {
      palette = PALETTES[id];
      draw();
      drawNext();
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
