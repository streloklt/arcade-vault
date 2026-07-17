"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { GameState } from "@/components/games/registry";
import { DEFAULT_SKIN, type SkinId } from "@/components/games/skins";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import { createSnakeGame, type SnakeGame } from "./engine";

export interface SnakeCanvasHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
}

interface SnakeCanvasProps {
  onStateChange: (state: GameState) => void;
  skin?: SkinId;
}

export const SnakeCanvas = forwardRef<SnakeCanvasHandle, SnakeCanvasProps>(
  function SnakeCanvas({ onStateChange, skin = DEFAULT_SKIN }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<SnakeGame | null>(null);
    const initializedRef = useRef(false);
    const [started, setStarted] = useState(false);
    const isTouch = useIsTouchDevice();

    useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const game = createSnakeGame(canvas, onStateChange, skin);
      gameRef.current = game;

      return () => {
        game.destroy();
        gameRef.current = null;
        initializedRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- el engine se instancia una sola vez por montaje; el skin inicial se aplica acá y los cambios posteriores vía setSkin
    }, []);

    useEffect(() => {
      gameRef.current?.setSkin(skin);
    }, [skin]);

    useEffect(() => {
      if (started || isTouch) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        setStarted(true);
        gameRef.current?.start();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [started, isTouch]);

    const handleStart = () => {
      setStarted(true);
      gameRef.current?.start();
    };

    useImperativeHandle(ref, () => ({
      pause() {
        gameRef.current?.stop();
      },
      resume() {
        gameRef.current?.start();
      },
      restart() {
        gameRef.current?.stop();
        gameRef.current?.restart();
        setStarted(false);
      },
      forceGameOver() {
        gameRef.current?.forceGameOver();
      },
    }));

    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        {!started && (
          <div
            className="pixel mono"
            onClick={isTouch ? handleStart : undefined}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              textAlign: "center",
              pointerEvents: isTouch ? "auto" : "none",
              cursor: isTouch ? "pointer" : "default",
            }}
          >
            {isTouch
              ? "SNAKE · TOCA PARA JUGAR"
              : "SNAKE · PULSA ESPACIO PARA JUGAR"}
          </div>
        )}
      </div>
    );
  },
);
