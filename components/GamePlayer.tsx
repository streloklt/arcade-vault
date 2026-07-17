"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import {
  getStoredSkin,
  getStoredUser,
  setStoredSkin,
  subscribeToSkinChanges,
} from "@/lib/storage";
import {
  GAME_ENGINES,
  type GameCanvasHandle,
  type GameState,
} from "@/components/games/registry";
import { DEFAULT_SKIN, SKINS, type SkinId } from "@/components/games/skins";
import { TouchControls } from "@/components/TouchControls";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const engine = GAME_ENGINES[game.id];
  const canvasRef = useRef<GameCanvasHandle>(null);
  const [engineState, setEngineState] = useState<GameState>(
    engine?.initialState ?? {
      score: 0,
      lives: 3,
      level: 1,
      status: "playing",
    },
  );
  const [mockScore, setMockScore] = useState(0);
  const score = engine ? engineState.score : mockScore;
  const lives = engine ? engineState.lives : 3;
  const level = engine ? engineState.level : Math.floor(mockScore / 2500) + 1;
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [saved, setSaved] = useState(false);
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);

  useEffect(() => {
    // localStorage no existe en SSR; el nombre se lee tras montar y sigue siendo editable localmente.
    const user = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor inicial hidratado desde localStorage, luego editable por el jugador
    if (user) setName(user.name);
  }, []);

  useEffect(() => {
    // Skin activo (alcance global) hidratado desde localStorage tras montar, y
    // sincronizado si cambia en otra pestaña.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor inicial hidratado desde localStorage
    setSkin(getStoredSkin());
    const unsubscribe = subscribeToSkinChanges(() => setSkin(getStoredSkin()));
    return unsubscribe;
  }, []);

  const changeSkin = (id: SkinId) => {
    setSkin(id);
    setStoredSkin(id);
  };

  useEffect(() => {
    if (engine || over || paused) return;
    const t = setInterval(
      () => setMockScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [engine, over, paused]);

  const handleStateChange = (state: GameState) => {
    setEngineState((prev) => {
      const unchanged =
        prev.score === state.score &&
        prev.lives === state.lives &&
        prev.level === state.level &&
        prev.status === state.status &&
        JSON.stringify(prev.extraStats) === JSON.stringify(state.extraStats);
      return unchanged ? prev : state;
    });
    if (state.status === "gameover") setOver(true);
  };

  const endGame = () => {
    if (engine) {
      canvasRef.current?.forceGameOver();
    } else {
      setOver(true);
    }
  };

  const togglePause = () => {
    if (engine) {
      if (paused) canvasRef.current?.resume();
      else canvasRef.current?.pause();
    }
    setPaused((p) => !p);
  };

  const restart = () => {
    if (engine) canvasRef.current?.restart();
    setMockScore(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div
          className="hud-stats"
          style={{ display: "flex", gap: 24, flexWrap: "wrap" }}
        >
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
          {engine &&
            engineState.extraStats?.map((stat) => (
              <div className="hud-stat" key={stat.label}>
                <div className="l">{stat.label}</div>
                <div className="v">{stat.value}</div>
              </div>
            ))}
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

      {engine?.hasSkins && (
        <div className="hud-skins-row" role="group" aria-label="Skin">
          {SKINS.map((s) => (
            <button
              key={s.id}
              className={`btn ghost${skin === s.id ? " magenta" : ""}`}
              aria-pressed={skin === s.id}
              onClick={() => changeSkin(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="crt">
        <div className="crt-screen">
          {engine ? (
            <engine.Canvas
              ref={canvasRef}
              onStateChange={handleStateChange}
              skin={skin}
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

      {isTouch && engine?.touchControls && (
        <TouchControls
          dpad={engine.touchControls.dpad}
          actions={engine.touchControls.actions}
        />
      )}

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
                    setSaved(true);
                    fetch("/api/scores", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        game_id: game.id,
                        name,
                        score,
                      }),
                    });
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
