import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../../admin-auth";
import {
  type AiBinding,
  type AmountSuggestion,
  bestSuggestion,
  isAmountDocument,
  readAmount,
  suggestionResponse,
} from "../../../../amount-detection";

type DocumentRow = {
  fileName: string;
  contentType: string;
  objectKey: string;
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const documents = await env.DB.prepare(`
    SELECT file_name AS fileName, content_type AS contentType, object_key AS objectKey
    FROM documents
    WHERE submission_id = ?
    ORDER BY created_at
  `).bind(id).all<DocumentRow>();

  if (!documents.results.length) {
    return Response.json({ error: "La solicitud no tiene documentos." }, { status: 404 });
  }

  const ai = (env as unknown as { AI?: AiBinding }).AI;
  if (!ai) {
    return Response.json({ error: "La lectura automática no está disponible. Ingresa el monto manualmente." }, { status: 503 });
  }

  const suggestions: AmountSuggestion[] = [];

  for (const document of documents.results) {
    if (!isAmountDocument(document.fileName, document.contentType)) {
      suggestions.push({ fileName: document.fileName, amount: null, label: null, confidence: "sin detectar" });
      continue;
    }

    try {
      const object = await env.FILES.get(document.objectKey);
      if (!object) throw new Error("Archivo no disponible");
      suggestions.push(await readAmount(ai, document.fileName, new Blob(
        [await object.arrayBuffer()],
        { type: document.contentType },
      )));
    } catch {
      suggestions.push({ fileName: document.fileName, amount: null, label: null, confidence: "sin detectar" });
    }
  }

  return Response.json(suggestionResponse(suggestions));
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const ai = (env as unknown as { AI?: AiBinding }).AI;
  if (!ai) {
    return Response.json({ error: "La lectura visual no está disponible. Ingresa el monto manualmente." }, { status: 503 });
  }

  const form = await request.formData();
  const pages = form.getAll("pages").filter((value): value is File => value instanceof File);
  const sourceNames = form.getAll("sourceNames").map(String);
  if (!pages.length || pages.length > 12 || pages.some((page) => page.size > 4 * 1024 * 1024)) {
    return Response.json({ error: "No fue posible preparar las páginas para la lectura visual." }, { status: 400 });
  }

  const grouped = new Map<string, AmountSuggestion[]>();
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const sourceName = sourceNames[index] || page.name;
    try {
      const entries = grouped.get(sourceName) ?? [];
      entries.push({ ...(await readAmount(ai, page.name, page)), fileName: sourceName });
      grouped.set(sourceName, entries);
    } catch {
      const entries = grouped.get(sourceName) ?? [];
      entries.push({ fileName: sourceName, amount: null, label: null, confidence: "sin detectar" });
      grouped.set(sourceName, entries);
    }
  }

  const suggestions = [...grouped.entries()].map(([fileName, entries]) => bestSuggestion(fileName, entries));
  return Response.json(suggestionResponse(suggestions));
}
