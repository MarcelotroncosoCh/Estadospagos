import { env } from "cloudflare:workers";
import { requireAdmin } from "../../admin-auth";

const ACTIVE_PROCESS_ID = "2026-07-2";
const DEFAULT_DEADLINE = "2026-07-31T17:00:00-04:00";

export async function GET() {
  await ensureProcess();
  const process = await readProcess();
  return Response.json({ process: serialize(process) });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  await ensureProcess();
  const payload = await request.json() as { deadline?: string; isOpen?: boolean };
  const current = await readProcess();
  const deadline = payload.deadline ?? current.deadline;
  const isOpen = typeof payload.isOpen === "boolean" ? payload.isOpen : Boolean(current.isOpen);

  if (!deadline || Number.isNaN(Date.parse(deadline))) {
    return Response.json({ error: "La fecha de cierre no es válida." }, { status: 400 });
  }

  await env.DB.prepare(`
    UPDATE payment_processes
    SET deadline = ?, is_open = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(deadline, isOpen ? 1 : 0, ACTIVE_PROCESS_ID).run();

  let assignedWaiting = 0;
  const activatesPeriod = isOpen && Date.now() < Date.parse(deadline)
    && (deadline !== current.deadline || !Boolean(current.isOpen));
  if (activatesPeriod) {
    const assignment = await env.DB.prepare(`
      UPDATE submissions
      SET payment_period = ?, waiting_for_period = 0, updated_at = CURRENT_TIMESTAMP
      WHERE waiting_for_period = 1
    `).bind(deadline).run();
    assignedWaiting = Number(assignment.meta.changes ?? 0);
  }

  const updated = await readProcess();
  return Response.json({ process: serialize(updated), assignedWaiting });
}

async function ensureProcess() {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO payment_processes (id, name, deadline, is_open)
    VALUES (?, 'Proceso 2 · Julio 2026', ?, 1)
  `).bind(ACTIVE_PROCESS_ID, DEFAULT_DEADLINE).run();
}

async function readProcess() {
  const process = await env.DB.prepare(`
    SELECT id, name, deadline, is_open AS isOpen
    FROM payment_processes WHERE id = ?
  `).bind(ACTIVE_PROCESS_ID).first<{ id: string; name: string; deadline: string; isOpen: number }>();
  if (!process) throw new Error("Proceso de pago no disponible.");
  return process;
}

function serialize(process: { id: string; name: string; deadline: string; isOpen: number }) {
  const isOpen = Boolean(process.isOpen);
  return {
    ...process,
    isOpen,
    accepting: isOpen && Date.now() < Date.parse(process.deadline),
  };
}
