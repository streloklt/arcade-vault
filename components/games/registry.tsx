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
import type { SkinId } from "@/components/games/skins";

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

export const GAME_ENGINES: Record<string, GameEngine> = {
  asteroids: {
    Canvas: AsteroidsAdapter,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
  },
  tetris: {
    Canvas: TetrisCanvas,
    initialState: { score: 0, lives: 1, level: 1, status: "playing" },
    hasSkins: true,
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
  },
  snake: {
    Canvas: SnakeCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
    hasSkins: true,
  },
};
