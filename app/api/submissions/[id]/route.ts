import { env } from "cloudflare:workers";

const VALID_STATUSES = new Set(["Recibida", "En proceso", "Pendiente", "Pagada"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = await request.json() as { status?: string };
  if (!payload.status || !VALID_STATUSES.has(payload.status)) {
    return Response.json({ error: "Estado inválido." }, { status: 400 });
  }

  const result = await env.DB.prepare(`
    UPDATE submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(payload.status, id).run();

  if (!result.meta.changes) {
    return Response.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }
  return Response.json({ id, status: payload.status });
}
