import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../admin-auth";

const VALID_KINDS = new Set(["provider", "project"]);
const VALID_PROJECT_TYPES = new Set(["DS19", "DS49", "INMB", "G. Proyectos"]);

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const rows = await env.DB.prepare(`
    SELECT id, kind, name, project_type AS projectType, created_at AS createdAt
    FROM catalog_entries
    WHERE kind IN ('provider', 'project')
    ORDER BY created_at DESC, name COLLATE NOCASE
  `).all();
  return Response.json({ entries: rows.results });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const payload = await request.json() as { id?: number; name?: string; projectType?: string | null };
  const id = Number(payload.id);
  const name = String(payload.name ?? "").trim();
  if (!Number.isInteger(id) || !name) {
    return Response.json({ error: "El nombre no puede quedar vacío." }, { status: 400 });
  }
  const current = await env.DB.prepare(`
    SELECT kind, project_type AS projectType FROM catalog_entries WHERE id = ?
  `).bind(id).first<{ kind: string; projectType: string | null }>();
  if (!current || !VALID_KINDS.has(current.kind)) {
    return Response.json({ error: "Elemento no encontrado." }, { status: 404 });
  }
  const projectType = current.kind === "project" ? String(payload.projectType ?? current.projectType ?? "") : null;
  if (current.kind === "project" && !VALID_PROJECT_TYPES.has(projectType)) {
    return Response.json({ error: "Selecciona un tipo de proyecto válido." }, { status: 400 });
  }
  try {
    await env.DB.prepare(`
      UPDATE catalog_entries SET name = ?, project_type = ? WHERE id = ?
    `).bind(name, projectType, id).run();
    return Response.json({ entry: { id, kind: current.kind, name, projectType } });
  } catch {
    return Response.json({ error: "Ya existe un elemento con ese nombre y tipo." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Elemento inválido." }, { status: 400 });
  const result = await env.DB.prepare(`
    DELETE FROM catalog_entries WHERE id = ? AND kind IN ('provider', 'project')
  `).bind(id).run();
  if (!result.meta.changes) return Response.json({ error: "Elemento no encontrado." }, { status: 404 });
  return Response.json({ id, deleted: true });
}
