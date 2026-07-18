"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  GameCanvasHandle,
  GameCanvasProps,
} from "@/components/games/registry";
import { createFroggerGame, type FroggerGame } from "./engine";

export const FroggerCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function FroggerCanvas({ onStateChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<FroggerGame | null>(null);
    const initializedRef = useRef(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const game = createFroggerGame(canvas, onStateChange);
      gameRef.current = game;

      return () => {
        game.destroy();
        gameRef.current = null;
        initializedRef.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- el engine se instancia una sola vez por montaje
    }, []);

    useEffect(() => {
      if (started) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code !== "Space") return;
        e.preventDefault();
        setStarted(true);
        gameRef.current?.start();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [started]);

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
          width={600}
          height={520}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
        {!started && (
          <div
            className="pixel mono"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            FROGGER · PULSA ESPACIO PARA JUGAR
          </div>
        )}
      </div>
    );
  },
);
