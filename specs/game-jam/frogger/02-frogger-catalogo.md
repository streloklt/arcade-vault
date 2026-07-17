# SPEC — Integración de Frogger en catálogo y leaderboard

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06, 01-frogger-motor
> **Fecha:** 2026-07-17
> **Objetivo:** Integrar Frogger al vault agregando la entrada `frogger` a `GAME_ENGINES`, renombrando el mock `ranaria` a `frogger` en la tabla `games` y reusando la portada `cover-rana`, sin persistencia nueva ni cambios en `GamePlayer.tsx`.

## Section 1 — Por qué este spec existe

El mock `ranaria` (sembrado en la tabla `games` por SPEC 06, con `title = 'RANARIA'`, `cover = 'cover-rana'`, `cat = 'ARCADE'`, `color = 'green'` y un `long` que describe cruzar carriles de coches y troncos en un río) es ya un placeholder de Frogger sin motor real. Este spec lo convierte en jugable siguiendo el patrón exacto de renombrado usado por Tetris (`caida` → `tetris`, SPEC 07) y Arkanoid (`bloque-buster` → `arkanoid`, SPEC 08): un `UPDATE` de la fila mock conservando `cat`/`color`/`cover`, más una entrada nueva en `GAME_ENGINES`. La jugabilidad y el contrato del motor están en `01-frogger-motor.md`; acá solo se cablea el motor ya definido al catálogo y al leaderboard existentes.

## Scope

**In:**

- Agregar la entrada `frogger` al mapa `GAME_ENGINES` en `components/games/registry.tsx`: `Canvas: FroggerCanvas, initialState: { score: 0, lives: 3, level: 1, status: "playing" }`, con el import de `FroggerCanvas` desde `components/games/frogger/FroggerCanvas`. Sin adaptador, porque `FroggerCanvas` ya emite `GameState` directo (definido en `01-frogger-motor.md`). No se toca `GamePlayer.tsx`.
- Renombrar la fila mock `ranaria` en la tabla `games` de Supabase (vía `mcp__supabase__apply_migration` o `execute_sql`): `UPDATE games SET id = 'frogger', title = 'FROGGER', short = ..., long = ... WHERE id = 'ranaria'`, conservando `cat = 'ARCADE'`, `color = 'green'` y `cover = 'cover-rana'` tal cual están hoy. Esto cambia la ruta real del juego de `/juego/ranaria/...` a `/juego/frogger/...`.
- Reusar la clase CSS `cover-rana` ya existente en `app/arcade.css` como portada de la tarjeta — no se crea una clase `cover-frogger` nueva, porque `cover-rana` ya representa una rana cruzando carriles.
- Guardado de puntaje vía el flujo existente `POST /api/scores` (SPEC 06), con `game_id: "frogger"` — sin persistencia nueva ni cambios en `lib/games.ts`, `lib/scores.ts` ni `app/api/scores/route.ts`.

**Out of scope (para specs futuros):**

- El motor, el wrapper canvas y toda la jugabilidad de Frogger — están en `01-frogger-motor.md`.
- Cualquier cambio a otros juegos del vault (`serpentina`, `gloton`, `invasores`, `asteroids`, `duelo-pixel`, `tetris`, `arkanoid`, `snake`) — siguen sin modificaciones.
- Crear una clase `cover-frogger` nueva o rediseñar `cover-rana`.
- Redirección desde la ruta antigua `/juego/ranaria/...` — sin tráfico real en producción, mismo criterio que specs 05/07/08.
- Cambios al copy/metadata de la fila más allá de `id`/`title`/`short`/`long` — `cat`/`color`/`cover` quedan igual.
- Controles táctiles/móviles, sonido, auth/anti-cheat real, realtime, filtros de leaderboard.

## Data model

Esta feature no introduce persistencia nueva (reutiliza `games`/`scores` de SPEC 06 vía `/api/scores`). No define contrato TS nuevo — el de `FroggerGame`/`GameState` está en `01-frogger-motor.md`.

Fila actualizada en `games` (valores concretos, no placeholders):

```sql
UPDATE games
SET id = 'frogger',
    title = 'FROGGER',
    short = 'Cruza la autopista y el río hasta las metas.',
    long = 'Guia a la rana a traves de una autopista de vehiculos y un rio de troncos y tortugas hasta ocupar los 5 nenufares. Esquiva el trafico, no caigas al agua y llega antes de que se acabe el tiempo.'
WHERE id = 'ranaria';
-- cat = 'ARCADE', color = 'green', cover = 'cover-rana' quedan sin cambios.
```

## Implementation plan

1. Renombrar la fila mock en Supabase vía `mcp__supabase__apply_migration`: `UPDATE games SET id='frogger', title='FROGGER', short=..., long=... WHERE id='ranaria'` (cat/color/cover sin cambios). Verificación: `execute_sql` con `select * from games where id='frogger'` devuelve la fila actualizada con `cover='cover-rana'`, `color='green'`, `cat='ARCADE'`; `select * from games where id='ranaria'` no devuelve filas.
2. Modificar `components/games/registry.tsx`: agregar el import de `FroggerCanvas` y la entrada `frogger: { Canvas: FroggerCanvas, initialState: { score: 0, lives: 3, level: 1, status: "playing" } }` al mapa `GAME_ENGINES`. No se toca `GamePlayer.tsx`. Verificación: `npm run build` compila; `npm run dev`, navegar a `/juego/frogger` y `/juego/frogger/jugar` sin errores 404.
3. Verificar que la tarjeta de Frogger en `/biblioteca` muestra la portada `cover-rana` (ya existente en `app/arcade.css`) y no el placeholder genérico. No requiere cambios de CSS. Verificación visual: la tarjeta muestra la portada de la rana cruzando carriles.
4. Recorrido end-to-end manual: navegar a `/juego/frogger` (detalle muestra portada, descripción nueva y leaderboard), entrar a `/juego/frogger/jugar` → overlay inicial → Espacio arranca el motor (definido en `01-frogger-motor.md`) → jugar una partida completa (cruzar autopista y río, ocupar nenúfares, subir de nivel, perder las 3 vidas) → se abre el modal "FIN DEL JUEGO" con el score real → guardar puntuación (llega a `POST /api/scores` con `game_id: "frogger"`, la fila aparece en `scores`) → "JUGAR DE NUEVO" reinicia limpio. Probar PAUSA (congela el loop) y FIN (fuerza el modal). Verificación: `npm run build` y `npm run lint` sin errores; recorrido sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `games` tiene la fila con `id = 'frogger'` (ya no `'ranaria'`), `title = 'FROGGER'`, y `cat = 'ARCADE'`, `color = 'green'`, `cover = 'cover-rana'` sin cambios en esos tres campos.
- [ ] `select * from games where id='ranaria'` no devuelve filas.
- [ ] `components/games/registry.tsx` tiene la entrada `frogger` en `GAME_ENGINES`; `components/GamePlayer.tsx` no fue modificado.
- [ ] `/juego/frogger` y `/juego/frogger/jugar` cargan sin errores 404.
- [ ] La tarjeta de Frogger en `/biblioteca` muestra la portada `cover-rana`, no el placeholder genérico.
- [ ] En `/juego/frogger/jugar`, el HUD superior refleja el estado real del motor (score/vidas/nivel + celdas "Metas" y "Tiempo" definidas en `01-frogger-motor.md`).
- [ ] Guardar puntuación desde el modal llama a `POST /api/scores` con `game_id: "frogger"` y la fila aparece en la tabla `scores`.
- [ ] "JUGAR DE NUEVO" reinicia el motor a estado limpio y vuelve a mostrar el overlay de inicio.
- [ ] Ningún otro juego del vault (`serpentina`, `gloton`, `invasores`, `asteroids`, `duelo-pixel`, `tetris`, `arkanoid`, `snake`) cambia de comportamiento.
- [ ] Desmontar la página (SALIR o navegar a otra ruta) no deja el loop de `requestAnimationFrame` corriendo en segundo plano.

## Decisions

- **Sí:** renombrar `ranaria` → `frogger` (`UPDATE`, no `INSERT` nuevo), conservando `cat`/`color`/`cover`. Confirmado con el usuario — mismo patrón que specs 07 (`caida`→`tetris`) y 08 (`bloque-buster`→`arkanoid`); evita una fila mock huérfana y el mock `ranaria` ya describe exactamente a Frogger.
- **Sí:** `title` pasa a "FROGGER" (nombre real) y `short`/`long` se reescriben para describir la mecánica confirmada por el usuario (autopista + río + nenúfares + timer).
- **No:** cambiar `cat`, `color` o `cover` — se mantienen `ARCADE`/`green`/`cover-rana` del mock actual. `cover-rana` ya es una rana cruzando carriles, así que no hace falta una portada nueva.
- **Sí:** reusar el color `green` aunque también lo use Snake — la taxonomía fija tiene solo 4 colores y la reutilización ya es la norma en el catálogo; se prioriza conservar el `color` del mock (mismo criterio que Tetris/Arkanoid, que conservaron el color de su mock). Se descartó la alternativa de `cyan` (propuesta previa del planner) por no justificar una desviación del patrón de renombrado ni tocar `cover`.
- **No:** redirección desde la ruta antigua `/juego/ranaria/...`. Confirmado — sin tráfico real en producción, mismo criterio que specs 05/07/08.
- **Sí:** guardado de score vía el `POST /api/scores` existente con `game_id: "frogger"`, sin persistencia nueva. Confirmado — el data layer ya es data-driven por `game.id` (SPEC 06).

## Risks

| Riesgo                                                                                                                                                                                                                                                                       | Mitigación                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renombrar `id` de `'ranaria'` a `'frogger'` rompe cualquier puntuación ya guardada en `scores` con `game_id='ranaria'` (si existiera) o enlaces a `/juego/ranaria/...`.                                                                                                      | Sin impacto real hoy — no hay usuarios ni datos reales en producción todavía. Mismo riesgo aceptado que specs 05/07/08.                                   |
| Este spec depende de que `01-frogger-motor.md` ya haya creado `components/games/frogger/FroggerCanvas.tsx`; agregar el import a `registry.tsx` antes de que ese archivo exista rompe el build.                                                                               | El orden de implementación es `01-frogger-motor` primero y `02-frogger-catalogo` después; el `Depende de` del header lo deja explícito.                   |
| Next.js 16.2.10/React 19.2.4 no son las versiones conocidas por el asistente; si `/spec-impl` termina tocando `app/juego/[id]/page.tsx` o el reproductor al integrar la ruta, debe verificar contra `node_modules/next/dist/docs/` en vez de asumir convenciones recordadas. | Recordatorio heredado de `AGENTS.md`. En la práctica este spec solo agrega una entrada a `GAME_ENGINES` y actualiza una fila de datos, sin tocar routing. |

## What is **not** in this spec

- El motor, el wrapper canvas y la jugabilidad de Frogger (van en `01-frogger-motor.md`).
- Una clase `cover-frogger` nueva o el rediseño de `cover-rana`.
- Redirección desde `/juego/ranaria/...`.
- Cambios a otros juegos del vault o al data layer (`lib/games.ts`, `lib/scores.ts`, `app/api/scores/route.ts`).
- Controles táctiles/móviles, sonido, auth/anti-cheat real, realtime, filtros de leaderboard.

Cada uno de esos, si se implementa, va en su propio spec.
