# SPEC 06 — Leaderboard y catálogo de juegos en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 04 (clientes Supabase), SPEC 05 (Asteroids ya guarda score vía `saveScore`)
> **Fecha:** 2026-07-14
> **Objetivo:** Reemplazar el catálogo estático de juegos (`lib/data.ts`) y los leaderboards simulados (`seededScores`) por dos tablas reales en Supabase (`games` y `scores`), conectando el guardado real de puntuaciones desde `GamePlayer` y la lectura real de catálogo/rankings en `/biblioteca`, `/juego/[id]` y `/salon`.

## Scope

**In:**

- Migración Supabase (vía MCP `apply_migration`) que crea:
  - Tabla `games` (`id` text PK, `title`, `short`, `long`, `cat`, `cover`, `color` — mismos campos que la interfaz `Game` actual, sin `best`/`plays`). RLS: `SELECT` público; sin política de escritura (la app nunca inserta/actualiza; se siembra en la misma migración con los 8 juegos actuales de `lib/data.ts`).
  - Tabla `scores` (`id` bigserial/uuid PK, `game_id` FK → `games.id`, `name` text, `score` bigint, `created_at` timestamptz default `now()`). RLS: `SELECT` público, `INSERT` público (sin service role — camino real de escritura es la Route Handler, pero la política no lo exige técnicamente, ya definido antes).
- `lib/data.ts`: se elimina el array estático `GAMES`, `PLAYERS`, `seededScores` y el tipo `ScoreRow`. Se conserva `CATS` (valores fijos de filtro, no dependen de datos).
- Nuevo módulo de acceso a datos (ej. `lib/games.ts` y `lib/scores.ts`) con funciones tipadas: `getGames()`, `getGame(id)` (incluyen `best`/`plays` calculados vía agregación sobre `scores`), `getTopScores(gameId, limit)`, `getRecentScores(limit)`, `getTopScoresAllGames(limit)` — usados tanto desde Server Components (browser/server client de Supabase según corresponda) como desde `/salon` (Client Component, vía cliente browser ya que `SELECT` es público).
- Nueva Route Handler `app/api/scores/route.ts` (`POST`): valida `game_id` (existe en `games`), `name` (no vacío), `score` (entero > 0, sin techo), inserta en `scores` con el cliente Supabase server-side.
- `components/GamePlayer.tsx`: el botón "GUARDAR PUNTUACIÓN" pasa a hacer `fetch("/api/scores", { method: "POST", ... })` en vez de `saveScore()` de `lib/storage.ts`.
- `lib/storage.ts`: se elimina `saveScore`, `getStoredScores` y `SCORES_KEY`. Las funciones de usuario mock (`getStoredUser`, `setStoredUser`, etc.) quedan intactas.
- `lib/types.ts`: se elimina `SavedScore`; se agregan tipos para las filas reales (`GameRow`/`Game`, `ScoreRow`) donde corresponda.
- `app/biblioteca/page.tsx`: pasa a ser Server Component async que hace `getGames()` y delega la interactividad de búsqueda/filtro (hoy `useState`) a un subcomponente cliente (ej. `BibliotecaFiltros.tsx`) que recibe los juegos ya cargados como prop.
- `app/juego/[id]/page.tsx`: reemplaza `GAMES.find` + `seededScores` por `getGame(id)` + `getTopScores(id, 10)` reales.
- `components/Leaderboard.tsx`: ajustado a la forma real de fila (`name`, `score`, `created_at` → formateado como fecha) manteniendo el mismo diseño visual.
- `app/salon/page.tsx`: reemplaza `GAMES`/`seededScores` por `getGames()` + `getTopScores(gameId, 12)` reales (vía cliente browser de Supabase). La sección "TU MEJOR MARCA" busca en los resultados reales el mayor `score` con `name` igual (case-insensitive) al usuario mock guardado en `localStorage`; si no hay coincidencia, esa sección no se muestra.
- `app/page.tsx`: el ticker "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES · HOY" pasan a usar `getRecentScores()`/`getTopScoresAllGames()` reales en vez de `seededScores`.
- Todas las tablas de leaderboard muestran las últimas/mejores filas de `scores` **sin deduplicar por jugador** (mismos límites que hoy: 10 en detalle, 12 en salón/portada) — un mismo `name` puede aparecer varias veces si tiene varias partidas altas.

**Out of scope (para specs futuros):**

- Autenticación real / vínculo `scores.user_id` ↔ Supabase Auth. `name` sigue siendo texto libre sin FK a usuario.
- Anti-cheat real (rate limiting, validación de que el score sea alcanzable, service role key). La política RLS de `INSERT` público en `scores` queda documentada como riesgo conocido.
- Migración de partidas ya guardadas en `localStorage` (`av_scores`) — se descartan.
- Agregar/editar/borrar juegos desde la UI (CRUD de `games`) — solo se siembra una vez vía migración; cualquier alta futura de un juego nuevo se hace manualmente vía MCP/dashboard.
- Filtros por rango de tiempo en los leaderboards (diario/semanal) — siempre "all-time".
- Realtime (suscripciones) — los leaderboards se consultan on-demand (al cargar la página / tab), sin actualización en vivo por WebSocket.
- Cambios a `components/GameCard.tsx` / `components/MiniCard.tsx` más allá de que sigan recibiendo el mismo shape de `Game` (sin `best`/`plays` como campos estáticos — estos ahora se resuelven vía `getGame`/`getGames`).

## Data model

```sql
-- games: catálogo de juegos, sembrado una vez en la migración con los 8 juegos actuales de lib/data.ts
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  created_at timestamptz not null default now()
);

alter table games enable row level security;
create policy "games_select_public" on games for select using (true);
-- Sin política de INSERT/UPDATE/DELETE: la tabla solo se modifica manualmente (MCP/dashboard).

-- scores: cada partida guardada por un jugador
create table scores (
  id bigint generated always as identity primary key,
  game_id text not null references games(id),
  name text not null,
  score bigint not null check (score > 0),
  created_at timestamptz not null default now()
);

alter table scores enable row level security;
create policy "scores_select_public" on scores for select using (true);
create policy "scores_insert_public" on scores for insert with check (true);
```

Tipos TypeScript nuevos (reemplazan la interfaz `Game` actual y el tipo `SavedScore` eliminado):

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number; // MAX(score) en scores para este game_id, 0 si no hay partidas
  plays: number; // COUNT(*) en scores para este game_id, número crudo (antes era string abreviado "12.4K")
}

export function getGames(): Promise<Game[]>;
export function getGame(id: string): Promise<Game | null>;

// lib/scores.ts
export interface ScoreRow {
  name: string;
  score: number;
  createdAt: string; // ISO, formateado a "DD/MM/YYYY" en el componente
}

export function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;
export function getRecentScores(
  limit: number,
): Promise<(ScoreRow & { game: Pick<Game, "id" | "title" | "color"> })[]>;
export function getTopScoresAllGames(limit: number): Promise<ScoreRow[]>;
```

`plays` deja de ser el string abreviado `"12.4K"` y pasa a ser un `number` crudo (`COUNT(*)`), mostrado con `toLocaleString("es-ES")` igual que `best`, ya que no hay miles de partidas reales todavía y abreviar un número real bajo (ej. "3") no aporta valor.

## Implementation plan

1. **Migración Supabase** (vía `mcp__supabase__apply_migration`): crear tablas `games` y `scores` con las políticas RLS de la sección anterior, e insertar (`INSERT`) los 8 juegos actuales de `lib/data.ts` (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`) con sus campos `title`/`short`/`long`/`cat`/`cover`/`color` tal cual existen hoy. Verificación: `mcp__supabase__list_tables` muestra ambas tablas; una `select * from games` devuelve las 8 filas.

2. **Crear `lib/games.ts`**: exporta `Game` (interfaz), `getGames()` y `getGame(id)`, usando el cliente Supabase server (`lib/supabase/server.ts`) con una consulta que traiga `games` y agregue `best`/`plays` desde `scores` (ej. vía una vista SQL `game_stats` o dos queries — a definir en el paso de implementación cuál es más simple con el esquema de arriba). Verificación: `npm run build` compila; el archivo no se usa todavía.

3. **Crear `lib/scores.ts`**: exporta `ScoreRow` y `getTopScores`, `getRecentScores`, `getTopScoresAllGames`, cada una ordenando por `score desc` (o `created_at desc` para "recientes") con el `limit` pedido, sin deduplicar por `name`. Verificación: `npm run build` compila.

4. **Crear `app/api/scores/route.ts`** (`POST`): lee `{ game_id, name, score }` del body, valida `game_id` existente en `games`, `name` no vacío (trim), `score` entero > 0; inserta con el cliente Supabase server y devuelve `201` con la fila creada o `400` con el error de validación. Verificación: `curl -X POST` manual contra `/api/scores` con datos válidos e inválidos, confirmar códigos de respuesta y que la fila aparece en `scores`.

5. **Modificar `components/GamePlayer.tsx`**: reemplazar la llamada a `saveScore()` por `fetch("/api/scores", { method: "POST", body: JSON.stringify({ game_id: game.id, name, score }) })`, manejando el estado `saved` igual que hoy (optimista, sin bloquear la UI mientras se envía). Verificación: jugar una partida, guardar puntuación, confirmar en Supabase (`execute_sql` o dashboard) que la fila se insertó.

6. **Limpiar `lib/storage.ts` y `lib/types.ts`**: eliminar `saveScore`, `getStoredScores`, `SCORES_KEY`, `SavedScore`. Verificación: `npm run build` sin errores de referencias rotas (confirma que nada más importaba estas funciones).

7. **Reescribir `lib/data.ts`**: eliminar `GAMES`, `PLAYERS`, `seededScores`, `ScoreRow` (ahora vive en `lib/scores.ts`); conservar solo `CATS`. Verificación: `npm run build` marcará todos los imports rotos a resolver en los siguientes pasos (esperado en este punto intermedio).

8. **Migrar `app/biblioteca/page.tsx` a Server Component async**: hace `await getGames()`, renderiza un nuevo Client Component `components/BibliotecaFiltros.tsx` (recibe `games: Game[]` como prop, contiene el `useState` de búsqueda/categoría y el `.av-grid`/`GameCard` que hoy vive en `page.tsx`). Verificación: `npm run dev`, navegar a `/biblioteca`, confirmar que los 8 juegos cargan desde Supabase y que buscar/filtrar sigue funcionando client-side.

9. **Migrar `app/juego/[id]/page.tsx`**: reemplazar `GAMES.find`/`seededScores` por `await getGame(id)` / `await getTopScores(id, 10)`; `notFound()` si `getGame` devuelve `null`. Ajustar `components/Leaderboard.tsx` para consumir `ScoreRow` real (`createdAt` formateado a `DD/MM/YYYY` en vez del `date` ya-formateado que traía `seededScores`). Verificación: `npm run dev`, navegar a `/juego/asteroids`, confirmar que "Mejor global"/"Partidas" y el leaderboard lateral muestran datos reales.

10. **Migrar `app/salon/page.tsx`**: sigue siendo Client Component; reemplaza el import de `GAMES` por un `getGames()` server-fetched pasado como prop desde un wrapper Server Component (o `useEffect` + cliente browser Supabase, a decidir por simplicidad), y usa `getTopScores(tab, 12)` real para las filas/podio. La sección "TU MEJOR MARCA" busca en esas filas la de mayor `score` con `name` igual (case-insensitive) al `user.name` de `getStoredUserSnapshot()`; si no hay coincidencia, no se renderiza esa sección. Verificación: `npm run dev`, navegar a `/salon`, cambiar de tab por juego, confirmar datos reales y que "TU MEJOR MARCA" aparece solo si el usuario mock tiene una fila real con ese nombre.

11. **Migrar `app/page.tsx`**: reemplazar `RECENT_SCORES`/`TOP_PLAYERS_TODAY` (basados en `seededScores`) por `getRecentScores(7)`/`getTopScoresAllGames(5)` reales, obtenidos en un Server Component wrapper que pasa los datos a la portada (hoy es enteramente `"use client"` por `useRouter`/`useReveal`; se separa la parte de datos del resto del componente interactivo). Verificación: `npm run dev`, navegar a `/`, confirmar que el ticker y "TOP JUGADORES · HOY" reflejan filas reales de `scores`.

12. **Recorrido end-to-end manual + verificación final**: `npm run build` y `npm run lint` sin errores. Jugar una partida completa en cualquier juego (idealmente Asteroids), guardar puntuación, y confirmar que aparece: (a) en el leaderboard de `/juego/[id]`, (b) en `/salon` bajo el tab correspondiente, (c) en el ticker de la portada, (d) que `best`/`plays` de esa `Game` en `/biblioteca` se actualizaron. Repetir con un `name` distinto para confirmar que "TU MEJOR MARCA" en `/salon` distingue jugadores.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] Existen las tablas `games` y `scores` en Supabase (`mcp__supabase__list_tables`), con las políticas RLS descritas (SELECT público en ambas, INSERT público solo en `scores`, sin política de escritura en `games`).
- [ ] `games` contiene exactamente las 8 filas sembradas (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`) con los mismos `title`/`short`/`long`/`cat`/`cover`/`color` que tenían en `lib/data.ts`.
- [ ] `lib/data.ts` ya no exporta `GAMES`, `PLAYERS`, `seededScores` ni `ScoreRow`; solo conserva `CATS`.
- [ ] `POST /api/scores` con `game_id` inexistente devuelve `400` y no inserta fila.
- [ ] `POST /api/scores` con `score` no entero, cero o negativo devuelve `400` y no inserta fila.
- [ ] `POST /api/scores` con datos válidos devuelve `201` y la fila aparece en `scores` vía `execute_sql`/dashboard.
- [ ] Jugar cualquier juego en `/juego/[id]/jugar`, guardar puntuación desde el modal "FIN DEL JUEGO", y ver que ya no se usa `localStorage` (`av_scores` no se escribe) — la puntuación llega solo vía `/api/scores`.
- [ ] `/biblioteca` carga los 8 juegos desde Supabase (Server Component), y el buscador/filtro de categoría sigue funcionando client-side sin regresión visual.
- [ ] `/juego/[id]` muestra "Mejor global" y "Partidas" calculados en tiempo real (`MAX(score)`/`COUNT(*)`) y el leaderboard lateral (`Leaderboard.tsx`) muestra hasta 10 filas reales ordenadas por score descendente.
- [ ] `/salon` muestra hasta 12 filas reales por juego seleccionado (tabs), ordenadas por score descendente, sin datos de `seededScores`.
- [ ] En `/salon`, la sección "TU MEJOR MARCA EN {JUEGO}" aparece solo si existe una fila en `scores` con `name` igual (case-insensitive) al usuario mock actual, mostrando su score real; no aparece si no hay coincidencia.
- [ ] La portada (`/`) muestra el ticker "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES · HOY" con datos reales de `scores` (vacío o con pocas filas es un resultado válido tras el seed).
- [ ] Guardar dos puntuaciones con `name` distinto para el mismo juego y confirmar que ambas aparecen como filas separadas en el leaderboard (sin deduplicar por jugador).
- [ ] Ningún archivo sigue importando `saveScore`, `getStoredScores`, `SavedScore` ni `seededScores` (búsqueda global sin resultados).

## Decisions

- **Sí:** `games` reemplaza al array estático `GAMES` de `lib/data.ts` como fuente de verdad. Confirmado con el usuario — evita mantener dos catálogos desincronizados.
- **Sí:** `best`/`plays` se calculan dinámicamente desde `scores` (`MAX`/`COUNT`) en vez de quedarse como valores estáticos de demo. Confirmado con el usuario.
- **Sí:** `/salon` y el leaderboard de `/juego/[id]` pasan a leer `scores` real en esta misma spec, en vez de dejarlo para un spec futuro. Confirmado con el usuario.
- **Sí:** las tablas y políticas RLS se crean vía el MCP de Supabase conectado (`apply_migration`) durante `/spec-impl`, no como un archivo SQL manual para que el usuario corra después.
- **Sí:** `INSERT` público en `scores` vía política RLS (sin service role key). Confirmado con el usuario — no hay auth real todavía, así que restringir con service role solo daría una falsa sensación de seguridad; la Route Handler es el camino convencional de la UI, no una barrera real.
- **No:** `games` no tiene política de escritura desde la app — solo lectura pública. Confirmado con el usuario; altas futuras de juegos se hacen manualmente vía MCP/dashboard.
- **No:** no se migran las partidas ya guardadas en `localStorage` (`av_scores`). Confirmado con el usuario — mismo criterio que SPEC 05, sin usuarios reales todavía.
- **Sí:** el ticker de la portada (`app/page.tsx`) también pasa a datos reales (`getRecentScores`/`getTopScoresAllGames`), en vez de quedar como mock aislado. Confirmado con el usuario tras plantear la alternativa.
- **Sí:** "TU MEJOR MARCA" en `/salon` se resuelve por coincidencia exacta (case-insensitive) de `name` contra el usuario mock en `localStorage`, sin vínculo real a una cuenta. Si no hay coincidencia, la sección simplemente no se muestra. Confirmado con el usuario.
- **No:** no se agrega auth real ni FK `scores.user_id` → Supabase Auth en este spec. Queda para un spec futuro.
- **Sí:** validación de `score` en el `POST /api/scores` es solo "entero > 0", sin techo artificial. Confirmado con el usuario — consistente con no tener anti-cheat real todavía; un techo fijo daría falsa sensación de protección.
- **Sí:** los leaderboards (`/juego/[id]`, `/salon`, portada) muestran todas las partidas guardadas sin deduplicar por jugador, manteniendo los mismos límites actuales (10/12). Confirmado con el usuario — un jugador puede ocupar varias filas si tiene varias partidas altas, igual que el comportamiento observable hoy con `seededScores`.
- **Sí:** `plays` pasa de string abreviado (`"12.4K"`) a `number` crudo mostrado con `toLocaleString`. Decisión técnica derivada de que los conteos reales serán bajos durante el desarrollo; no requiere abreviación todavía.
- **No:** sin filtros por rango de tiempo (diario/semanal) en ningún leaderboard — siempre "all-time". Fuera de alcance.
- **No:** sin realtime/suscripciones — los leaderboards se consultan on-demand al cargar cada página/tab.

## Risks

| Riesgo                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La política RLS de `INSERT` público en `scores` permite que cualquiera inserte puntuaciones falsas directamente contra la API de Supabase, sin pasar por `/api/scores` ni por el juego real.                                            | Aceptado como riesgo conocido — no hay usuarios reales ni anti-cheat en el alcance de este spec. Documentado explícitamente para retomarlo cuando exista auth real.                                              |
| Migrar `app/biblioteca/page.tsx`, `app/juego/[id]/page.tsx` y `app/page.tsx` a fetch de datos vía Supabase puede chocar con convenciones de data fetching/caching específicas de esta versión no estándar de Next.js (`next@16.2.10`).  | Por `AGENTS.md`, se debe leer `node_modules/next/dist/docs/` (fetching, caching, Server/Client Component boundaries) antes de escribir estos cambios en `/spec-impl`, en vez de asumir convenciones recordadas.  |
| Separar `app/salon/page.tsx` y `app/page.tsx` (hoy enteramente `"use client"`) en una parte de datos (server) y una parte interactiva (client) puede introducir un mismatch de hidratación o duplicar lógica si no se hace con cuidado. | El plan de implementación (pasos 10 y 11) aísla explícitamente la obtención de datos en un wrapper, dejando la interactividad existente (tabs, `useSyncExternalStore`, `useReveal`) sin tocar su lógica interna. |
| `best`/`plays` calculados vía agregación en cada carga de `/biblioteca` y `/juego/[id]` pueden volverse lentos si `scores` crece mucho (sin índice en `game_id`).                                                                       | Bajo riesgo en el alcance actual (proyecto sin tráfico real). Se puede agregar un índice sobre `scores(game_id)` en una migración futura si el volumen lo justifica; no se documenta como bloqueante ahora.      |
| Sin auth real, dos jugadores distintos pueden usar el mismo `name` (ej. ambos "PX_KAI"), lo que haría que "TU MEJOR MARCA" en `/salon` muestre el score de otra persona con el mismo nombre.                                            | Riesgo conocido y aceptado — mismo nivel de fidelidad que el mock actual (`getStoredUser().name` como único identificador). Se resolvería con auth real en un spec futuro.                                       |
