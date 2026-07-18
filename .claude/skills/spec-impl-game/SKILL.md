---
name: spec-impl-game
description: Implementa la spec de un juego nuevo delegando en /spec-impl y, al terminar, encadena skin-designer y luego mobile-porter (secuencial, nunca en paralelo) para el juego recién implementado.
disable-model-invocation: true
argument-hint: <NN-spec-name>
---

# /spec-impl-game — Implementador de specs de juego + post-producción encadenada

Hablás siempre en español (`CLAUDE.md`). Este comando **no reimplementa** la lógica de
`/spec-impl` — la delega — y agrega, después de una implementación exitosa, dos
subagentes de post-producción para el juego recién sumado: `skin-designer` y
`mobile-porter`. Siempre en ese orden, **nunca en paralelo**.

El argumento recibido es: `$ARGUMENTS` (nombre/número de spec, igual que en `/spec-impl`).

---

## Fase A — Implementación (delegada a `/spec-impl`)

Invocá el skill `/spec-impl` pasándole `$ARGUMENTS` tal cual (herramienta Skill:
`skill: spec-impl`, `args: $ARGUMENTS`). No dupliques ninguna de sus validaciones ni su
lógica de fases — dejá que `/spec-impl` maneje él mismo:

- Identificar el archivo de spec en `specs/` (o pedir el nombre si `$ARGUMENTS` viene
  vacío).
- Validar que el estado sea "Approved" (o equivalente en cualquier idioma). Si no lo
  es, `/spec-impl` se detiene solo, con su mensaje de error estándar.
- Crear/cambiar al branch `spec-NN-slug` según `AutoCreateBranch`.
- Mostrar el resumen de la spec y esperar confirmación antes de implementar.
- Implementar paso a paso con pausas para revisar diffs, y terminar recordando
  verificar los criterios de aceptación.

**Regla dura de gate:** solo se avanza a la Fase B cuando `/spec-impl` completó
efectivamente su Fase 4 (todos los pasos del plan implementados, mostrado el
recordatorio final de criterios de aceptación). Si `/spec-impl` se detuvo antes por
cualquier motivo — estado no Approved, spec no encontrada, el usuario no confirmó, el
usuario abortó a mitad de la implementación — **no se lanza ningún agente**. Informá
simplemente que la post-producción no corre porque la implementación no se completó.

---

## Fase B — Post-producción (secuencial, un agente a la vez)

Solo si la Fase A terminó completa:

1. **Derivar el `id` del juego.** Leé de la spec ya implementada (sección Data model /
   la fila insertada en la tabla `games`) el `id` real del juego — el slug que nombra
   la carpeta `components/games/<id>/` y la ruta `/juego/<id>`. Puede no coincidir con
   el slug del nombre del archivo de spec: usá el `id` real, no lo asumas del nombre de
   spec.

2. **Lanzar `skin-designer` primero.** Usá la herramienta Agent con
   `subagent_type: skin-designer`, nombrándole explícitamente el juego (`id` y título)
   para que le aplique los 3 skins seleccionables (`clasico`/`neon`/`retro`). Lanzalo
   con `run_in_background: false` — necesitás su resultado antes de continuar, no solo
   notificación.

3. **Esperar a que `skin-designer` termine por completo** (código y ledger
   `references/game-skins-status.md` actualizados) antes de tocar el siguiente paso.

4. **Lanzar `mobile-porter` después, nunca antes ni junto con `skin-designer`.** Usá la
   herramienta Agent con `subagent_type: mobile-porter`, indicándole que la zona a
   revisar en esta corrida es **"detalle de juego"** (`/juego/<id>`) del juego recién
   implementado — no el sitio completo, solo esa zona. Pedile explícitamente que, como
   parte de esa corrida, verifique también la **paridad táctil del reproductor**
   (`/juego/<id>/jugar`) de este juego puntual — no la infra compartida de la spec 10
   (`TouchControls`, `useIsTouchDevice`, `av-hide-nav`, ya resuelta y fuera de su
   alcance), sino el opt-in por-juego: que la entrada `<id>` en `registry.tsx` tenga
   `touchControls`, y que su `<Juego>Canvas.tsx` arranque por tap en viewport táctil. Si
   falta, que lo cablee siguiendo el patrón ya establecido (ver su propio charter). También
   `run_in_background: false`.

5. **Regla dura, sin excepciones:** jamás invoques ambos agentes en el mismo mensaje ni
   en paralelo. `mobile-porter` solo arranca una vez que `skin-designer` devolvió su
   resultado.

6. **Cierre.** Informá al usuario, en un solo resumen: spec implementada (branch,
   archivos tocados), skins aplicados al juego, ajustes de responsive aplicados al
   detalle del juego, si se verificó (o tuvo que cablearse) la paridad táctil del
   reproductor, y el recordatorio pendiente de `/spec-impl`: verificar los
   criterios de aceptación uno por uno y, si todos pasan, actualizar el `Status` de la
   spec a "Implemented" (o el equivalente en el idioma del repo) antes de mergear el
   branch.

---

## Reglas duras

- Nunca reimplementes las fases de `/spec-impl` a mano — siempre delegá invocándolo
  como skill.
- Nunca lances `skin-designer` y `mobile-porter` en paralelo ni en el mismo turno.
- Nunca inventes el `id` del juego — leelo de la spec ya aprobada/implementada.
- Si `/spec-impl` no completó la implementación, no lances ningún agente de
  post-producción.
- Si el usuario pide explícitamente que se salte skin-designer o mobile-porter para
  esta corrida, respetalo — pero avisá que el flujo estándar de este comando los
  incluye a ambos.
