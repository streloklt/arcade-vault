---
name: add-game
description: Genera una spec para integrar un juego nuevo (motor + leaderboard + catálogo) en Arcade Vault, siguiendo el patrón de las specs 05 (Asteroids) y 06 (Supabase). Hace preguntas específicas del juego y escribe specs/NN-<slug>.md. No escribe código de producción. Úsalo antes de /spec-impl cuando quieras sumar un juego jugable al vault.
disable-model-invocation: true
argument-hint: "<nombre del juego, o carpeta en references/started-games>"
---

# /add-game — Generador de specs para juegos nuevos

**No escribes código de producción aquí.** Tu único trabajo es producir un archivo
`specs/NN-<slug>.md` completo y aprobable, siguiendo el mismo template que usa `/spec`.
La implementación real (crear `engine.ts`, tocar `GamePlayer.tsx`, insertar en Supabase)
la hace después `/spec-impl NN-<slug>` — no la adelantes aquí, ni siquiera para "dejar
listo un esqueleto".

Tus respuestas van en el mismo idioma del prompt inicial (normalmente español, por
`CLAUDE.md`).

## Por qué existe este skill

Arcade Vault ya integró un juego real (Asteroids, spec 05) y conectó el leaderboard a
Supabase (spec 06). Ese trabajo estableció un patrón repetible: motor TS en factory +
wrapper React con imperative handle + fila en la tabla `games`. `GamePlayer.tsx` estaba
originalmente **cableado por id** (`if (game.id === "asteroids")`), pero ese refactor ya
se pagó: existe `components/games/registry.tsx` con `GAME_ENGINES` (mapa
`id → { Canvas, initialState }`) y los tipos compartidos `GameCanvasHandle`/`GameState`.
`GamePlayer.tsx` resuelve `GAME_ENGINES[game.id]` y cae al mock decorativo si no hay
entrada. Este skill estandariza el proceso para que sumar un juego nuevo sea siempre
puramente incremental: una entrada nueva en `GAME_ENGINES`, sin tocar `GamePlayer.tsx`.

## Fase 1 — Contexto (solo lectura)

Antes de preguntar nada:

1. Lee `CLAUDE.md` y `AGENTS.md`. Recuerda el aviso: `next@16.2.10`/`react@19.2.4` no
   son las versiones que conoces — cualquier mención de routing/data-fetching/caching
   en la spec debe remitir a leer `node_modules/next/dist/docs/` durante `/spec-impl`,
   no a memoria entrenada.
2. Lee **completo** `.agents/skills/spec/SKILL.md` — es el skill `/spec` mismo. No lo
   invoques como comando: léelo como referencia para heredar su método (fases,
   formato de preguntas en bloques, reglas duras, criterio de qué va en cada sección)
   y aplícalo tú mismo al escribir la spec del juego, en vez de improvisar una
   estructura propia.
3. Lee `.agents/skills/spec/template.md` — es el template exacto que debes respetar
   sección por sección (Header, Scope In/Out, Data model, Implementation plan,
   Acceptance criteria, Decisions, Risks, cierre "What is not in this spec").
4. Lista `specs/`, y lee completas `specs/05-asteroids.md` y
   `specs/06-leaderboard-y-catalogo-supabase.md`. De ahí heredas:
   - El patrón de motor: factory `createAsteroidsGame(canvas, onStateChange)` con
     interfaces `AsteroidsState` (`score`, `lives`, `level`, `status: "playing"|"dead"|
"gameover"`, stats propios como `tripleShotRemaining`) y `AsteroidsGame`
     (`start/stop/restart/forceGameOver/destroy`), estado en closures (no globals),
     listeners de teclado agregados en `start()`/quitados en `destroy()`.
   - El wrapper cliente: `AsteroidsCanvas.tsx` con `forwardRef`+`useImperativeHandle`
     exponiendo `{pause,resume,restart,forceGameOver}`, guard anti-doble-mount de
     StrictMode (`initializedRef`), overlay "PULSA ESPACIO PARA JUGAR" antes de
     arrancar el loop.
   - El data layer ya data-driven por `game.id`: `lib/games.ts` (`getGames()`,
     `getGame(id)`, `best`/`plays` agregados desde `scores`), `lib/scores.ts`
     (`getTopScores`, `getRecentScores`, `getTopScoresAllGames`),
     `app/api/scores/route.ts` (`POST` valida `game_id`/`name`/`score` e inserta en
     `scores`). **Nada de esto cambia** al agregar un juego — ya funciona por id.
   - La tabla `games` (`id, title, short, long, cat, cover, color`) sembrada una vez
     vía `mcp__supabase__apply_migration`, sin política de escritura desde la app
     (altas nuevas se hacen manualmente vía MCP).
   - Calcula el próximo número de spec `NN` (siguiente entero libre en `specs/`).
5. `components/games/registry.tsx` ya existe (`GAME_ENGINES`, `GameCanvasHandle`,
   `GameState` con `extraStats?: {label, value}[]`). La spec es siempre puramente
   incremental: agregar una entrada al mapa, sin tocar `GamePlayer.tsx`. (Si en algún
   momento ese archivo no existiera —p. ej. se revirtió el refactor—, tratalo como caso
   excepcional y avisa al usuario antes de asumir nada.)

## Fase 2 — Identificar el juego fuente

- Si `$ARGUMENTS` nombra o coincide con una carpeta de `references/started-games/`
  (hoy: `02-asteroids`, `03-tetris`, `04-arkanoid`), lee su `game.js` completo (y
  `index.html`, `levels.js`, `assets/*` si existen) y extrae: tamaño de canvas, forma
  del loop (`requestAnimationFrame` + `dt`), si usa clases de entidad (patrón
  asteroids) o estado en grid/objetos planos (patrón tetris/arkanoid), controles,
  cómo se calcula/incrementa el score, y **dónde vive el HUD** — dibujado en canvas
  (asteroids, arkanoid) vs elementos DOM/HTML (tetris). Si el juego usa assets
  externos (spritesheet PNG, audio `.mp3`, como arkanoid), anótalo: implica mover
  archivos a `public/` y resolver carga asíncrona antes de iniciar el loop.
- Si el juego no viene de `references/started-games/` (se describe desde cero), pide
  al usuario esos mismos datos: tamaño de área de juego, mecánica principal, cómo sube
  el score, condición de fin de partida, controles.
- No leas ni copies el código del juego dentro de la spec — la spec describe el
  contrato (interfaces, pasos), no transcribe el `game.js` original.

## Fase 3 — Preguntas (bloques de 3 a 5, como `/spec`)

Bloque A — metadata para la tabla `games` (fila que se insertará en `/spec-impl`):

- `id` (slug en minúsculas, sin espacios — determina la carpeta del motor
  `components/games/<id>/` y la ruta `/juego/<id>`).
- `title`, `short` (descripción corta de tarjeta), `long` (descripción de detalle).
- `cat`: una de `ARCADE | PUZZLE | SHOOTER | VERSUS`.
- `color`: uno de `cyan | magenta | green | yellow` (color de acento en el catálogo).
- `cover`: nombre de la clase CSS de portada a usar/crear.

Bloque B — forma del estado del motor:

- Qué campos expone el estado del motor más allá de `score`/`lives`/`level`/`status`, y
  si tiene algún stat extra tipo power-up (como el triple disparo de asteroids) que deba
  verse en el HUD.
- Confirmar que `status` usa el mismo vocabulario (`"playing" | "dead" | "gameover"`,
  o el subconjunto que el juego necesite).
- A diferencia de Asteroids (que predata el registro y necesitó un componente adaptador
  en `registry.tsx` para traducir su `AsteroidsState` propio a `GameState`), el
  `<Juego>Canvas.tsx` de un juego nuevo debe llamar a `onStateChange` con la forma
  `GameState` de `registry.tsx` directamente (`score`, `lives`, `level`, `status`,
  `extraStats?: {label, value}[]`) — sin definir una interfaz de estado propia ni
  necesitar un adaptador.

Bloque C — controles e integración:

- Controles de teclado exactos (mapeo de teclas a acciones).
- Si hay pantalla de inicio antes de arrancar el loop (por convención, sí — igual que
  asteroids) y qué tecla la dispara.
- Si hay assets a mover a `public/` (imágenes, audio) y sus rutas propuestas.

Espera respuesta después de cada bloque antes de continuar.

## Fase 4 — Escribir `specs/NN-<slug>.md`

Sigue `template.md` sección por sección. Contenido mínimo esperado:

**Header**: `Status: Draft`, `Depends on: SPEC 05, SPEC 06`, fecha de hoy, objetivo en
una sola frase (ej. "Portar `<juego>` a un motor TypeScript integrado con leaderboard y
catálogo real, siguiendo el patrón de Asteroids").

**Scope → In**:

- `components/games/<juego>/engine.ts`: factory `create<Juego>Game(canvas,
onStateChange)`, interfaz `<Juego>Game` (`start/stop/restart/forceGameOver/destroy`),
  estado en closures, listeners de teclado agregados/quitados en `start`/`destroy`,
  loop con `dt` capado, `onStateChange` llamado en cada `update` con la forma
  `GameState` de `components/games/registry.tsx` (no una interfaz de estado propia —
  ver Bloque B).
- `components/games/<juego>/<Juego>Canvas.tsx`: wrapper `"use client"`,
  `forwardRef`+`useImperativeHandle` con `{pause,resume,restart,forceGameOver}`
  (tipo `GameCanvasHandle` de `registry.tsx`), guard StrictMode, overlay de inicio.
- Agregar la entrada `<juego>` al mapa `GAME_ENGINES` en `components/games/registry.tsx`
  (`Canvas: <Juego>Canvas, initialState: {...}`) — sin adaptador, porque el Canvas ya
  emite `GameState` directo. No se toca `GamePlayer.tsx`.
- Paso de plan que inserta la fila del juego en la tabla `games` vía
  `mcp__supabase__apply_migration` (o `execute_sql`), con los valores acordados en la
  Fase 3.

**Scope → Out of scope**: controles táctiles/móviles, sonido si el original no lo
tiene, auth/anti-cheat real, realtime, filtros de leaderboard por rango de tiempo —
mismo criterio que specs 05/06, a menos que el usuario pida explícitamente lo
contrario.

**Data model**: la interfaz TS del motor (`<Juego>Game`, con el estado tipado como
`GameState` de `registry.tsx` — no una interfaz propia) y la fila literal a insertar en
`games` (valores concretos del Bloque A, no placeholders).

**Implementation plan**: pasos numerados, cada uno dejando el sistema compilable
(`npm run build`) y verificable, terminando en un recorrido manual jugando una partida
completa en `/juego/<id>/jugar` — mismo nivel de detalle que el paso 5 de la spec 05 y
el paso 12 de la spec 06.

**Acceptance criteria**: checklist booleano — compilación limpia, fila sembrada en
`games`, ruta `/juego/<id>` y `/juego/<id>/jugar` funcionando, HUD reflejando estado
real, guardado de score llega a `/api/scores`, ningún otro juego cambia de
comportamiento.

**Decisions**: registra cualquier decisión sí/no relevante (ej. si se movieron assets a
`public/`).

**Risks**: solo si aplica — ej. carga asíncrona de spritesheet/audio antes de que el
loop arranque, o el mismo riesgo ya documentado en spec 05 sobre StrictMode
duplicando el loop.

Cierre: sección final "What is **not** in this spec" reforzando el scope out.

Guarda el archivo con `Write` en `specs/NN-<slug>.md`.

## Fase 5 — Cierre

Informa al usuario la ruta del spec generado y sugiere revisarlo/aprobarlo (cambiar
`Status` a `Approved`) antes de correr `/spec-impl NN-<slug>`. No ejecutes
`/spec-impl` vos mismo.

## Reglas duras

- Nunca crees `engine.ts`, `*.Canvas.tsx`, ni edites `registry.tsx`, ni ejecutes el
  `INSERT` en Supabase desde este skill — todo eso es trabajo de `/spec-impl`.
- Nunca transcribas el `game.js` original dentro de la spec; describe el contrato, no
  el código fuente completo.
- Si el usuario pide "hazlo ya, sin preguntas", recuérdale que una spec vaga produce
  código improvisado — igual que hace `/spec`.
