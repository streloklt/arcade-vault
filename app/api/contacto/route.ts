import { Resend } from "resend";

const CONTACT_DESTINATION = "aleteliert@gmail.com";
const CONTACT_SENDER = "onboarding@resend.dev";

export async function POST(request: Request) {
  const { name, email, msg } = await request.json();

  if (!name?.trim() || !email?.trim() || !msg?.trim()) {
    return Response.json(
      { ok: false, error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: CONTACT_SENDER,
    to: CONTACT_DESTINATION,
    subject: `Nuevo mensaje de contacto de ${name}`,
    text: `Nombre: ${name}\nEmail: ${email}\n\n${msg}`,
  });

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
