# CLAUDE.md

Este archivo da guía a Claude Code (claude.ai/code) para tsrabajar en este repositorio y que siempre debe hablar en español.

@AGENTS.md

## Proyecto

Arcade Vault — plataforma para jugar online y competir por puntos. Actualmente es un scaffold fresco de `create-next-app` (App Router, sin funcionalidades de juego/vault implementadas todavía).

## Crítico: versión no estándar de Next.js

`package.json` fija `next@16.2.10` / `react@19.2.4` — versiones posteriores a los datos de entrenamiento de este asistente. Según `AGENTS.md`, **leer la página correspondiente en `node_modules/next/dist/docs/` antes de escribir código de App Router** (routing, data fetching, caching, config) en vez de confiar en convenciones recordadas de Next.js, y seguir cualquier aviso de deprecación encontrado ahí.

## Comandos

- `npm run dev` — levanta servidor de desarrollo
- `npm run build` — build de producción
- `npm run start` — corre el build de producción
- `npm run lint` — ESLint (flat config en `eslint.config.mjs`, extiende `eslint-config-next` core-web-vitals + typescript)

Todavía no hay test runner configurado.

## Arquitectura

- Solo App Router, bajo `app/`: `layout.tsx` (layout raíz, fuentes Geist) + `page.tsx` (home).
- Estilos: Tailwind CSS v4 vía `@tailwindcss/postcss` (ver `postcss.config.mjs`), tokens de tema declarados inline en `app/globals.css` con `@theme inline`, dark mode vía `prefers-color-scheme`.
- Alias de path `@/*` → raíz del repo (`tsconfig.json`).
- TypeScript en modo strict.

## Flujo de Spec Driven Design

Este repo sigue desarrollo spec-driven usando los comandos `/spec` y `/spec-impl` del paquete de skills `Klerith/fernando-skills` (ver README.md):

```bash
npx skills@latest add Klerith/fernando-skills
```

Usar `/spec` para producir una spec antes de implementar una feature, luego `/spec-impl` para implementar contra esa spec.

## Skills
Usa siempre /frontend-desing para diseñar la interfaz de usuario. 
