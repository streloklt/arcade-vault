# SPEC 02 — Home landing y página Acerca de

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-07-13
> **Objetivo:** Portar las pantallas Home (landing) y Acerca de del prototipo (`references/templates/home-about/`) al App Router, moviendo la Biblioteca actual de `/` a `/biblioteca` y dejando `/` como la nueva landing.

## Scope

**In:**

- Nueva página **Home** (`/`): hero con silhouettes flotantes animadas, sección "¿Por qué Arcade Vault?" (feature grid), preview de juegos (6 tarjetas desde `GAMES`, reusando `MiniCard`), bloque de stats (juegos = `GAMES.length`, resto de textos igual que el template), sección "Actividad en vivo" (últimas puntuaciones + top jugadores del día, generadas con `seededScores`), sección de precios (plan único gratis + FAQ), CTA final.
- Nueva página **Acerca de** (`/acerca-de`): hero de misión, fila de highlights, divisor decorativo animado, formulario de contacto mock (nombre/email/mensaje) con feedback tipo terminal al enviar.
- Migración de la Biblioteca actual: `app/page.tsx` (grid de juegos) se mueve a `app/biblioteca/page.tsx`, ruta `/biblioteca`.
- Actualización de `components/Nav.tsx`: nuevo link "Inicio" (`/`) y "Acerca de" (`/acerca-de`); el link "Biblioteca" pasa a apuntar a `/biblioteca`; el logo pasa a apuntar a `/` (Home).
- Actualización de links existentes que asumían Biblioteca en `/`: redirect post-login en `/auth` (`router.push`), botones "volver al vault" en `/juego/[id]` y `/juego/[id]/jugar` (`GamePlayer.tsx`), CTA final de `/salon`.
- Portar a `app/arcade.css` el CSS de Home/Acerca de que falta (`.home*`, `.about*`, `.feature-grid`, `.mini-rail`, `.activity-grid`, `.pricing-grid`, `.faq-item`, `.reveal`, `.terminal-success`, etc.), copiándolo desde `references/templates/home-about/styles.css`. **Corrección post-aprobación:** se verificó que estas clases NO estaban portadas desde SPEC 01 (SPEC 01 solo portó Biblioteca/detalle/salón/auth/reproductor); es un cambio de estilos mecánico, parte del Paso 1.

**Out of scope (for future specs):**

- Envío real del formulario de contacto (backend, email, servicio externo) — sigue siendo mock.
- Sistema de créditos/monedas funcional (no se toca en esta spec).
- Cualquier lógica de juego real.
- Cambios al formulario de auth, salón de la fama o reproductor más allá de actualizar los links de redirección mencionados arriba.
- Internacionalización.

## Data model

Esta feature no introduce nuevas estructuras de datos. Reutiliza `GAMES` y `seededScores` de `lib/data.ts` (ya definidos en SPEC 01).

Derivación para la sección "Actividad en vivo" de Home, sin agregar campos nuevos:

- **Últimas puntuaciones:** por cada uno de los primeros 7 juegos de `GAMES`, tomar la fila top (`seededScores(g.id.length * 23 + 7, 1)[0]`) y mostrar `game.title`, `row.score`, `row.date`. Se descarta el texto "hace X min" del template (no existe ese dato) — se muestra la fecha real (`DD/MM/2026`) que ya provee `ScoreRow`.
- **Top jugadores · hoy:** usar `seededScores(GAMES[0].id.length * 23 + 7, 5)` (mismo seed que usaría la pestaña del primer juego en `/salon`), mostrando las 5 filas con su `rank`, `name`, `score`.
- **Stat "juegos":** `GAMES.length` en vez del "12+" hardcodeado del template.

## Implementation plan

1. Mover `app/page.tsx` a `app/biblioteca/page.tsx` (sin cambios de contenido) y crear el nuevo `app/page.tsx` con la landing Home: hero + `FloatingSilhouettes` (SVGs decorativos), sección features, preview de juegos (crear `components/MiniCard.tsx` portando el `MiniCard` del template, distinto de `GameCard`), bloque de stats, sección de precios + FAQ, CTA final. Animaciones `.reveal` vía `IntersectionObserver` en un hook local (client component). Verificación: `npm run dev`, `/` muestra la landing completa y `/biblioteca` muestra el grid de juegos que antes vivía en `/`.
2. Agregar la sección "Actividad en vivo" dentro de Home usando `seededScores` según lo definido en el data model (últimas puntuaciones + top jugadores). Verificación: la sección muestra 7 filas de puntuaciones recientes y 5 filas de top jugadores derivadas de `GAMES`/`seededScores`, sin nombres de jugadores fijos hardcodeados del template.
3. Actualizar `components/Nav.tsx`: agregar link "Inicio" → `/`, cambiar "Biblioteca" → `/biblioteca`, agregar "Acerca de" → `/acerca-de`, logo → `/`. Extender `isActive` a los 4 estados (`home`, `biblioteca`, `salon`, `about`) en el nav desktop y el panel mobile. Verificación: los 4 links (desktop y mobile) navegan correctamente y marcan "active" según la ruta actual.
4. Actualizar los links que asumían Biblioteca en `/`: `router.push("/")` → `router.push("/biblioteca")` en `app/auth/page.tsx` (login y registro) y en `components/GamePlayer.tsx`; `<Link href="/">` → `<Link href="/biblioteca">` en `app/juego/[id]/page.tsx` y en el CTA final de `app/salon/page.tsx`. Verificación: loguearse, cerrar sesión desde el reproductor, "volver al vault" en detalle y el CTA de `/salon` llevan todos a `/biblioteca`.
5. Crear `app/acerca-de/page.tsx` portando `about.jsx`: hero de misión, fila de highlights con `HighlightIcon`, divisor decorativo animado, formulario de contacto mock (estado local `name`/`email`/`msg`, shake si falta un campo, feedback tipo terminal "MENSAJE RECIBIDO" al enviar, sin llamada a ninguna API). Verificación: `/acerca-de` carga, enviar vacío hace shake sin enviar, completarlo muestra la pantalla de terminal con el nombre ingresado.
6. Recorrido end-to-end manual: Home (`/`) → "explorar juegos" lleva a `/biblioteca` → clic en tarjeta abre detalle → "volver al vault" regresa a `/biblioteca` → nav "Acerca de" → enviar formulario mock → nav "Inicio" vuelve a `/`, confirmando que el link activo del nav es correcto en cada paso.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `/` muestra el hero de Home (título, subtítulo, CTAs "Explorar juegos" / "Crear cuenta") con las silhouettes flotantes animadas.
- [ ] `/` muestra la sección de features (4 tarjetas), preview de 6 juegos, bloque de stats, sección "Actividad en vivo", sección de precios con FAQ, y CTA final.
- [ ] El stat de "juegos" en Home muestra el número real de `GAMES.length`, no un valor hardcodeado.
- [ ] La sección "Actividad en vivo" muestra 7 filas de puntuaciones recientes y 5 filas de top jugadores, derivadas de `GAMES`/`seededScores`.
- [ ] El botón "Explorar juegos" del hero de Home navega a `/biblioteca`.
- [ ] El botón "Crear cuenta" del hero y el CTA final de Home navegan a `/auth`.
- [ ] Clic en una tarjeta de la preview de juegos en Home navega a `/juego/[id]` con el juego correcto.
- [ ] `/biblioteca` muestra el mismo grid, buscador y filtros por categoría que antes vivían en `/`.
- [ ] `/acerca-de` muestra el hero de misión, la fila de highlights y el formulario de contacto.
- [ ] Enviar el formulario de contacto vacío (o con algún campo vacío) dispara la animación de shake y no muestra la pantalla de éxito.
- [ ] Enviar el formulario completo muestra la pantalla de terminal con el mensaje "MENSAJE RECIBIDO" incluyendo el nombre ingresado.
- [ ] El Nav muestra 4 links: Inicio, Biblioteca, Salón de la Fama, Acerca de; el logo navega a `/`.
- [ ] El Nav marca como activo el link correcto en `/`, `/biblioteca` (incluyendo `/juego/[id]` y `/juego/[id]/jugar`), `/salon` y `/acerca-de`.
- [ ] Loguearse en `/auth` redirige a `/biblioteca` (no a `/`).
- [ ] "Jugar como invitado" en `/auth` también redirige a `/biblioteca`.
- [ ] El botón "volver al vault" en `/juego/[id]` navega a `/biblioteca`.
- [ ] El botón de salir del reproductor (`GamePlayer.tsx`) navega a `/biblioteca`.
- [ ] El CTA final de `/salon` navega a `/biblioteca`.
- [ ] El menú hamburguesa mobile incluye los 4 links y navega correctamente desde ahí.

## Decisions

- **Sí:** Home pasa a ocupar `/` y Biblioteca se mueve a `/biblioteca`. Coherente con el nav del template, donde "Inicio" es la landing real y "Biblioteca" es una sección aparte.
- **No:** dejar Home en una ruta secundaria (ej. `/inicio`) y mantener Biblioteca en `/`. Se aleja del comportamiento del prototipo aprobado y generaría una landing "escondida".
- **Sí:** ruta `/acerca-de` en español, coherente con `/juego`, `/salon` y el resto del copy en español del proyecto.
- **No:** `/about`. Rompe la convención de idioma de las demás rutas (salvo `/auth`, ya establecida en SPEC 01).
- **Sí:** la sección "Actividad en vivo" de Home reusa `GAMES` y `seededScores` en vez de copiar las filas hardcodeadas del template (nombres fijos como "NEONFOX", "PX_KAI"). Mantiene consistencia con los datos ya usados en `/salon` y evita introducir un segundo dataset mock desincronizado.
- **No:** copiar literalmente las filas de ejemplo del template, incluyendo los textos "hace X min" (no existe ese dato en `ScoreRow`).
- **Sí:** el stat "juegos" en Home usa `GAMES.length` en vez de "12+" hardcodeado, para que no quede desincronizado si se agregan juegos mock a futuro.
- **Sí:** formulario de contacto 100% mock (feedback tipo terminal, sin backend ni envío real de email), igual criterio que auth y persistencia de puntuaciones en SPEC 01 — el proyecto todavía no tiene backend.
- **No:** conectar el formulario a un servicio de email o API real. Fuera de alcance de este spec.
- **Sí:** actualizar todos los links que asumían Biblioteca en `/` (logo → `/`, resto → `/biblioteca`) en el mismo spec, en vez de dejarlos rotos para un spec futuro. Son cambios mecánicos y pequeños, necesarios para que la app quede coherente tras mover la ruta.
- **Sí:** crear `components/MiniCard.tsx` como componente separado de `GameCard.tsx` en vez de reusar `GameCard` para la preview de Home. El template ya los define como componentes visualmente distintos (`MiniCard` es más compacto, sin tilt al mouse).

## Risks

| Risk                                                                                     | Mitigation                                                                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Mover Biblioteca de `/` a `/biblioteca` puede dejar un paso intermedio con `/` sin contenido si el paso 1 del plan no se hace atómico. | El paso 1 del plan combina el `mv` del archivo y la creación de la nueva `app/page.tsx` en el mismo commit, evitando una ruta rota. |
| Olvidar alguno de los `router.push("/")` / `<Link href="/">` dispersos en distintos archivos rompería silenciosamente la navegación post-login o "volver al vault". | Paso 4 del plan lista explícitamente los 4 archivos a actualizar; el recorrido end-to-end del paso 6 verifica cada uno manualmente. |

## Qué **no** está en este spec

- Envío real del formulario de contacto (backend, email, servicio externo).
- Sistema de créditos/monedas funcional.
- Cualquier lógica de juego real.
- Cambios funcionales a auth, salón de la fama o reproductor más allá de actualizar sus links de redirección a `/biblioteca`.
- Internacionalización.

Cada uno de estos, si se implementa, va en su propio spec.
