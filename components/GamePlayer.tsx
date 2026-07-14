"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { getStoredUser, saveScore } from "@/lib/storage";
import {
  AsteroidsCanvas,
  type AsteroidsCanvasHandle,
} from "@/components/games/asteroids/AsteroidsCanvas";
import type { AsteroidsState } from "@/components/games/asteroids/engine";

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const isAsteroids = game.id === "asteroids";
  const asteroidsRef = useRef<AsteroidsCanvasHandle>(null);
  const [asteroidsState, setAsteroidsState] = useState<AsteroidsState>({
    score: 0,
    lives: 3,
    level: 1,
    tripleShotRemaining: 0,
    status: "playing",
  });
  const [mockScore, setMockScore] = useState(0);
  const score = isAsteroids ? asteroidsState.score : mockScore;
  const lives = isAsteroids ? asteroidsState.lives : 3;
  const level = isAsteroids
    ? asteroidsState.level
    : Math.floor(mockScore / 2500) + 1;
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // localStorage no existe en SSR; el nombre se lee tras montar y sigue siendo editable localmente.
    const user = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor inicial hidratado desde localStorage, luego editable por el jugador
    if (user) setName(user.name);
  }, []);

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(
      () => setMockScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  const handleAsteroidsStateChange = (state: AsteroidsState) => {
    setAsteroidsState((prev) => {
      const triple = Math.round(state.tripleShotRemaining * 10) / 10;
      const prevTriple = Math.round(prev.tripleShotRemaining * 10) / 10;
      const unchanged =
        prev.score === state.score &&
        prev.lives === state.lives &&
        prev.level === state.level &&
        prev.status === state.status &&
        prevTriple === triple;
      return unchanged ? prev : state;
    });
    if (state.status === "gameover") setOver(true);
  };

  const endGame = () => {
    if (isAsteroids) {
      asteroidsRef.current?.forceGameOver();
    } else {
      setOver(true);
    }
  };

  const togglePause = () => {
    if (isAsteroids) {
      if (paused) asteroidsRef.current?.resume();
      else asteroidsRef.current?.pause();
    }
    setPaused((p) => !p);
  };

  const restart = () => {
    if (isAsteroids) asteroidsRef.current?.restart();
    setMockScore(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          {isAsteroids && asteroidsState.tripleShotRemaining > 0 && (
            <div className="hud-stat">
              <div className="l">Power-up</div>
              <div className="v">{`3X · ${asteroidsState.tripleShotRemaining.toFixed(1)}s`}</div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juego/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsCanvas
              ref={asteroidsRef}
              onStateChange={handleAsteroidsStateChange}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/biblioteca")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
