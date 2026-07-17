# Graph Report - .  (2026-07-17)

## Corpus Check
- 118 files · ~92,488 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 566 nodes · 791 edges · 49 communities (30 shown, 19 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.72)
- Token cost: 389,511 input · 68,732 output

## Community Hubs (Navigation)
- Rutas y páginas de la app
- Motor de referencia: Asteroids
- Conceptos y decisiones de diseño
- Specs de Supabase y auth
- Motor de referencia: Tetris
- Config TypeScript (libs)
- Plantillas HTML y spec portal visual
- Motor Asteroids (app)
- Layout raíz y autenticación
- Motor Snake (app)
- Dependencias del proyecto
- Configuración de linting
- Datos mock de plantillas
- Canvas Asteroids
- Motor Tetris (app)
- Skills y agentes Claude
- Motor Arkanoid (app)
- Sprites de frutas Snake
- Spritesheet Arkanoid (helpers)
- Props de canvas de juegos
- Ciclo de vida ArkanoidGame
- Ciclo de vida AsteroidsGame
- Página Acerca de
- Handle canvas Arkanoid
- Handle canvas Asteroids
- Handle canvas Tetris
- Middleware Supabase
- Workflows CI Tetris (referencia)
- App root (plantilla)
- Config ESLint
- MCP Supabase
- Config Next.js
- Config PostCSS
- Spritesheet Arkanoid (duplicado)
- READMEs juegos de referencia
- Icono file.svg
- Icono globe.svg
- Icono next.svg
- Icono vercel.svg
- Icono window.svg
- Favicon Asteroids (referencia)
- Comando /clima (Tetris referencia)

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `SPEC 06 — Leaderboard y catálogo de juegos en Supabase` - 15 edges
3. `SPEC 01 — Portal visual de Arcade Vault` - 14 edges
4. `GameState` - 11 edges
5. `update()` - 11 edges
6. `createClient()` - 10 edges
7. `Arkanoid CLAUDE.md` - 10 edges
8. `SPEC 05 — Integrar Asteroids en el vault` - 10 edges
9. `Game` - 8 edges
10. `getGames()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Spritesheet Breakout (Arkanoid reference)` --semantically_similar_to--> `Breakout/Arkanoid Sprite Sheet`  [INFERRED] [semantically similar]
  references/started-games/04-arkanoid/assets/spritesheet-breakout.png → public/games/arkanoid/spritesheet-breakout.png
- `POST()` --calls--> `createClient()`  [EXTRACTED]
  app/api/scores/route.ts → lib/supabase/server.ts
- `Home()` --calls--> `getGames()`  [EXTRACTED]
  app/biblioteca/page.tsx → lib/games.ts
- `GamePlayerPage()` --calls--> `getGame()`  [EXTRACTED]
  app/juego/[id]/jugar/page.tsx → lib/games.ts
- `HallOfFamePage()` --calls--> `getGames()`  [EXTRACTED]
  app/salon/page.tsx → lib/games.ts

## Import Cycles
- 3-file cycle: `components/games/registry.tsx -> components/games/tetris/TetrisCanvas.tsx -> components/games/tetris/engine.ts -> components/games/registry.tsx`
- 3-file cycle: `components/games/registry.tsx -> components/games/snake/SnakeCanvas.tsx -> components/games/snake/engine.ts -> components/games/registry.tsx`

## Hyperedges (group relationships)
- **Spec-driven design workflow (/spec -> template -> /spec-impl, extended by /add-game)** — agents_skills_spec_skill_speccommand, agents_skills_spec_impl_skill_specimplcommand, agents_skills_spec_template_spectemplate, claude_skills_add_game_skill_addgamecommand [EXTRACTED 1.00]
- **Claude Code GitHub Actions automation (review, triage, @claude mention)** — references_started_games_03_tetris_github_workflows_claude_code_review_claudecodereviewworkflow, references_started_games_03_tetris_github_workflows_claude_issue_triage_claudeissuetriageworkflow, references_started_games_03_tetris_github_workflows_claude_claudeworkflow [EXTRACTED 1.00]
- **Asteroids reference game project (docs + entrypoint)** — references_started_games_02_asteroids_claude_asteroidsarchitecture, references_started_games_02_asteroids_readme_asteroidsreadme, references_started_games_02_asteroids_index_asteroidsindexhtml [EXTRACTED 1.00]
- **Spec-driven design workflow (spec + spec-impl + template)** — references_started_games_04_arkanoid_agents_skills_spec_skill, references_started_games_04_arkanoid_agents_skills_spec_impl_skill, references_started_games_04_arkanoid_agents_skills_spec_template [INFERRED 0.85]
- **Level system spec, concept and levels.js data** — references_started_games_04_arkanoid_specs_03_sonidos_y_niveles, concept_level_system, references_started_games_04_arkanoid_levels [INFERRED 0.80]
- **Block destruction feedback: explosion + sound + game.js** — concept_explosion_animation, concept_sound_effects, references_started_games_04_arkanoid_game [INFERRED 0.75]
- **Game engine factory + GAME_ENGINES registry pattern across Asteroids/Tetris/Arkanoid/Snake** — specs_05_asteroids_engine_ts, specs_07_tetris_engine_ts, specs_08_arkanoid_engine_ts, specs_09_snake_engine_ts, specs_07_tetris_registry [EXTRACTED 0.90]
- **Supabase games/scores tables feeding catalog, detail, salon and homepage leaderboard reads** — specs_06_leaderboard_y_catalogo_supabase_games_table, specs_06_leaderboard_y_catalogo_supabase_scores_table, specs_06_leaderboard_y_catalogo_supabase_lib_games_ts, specs_06_leaderboard_y_catalogo_supabase_lib_scores_ts, specs_06_leaderboard_y_catalogo_supabase_api_scores_route [EXTRACTED 0.90]
- **Rename existing mock game row (id/title) to real ported game across specs 05/07/08** — specs_05_asteroids_id_rename, specs_07_tetris_caida_rename, specs_08_arkanoid_bloque_buster_rename [EXTRACTED 0.90]

## Communities (49 total, 19 thin omitted)

### Community 0 - "Rutas y páginas de la app"
Cohesion: 0.08
Nodes (29): POST(), Home(), GamePlayerPage(), GameDetailPage(), Home(), HallOfFamePage(), BibliotecaFiltros(), GameCard() (+21 more)

### Community 1 - "Motor de referencia: Asteroids"
Cohesion: 0.07
Nodes (28): Asteroid, Bullet, canvas, ctx, dist(), draw(), drawHUD(), drawLifeIcon() (+20 more)

### Community 2 - "Conceptos y decisiones de diseño"
Cohesion: 0.07
Nodes (37): Block explosion animation mechanism (150ms, 4-frame, per-block, no collision limit), 5-level system with cumulative +10% ball speed per level, Pause overlay with numbered level-select buttons (P/Escape), Sound effects via cloneNode().play() for overlapping bounce/break sounds, Spec-driven development workflow, Spec state machine (Draft to Approved to Implemented/Obsolete), /spec-impl skill command, /spec skill command (+29 more)

### Community 3 - "Specs de Supabase y auth"
Cohesion: 0.08
Nodes (43): Página Auth (/auth), lib/storage.ts (localStorage mock persistence), SPEC 04 — Cliente Supabase (browser + SSR), lib/supabase/client.ts, lib/supabase/middleware.ts (updateSession), Rationale: read node_modules/next/dist/docs before App Router code (non-standard Next version), proxy.ts (root, replaces middleware.ts), lib/supabase/server.ts (+35 more)

### Community 4 - "Motor de referencia: Tetris"
Cohesion: 0.08
Nodes (39): canvas, clearLines(), collide(), COLORS, createBoard(), ctx, draw(), drawBlock() (+31 more)

### Community 5 - "Config TypeScript (libs)"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 6 - "Plantillas HTML y spec portal visual"
Cohesion: 0.09
Nodes (28): Arcade Vault.html (template entry), arcade-vault-standalone.html (Home/About bundled prototype), SPEC 01 — Portal visual de Arcade Vault, app/arcade.css (ported styles.css), Página Biblioteca (/), Página Detalle de juego (/juego/[id]), Game interface (lib/data.ts), GAMES array (+20 more)

### Community 7 - "Motor Asteroids (app)"
Cohesion: 0.09
Nodes (8): Asteroid, Bullet, Particle, PowerUp, rand(), randInt(), Ship, wrap()

### Community 8 - "Layout raíz y autenticación"
Cohesion: 0.15
Nodes (16): AuthPage(), metadata, FontPreconnect(), getServerUserSnapshot(), Nav(), formatDate(), getServerUserSnapshot(), SalonClient() (+8 more)

### Community 9 - "Motor Snake (app)"
Cohesion: 0.11
Nodes (12): ActiveFruit, createSnakeGame(), KEY_DIRECTIONS, SnakeGame, Vec2, COMMON_FRUITS, FRUIT_ATLAS, FruitSprite (+4 more)

### Community 10 - "Dependencias del proyecto"
Cohesion: 0.09
Nodes (20): next, dependencies, next, react, resend, @supabase/ssr, @supabase/supabase-js, name (+12 more)

### Community 11 - "Configuración de linting"
Cohesion: 0.11
Nodes (19): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prettier, tailwindcss, @tailwindcss/postcss (+11 more)

### Community 12 - "Datos mock de plantillas"
Cohesion: 0.12
Nodes (8): CATS, GAMES, PLAYERS, GameDetail(), Home(), useReveal(), GamePlayer(), HallOfFame()

### Community 13 - "Canvas Asteroids"
Cohesion: 0.21
Nodes (10): AsteroidsCanvas, AsteroidsCanvasProps, AsteroidsState, createAsteroidsGame(), POINTS, RADII, SPEEDS, AsteroidsAdapter (+2 more)

### Community 14 - "Motor Tetris (app)"
Cohesion: 0.16
Nodes (7): COLORS, createTetrisGame(), LINE_SCORES, Piece, PIECES, TetrisGame, TetrisCanvas

### Community 15 - "Skills y agentes Claude"
Cohesion: 0.23
Nodes (13): "This is NOT the Next.js you know" rule, Approved-state gate (Phase 2 of /spec-impl), /spec-impl command, /spec command, Spec template, Arcade Vault project guidance (CLAUDE.md), /add-game command, GAME_ENGINES registry pattern (+5 more)

### Community 16 - "Motor Arkanoid (app)"
Cohesion: 0.17
Nodes (11): Ball, BLOCK_SPRITES, Explosion, EXPLOSION_FRAMES, GameBlock, LevelBlockDef, LevelDef, LEVELS (+3 more)

### Community 17 - "Sprites de frutas Snake"
Cohesion: 0.29
Nodes (7): Flat/Emoji-style Fruit Icons Row, Pixel-Art Fruit Icons Row, Realistic/Photo-style Fruit Icons Row, Snake Game Fruits Sprite Sheet (fruits.png), SnakeCanvas Component, Snake Game, Snake Game Engine / Fruit Logic

### Community 18 - "Spritesheet Arkanoid (helpers)"
Cohesion: 0.29
Nodes (3): EXPLOSION_FRAMES, SPRITES, ssCallbacks

### Community 19 - "Props de canvas de juegos"
Cohesion: 0.40
Nodes (5): ArkanoidCanvas, ArkanoidCanvasProps, createArkanoidGame(), GameState, TetrisCanvasProps

### Community 22 - "Página Acerca de"
Cohesion: 0.50
Nodes (3): AcercaDePage(), HIGHLIGHTS, useReveal()

### Community 26 - "Middleware Supabase"
Cohesion: 0.60
Nodes (3): updateSession(), config, proxy()

### Community 27 - "Workflows CI Tetris (referencia)"
Cohesion: 1.00
Nodes (3): Claude Code (@claude mention) workflow, Claude Code Review workflow, Claude Issue Triage workflow

## Knowledge Gaps
- **151 isolated node(s):** `supabase`, `HIGHLIGHTS`, `metadata`, `FEATURES`, `SpriteFrame` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Dependencias del proyecto` to `Layout raíz y autenticación`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `react-dom` connect `Layout raíz y autenticación` to `Dependencias del proyecto`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `supabase`, `HIGHLIGHTS`, `metadata` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rutas y páginas de la app` be split into smaller, more focused modules?**
  _Cohesion score 0.0815686274509804 - nodes in this community are weakly interconnected._
- **Should `Motor de referencia: Asteroids` be split into smaller, more focused modules?**
  _Cohesion score 0.07030527289546716 - nodes in this community are weakly interconnected._
- **Should `Conceptos y decisiones de diseño` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._
- **Should `Specs de Supabase y auth` be split into smaller, more focused modules?**
  _Cohesion score 0.0753045404208195 - nodes in this community are weakly interconnected._