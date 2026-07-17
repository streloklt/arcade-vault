# SPEC 10 — Controles táctiles y layout responsive para móvil

> **Estado:** Aprobado (actualizado post-implementación con ajustes de recorrido en dispositivo móvil real)
> **Depende de:** SPEC 05 (patrón motor/adaptador), SPEC 06 (leaderboard/catálogo), SPEC 07 (Tetris), SPEC 08 (Arkanoid), SPEC 09 (Snake)
> **Fecha:** 2026-07-17
> **Objetivo:** Agregar controles táctiles (D-pad de 4 direcciones + botones de acción A/B fijos, iguales en los 4 juegos, que simulan eventos de teclado) y hacer responsive el canvas y el HUD de `GamePlayer` para que los 4 juegos del vault (Asteroids, Tetris, Arkanoid, Snake) sean completamente jugables desde pantalla táctil en dispositivos móviles, sin modificar ningún `engine.ts`.

## Scope

**In:**

- `lib/useIsTouchDevice.ts`: hook `useIsTouchDevice()` que detecta capacidad táctil vía `window.matchMedia("(pointer: coarse)")`. SSR-safe: devuelve `false` hasta montar en cliente, y se re-evalúa si cambia el media query (ej. tablet con teclado/mouse externo conectado).
- `components/TouchControls.tsx`: componente genérico `"use client"` que recibe `dpad: TouchButton[]` y `actions: TouchButton[]` (ver Data model) y renderiza el D-pad como una **roseta tipo joystick** (cruz de 4 botones sobre un plato circular, grid 3×3) y los botones de acción **A/B como círculos estilo consola** (B desplazado hacia abajo respecto a A), distribuidos a lo ancho del bloque. Cada botón, en `onPointerDown`, despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code, bubbles: true }))`; en `onPointerUp`/`onPointerLeave`/`onPointerCancel`, despacha el `keyup` equivalente — salvo que `button.disabled` sea `true`, en cuyo caso no despacha nada. Usa Pointer Events (no Touch Events) para que funcione igual con dedo, mouse o stylus, y `touch-action: none` para evitar scroll/zoom accidental al tocar.
- Campo opcional nuevo `touchControls?: { dpad: TouchButton[]; actions: TouchButton[] }` en la interfaz `GameEngine` de `components/games/registry.tsx`. Los 4 juegos comparten el **mismo layout fijo**: D-pad de 4 direcciones (▲◀▼▶) + 2 botones de acción **A** (`Space`) y **B** (`KeyX`), generado por el helper `standardTouchControls(activeCodes)`. Los botones cuyo `code` el engine del juego actual no escucha se marcan `disabled: true` (se siguen mostrando, para mantener el layout idéntico en los 4 juegos, pero apagados y sin efecto — ver Data model para el detalle de codes activos por juego). Ningún `engine.ts` se modifica: los botones táctiles reutilizan los mismos listeners de teclado (`e.code`/`e.key`) que ya escuchan cada motor.
- `components/GamePlayer.tsx`: usa `useIsTouchDevice()` y renderiza `<TouchControls />` (con la config de `engine.touchControls`) debajo del bloque `.crt`, solo si `isTouch && engine?.touchControls` existen (`showGamepad`). El teclado físico sigue funcionando en paralelo sin ninguna condición (coexisten siempre, no hay modo exclusivo). Además, mientras `showGamepad` es verdadero, `GamePlayer` agrega la clase `av-hide-nav` al `<body>`, que oculta por completo (`display: none`) el nav global (`.av-nav` de `components/Nav.tsx`) para maximizar el espacio vertical disponible en la pantalla de juego móvil.
- Los 4 componentes `*Canvas.tsx` (`AsteroidsCanvas`, `TetrisCanvas`, `ArkanoidCanvas`, `SnakeCanvas`) usan `useIsTouchDevice()` para diferenciar el arranque del juego: en desktop se mantiene "PULSA ESPACIO PARA JUGAR" (listener de teclado `Space`); en dispositivos táctiles el overlay dice "TOCA PARA JUGAR" y el propio overlay es tappeable (`onClick`) para iniciar — el listener de `Space` no se registra en touch, evitando arranque duplicado.
- Layout responsive en el breakpoint `max-width: 768px` (mismo breakpoint en `player-hud`, contenedor del canvas y `TouchControls`):
  - El contenedor del canvas escala visualmente por CSS (`max-width: 100%; height: auto`, aspect ratio del canvas preservado) para cada juego, sin recorte ni scroll horizontal. La resolución interna del `<canvas>` (800×600 u 800×800 según el juego) no cambia — ningún engine recalcula coordenadas.
  - `.player-hud` reacomoda sus stats (Jugador/Puntuación/Vidas/Nivel/`extraStats`) en un grid de 2 columnas, y los botones PAUSA/FIN/SALIR pasan a un grid de 3 columnas iguales con ancho completo.
  - `TouchControls` se ubica en su propio bloque fijo debajo del `.crt` (con separación explícita vía `margin-top`, 28px en desktop / 20px en móvil), sin superponerse al área de juego: D-pad en roseta a la izquierda, botones A/B circulares a la derecha, distribuidos con `justify-content: space-between` para ocupar todo el ancho disponible en vez de quedar agrupados a la izquierda. Tamaño mínimo de botón 44×44px (área táctil accesible).
- Layout y estado de botones por juego (ver Data model para el detalle exacto): los 4 juegos muestran siempre las 4 flechas + A + B; Asteroids tiene activos ◀▲▶ + A (▼ y B disabled); Tetris tiene los 6 activos (ninguno disabled); Arkanoid tiene activos solo ◀▶ (▲▼ A B disabled); Snake tiene activas las 4 flechas (A y B disabled).

**Out of scope (para specs futuros):**

- Soporte de gamepad/mando Bluetooth físico.
- Feedback háptico (vibración) al tocar los botones.
- Bloqueo o sugerencia de orientación landscape — el canvas escala tal cual en portrait, sin pedir rotar el dispositivo.
- Gestos swipe/drag como método de control (descartado a favor de D-pad de botones; incluye el drag directo sobre el canvas de Arkanoid, que se descarta en favor de botones ←/→ iguales a los demás juegos).
- Ocultar/resumir stats del HUD en móvil — todas las stats existentes se muestran, solo se reacomoda el layout.
- Fullscreen API / instalación como PWA.
- Cambios de balance o lógica de juego en cualquier `engine.ts` — este spec es puramente de input y layout.
- Rediseño visual de los botones existentes fuera de `TouchControls` (`.btn`, clases de color en PAUSA/FIN/SALIR, etc.) — siguen reutilizando las variables de tema y clases ya definidas en `app/globals.css`/`app/arcade.css`. `TouchControls` sí tiene su propia identidad visual (roseta circular para el D-pad, botones A/B redondos), ver Scope (In) y Decisions.

## Data model

Esta feature no introduce persistencia nueva. Define el contrato TypeScript entre `registry.tsx`, `GamePlayer.tsx` y `TouchControls.tsx`:

```ts
// components/TouchControls.tsx
export interface TouchButton {
  code: string; // KeyboardEvent.code/key simulado, ej. "ArrowLeft", "Space", "KeyX"
  label: string; // texto visible en el botón, ej. "◀", "▲", "A", "B"
  // true si el engine del juego actual no escucha este code: el botón se
  // muestra igual (layout fijo en los 4 juegos) pero deshabilitado — no
  // despacha keydown/keyup y se ve apagado (grayscale).
  disabled?: boolean;
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

Los 4 juegos comparten el mismo layout de botones (4 direcciones + A + B), generado por un
helper que marca `disabled` los codes que el engine de ese juego no escucha:

```ts
// components/games/registry.tsx
function standardTouchControls(activeCodes: Set<string>) {
  const withState = (button: TouchButton): TouchButton => ({
    ...button,
    disabled: !activeCodes.has(button.code),
  });
  return {
    dpad: [
      { code: "ArrowUp", label: "▲" },
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowDown", label: "▼" },
      { code: "ArrowRight", label: "▶" },
    ].map(withState),
    actions: [
      { code: "Space", label: "A" },
      { code: "KeyX", label: "B" },
    ].map(withState),
  };
}
```

Mapeo concreto de `activeCodes` por juego (el resto de los 6 botones queda `disabled: true`):

| Juego     | Codes activos                                                      | Botones disabled |
| --------- | ------------------------------------------------------------------ | ---------------- |
| asteroids | `ArrowLeft`, `ArrowUp`, `ArrowRight`, `Space`                      | ▼, B             |
| tetris    | `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Space`, `KeyX` | ninguno          |
| arkanoid  | `ArrowLeft`, `ArrowRight`                                          | ▲, ▼, A, B       |
| snake     | `ArrowUp`, `ArrowLeft`, `ArrowDown`, `ArrowRight`                  | A, B             |

```ts
asteroids: {
  touchControls: standardTouchControls(
    new Set(["ArrowLeft", "ArrowUp", "ArrowRight", "Space"]),
  ),
},
tetris: {
  touchControls: standardTouchControls(
    new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyX"]),
  ),
},
arkanoid: {
  touchControls: standardTouchControls(new Set(["ArrowLeft", "ArrowRight"])),
},
snake: {
  touchControls: standardTouchControls(
    new Set(["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]),
  ),
},
```

## Implementation plan

1. Crear `lib/useIsTouchDevice.ts` con el hook `useIsTouchDevice()` (`matchMedia("(pointer: coarse)")`, SSR-safe, se suscribe a cambios del media query). Verificación: `npm run build` compila; el hook no se usa todavía.
2. Crear `components/TouchControls.tsx`: renderiza el D-pad como roseta (grid 3×3 sobre plato circular) y los botones de acción A/B como círculos, recibidos por props, usando Pointer Events (`onPointerDown` → `keydown` sintético, `onPointerUp`/`onPointerLeave`/`onPointerCancel` → `keyup` sintético) — sin despachar nada si `button.disabled`. `touch-action: none` y clases propias (`.touch-controls*`) coherentes con el sistema visual existente. Verificación: `npm run build` compila; el componente no se usa todavía en ninguna página.
3. Extender la interfaz `GameEngine` en `components/games/registry.tsx` con el campo opcional `touchControls`, agregar el helper `standardTouchControls(activeCodes)` y completar el mapeo de `activeCodes` para las 4 entradas (`asteroids`, `tetris`, `arkanoid`, `snake`) según la tabla de la sección Data model. Verificación: `npm run build` compila sin errores de tipos; `TouchControls` sigue sin renderizarse en ningún lado.
4. Modificar `components/GamePlayer.tsx`: importar `useIsTouchDevice` y `TouchControls`, calcular `showGamepad = isTouch && Boolean(engine?.touchControls)`, renderizar `<TouchControls dpad={...} actions={...} />` debajo del bloque `.crt` cuando `showGamepad` sea verdadero, y agregar/quitar la clase `av-hide-nav` en `document.body` vía `useEffect` según `showGamepad` (con cleanup al desmontar). Verificación manual: con Chrome DevTools → "Toggle device toolbar" (dispositivo con touch emulado), el gamepad aparece debajo del canvas y el nav global desaparece por completo en los 4 juegos con motor propio; en un juego mock (sin `engine`) o en desktop sin emulación táctil, ambos comportamientos quedan como antes (nav visible, sin gamepad).
5. Modificar los 4 `*Canvas.tsx`: agregar `useIsTouchDevice()`, condicionar el listener de teclado `Space` a `!isTouch`, y en el overlay de inicio mostrar "TOCA PARA JUGAR" con `onClick` que arranca el juego cuando `isTouch` es verdadero (en vez de "PULSA ESPACIO PARA JUGAR", que se mantiene en desktop). Verificación manual: en viewport táctil emulado, tocar el overlay arranca el juego; en desktop, sigue funcionando solo con `Space`.
6. Agregar el breakpoint responsive `@media (max-width: 768px)` en `app/arcade.css`: contenedor del canvas con `max-width: 100%; height: auto` preservando aspect ratio, `.player-hud` reacomodado en grid (2 columnas para stats, 3 columnas para PAUSA/FIN/SALIR) sin overlap ni texto cortado, y estilos de `TouchControls` (roseta del D-pad, A/B circulares, `justify-content: space-between` para ocupar todo el ancho, botones ≥44×44px, `margin-top` de separación respecto al `.crt`). Verificación manual: con el viewport emulado en 375×667 y 393×852 (referencia: captura de Samsung Galaxy provista), ningún elemento del HUD se corta ni se superpone, el canvas se ve completo sin scroll horizontal, el D-pad se ve en cruz (no en fila) y los botones ocupan el ancho completo del bloque, en los 4 juegos.
7. Recorrido end-to-end manual (emulador táctil de Chrome DevTools o dispositivo físico) para cada uno de los 4 juegos en `/juego/<id>/jugar`: confirmar que cada botón activo de `TouchControls` reproduce exactamente el efecto de su tecla física, que los botones `disabled` se ven apagados y no producen ningún efecto (Asteroids: ▼ y B; Arkanoid: ▲▼AB; Snake: A y B), que el nav global no aparece mientras el gamepad está visible, que el teclado físico (si hay uno conectado, ej. tablet con case) sigue funcionando en paralelo sin conflicto, y que PAUSA/FIN/SALIR y el modal de fin de partida (incluido el input de iniciales) son operables por tap. Verificación: `npm run build` y `npm run lint` sin errores nuevos; recorrido manual sin errores de consola en los 4 juegos.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] Ningún archivo `engine.ts` de los 4 juegos fue modificado.
- [ ] `useIsTouchDevice()` devuelve `true` en un viewport con `pointer: coarse` emulado y `false` en desktop sin emulación.
- [ ] En viewport táctil, `GamePlayer` muestra `TouchControls` (D-pad en roseta + A/B circulares, ocupando todo el ancho del bloque) debajo del canvas para los 4 juegos con motor propio (`asteroids`, `tetris`, `arkanoid`, `snake`); no aparece en desktop sin emulación táctil ni en juegos mock sin `engine`.
- [ ] Mientras `TouchControls` está visible, el nav global (`.av-nav`) no se renderiza (`display: none` vía `body.av-hide-nav`); al salir de la pantalla de juego o en desktop, el nav vuelve a mostrarse normalmente.
- [ ] En los 4 juegos, las 4 flechas y los botones A/B se muestran siempre; los que el engine del juego actual no escucha aparecen visualmente apagados (`disabled`) y tocarlos no produce ningún efecto ni despacha evento.
- [ ] En Asteroids, tocar ◀/▶ rota la nave, tocar ▲ activa el empuje mientras se mantiene presionado, tocar A dispara un proyectil por tap; ▼ y B están disabled y no hacen nada.
- [ ] En Tetris, tocar ◀/▶ mueve la pieza, tocar ▼ activa soft drop mientras se mantiene presionado, tocar ▲ rota la pieza, tocar A ejecuta hard drop y tocar B rota con el método alternativo (`KeyX`); ningún botón está disabled.
- [ ] En Arkanoid, tocar ◀/▶ mueve la paleta mientras se mantiene presionado, con el mismo límite de bordes que el teclado; ▲, ▼, A y B están disabled y no hacen nada.
- [ ] En Snake, tocar cualquiera de las 4 flechas cambia la dirección de la serpiente, y un giro de 180° instantáneo sigue siendo ignorado igual que con teclado; A y B están disabled y no hacen nada.
- [ ] El teclado físico sigue moviendo/disparando en los 4 juegos sin ningún cambio de comportamiento respecto a antes de este spec.
- [ ] En dispositivo/viewport táctil, el overlay de inicio de cada juego dice "TOCA PARA JUGAR" y arranca el juego al tocarlo, sin depender de la tecla `Space`; en desktop sigue diciendo "PULSA ESPACIO PARA JUGAR" y solo arranca con esa tecla.
- [ ] En un viewport de 375–393px de ancho, el canvas de cada uno de los 4 juegos se ve completo (sin recorte) y sin scroll horizontal en la página.
- [ ] En ese mismo viewport, ningún stat de `.player-hud` (Jugador/Puntuación/Vidas/Nivel/`extraStats`) aparece cortado a la mitad ni superpuesto con otro elemento, y los botones PAUSA/FIN/SALIR se ven parejos (mismo ancho) en su grid de 3 columnas.
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
- **Sí:** el canvas escala visualmente por CSS (`max-width:100%; height:auto`) manteniendo su resolución interna fija, en vez de redimensionar la resolución real y recalcular coordenadas en cada engine. Confirmado con el usuario — cero riesgo de tocar la lógica de juego.
- **Sí:** franja de `TouchControls` fija debajo del canvas, no superpuesta, con separación explícita (`margin-top`) respecto al `.crt`. Confirmado con el usuario en una ronda de ajuste posterior — la separación por defecto entre bloques no se notaba lo suficiente en dispositivo real.
- **Sí:** breakpoint móvil en `768px`. Confirmado con el usuario.
- **No:** forzar o sugerir orientación landscape — el canvas escala tal cual en portrait. Confirmado con el usuario.
- **No:** gamepad físico, feedback háptico, fullscreen/PWA. Fuera de alcance, no discutido a fondo pero consistente con el criterio de specs previos de no expandir alcance más allá de lo pedido.

**Refinamientos posteriores a la aprobación original** (confirmados con el usuario tras probar en dispositivo móvil real):

- **Sí:** layout de botones **unificado y fijo** en los 4 juegos (4 flechas + A + B), en vez del mapeo variable por juego (D-pad distinto y labels como `DISPARAR`/`ROTAR`/`CAÍDA` de la primera versión). Reemplaza la decisión "Tetris resuelve sus 5 acciones con D-pad (←↓→) + 2 botones de acción (ROTAR, CAÍDA)" de la versión original de este spec.
- **Sí:** botones sin función en el juego actual se muestran **`disabled`** (apagados, sin despachar evento) en vez de ocultarse — prioriza un layout predecible e idéntico en los 4 juegos sobre mostrar solo los botones relevantes.
- **Sí:** el D-pad se renderiza como **roseta de joystick** (cruz sobre plato circular) y A/B como **círculos estilo consola**, en vez de una franja lineal de botones con `.btn` genérico — sí es un rediseño visual, pero acotado a `TouchControls` (los demás botones del sitio no cambian).
- **Sí:** `TouchControls` usa `justify-content: space-between` para ocupar todo el ancho del bloque, en vez de quedar agrupado a la izquierda — el layout original colapsaba visualmente cuando un juego (ej. Arkanoid) no tenía botones de acción.
- **Sí:** overlay de inicio "toca para jugar" en dispositivos táctiles (arranca por tap), en vez de seguir exigiendo la tecla `Space` — detectado como bug de UX en el recorrido en dispositivo real (no había forma de arrancar el juego sin teclado físico).
- **Sí:** ocultar el nav global (`av-hide-nav` en `<body>`) mientras el gamepad está visible, para maximizar el espacio vertical en pantallas móviles chicas.
- **Sí:** HUD reacomodado en **grid** (2 columnas para stats, 3 columnas iguales para PAUSA/FIN/SALIR) en vez de "fila con wrap" — el wrap libre dejaba anchos de botón dispares y un stat aislado en su propia fila con espacio vacío.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                                 | Mitigación                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KeyboardEvent` sintéticos despachados desde JS pueden comportarse distinto a eventos reales en navegadores/dispositivos específicos (ej. restricciones de Safari/iOS sobre eventos sintéticos en ciertos contextos).                                                                                                                  | El paso 7 del plan requiere recorrido manual en un dispositivo/emulador táctil real (no solo unit-level), verificando cada botón contra su tecla física equivalente en los 4 juegos antes de dar la feature por terminada. |
| Detección por `pointer: coarse` puede mostrar `TouchControls` en laptops con pantalla táctil que también tienen teclado físico, generando una franja de botones innecesaria para ese usuario.                                                                                                                                          | Aceptado como comportamiento esperado: los controles táctiles y el teclado coexisten siempre (ver Decisions), así que mostrar la franja de más no rompe nada, solo ocupa espacio vertical adicional.                       |
| El escalado CSS del canvas (`max-width:100%; height:auto`) puede dejar los controles táctiles muy chicos en pantallas angostas si no se fija un tamaño mínimo de botón.                                                                                                                                                                | El paso 6 del plan fija explícitamente un tamaño mínimo de 44×44px por botón, independiente del ancho de pantalla.                                                                                                         |
| Caché del navegador/bfcache en dispositivos móviles reales puede servir una versión vieja del bundle o del DOM tras un cambio de código, dando la falsa impresión de que un fix no funcionó (confirmado durante el recorrido de esta feature: hubo que forzar cierre completo del navegador para ver la clase `av-hide-nav` aplicada). | Al validar un fix en dispositivo real que no se refleja, descartar primero caché/bfcache (recarga forzada, cerrar la app del navegador por completo, o probar en pestaña privada) antes de asumir que el código está mal.  |
| Next.js 16.2.10/React 19.2.4 no son las versiones conocidas por el asistente; este spec no toca routing/data-fetching/caching, pero si `/spec-impl` termina modificando algo de `app/juego/[id]/...` de forma indirecta, debe verificar contra `node_modules/next/dist/docs/` en vez de asumir convenciones recordadas.                | Recordatorio heredado de `AGENTS.md`, aplicable solo si algún paso de implementación termina tocando esas rutas.                                                                                                           |

## What is **not** in this spec

- Soporte de gamepad/mando Bluetooth físico.
- Feedback háptico (vibración).
- Bloqueo o sugerencia de orientación landscape.
- Gestos swipe/drag (incluye drag directo sobre el canvas de Arkanoid).
- Ocultar/resumir stats del HUD en móvil.
- Fullscreen API / PWA.
- Cambios de balance o lógica de juego en cualquier `engine.ts`.
- Rediseño visual de los botones existentes fuera de `TouchControls` (PAUSA/FIN/SALIR, etc.).

Cada uno de estos, si se necesita, va en un spec futuro.
