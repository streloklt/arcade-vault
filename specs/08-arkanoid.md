# SPEC 08 — Integrar Arkanoid en el vault

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-07-16
> **Objetivo:** Portar Arkanoid (`references/started-games/04-arkanoid/game.js`) a un motor TypeScript que reemplace la arena mock de `GamePlayer` para la entrada `arkanoid` (renombrada desde el mock `bloque-buster`), siguiendo el patrón `GAME_ENGINES` ya establecido por Asteroids y Tetris.

## Scope

**In:**

- `components/games/arkanoid/engine.ts`: motor del juego en TypeScript adaptado de `game.js` — paleta, pelota, grilla de bloques por nivel (`LEVELS`, portado desde `levels.js`), colisión AABB paleta/pelota/bloques, explosiones animadas al romper un bloque, encapsulado en una factory `createArkanoidGame(canvas, onStateChange)` que devuelve `{ start(), stop(), restart(), forceGameOver(), destroy() }`. Estado (`paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `currentLevel`, `gameState`) en closures, sin variables de módulo. Al final de cada `update(dt)` llama a `onStateChange` con la forma `GameState` de `components/games/registry.tsx` (`score`, `lives`, `level: currentLevel`, `status`, y `extraStats` con un valor tipo "Nivel: X/5") — `status` solo usa `"playing" | "gameover"` (sin `"dead"`; perder una vida con vidas restantes no interrumpe el estado `"playing"`). Completar el nivel 5 (`gameState === 'win'` en el original) se mapea también a `status: "gameover"`, reutilizando el mismo modal de fin de partida con el score final. El listener de teclado (`keydown`/`keyup` para `←`/`→`) y el de `mousemove` sobre el canvas se agregan en `start()` y se quitan en `destroy()`. Se reproducen los sonidos `ball-bounce` (rebote en pared/paleta) y `break-sound` (bloque destruido) vía `Audio`, igual que el original.
- `components/games/arkanoid/ArkanoidCanvas.tsx`: wrapper cliente (`"use client"`) con `forwardRef`+`useImperativeHandle` exponiendo `{pause, resume, restart, forceGameOver}` (tipo `GameCanvasHandle`), guard anti-doble-mount de StrictMode, overlay inicial "ARKANOID · PULSA ESPACIO PARA JUGAR" antes de arrancar el loop. Renderiza `<canvas width={800} height={600}>`.
- Controles: `←`/`→` (teclado) y movimiento del mouse sobre el canvas reposicionan la paleta, igual que el original — ambos métodos activos simultáneamente, sin preferencia exclusiva.
- Scoring y niveles idénticos al original: +10 puntos por bloque destruido, velocidad de la pelota multiplicada por `LEVELS[n].speed`, pérdida de vida al caer la pelota bajo el canvas, `lives` inicia en 3.
- Se descarta del original: la tecla `P`/`Escape` de pausa y el overlay de pausa con selector de nivel por click (`drawPauseOverlay`, listener `click` en canvas) — el HUD de React ya aporta el botón PAUSA/REANUDAR conectado a `pause()`/`resume()` del motor, mismo criterio que asteroids/tetris.
- Assets: se mueven `assets/spritesheet-breakout.png`, `assets/spritesheet.js` (adaptado a helpers TS o importado tal cual como módulo de dibujo), `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` a `public/games/arkanoid/` (spritesheet + sonidos). El motor carga el spritesheet de forma asíncrona (`loadSpritesheet`) antes de permitir `start()` — si el jugador presiona Espacio antes de que termine de cargar, se ignora hasta que la carga complete.
- Agregar la entrada `arkanoid` al mapa `GAME_ENGINES` en `components/games/registry.tsx` (`Canvas: ArkanoidCanvas, initialState: { score: 0, lives: 3, level: 1, status: "playing" }`) — sin adaptador, porque `ArkanoidCanvas` ya emite `GameState` directo. No se toca `GamePlayer.tsx`.
- Migración Supabase (`mcp__supabase__apply_migration` o `execute_sql`) que renombra la fila mock existente: `UPDATE games SET id = 'arkanoid', title = 'ARKANOID', short = ..., long = ... WHERE id = 'bloque-buster'` — se conservan `cat = 'ARCADE'`, `color = 'cyan'`, `cover = 'cover-bricks'` tal cual están hoy. Esto cambia la ruta real del juego de `/juego/bloque-buster/...` a `/juego/arkanoid/...`.

**Out of scope (para futuros specs):**

- Cualquier cambio a otros juegos del vault (`serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`, `tetris`) — siguen sin modificaciones.
- Controles táctiles/móviles.
- Overlay de pausa con selector de nivel por click (`drawPauseOverlay`) y la tecla `P`/`Escape` del original.
- Redirección desde la ruta antigua `/juego/bloque-buster/...` — no hay tráfico real en producción que dependa de esa URL (mismo criterio que specs 05/07).
- Cambios al copy/metadata de la fila más allá de `id`/`title`/`short`/`long` — `cat`/`color`/`cover` quedan igual (ver Decisions).
- Un sistema genérico de "estado intermedio de muerte" (`status: "dead"`) — Arkanoid solo emite `"playing"` y `"gameover"`.
- Diferenciar visualmente en el HUD si el fin de partida fue por perder las 3 vidas o por completar el nivel 5 — ambos casos disparan el mismo modal "FIN DEL JUEGO" con el score final, sin mensaje distinto.

## Data model

Esta feature no introduce persistencia nueva (sigue usando `POST /api/scores` de SPEC 06). Define un contrato TypeScript nuevo entre el motor y React:

```ts
// components/games/arkanoid/engine.ts
import type { GameState } from "@/components/games/registry";

export interface ArkanoidGame {
  start(): void; // arranca el requestAnimationFrame loop (espera a que el spritesheet cargue)
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce initPaddle()+loadLevel(1): score=0, lives=3, nivel=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  destroy(): void; // limpia listeners de teclado/mouse y cancela el loop (unmount)
}

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
): ArkanoidGame;
```

Fila actualizada en `games` (valores concretos, no placeholders):

```sql
UPDATE games
SET id = 'arkanoid',
    title = 'ARKANOID',
    short = 'Rebota la pelota y destruye muros de neon.',
    long = 'Controla una paleta y rebota una pelota de plasma para destruir 5 niveles de bloques cromaticos. Pierde una vida si la pelota cae; el juego termina al perder las 3 vidas o al completar el nivel 5.'
WHERE id = 'bloque-buster';
-- cat = 'ARCADE', color = 'cyan', cover = 'cover-bricks' quedan sin cambios.
```

## Implementation plan

1. Mover assets: copiar `assets/spritesheet-breakout.png`, `assets/spritesheet.js`, `assets/sounds/ball-bounce.mp3`, `assets/sounds/break-sound.mp3` de `references/started-games/04-arkanoid/` a `public/games/arkanoid/`. Verificación: los archivos existen en `public/games/arkanoid/` y son accesibles vía `/games/arkanoid/<archivo>` con `npm run dev`.

2. Crear `components/games/arkanoid/engine.ts`: portar `game.js` + `levels.js` a TypeScript dentro de `createArkanoidGame(canvas, onStateChange)`. Constantes (`PADDLE_SPEED`, `BLOCK_COLS/ROWS/W/H`, `BASE_BALL_VX/VY`, `LEVELS`) y funciones (`initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update`, `draw`, `drawOverlay`) se adaptan casi literalmente, pero todo el estado (`paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `gameState`, `currentLevel`) vive en closures dentro de la factory. Se omiten `isPaused`/`drawPauseOverlay`/el listener `click` de selección de nivel (pausa la controla React desde afuera vía `stop()`/`start()`). El spritesheet se carga de forma asíncrona al construir el juego; `start()` no arranca el loop hasta que la carga complete. Al final de cada `update(dt)` se llama a `onStateChange` con `status` resuelto como `"gameover"` si `gameState === 'gameover'` o `gameState === 'win'`, y `"playing"` en cualquier otro caso, más `extraStats` con el valor "Nivel: X/5". Los listeners de teclado (`←`/`→`) y `mousemove` se agregan en `start()` y se remueven en `destroy()`. `forceGameOver()` fija `gameState = 'gameover'`, cancela el loop y notifica el estado. Verificación: `npm run build` compila sin errores de tipos; el archivo no se importa desde ningún lado todavía.

3. Crear `components/games/arkanoid/ArkanoidCanvas.tsx` (`"use client"`): renderiza `<canvas width={800} height={600}>`, instancia `createArkanoidGame` en un `useEffect` con guard de un solo mount (ref booleana), lo destruye en cleanup. Muestra el overlay "ARKANOID · PULSA ESPACIO PARA JUGAR" hasta que el jugador presiona Espacio (ignorado mientras el spritesheet no haya cargado), momento en que se oculta y se llama `game.start()`. Expone vía `useImperativeHandle` (con `forwardRef`) `{pause, resume, restart, forceGameOver}` delegando a la instancia del engine, y recibe `onStateChange: (state: GameState) => void` como prop. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.

4. Renombrar la fila mock en Supabase vía `mcp__supabase__apply_migration`: `UPDATE games SET id='arkanoid', title='ARKANOID', short=..., long=... WHERE id='bloque-buster'` (cat/color/cover sin cambios). Verificación: `execute_sql` con `select * from games where id='arkanoid'` devuelve la fila actualizada; `select * from games where id='bloque-buster'` no devuelve filas.

5. Modificar `components/games/registry.tsx`: agregar la entrada `arkanoid: { Canvas: ArkanoidCanvas, initialState: { score: 0, lives: 3, level: 1, status: "playing" } }` al mapa `GAME_ENGINES`, con el import correspondiente. No se toca `GamePlayer.tsx` (ya resuelve por `game.id` vía el mapa). Verificación: `npm run build` compila; `npm run dev`, navegar a `/juego/arkanoid` y `/juego/arkanoid/jugar` sin errores 404.

6. Recorrido end-to-end manual: jugar una partida completa en `/juego/arkanoid/jugar` — overlay inicial → Espacio arranca el juego (tras cargar el spritesheet) → mover la paleta con teclado y con el mouse, rebotar la pelota, romper bloques (score sube +10 por bloque, se escucha `break-sound`, se ve la animación de explosión) → completar el nivel 1 y pasar automáticamente al nivel 2 (celda "Nivel" sube a 2/5, la pelota aumenta de velocidad) → dejar caer la pelota intencionalmente y confirmar que se pierde una vida sin terminar la partida → perder las 3 vidas y confirmar que se abre el modal "FIN DEL JUEGO" con el score real. Repetir completando los 5 niveles para confirmar que también abre el modal "FIN DEL JUEGO" al ganar. Probar PAUSA (el loop se congela de verdad, sin overlay de selector de nivel) y FIN (fuerza el modal antes de perder). Verificación: `npm run build` y `npm run lint` sin errores; recorrido manual completo sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `games` tiene la fila con `id = 'arkanoid'` (ya no `'bloque-buster'`), `title = 'ARKANOID'`, `cat = 'ARCADE'`, `color = 'cyan'`, `cover = 'cover-bricks'` sin cambios en esos tres últimos campos.
- [ ] `components/games/arkanoid/engine.ts` exporta `createArkanoidGame(canvas, onStateChange)` sin variables globales de módulo.
- [ ] `public/games/arkanoid/` contiene el spritesheet y los dos archivos de audio movidos desde `references/started-games/04-arkanoid/assets/`.
- [ ] `components/games/arkanoid/ArkanoidCanvas.tsx` muestra el overlay "ARKANOID · PULSA ESPACIO PARA JUGAR" al montar y no arranca el loop hasta que se presiona Espacio y el spritesheet terminó de cargar.
- [ ] `components/games/registry.tsx` tiene la entrada `arkanoid` en `GAME_ENGINES`; `components/GamePlayer.tsx` no fue modificado.
- [ ] En `/juego/arkanoid/jugar`, el HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del motor, y la celda "Nivel" muestra el formato `X/5`.
- [ ] Romper un bloque suma exactamente 10 puntos y reproduce el sonido `break-sound`; los rebotes reproducen `ball-bounce`.
- [ ] La paleta se mueve tanto con `←`/`→` como con el mouse sobre el canvas.
- [ ] Completar todos los bloques de un nivel avanza automáticamente al siguiente y aumenta la velocidad de la pelota según `LEVELS[n].speed`.
- [ ] Perder una vida (pelota cae) con vidas restantes no abre el modal de fin de partida; el juego continúa en `status: "playing"`.
- [ ] El botón PAUSA detiene realmente el `requestAnimationFrame` del juego (la pelota y la paleta dejan de moverse), sin mostrar el selector de nivel por click del original, y REANUDAR lo retoma sin reiniciar el estado.
- [ ] El botón FIN fuerza la apertura del modal "FIN DEL JUEGO" con el score acumulado hasta ese momento.
- [ ] Perder las 3 vidas abre automáticamente el modal "FIN DEL JUEGO" con el score real.
- [ ] Completar el nivel 5 también abre el modal "FIN DEL JUEGO" con el score real (mismo modal que al perder).
- [ ] Guardar puntuación desde el modal llama a `POST /api/scores` con `game_id: "arkanoid"` y la fila aparece en `scores` (vía `execute_sql`/dashboard).
- [ ] "JUGAR DE NUEVO" reinicia el motor a estado limpio (nivel 1, score 0, 3 vidas) y vuelve a mostrar el overlay de inicio.
- [ ] Ningún otro juego del vault (`serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`, `tetris`) cambia de comportamiento.
- [ ] Desmontar la página (SALIR o navegar a otra ruta) no deja el loop de `requestAnimationFrame` corriendo en segundo plano.

## Decisions

- **Sí:** renombrar `bloque-buster` → `arkanoid` (`UPDATE`, no `INSERT` nuevo), conservando `cat`/`color`/`cover`. Confirmado con el usuario — mismo patrón que specs 05 (`rocas`→`asteroids`) y 07 (`caida`→`tetris`).
- **Sí:** `title`/`short`/`long` se reescriben para describir Arkanoid real (propuesta del asistente aceptada tal cual). Confirmado con el usuario.
- **No:** cambiar `cat`, `color` o `cover` — se mantienen `ARCADE`/`cyan`/`cover-bricks` del mock actual. Confirmado con el usuario.
- **Sí:** completar el nivel 5 (`gameState === 'win'` en el original) se mapea a `status: "gameover"`, reutilizando el mismo modal de fin de partida en vez de inventar un estado `"win"` fuera del contrato `GameState`. Confirmado con el usuario.
- **Sí:** `status` solo usa el subconjunto `"playing" | "gameover"` — perder una vida sin quedarse sin vidas no interrumpe `"playing"`. Confirmado con el usuario, mismo criterio que tetris.
- **Sí:** el nivel actual se expone vía `extraStats: [{label: "Nivel", value: "X/5"}]`, ya que el original tiene un tope fijo de 5 niveles. Confirmado con el usuario.
- **Sí:** se portan ambos métodos de control del original — teclado (`←`/`→`) y mouse (`mousemove` sobre el canvas) — activos simultáneamente. Confirmado con el usuario.
- **No:** portar el overlay de pausa con selector de nivel por click (`drawPauseOverlay`, listener `click`) ni la tecla `P`/`Escape`. Confirmado con el usuario — el HUD de React ya expone PAUSA/REANUDAR conectado a `pause()`/`resume()` del engine, mismo criterio que asteroids/tetris con sus teclas de pausa propias.
- **Sí:** se incluye audio (`ball-bounce.mp3`, `break-sound.mp3`), a diferencia de asteroids/tetris que no tenían sonido en el original. Confirmado con el usuario — el original de Arkanoid sí trae audio, y se porta tal cual en vez de omitirlo por consistencia artificial con specs previas.
- **Sí:** assets movidos a `public/games/arkanoid/` (spritesheet + sonidos). Confirmado con el usuario.
- **No:** redirección desde la ruta antigua `/juego/bloque-buster/...`. Confirmado con el usuario — sin tráfico real en producción, mismo criterio que specs 05/07.
- **Sí:** motor encapsulado en una factory (`createArkanoidGame`) con estado en closures, no variables de módulo. Confirmado con el usuario — mismo criterio que asteroids/tetris.

## Risks

| Riesgo                                                                                                                                                                                     | Mitigación                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Renombrar `id` de `'bloque-buster'` a `'arkanoid'` rompe cualquier puntuación ya guardada en `scores` con `game_id='bloque-buster'` (si existiera) o enlaces a `/juego/bloque-buster/...`. | Sin impacto real hoy — no hay usuarios ni datos reales en producción todavía. Mismo riesgo aceptado que specs 05/07.                                                           |
| El `useEffect` que instancia el motor puede ejecutarse dos veces en React 19 StrictMode (dev), duplicando el `requestAnimationFrame` loop o los listeners de teclado/mouse.                | `ArkanoidCanvas.tsx` usa un guard (ref booleana) para asegurar una sola instancia real del engine por montaje, y `destroy()` limpia listeners/loop en cada cleanup del efecto. |
| La carga asíncrona del spritesheet (`loadSpritesheet`) puede dejar el `draw()` inicial dibujando sobre una imagen no cargada, o permitir `start()` antes de tiempo si no se guardea bien.  | `ArkanoidCanvas.tsx` ignora la tecla Espacio hasta que la promesa/callback de carga del spritesheet resuelve; el overlay de inicio permanece visible mientras tanto.           |
| Reproducir `Audio` con `.cloneNode().play()` en cada rebote/rotura (patrón del original) puede acumular objetos `Audio` no liberados si el jugador rebota muy rápido, afectando memoria.   | Riesgo de bajo impacto en partidas cortas; se documenta como conocido. Si se vuelve perceptible, un spec futuro podría introducir un pool de `Audio` reutilizable.             |
| Al portar `game.js`+`levels.js` (JS sin tipos) a TypeScript estricto, un tipado apresurado podría introducir bugs sutiles en colisión AABB o en el avance de nivel/velocidad de la pelota. | El paso 6 del plan incluye un recorrido manual jugando una partida completa (incluyendo completar los 5 niveles), no solo verificación de compilación.                         |

## What is **not** in this spec

- Overlay de pausa con selector de nivel por click y la tecla `P`/`Escape` del original.
- Controles táctiles/móviles.
- Redirección desde `/juego/bloque-buster/...`.
- Cambios a otros juegos del vault.
- Un estado `"win"` o `"dead"` intermedio distinto de `"playing"`/`"gameover"` en `GameState`.
- Mensaje distinto en el modal de fin de partida según si se ganó o se perdió.

Cada uno de esos, si se implementa, va en su propio spec.
