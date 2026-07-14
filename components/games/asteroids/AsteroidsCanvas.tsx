"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  createAsteroidsGame,
  type AsteroidsGame,
  type AsteroidsState,
} from "./engine";

export interface AsteroidsCanvasHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
}

interface AsteroidsCanvasProps {
  onStateChange: (state: AsteroidsState) => void;
}

export const AsteroidsCanvas = forwardRef<
  AsteroidsCanvasHandle,
  AsteroidsCanvasProps
>(function AsteroidsCanvas({ onStateChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);
  const initializedRef = useRef(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createAsteroidsGame(canvas, onStateChange);
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
      gameRef.current?.restart();
      setStarted(true);
      gameRef.current?.start();
    },
    forceGameOver() {
      gameRef.current?.forceGameOver();
    },
  }));

  return (
    <div
      style={{
        position: "relative",
        width: 800,
        height: 600,
        maxWidth: "100%",
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
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
          ASTEROIDS · PULSA ESPACIO PARA JUGAR
        </div>
      )}
    </div>
  );
});
