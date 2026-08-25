import { env } from "cloudflare:workers";
import { requireAdmin } from "../../../../admin-auth";

type DocumentRow = {
  fileName: string;
  contentType: string;
  objectKey: string;
};

type ConversionResult = {
  format: "markdown" | "text" | "error";
  data?: string;
  error?: string;
};

type AiBinding = {
  toMarkdown(
    document: { name: string; blob: Blob },
    options?: { conversionOptions?: { output?: { format?: "text" } } },
  ): Promise<ConversionResult | ConversionResult[]>;
};

type Suggestion = {
  fileName: string;
  amount: number | null;
  label: string | null;
  confidence: "alta" | "media" | "sin detectar";
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

  const suggestions: Suggestion[] = [];

  for (const document of documents.results) {
    if (!isSupported(document)) {
      suggestions.push({ fileName: document.fileName, amount: null, label: null, confidence: "sin detectar" });
      continue;
    }

    try {
      const object = await env.FILES.get(document.objectKey);
      if (!object) throw new Error("Archivo no disponible");
      const converted = await ai.toMarkdown({
        name: document.fileName,
        blob: new Blob([await object.arrayBuffer()], { type: document.contentType }),
      }, { conversionOptions: { output: { format: "text" } } });
      const result = Array.isArray(converted) ? converted[0] : converted;
      const detected = result?.format === "error" ? null : detectPayableAmount(result?.data ?? "");
      suggestions.push({
        fileName: document.fileName,
        amount: detected?.amount ?? null,
        label: detected?.label ?? null,
        confidence: detected?.confidence ?? "sin detectar",
      });
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

  const grouped = new Map<string, Suggestion[]>();
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const sourceName = sourceNames[index] || page.name;
    try {
      const converted = await ai.toMarkdown({ name: page.name, blob: page }, {
        conversionOptions: { output: { format: "text" } },
      });
      const result = Array.isArray(converted) ? converted[0] : converted;
      const detected = result?.format === "error" ? null : detectPayableAmount(result?.data ?? "");
      const entries = grouped.get(sourceName) ?? [];
      entries.push({
        fileName: sourceName,
        amount: detected?.amount ?? null,
        label: detected?.label ?? null,
        confidence: detected?.confidence ?? "sin detectar",
      });
      grouped.set(sourceName, entries);
    } catch {
      const entries = grouped.get(sourceName) ?? [];
      entries.push({ fileName: sourceName, amount: null, label: null, confidence: "sin detectar" });
      grouped.set(sourceName, entries);
    }
  }

  const suggestions = [...grouped.entries()].map(([fileName, entries]) => {
    const detected = entries
      .filter((entry): entry is Suggestion & { amount: number } => entry.amount !== null)
      .sort((a, b) => confidenceScore(b.confidence) - confidenceScore(a.confidence) || b.amount - a.amount)[0];
    return detected ?? { fileName, amount: null, label: null, confidence: "sin detectar" as const };
  });
  return Response.json(suggestionResponse(suggestions));
}

function confidenceScore(confidence: Suggestion["confidence"]) {
  return confidence === "alta" ? 2 : confidence === "media" ? 1 : 0;
}

function suggestionResponse(suggestions: Suggestion[]) {
  const detected = suggestions.filter((item): item is Suggestion & { amount: number } => item.amount !== null);
  return {
    suggestions,
    total: detected.length === suggestions.length
      ? detected.reduce((sum, item) => sum + item.amount, 0)
      : null,
    detectedCount: detected.length,
    documentCount: suggestions.length,
  };
}

function isSupported(document: DocumentRow) {
  return document.contentType === "application/pdf"
    || document.contentType.startsWith("image/")
    || /\.(pdf|jpe?g|png|webp|gif|bmp)$/i.test(document.fileName);
}

function detectPayableAmount(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const rules = [
    { pattern: /l[ií]quido\s+(?:total\s+)?a\s+pagar/i, score: 120 },
    { pattern: /total\s+a\s+pagar/i, score: 115 },
    { pattern: /monto\s+total/i, score: 110 },
    { pattern: /valor\s+total/i, score: 105 },
    { pattern: /total\s+(?:factura|boleta|documento)/i, score: 100 },
    { pattern: /\btotal\b/i, score: 70 },
  ];
  const candidates: Array<{ amount: number; label: string; score: number }> = [];

  lines.forEach((line, index) => {
    if (/subtotal|neto|iva|retenci[oó]n/i.test(line) && !/l[ií]quido|total\s+a\s+pagar/i.test(line)) return;
    for (const rule of rules) {
      if (!rule.pattern.test(line)) continue;
      const nearby = [line, lines[index + 1] ?? ""].join(" ");
      for (const candidate of amountsFrom(nearby)) {
        if (candidate.amount > 0 && candidate.amount < 10_000_000_000) {
          candidates.push({
            amount: candidate.amount,
            label: line.slice(0, 120),
            score: rule.score + (candidate.hasCurrency ? 25 : 0),
          });
        }
      }
      break;
    }
  });

  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  const best = candidates[0];
  if (!best) return null;
  return { amount: best.amount, label: best.label, confidence: best.score >= 105 ? "alta" as const : "media" as const };
}

function amountsFrom(value: string) {
  const matches = value.match(/(?:CLP|\$)?\s*(?:\d{1,3}(?:[.\s]\d{3})+|\d{4,})(?:,\d{1,2})?/gi) ?? [];
  return matches.map((match) => {
    const hasCurrency = /CLP|\$/i.test(match);
    const normalized = match.replace(/CLP|\$|\s/gi, "");
    const integerPart = normalized.split(",")[0].replace(/\./g, "");
    return { amount: Number(integerPart), hasCurrency };
  }).filter((item) => Number.isSafeInteger(item.amount));
}
