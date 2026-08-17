import { env } from "cloudflare:workers";
import { requireAdmin } from "../../admin-auth";

const ACTIVE_PROCESS_ID = "2026-07-2";
const DEFAULT_DEADLINE = "2026-07-31T17:00:00-04:00";

type ProcessRow = {
  id: string;
  name: string;
  deadline: string;
  isOpen: number;
};

export async function GET() {
  await ensureProcess();
  const process = await synchronizeProcessName(await readProcess());
  return Response.json({ process: serialize(process) });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  await ensureProcess();
  const payload = await request.json() as { deadline?: string; isOpen?: boolean };
  const current = await synchronizeProcessName(await readProcess());
  const deadline = payload.deadline ?? current.deadline;
  const isOpen = typeof payload.isOpen === "boolean" ? payload.isOpen : Boolean(current.isOpen);

  if (!deadline || Number.isNaN(Date.parse(deadline))) {
    return Response.json({ error: "La fecha de cierre no es válida." }, { status: 400 });
  }

  const changesDate = calendarDate(deadline) !== calendarDate(current.deadline);
  const name = changesDate
    ? buildProcessName(processSequence(current.name) + 1, deadline)
    : current.name;

  await env.DB.prepare(`
    UPDATE payment_processes
    SET name = ?, deadline = ?, is_open = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, deadline, isOpen ? 1 : 0, ACTIVE_PROCESS_ID).run();

  let assignedWaiting = 0;
  const activatesPeriod = isOpen && Date.now() < Date.parse(deadline)
    && (changesDate || !Boolean(current.isOpen));
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
  `).bind(ACTIVE_PROCESS_ID).first<ProcessRow>();
  if (!process) throw new Error("Proceso de pago no disponible.");
  return process;
}

async function synchronizeProcessName(process: ProcessRow) {
  const expectedPeriod = formatMonthYear(process.deadline);
  const currentName = process.name.toLocaleLowerCase("es-CL");

  if (currentName.includes(expectedPeriod.toLocaleLowerCase("es-CL"))) {
    return process;
  }

  const name = buildProcessName(processSequence(process.name) + 1, process.deadline);
  await env.DB.prepare(`
    UPDATE payment_processes
    SET name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(name, process.id).run();

  return { ...process, name };
}

function processSequence(name: string) {
  const match = name.match(/Proceso\s+(\d+)/i);
  return match ? Number(match[1]) : 1;
}

function buildProcessName(sequence: number, deadline: string) {
  return `Proceso ${sequence} · ${formatMonthYear(deadline)}`;
}

function formatMonthYear(deadline: string) {
  const value = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(deadline));

  return value.charAt(0).toLocaleUpperCase("es-CL") + value.slice(1);
}

function calendarDate(deadline: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(deadline));
}

function serialize(process: ProcessRow) {
  const isOpen = Boolean(process.isOpen);
  return {
    ...process,
    isOpen,
    accepting: isOpen && Date.now() < Date.parse(process.deadline),
  };
}
