import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../admin-auth";

const VALID_STATUSES = new Set(["Recibida", "En proceso", "Pendiente", "Pagada"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const payload = await request.json() as { status?: string; amount?: number };
  if (payload.status !== undefined && !VALID_STATUSES.has(payload.status)) {
    return Response.json({ error: "Estado inválido." }, { status: 400 });
  }
  if (payload.status === undefined && payload.amount === undefined) {
    return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }
  const current = await env.DB.prepare(`
    SELECT status, paid_amount AS paidAmount FROM submissions WHERE id = ?
  `).bind(id).first<{ status: string; paidAmount: number | null }>();
  if (!current) {
    return Response.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }

  const status = payload.status ?? current.status;
  const paidAmount = payload.amount === undefined ? current.paidAmount : Number(payload.amount);
  if (payload.amount !== undefined && (!Number.isSafeInteger(paidAmount) || Number(paidAmount) <= 0)) {
    return Response.json({ error: "Ingresa un monto válido." }, { status: 400 });
  }
  if (status === "Pagada" && (!Number.isSafeInteger(paidAmount) || Number(paidAmount) <= 0)) {
    return Response.json({ error: "La factura no tiene un monto válido. Revísalo antes de marcarla como pagada." }, { status: 400 });
  }

  const result = await env.DB.prepare(`
    UPDATE submissions
    SET status = ?, paid_amount = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(status, paidAmount, id).run();

  if (!result.meta.changes) {
    return Response.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }
  return Response.json({ id, status, paidAmount });
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
