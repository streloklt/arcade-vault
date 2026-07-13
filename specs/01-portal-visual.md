# SPEC 01 — Portal visual de Arcade Vault

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-07-13
> **Objetivo:** Portar las 5 pantallas del prototipo visual (`references/templates/`) al App Router de Next.js como componentes React tipados con TypeScript, sin implementar lógica de ningún juego real.

## Scope

**In:**

- Página **Biblioteca** (`/`): hero, buscador, filtros por categoría, grid de tarjetas de juego con tilt al mouse.
- Página **Detalle de juego** (`/juego/[id]`): portada, tags, descripción, stats, leaderboard del juego, botón "jugar ahora".
- Página **Reproductor mock** (`/juego/[id]/jugar`): HUD (jugador, puntuación, vidas, nivel), arena visual estática con "enemigos" decorativos, pausa, fin de partida simulado (score incremental por `setInterval`, sin mecánica de juego real), modal de guardar puntuación.
- Página **Salón de la Fama** (`/salon`): tabs por juego, podio top 3, tabla de posiciones, fila "tu mejor marca" si hay sesión.
- Página **Auth** (`/auth`): tabs iniciar sesión / crear cuenta, formulario mock, botón "jugar como invitado", botones sociales decorativos (sin OAuth real).
- Componente **Nav** persistente: logo, links activos, contador de créditos, botón de sesión, menú hamburguesa mobile.
- Layout raíz: fuentes vía `<link>` a Google Fonts (Press Start 2P, Courier Prime, JetBrains Mono), `styles.css` del template importado como CSS global, fondo `av-bg`/`av-noise`, footer fijo.
- Datos mock en un módulo TS (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) tipado, sin fetch a ninguna API.
- Persistencia mock en `localStorage` (`av_user`, `av_scores`), sin backend real.
- Ruteo real de App Router (páginas y navegación con `next/link` / `useRouter`), reemplazando el ruteo por hash del template.

**Out of scope (for future specs):**

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, etc.) — el reproductor sigue siendo un mock visual.
- Autenticación real (backend, OAuth, sesiones persistentes en servidor).
- Persistencia real de puntuaciones (base de datos, API).
- Sistema de créditos/monedas funcional (el contador "CRÉDITOS · 03" es decorativo).
- Internacionalización / soporte multi-idioma (todo queda en español, igual que el template).
- Tests automatizados (el repo no tiene test runner configurado todavía).

## Data model

Se porta `data.jsx` a `lib/data.ts` con tipos explícitos:

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;
}

export const GAMES: Game[] = [/* 8 juegos, igual que el template */];
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export const PLAYERS: string[] = [/* 18 nombres */];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de usuario y sesión, en `lib/types.ts`:

```ts
export interface User {
  name: string;
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
```

Helpers de persistencia mock en `lib/storage.ts` (wrappers tipados sobre `localStorage`, claves `av_user` y `av_scores`, con `try/catch` igual que el template para tolerar `localStorage` deshabilitado).

Conventions:

- `seededScores` es determinista dado el mismo `seed` (PRNG lineal simple, igual algoritmo que el template).
- Los IDs de juego (`bloque-buster`, `caida`, etc.) son los slugs usados en las rutas `/juego/[id]`.

## Implementation plan

1. Copiar `references/templates/styles.css` a `app/arcade.css` e importarlo en `app/layout.tsx` junto a `globals.css`; agregar los `<link>` de Google Fonts (Press Start 2P, Courier Prime, JetBrains Mono) al `<head>` vía `metadata`/`viewport` export o tags manuales según lo que indique `node_modules/next/dist/docs/`. Verificación manual: `npm run dev`, la home por defecto carga sin errores de consola y con las fuentes nuevas activas.
2. Crear `lib/types.ts` (`User`, `SavedScore`, `ScoreRow`) y `lib/data.ts` (`Game`, `GAMES`, `CATS`, `PLAYERS`, `seededScores`) portando `data.jsx` con tipos. Verificación: `npm run build` compila.
3. Crear `lib/storage.ts` con helpers tipados sobre `localStorage` (`getStoredUser`, `setStoredUser`, `clearStoredUser`, `saveScore`), con `try/catch` igual que el template.
4. Crear `components/Nav.tsx` (client component) portando `nav.jsx`: usa `usePathname` para estado activo, `useRouter`/`next/link` para navegar, lee sesión vía un hook simple de `localStorage`. Reemplazar `app/layout.tsx` para renderizar `<Nav />` + `{children}` + footer fijo (igual copy que el template). Verificación: la home muestra el nav funcional aunque las demás rutas todavía no existan (dan 404).
5. Crear `app/page.tsx` (Biblioteca) + `components/GameCard.tsx` portando `biblioteca.jsx`: hero, buscador, chips de categoría, grid con tilt al mouse, navegación a `/juego/[id]`. Verificación: `/` muestra el grid completo, buscar y filtrar funciona, clic en tarjeta navega.
6. Crear `app/juego/[id]/page.tsx` (Detalle) + `components/Leaderboard.tsx` portando `detalle.jsx`: portada, tags, descripción, stats, leaderboard vía `seededScores`, botones "jugar ahora" / "volver al vault". Verificación: navegar desde una tarjeta abre el detalle correcto; ID inexistente no rompe la página (renderiza vacío o 404 vía `notFound()`).
7. Crear `app/juego/[id]/jugar/page.tsx` (Reproductor mock, client component) portando `reproductor.jsx`: HUD, arena CSS estática, pausa, fin de partida con `setInterval` de score simulado, modal de guardar puntuación que llama a `lib/storage.ts`. Verificación: pausar detiene el incremento, "fin" abre el modal, guardar puntuación persiste en `localStorage` y muestra el toast.
8. Crear `app/salon/page.tsx` (Salón de la Fama) portando `salon.jsx`: tabs por juego, podio top 3, tabla de posiciones, fila "tu mejor marca" condicionada a sesión. Verificación: cambiar de tab recalcula el leaderboard; sin sesión no aparece la fila "tu mejor marca".
9. Crear `app/auth/page.tsx` portando `auth.jsx`: tabs iniciar sesión / crear cuenta, formulario mock, botón "jugar como invitado", botones sociales decorativos (sin acción real). Al enviar, guarda usuario vía `lib/storage.ts` y navega a `/`. Verificación: loguearse actualiza el Nav (muestra nombre de usuario) y persiste tras recargar la página.
10. Recorrido end-to-end manual: Biblioteca → Detalle → Reproductor → guardar puntuación → Salón de la Fama → Auth → cerrar sesión, confirmando que el estado de sesión y las clases activas del Nav son consistentes en todas las rutas.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `/` muestra el hero, el buscador, los chips de categoría y el grid de las 8 tarjetas de juego.
- [ ] Escribir en el buscador filtra las tarjetas por título en tiempo real.
- [ ] Seleccionar un chip de categoría distinto a "TODOS" filtra las tarjetas por esa categoría.
- [ ] Buscar un término sin resultados muestra el mensaje "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta navega a `/juego/[id]` con el juego correcto.
- [ ] `/juego/[id]` muestra portada, descripción, stats y un leaderboard de 10 filas.
- [ ] El botón "jugar ahora" en el detalle navega a `/juego/[id]/jugar`.
- [ ] En `/juego/[id]/jugar`, el puntaje sube automáticamente mientras no está en pausa.
- [ ] Pulsar "pausa" detiene el incremento del puntaje; pulsar de nuevo lo reanuda.
- [ ] Pulsar "fin" abre el modal de fin de partida con el puntaje final.
- [ ] Guardar la puntuación en el modal la persiste en `localStorage` bajo `av_scores` y muestra el toast "PUNTUACIÓN GUARDADA".
- [ ] `/salon` muestra tabs por juego, un podio de top 3 y una tabla con el resto de posiciones.
- [ ] Cambiar de tab en `/salon` recalcula podio y tabla para el juego seleccionado.
- [ ] Sin sesión iniciada, `/salon` no muestra la fila "tu mejor marca".
- [ ] `/auth` permite loguearse (con cualquier usuario) y redirige a `/` con el Nav mostrando el nombre de usuario.
- [ ] "Jugar como invitado" en `/auth` navega a `/` sin sesión iniciada.
- [ ] Cerrar sesión desde el Nav borra `av_user` de `localStorage` y el botón vuelve a mostrar "Iniciar Sesión".
- [ ] Recargar la página en cualquier ruta conserva la sesión si había una iniciada.
- [ ] El Nav marca como activo el link correspondiente a la ruta actual, incluyendo detalle y reproductor como parte de "Biblioteca".
- [ ] El menú hamburguesa mobile abre y cierra el panel lateral, y navegar desde ahí también cierra el panel.

## Decisions

- **Sí:** rutas reales de App Router (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/salon`, `/auth`) en vez de SPA con hash-routing. Coherente con la arquitectura Next.js del proyecto y con AGENTS.md.
- **No:** mantener el ruteo por hash del template. Es un patrón fuera de convención para un proyecto Next.js real.
- **Sí:** reusar `styles.css` del template tal cual, importado como CSS global adicional a Tailwind. Ya implementa el look pixel-perfect y reescribirlo a Tailwind es trabajo grande sin beneficio funcional para un spec puramente visual.
- **No:** convertir los ~950 líneas de CSS a utilidades Tailwind en este spec.
- **Sí:** mantener las fuentes vía `<link>` a Google Fonts CDN, igual que el template, en vez de `next/font/google`. Prioriza fidelidad exacta con el prototipo aprobado por el usuario.
- **Sí:** incluir la pantalla reproductor (`/juego/[id]/jugar`) como mock visual (HUD, pausa, modal, score simulado por `setInterval`). No es un juego real, es la carcasa visual que un juego futuro ocupará.
- **No:** implementar mecánica de juego real en el reproductor. Queda explícitamente fuera, para especs futuras por cada juego.
- **Sí:** persistencia mock en `localStorage` (`av_user`, `av_scores`) y leaderboards con `seededScores` determinista, igual que el template. No hay backend en este spec.
- **No:** conectar a una base de datos o API real para usuarios o puntuaciones.
- **Sí:** tipado TypeScript completo (interfaces `Game`, `User`, `ScoreRow`, `SavedScore`), sin `any`. Coherente con `tsconfig` strict del proyecto.
- **Sí:** URLs de rutas en español (`/juego/[id]`, `/salon`, `/auth`), coherente con el idioma del copy visible en toda la UI.

## Risks

| Risk                                                                                     | Mitigation                                                                                                    |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `next@16.2.10` es posterior al conocimiento entrenado del asistente; convenciones de App Router (routing, metadata, fonts) pueden diferir de lo recordado. | Leer la página correspondiente en `node_modules/next/dist/docs/` antes de escribir cada tipo de código (routing, layout, metadata), según indica AGENTS.md. |
| `localStorage` deshabilitado (modo privado / políticas del navegador) rompe sesión y guardado de puntuación. | `lib/storage.ts` envuelve todo acceso en `try/catch`; si falla, la app sigue funcional sin persistencia, igual que el template. |
| Dependencia de red externa a Google Fonts CDN en el `<head>`; si no carga, cae a las fuentes de fallback (`system-ui`, `monospace`) definidas en `styles.css`. | Aceptado como riesgo menor: las variables CSS ya incluyen fallback, la UI sigue siendo legible aunque no cargue el pixel font. |

## Qué **no** está en este spec

- Lógica real de cualquier juego (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Autenticación real (backend, OAuth, sesiones de servidor).
- Persistencia real de puntuaciones o usuarios (base de datos, API).
- Sistema de créditos/monedas funcional.
- Internacionalización.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
