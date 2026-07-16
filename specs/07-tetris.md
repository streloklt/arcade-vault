# SPEC 07 — Integrar Tetris en el vault

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-07-16
> **Objetivo:** Portar Tetris (`references/started-games/03-tetris/game.js`) a un motor TypeScript que reemplace la arena mock de `GamePlayer` para la entrada `tetris` (renombrada desde el mock `caida`), siguiendo el patrón `GAME_ENGINES` ya establecido por Asteroids.

## Scope

**In:**

- `components/games/tetris/engine.ts`: motor del juego en TypeScript adaptado de `game.js` — tablero `board` (10×20), pieza actual/siguiente, colisión, rotación con wall-kicks, `clearLines`, ghost piece, encapsulado en una factory `createTetrisGame(canvas, nextCanvas, onStateChange)` que devuelve `{ start(), stop(), restart(), forceGameOver(), destroy() }`. Estado en closures, sin variables de módulo. Al final de cada `update`/lock de pieza llama `onStateChange({ score, lives, level, status, extraStats })` con la forma `GameState` de `components/games/registry.tsx` — `lives` es `1` mientras `status !== "gameover"` y `0` en `gameover`; `status` solo usa `"playing" | "gameover"` (sin `"dead"`); `extraStats: [{ label: "Líneas", value: String(lines) }]`. El engine recibe dos canvases (tablero + preview de siguiente pieza) y dibuja en ambos, igual que el original (`#board` y `#next-canvas`). Listeners de teclado agregados en `start()`, quitados en `destroy()`.
- `components/games/tetris/TetrisCanvas.tsx`: wrapper cliente (`"use client"`) con `forwardRef`+`useImperativeHandle` exponiendo `{pause, resume, restart, forceGameOver}` (tipo `GameCanvasHandle`), guard anti-doble-mount de StrictMode, overlay inicial "TETRIS · PULSA ESPACIO PARA JUGAR" antes de arrancar el loop. Renderiza el `<canvas>` de tablero (300×600) y el `<canvas>` de siguiente pieza (120×120) dentro del mismo componente.
- Controles de teclado, idénticos al original: `←`/`→` mover, `↑`/`X` rotar (con wall-kicks `[0,±1,±2]`), `↓` soft drop (+1 punto/fila), `Espacio` hard drop (+2 puntos/celda) — la tecla `P` de pausa del original se descarta, ya que el HUD de React aporta el botón PAUSA/REANUDAR conectado a `pause()`/`resume()` del engine.
- Scoring y velocidad idénticos al original: `LINE_SCORES = [0,100,300,500,800] × level`, `level = floor(lines/10) + 1`, `dropInterval = max(100, 1000 - (level-1)×90)` ms.
- Agregar la entrada `tetris` al mapa `GAME_ENGINES` en `components/games/registry.tsx` (`Canvas: TetrisCanvas, initialState: { score: 0, lives: 1, level: 1, status: "playing" }`) — sin adaptador, porque `TetrisCanvas` ya emite `GameState` directo. No se toca `GamePlayer.tsx`.
- Migración Supabase (`mcp__supabase__apply_migration` o `execute_sql`) que renombra la fila mock existente: `UPDATE games SET id = 'tetris', title = 'TETRIS', short = ..., long = ... WHERE id = 'caida'` — se conservan `cat = 'PUZZLE'`, `color = 'magenta'`, `cover = 'cover-tetro'` tal cual están hoy. Esto cambia la ruta real del juego de `/juego/caida/...` a `/juego/tetris/...`.

**Out of scope (para futuros specs):**

- Cualquier cambio a otros juegos del vault (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`) — siguen sin modificaciones.
- Toggle de tema claro/oscuro propio del canvas de Tetris (`localStorage: "tetris-theme"` del original) — el vault ya tiene su propio dark mode vía `prefers-color-scheme`.
- Controles táctiles/móviles.
- Sonido/música (el original no tiene audio).
- Redirección desde la ruta antigua `/juego/caida/...` — no hay tráfico real en producción que dependa de esa URL (mismo criterio que spec 05 con `rocas`→`asteroids`).
- Cambios al copy/metadata de la fila más allá de `id`/`title` (short/long se redactan nuevos para describir Tetris, pero `cat`/`color`/`cover` quedan igual — ver Decisions).
- Un sistema genérico de "estado intermedio de muerte" (`status: "dead"`) para Tetris — el engine solo emite `"playing"` y `"gameover"`.

## Data model

Esta feature no introduce persistencia nueva (sigue usando `POST /api/scores` de SPEC 06). Define un contrato TypeScript nuevo entre el motor y React:

```ts
// components/games/tetris/engine.ts
import type { GameState } from "@/components/games/registry";

export interface TetrisGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce init(): board vacío, score=0, lines=0, level=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

export function createTetrisGame(
  board: HTMLCanvasElement,
  nextPreview: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
): TetrisGame;
```

Fila actualizada en `games` (valores concretos, no placeholders):

```sql
UPDATE games
SET id = 'tetris',
    title = 'TETRIS',
    short = 'Encaja las piezas antes de que se acumulen.',
    long = 'El clásico de bloques que caen: rota y acomoda piezas para completar líneas antes de que el tablero se llene. Ghost piece incluida para planear cada caída.'
WHERE id = 'caida';
-- cat = 'PUZZLE', color = 'magenta', cover = 'cover-tetro' quedan sin cambios.
```

## Implementation plan

1. Crear `components/games/tetris/engine.ts`: portar `game.js` a TypeScript dentro de `createTetrisGame(board, nextPreview, onStateChange)`. Constantes (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`) y funciones (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `drawBlock`, `drawGrid`, `draw`, `drawNext`) se adaptan casi literalmente, pero todo el estado (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`) vive en closures dentro de la factory. Al final de cada lock de pieza y cada frame relevante se llama `onStateChange({ score, lives: gameOver ? 0 : 1, level, status: gameOver ? "gameover" : "playing", extraStats: [{ label: "Líneas", value: String(lines) }] })`. El listener de teclado (`keydown`) se agrega en `start()` y se remueve en `destroy()`, no a nivel de módulo. `forceGameOver()` fija `gameOver = true`, cancela el loop y notifica el estado. Verificación: `npm run build` compila sin errores de tipos; el archivo no se importa desde ningún lado todavía.

2. Crear `components/games/tetris/TetrisCanvas.tsx` (`"use client"`): renderiza `<canvas width={300} height={600}>` (tablero) y `<canvas width={120} height={120}>` (siguiente pieza), instancia `createTetrisGame` en un `useEffect` con guard de un solo mount (ref booleana), lo destruye en cleanup. Muestra el overlay "TETRIS · PULSA ESPACIO PARA JUGAR" hasta que el jugador presiona Espacio, momento en que se oculta y se llama `game.start()`. Expone vía `useImperativeHandle` (con `forwardRef`) `{pause, resume, restart, forceGameOver}` delegando a la instancia del engine, y recibe `onStateChange: (state: GameState) => void` como prop. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.

3. Renombrar la fila mock en Supabase vía `mcp__supabase__apply_migration`: `UPDATE games SET id='tetris', title='TETRIS', short=..., long=... WHERE id='caida'` (cat/color/cover sin cambios). Verificación: `execute_sql` con `select * from games where id='tetris'` devuelve la fila actualizada; `select * from games where id='caida'` no devuelve filas.

4. Modificar `components/games/registry.tsx`: agregar la entrada `tetris: { Canvas: TetrisCanvas, initialState: { score: 0, lives: 1, level: 1, status: "playing" } }` al mapa `GAME_ENGINES`, con el import correspondiente. No se toca `GamePlayer.tsx` (ya resuelve por `game.id` vía el mapa). Verificación: `npm run build` compila; `npm run dev`, navegar a `/juego/tetris` y `/juego/tetris/jugar` sin errores 404.

5. Recorrido end-to-end manual: jugar una partida completa en `/juego/tetris/jugar` — overlay inicial → Espacio arranca el juego → mover/rotar piezas, ver el preview de la siguiente pieza actualizarse, hacer soft drop y hard drop (score sube en el HUD real), completar líneas (celda "Líneas" sube, nivel sube cada 10 líneas, velocidad de caída aumenta) → apilar hasta que una pieza nueva no quepa → se abre el modal "FIN DEL JUEGO" con el score real → guardar puntuación con nombre → "JUGAR DE NUEVO" reinicia limpio (tablero vacío, score=0, líneas=0, nivel=1). Repetir probando PAUSA (el loop se congela de verdad) y FIN (fuerza el modal antes de perder). Verificación: `npm run build` y `npm run lint` sin errores; recorrido manual completo sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `games` tiene la fila con `id = 'tetris'` (ya no `'caida'`), `title = 'TETRIS'`, `cat = 'PUZZLE'`, `color = 'magenta'`, `cover = 'cover-tetro'` sin cambios en esos tres últimos campos.
- [ ] `components/games/tetris/engine.ts` exporta `createTetrisGame(board, nextPreview, onStateChange)` sin variables globales de módulo.
- [ ] `components/games/tetris/TetrisCanvas.tsx` muestra el overlay "TETRIS · PULSA ESPACIO PARA JUGAR" al montar y no arranca el loop hasta que se presiona Espacio.
- [ ] `components/games/registry.tsx` tiene la entrada `tetris` en `GAME_ENGINES`; `components/GamePlayer.tsx` no fue modificado.
- [ ] En `/juego/tetris/jugar`, el HUD superior (Jugador/Puntuación/Vidas/Nivel/Líneas) refleja el estado real del motor.
- [ ] La celda "Líneas" muestra el conteo real de líneas completadas y sube en tiempo real al completar filas.
- [ ] El preview de la siguiente pieza (segundo canvas) se actualiza correctamente cada vez que se fija (`lock`) una pieza.
- [ ] Controles de teclado (`←`/`→` mover, `↑`/`X` rotar con wall-kicks, `↓` soft drop, `Espacio` hard drop) funcionan igual que en el original.
- [ ] El botón PAUSA detiene realmente el `requestAnimationFrame` del juego (las piezas dejan de caer) y REANUDAR lo retoma sin reiniciar el estado.
- [ ] El botón FIN fuerza la apertura del modal "FIN DEL JUEGO" con el score acumulado hasta ese momento.
- [ ] Apilar piezas hasta que una nueva no quepa al spawnear abre automáticamente el modal "FIN DEL JUEGO" con el score real.
- [ ] Guardar puntuación desde el modal llama a `POST /api/scores` con `game_id: "tetris"` y la fila aparece en `scores` (vía `execute_sql`/dashboard).
- [ ] "JUGAR DE NUEVO" reinicia el motor a estado limpio (tablero vacío, score 0, líneas 0, nivel 1) y vuelve a mostrar el overlay de inicio.
- [ ] Ningún otro juego del vault (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`) cambia de comportamiento.
- [ ] Desmontar la página (SALIR o navegar a otra ruta) no deja el loop de `requestAnimationFrame` corriendo en segundo plano.

## Decisions

- **Sí:** renombrar `caida` → `tetris` (`UPDATE`, no `INSERT` nuevo), conservando `cat`/`color`/`cover`. Confirmado con el usuario — mismo patrón que spec 05 (`rocas`→`asteroids`), evita una fila huérfana sin uso en el catálogo.
- **Sí:** `title` cambia a "TETRIS" (nombre real) en vez de mantener "CAÍDA". Confirmado con el usuario.
- **No:** cambiar `cat`, `color` o `cover` — se mantienen `PUZZLE`/`magenta`/`cover-tetro` del mock actual. Confirmado con el usuario, sin fricción visual en biblioteca/salón.
- **Sí:** `lives` se fija en `1` mientras `status !== "gameover"` y `0` en `gameover`, reutilizando el campo compartido de `GameState` sin inventar una mecánica de vidas ajena al original. Confirmado con el usuario.
- **Sí:** `status` solo usa el subconjunto `"playing" | "gameover"` — Tetris no tiene un estado intermedio de "muerte" separado del game over. Confirmado con el usuario.
- **Sí:** el conteo de líneas se expone vía `extraStats: [{label: "Líneas", value: ...}]`, ya que no encaja en `score`/`lives`/`level`. Confirmado con el usuario.
- **Sí:** se replica el preview de la siguiente pieza como un segundo `<canvas>` dibujado por el mismo engine (`nextPreview`), en vez de omitirlo. Confirmado con el usuario — es parte visible del original y no requiere salir del contrato `GameState`.
- **No:** portar el toggle de tema claro/oscuro propio del original (`localStorage: "tetris-theme"`). Confirmado con el usuario — el vault ya tiene su propio dark mode vía `prefers-color-scheme` (`CLAUDE.md`); un segundo sistema de tema dentro del canvas sería redundante.
- **No:** mantener la tecla `P` de pausa del original. Confirmado con el usuario — el HUD de React ya expone PAUSA/REANUDAR conectado a `pause()`/`resume()` del engine, mismo criterio que asteroids.
- **Sí:** mapeo de teclas idéntico al original en el resto de controles (`←`/`→`/`↑`/`X`/`↓`/Espacio). Confirmado con el usuario.
- **No:** redirección desde la ruta antigua `/juego/caida/...`. Confirmado con el usuario — sin tráfico real en producción, mismo criterio que spec 05.
- **No:** assets en `public/`. Confirmado con el usuario — el original solo dibuja en canvas con CSS vars, sin spritesheets ni audio.
- **Sí:** motor encapsulado en una factory (`createTetrisGame`) con estado en closures, no variables de módulo. Confirmado con el usuario — mismo criterio que asteroids, evita estado corrupto entre montajes/StrictMode.

## Risks

| Riesgo                                                                                                                                                                                                      | Mitigación                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renombrar `id` de `'caida'` a `'tetris'` rompe cualquier puntuación ya guardada en `scores` con `game_id='caida'` (si existiera) o enlaces a `/juego/caida/...`.                                            | Sin impacto real hoy — no hay usuarios ni datos reales en producción todavía. Mismo riesgo aceptado que spec 05 con `rocas`→`asteroids`.                                     |
| El `useEffect` que instancia el motor puede ejecutarse dos veces en React 19 StrictMode (dev), duplicando el `requestAnimationFrame` loop o los listeners de teclado.                                       | `TetrisCanvas.tsx` usa un guard (ref booleana) para asegurar una sola instancia real del engine por montaje, y `destroy()` limpia listeners/loop en cada cleanup del efecto. |
| Al portar `game.js` (JS sin tipos) a TypeScript estricto, un tipado apresurado podría introducir bugs sutiles en colisión/rotación (`collide`, `rotateCW`, wall-kicks) que no se notan hasta jugar.         | El paso 5 del plan incluye un recorrido manual jugando una partida completa, no solo verificación de compilación.                                                            |
| Manejar dos `<canvas>` (tablero + preview) dentro de un mismo componente con `useImperativeHandle` puede complicar el guard anti-doble-mount si no se inicializan ambos refs antes de instanciar el engine. | El engine se instancia una sola vez que ambos `<canvas>` están montados (mismo `useEffect`), con la misma ref booleana de guard que usa `AsteroidsCanvas.tsx`.               |

## What is **not** in this spec

- Toggle de tema claro/oscuro propio del canvas de Tetris.
- Controles táctiles/móviles.
- Sonido/música.
- Redirección desde `/juego/caida/...`.
- Cambios a otros juegos del vault.
- Un estado `"dead"` intermedio para Tetris.

Cada uno de esos, si se implementa, va en su propio spec.
