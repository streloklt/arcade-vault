# Ledger de sugerencias de juegos

Memoria persistente del agente `game-planner`. Cada corrida lee este archivo antes de
proponer un juego nuevo, para no repetir sugerencias ya hechas ni volver a plantear algo
descartado sin motivo nuevo.

**Formato por entrada:**

```
### <Juego>
- Categoría/Color propuestos: <cat> / <color>
- Fecha: <YYYY-MM-DD>
- Estado: propuesto | descartado | implementado
- Rationale: <por qué encaja / por qué se descartó>
```

Estados:

- `implementado` — ya existe en `components/games/registry.tsx` (`GAME_ENGINES`) y en la
  tabla `games` de Supabase.
- `propuesto` — recomendado por `game-planner` en alguna corrida, todavía sin spec ni
  implementación.
- `descartado` — evaluado y rechazado; el rationale explica por qué (no encaja en el
  patrón técnico, duplica mecánica, etc.).

---

## Sembrado inicial (juegos ya implementados)

### Tetris

- Categoría/Color propuestos: Puzzle / magenta
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 07). Bloques que caen, single-player, canvas, teclado, score por líneas.

### Asteroids

- Categoría/Color propuestos: Shooter / yellow
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 05). Primer juego del vault; estableció el patrón de motor factory + registro.

### Arkanoid

- Categoría/Color propuestos: Arcade / cyan
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 08). Paleta y pelota, 5 niveles, single-player, canvas, teclado.

### Snake

- Categoría/Color propuestos: Arcade / green
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 09). Clásico de grid, single-player, canvas, teclado.

## Corridas del planner

### Pong (vs CPU)

- Categoría/Color propuestos: VERSUS / yellow (reusa color; ya usado por Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Estrena la categoría `VERSUS`, hoy vacía, sin romper el criterio single-player: se juega contra una IA local (jugador vs CPU), sin netcode ni realtime. Motor factory de complejidad comparable a Arkanoid (paleta + pelota + rebotes), canvas 2D, controles de teclado (arriba/abajo). Score creciente por punto anotado contra la CPU, con game-over al llegar la CPU a N puntos → alimenta `/api/scores`. Solapamiento reconocido: la mecánica de paleta/pelota se parece a Arkanoid, pero el eje competitivo vs oponente activo es nuevo en el vault y el valor de llenar la única categoría libre lo justifica.

### Space Invaders

- Categoría/Color propuestos: SHOOTER / green
- Fecha: 2026-07-17
- Estado: descartado
- Rationale: Encaja técnicamente (single-player, canvas, teclado, score) y su mecánica de grid descendente + escudos es distinta a la fragmentación de Asteroids. Se descarta en esta corrida porque reusa la categoría SHOOTER (ya ocupada por Asteroids) y no llena ningún hueco de catálogo; Pong aporta más al abrir VERSUS. Reconsiderar en una corrida futura si el objetivo pasa a ser profundidad de catálogo por categoría.

### Frogger

- Categoría/Color propuestos: ARCADE / cyan
- Fecha: 2026-07-17
- Estado: descartado
- Rationale: Implementable con el patrón (movimiento en grid por carriles, single-player, teclado, score por avance). Se descarta porque cae en ARCADE, categoría ya con dos juegos (Arkanoid, Snake), y no aporta categoría ni eje de mecánica que Pong no cubra mejor esta corrida. Candidato válido para reflotar más adelante.

## Corrida masiva (4 lotes paralelos, 20 recomendaciones → 15 únicas tras dedupe)

Se pidieron 20 recomendaciones lanzando 4 instancias del agente en paralelo (5 c/u). Cinco ideas
surgieron de forma independiente en más de un lote (2048, Centipede, Lunar Lander, Light Cycles,
Neon Runner) — señal de convergencia, no error. Deduplicadas a 15 propuestas únicas.

### 2048

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Merge de fichas en grid 4x4, mecánica ausente (distinta de la caída de bloques de Tetris). Motor trivial, teclado direccional, score = suma de fusiones, game-over al llenarse el tablero sin movimientos. Sugerido de forma independiente por 2 lotes.

### Centipede

- Categoría/Color propuestos: SHOOTER / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Segundo shooter con eje distinto a Asteroids: enemigo segmentado que serpentea sobre campo destructible en vez de fragmentación inercial. Move+disparo, score creciente, game-over al contacto. Sugerido de forma independiente por 2 lotes.

### Light Cycles (Tron)

- Categoría/Color propuestos: VERSUS / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Refuerza VERSUS (hoy solo Pong) con mecánica de estela/grid: encerrar a la CPU sin chocar contra el propio rastro. Single-player vs IA local, teclado, score por rondas/segundos sobrevividos. Sugerido de forma independiente por 2 lotes.

### Lunar Lander

- Categoría/Color propuestos: ARCADE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Introduce física de thrust/gravedad, eje mecánico ausente en el catálogo. Canvas simple, teclado (rotar/empuje), score por aterrizajes + combustible restante, game-over al estrellarse. Sugerido de forma independiente por 2 lotes.

### Neon Runner

- Categoría/Color propuestos: ARCADE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Endless runner de un botón, género sin representación en el vault. Motor minimalista, 1-2 teclas, score = distancia, game-over inmediato al chocar. Sugerido de forma independiente por 2 lotes.

### Doodle Jump

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Vertical endless-jumper con scroll ascendente, mecánica inédita. Plataformas procedurales + gravedad, teclado izq/der, score = altura, game-over al caer fuera de pantalla.

### Tank Duel (vs CPU)

- Categoría/Color propuestos: VERSUS / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Alternativa a Pong/Light Cycles para VERSUS: combate top-down con cobertura y proyectiles en vez de paleta/pelota o estelas. Teclado (mover/rotar/disparar), score por impactos, single-player vs IA local.

### Neon Memory

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Simon de secuencias luminosas: mecánica de memoria/patrón, inédita frente a bloques, disparo, paleta o grid. Máquina de estados + timers, teclado, score = longitud máxima de secuencia.

### Stack Attack

- Categoría/Color propuestos: PUZZLE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Apilar-y-frenar por timing puro (distinto de Tetris pese a compartir "bloques": aquí el reto es precisión de reacción, no rotación/relleno de líneas). Motor mínimo, score = altura de torre.

### Meteor Dash

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Dodger de reacción sin disparo (a diferencia de Asteroids) ni rebote (a diferencia de Arkanoid). Canvas + teclado izq/der, score por tiempo sobrevivido.

### Tower Siege

- Categoría/Color propuestos: SHOOTER / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Tower-defense simplificado a un cañón fijo: defensa estática por oleadas, eje distinto a la fragmentación con inercia de Asteroids. Score por bajas/oleada, complejidad comparable a Arkanoid.

### Reflex Duel

- Categoría/Color propuestos: VERSUS / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Air hockey vs CPU: física de disco con rebote en 2 ejes, distinta del rebote 1D de Pong. Otra alternativa para poblar VERSUS con más profundidad.

### Gem Cascade

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Match-3 con swap de gemas y cascadas en cadena — mecánica de intercambio ausente en el vault (no es caída de bloques ni grid de recorrido). Cursor por teclado, score por combos contrarreloj.

### Minesweeper Blitz

- Categoría/Color propuestos: PUZZLE / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Buscaminas contrarreloj navegado por teclado (no mouse), eje de deducción lógica pura, inédito en el catálogo. Score por tableros resueltos y velocidad.

### Tower Ascent

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Climber vertical estilo Icy Tower, plataformeo con scroll ascendente y combos de salto. Física de salto simple, score por altura/combos.

### Maze Muncher

- Categoría/Color propuestos: ARCADE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Laberinto tipo Pac-Man con enemigos que persiguen (pathfinding simple) y power-pellet que invierte caza/huida — ausente en el ledger. Complejidad comparable a Snake/Arkanoid.

### Crate Runner

- Categoría/Color propuestos: PUZZLE / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Sokoban — empujar cajas en grid hasta sus marcas, lógica espacial distinta de toda la mecánica PUZZLE ya propuesta (merge, memoria, timing, match-3, deducción, caída). Motor trivial, score por niveles/eficiencia de movimientos.

### Skyguard

- Categoría/Color propuestos: SHOOTER / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Missile Command — intercepción por apuntado y timing de detonación, distinto de fragmentación (Asteroids), enemigo segmentado (Centipede) y cañón por oleadas (Tower Siege). Refuerza SHOOTER, la categoría más flaca entre lo propuesto.

### Neon Fighter

- Categoría/Color propuestos: VERSUS / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Combate melee 1v1 con combos/bloqueo/esquive vs CPU — eje nuevo dentro de VERSUS (hoy solo rebote, estela y proyectiles top-down). Score por daño y rounds ganados.

### Flood Claim

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Rationale: Captura de área estilo Qix — trazar recorridos para encerrar zonas esquivando un enemigo errante, mecánica de reclamo territorial inédita. Score por porcentaje reclamado.
