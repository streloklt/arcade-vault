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
import { createTetrisGame, type TetrisGame } from "./engine";

export interface TetrisCanvasHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
}

interface TetrisCanvasProps {
  onStateChange: (state: GameState) => void;
  skin?: SkinId;
}

export const TetrisCanvas = forwardRef<TetrisCanvasHandle, TetrisCanvasProps>(
  function TetrisCanvas({ onStateChange, skin = DEFAULT_SKIN }, ref) {
    const boardRef = useRef<HTMLCanvasElement>(null);
    const nextRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<TetrisGame | null>(null);
    const initializedRef = useRef(false);
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      const board = boardRef.current;
      const nextPreview = nextRef.current;
      if (!board || !nextPreview) return;

      const game = createTetrisGame(board, nextPreview, onStateChange, skin);
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}
        >
          <canvas
            ref={boardRef}
            width={300}
            height={600}
            style={{ display: "block" }}
          />
          <canvas
            ref={nextRef}
            width={120}
            height={120}
            style={{ display: "block" }}
          />
        </div>
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
            TETRIS · PULSA ESPACIO PARA JUGAR
          </div>
        )}
      </div>
    );
  },
);
