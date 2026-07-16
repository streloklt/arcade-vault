import { getGames } from "@/lib/games";
import { SalonClient } from "@/components/SalonClient";

export default async function HallOfFamePage() {
  const games = await getGames();

  return <SalonClient games={games} />;
}
