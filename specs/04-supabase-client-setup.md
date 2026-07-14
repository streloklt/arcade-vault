# SPEC 04 — Cliente Supabase (browser + SSR)

> **Estado:** Aprobado
> **Depende de:** Ninguna
> **Fecha:** 2026-07-14
> **Objetivo:** Instalar y configurar los clientes de Supabase (browser, server, middleware) como infraestructura base reutilizable para specs futuros de autenticación, base de datos y realtime, sin modificar el mock de auth actual basado en localStorage.

## Scope

**In:**

- Nuevas dependencias `@supabase/supabase-js` y `@supabase/ssr` en `package.json`.
- Nuevas variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, agregadas a `.env.local` (no commiteado) y documentadas sin valor real en `.env.example`.
- `lib/supabase/client.ts`: factory `createClient()` para uso en Client Components, usando `createBrowserClient` de `@supabase/ssr`. Valida que las env vars existan y lanza un error explícito si falta alguna.
- `lib/supabase/server.ts`: factory `createClient()` async para uso en Server Components y Route Handlers, usando `createServerClient` de `@supabase/ssr` con el manejo de cookies vía `cookies()` de `next/headers` (API async en esta versión de Next). Misma validación de env vars que el cliente browser.
- `lib/supabase/middleware.ts`: función `updateSession(request)` que crea un cliente Supabase ligado a la request/response del middleware y refresca la sesión llamando a `supabase.auth.getUser()`.
- `proxy.ts` en la raíz del proyecto (convención `middleware.ts` deprecada y renombrada a `proxy.ts` en esta versión de Next — ver `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`): invoca `updateSession()` en cada request, con un `matcher` que excluye assets estáticos (`_next/static`, `_next/image`, archivos con extensión de imagen/favicon).

**Out of scope (para specs futuros):**

- Cualquier lógica de autenticación real (login, signup, OAuth, protección de rutas). El middleware de este spec solo refresca tokens de sesión si existen; no redirige ni bloquea rutas.
- Migrar `app/auth/page.tsx` y `lib/storage.ts` del mock de localStorage a Supabase Auth. Ambos sistemas coexisten sin tocarse hasta el spec de autenticación.
- Creación de tablas, esquema de base de datos o políticas RLS.
- Suscripciones realtime.
- Generación de tipos TypeScript desde el esquema de la base de datos (`supabase gen types`) — no aplica todavía porque no hay tablas.
- Página o ruta de prueba que ejecute una llamada real a Supabase (`getSession`, `select`, etc.). La verificación de este spec es solo de compilación/tipos.

## Data model

Esta feature no introduce estructuras de datos nuevas ni persistencia propia. Se limita a exponer factories de cliente Supabase. El único contrato nuevo son las variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

Ambas expuestas al cliente (`NEXT_PUBLIC_`) porque el anon key está diseñado para ser público y depende de RLS para la seguridad real (sin RLS configurado todavía, ya que no hay tablas — ver Risks).

## Implementation plan

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install`). Agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` a `.env.example`, y los valores reales a `.env.local` (no commiteado). Verificación: `npm run build` sigue compilando igual que antes (todavía no hay código que use las nuevas dependencias).
2. Crear `lib/supabase/client.ts` exportando `createClient()`, que llama a `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)` de `@supabase/ssr`, lanzando `Error("Faltan las variables de entorno de Supabase")` si alguna falta. Verificación: `npm run build` compila; el archivo no se importa desde ningún lado todavía, así que no hay efecto visible.
3. Crear `lib/supabase/server.ts` exportando `async function createClient()`, que hace `await cookies()` de `next/headers` y llama a `createServerClient` de `@supabase/ssr` pasando `getAll`/`setAll` sobre el cookie store, con la misma validación de env vars que el paso 2. Verificación: `npm run build` compila (tipos de `@supabase/ssr` resuelven correctamente contra la API async de `cookies()` de esta versión de Next).
4. Crear `lib/supabase/middleware.ts` exportando `async function updateSession(request: NextRequest)`, que crea un `NextResponse` de paso, instancia un cliente Supabase ligado a las cookies de `request`/`response` (mismo patrón `getAll`/`setAll`), llama a `supabase.auth.getUser()` para refrescar el token si hay sesión, y devuelve el `response`. Verificación: `npm run build` compila; la función no está conectada a ningún request real todavía.
5. Crear `proxy.ts` en la raíz, importando `updateSession` desde `lib/supabase/middleware.ts` y exportando `async function proxy(request)` que la invoca y retorna su resultado, junto con `export const config = { matcher: [...] }` que excluye `_next/static`, `_next/image`, `favicon.ico` y archivos de imagen. Verificación: paso 6 (última verificación del plan).
6. Verificación final: `npm run build` compila sin errores de TypeScript ni de ESLint, y `npm run dev` levanta el servidor sin errores en consola al navegar cualquier página existente (el middleware corre en cada request sin romper nada, aunque no haya sesión activa).

## Acceptance criteria

- [ ] `npm run build` compila sin errores de TypeScript ni de ESLint.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `dependencies` de `package.json`.
- [ ] Existe `.env.example` con `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_ANON_KEY=` documentadas sin valor real; `.env.local` no está trackeado por git.
- [ ] `lib/supabase/client.ts` exporta `createClient()` y lanza un error explícito si falta alguna env var de Supabase.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` async que usa `cookies()` de `next/headers` y lanza el mismo error explícito si falta alguna env var.
- [ ] `lib/supabase/middleware.ts` exporta `updateSession(request)` que refresca la sesión vía `supabase.auth.getUser()` y devuelve un `NextResponse`.
- [ ] `proxy.ts` en la raíz invoca `updateSession` y tiene un `matcher` que excluye assets estáticos.
- [ ] `npm run dev` levanta el servidor y cualquier página existente (`/`, `/acerca-de`, `/auth`, `/biblioteca`) carga sin errores en consola.
- [ ] `app/auth/page.tsx` y `lib/storage.ts` no fueron modificados.

## Decisions

- **Sí:** `@supabase/ssr` (paquete oficial actual) en vez del deprecado `@supabase/auth-helpers-nextjs`. Es el reemplazo recomendado por Supabase para App Router.
- **Sí:** tres archivos separados (`client.ts`, `server.ts`, `middleware.ts`) en vez de uno solo. Cada entorno de ejecución (browser, server component/route handler, middleware) maneja cookies de forma distinta y no pueden compartir la misma factory.
- **Sí:** middleware de refresh de sesión incluido en este spec, aunque todavía no hay auth real. Confirmado con el usuario — sienta la base correcta desde ahora para que el spec de autenticación no tenga que tocar `middleware.ts` desde cero.
- **No:** lógica de redirección/protección de rutas en el middleware. Fuera de alcance hasta que exista auth real con rutas que proteger.
- **Sí:** validar env vars con `throw` explícito al crear el cliente. Confirmado con el usuario — evita errores crípticos de Supabase más adelante si falta configuración.
- **No:** página o ruta de prueba que ejecute una llamada real a Supabase. Confirmado con el usuario — la verificación de este spec es solo de build/tipos, no de conectividad real.
- **No:** tocar `app/auth/page.tsx` ni `lib/storage.ts`. Confirmado con el usuario — el mock de localStorage sigue funcionando en paralelo hasta el spec de autenticación.
- **No:** generación de tipos TypeScript desde el esquema de la base de datos. No aplica todavía porque no existen tablas.
- **Sí:** proyecto Supabase ya existente, credenciales provistas por el usuario. No se documenta el flujo de creación del proyecto en el dashboard.

## Risks

| Risk                                                                                                                                                                                             | Mitigation                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El `anon key` es público por diseño, pero sin tablas ni políticas RLS configuradas, cualquier tabla que se cree después queda abierta por defecto hasta que se agreguen políticas explícitas.    | Se documenta como riesgo conocido; el spec de base de datos deberá definir RLS antes de crear cualquier tabla con datos sensibles.                                                      |
| `@supabase/ssr` depende de la API de cookies de Next, que en esta versión (16.2.10) es async (`await cookies()`) — un uso incorrecto (sin `await`) rompería silenciosamente el manejo de sesión. | El plan de implementación (paso 3) usa explícitamente `await cookies()`, siguiendo `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`.                       |
| Un `matcher` mal configurado en `middleware.ts` podría interceptar rutas estáticas y degradar performance, o excluir rutas que sí deberían pasar por el refresh de sesión.                       | Se usa el patrón de matcher recomendado por Supabase (excluir `_next/static`, `_next/image`, `favicon.ico`, imágenes), verificado manualmente navegando el sitio en el paso 6 del plan. |
| Commitear `.env.local` por error expondría la URL y el anon key del proyecto.                                                                                                                    | `.env.local` ya está en `.gitignore` por defecto de `create-next-app`; se revisa `git status` antes de cualquier commit de esta spec (mismo criterio que SPEC 03).                      |
