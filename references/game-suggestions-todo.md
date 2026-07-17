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
- Descripción: <qué es el juego y cómo se juega — género, mecánica central, controles>
```

Estados:

- `implementado` — ya existe en `components/games/registry.tsx` (`GAME_ENGINES`) y en la
  tabla `games` de Supabase.
- `propuesto` — recomendado por `game-planner` en alguna corrida, todavía sin spec ni
  implementación.
- `descartado` — evaluado y rechazado; el motivo del descarte se comunica al usuario en
  el cierre de esa corrida, no queda escrito acá.

---

## Sembrado inicial (juegos ya implementados)

### Tetris

- Categoría/Color propuestos: Puzzle / magenta
- Fecha: 2026-07-17
- Estado: implementado
- Descripción: Bloques que caen sobre un tablero vertical; el jugador los rota y desplaza con el teclado para completar líneas horizontales antes de que el tablero se llene. Incluye ghost piece para previsualizar la caída.

### Asteroids

- Categoría/Color propuestos: Shooter / yellow
- Fecha: 2026-07-17
- Estado: implementado
- Descripción: Nave triangular en vacío absoluto, controlada por rotación e impulso inercial. Dispara para fragmentar rocas en pedazos cada vez más pequeños; enemigos OVNI aparecen como amenaza adicional.

### Arkanoid

- Categoría/Color propuestos: Arcade / cyan
- Fecha: 2026-07-17
- Estado: implementado
- Descripción: Paleta horizontal que rebota una pelota para destruir bloques distribuidos en 5 niveles. Se pierde una vida si la pelota cae al fondo; game-over a las 3 vidas perdidas o al completar el nivel 5.

### Snake

- Categoría/Color propuestos: Arcade / green
- Fecha: 2026-07-17
- Estado: implementado
- Descripción: Serpiente que se mueve en grid, guiada con teclado, comiendo frutas que la hacen crecer. Termina al chocar contra los bordes o contra su propia cola.

## Corridas del planner

### Pong (vs CPU)

- Categoría/Color propuestos: VERSUS / yellow (reusa color; ya usado por Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Pong clásico, jugador vs IA local. Cada jugador mueve una paleta vertical con teclado (arriba/abajo) para devolver una pelota que rebota en los bordes superior e inferior. Se anota punto cuando el rival no llega a la pelota; game-over al llegar la CPU a N puntos.

### Space Invaders

- Categoría/Color propuestos: SHOOTER / green
- Fecha: 2026-07-17
- Estado: descartado
- Descripción: Formación de enemigos que desciende en grid mientras se desplaza lateralmente, con escudos destructibles como cobertura. El jugador controla una nave fija en la base que dispara hacia arriba; game-over si un enemigo llega al fondo o impacta al jugador.

### Frogger

- Categoría/Color propuestos: ARCADE / cyan
- Fecha: 2026-07-17
- Estado: descartado
- Descripción: Movimiento en grid por carriles: la rana avanza esquivando tráfico y cruzando troncos/plataformas en un río, sin caer al agua ni ser atropellada. Score por avance hacia la meta.

## Corrida masiva (4 lotes paralelos, 20 recomendaciones → 15 únicas tras dedupe)

Se pidieron 20 recomendaciones lanzando 4 instancias del agente en paralelo (5 c/u). Cinco ideas
surgieron de forma independiente en más de un lote (2048, Centipede, Lunar Lander, Light Cycles,
Neon Runner) — señal de convergencia, no error. Deduplicadas a 15 propuestas únicas.

### 2048

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Juego de merge en grid 4x4: se deslizan todas las fichas con el teclado direccional y las de igual valor se fusionan sumando su número. Score = suma de fusiones; game-over al llenarse el tablero sin movimientos posibles.

### Centipede

- Categoría/Color propuestos: SHOOTER / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Shooter de nave fija en la base que dispara hacia arriba contra un ciempiés segmentado que serpentea descendiendo por un campo de hongos destructible. Score creciente por segmento eliminado; game-over al contacto con el enemigo.

### Light Cycles (Tron)

- Categoría/Color propuestos: VERSUS / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Duelo de motos de luz vs IA local sobre un grid: cada moto deja una estela permanente y pierde quien choca contra cualquier estela (propia o rival) o contra el borde. Score por rondas o segundos sobrevividos.

### Lunar Lander

- Categoría/Color propuestos: ARCADE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Simulación de aterrizaje con física de gravedad y empuje: el jugador rota y acciona el propulsor con teclado para posar la nave suavemente en una plataforma con combustible limitado. Score por aterrizajes logrados y combustible restante; game-over al estrellarse.

### Neon Runner

- Categoría/Color propuestos: ARCADE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Endless runner de scroll lateral automático con 1-2 teclas (saltar/agachar) para esquivar obstáculos. Score = distancia recorrida; game-over inmediato al chocar.

### Doodle Jump

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Jumper vertical con scroll ascendente: el personaje rebota automáticamente sobre plataformas generadas de forma procedural, moviéndose izquierda/derecha con teclado. Score = altura alcanzada; game-over al caer fuera de pantalla.

### Tank Duel (vs CPU)

- Categoría/Color propuestos: VERSUS / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Combate top-down de tanques contra IA local, con obstáculos de cobertura en el mapa. Controles de teclado para mover, rotar torreta y disparar proyectiles; score por impactos acertados.

### Neon Memory

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Juego de memoria tipo Simon: se reproduce una secuencia de paneles luminosos y el jugador debe repetirla con teclado; cada ronda agrega un paso. Score = longitud máxima de secuencia alcanzada.

### Stack Attack

- Categoría/Color propuestos: PUZZLE / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Apilado por timing puro: un bloque se desplaza de lado a lado y el jugador lo suelta con una tecla para apilarlo alineado sobre el anterior; el desborde recorta el bloque. Score = altura de la torre.

### Meteor Dash

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Dodger de reacción sin disparo ni rebote: meteoritos caen desde arriba y el jugador se desplaza izquierda/derecha con teclado para esquivarlos. Score por tiempo sobrevivido.

### Tower Siege

- Categoría/Color propuestos: SHOOTER / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Tower-defense simplificado a un cañón fijo que apunta y dispara con teclado contra oleadas de enemigos que avanzan hacia él. Score por bajas por oleada; game-over si una oleada llega al cañón.

### Reflex Duel

- Categoría/Color propuestos: VERSUS / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Air hockey vs IA local: un disco rebota en los cuatro bordes de la mesa y cada jugador mueve su paleta con teclado para devolverlo hacia el arco rival. Score por goles anotados.

### Gem Cascade

- Categoría/Color propuestos: PUZZLE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Match-3 con cursor de teclado: se intercambian gemas adyacentes en un grid para formar líneas de 3+ del mismo color, que se eliminan y provocan cascadas encadenadas. Score por combos, contrarreloj.

### Minesweeper Blitz

- Categoría/Color propuestos: PUZZLE / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Buscaminas navegado enteramente con teclado (cursor + revelar/marcar) contra reloj. Score por tableros resueltos y velocidad de resolución.

### Tower Ascent

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Climber vertical estilo Icy Tower: el personaje salta entre plataformas con scroll ascendente, acumulando combos por saltos consecutivos sin tocar el suelo. Score por altura y combos.

### Maze Muncher

- Categoría/Color propuestos: ARCADE / cyan (reusa; Arkanoid)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Laberinto tipo Pac-Man: el jugador recorre un grid comiendo pellets mientras esquiva enemigos con pathfinding simple que lo persiguen; un power-pellet invierte temporalmente caza y huida. Score por pellets comidos.

### Crate Runner

- Categoría/Color propuestos: PUZZLE / green (reusa; Snake)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Sokoban: el jugador empuja cajas en un grid con teclado hasta ubicarlas sobre marcas objetivo, sin poder tirar de ellas. Score por niveles completados y eficiencia de movimientos.

### Skyguard

- Categoría/Color propuestos: SHOOTER / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Missile Command: el jugador apunta y detona intercepciones con timing para destruir misiles descendentes antes de que impacten ciudades defendidas en la base de la pantalla. Score por misiles interceptados.

### Neon Fighter

- Categoría/Color propuestos: VERSUS / yellow (reusa; Asteroids)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Combate melee 1v1 vs IA local con combos, bloqueo y esquive controlados por teclado. Score por daño infligido y rounds ganados.

### Flood Claim

- Categoría/Color propuestos: ARCADE / magenta (reusa; Tetris)
- Fecha: 2026-07-17
- Estado: propuesto
- Descripción: Captura de área estilo Qix: el jugador traza líneas desde el borde de una zona reclamada para encerrar territorio nuevo, esquivando un enemigo errante que lo elimina al tocar la línea en trazo. Score por porcentaje de área reclamada.
