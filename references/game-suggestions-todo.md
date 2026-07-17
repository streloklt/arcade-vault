# Ledger de sugerencias de juegos

Memoria persistente del agente `game-planner`. Cada corrida lee este archivo antes de
proponer un juego nuevo, para no repetir sugerencias ya hechas ni volver a plantear algo
descartado sin motivo nuevo.

**Formato por entrada:**

```
### <Juego>
- Categoría/Color propuestos: <cat> / <color>
- Fecha: <YYYY-MM-DD>
- Estado: propuesto | descartado | implementado
- Rationale: <por qué encaja / por qué se descartó>
```

Estados:

- `implementado` — ya existe en `components/games/registry.tsx` (`GAME_ENGINES`) y en la
  tabla `games` de Supabase.
- `propuesto` — recomendado por `game-planner` en alguna corrida, todavía sin spec ni
  implementación.
- `descartado` — evaluado y rechazado; el rationale explica por qué (no encaja en el
  patrón técnico, duplica mecánica, etc.).

---

## Sembrado inicial (juegos ya implementados)

### Tetris

- Categoría/Color propuestos: Puzzle / magenta
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 07). Bloques que caen, single-player, canvas, teclado, score por líneas.

### Asteroids

- Categoría/Color propuestos: Shooter / yellow
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 05). Primer juego del vault; estableció el patrón de motor factory + registro.

### Arkanoid

- Categoría/Color propuestos: Arcade / cyan
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 08). Paleta y pelota, 5 niveles, single-player, canvas, teclado.

### Snake

- Categoría/Color propuestos: Arcade / green
- Fecha: 2026-07-17
- Estado: implementado
- Rationale: Ya en producción (spec 09). Clásico de grid, single-player, canvas, teclado.
