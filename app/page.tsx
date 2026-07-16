import { getGames } from "@/lib/games";
import { getRecentScores, getTopScoresAllGames } from "@/lib/scores";
import { HomeClient } from "@/components/HomeClient";

export default async function Home() {
  const [games, recentScores, topPlayers] = await Promise.all([
    getGames(),
    getRecentScores(7),
    getTopScoresAllGames(5),
  ]);

  return (
    <HomeClient
      games={games}
      recentScores={recentScores}
      topPlayers={topPlayers}
    />
  );
}
