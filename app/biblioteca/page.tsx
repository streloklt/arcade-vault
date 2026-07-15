import { getGames } from "@/lib/games";
import { BibliotecaFiltros } from "@/components/BibliotecaFiltros";

export default async function Home() {
  const games = await getGames();

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <BibliotecaFiltros games={games} />
    </div>
  );
}
