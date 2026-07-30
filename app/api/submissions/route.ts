import { env } from "cloudflare:workers";
import { requireAdmin } from "../../admin-auth";

const VALID_DEPARTMENTS = new Set([
  "Arquitectura",
  "Gerencia de Proyectos",
  "Ingeniería",
  "Oficina Técnica",
  "Presupuesto",
  "Topografía",
]);
const VALID_TYPES = new Set(["DS19", "DS49", "INMB", "G. Proyectos"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 20;
const SAFE_STORAGE_LIMIT = 8 * 1024 * 1024 * 1024;

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const rows = await env.DB.prepare(`
    SELECT s.id, s.requester, s.department, s.provider,
           s.project_type AS type, s.project, s.motive, s.comment, s.status,
           s.created_at AS createdAt, COUNT(d.id) AS files
    FROM submissions s
    LEFT JOIN documents d ON d.submission_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 500
  `).all();
  const documents = await env.DB.prepare(`
    SELECT id, submission_id AS submissionId, file_name AS fileName, size
    FROM documents
    ORDER BY created_at
  `).all();
  return Response.json({ submissions: rows.results, documents: documents.results });
}

export async function POST(request: Request) {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO payment_processes (id, name, deadline, is_open)
    VALUES ('2026-07-2', 'Proceso 2 · Julio 2026', '2026-07-31T17:00:00-04:00', 1)
  `).run();
  const activeProcess = await env.DB.prepare(`
    SELECT deadline, is_open AS isOpen FROM payment_processes WHERE id = '2026-07-2'
  `).first<{ deadline: string; isOpen: number }>();
  if (!activeProcess || !activeProcess.isOpen || Date.now() >= Date.parse(activeProcess.deadline)) {
    return Response.json({
      error: "Fuera de proceso de pago. La recepción de facturas se encuentra cerrada; ingresa el documento en el próximo proceso.",
      code: "PROCESS_CLOSED",
    }, { status: 409 });
  }

  const form = await request.formData();
  const requester = text(form, "requester");
  const department = text(form, "department");
  const provider = text(form, "provider");
  const projectType = text(form, "projectType");
  const project = text(form, "project");
  const motive = text(form, "motive");
  const comment = text(form, "comment");
  const files = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (!requester || !department || !provider || !projectType || !project || !motive) {
    return Response.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }
  if (!VALID_DEPARTMENTS.has(department) || !VALID_TYPES.has(projectType)) {
    return Response.json({ error: "Departamento o tipo de proyecto inválido." }, { status: 400 });
  }
  if (!files.length || files.length > MAX_FILES || files.some((file) => file.size > MAX_FILE_SIZE)) {
    return Response.json({ error: "Adjunta entre 1 y 20 archivos, de máximo 15 MB cada uno." }, { status: 400 });
  }
  const storage = await env.DB.prepare(`
    SELECT COALESCE(SUM(size), 0) AS usedBytes FROM documents
  `).first<{ usedBytes: number }>();
  const incomingBytes = files.reduce((total, file) => total + file.size, 0);
  if (Number(storage?.usedBytes ?? 0) + incomingBytes > SAFE_STORAGE_LIMIT) {
    return Response.json({
      error: "El almacenamiento alcanzó el límite preventivo gratuito de 8 GB. Descarga y elimina procesos antiguos antes de subir nuevas facturas.",
      code: "FREE_STORAGE_LIMIT",
    }, { status: 507 });
  }

  const id = `PG-${Date.now().toString(36).toUpperCase()}`;
  const uploadedKeys: string[] = [];
  const documentRows: Array<{ id: string; file: File; key: string }> = [];

  try {
    for (const file of files) {
      const documentId = crypto.randomUUID();
      const key = `2026-07-2/${slug(department)}/${id}/${documentId}-${safeFileName(file.name)}`;
      await env.FILES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
        customMetadata: { submissionId: id, department },
      });
      uploadedKeys.push(key);
      documentRows.push({ id: documentId, file, key });
    }

    const statements = [
      env.DB.prepare(`
        INSERT INTO submissions (
          id, process_id, requester, requester_email, department, provider,
          project_type, project, motive, comment, status
        ) VALUES (?, '2026-07-2', ?, ?, ?, ?, ?, ?, ?, ?, 'Recibida')
      `).bind(
        id,
        requester,
        request.headers.get("oai-authenticated-user-email"),
        department,
        provider,
        projectType,
        project,
        motive,
        comment,
      ),
      ...documentRows.map(({ id: documentId, file, key }) =>
        env.DB.prepare(`
          INSERT INTO documents (id, submission_id, file_name, content_type, size, object_key)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(documentId, id, file.name, file.type || "application/octet-stream", file.size, key)
      ),
      catalogStatement("provider", provider, null),
      catalogStatement("project", project, projectType),
      catalogStatement("motive", motive, null),
    ];
    await env.DB.batch(statements);
    return Response.json({
      submission: {
        id,
        status: "Recibida",
        documents: documentRows.map((item) => ({
          id: item.id,
          fileName: item.file.name,
          size: item.file.size,
        })),
      },
    }, { status: 201 });
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => env.FILES.delete(key)));
    const message = error instanceof Error ? error.message : "No fue posible guardar la solicitud.";
    return Response.json({ error: message }, { status: 500 });
  }
}

function catalogStatement(kind: string, name: string, projectType: string | null) {
  return env.DB.prepare(`
    INSERT OR IGNORE INTO catalog_entries (kind, name, project_type)
    VALUES (?, ?, ?)
  `).bind(kind, name, projectType);
}

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function slug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 160) || "factura";
}
