export type ConversionResult = {
  format: "markdown" | "text" | "error";
  data?: string;
  error?: string;
};

export type AiBinding = {
  toMarkdown(
    document: { name: string; blob: Blob },
    options?: { conversionOptions?: { output?: { format?: "text" } } },
  ): Promise<ConversionResult | ConversionResult[]>;
};

export type AmountSuggestion = {
  fileName: string;
  amount: number | null;
  label: string | null;
  confidence: "alta" | "media" | "sin detectar";
};

export async function readAmount(ai: AiBinding, name: string, blob: Blob): Promise<AmountSuggestion> {
  try {
    const converted = await ai.toMarkdown({ name, blob }, {
      conversionOptions: { output: { format: "text" } },
    });
    const result = Array.isArray(converted) ? converted[0] : converted;
    const detected = result?.format === "error" ? null : detectPayableAmount(result?.data ?? "");
    return {
      fileName: name,
      amount: detected?.amount ?? null,
      label: detected?.label ?? null,
      confidence: detected?.confidence ?? "sin detectar",
    };
  } catch {
    return { fileName: name, amount: null, label: null, confidence: "sin detectar" };
  }
}

export function bestSuggestion(fileName: string, entries: AmountSuggestion[]) {
  return entries
    .filter((entry): entry is AmountSuggestion & { amount: number } => entry.amount !== null)
    .sort((a, b) => confidenceScore(b.confidence) - confidenceScore(a.confidence) || b.amount - a.amount)[0]
    ?? { fileName, amount: null, label: null, confidence: "sin detectar" as const };
}

export function suggestionResponse(suggestions: AmountSuggestion[]) {
  const detected = suggestions.filter((item): item is AmountSuggestion & { amount: number } => item.amount !== null);
  return {
    suggestions,
    total: detected.length === suggestions.length
      ? detected.reduce((sum, item) => sum + item.amount, 0)
      : null,
    detectedCount: detected.length,
    documentCount: suggestions.length,
  };
}

export function isAmountDocument(fileName: string, contentType: string) {
  return contentType === "application/pdf"
    || contentType.startsWith("image/")
    || /\.(pdf|jpe?g|png|webp|gif|bmp)$/i.test(fileName);
}

function confidenceScore(confidence: AmountSuggestion["confidence"]) {
  return confidence === "alta" ? 2 : confidence === "media" ? 1 : 0;
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
    { pattern: /total\s+(?:factura|boleta|documento|honorarios)/i, score: 100 },
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
