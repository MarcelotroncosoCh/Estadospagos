import { env } from "cloudflare:workers";

type DocumentRow = {
  id: string;
  fileName: string;
  objectKey: string;
  provider: string;
  submissionId: string;
};

export async function GET(_request: Request, context: { params: Promise<{ department: string }> }) {
  const { department: encodedDepartment } = await context.params;
  const department = decodeURIComponent(encodedDepartment);
  const rows = await env.DB.prepare(`
    SELECT d.id, d.file_name AS fileName, d.object_key AS objectKey,
           s.provider, s.id AS submissionId
    FROM documents d
    INNER JOIN submissions s ON s.id = d.submission_id
    WHERE s.department = ? AND s.process_id = '2026-07-2'
    ORDER BY s.created_at, d.created_at
  `).bind(department).all<DocumentRow>();

  if (!rows.results.length) {
    return Response.json({ error: "La carpeta no tiene archivos." }, { status: 404 });
  }

  const entries: Array<{ name: string; bytes: Uint8Array }> = [];
  let totalSize = 0;
  for (const row of rows.results) {
    const object = await env.FILES.get(row.objectKey);
    if (!object) continue;
    const bytes = new Uint8Array(await object.arrayBuffer());
    totalSize += bytes.byteLength;
    if (totalSize > 150 * 1024 * 1024) {
      return Response.json({ error: "La carpeta supera el máximo de 150 MB para una descarga." }, { status: 413 });
    }
    entries.push({
      name: `${safeSegment(row.provider)}/${row.submissionId}-${safeFileName(row.fileName)}`,
      bytes,
    });
  }

  const zip = buildStoredZip(entries);
  const fileName = `${safeSegment(department)}-proceso-2-julio-2026.zip`;
  return new Response(zip, {
    headers: {
      "content-type": "application/zip",
      "content-length": String(zip.byteLength),
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}

function buildStoredZip(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length + entry.bytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.bytes.length, true);
    localView.setUint32(22, entry.bytes.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(entry.bytes, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function safeSegment(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._ -]/g, "_").trim() || "carpeta";
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 160) || "factura";
}
