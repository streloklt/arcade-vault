# CLAUDE.md

Este archivo da guía a Claude Code (claude.ai/code) para tsrabajar en este repositorio y que siempre debe hablar en español.

@AGENTS.md

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntos. Ya no es un scaffold: tiene 5 juegos jugables (Tetris, Asteroids, Arkanoid, Snake, Frogger), catálogo y leaderboard sobre Supabase, auth, contacto por email (Resend), home/biblioteca/salón de la fama conectados a datos reales, controles táctiles para móvil, skins seleccionables por juego (clásico/neón/retro) y HUD/gamepad optimizados para performance.

Ver @JUEGOS.md para el detalle de cada juego implementado (categoría, color, descripción), extraído de la tabla `games` de Supabase.

## Crítico: versión no estándar de Next.js

`package.json` fija `next@16.2.10` / `react@19.2.4` — versiones posteriores a los datos de entrenamiento de este asistente. Según `AGENTS.md`, **leer la página correspondiente en `node_modules/next/dist/docs/` antes de escribir código de App Router** (routing, data fetching, caching, config) en vez de confiar en convenciones recordadas de Next.js, y seguir cualquier aviso de deprecación encontrado ahí.

## Comandos

- `npm run dev` — levanta servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — corre el build de producción
- `npm run lint` — ESLint (flat config en `eslint.config.mjs`, extiende `eslint-config-next` core-web-vitals + typescript)

Todavía no hay test runner configurado.

## Arquitectura

- App Router bajo `app/`: `page.tsx` (home), `biblioteca/`, `salon/` (salón de la fama), `juego/[id]/` y `juego/[id]/jugar/` (detalle y reproductor de cada juego), `auth/`, `acerca-de/`, `api/scores/` (registrar puntajes) y `api/contacto/` (envío de email vía Resend).
- Juegos en `components/games/<slug>/`: cada uno expone un motor `engine.ts` (factory con estado en closures, `start/stop/restart/forceGameOver/destroy`) + un wrapper React `<Slug>Canvas.tsx` (`forwardRef` + `useImperativeHandle`). `components/games/registry.tsx` mapea `id → { Canvas, initialState }` (`GAME_ENGINES`); `GamePlayer.tsx` resuelve por ese registro y nunca se toca al sumar un juego nuevo. Juegos implementados: Tetris, Asteroids, Arkanoid, Snake, Frogger.
- Skins: `components/games/skins.ts` fija el contrato compartido (`SkinId`: `clasico`/`neon`/`retro`, default `clasico`); cada `engine.ts` define su propia paleta por skin y expone `setSkin(id)`, seleccionable desde el HUD de `GamePlayer.tsx` y persistida en `lib/storage.ts` (`av_skin`). Los 5 juegos ya tienen sus 3 skins.
- Controles táctiles: `lib/useIsTouchDevice.ts` + `components/TouchControls.tsx` (D-pad + botones A/B, Pointer Events) se activan en dispositivos táctiles vía el campo `touchControls` de cada entrada de `registry.tsx`, sin tocar ningún `engine.ts`. Ver spec 10.
- Performance: `components/games/glowSprite.ts` cachea sprites con glow pre-renderizados (evita recalcular `shadowBlur`/`shadowColor` por frame) y los 5 engines deduplican `onStateChange`; `GamePlayer.tsx` actualiza el HUD numérico (score/lives/level) de forma imperativa vía refs en vez de `useState`. Ver spec 12.
- Datos: `lib/games.ts`, `lib/scores.ts` y `lib/data.ts` leen catálogo/puntajes desde Supabase (`lib/supabase/{client,server,middleware}.ts`); tabla `games` + tabla de scores respaldan biblioteca, salón de la fama y home.
- Estilos: Tailwind CSS v4 vía `@tailwindcss/postcss` (ver `postcss.config.mjs`), tokens de tema en `app/globals.css` con `@theme inline`, clases propias en `app/arcade.css`, dark mode vía `prefers-color-scheme`.
- Alias de path `@/*` → raíz del repo (`tsconfig.json`).
- TypeScript en modo strict.
- `specs/` guarda las specs numeradas (01–12) que documentan cada feature ya implementada, más `specs/game-jam/` (una spec por juego sumado vía el agente `game-jam`); `references/` guarda material de referencia (ledgers de los agentes, templates, assets) que no es código de producción.

## Flujo de Spec Driven Design

Este repo sigue desarrollo spec-driven usando los comandos `/spec` y `/spec-impl` del paquete de skills `Klerith/fernando-skills` (ver README.md):

```bash
npx skills@latest add Klerith/fernando-skills
```

Usar `/spec` para producir una spec antes de implementar una feature, luego `/spec-impl` para implementar contra esa spec.

## Skills

- Usa siempre `/frontend-design` para diseñar la interfaz de usuario.
- `/add-game` (`.claude/skills/add-game`): genera la spec de un juego nuevo (motor + leaderboard + catálogo) siguiendo el patrón de las specs 05/06, sin escribir código de producción. Úsalo antes de `/spec-impl` cuando se sume un juego jugable al vault.
- `/spec-impl-game` (`.claude/skills/spec-impl-game`): implementa la spec de un juego nuevo delegando en `/spec-impl` y, al terminar, encadena automáticamente `skin-designer` y luego `mobile-porter` (siempre en ese orden, nunca en paralelo) para el juego recién sumado. Usalo en vez de `/spec-impl` cuando la spec a implementar sea la de un juego jugable.
- `/graphify`: convierte el repo (o cualquier input) en un grafo de conocimiento persistente en `graphify-out/`; tratar cualquier pregunta sobre arquitectura/relaciones del código como consulta a ese grafo si ya existe.

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`): subagente que analiza la plataforma y recomienda el próximo juego a sumar (single-player, canvas, teclado, con score para leaderboard), evaluando encaje contra el catálogo actual y la categoría/color libres. Mantiene memoria de sugerencias previas (propuestas, descartadas, implementadas) en `references/game-suggestions-todo.md` para no repetirse; cada entrada guarda una `Descripción` del juego analizado (género, mecánica, controles), no el motivo de la decisión — el motivo se lo comunica al usuario en el cierre de cada corrida. Solo recomienda — no escribe specs ni código; el paso siguiente es correr `/add-game` con el juego elegido.
- **`game-jam`** (`.claude/agents/game-jam.md`): subagente que recibe el **nombre de un juego concreto** ya elegido por el usuario (y opcionalmente una breve descripción de su mecánica) y lo diseña para que encaje en el vault (single-player, canvas 2D, teclado, con score para leaderboard), escribiendo **un único spec completo** en `specs/game-jam/<game-id>.md` con el mismo template que las specs 07/08/09. Solo escribe specs — no toca `engine.ts`, `registry.tsx` ni Supabase; el paso siguiente es revisarlos/aprobarlos y correr `/spec-impl`.
- **`skin-designer`** (`.claude/agents/skin-designer.md`): subagente que, a diferencia de los anteriores, **sí edita código de producción**. Trabaja **un juego por corrida — solo el que el usuario nombre explícitamente**, nunca el catálogo completo de una vez, aplicándole al menos 3 skins seleccionables (`clasico` default, `neon`, `retro`) legibles en modo oscuro: crea el contrato compartido de skin (una sola vez), refactoriza los colores hardcodeados del `engine.ts` de ese juego a paletas por skin, agrega/reutiliza el selector en el HUD de `GamePlayer.tsx` y la persistencia en `lib/storage.ts`. Mantiene el ledger `references/game-skins-status.md` (qué juegos ya tienen skins y cuáles siguen en su look original) para no repetir ni perder de vista el estado del catálogo.
- **`mobile-porter`** (`.claude/agents/mobile-porter.md`): subagente que, como `skin-designer`, **sí edita código de producción**, pero acotado a layout y CSS responsive (`app/arcade.css`, `app/globals.css`, `app/layout.tsx`, estructura de componentes cliente). Trabaja **una zona por corrida — solo la que el usuario nombre** (home, biblioteca, salón, acerca-de, detalle de juego, auth, nav/footer global o el reproductor), tomando como referencia obligada la spec 10 (`specs/10-controles-tactiles-moviles.md`), que ya resolvió el responsive del reproductor de juegos. Nunca toca `engine.ts`, la resolución interna de los `<canvas>` ni lógica de juego. Mantiene el ledger `references/mobile-porter-status.md` (qué zonas del sitio ya están revisadas en móvil) para no repetir ni perder de vista el estado del responsive.
- **`game-performance-buster`** (`.claude/agents/game-performance-buster.md`): subagente que, como `skin-designer`/`mobile-porter`, **sí edita código de producción**, pero acotado a performance de render y emisión de estado. Recibe **el ID de un juego por corrida** (asteroids, tetris, arkanoid, snake, frogger) y audita/corrige su `engine.ts` contra los dos problemas ya resueltos por la spec 12 (`specs/12-performance-frames-y-glow.md`): glow recalculado por frame en vez de sprite cacheado (`components/games/glowSprite.ts`) y `onStateChange` emitido sin deduplicar contra el último estado. No mantiene ledger — cada corrida es autónoma.
