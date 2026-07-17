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
- Estado: con-skins
- Skins: clasico (default), neon, retro
- Descripción:
  - `clasico`: vectorial B/N original preservado exacto (nave/roca/bala/estela blancas
    `#fff`, llama `rgba(255,130,0,0.85)`, power-up cyan `#0ff`), fondo negro `#000`, sin glow.
  - `neon`: vectores saturados de alto contraste (nave cyan `#00f5ff`, rocas magenta
    `#c800ff`, balas amarillas `#faff00`, power-up verde `#00ff85`) con glow tipo tubo de
    neón vía `shadowBlur`, sobre fondo casi negro azulado `#03030a`.
  - `retro`: paleta ámbar/terrosa fósforo CRT (nave `#d8c9a0`, rocas oliva `#8a8a7a`,
    balas mostaza `#c9a227`, power-up teal `#5a8f8f`) sobre fondo marrón muy oscuro `#0d0b07`,
    sin glow.
  - Paleta por skin en `Record<SkinId, AsteroidsPalette>` (`components/games/asteroids/engine.ts`),
    inyectada vía prop `skin` → `setSkin(id)` (cada clase de entidad recibe la paleta en su
    `draw`); persistida global en `av_skin`.

### Arkanoid

- Fecha: 2026-07-17
- Estado: con-skins
- Skins: clasico (default), neon, retro
- Descripción:
  - `clasico`: usa el spritesheet original (`spritesheet-breakout.png`) tal cual, fondo `#000`,
    sin glow. Cero regresión visual.
  - `neon`/`retro`: ignoran el spritesheet y dibujan primitivas de canvas (bloques con bisel,
    pelota circular); `neon` con `shadowBlur` tipo tubo sobre fondo `#03030a`; `retro` con
    colores terrosos sin glow sobre fondo `#0d0b07`.
  - Paleta por skin en `Record<SkinId, ArkanoidPalette>` (flag `sprites: boolean` decide si se
    usa el spritesheet o primitivas), inyectada vía prop `skin` → `setSkin(id)`; persistida
    global en `av_skin` (`components/games/arkanoid/engine.ts`).

### Snake

- Fecha: 2026-07-17
- Estado: con-skins
- Skins: clasico (default), neon, retro
- Descripción:
  - `clasico`: look original preservado exacto (cuerpo `#16a34a`, cabeza `#4ade80`) sobre
    fondo negro `#0a0a0a`, grilla blanca translúcida `rgba(255,255,255,0.05)`, sin glow.
  - `neon`: verde saturado de alto contraste (cuerpo `#00ff85`, cabeza `#5cff5c`) con glow
    tipo tubo de neón vía `shadowBlur` sobre fondo casi negro azulado `#03030a`, grilla verde
    translúcida.
  - `retro`: paleta oliva/terrosa 8-bit (cuerpo `#6b8f4e`, cabeza `#a7c072`) sobre fondo verde
    muy oscuro `#0d0f08`, grilla oliva translúcida, estética CRT sin glow.
  - Paleta por skin en `Record<SkinId, SnakePalette>` (`components/games/snake/engine.ts`),
    inyectada vía prop `skin` → `setSkin(id)`; persistida global en `av_skin`.
