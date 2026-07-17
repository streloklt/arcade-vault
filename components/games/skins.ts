// Contrato compartido de skins para los juegos del vault.
//
// Cada motor (`engine.ts`) define su propio tipo `Palette` con los tokens que ese
// juego realmente usa y expone un `Record<SkinId, Palette>`. Este módulo solo fija el
// conjunto de IDs seleccionables, sus etiquetas para el HUD y el default.

export type SkinId = "clasico" | "neon" | "retro";

export interface Skin {
  id: SkinId;
  label: string;
}

// Orden en el que aparecen en el selector del HUD.
export const SKINS: readonly Skin[] = [
  { id: "clasico", label: "Clásico" },
  { id: "neon", label: "Neón" },
  { id: "retro", label: "Retro" },
] as const;

export const DEFAULT_SKIN: SkinId = "clasico";

const VALID_SKINS = new Set<string>(SKINS.map((s) => s.id));

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && VALID_SKINS.has(value);
}
