import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../admin-auth";

const VALID_STATUSES = new Set(["Recibida", "En proceso", "Pendiente", "Pagada"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
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

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const submission = await env.DB.prepare(`
    SELECT id FROM submissions WHERE id = ?
  `).bind(id).first<{ id: string }>();
  if (!submission) {
    return Response.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const documents = await env.DB.prepare(`
    SELECT object_key AS objectKey FROM documents WHERE submission_id = ?
  `).bind(id).all<{ objectKey: string }>();

  try {
    await Promise.all(documents.results.map((document) => env.FILES.delete(document.objectKey)));
    await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
    return Response.json({ id, deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible eliminar la solicitud.";
    return Response.json({ error: message }, { status: 500 });
  }
}
