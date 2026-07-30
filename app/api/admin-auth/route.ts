import { clearAdminCookie, createAdminCookie, isAdmin, passwordMatches } from "../../admin-auth";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdmin(request) });
}

export async function POST(request: Request) {
  const payload = await request.json() as { password?: string };
  if (!passwordMatches(String(payload.password ?? ""))) {
    return Response.json({ error: "La contraseña no es correcta." }, { status: 401 });
  }
  return Response.json({ authenticated: true }, {
    headers: { "set-cookie": await createAdminCookie() },
  });
}

export async function DELETE() {
  return Response.json({ authenticated: false }, {
    headers: { "set-cookie": clearAdminCookie() },
  });
}
