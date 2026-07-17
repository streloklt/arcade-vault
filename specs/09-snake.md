# SPEC 09 — Integrar Snake en el vault

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (patrón de motor/adaptador), SPEC 06 (leaderboard y catálogo Supabase)
> **Fecha:** 2026-07-16
> **Objetivo:** Portar Snake a un motor TypeScript propio integrado con el registro de juegos (`components/games/registry.tsx`), el leaderboard y el catálogo real de Supabase, siguiendo el patrón ya establecido por Asteroids/Tetris/Arkanoid.

## Scope

**In:**

- `components/games/snake/engine.ts`: factory `createSnakeGame(canvas, onStateChange)` que devuelve `SnakeGame` (`start/stop/restart/forceGameOver/destroy`). Estado (serpiente como array de segmentos `{x, y}` en coordenadas de grid, dirección actual, cola de inputs pendiente, fruta activa, score, vidas, nivel, intervalo de movimiento) vive en closures, sin variables globales de módulo. Loop con `requestAnimationFrame` + acumulador de `dt`, avanzando la serpiente una celda cada vez que el acumulador supera el intervalo de movimiento vigente (que baja con el nivel). Listeners de teclado (flechas + WASD) agregados en `start()`, quitados en `destroy()`. `onStateChange` se llama en cada `update` con la forma `GameState` de `components/games/registry.tsx` (`score`, `lives`, `level`, `status`, sin `extraStats`).
- Grid de juego: 20×20 celdas sobre un canvas de 800×800px (celda = 40px).
- Atlas de frutas portado a un `const` TypeScript tipado dentro de `components/games/snake/` (coordenadas `{x, y, w, h}` copiadas de `references/source-assets/snake-assets/sprites.js`, sin cargar ese script ni depender de `window`). La imagen fuente se mueve a `public/games/snake/fruits.png`.
- Dos tiers de fruta con puntaje diferenciado:
  - **Comunes (10pts):** `apple`, `banana`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `peach`, `peanut`, `tomato`, `grapes2`.
  - **Raras (25pts):** `watermelon`, `pineapple`, `melon`, `kiwi`, `pepper`, `lemon`, `orange`, `berries`.
  - En cada spawn se elige un tier al azar y luego una fruta al azar dentro de ese tier; la fruta ocupa una celda libre del grid (no superpuesta con la serpiente).
- Progresión de nivel: cada 5 frutas comidas (comunes + raras combinadas) sube el nivel y el intervalo de movimiento se multiplica por `0.9` (con piso mínimo de 60ms), acelerando la serpiente.
- Vidas: 3 vidas. Chocar contra un borde o contra la propia cola consume una vida; si quedan vidas, la serpiente reinicia posición y dirección en el centro del grid **conservando su largo, score y nivel actuales**, y el juego continúa. Al perder la 3ª vida, `status` pasa a `"gameover"`.
- `components/games/snake/SnakeCanvas.tsx`: wrapper `"use client"`, `forwardRef` + `useImperativeHandle` exponiendo `GameCanvasHandle` (`pause/resume/restart/forceGameOver`), guard anti-doble-mount de StrictMode, overlay inicial "PULSA ESPACIO PARA JUGAR" antes de arrancar el loop.
- Serpiente dibujada como bloques de color sólido (verde, acorde al accent color de la entrada), con la celda de la cabeza en un tono distinto (más claro) al resto del cuerpo para diferenciarla.
- Entrada nueva `snake` en el mapa `GAME_ENGINES` de `components/games/registry.tsx` (`Canvas: SnakeCanvas, initialState: {score: 0, lives: 3, level: 1, status: "playing"}`) — sin adaptador, porque `SnakeCanvas` emite `GameState` directo. No se toca `GamePlayer.tsx`.
- Fila nueva en la tabla `games` de Supabase (vía `mcp__supabase__apply_migration` o `execute_sql`):
  `id: "snake"`, `title: "SNAKE"`, `short: "Comé frutas y crecé sin chocar con vos mismo."`, `long: "El clásico juego de la serpiente: guiála por el tablero, comé las frutas que aparecen y evitá chocar contra los bordes o tu propia cola. Cada fruta suma puntos y hace crecer tu serpiente."`, `cat: "ARCADE"`, `cover: "cover-snake"`, `color: "green"`.
- Clase CSS `cover-snake` para la portada de la tarjeta en el catálogo (mismo patrón visual que `cover-asteroids`/`cover-tetris`/`cover-arkanoid` existentes).
- Controles: flechas **y** WASD simultáneamente activos para cambiar de dirección; sin permitir un giro de 180° instantáneo sobre la propia cola (si va a la derecha, presionar izquierda no la hace invertir directo).

**Out of scope (para specs futuros):**

- Controles táctiles/móviles.
- Sonido/música (no hay assets de audio provistos).
- Auth/anti-cheat real, realtime, filtros de leaderboard por rango de tiempo.
- Usar el resto del atlas de `sprites.js` más allá de la fila de frutas (si el archivo fuente tuviera otras filas/sprites, no se usan en este spec).
- Obstáculos, power-ups, múltiples frutas simultáneas en el tablero, o modos de juego alternativos — una sola fruta activa a la vez.
- Ícono/sprite de serpiente (cabeza direccional, textura de escamas, etc.) — se usan bloques de color sólido.

## Data model

Esta feature no introduce persistencia nueva (reutiliza `scores`/`games` de SPEC 06 vía `/api/scores`). Define el contrato TypeScript entre el motor y React:

```ts
// components/games/snake/engine.ts

export interface SnakeGame {
  start(): void; // arranca el loop de requestAnimationFrame
  stop(): void; // cancela el loop (PAUSA/unmount)
  restart(): void; // score=0, lives=3, level=1, serpiente en largo/posición inicial
  forceGameOver(): void; // fuerza status="gameover"
  destroy(): void; // limpia listeners de teclado y cancela el loop
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  onStateChange: (
    state: import("@/components/games/registry").GameState,
  ) => void,
): SnakeGame;
```

Fila literal a insertar en `games`:

```sql
insert into games (id, title, short, long, cat, cover, color)
values (
  'snake',
  'SNAKE',
  'Comé frutas y crecé sin chocar con vos mismo.',
  'El clásico juego de la serpiente: guiála por el tablero, comé las frutas que aparecen y evitá chocar contra los bordes o tu propia cola. Cada fruta suma puntos y hace crecer tu serpiente.',
  'ARCADE',
  'cover-snake',
  'green'
);
```

Atlas de frutas (forma del `const` TS portado, valores tomados de `sprites.js`):

```ts
interface FruitSprite {
  x: number;
  y: number;
  w: number;
  h: number;
  points: 10 | 25;
}

const FRUIT_ATLAS: Record<string, FruitSprite> = {
  apple: { x: 2786, y: 136, w: 110, h: 160, points: 10 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160, points: 25 },
  // ...resto de las 22 frutas de sprites.js, con points según su tier
};
```

## Implementation plan

1. Mover `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`. Crear `components/games/snake/fruitAtlas.ts` con el `const FRUIT_ATLAS` tipado (22 frutas, coordenadas copiadas de `sprites.js`, campo `points` asignado según el tier de la sección Scope). Verificación: `npm run build` compila; el archivo no se usa todavía.
2. Crear `components/games/snake/engine.ts`: factory `createSnakeGame(canvas, onStateChange)`. Implementa grid 20×20/celda 40px, movimiento por acumulador de `dt` con intervalo variable por nivel, cola de segmentos, spawn de fruta (tier aleatorio → fruta aleatoria del tier → celda libre), detección de colisión con bordes/cola, manejo de vidas (reinicio de posición conservando largo/score/nivel) y game over al perder la 3ª vida. Dibuja el grid, la serpiente (cabeza en tono distinto) y la fruta activa (sprite recortado de `fruits.png` vía `FRUIT_ATLAS`) directamente en el canvas. Listeners de teclado (flechas + WASD) agregados en `start()`, removidos en `destroy()`, con bloqueo de giro de 180°. Llama `onStateChange({score, lives, level, status})` en cada `update`. Verificación: `npm run build` compila sin errores de tipos; el motor no se importa todavía desde ningún componente.
3. Crear `components/games/snake/SnakeCanvas.tsx` (`"use client"`): `<canvas width={800} height={800}>`, instancia `createSnakeGame` en `useEffect` con guard StrictMode, overlay "SNAKE · PULSA ESPACIO PARA JUGAR" antes de `game.start()`, expone `GameCanvasHandle` vía `useImperativeHandle`/`forwardRef`. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.
4. Agregar la entrada `snake` a `GAME_ENGINES` en `components/games/registry.tsx` (`Canvas: SnakeCanvas, initialState: {score: 0, lives: 3, level: 1, status: "playing"}`), sin tocar `GamePlayer.tsx`. Verificación: `npm run build` compila.
5. Crear la clase CSS `cover-snake` (mismo archivo/patrón donde viven `cover-asteroids`/`cover-tetris`/`cover-arkanoid`). Verificación visual: la tarjeta de Snake en `/biblioteca` muestra una portada distintiva, no el placeholder genérico.
6. Insertar la fila de `snake` en la tabla `games` de Supabase vía `mcp__supabase__apply_migration` (o `execute_sql`), con los valores exactos de la sección Data model. Verificación: `mcp__supabase__execute_sql` con `select * from games where id = 'snake'` devuelve la fila.
7. Recorrido end-to-end manual: navegar a `/juego/snake` (catálogo/detalle muestra la portada, descripción y leaderboard vacío o con datos reales), entrar a `/juego/snake/jugar` → overlay inicial → Espacio arranca el loop → mover con flechas y con WASD → comer fruta común (score +10) y fruta rara (score +25) → comer 5 frutas y confirmar que el nivel sube y la serpiente acelera → chocar contra un borde o la cola (pierde una vida, reaparece en el centro conservando largo/score/nivel) → perder las 3 vidas → se abre el modal "FIN DEL JUEGO" con el score real → guardar puntuación (llega a `/api/scores` con `game_id: "snake"`) → "JUGAR DE NUEVO" reinicia limpio. Probar también PAUSA/FIN. Verificación: `npm run build` y `npm run lint` sin errores; recorrido manual completo sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] La tabla `games` en Supabase contiene la fila `snake` con los valores exactos de la sección Data model.
- [ ] `components/games/snake/engine.ts` exporta `createSnakeGame(canvas, onStateChange)` sin variables globales de módulo, con listeners de teclado agregados en `start()` y removidos en `destroy()`.
- [ ] `components/games/snake/SnakeCanvas.tsx` muestra el overlay "PULSA ESPACIO PARA JUGAR" al montar y no arranca el loop hasta presionar Espacio.
- [ ] `GAME_ENGINES.snake` existe en `registry.tsx` y `GamePlayer.tsx` no fue modificado.
- [ ] En `/juego/snake/jugar`, comer una fruta común suma exactamente 10 puntos y una fruta rara suma exactamente 25 puntos al HUD.
- [ ] Cada 5 frutas comidas (acumulado), el nivel sube en el HUD y la velocidad de la serpiente aumenta perceptiblemente.
- [ ] Chocar contra un borde o contra la propia cola con más de una vida restante resetea la posición/dirección de la serpiente al centro del grid, sin resetear su largo, score ni nivel, y descuenta una vida del HUD.
- [ ] Perder la 3ª vida abre el modal "FIN DEL JUEGO" con el score real.
- [ ] Controles de flechas y WASD funcionan de forma equivalente, y un giro de 180° instantáneo (ir a la derecha y presionar izquierda) es ignorado en vez de causar colisión inmediata contra el propio cuerpo.
- [ ] Guardar puntuación desde el modal llama a `POST /api/scores` con `game_id: "snake"` y la fila aparece en la tabla `scores`.
- [ ] "JUGAR DE NUEVO" reinicia el motor a estado limpio (score 0, 3 vidas, nivel 1, largo inicial) y vuelve a mostrar el overlay de inicio.
- [ ] La tarjeta de Snake en `/biblioteca` muestra la portada `cover-snake`, no el placeholder genérico de juegos sin cover propio.
- [ ] Ningún otro juego del vault (`asteroids`, `tetris`, `arkanoid`, y los mock restantes) cambia de comportamiento.
- [ ] Desmontar la página (SALIR o navegar a otra ruta) no deja el loop de `requestAnimationFrame` corriendo en segundo plano.

## Decisions

- **Sí:** motor encapsulado en `createSnakeGame` con estado en closures, mismo patrón que Asteroids/Tetris/Arkanoid. Confirmado — consistencia con specs previas.
- **Sí:** canvas 800×800 con grid 20×20 (celda 40px), en vez de 800×600 como Asteroids. Confirmado con el usuario — Snake necesita un tablero cuadrado, y la celda de 40px se eligió por comodidad de escalado de los sprites de fruta (fuente ~110-170px).
- **Sí:** dos tiers de fruta con puntaje diferenciado (comunes 10pts / raras 25pts), en vez de un valor único por fruta comida. Confirmado con el usuario.
- **Sí:** el atlas de coordenadas de `sprites.js` se porta a un `const` TypeScript tipado dentro de `components/games/snake/`, en vez de cargar `sprites.js` como script global (`window.SPRITE_ATLAS`). Confirmado con el usuario — evita depender de `window` y mantiene el archivo dentro de las convenciones TS estrictas del repo.
- **Sí:** 3 vidas con reinicio de posición (conservando largo/score/nivel) al chocar, en vez de game over inmediato a la primera colisión (Snake clásico de una sola vida). Confirmado con el usuario — decisión explícita de diferenciarse del arcade original para dar más margen de juego.
- **Sí:** velocidad aumenta con el nivel (cada 5 frutas, intervalo ×0.9 con piso de 60ms), no con el tiempo transcurrido. Confirmado con el usuario.
- **Sí:** controles de flechas y WASD simultáneos. Confirmado con el usuario.
- **Sí:** pantalla de inicio "PULSA ESPACIO PARA JUGAR" antes de arrancar el loop, mismo patrón que los otros 3 juegos portados. Confirmado con el usuario.
- **Sí:** serpiente dibujada como bloques de color sólido con la cabeza en tono distinto, sin sprite propio de serpiente. Confirmado con el usuario.
- **No:** múltiples frutas simultáneas en el tablero — siempre una activa a la vez. Confirmado con el usuario (interpretación final de "2 frutas aleatorias" como 2 tiers, no 2 frutas visibles).
- **No:** sonido, controles táctiles, auth/anti-cheat real, realtime. Mismo criterio que specs 05/06/07/08.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                               | Mitigación                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portar manualmente las 22 coordenadas de `sprites.js` a TypeScript puede introducir errores de transcripción (offsets incorrectos, sprite recortado mal).                                                                                                                                                                            | El paso 2 del plan requiere verificación visual directa: cada fruta debe verse completa y sin recortes al aparecer en el tablero durante el recorrido manual del paso 7.                                                                      |
| El acumulador de `dt` mal implementado puede desincronizar el movimiento de la serpiente del reloj real, dando dificultad inconsistente entre dispositivos con distinto refresh rate.                                                                                                                                                | Se usa el mismo patrón de acumulador de `dt` capado que Asteroids/Tetris/Arkanoid ya usan, en vez de mover la serpiente directamente por frame.                                                                                               |
| Reiniciar solo la posición (no el largo) tras perder una vida puede dejar a la serpiente ocupando una celda ya cubierta por su propia cola si el largo es grande, causando una colisión inmediata al reaparecer.                                                                                                                     | El motor debe recalcular una posición/orientación inicial que deje todos los segmentos en celdas libres al reaparecer (ej. reconstruir la cola en línea recta desde el centro), documentado como parte del paso 2 del plan de implementación. |
| Next.js 16.2.10/React 19.2.4 no son las versiones conocidas por el asistente; ningún paso de este spec toca routing/data-fetching/caching directamente, pero si `/spec-impl` termina modificando `app/juego/[id]/page.tsx` o similar, debe verificar contra `node_modules/next/dist/docs/` en vez de asumir convenciones recordadas. | Recordatorio explícito heredado de `AGENTS.md`, aplicable solo si el paso de implementación toca esas rutas.                                                                                                                                  |

## What is **not** in this spec

- Controles táctiles/móviles.
- Sonido/música.
- Auth/anti-cheat real, realtime, filtros de leaderboard por rango de tiempo.
- Power-ups, obstáculos, múltiples frutas simultáneas o modos de juego alternativos.
- Sprite/textura propia para la serpiente.

Cada uno de estos, si se necesita, va en un spec futuro.
