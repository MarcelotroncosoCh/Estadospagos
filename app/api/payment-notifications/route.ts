import { env } from "cloudflare:workers";
import { requireAdmin } from "../../admin-auth";

const RECIPIENTS = [
  "mtroncoso@malpo.cl",
  "cgonzalez@malpo.cl",
  "lpena@malpo.cl",
  "rnorambuena@malpo.cl",
  "jarenas@malpo.cl",
  "acifuentes@malpo.cl",
  "rtorres@malpo.cl",
  "mjtroncoso@malpo.cl",
];

type NotificationRow = {
  id: string;
  department: string;
  provider: string;
  project: string;
  paidAmount: number;
};

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const period = new URL(request.url).searchParams.get("period") ?? "";
  if (!period || Number.isNaN(Date.parse(period))) {
    return Response.json({ error: "Período inválido." }, { status: 400 });
  }

  const rows = await env.DB.prepare(`
    SELECT id, department, provider, project, paid_amount AS paidAmount
    FROM submissions
    WHERE payment_period = ?
      AND status = 'Pagada'
      AND paid_amount IS NOT NULL
      AND notified_at IS NULL
    ORDER BY department, provider, project
  `).bind(period).all<NotificationRow>();

  return Response.json({
    rows: rows.results.map((row) => ({ ...row, paidAmount: Number(row.paidAmount) })),
    recipients: RECIPIENTS,
    paymentDate: chileDate(),
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const payload = await request.json() as { period?: string; ids?: string[]; paymentDate?: string };
  const ids = Array.from(new Set((payload.ids ?? []).filter((id) => typeof id === "string" && id.length <= 80)));
  const paymentDate = payload.paymentDate === chileDate() ? payload.paymentDate : chileDate();
  if (!payload.period || Number.isNaN(Date.parse(payload.period)) || !ids.length || ids.length > 500) {
    return Response.json({ error: "No hay pagos válidos para registrar." }, { status: 400 });
  }

  const results = await env.DB.batch(ids.map((id) => env.DB.prepare(`
    UPDATE submissions
    SET payment_date = ?, notified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND payment_period = ? AND status = 'Pagada'
      AND paid_amount IS NOT NULL AND notified_at IS NULL
  `).bind(paymentDate, id, payload.period)));
  const updated = results.reduce((sum, result) => sum + Number(result.meta.changes ?? 0), 0);
  return Response.json({ updated, paymentDate });
}

function chileDate() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date());
}
