# Arcade Vault

Plataforma para jugar online y competir por la mayor cantidad de puntos: catálogo de juegos, salón de la fama y leaderboard sobre Supabase.

## Juegos

| Juego     | Categoría | Descripción                                                      |
| --------- | --------- | ---------------------------------------------------------------- |
| Tetris    | Puzzle    | Encaja las piezas antes de que se acumulen. Incluye ghost piece. |
| Asteroids | Shooter   | Pulveriza asteroides en gravedad cero.                           |
| Arkanoid  | Arcade    | Rebota la pelota y destruye muros de neón.                       |
| Snake     | Arcade    | Comé frutas y crecé sin chocar con vos mismo.                    |
| Frogger   | Arcade    | Cruzá tráfico y río sin que te atropellen ni te ahogues.         |

Detalle completo de cada juego en [`JUEGOS.md`](./JUEGOS.md).

Cada juego es jugable con teclado y con controles táctiles en pantallas móviles (D-pad + botones A/B), y expone 3 skins seleccionables (clásico, neón, retro) desde el HUD.

## Stack

- [Next.js](https://nextjs.org/) 16.2.10 (App Router) + [React](https://react.dev/) 19.2.4
- TypeScript en modo strict
- [Tailwind CSS](https://tailwindcss.com/) v4 (`@tailwindcss/postcss`)
- [Supabase](https://supabase.com/) — catálogo de juegos, puntajes y autenticación
- [Resend](https://resend.com/) — envío de emails de contacto

> **Nota:** este proyecto fija `next@16.2.10` / `react@19.2.4`, versiones posteriores a las convenciones estándar documentadas públicamente. Antes de tocar código de App Router, revisar `node_modules/next/dist/docs/` y respetar cualquier aviso de deprecación encontrado ahí.

## Requisitos previos

- Node.js
- Un proyecto de [Supabase](https://supabase.com/) (URL + anon key)
- Una API key de [Resend](https://resend.com/) para el formulario de contacto

## Instalación

```bash
git clone <url-del-repo>
cd 05-arcade-vault
npm install
cp .env.example .env.local
```

Completar `.env.local` con:

```bash
RESEND_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Levantar el servidor de desarrollo:

```bash
npm run dev
```

## Scripts disponibles

| Comando         | Descripción                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `npm run dev`   | Servidor de desarrollo                                                  |
| `npm run build` | Build de producción                                                     |
| `npm run start` | Corre el build de producción                                            |
| `npm run lint`  | ESLint (flat config, `eslint-config-next` core-web-vitals + typescript) |

Todavía no hay test runner configurado.

## Estructura del proyecto

```
app/                    # App Router: home, biblioteca, salón de la fama, juego/[id], auth, api/scores, api/contacto
components/games/       # Un directorio por juego: engine.ts + <Slug>Canvas.tsx + registry.tsx (GAME_ENGINES) + skins.ts + glowSprite.ts
components/             # TouchControls.tsx, GamePlayer.tsx, Nav.tsx, etc.
lib/                    # games.ts, scores.ts, data.ts (Supabase), storage.ts, useIsTouchDevice.ts, supabase/{client,server,middleware}.ts
specs/                  # Specs numeradas (01–12) de cada feature ya implementada, más specs/game-jam/ por juego sumado
references/             # Ledgers de los agentes y material de referencia (no es código de producción)
```

Cada juego expone un motor (`engine.ts`, factory con estado en closures y `start/stop/restart/forceGameOver/destroy`) y un wrapper React (`forwardRef` + `useImperativeHandle`). `components/games/registry.tsx` mapea `id → { Canvas, initialState }`; `GamePlayer.tsx` resuelve por ese registro y no se toca al sumar un juego nuevo. Todos los juegos soportan controles táctiles (D-pad + A/B) y 3 skins seleccionables (clásico, neón, retro) persistidas en `localStorage`.

## Desarrollo spec-driven

Este repo sigue desarrollo spec-driven con los comandos `/spec` y `/spec-impl` del paquete de skills [`Klerith/fernando-skills`](https://github.com/Klerith/fernando-skills):

```bash
npx skills@latest add Klerith/fernando-skills
```

Usar `/spec` para producir una spec antes de implementar una feature, y `/spec-impl` para implementarla contra esa spec. Para sumar un juego nuevo, usar primero `/add-game` (genera la spec siguiendo el patrón de las specs 05/06).
