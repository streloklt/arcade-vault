# SPEC — Motor y jugabilidad de Frogger

> **Estado:** Draft
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-07-17
> **Objetivo:** Diseñar el motor TypeScript de Frogger (`components/games/frogger/engine.ts` + `FroggerCanvas.tsx`) que emite `GameState` directo al registro de juegos, con movimiento en grid por carriles, tráfico, río con plataformas, vidas, timer y score, siguiendo el patrón de motor de Tetris/Arkanoid/Snake.

## Section 1 — Por qué este spec existe

Frogger no viene de `references/started-games/` — no hay un `game.js` a portar. Se diseña desde cero a partir de la mecánica que dio el usuario (movimiento en grid por carriles, esquivar tráfico y cruzar troncos/plataformas en un río, sin caer al agua ni ser atropellado, score por avance hacia la meta) más el conocimiento del Frogger clásico. Este spec fija el contrato del motor y la jugabilidad; el spec `02-frogger-catalogo.md` cubre la integración con el registro, el catálogo Supabase y el leaderboard. Cada uno es aprobable por separado.

## Scope

**In:**

- `components/games/frogger/engine.ts`: factory `createFroggerGame(canvas, onStateChange)` que devuelve `FroggerGame` (`start/stop/restart/forceGameOver/destroy`). Todo el estado (posición de la rana en píxeles, fila más avanzada alcanzada en el viaje actual, configuración y posiciones de vehículos por carril, plataformas del río por carril, slots de meta ocupados, score, vidas, nivel, timer restante) vive en closures dentro de la factory, sin variables globales de módulo.
- Grid de juego: celda de 40px, 15 columnas × 13 filas, canvas de 600×520px. Origen arriba-izquierda. Distribución de filas (de arriba hacia abajo):
  - **Fila 0 — meta:** franja de agua con 5 nenúfares (slots de meta) en las columnas 1, 4, 7, 10 y 13; el resto de la fila es pared mortal (caer al agua entre nenúfares cuesta una vida).
  - **Filas 1–5 — río:** 5 carriles con plataformas (troncos y tortugas) que se desplazan horizontalmente; caer al agua sin estar sobre una plataforma cuesta una vida.
  - **Fila 6 — mediana segura:** franja de pasto donde la rana no muere.
  - **Filas 7–11 — autopista:** 5 carriles de vehículos que se desplazan horizontalmente; ser atropellado cuesta una vida.
  - **Fila 12 — zona de inicio:** franja de pasto segura; la rana aparece en la columna 7, fila 12.
- Movimiento de la rana en grid, discreto: cada pulsación de dirección la mueve exactamente una celda (40px) snap-eada al grid, sin desplazamiento continuo por teclado. No puede salir de las columnas 0–14 ni bajar de la fila 12 (fila de inicio). La posición se guarda en píxeles (`{x, y}`) para poder ser arrastrada suavemente por las plataformas del río; la columna/fila lógica se deriva redondeando.
- Vehículos por carril: cada carril de autopista se define por `{ row, dir: 1 | -1, speed, vehicles }`, donde `vehicles` es un arreglo de rectángulos de 1–2 celdas de largo con posición en píxeles (float) que avanzan según `dir × speed` y hacen wrap horizontal al salir de pantalla. Colisión AABB entre la celda de la rana y cualquier vehículo del carril donde está parada → pierde una vida.
- Plataformas del río por carril: cada carril de río se define por `{ row, dir: 1 | -1, speed, platforms }`, donde `platforms` es un arreglo de troncos/tortugas de 2–3 celdas de largo con posición en píxeles que avanzan y hacen wrap. Si la rana está en una fila de río y su celda **no** se superpone con ninguna plataforma → se ahoga (pierde una vida). Mientras está sobre una plataforma, su `x` en píxeles se traslada cada frame por `dir × speed` de esa plataforma; si ese arrastre la lleva fuera de los bordes horizontales del canvas → pierde una vida.
- Meta: llevar la rana a un nenúfar vacío (fila 0, columnas 1/4/7/10/13) lo marca como ocupado, suma score y reaparece la rana en la zona de inicio. Llegar a la fila 0 sobre un nenúfar ya ocupado o sobre la pared de agua entre nenúfares → pierde una vida. Ocupar los 5 nenúfares completa el nivel.
- Timer por cruce: cada rana (cada vida/viaje) arranca con un contador de 30 segundos, mostrado en el HUD como `extraStats`. Reaparecer una rana (por muerte o por llegar a un nenúfar) reinicia el timer a 30s. Si el timer llega a 0 → pierde una vida.
- Vidas: 3. Toda muerte (atropello, ahogo, arrastre fuera de pantalla, nenúfar inválido, timeout) reaparece la rana en la columna 7 / fila 12 conservando score, nivel y nenúfares ya ocupados. Al perder la 3ª vida, `status` pasa a `"gameover"`.
- Progresión de nivel: completar los 5 nenúfares sube el nivel, vacía los nenúfares, reaparece la rana en el inicio y multiplica la `speed` de todos los carriles (vehículos y plataformas) por 1.15 (con un tope de multiplicador acumulado, ver Data model). El timer por cruce se mantiene en 30s.
- Scoring (ver Data model para valores exactos): +10 por avanzar a una fila más cercana a la meta que cualquiera alcanzada en el viaje actual (solo progreso hacia adelante, no se puede farmear subiendo y bajando), +50 por ocupar un nenúfar, bonus de tiempo (+2 por segundo entero restante) al ocupar un nenúfar, y +1000 al completar el nivel (los 5 nenúfares).
- `onStateChange` se llama al final de cada `update(dt)` con la forma `GameState` de `components/games/registry.tsx`: `score`, `lives`, `level`, `status` (subconjunto `"playing" | "gameover"`), y `extraStats: [{ label: "Metas", value: "X/5" }, { label: "Tiempo", value: "Ns" }]`.
- Loop con `requestAnimationFrame` + acumulador de `dt` capado, para que el movimiento de vehículos, plataformas y el timer sean independientes del refresh rate del dispositivo. El movimiento de la rana es por evento de teclado (discreto), no por acumulador.
- Listeners de teclado agregados en `start()` y removidos en `destroy()`, nunca a nivel de módulo. Controles: `↑`/`↓`/`←`/`→` **y** `W`/`S`/`A`/`D` simultáneamente activos para mover la rana una celda por pulsación.
- `components/games/frogger/FroggerCanvas.tsx`: wrapper `"use client"` con `forwardRef` + `useImperativeHandle` exponiendo `{ pause, resume, restart, forceGameOver }` (tipo `GameCanvasHandle`), guard anti-doble-mount de StrictMode (ref booleana), overlay inicial "FROGGER · PULSA ESPACIO PARA JUGAR" antes de arrancar el loop. Renderiza `<canvas width={600} height={520}>`.
- Dibujo puro en canvas con formas de color sólido (sin assets externos): agua azul, pasto verde para medianas/inicio, asfalto oscuro para la autopista, rana como cuadrado verde claro, vehículos como rectángulos de colores por carril, troncos como rectángulos marrones, tortugas como óvalos verdes, nenúfares vacíos como círculos tenues y ocupados con una rana pequeña encima.

**Out of scope (para specs futuros):**

- Integración con el registro `GAME_ENGINES`, la fila en la tabla `games`, la portada del catálogo y el guardado de score — todo eso vive en `02-frogger-catalogo.md`.
- Controles táctiles/móviles y control por mouse.
- Sonido/música (no hay assets de audio; el diseño es solo-canvas).
- Tortugas que se sumergen periódicamente (dive turtles del arcade original) — en este spec las tortugas son plataformas siempre sólidas, igual que los troncos.
- Cocodrilos, serpientes, moscas-bonus u otros enemigos/objetos del río además de troncos y tortugas.
- Un estado intermedio `"dead"` distinto de `"playing"`/`"gameover"` — perder una vida con vidas restantes no interrumpe `"playing"`.
- Animación de sprite de la rana (saltos, muerte) más allá del redibujado por frame de formas sólidas.
- Auth/anti-cheat real, realtime, filtros de leaderboard.

## Data model

Esta feature no introduce persistencia nueva. Define el contrato TypeScript entre el motor y React, tipado contra `GameState` de `components/games/registry.tsx` (no una interfaz de estado propia):

```ts
// components/games/frogger/engine.ts
import type { GameState } from "@/components/games/registry";

export interface FroggerGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // score=0, lives=3, level=1, nenúfares vacíos, rana en inicio, timer=30
  forceGameOver(): void; // fuerza status="gameover" (botón FIN)
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: GameState) => void,
): FroggerGame;
```

Constantes de layout y balance (valores concretos, no placeholders):

```ts
const CELL = 40; // px por celda
const COLS = 15; // columnas (x: 0..14) → canvas 600px de ancho
const ROWS = 13; // filas (y: 0..12) → canvas 520px de alto
const START_CELL = { col: 7, row: 12 };
const HOME_COLS = [1, 4, 7, 10, 13]; // 5 nenúfares en la fila 0
const LIVES = 3;
const CROSSING_SECONDS = 30; // timer por cada rana/viaje
const LEVEL_SPEED_MULT = 1.15; // por nivel completado
const MAX_SPEED_MULT = 2.5; // tope acumulado del multiplicador de velocidad

// Scoring
const SCORE_FORWARD = 10; // por avanzar a una fila nueva más cercana a la meta
const SCORE_HOME = 50; // por ocupar un nenúfar
const SCORE_TIME_PER_SEC = 2; // bonus por segundo entero restante al ocupar un nenúfar
const SCORE_LEVEL_CLEAR = 1000; // por completar los 5 nenúfares
```

Forma de la configuración de carriles (posiciones en píxeles como float; `dir` marca el sentido; `speed` en px/s, escalado por el multiplicador de nivel):

```ts
interface Vehicle {
  x: number; // px, esquina izquierda
  lengthCells: 1 | 2;
  color: string;
}
interface RoadLane {
  row: number; // 7..11
  dir: 1 | -1;
  speed: number; // px/s base
  vehicles: Vehicle[];
}

interface Platform {
  x: number; // px, esquina izquierda
  lengthCells: 2 | 3;
  type: "log" | "turtle";
}
interface RiverLane {
  row: number; // 1..5
  dir: 1 | -1;
  speed: number; // px/s base
  platforms: Platform[];
}
```

Convenciones:

- Coordenadas: origen arriba-izquierda, `x` crece a la derecha, `y` crece hacia abajo. La meta está en `y = 0`, el inicio en `y = 12 × CELL`.
- Velocidades en píxeles por segundo, multiplicadas por dt para independencia del frame rate.
- La rana guarda su posición en píxeles; su celda lógica es `round(x / CELL)`, `round(y / CELL)`.
- El wrap horizontal de vehículos/plataformas reintroduce el objeto por el borde opuesto al salir completamente de pantalla.

## Implementation plan

1. Crear `components/games/frogger/engine.ts` con el esqueleto de `createFroggerGame(canvas, onStateChange)`: constantes de layout/balance, estado en closures (rana, carriles, nenúfares, score, vidas, nivel, timer, `animId`), y funciones vacías `start/stop/restart/forceGameOver/destroy`. Verificación: `npm run build` compila; el archivo no se importa desde ningún lado todavía.
2. Implementar el dibujo estático del tablero en `draw()`: agua (fila 0 y filas 1–5), pasto (filas 6 y 12), asfalto (filas 7–11), los 5 nenúfares vacíos y la rana en la celda de inicio. Verificación manual temporal: instanciar el motor en una página de prueba o en el paso 6 muestra el tablero correcto.
3. Implementar la configuración inicial de carriles (`RoadLane[]` y `RiverLane[]`) con velocidades, sentidos alternados por carril y posiciones iniciales espaciadas de vehículos/plataformas, más su avance en `update(dt)` con wrap horizontal, y su dibujo. Verificación: al arrancar el loop, vehículos y plataformas se desplazan de forma continua y reaparecen por el borde opuesto.
4. Implementar el movimiento discreto de la rana por teclado (flechas + WASD, una celda por pulsación, límites de tablero), el arrastre de la rana por la plataforma del río donde esté parada, y el score de avance hacia adelante (+10 por fila nueva más cercana a la meta). Listeners agregados en `start()`, removidos en `destroy()`. Verificación: la rana salta celda por celda, es arrastrada por los troncos, y el score sube al avanzar.
5. Implementar las condiciones de muerte (atropello por AABB en autopista, ahogo si no hay plataforma bajo la rana en el río, arrastre fuera de pantalla, nenúfar ocupado/inválido, timeout del contador de 30s), el consumo de vidas con reaparición en el inicio, el ocupado de nenúfares con su score (+50 y bonus de tiempo), el completar nivel (+1000, vaciar nenúfares, escalar velocidades) y el `gameover` al perder la 3ª vida. Llamar `onStateChange` con `GameState` (`extraStats` de Metas y Tiempo) al final de cada `update`. Verificación: `npm run build` compila; las muertes descuentan vidas y el HUD refleja Metas/Tiempo.
6. Crear `components/games/frogger/FroggerCanvas.tsx` (`"use client"`): `<canvas width={600} height={520}>`, instancia `createFroggerGame` en un `useEffect` con guard de un solo mount (ref booleana), lo destruye en cleanup. Overlay "FROGGER · PULSA ESPACIO PARA JUGAR" hasta que se presiona Espacio, momento en que se oculta y se llama `game.start()`. Expone `{ pause, resume, restart, forceGameOver }` vía `useImperativeHandle`/`forwardRef` y recibe `onStateChange: (state: GameState) => void` como prop. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página (su registro va en `02-frogger-catalogo.md`).
7. Recorrido manual del motor de forma aislada (montando `FroggerCanvas` en una página de prueba temporal o esperando al recorrido end-to-end de `02-frogger-catalogo.md`): overlay inicial → Espacio arranca → mover la rana con flechas y WASD → cruzar la autopista esquivando vehículos → subir a un tronco y ser arrastrado → llegar a un nenúfar (score +50 + bonus) → ocupar los 5 y ver subir el nivel y acelerar los carriles → morir por atropello, por ahogo, por arrastre fuera de pantalla y por timeout, confirmando que cada uno descuenta una vida → perder las 3 vidas y confirmar `status: "gameover"`. Verificación: `npm run build` y `npm run lint` sin errores; recorrido sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `components/games/frogger/engine.ts` exporta `createFroggerGame(canvas, onStateChange)` sin variables globales de módulo, con listeners de teclado agregados en `start()` y removidos en `destroy()`.
- [ ] `components/games/frogger/FroggerCanvas.tsx` muestra el overlay "FROGGER · PULSA ESPACIO PARA JUGAR" al montar y no arranca el loop hasta presionar Espacio.
- [ ] La rana se mueve exactamente una celda por pulsación con flechas y con WASD, sin salir de las columnas 0–14 ni bajar de la fila 12.
- [ ] Un vehículo que solapa la celda de la rana en la autopista descuenta una vida y reaparece la rana en la celda de inicio.
- [ ] Estar en una fila de río sin una plataforma bajo la rana descuenta una vida (ahogo); estar sobre un tronco/tortuga arrastra la rana con la plataforma.
- [ ] Ser arrastrado fuera de los bordes horizontales del canvas por una plataforma descuenta una vida.
- [ ] Avanzar a una fila más cercana a la meta que cualquiera alcanzada en el viaje suma exactamente 10 puntos; retroceder y volver a avanzar a una fila ya visitada no vuelve a sumar.
- [ ] Ocupar un nenúfar vacío suma 50 puntos más el bonus de tiempo (2 × segundos enteros restantes) y reaparece la rana en el inicio con el timer reiniciado a 30s.
- [ ] Llegar a la fila 0 sobre un nenúfar ya ocupado o sobre la pared de agua descuenta una vida.
- [ ] Ocupar los 5 nenúfares suma 1000 puntos, sube el nivel en el HUD, vacía los nenúfares y aumenta perceptiblemente la velocidad de vehículos y plataformas.
- [ ] Agotar el timer de 30s descuenta una vida.
- [ ] Perder la 3ª vida fija `status: "gameover"`.
- [ ] El HUD refleja `score`, `lives`, `level` reales y las celdas extra "Metas" (X/5) y "Tiempo" (Ns).
- [ ] `forceGameOver()` fija `status: "gameover"` y cancela el loop; `restart()` deja el motor en estado limpio (score 0, 3 vidas, nivel 1, nenúfares vacíos, rana en inicio, timer 30s).
- [ ] Desmontar el componente no deja el loop de `requestAnimationFrame` corriendo en segundo plano.

## Decisions

- **Sí:** diseñar Frogger desde cero (no hay `game.js` en `references/started-games/`), tomando como fuente de verdad la mecánica descrita por el usuario (grid por carriles, tráfico + río con plataformas, score por avance). Confirmado con el usuario.
- **Sí:** grid de 15×13 celdas de 40px (canvas 600×520), con 5 carriles de autopista y 5 de río separados por una mediana segura, más zona de inicio y fila de meta con 5 nenúfares. Elegido para dar una travesía clásica de Frogger con espacio de maniobra, en la línea de tamaño de Arkanoid (800×600) y Snake (800×800).
- **Sí:** movimiento de la rana discreto (una celda por pulsación) en vez de continuo, coherente con "movimiento en grid por carriles" del enunciado y con el Frogger clásico. En el río la rana se arrastra suavemente con la plataforma (posición en píxeles), pero los saltos siguen siendo por celda.
- **Sí:** timer de 30s por cruce como presión de tiempo y fuente de bonus, expuesto como `extraStats: [{label:"Tiempo"}]`, más `[{label:"Metas", value:"X/5"}]` para los nenúfares. Ambos entran en `extraStats` sin salir del contrato `GameState`.
- **Sí:** score por avance hacia adelante (+10 por fila nueva) además de metas (+50 + bonus de tiempo) y nivel completo (+1000), para que el score crezca de forma monótona y sirva al leaderboard.
- **Sí:** `status` usa solo `"playing" | "gameover"` — perder una vida con vidas restantes no interrumpe `"playing"`. Mismo criterio que Snake/Arkanoid, sin estado `"dead"` intermedio.
- **Sí:** controles flechas + WASD simultáneos, igual que Snake. Confirmado con el usuario.
- **No:** tortugas que se sumergen, cocodrilos, serpientes o moscas-bonus del arcade original — quedan fuera para mantener la complejidad del motor comparable a Tetris/Arkanoid/Snake. Se documenta como scope-out.
- **No:** assets externos (spritesheets/audio) — todo se dibuja con formas de color sólido en canvas, como Tetris y la serpiente de Snake. Evita carga asíncrona y mantiene el motor autocontenido.
- **No:** sonido, controles táctiles/mouse, auth/anti-cheat real, realtime. Mismo criterio que specs 05/06/07/08/09.

## Risks

| Riesgo                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El `useEffect` que instancia el motor puede ejecutarse dos veces en React 19 StrictMode (dev), duplicando el `requestAnimationFrame` loop o los listeners de teclado.                                                         | `FroggerCanvas.tsx` usa un guard (ref booleana) para asegurar una sola instancia real del engine por montaje, y `destroy()` limpia listeners/loop en cada cleanup del efecto. Mismo patrón que Tetris/Arkanoid/Snake. |
| Mezclar movimiento discreto por celda con arrastre continuo en píxeles en el río puede producir bugs sutiles de sincronización entre la posición en píxeles de la rana y su celda lógica (falsos ahogos o falsas colisiones). | La celda lógica se deriva siempre por redondeo de la posición en píxeles, y el paso 7 del plan incluye un recorrido manual jugando cruces completos por el río, no solo verificación de compilación.                  |
| El acumulador de `dt` mal implementado puede desincronizar el movimiento de vehículos/plataformas y el timer del reloj real, dando dificultad inconsistente entre dispositivos con distinto refresh rate.                     | Se usa el mismo patrón de acumulador de `dt` capado que Asteroids/Tetris/Arkanoid/Snake, con velocidades en px/s multiplicadas por dt.                                                                                |
| Reaparecer la rana o escalar velocidades por nivel sin tope podría volver el juego injugable en niveles altos.                                                                                                                | El multiplicador de velocidad acumulado se topa en `MAX_SPEED_MULT = 2.5`; la reaparición usa siempre la celda de inicio fija y reinicia el timer.                                                                    |

## What is **not** in this spec

- Integración con `GAME_ENGINES`, la tabla `games`, la portada del catálogo y el guardado de score (van en `02-frogger-catalogo.md`).
- Tortugas que se sumergen, cocodrilos, serpientes o moscas-bonus.
- Sonido/música, controles táctiles/mouse.
- Sprites animados de la rana.
- Un estado `"dead"` intermedio distinto de `"playing"`/`"gameover"`.
- Auth/anti-cheat real, realtime, filtros de leaderboard.

Cada uno de esos, si se implementa, va en su propio spec.
