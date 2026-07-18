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
import { DEFAULT_SKIN } from "@/components/games/skins";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import { createFroggerGame, type FroggerGame } from "./engine";

export const FroggerCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function FroggerCanvas({ onStateChange, skin = DEFAULT_SKIN }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<FroggerGame | null>(null);
    const initializedRef = useRef(false);
    const [started, setStarted] = useState(false);
    const isTouch = useIsTouchDevice();

    useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const game = createFroggerGame(canvas, onStateChange, skin);
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              aspectRatio: "600 / 520",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <canvas
              ref={canvasRef}
              width={600}
              height={520}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
        </div>
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
              ? "FROGGER · TOCA PARA JUGAR"
              : "FROGGER · PULSA ESPACIO PARA JUGAR"}
          </div>
        )}
      </div>
    );
  },
);
