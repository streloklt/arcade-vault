import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games";

export interface ScoreRow {
  name: string;
  score: number;
  createdAt: string;
}

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
  }));
}

export async function getRecentScores(
  limit: number,
): Promise<(ScoreRow & { game: Pick<Game, "id" | "title" | "color"> })[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at, games(id, title, color)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
    game: row.games as unknown as Pick<Game, "id" | "title" | "color">,
  }));
}

export async function getTopScoresAllGames(limit: number): Promise<ScoreRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scores")
    .select("name, score, created_at")
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    name: row.name,
    score: row.score,
    createdAt: row.created_at,
  }));
}
