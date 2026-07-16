import { createClient } from "@/lib/supabase/server";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string;
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: number;
}

interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Game["cat"];
  cover: string;
  color: Game["color"];
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();

  const [
    { data: games, error: gamesError },
    { data: scores, error: scoresError },
  ] = await Promise.all([
    supabase.from("games").select("*").order("id"),
    supabase.from("scores").select("game_id, score"),
  ]);

  if (gamesError) throw gamesError;
  if (scoresError) throw scoresError;

  const stats = new Map<string, { best: number; plays: number }>();
  for (const row of scores ?? []) {
    const current = stats.get(row.game_id) ?? { best: 0, plays: 0 };
    current.best = Math.max(current.best, row.score);
    current.plays += 1;
    stats.set(row.game_id, current);
  }

  return (games ?? []).map((game: GameRow) => {
    const gameStats = stats.get(game.id);
    return {
      ...game,
      best: gameStats?.best ?? 0,
      plays: gameStats?.plays ?? 0,
    };
  });
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();

  const [
    { data: game, error: gameError },
    { data: scores, error: scoresError },
  ] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("scores").select("score").eq("game_id", id),
  ]);

  if (gameError) throw gameError;
  if (scoresError) throw scoresError;
  if (!game) return null;

  const best = (scores ?? []).reduce((max, row) => Math.max(max, row.score), 0);
  const plays = scores?.length ?? 0;

  return { ...(game as GameRow), best, plays };
}
