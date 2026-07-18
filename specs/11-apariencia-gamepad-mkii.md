# SPEC 11 — Apariencia Gamepad MK-II para TouchControls

> **Estado:** aprobado
> **Depende de:** SPEC 10 (controles táctiles y layout responsive para móvil)
> **Fecha:** 2026-07-17
> **Objetivo:** Reestilar visualmente el gamepad táctil (`TouchControls`) para que sea idéntico a la referencia `references/gamepad-assets/gamepad.html`/`gamepad-neon.png` (carcasa de consola, D-pad con flechas SVG y hub con gema, botones A/B tipo consola con glow y anillos), sin cambiar ninguna lógica de input ni el contrato existente de SPEC 10.

## Scope

**In:**

- `components/TouchControls.tsx`: se reescribe el markup (JSX) para adoptar la estructura visual de la referencia, manteniendo intacta toda la lógica ya existente de SPEC 10 (`TouchButton`, `dispatchKeyEvent`, `onPointerDown/Up/Leave/Cancel`, `disabled`, `touch-action: none`, las props `dpad`/`actions` y las claves `DPAD_POSITION`):
  - El componente se envuelve en una carcasa tipo consola (`.gp`), con doble borde neón (borde exterior + `::before` interior) y textura de puntos (`::after`), portados de `.gp`/`.gp::before`/`.gp::after` de la referencia.
  - El D-pad reemplaza las labels de texto (`◀▲▼▶`) por íconos `<svg>` triangulares (los mismos `path` de `gamepad.html`), y agrega un elemento central decorativo `.dp-hub` con una gema `.dp-hub-gem` que pulsa (`aria-hidden="true"`, no es botón ni recibe pointer events).
  - Los botones A/B adoptan la estructura de la referencia: cada uno envuelve su letra en `.ab-letter` y agrega un `.ab-ring` (anillo punteado que aparece en hover/press). Orden visual **B (izquierda, cyan) → A (derecha, magenta)**, con B desplazado levemente hacia abajo respecto a A, igual que en `gamepad.html`.
- `app/arcade.css`: se reemplaza el bloque `/* ===== touch controls ===== */` completo (shell, D-pad, A/B) y su fragmento dentro de `@media (max-width: 768px)`, portando los estilos de `gamepad.html` (gradientes, `box-shadow` de profundidad/glow, estados `.on`/`:active` con `translateY`, `@keyframes pulse-led` para la gema, radial-gradients de los botones A/B, `filter: drop-shadow` en flechas activas) pero:
  - Reutilizando los tokens de tema ya definidos (`--cyan`, `--magenta`, `--line`, `--bg-2`, `--pixel`, `--mono`) en vez de los hex sueltos del HTML standalone, donde exista un token equivalente.
  - Conservando el breakpoint único del sitio (`768px`, no `620px` como en la referencia) para los ajustes de tamaño en mobile.
  - Conservando el estado `disabled`/`touch-btn-disabled` (grayscale + opacity + `pointer-events: none`) aplicado por encima del nuevo estilo, para los botones que un juego no escucha.
- El estado "presionado" (`.on` por pointer, o `:active`) debe producir el mismo efecto visual que la referencia: hundimiento (`translateY`), glow del color correspondiente (cyan en D-pad y B, magenta en A) y, en el D-pad, `drop-shadow` en la flecha SVG.

**Out of scope (para specs futuros):**

- Cualquier cambio en `components/games/*/engine.ts`, en `standardTouchControls`/mapeo de `activeCodes` de `components/games/registry.tsx`, o en la lógica `showGamepad`/`av-hide-nav` de `components/GamePlayer.tsx`.
- Cambios en qué botones están `disabled` por juego o en el comportamiento de input (qué tecla dispara cada botón).
- Nuevas fuentes: `Press Start 2P` y `JetBrains Mono` ya están cargadas en `app/layout.tsx`, no se agrega nada nuevo.
- Crear una página, ruta o componente standalone a partir de `gamepad.html` — ese archivo es solo referencia visual, no se importa ni se sirve.
- Sonido, vibración/feedback háptico al presionar (ya estaba fuera de alcance en SPEC 10).
- Rediseño de cualquier otro botón del sitio (`.btn` genérico de PAUSA/FIN/SALIR, nav, etc.) — el restyle es exclusivo de `TouchControls`.
- Soporte de gamepad físico Bluetooth (sin relación con este spec, que es solo visual).

## Data model

Esta feature no introduce datos ni persistencia nueva. Reutiliza el contrato `TouchButton`/`GameEngine.touchControls` ya definido en SPEC 10 (`components/TouchControls.tsx`, `components/games/registry.tsx`) sin modificarlo.

## Implementation plan

1. Reescribir el JSX de `components/TouchControls.tsx`: agregar la carcasa `.gp` como contenedor raíz (reemplazando el `<div className="touch-controls">` actual, pero conservando su rol de contenedor de `dpad`/`actions`), los íconos SVG de flecha para cada botón del D-pad, el elemento decorativo `.dp-hub`/`.dp-hub-gem`, y `.ab-ring`/`.ab-letter` dentro de cada botón A/B, respetando el orden B→A. No se toca ninguna función existente (`dispatchKeyEvent`, handlers de pointer). Verificación: `npm run build` compila; el componente aún no se ve correcto porque el CSS no está portado (paso 2).
2. Reemplazar el bloque `/* ===== touch controls ===== */` de `app/arcade.css` (shell `.gp`, D-pad roseta con flechas/hub, A/B con glow/anillos) portando los estilos de `gamepad.html`, mapeando sus colores hardcodeados a los tokens de tema del sitio donde corresponda. Verificación: `npm run build` compila sin errores de CSS/lint.
3. Portar el fragmento responsive dentro de `@media (max-width: 768px)` de `app/arcade.css` (reducir tamaño del D-pad/hub/botones A/B en mobile, análogo a `@media (max-width: 620px)` de la referencia pero sobre el breakpoint único de 768px del sitio), asegurando que la carcasa `.gp` no produzca overflow horizontal en 375–393px de ancho. Verificación manual: viewport emulado 375×667 y 393×852, sin scroll horizontal.
4. Confirmar que el estado `disabled` sigue aplicando grayscale/opacity sobre el nuevo look (flechas SVG y botones A/B apagados) y que no despacha eventos, para los 4 juegos según el mapeo de SPEC 10 (Asteroids: ▼ y B disabled; Arkanoid: ▲▼AB disabled; Snake: A y B disabled; Tetris: ninguno disabled). Verificación manual en emulador táctil.
5. Recorrido end-to-end manual en `/juego/<id>/jugar` para los 4 juegos con emulador táctil de Chrome DevTools: comparar visualmente contra `gamepad-neon.png` (carcasa, hub pulsando, glow de botones), confirmar que cada botón activo sigue disparando exactamente la misma tecla que antes de este spec (sin regresión de input respecto a SPEC 10), y que PAUSA/FIN/SALIR y el modal de fin de partida siguen operables. Verificación: `npm run build` y `npm run lint` sin errores nuevos; recorrido manual sin errores de consola.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm run lint` no reporta errores nuevos.
- [ ] Ningún archivo `engine.ts`, `registry.tsx` (más allá de lo ya definido en SPEC 10) ni la lógica de `GamePlayer.tsx` fue modificado.
- [ ] En viewport táctil emulado, `TouchControls` muestra la carcasa de consola (`.gp`, doble borde neón, textura de puntos) envolviendo D-pad y A/B, igual a `gamepad-neon.png`.
- [ ] El D-pad muestra flechas SVG triangulares (no texto) y un hub central con gema que pulsa continuamente (`@keyframes pulse-led`).
- [ ] Los botones A/B están ordenados B (izquierda, cyan) → A (derecha, magenta), con B desplazado levemente hacia abajo, cada uno con anillo punteado visible en press/hover y letra en fuente pixel con glow.
- [ ] Al presionar (pointerdown) un botón activo del D-pad o de A/B, este se hunde (`translateY`) y emite glow de su color, igual que `:active`/`.on` en la referencia.
- [ ] Los botones marcados `disabled` (según el mapeo de SPEC 10 por juego) se ven apagados (grayscale/opacity reducida) y tocarlos no despacha ningún `KeyboardEvent`.
- [ ] El comportamiento de input es idéntico al de SPEC 10 en los 4 juegos (mismo botón dispara la misma tecla física, mismo efecto en el juego) — este spec es puramente visual.
- [ ] En viewport de 375–393px de ancho, la carcasa del gamepad se ve completa sin generar scroll horizontal en la página.
- [ ] El teclado físico y el resto del HUD (`player-hud`, PAUSA/FIN/SALIR, modal de fin de partida) no cambian de comportamiento respecto a antes de este spec.

## Decisions

- **Sí:** D-pad con flechas SVG triangulares + hub central con gema pulsante, igual a la referencia. Confirmado con el usuario.
- **Sí:** carcasa completa tipo consola (`.gp`, gradiente, doble borde, textura de puntos, sombra neón) envolviendo todo el bloque de `TouchControls`, en vez de mantener el contenedor plano actual. Confirmado con el usuario.
- **Sí:** layout de A/B igual a la referencia — B izquierda (cyan) / A derecha (magenta), B desplazado hacia abajo, con anillo dashed y letra en fuente pixel — en vez de mantener la disposición diagonal actual. Confirmado con el usuario.
- **Sí:** el restyle se aplica solo al `TouchControls` que ya se renderiza en `GamePlayer` para dispositivos táctiles; no se crea página ni componente standalone a partir de `gamepad.html`. Confirmado con el usuario.
- **Sí:** reusar los tokens de tema existentes (`--cyan`, `--magenta`, `--line`, `--bg-2`, `--pixel`, `--mono`) en vez de los valores hex hardcodeados del HTML de referencia, para mantener coherencia con el resto del sitio y con el modo oscuro ya soportado. Decisión técnica del agente, consistente con que `gamepad.html` es material de diseño standalone (con su propia paleta embebida), no código a copiar literal.
- **Sí:** mantener el breakpoint único de 768px del sitio (definido en SPEC 10) en vez de introducir el breakpoint de 620px propio de la referencia standalone.
- **No:** tocar `engine.ts`, `registry.tsx` más allá de lo ya existente, ni la lógica de `showGamepad`/`av-hide-nav`. Fuera de alcance — este spec es puramente visual sobre un componente ya cableado.

## Risks

| Riesgo                                                                                                                                                                                                                                                                                                                                    | Mitigación                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Al reescribir el JSX de `TouchControls.tsx` para agregar la carcasa/SVG/hub, se puede romper accidentalmente algún handler de pointer o la clase que posiciona cada botón del D-pad (`dpad-up/left/right/down`), causando regresión de input.                                                                                             | El paso 5 del plan exige recorrido manual end-to-end confirmando que cada botón activo sigue disparando la misma tecla que antes de este spec, en los 4 juegos.      |
| La carcasa `.gp` agrega padding/alto vertical adicional respecto al contenedor plano actual, lo que puede empujar contenido fuera de pantalla en dispositivos muy chicos (< 375px de ancho).                                                                                                                                              | El paso 3 del plan verifica explícitamente 375×667 y 393×852 sin scroll horizontal; si aparece overflow, se ajustan paddings/tamaños dentro del breakpoint de 768px. |
| El estado `disabled` (grayscale/opacity) puede verse distinto o insuficientemente "apagado" sobre el nuevo fondo con gradientes/glow de la referencia, dificultando distinguir visualmente qué botones no tienen función en el juego actual.                                                                                              | El paso 4 del plan revisa explícitamente el contraste del estado disabled sobre el nuevo look para los 4 juegos antes de dar la feature por terminada.               |
| Next.js 16.2.10/React 19.2.4 no son las versiones conocidas por el asistente; este spec no toca routing/data-fetching/caching, pero si `/spec-impl` termina modificando algo fuera de `TouchControls.tsx`/`arcade.css` de forma indirecta, debe verificar contra `node_modules/next/dist/docs/` en vez de asumir convenciones recordadas. | Recordatorio heredado de `AGENTS.md`, aplicable solo si algún paso de implementación termina tocando rutas de `app/`.                                                |

## What is **not** in this spec

- Cambios en `engine.ts` de cualquier juego, en `standardTouchControls`/mapeo de `activeCodes`, o en la lógica de `GamePlayer.tsx` (`showGamepad`, `av-hide-nav`).
- Qué botones están `disabled` por juego o qué tecla dispara cada botón.
- Fuentes nuevas (ya están cargadas).
- Página, ruta o componente standalone a partir de `gamepad.html`.
- Sonido o feedback háptico.
- Rediseño de otros botones del sitio fuera de `TouchControls`.
- Soporte de gamepad físico Bluetooth.

Cada uno de estos, si se necesita, va en un spec futuro.
