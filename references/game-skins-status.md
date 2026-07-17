# Ledger de skins por juego

Memoria persistente del agente `skin-designer`. Cada corrida lee este archivo antes de
tocar código, para saber si el juego indicado por el usuario ya tiene skins o sigue en
su look único hardcodeado. El agente trabaja **un juego por corrida — solo el que el
usuario nombre** — y actualiza acá únicamente la entrada de ese juego al cerrar.

**Formato por entrada:**

```
### <Juego>
- Fecha: <YYYY-MM-DD>
- Estado: sin-skins | con-skins
- Skins: <lista de skins seleccionables hoy, ej. "clasico (default), neon, retro">
- Descripción: <qué paleta/estética tiene cada skin de este juego, en una línea por skin>
```

Estados:

- `sin-skins` — el juego solo tiene su look original hardcodeado en `engine.ts`, sin
  tipo `SkinId` ni selector en el HUD.
- `con-skins` — el juego ya expone `clasico` (default, look original preservado),
  `neon` y `retro` como skins seleccionables desde `GamePlayer.tsx`, persistidos vía
  `lib/storage.ts`.

---

## Sembrado inicial (catálogo actual)

### Tetris

- Fecha: 2026-07-17
- Estado: con-skins
- Skins: clasico (default), neon, retro
- Descripción:
  - `clasico`: paleta original preservada exacta (I cyan, O amarillo, T púrpura, S verde,
    Z rojo, J celeste, L naranja, N gris), grilla `#22222e`, sin glow.
  - `neon`: piezas saturadas de alto contraste (`#00f5ff`, `#faff00`, `#c800ff`, etc.)
    con glow tipo tubo de neón vía `shadowBlur`, grilla cyan translúcida.
  - `retro`: paleta apagada/terrosa 8-bit (teal, mostaza, ladrillo, oliva) sobre grilla
    marrón oscura, estética CRT sin glow.
  - Paleta por skin en `Record<SkinId, TetrisPalette>` (`components/games/tetris/engine.ts`),
    inyectada vía prop `skin` → `setSkin(id)`; persistida global en `av_skin`.

### Asteroids

- Fecha: 2026-07-17
- Estado: sin-skins
- Skins: —
- Descripción: sin paleta configurable; render en `components/games/asteroids/engine.ts`.

### Arkanoid

- Fecha: 2026-07-17
- Estado: sin-skins
- Skins: —
- Descripción: sin paleta configurable; render en `components/games/arkanoid/engine.ts`.

### Snake

- Fecha: 2026-07-17
- Estado: sin-skins
- Skins: —
- Descripción: colores hardcodeados en `BODY_COLOR`/`HEAD_COLOR`/`BG_COLOR` (`components/games/snake/engine.ts`).
