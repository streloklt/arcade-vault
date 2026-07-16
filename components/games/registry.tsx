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
}

export interface GameEngine {
  Canvas: ForwardRefExoticComponent<
    GameCanvasProps & RefAttributes<GameCanvasHandle>
  >;
  initialState: GameState;
}

const AsteroidsAdapter = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function AsteroidsAdapter({ onStateChange }, ref) {
    return (
      <AsteroidsCanvas
        ref={ref as Ref<AsteroidsCanvasHandle>}
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
  },
  tetris: {
    Canvas: TetrisCanvas,
    initialState: { score: 0, lives: 1, level: 1, status: "playing" },
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    initialState: { score: 0, lives: 3, level: 1, status: "playing" },
  },
};
