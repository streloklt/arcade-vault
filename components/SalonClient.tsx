"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Game } from "@/lib/games";
import type { ScoreRow } from "@/lib/scores";
import { createClient } from "@/lib/supabase/client";
import { getStoredUserSnapshot, subscribeToUserChanges } from "@/lib/storage";

function getServerUserSnapshot() {
  return null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export function SalonClient({ games }: { games: Game[] }) {
  const [tab, setTab] = useState(games[0]?.id ?? "");
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const user = useSyncExternalStore(
    subscribeToUserChanges,
    getStoredUserSnapshot,
    getServerUserSnapshot,
  );

  useEffect(() => {
    if (!tab) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("scores")
      .select("name, score, created_at")
      .eq("game_id", tab)
      .order("score", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (cancelled) return;
        setRows(
          (data ?? []).map((row) => ({
            name: row.name,
            score: row.score,
            createdAt: row.created_at,
          })),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const game = games.find((g) => g.id === tab);
  const youIndex = user
    ? rows.findIndex((r) => r.name.toLowerCase() === user.name.toLowerCase())
    : -1;
  const youRow = youIndex >= 0 ? rows[youIndex] : null;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="podium">
        {rows[1] && (
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{rows[1].name}</div>
            <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
            <div className="date">{formatDate(rows[1].createdAt)}</div>
          </div>
        )}
        {rows[0] && (
          <div className="podium-slot gold">
            <div
              className="pixel"
              style={{
                fontSize: 9,
                color: "var(--gold)",
                letterSpacing: "0.18em",
              }}
            >
              CAMPEÓN
            </div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
              01
            </div>
            <div className="name">{rows[0].name}</div>
            <div className="score" style={{ fontSize: 20 }}>
              {rows[0].score.toLocaleString("es-ES")}
            </div>
            <div className="date">{formatDate(rows[0].createdAt)}</div>
          </div>
        )}
        {rows[2] && (
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{rows[2].name}</div>
            <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
            <div className="date">{formatDate(rows[2].createdAt)}</div>
          </div>
        )}
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + i}
            className={
              "tr" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{formatDate(r.createdAt)}</div>
          </div>
        ))}
        {youRow && game && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk" style={{ color: "var(--yellow)" }}>
                #{String(youIndex + 1).padStart(2, "0")}
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {youRow.name}
              </div>
              <div
                className="sc"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                {youRow.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{formatDate(youRow.createdAt)}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
