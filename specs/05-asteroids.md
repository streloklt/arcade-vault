# SPEC 05 — Integrar Asteroids en el vault

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-07-14
> **Objetivo:** Portar el juego Asteroids (`references/started-games/02-asteroids/game.js`) a un motor TypeScript encapsulado que reemplace la arena mock de `GamePlayer` únicamente para la entrada `asteroids`, integrado con el HUD, pausa, fin de partida y guardado de puntuación ya existentes en el vault.

## Scope

**In:**

- `components/games/asteroids/engine.ts`: motor del juego en TypeScript, adaptado de `game.js` — clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, encapsuladas en una factory `createAsteroidsGame(canvas, callbacks)` que devuelve `{ start(), stop(), restart(), destroy() }`. Sin variables globales de módulo. El motor **conserva** su propio HUD dibujado dentro del canvas (`drawHUD()`, overlay `GAME OVER`) tal como el original, sin quitar nada visualmente del juego; además expone el mismo estado (score, lives, level, tripleShot restante, gameover) al wrapper React vía callback en cada frame, para que el HUD de React se mantenga sincronizado con el del canvas. Ambos HUD coexisten y se muestran simultáneamente.
- `components/games/asteroids/AsteroidsCanvas.tsx`: wrapper cliente (`"use client"`) que monta el `<canvas>` 800×600, instancia el engine con `useRef`/`useEffect` (evita doble-init en StrictMode), muestra el overlay inicial "PULSA ESPACIO PARA JUGAR" antes de arrancar el loop, y expone al padre (`GamePlayer`) el estado en vivo (score, lives, level, tripleShot, gameover) y controles (`pause`, `resume`, `forceGameOver`, `restart`) vía props/callbacks.
- `lib/data.ts`: renombrar el `id` de la entrada del juego de `"rocas"` a `"asteroids"` (el resto de campos — título, descripción, categoría, cover, color, etc. — quedan igual). Esto cambia la ruta real del juego de `/juego/rocas/...` a `/juego/asteroids/...`.
- `components/GamePlayer.tsx`: rama condicional — si `game.id === "asteroids"`, renderiza `AsteroidsCanvas` dentro de `.crt-screen` en vez de `.game-arena` mock, y el HUD superior (`player-hud`) pasa a alimentarse del estado real emitido por el motor en vez del score simulado por `setInterval`, además del HUD que el propio canvas sigue dibujando. Se agrega una quinta celda `hud-stat` "POWER-UP" visible solo cuando `tripleShot > 0`, mostrando `3X · Ns`. Los botones PAUSA/FIN/JUGAR DE NUEVO se conectan a los controles reales del motor (`pause`/`resume` detiene y reanuda el `requestAnimationFrame` real; FIN fuerza game over real; JUGAR DE NUEVO llama a `restart()` del engine). El modal "FIN DEL JUEGO" existente se dispara tanto por FIN manual como cuando el motor reporta `gameover` real (0 vidas), reusando `saveScore()` de `lib/storage` con `game: "asteroids"`.
- Controles: solo teclado (flechas para rotar/propulsar, espacio para disparar), igual al original. Sin controles táctiles.
- Vidas en el HUD: se reutiliza el ícono `♥` genérico ya existente, sin ícono de nave.

**Out of scope (para specs futuros):**

- Cualquier cambio a otros juegos del vault (`bloque-buster`, `caída`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — siguen usando la arena mock de `GamePlayer` sin modificaciones.
- Refactor de `GamePlayer` hacia una interfaz genérica de "motor de juego" reutilizable por otros juegos.
- Controles táctiles/móviles para Asteroids.
- Leaderboard real conectado a base de datos (Supabase) — `saveScore()` sigue usando `localStorage` vía `lib/storage.ts`, sin tocar `lib/supabase/*`.
- Sonido/música (el original no tiene audio; no se agrega en esta spec).
- Responsive scaling del canvas más allá del `aspect-ratio: 4/3` que ya provee `.crt-screen` (el canvas se renderiza a 800×600 fijo dentro de ese contenedor).
- Cambios al copy/metadata de la entrada `asteroids` en `lib/data.ts` más allá del `id` (título, descripción, categoría, etc. quedan igual).
- Redirección desde la ruta antigua `/juego/rocas/...` — no hay tráfico real en producción todavía, así que no se agrega un redirect.

## Data model

Esta feature no introduce persistencia nueva (sigue usando `SavedScore`/`lib/storage.ts` ya existentes). Sí define dos contratos TypeScript nuevos, el "lenguaje" entre el motor y React:

```ts
// components/games/asteroids/engine.ts

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  tripleShotRemaining: number; // segundos restantes, 0 si no está activo
  status: "playing" | "dead" | "gameover"; // igual al `state` original del juego
}

export interface AsteroidsGame {
  start(): void; // arranca el requestAnimationFrame loop
  stop(): void; // cancela el loop (usado por PAUSA y por unmount)
  restart(): void; // reproduce initGame(): score=0, lives=3, level=1
  forceGameOver(): void; // fuerza status="gameover" (usado por el botón FIN)
  destroy(): void; // limpia listeners de teclado y cancela el loop (unmount)
}

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  onStateChange: (state: AsteroidsState) => void,
): AsteroidsGame;
```

`AsteroidsCanvas.tsx` mantiene `AsteroidsState` en un `useState` local (actualizado vía `onStateChange`) y lo expone hacia `GamePlayer` por props (`onScoreChange`, `onGameOver`, o un único `onStateChange` — a definir en el plan de implementación). `GamePlayer` deja de tener su propio `useState<number>(score)` simulado para la rama `asteroids` y usa este estado real en su lugar.

## Implementation plan

1. Crear `components/games/asteroids/engine.ts`: portar `game.js` a TypeScript dentro de `createAsteroidsGame(canvas, onStateChange)`. Las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y las funciones de update/draw se adaptan casi literalmente (mismas constantes `RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`), pero el estado (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`) vive en closures dentro de la factory, no en variables de módulo. Se conservan `drawHUD()` y el overlay `GAME OVER` dibujado en canvas (`drawOverlay`) sin cambios visuales respecto al original; además, al final de cada `update(dt)` se llama `onStateChange({ score, lives, level, tripleShotRemaining: ship.tripleShot, status: state })` para que React reciba el mismo estado en paralelo. El listener de teclado (`keydown`/`keyup`) se agrega en `start()` y se remueve en `destroy()`, no a nivel de módulo. Verificación: `npm run build` compila sin errores de tipos; el archivo no se importa desde ningún lado todavía, así que no hay efecto visible.

2. Crear `components/games/asteroids/AsteroidsCanvas.tsx` (`"use client"`): renderiza `<canvas width={800} height={600}>`, instancia `createAsteroidsGame` en un `useEffect` con guard de un solo mount (ref booleana, protege contra doble-invocación de StrictMode), y lo destruye en el cleanup. Muestra un overlay "ASTEROIDS · PULSA ESPACIO PARA JUGAR" (mismo estilo `.pixel`/`.mono` que el resto del HUD) hasta que el jugador presiona Espacio, momento en que se oculta el overlay y se llama `game.start()`. Expone vía `useImperativeHandle` (con `forwardRef`) los métodos `pause`, `resume`, `restart`, `forceGameOver` que delegan a la instancia del engine, y recibe `onStateChange: (state: AsteroidsState) => void` como prop para reenviar el estado al padre. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.

3. Modificar `lib/data.ts`: cambiar `id: "rocas"` a `id: "asteroids"` en la entrada correspondiente del array `GAMES` (título "ROCAS", descripción y demás campos quedan sin cambios). Verificación: `npm run build` compila; la ruta del juego pasa a ser `/juego/asteroids` y `/juego/asteroids/jugar`.

4. Modificar `components/GamePlayer.tsx`: agregar rama condicional `game.id === "asteroids"`. Para esa rama:
   - Se reemplaza `.game-arena` (mock) por `<AsteroidsCanvas ref={...} onStateChange={...} />` dentro de `.crt-screen`.
   - Se elimina el `useState<number>(score)` simulado y el `setInterval` de incremento falso para esta rama; `score`, `lives`, `level` del HUD superior pasan a leer del `AsteroidsState` recibido por `onStateChange`.
   - Se agrega una celda `hud-stat` "POWER-UP" (mismo patrón que las otras `hud-stat`) visible solo si `tripleShotRemaining > 0`, mostrando `3X · {tripleShotRemaining.toFixed(1)}s`.
   - El botón PAUSA llama `ref.current.pause()`/`resume()` en vez de solo alternar el estado `paused` visual; FIN llama `ref.current.forceGameOver()`; JUGAR DE NUEVO (dentro del modal) llama `ref.current.restart()` en vez de resetear estado de React manualmente.
   - Cuando `AsteroidsState.status === "gameover"` (por muerte real o por FIN manual), se abre el modal "FIN DEL JUEGO" existente con el score real; `saveScore({ game: "asteroids", score, name })` se mantiene sin cambios.
   - Los demás `game.id` siguen el camino actual (mock) sin ningún cambio.
     Verificación: `npm run dev`, navegar a `/juego/asteroids/jugar` — el juego real arranca tras pulsar Espacio, HUD refleja score/vidas/nivel reales.

5. Recorrido end-to-end manual: jugar una partida completa en `/juego/asteroids/jugar` — overlay inicial → Espacio arranca el juego → mover nave, disparar, destruir asteroides (score sube en el HUD real) → recoger power-up (aparece celda POWER-UP) → perder las 3 vidas → se abre el modal "FIN DEL JUEGO" con el score real → guardar puntuación con nombre → "JUGAR DE NUEVO" reinicia limpio (score=0, vidas=3, nivel=1). Repetir probando PAUSA (el juego se congela de verdad, no solo visualmente) y FIN (fuerza el modal antes de morir). Verificación: `npm run build` y `npm run lint` sin errores; recorrido manual completo sin errores en consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] `lib/data.ts` tiene la entrada con `id: "asteroids"` (ya no `"rocas"`), sin cambios en el resto de sus campos.
- [ ] `components/games/asteroids/engine.ts` exporta `createAsteroidsGame(canvas, onStateChange)` sin variables globales de módulo; sigue dibujando su propio HUD y overlay de game over dentro del canvas (igual que el original) y, en paralelo, notifica el mismo estado a React en cada frame.
- [ ] `components/games/asteroids/AsteroidsCanvas.tsx` muestra el overlay "PULSA ESPACIO PARA JUGAR" al montar y no arranca el loop hasta que se presiona Espacio.
- [ ] En `/juego/asteroids/jugar`, el HUD superior (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del juego, no un score simulado, y coexiste visualmente con el HUD dibujado dentro del canvas (score/nivel/vidas/power-up), sin que uno reemplace al otro.
- [ ] La celda "POWER-UP" aparece en el HUD solo mientras `tripleShotRemaining > 0`, con el formato `3X · Ns`.
- [ ] El botón PAUSA detiene realmente el `requestAnimationFrame` del juego (la nave y los asteroides dejan de moverse) y REANUDAR lo retoma sin reiniciar el estado.
- [ ] El botón FIN fuerza la apertura del modal "FIN DEL JUEGO" con el score acumulado hasta ese momento.
- [ ] Perder las 3 vidas dentro del juego real abre automáticamente el modal "FIN DEL JUEGO" con el score real.
- [ ] Guardar puntuación desde el modal llama a `saveScore({ game: "asteroids", ... })` y el registro aparece en `getStoredScores()`.
- [ ] "JUGAR DE NUEVO" reinicia el motor a estado limpio (score 0, 3 vidas, nivel 1) y vuelve a mostrar el overlay de inicio.
- [ ] Controles de teclado (`←` `→` rotar, `↑` propulsar, `Espacio` disparar) funcionan igual que en el original, incluyendo wrap toroidal, split de asteroides y power-up de disparo triple.
- [ ] Ningún otro juego del vault (`bloque-buster`, `caída`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) cambia de comportamiento — siguen usando la arena mock.
- [ ] Desmontar la página (`SALIR` o navegar a otra ruta) no deja el loop de `requestAnimationFrame` corriendo en segundo plano (verificable sin errores/memory leak visible en consola).

## Decisions

- **Sí:** integrar Asteroids solo para `game.id === "asteroids"`, dejando `GamePlayer` mock para el resto. Confirmado con el usuario — evita over-engineering de una interfaz genérica de "motor de juego" sin un segundo caso de uso concreto todavía.
- **Sí:** renombrar el `id` de la entrada de `"rocas"` a `"asteroids"` en `lib/data.ts`, cambiando la ruta real a `/juego/asteroids/...`. Confirmado con el usuario — consistencia de nombres entre el motor (`components/games/asteroids/`), la ruta y el juego real portado.
- **No:** refactor de `GamePlayer` hacia una interfaz genérica reutilizable por otros juegos. Se puede extraer más adelante si se porta un segundo juego real.
- **Sí:** se conserva el HUD dibujado dentro del canvas original (`drawHUD`, overlay de `GAME OVER`) sin cambios, y coexiste con el HUD de React (`.player-hud`), que se sincroniza en paralelo vía `onStateChange`. Confirmado con el usuario — no se elimina ni se reemplaza el HUD ni los controles propios del juego; ambos HUD se mantienen visibles a la vez.
- **No:** ícono de nave triangular para las vidas. Se reutiliza el `♥` genérico ya existente en el HUD, priorizando consistencia visual sobre fidelidad al arcade original.
- **Sí:** motor encapsulado en una factory (`createAsteroidsGame`) con estado en closures, en vez de variables globales de módulo. Confirmado con el usuario — evita estado corrupto entre montajes/StrictMode al navegar entre juegos sin recargar la página.
- **Sí:** `engine.ts` en TypeScript completo con tipos explícitos, no JS calcado. Confirmado con el usuario — consistente con "TypeScript en modo strict" de `CLAUDE.md`; el repo no tiene archivos `.js` en `app/lib/components`.
- **Sí:** pantalla de inicio ("PULSA ESPACIO PARA JUGAR") antes de arrancar el loop, en vez de arranque automático como el original. Confirmado con el usuario.
- **Sí:** bridge completo entre los botones PAUSA/FIN/JUGAR DE NUEVO existentes y controles reales del motor (`pause`/`resume`/`forceGameOver`/`restart`), en vez de dejar el juego con su propio ciclo autónomo. Confirmado con el usuario — mantiene el HUD y los controles ya construidos en `GamePlayer` como interfaz única.
- **No:** controles táctiles/móviles. Confirmado con el usuario — el original tampoco los tiene; se evalúa en un spec futuro si se necesita jugar desde mobile.
- **No:** leaderboard conectado a Supabase. `saveScore()` sigue usando `localStorage` vía `lib/storage.ts`, mismo criterio que specs anteriores (SPEC 04 solo dejó los clientes Supabase listos, sin tablas todavía).
- **No:** sonido/música ni responsive scaling más allá del `aspect-ratio: 4/3` ya provisto por `.crt-screen`. Fuera de alcance de este spec.
- **No:** redirect desde la ruta antigua `/juego/rocas/...`. Confirmado con el usuario — no hay tráfico real en producción todavía que dependa de esa URL.

## Risks

| Riesgo                                                                                                                                                                                       | Mitigación                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renombrar el `id` de `"rocas"` a `"asteroids"` rompe cualquier enlace o dato previamente guardado que apunte a `game: "rocas"` (ej. puntuaciones ya guardadas en `localStorage` con ese id). | Sin impacto real hoy — el proyecto no tiene usuarios ni datos reales en producción todavía. Se documenta como riesgo conocido si se hiciera este cambio más adelante con datos reales.                                                        |
| El `useEffect` que instancia el motor puede ejecutarse dos veces en React 19 StrictMode (dev), duplicando el `requestAnimationFrame` loop o los listeners de teclado.                        | `AsteroidsCanvas.tsx` usa un guard (ref booleana) para asegurar una sola instancia real del engine por montaje, y `destroy()` limpia listeners/loop en cada cleanup del efecto.                                                               |
| Cancelar el `requestAnimationFrame` al pausar/desmontar mal implementado dejaría el loop corriendo en segundo plano, consumiendo CPU incluso con la página oculta.                           | El criterio de aceptación final verifica explícitamente que SALIR/navegar fuera no deja el loop activo; `pause()` y `destroy()` deben llamar a `cancelAnimationFrame` de forma explícita.                                                     |
| Al portar `game.js` (JS sin tipos) a TypeScript estricto, un tipado apresurado podría introducir bugs sutiles de física/colisión (ej. `dist()`, `wrap()`) que no se notan hasta jugar.       | El paso 5 del plan incluye un recorrido manual jugando una partida completa, no solo verificación de compilación.                                                                                                                             |
| Mostrar el HUD del canvas y el HUD de React al mismo tiempo puede leerse como información duplicada (score/vidas/nivel visibles dos veces en pantalla).                                      | Decisión explícita del usuario: se mantienen ambos HUD sin quitar ninguno — el del canvas es fiel al original, el de React da consistencia con PAUSA/FIN/leaderboard del resto del vault. No se considera un defecto a corregir en este spec. |
| El `onStateChange` se llama una vez por `update(dt)`, no por `draw()`, así que el HUD de React puede ir un frame por detrás del HUD dibujado dentro del canvas.                              | Aceptable dado que ambos corren en el mismo `requestAnimationFrame` tick; la diferencia es imperceptible a 60 Hz, se deja documentado.                                                                                                        |
