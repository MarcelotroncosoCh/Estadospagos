import { env } from "cloudflare:workers";

export async function GET() {
  const rows = await env.DB.prepare(`
    SELECT kind, name, project_type AS projectType
    FROM catalog_entries
    ORDER BY name COLLATE NOCASE
  `).all();
  return Response.json({ entries: rows.results });
}
