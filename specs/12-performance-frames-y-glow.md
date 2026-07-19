# SPEC 12 — Optimización de performance: emisión de estado y glow por frame

> **Estado:** Aprobado
> **Depende de:** SPEC 07 (Tetris), SPEC 05 (Asteroids), SPEC 08 (Arkanoid), SPEC 09 (Snake), specs/game-jam/frogger.md
> **Fecha:** 2026-07-18
> **Objetivo:** Eliminar el trabajo redundante por frame en los 5 engines (emisión de estado a React aunque no cambie, y recálculo de `shadowBlur` por objeto en la skin neon) y en `GamePlayer.tsx` (re-render de todo el árbol del reproductor por cada actualización de score/lives/level), reemplazándolo por deduplicación de estado, sprites de glow pre-renderizados y refs con actualización imperativa del DOM para el HUD numérico, sin alterar el resultado visual ni la lógica de juego.

## Scope

**In:**

- Nuevo helper compartido `components/games/glowSprite.ts`: cache de sprites con glow pre-renderizados a canvas offscreen, reutilizable por los 5 engines.
- `components/games/frogger/engine.ts`, `snake/engine.ts`, `asteroids/engine.ts`, `arkanoid/engine.ts`, `tetris/engine.ts`: reemplazar el `ctx.shadowBlur`/`ctx.shadowColor` seteado por objeto en cada frame por sprites cacheados vía el helper compartido.
- Los mismos 5 `engine.ts`: deduplicar la emisión de `onStateChange` — cada engine guarda el último estado emitido y solo llama `onStateChange` cuando algún campo visible (score, lives, level, status, extraStats) cambió, usando el mismo redondeo/formato que ya se usa para mostrarlo (`Math.ceil`, `toFixed(1)`, etc.).
- `components/GamePlayer.tsx`: sacar `score`/`lives`/`level`/`extraStats` de `useState` (`engineState`) y llevarlos a `useRef`, actualizando el DOM del HUD (los `<span>`/nodos que muestran esos valores) de forma imperativa vía `ref.current.textContent` en `handleStateChange`, en vez de `setEngineState`. Esto evita que cada actualización deduplicada del engine re-renderice todo el árbol del reproductor (canvas, controles táctiles, botones).

**Out of scope (para specs futuros):**

- Cambiar colores de paleta o el valor numérico de `glow`/`shadowBlur` de cualquier skin.
- Cambiar la frecuencia del game loop (frame-skipping, fixed-timestep) — el problema es trabajo redundante dentro de cada frame, no la frecuencia del RAF.
- Resolución de canvas / `devicePixelRatio`.
- `registry.tsx`, `TouchControls.tsx`, y los `useState` de cada `*Canvas.tsx` (ej. `started` en `FroggerCanvas`) — quedan sin tocar en esta spec.
- `paused`, `over`, `name`, `saved`, `skin` y `mockScore` de `GamePlayer.tsx`: siguen en `useState` porque condicionan qué JSX se monta (modal de fin de partida, formulario de nombre, selector de skin) — solo el HUD numérico de alta frecuencia pasa a ref.
- Migrar el render a WebGL.
- Web Workers u `OffscreenCanvas` en un hilo separado.
- Cualquier feature nueva de gameplay.

## Data model

```ts
// components/games/glowSprite.ts
interface GlowSprite {
  canvas: HTMLCanvasElement;
  width: number; // incluye margen para no recortar el blur
  height: number;
  offsetX: number; // desplazamiento para centrar el sprite al dibujar
  offsetY: number;
}

// cache interno: Map<string, GlowSprite> para formas fijas (color+forma+tamaño+skin)
// y WeakMap<object, GlowSprite> para formas generadas por instancia (ej. asteroides)
function getGlowSprite(
  key: string,
  width: number,
  height: number,
  blur: number,
  color: string,
  draw: (ctx: CanvasRenderingContext2D) => void, // dibuja la forma sin glow, en el sprite
): GlowSprite;
```

Cada `engine.ts` agrega una variable de closure `lastEmitted: GameState | null` (no persistida, solo en memoria del engine) para la deduplicación de `onStateChange`. No hay persistencia nueva ni cambios en Supabase.

En `GamePlayer.tsx`, `engineState` (`useState`) se reemplaza por refs al DOM del HUD:

```ts
const scoreRef = useRef<HTMLSpanElement>(null);
const livesRef = useRef<HTMLSpanElement>(null);
const levelRef = useRef<HTMLSpanElement>(null);
const extraStatsRef = useRef<HTMLDivElement>(null); // re-renderiza su contenido interno solo cuando extraStats cambia de forma

const handleStateChange = (state: GameState) => {
  if (scoreRef.current) scoreRef.current.textContent = String(state.score);
  if (livesRef.current) livesRef.current.textContent = String(state.lives);
  if (levelRef.current) levelRef.current.textContent = String(state.level);
  // extraStats: renderizado imperativo similar (label/value por entrada)
  if (state.status === "gameover") setOver(true); // única rama que sigue disparando setState
};
```

## Implementation plan

1. Crear `components/games/glowSprite.ts` con `getGlowSprite()` (cache por clave para formas fijas + `WeakMap` para formas por instancia) y un margen automático (~2× `blur`) alrededor de cada sprite para no recortar el glow. Verificación: `npm run build` compila (archivo aún no se usa).
2. Aplicar el cache a Frogger (`drawVehicles`, `drawPlatforms`, `drawFrog`, nenúfar ocupado en `drawBoard`) — claves finitas por `skin+color+forma+tamaño de celda`. Verificación manual: skin neon de Frogger visualmente idéntica antes/después.
3. Deduplicar `onStateChange` en Frogger: `lastEmitted` comparado campo a campo (con `Math.ceil` en `crossingTimeLeft`, igual que en `emitState`) antes de llamar `onStateChange`. Verificación: DevTools Performance, 5s de gameplay en skin neon, caída medible de llamadas a `setState` en `GamePlayer`.
4. Repetir el cache de glow en Snake (segmentos por color) y Asteroids (asteroides cacheados por identidad de instancia vía `WeakMap`, ya que el polígono se genera una sola vez en el constructor; ship/bullets cacheados por color). Verificación manual visual en skin neon de ambos.
5. Repetir el cache de glow en Arkanoid (bricks, ball, paddle, partículas de explosión) y Tetris (bloques del tablero por color de pieza). Verificación manual visual en skin neon de ambos.
6. Repetir la deduplicación de `onStateChange` (paso 3) en Snake, Asteroids, Arkanoid y Tetris, con atención a campos continuos como `tripleShotRemaining` de Asteroids (comparar con el mismo redondeo que ya usa su display, `toFixed(1)`). Verificación: DevTools Performance/Profiler en los 4, caída medible de renders de React durante gameplay activo.
7. En `GamePlayer.tsx`, reemplazar `engineState`/`setEngineState` por `scoreRef`/`livesRef`/`levelRef`/`extraStatsRef` y actualizar `handleStateChange` para escribir esos valores directamente al DOM en vez de llamar `setEngineState`; `over`/`paused`/`name`/`saved`/`skin`/`mockScore` quedan sin cambios. Verificación: React DevTools Profiler — confirmar que ni `GamePlayer` ni sus hijos (`*Canvas`, `TouchControls`) re-renderizan cuando cambia score/lives/level/extraStats, solo cuando cambia `over`/`paused`/`skin`.
8. Recorrido final: `npm run build` y `npm run lint` sin errores nuevos; jugar los 5 juegos completos (clasico/neon/retro) confirmando cero diferencia visual, HUD actualizándose correctamente (incluyendo el fin de partida y el modal de guardar puntaje) y cero regresión de colisiones/scoring/game over.

## Acceptance criteria

- [ ] `npm run build` compila sin errores.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] En los 5 juegos, la skin neon se ve idéntica (glow, colores, tamaños) respecto a antes de este spec.
- [ ] Ningún `engine.ts` llama `onStateChange` con un estado idéntico al último emitido.
- [ ] El HUD (score/vidas/nivel/timer/extraStats) sigue actualizándose sin demora perceptible en los 5 juegos.
- [ ] Un profile de DevTools Performance de 5s jugando cada juego en skin neon no muestra long tasks (>50ms) atribuibles a `shadowBlur` recalculado por objeto ni a `setState` en cada frame.
- [ ] Colisiones, scoring, niveles y game over de los 5 juegos son idénticos a antes de este spec.
- [ ] `GamePlayer.tsx` no re-renderiza (verificable en React DevTools Profiler) cuando cambia score/lives/level/extraStats de un engine — solo lo hace cuando cambia `over`, `paused`, `skin`, `name` o `saved`.
- [ ] El HUD numérico (score/vidas/nivel/extraStats) sigue mostrando el valor correcto en pantalla en todo momento, incluida la transición a game over.
- [ ] Ningún archivo fuera de los 5 `engine.ts`, `components/games/glowSprite.ts` y `components/GamePlayer.tsx` fue modificado.

## Decisions

- **Sí:** deduplicar `onStateChange` dentro de cada engine, comparando contra el último estado emitido con el mismo redondeo/formato ya usado para mostrarlo. Confirmado con el usuario.
- **Sí:** pre-renderizar sprites con glow a canvas offscreen cacheado, en vez de recalcular `shadowBlur` en cada draw call. Confirmado con el usuario.
- **Sí:** para formas generadas aleatoriamente por instancia (asteroides), cachear por identidad del objeto (`WeakMap`) en vez de por forma — el polígono se genera una sola vez en el constructor.
- **Sí:** helper compartido `glowSprite.ts` en vez de duplicar la lógica de cache 5 veces — la lógica de "obtener o crear sprite cacheado" es idéntica aunque las formas difieran.
- **No:** cambiar valores de paleta o `shadowBlur` numérico — el objetivo es cero diferencia visual.
- **Sí:** sacar `score`/`lives`/`level`/`extraStats` de `useState` en `GamePlayer.tsx` y llevarlos a `useRef` con actualización imperativa del DOM, en vez de mantener `engineState` como único mecanismo. Confirmado con el usuario — minimizar `useState` y evitar re-renders donde sea posible.
- **No:** aplicar el mismo cambio a `paused`/`over`/`name`/`saved`/`skin`/`mockScore` — esos sí necesitan que React re-renderice porque condicionan qué JSX se monta (modal, formulario, selector de skin).
- **No:** tocar los `useState` de los `*Canvas.tsx` (ej. `started`) ni `registry.tsx`/`TouchControls.tsx` — acotado a `GamePlayer.tsx` en esta spec.
- **No:** Web Workers, `OffscreenCanvas` en otro hilo, ni WebGL — se resuelve con Canvas2D estándar.
- **No:** frame-skipping ni fixed-timestep del loop — el problema es trabajo redundante por frame, no su frecuencia.

## Risks

| Riesgo                                                                                                                                                                                                                | Mitigación                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cache por instancia (asteroides/partículas) puede filtrar memoria si no se limpia al morir el objeto                                                                                                                  | Se usa `WeakMap` keyed por referencia de objeto, liberado por el GC automáticamente al perder la referencia.                                                                          |
| El sprite offscreen recorta el glow si no tiene margen suficiente (el blur dibuja fuera del bounding box)                                                                                                             | Cada sprite se genera con margen ≈2× el valor de `blur` alrededor de la forma.                                                                                                        |
| Cambiar de skin en caliente (`setSkin`) deja sprites de la skin anterior colgando en memoria                                                                                                                          | La clave de cache incluye el skin activo; el volumen de sprites por juego es chico (no crece indefinidamente).                                                                        |
| Aplicar el mismo patrón 5 veces de forma apurada puede introducir inconsistencias sutiles entre engines                                                                                                               | El plan aplica el patrón engine por engine con verificación visual manual en cada paso, no en un cambio masivo simultáneo.                                                            |
| Actualizar el HUD vía `ref.current.textContent` sin pasar por React puede desincronizarse si algún otro efecto también escribe ese nodo, o quedar con el valor viejo si el ref aún no está montado en el primer frame | El paso 7 del plan verifica explícitamente con React DevTools Profiler que no hay re-render, y una prueba manual confirma que el HUD arranca con el valor inicial correcto al montar. |

## What is **not** in this spec

- Cambios en `registry.tsx`, `TouchControls.tsx`, o en los `useState` de los `*Canvas.tsx`.
- Cambios en `paused`/`over`/`name`/`saved`/`skin`/`mockScore` de `GamePlayer.tsx` — siguen en `useState`.
- Cambios de color/paleta o del valor numérico de `shadowBlur`.
- WebGL, Web Workers u `OffscreenCanvas` en otro hilo.
- Frame-skipping o fixed-timestep del loop principal.
- Optimización de `devicePixelRatio`/resolución de canvas.
- Nueva funcionalidad de gameplay.

Cada uno de estos, si se necesita, va en un spec futuro.
