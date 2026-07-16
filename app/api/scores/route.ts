import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { game_id, name, score } = await request.json();

  if (!game_id?.trim()) {
    return Response.json(
      { ok: false, error: "Falta game_id." },
      { status: 400 },
    );
  }

  if (!name?.trim()) {
    return Response.json({ ok: false, error: "Falta name." }, { status: 400 });
  }

  if (!Number.isInteger(score) || score <= 0) {
    return Response.json(
      { ok: false, error: "score debe ser un entero mayor a 0." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", game_id)
    .maybeSingle();

  if (gameError) {
    return Response.json(
      { ok: false, error: gameError.message },
      { status: 400 },
    );
  }

  if (!game) {
    return Response.json(
      { ok: false, error: "game_id no existe." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("scores")
    .insert({ game_id, name: name.trim(), score })
    .select()
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true, score: data }, { status: 201 });
}
