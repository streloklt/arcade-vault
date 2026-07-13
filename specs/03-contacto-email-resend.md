# SPEC 03 — Envío real de correo en el formulario de contacto (Acerca de)

> **Estado:** Aprobado
> **Depende de:** SPEC 02
> **Fecha:** 2026-07-13
> **Objetivo:** Reemplazar el envío mock del formulario de contacto de `/acerca-de` por un envío real de correo vía Resend, agregando estados de carga y error tipo terminal sin alterar el diseño visual ya portado del template.

## Scope

**In:**

- Nueva Route Handler `app/api/contacto/route.ts` (`POST`) que recibe `{ name, email, msg }`, valida en servidor que los tres campos no estén vacíos, y envía un correo real vía Resend (paquete `resend`) a `aleteliert@gmail.com`, usando `onboarding@resend.dev` como remitente.
- Actualizar `app/acerca-de/page.tsx`: el `onSubmit` deja de simular el envío y hace `fetch("/api/contacto")`; se agregan estados `sending` (deshabilita el botón y muestra "ENVIANDO...") y `error` (pantalla terminal con línea de error y botón para reintentar sin perder lo escrito).
- Nueva dependencia `resend` en `package.json`.
- Nueva variable de entorno `RESEND_API_KEY`, leída server-side en el route handler. Se agrega `.env.local` (no commiteado) y un `.env.example` con la clave documentada sin valor real.
- CSS nuevo en `app/arcade.css` para el estado de error terminal (variante de `.terminal-success` en magenta/rojo), portado como extensión del mismo patrón visual del template — el template no incluye este estado porque su formulario era 100% mock.

**Out of scope (para specs futuras):**

- Validación de formato de email más allá del `type="email"` nativo del navegador.
- Protección anti-spam (honeypot, rate limiting, captcha).
- Dominio propio verificado en Resend / remitente personalizado (`onboarding@resend.dev` se usa indefinidamente hasta que se decida lo contrario).
- Persistencia de los mensajes de contacto (base de datos, panel de administración, etc.).
- Confirmación por correo al usuario que envía el formulario (solo se notifica al destino fijo).
- Cualquier cambio a la sección "ABOUT" (hero de misión, highlights, divisor) — ya está terminada desde SPEC 02.

## Data model

No hay persistencia ni nuevas estructuras de datos guardadas. Se define el contrato HTTP entre el form y la Route Handler:

**Request** — `POST /api/contacto`

```json
{ "name": "px_kai", "email": "jugador@vault.gg", "msg": "Cuéntanos qué tienes en mente…" }
```

**Response — éxito** (`200`):

```json
{ "ok": true }
```

**Response — error de validación** (`400`, campo vacío llegó al servidor) o **error de envío** (`502`, Resend falló):

```json
{ "ok": false, "error": "mensaje breve" }
```

El cliente (`app/acerca-de/page.tsx`) usa `ok` para decidir entre mostrar el terminal de éxito o el de error; el campo `error` no se muestra literalmente al usuario — el terminal de error muestra un mensaje genérico fijo en español, no el string crudo del servidor.

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y crear `.env.example` con `RESEND_API_KEY=` documentado; agregar `RESEND_API_KEY=<clave real>` a `.env.local` (no commiteado, ya cubierto por `.gitignore` de create-next-app). Verificación: `npm run build` sigue compilando sin la clave real presente en el repo.
2. Crear `app/api/contacto/route.ts` con un `POST` handler: lee el body JSON, valida server-side que `name`, `email` y `msg` no estén vacíos (si falta alguno, responde `400` con `{ ok: false, error: "..." }`), instancia `Resend(process.env.RESEND_API_KEY)` y envía el correo a `aleteliert@gmail.com` desde `onboarding@resend.dev` con el nombre/email/mensaje en el cuerpo. Si Resend lanza error, responde `502` con `{ ok: false, error: "..." }`. Si todo sale bien, responde `200` con `{ ok: true }`. Verificación: `curl -X POST http://localhost:3000/api/contacto -H "Content-Type: application/json" -d '{"name":"a","email":"a@a.com","msg":"hola"}'` devuelve `{ ok: true }` y el correo llega a la bandeja de `aleteliert@gmail.com`.
3. Agregar en `app/arcade.css` la variante visual `.terminal-error` (mismo patrón que `.terminal-success` pero borde/glow en `var(--magenta)`) y `.term-body .line.error` (texto en magenta), como extensión del sistema de estilos ya portado en SPEC 02.
4. Actualizar `app/acerca-de/page.tsx`: reemplazar el `setSent` inmediato por un flujo `sending → fetch → success | error`. Mientras `sending` es `true`, el botón muestra "ENVIANDO..." y queda deshabilitado (`disabled`). Si la respuesta es `ok: true`, se muestra el terminal de éxito actual (sin cambios). Si falla (red o `ok: false`), se muestra un terminal con `.terminal-error`, una línea `[ERROR] No se pudo enviar el mensaje. Intenta de nuevo.` y un botón "REINTENTAR" que vuelve al formulario sin borrar lo que el usuario ya escribió. Verificación manual descrita en el paso 5.
5. Recorrido end-to-end manual: completar el formulario en `/acerca-de` y enviarlo con `RESEND_API_KEY` válida → botón muestra "ENVIANDO..." brevemente → aparece terminal de éxito → llega el correo real a `aleteliert@gmail.com`. Luego, con una `RESEND_API_KEY` inválida (o sin ella), repetir el envío → aparece terminal de error con el mensaje `[ERROR]` → "REINTENTAR" vuelve al formulario con los datos intactos.

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `npm install resend` agrega la dependencia a `package.json`.
- [ ] Existe `.env.example` con `RESEND_API_KEY=` documentado; `.env.local` no está trackeado por git.
- [ ] `POST /api/contacto` con los tres campos completos responde `200` con `{ ok: true }` y el correo llega realmente a `aleteliert@gmail.com` desde `onboarding@resend.dev`.
- [ ] `POST /api/contacto` con algún campo vacío responde `400` con `{ ok: false }`, sin intentar llamar a Resend.
- [ ] Si Resend falla (clave inválida o error de red), `POST /api/contacto` responde `502` con `{ ok: false }`.
- [ ] En `/acerca-de`, enviar el formulario con algún campo vacío sigue disparando el shake existente (sin llegar a hacer `fetch`).
- [ ] Al enviar el formulario completo, el botón muestra "ENVIANDO..." y queda deshabilitado mientras se espera la respuesta.
- [ ] Si la respuesta es exitosa, se muestra el terminal de éxito "MENSAJE RECIBIDO" con el nombre ingresado (sin cambios respecto a SPEC 02).
- [ ] Si la respuesta falla, se muestra un terminal de error (`.terminal-error`) con una línea `[ERROR]` y un botón "REINTENTAR".
- [ ] "REINTENTAR" vuelve al formulario conservando `name`, `email` y `msg` ya escritos por el usuario.

## Decisions

- **Sí:** Route Handler (`app/api/contacto/route.ts`) en vez de Server Action. Confirmado con el usuario — convención de API clásica, fácil de probar con `curl` de forma aislada.
- **No:** Server Action con `"use server"`. Requeriría convertir el form a progressive enhancement, más cambio del necesario para este spec.
- **Sí:** destino fijo `aleteliert@gmail.com`, hardcodeado en el route handler (no configurable por variable de entorno). Es el único destinatario conocido hoy; se puede mover a env var en un spec futuro si aparece la necesidad.
- **Sí:** remitente `onboarding@resend.dev` (sandbox de Resend), sin dominio propio verificado. Permite implementar y probar de inmediato sin bloquear el spec en configuración de DNS.
- **No:** dominio propio verificado. Fuera de alcance — se revisará si el proyecto pasa a producción real.
- **Sí:** `RESEND_API_KEY` vía variable de entorno server-side (`.env.local`), nunca expuesta al cliente. Único secreto real que introduce el proyecto hasta ahora.
- **Sí:** agregar estados `sending` y `error` al formulario, ausentes en el template original (que era 100% mock). Necesarios porque ahora hay una llamada de red real que puede fallar o demorar.
- **No:** validación de formato de email con regex propio. Se confía en la validación nativa del navegador (`type="email"`), consistente con lo que ya hacía el template.
- **No:** protección anti-spam (honeypot, rate limiting, captcha). Confirmado con el usuario — el proyecto no tiene tráfico real todavía; se evalúa a futuro si hay abuso.
- **No:** persistir los mensajes de contacto en ninguna base de datos. El proyecto sigue sin backend/DB (mismo criterio que SPEC 01/02 para auth y scores).

## Risks

| Risk | Mitigation |
| --- | --- |
| `onboarding@resend.dev` en modo sandbox solo permite enviar al correo asociado a la cuenta de Resend — si `aleteliert@gmail.com` no es esa cuenta, los envíos fallarán silenciosamente en producción aunque funcionen en pruebas locales del dueño de la cuenta. | Se verifica explícitamente en el paso 5 del plan que el correo llegue de verdad a la bandeja antes de dar la spec por completada. |
| Si `RESEND_API_KEY` falta o es inválida en el entorno de despliegue, todo envío falla con `502`. | El estado de error del formulario ya cubre este caso de forma visible para el usuario final; no queda en un estado colgado. |
| Commitear `.env.local` por error expondría la API key de Resend. | `.env.local` ya está en `.gitignore` por defecto de `create-next-app`; se revisa `git status` antes de cualquier commit de esta spec. |
