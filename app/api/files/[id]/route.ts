import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../admin-auth";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const row = await env.DB.prepare(`
    SELECT file_name AS fileName, content_type AS contentType, object_key AS objectKey
    FROM documents WHERE id = ?
  `).bind(id).first<{ fileName: string; contentType: string; objectKey: string }>();

  if (!row) return new Response("Archivo no encontrado.", { status: 404 });
  const object = await env.FILES.get(row.objectKey);
  if (!object) return new Response("Archivo no disponible.", { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": row.contentType,
      "content-length": String(object.size),
      "content-disposition": contentDisposition(row.fileName),
      "cache-control": "private, no-store",
    },
  });
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
