"use client";

import {
  forwardRef,
  type ForwardRefExoticComponent,
  type Ref,
  type RefAttributes,
} from "react";
import {
  AsteroidsCanvas,
  type AsteroidsCanvasHandle,
} from "@/components/games/asteroids/AsteroidsCanvas";
import type { AsteroidsState } from "@/components/games/asteroids/engine";
import { ArkanoidCanvas } from "@/components/games/arkanoid/ArkanoidCanvas";
import { TetrisCanvas } from "@/components/games/tetris/TetrisCanvas";
import { SnakeCanvas } from "@/components/games/snake/SnakeCanvas";
import { FroggerCanvas } from "@/components/games/frogger/FroggerCanvas";
import type { SkinId } from "@/components/games/skins";
import type { TouchButton } from "@/components/TouchControls";

export interface GameCanvasHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
  extraStats?: { label: string; value: string }[];
}

export interface GameCanvasProps {
  onStateChange: (state: GameState) => void;
  // Skin activo. Opcional: los juegos aún no migrados lo ignoran y mantienen su
  // look original hardcodeado.
  skin?: SkinId;
}

export interface GameEngine {
  Canvas: ForwardRefExoticComponent<
    GameCanvasProps & RefAttributes<GameCanvasHandle>
  >;
  initialState: GameState;
  // true solo para juegos cuyo engine.ts ya implementa paletas por SkinId.
  // Controla si GamePlayer muestra el selector de skin en el HUD.
  hasSkins?: boolean;
  touchControls?: {
    dpad: TouchButton[];
    actions: TouchButton[];
  };
}

const AsteroidsAdapter = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function AsteroidsAdapter({ onStateChange, skin }, ref) {
    return (
      <AsteroidsCanvas
        ref={ref as Ref<AsteroidsCanvasHandle>}
        skin={skin}
        onStateChange={(state: AsteroidsState) =>
          onStateChange({
            score: state.score,
            lives: state.lives,
            level: state.level,
            status: state.status,
            extraStats:
              state.tripleShotRemaining > 0
                ? [
                    {
                      label: "Power-up",
                      value: `3X · ${state.tripleShotRemaining.toFixed(1)}s`,
                    },
                  ]
                : undefined,
          })
        }
      />
    );
  },
);

// D-pad + A/B fijos para los cuatro juegos: siempre se muestran las 4
// direcciones y los 2 botones de acción en el mismo layout. Si el engine de
// un juego puntual no escucha ese code, el botón se marca `disabled` (se ve
// apagado y no dispara el evento) en vez de ocultarse.
function standardTouchControls(activeCodes: Set<string>) {
  const withState = (button: TouchButton): TouchButton => ({
    ...button,
    disabled: !activeCodes.has(button.code),
  });
  return {
    dpad: [
      { code: "ArrowUp", label: "▲" },
      { code: "ArrowLeft", label: "◀" },
      { code: "ArrowDown", label: "▼" },
      { code: "ArrowRight", label: "▶" },
    ].map(withState),
    actions: [
      { code: "Space", label: "A" },
      { code: "KeyX", label: "B" },
    ].map(withState),
  };
}

export const GAME_ENGINES: Record<string, GameEngine> = {
  asteroids: {
    Canvas: AsteroidsAdapter,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
    // rota con izq/der, empuje con arriba, dispara con Space. Sin abajo ni B.
    touchControls: standardTouchControls(
      new Set(["ArrowLeft", "ArrowUp", "ArrowRight", "Space"]),
    ),
  },
  tetris: {
    Canvas: TetrisCanvas,
    initialState: { score: 0, lives: 1, level: 1, status: "playing" },
    hasSkins: true,
    // única con las 4 direcciones + A (caída) + B (rotación alternativa).
    touchControls: standardTouchControls(
      new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space",
        "KeyX",
      ]),
    ),
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
    // solo mueve la paleta con izq/der; sin arriba/abajo ni acciones.
    touchControls: standardTouchControls(new Set(["ArrowLeft", "ArrowRight"])),
  },
  snake: {
    Canvas: SnakeCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
    // las 4 direcciones mueven la serpiente; sin A/B.
    touchControls: standardTouchControls(
      new Set(["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"]),
    ),
  },
  frogger: {
    Canvas: FroggerCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
  },
};
