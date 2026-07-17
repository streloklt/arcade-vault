# SPEC 10 — Controles táctiles y layout responsive para móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 05 (patrón motor/adaptador), SPEC 06 (leaderboard/catálogo), SPEC 07 (Tetris), SPEC 08 (Arkanoid), SPEC 09 (Snake)
> **Fecha:** 2026-07-17
> **Objetivo:** Agregar controles táctiles (D-pad + botones de acción configurables por juego, que simulan eventos de teclado) y hacer responsive el canvas y el HUD de `GamePlayer` para que los 4 juegos del vault (Asteroids, Tetris, Arkanoid, Snake) sean completamente jugables desde pantalla táctil en dispositivos móviles, sin modificar ningún `engine.ts`.

## Scope

**In:**

- `lib/useIsTouchDevice.ts`: hook `useIsTouchDevice()` que detecta capacidad táctil vía `window.matchMedia("(pointer: coarse)")`. SSR-safe: devuelve `false` hasta montar en cliente, y se re-evalúa si cambia el media query (ej. tablet con teclado/mouse externo conectado).
- `components/TouchControls.tsx`: componente genérico `"use client"` que recibe `dpad: TouchButton[]` y `actions: TouchButton[]` (ver Data model) y renderiza una franja fija de botones. Cada botón, en `onPointerDown`, despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }))`; en `onPointerUp`/`onPointerLeave`/`onPointerCancel`, despacha el `keyup` equivalente. Usa Pointer Events (no Touch Events) para que funcione igual con dedo, mouse o stylus, y `touch-action: none` para evitar scroll/zoom accidental al tocar.
- Campo opcional nuevo `touchControls?: { dpad: TouchButton[]; actions: TouchButton[] }` en la interfaz `GameEngine` de `components/games/registry.tsx`, completado para las 4 entradas existentes (ver Data model para el mapeo exacto de botones por juego). Ningún `engine.ts` se modifica: los botones táctiles reutilizan los mismos listeners de teclado (`e.code`/`e.key`) que ya escuchan cada motor.
- `components/GamePlayer.tsx`: usa `useIsTouchDevice()` y renderiza `<TouchControls />` (con la config de `engine.touchControls`) debajo del bloque `.crt`, solo si `isTouch && engine?.touchControls` existen. El teclado físico sigue funcionando en paralelo sin ninguna condición (coexisten siempre, no hay modo exclusivo).
- Layout responsive en el breakpoint `max-width: 768px` (mismo breakpoint en `player-hud`, contenedor del canvas y `TouchControls`):
  - El contenedor del canvas escala visualmente por CSS (`max-width: 100%; height: auto`, aspect ratio del canvas preservado) para cada juego, sin recorte ni scroll horizontal. La resolución interna del `<canvas>` (800×600 u 800×800 según el juego) no cambia — ningún engine recalcula coordenadas.
  - `.player-hud` reacomoda sus stats (Jugador/Puntuación/Vidas/Nivel/`extraStats`) en una fila con wrap limpio (sin cortar texto a la mitad), y los botones PAUSA/FIN/SALIR bajan a su propia fila con ancho completo.
  - La franja de `TouchControls` se ubica en su propio bloque fijo debajo del `.crt`, sin superponerse al área de juego: D-pad agrupado a la izquierda, botones de acción (si el juego los tiene) a la derecha, tamaño mínimo de botón 44×44px (área táctil accesible).
- Mapeo de botones confirmado por juego (ver Data model): Asteroids = D-pad ←↑→ + acción DISPARAR; Tetris = D-pad ←↓→ + acciones ROTAR y CAÍDA; Arkanoid = D-pad ←→ (sin acciones); Snake = D-pad de 4 direcciones (sin acciones).

**Out of scope (para specs futuros):**

- Soporte de gamepad/mando Bluetooth físico.
- Feedback háptico (vibración) al tocar los botones.
- Bloqueo o sugerencia de orientación landscape — el canvas escala tal cual en portrait, sin pedir rotar el dispositivo.
- Gestos swipe/drag como método de control (descartado a favor de D-pad de botones; incluye el drag directo sobre el canvas de Arkanoid, que se descarta en favor de botones ←/→ iguales a los demás juegos).
- Ocultar/resumir stats del HUD en móvil — todas las stats existentes se muestran, solo se reacomoda el layout.
- Fullscreen API / instalación como PWA.
- Cambios de balance o lógica de juego en cualquier `engine.ts` — este spec es puramente de input y layout.
- Rediseño visual de los botones existentes (`.btn`, clases de color) — `TouchControls` reutiliza las variables de tema y clases ya definidas en `app/globals.css`/`app/arcade.css`.

## Data model

Esta feature no introduce persistencia nueva. Define el contrato TypeScript entre `registry.tsx`, `GamePlayer.tsx` y `TouchControls.tsx`:

```ts
// components/TouchControls.tsx
export interface TouchButton {
  code: string; // KeyboardEvent.code/key simulado, ej. "ArrowLeft", "Space"
  label: string; // texto visible en el botón, ej. "◀", "DISPARAR", "ROTAR"
}

export function TouchControls(props: {
  dpad: TouchButton[];
  actions: TouchButton[];
}): JSX.Element;
```

```ts
// components/games/registry.tsx (extiende GameEngine existente)
export interface GameEngine {
  Canvas: ForwardRefExoticComponent<
    GameCanvasProps & RefAttributes<GameCanvasHandle>
  >;
  initialState: GameState;
  hasSkins?: boolean;
  touchControls?: {
    dpad: TouchButton[];
    actions: TouchButton[];
  };
}
```

Mapeo concreto por juego (valores literales a completar en `GAME_ENGINES`):

```ts
asteroids: {
  touchControls: {
    dpad: [
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowUp", label: "▲" },
      { code: "ArrowRight", label: "▶" },
    ],
    actions: [{ code: "Space", label: "DISPARAR" }],
  },
},
tetris: {
  touchControls: {
    dpad: [
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowDown", label: "▼" },
      { code: "ArrowRight", label: "▶" },
    ],
    actions: [
      { code: "ArrowUp", label: "ROTAR" },
      { code: "Space", label: "CAÍDA" },
    ],
  },
},
arkanoid: {
  touchControls: {
    dpad: [
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowRight", label: "▶" },
    ],
    actions: [],
  },
},
snake: {
  touchControls: {
    dpad: [
      { code: "ArrowUp", label: "▲" },
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowDown", label: "▼" },
      { code: "ArrowRight", label: "▶" },
    ],
    actions: [],
  },
},
```

## Implementation plan

1. Crear `lib/useIsTouchDevice.ts` con el hook `useIsTouchDevice()` (`matchMedia("(pointer: coarse)")`, SSR-safe, se suscribe a cambios del media query). Verificación: `npm run build` compila; el hook no se usa todavía.
2. Crear `components/TouchControls.tsx`: renderiza el D-pad y los botones de acción recibidos por props, usando Pointer Events (`onPointerDown` → `keydown` sintético, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `keyup` sintético), con `touch-action: none` y clases reutilizando el sistema visual existente (`.btn` u otra clase nueva coherente). Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.
3. Extender la interfaz `GameEngine` en `components/games/registry.tsx` con el campo opcional `touchControls`, y completar el mapeo exacto de la sección Data model para las 4 entradas (`asteroids`, `tetris`, `arkanoid`, `snake`). Verificación: `npm run build` compila sin errores de tipos; `TouchControls` sigue sin renderizarse en ningún lado.
4. Modificar `components/GamePlayer.tsx`: importar `useIsTouchDevice` y `TouchControls`, renderizar `<TouchControls dpad={...} actions={...} />` debajo del bloque `.crt` cuando `isTouch && engine?.touchControls` sean verdaderos. Verificación manual: con Chrome DevTools → "Toggle device toolbar" (dispositivo con touch emulado), la franja de botones aparece debajo del canvas en los 4 juegos con motor propio; en un juego mock (sin `engine`) o en desktop sin emulación táctil, no aparece.
5. Agregar el breakpoint responsive `@media (max-width: 768px)` en `app/arcade.css` (o `app/globals.css`, según donde vivan hoy `.player-hud`/`.crt`): contenedor del canvas con `max-width: 100%; height: auto` preservando aspect ratio, `.player-hud` reacomodado en filas sin overlap ni texto cortado, y estilos de la franja `TouchControls` (D-pad a la izquierda, acciones a la derecha, botones ≥44×44px). Verificación manual: con el viewport emulado en 375×667 y 393×852 (referencia: captura de Samsung Galaxy provista), ningún elemento del HUD se corta ni se superpone, el canvas se ve completo sin scroll horizontal, en los 4 juegos.
6. Recorrido end-to-end manual (emulador táctil de Chrome DevTools o dispositivo físico) para cada uno de los 4 juegos en `/juego/<id>/jugar`: confirmar que cada botón de `TouchControls` reproduce exactamente el efecto de su tecla física (Asteroids: rotar con ◀/▶, empuje con ▲, disparo con DISPARAR; Tetris: mover con ◀/▶, soft drop con ▼, rotar con ROTAR, hard drop con CAÍDA; Arkanoid: mover paleta con ◀/▶; Snake: cambiar dirección con las 4 flechas sin giro de 180°), que el teclado físico (si hay uno conectado, ej. tablet con case) sigue funcionando en paralelo sin conflicto, y que PAUSA/FIN/SALIR y el modal de fin de partida (incluido el input de iniciales) son operables por tap. Verificación: `npm run build` y `npm run lint` sin errores nuevos; recorrido manual sin errores de consola en los 4 juegos.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] Ningún archivo `engine.ts` de los 4 juegos fue modificado.
- [ ] `useIsTouchDevice()` devuelve `true` en un viewport con `pointer: coarse` emulado y `false` en desktop sin emulación.
- [ ] En viewport táctil, `GamePlayer` muestra la franja `TouchControls` debajo del canvas para los 4 juegos con motor propio (`asteroids`, `tetris`, `arkanoid`, `snake`); no aparece en desktop sin emulación táctil ni en juegos mock sin `engine`.
- [ ] En Asteroids, tocar ◀/▶ rota la nave, tocar ▲ activa el empuje mientras se mantiene presionado, y tocar DISPARAR dispara un proyectil por tap.
- [ ] En Tetris, tocar ◀/▶ mueve la pieza, tocar ▼ activa soft drop mientras se mantiene presionado, tocar ROTAR rota la pieza, y tocar CAÍDA ejecuta hard drop.
- [ ] En Arkanoid, tocar ◀/▶ mueve la paleta mientras se mantiene presionado, con el mismo límite de bordes que el teclado.
- [ ] En Snake, tocar cualquiera de las 4 flechas cambia la dirección de la serpiente, y un giro de 180° instantáneo sigue siendo ignorado igual que con teclado.
- [ ] El teclado físico sigue moviendo/disparando en los 4 juegos sin ningún cambio de comportamiento respecto a antes de este spec.
- [ ] En un viewport de 375–393px de ancho, el canvas de cada uno de los 4 juegos se ve completo (sin recorte) y sin scroll horizontal en la página.
- [ ] En ese mismo viewport, ningún stat de `.player-hud` (Jugador/Puntuación/Vidas/Nivel/`extraStats`) aparece cortado a la mitad ni superpuesto con otro elemento.
- [ ] Los botones PAUSA/FIN/SALIR y el modal de fin de partida (incluido el input de iniciales y "GUARDAR PUNTUACIÓN") son operables por tap en el viewport táctil emulado.
- [ ] Ningún otro juego mock, ruta o funcionalidad existente (biblioteca, salón de la fama, selector de skins) cambia de comportamiento en desktop.

## Decisions

- **Sí:** un solo spec cubre la capa compartida (`TouchControls`, hook de detección, responsive) y el cableado de los 4 juegos en el mismo plan de implementación, en vez de dividirlo en specs por juego. Confirmado con el usuario — prioriza coherencia de una sola vez sobre specs más chicos.
- **Sí:** controles táctiles como botones on-screen (D-pad + acciones), no gestos swipe/drag. Confirmado con el usuario — predecible y sin heurísticas de gesto distintas por juego.
- **Sí:** detección automática por `matchMedia("(pointer: coarse)")`, sin toggle manual. Confirmado con el usuario.
- **Sí:** teclado y controles táctiles coexisten siempre — ningún modo exclusivo. Confirmado con el usuario.
- **Sí:** Arkanoid usa D-pad de botones (←/→), no drag directo sobre el canvas. Confirmado con el usuario — revierte la idea inicial de drag para mantener el mismo mecanismo (`KeyboardEvent` sintético) en los 4 juegos sin tocar ningún `engine.ts`.
- **Sí:** el mecanismo de conexión es despachar `KeyboardEvent` sintéticos (`keydown`/`keyup`) en `window`, reutilizando los listeners de teclado que cada motor ya tiene. Confirmado con el usuario — cero cambios en los 4 `engine.ts`, en vez de agregar una API táctil explícita (`pressLeft()`/`shoot()`) a cada uno.
- **Sí:** Pointer Events (`onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel`) en vez de Touch Events. Decisión técnica del agente (no discutida explícitamente) — unifica touch/mouse/stylus y facilita probar en desktop sin emulación táctil real.
- **Sí:** Tetris resuelve sus 5 acciones con D-pad (←↓→) + 2 botones de acción (ROTAR, CAÍDA), en vez de un D-pad de 4 flechas con ↑=rotar. Confirmado con el usuario.
- **Sí:** el canvas escala visualmente por CSS (`max-width:100%; height:auto`) manteniendo su resolución interna fija, en vez de redimensionar la resolución real y recalcular coordenadas en cada engine. Confirmado con el usuario — cero riesgo de tocar la lógica de juego.
- **Sí:** HUD reacomodado en 2 filas con wrap limpio en móvil, mostrando todas las stats existentes (no se resume ni oculta información). Confirmado con el usuario.
- **Sí:** franja de `TouchControls` fija debajo del canvas, no superpuesta. Confirmado con el usuario.
- **Sí:** breakpoint móvil en `768px`. Confirmado con el usuario.
- **No:** forzar o sugerir orientación landscape — el canvas escala tal cual en portrait. Confirmado con el usuario.
- **No:** gamepad físico, feedback háptico, fullscreen/PWA, rediseño visual de botones existentes. Fuera de alcance, no discutido a fondo pero consistente con el criterio de specs previos de no expandir alcance más allá de lo pedido.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                  | Mitigación                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KeyboardEvent` sintéticos despachados desde JS pueden comportarse distinto a eventos reales en navegadores/dispositivos específicos (ej. restricciones de Safari/iOS sobre eventos sintéticos en ciertos contextos).                                                                                                   | El paso 6 del plan requiere recorrido manual en un dispositivo/emulador táctil real (no solo unit-level), verificando cada botón contra su tecla física equivalente en los 4 juegos antes de dar la feature por terminada. |
| Detección por `pointer: coarse` puede mostrar `TouchControls` en laptops con pantalla táctil que también tienen teclado físico, generando una franja de botones innecesaria para ese usuario.                                                                                                                           | Aceptado como comportamiento esperado: los controles táctiles y el teclado coexisten siempre (ver Decisions), así que mostrar la franja de más no rompe nada, solo ocupa espacio vertical adicional.                       |
| El escalado CSS del canvas (`max-width:100%; height:auto`) puede dejar los controles táctiles muy chicos en pantallas angostas si no se fija un tamaño mínimo de botón.                                                                                                                                                 | El paso 5 del plan fija explícitamente un tamaño mínimo de 44×44px por botón, independiente del ancho de pantalla.                                                                                                         |
| Next.js 16.2.10/React 19.2.4 no son las versiones conocidas por el asistente; este spec no toca routing/data-fetching/caching, pero si `/spec-impl` termina modificando algo de `app/juego/[id]/...` de forma indirecta, debe verificar contra `node_modules/next/dist/docs/` en vez de asumir convenciones recordadas. | Recordatorio heredado de `AGENTS.md`, aplicable solo si algún paso de implementación termina tocando esas rutas.                                                                                                           |

## What is **not** in this spec

- Soporte de gamepad/mando Bluetooth físico.
- Feedback háptico (vibración).
- Bloqueo o sugerencia de orientación landscape.
- Gestos swipe/drag (incluye drag directo sobre el canvas de Arkanoid).
- Ocultar/resumir stats del HUD en móvil.
- Fullscreen API / PWA.
- Cambios de balance o lógica de juego en cualquier `engine.ts`.
- Rediseño visual de los botones existentes.

Cada uno de estos, si se necesita, va en un spec futuro.
