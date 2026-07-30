"use client";

import { useEffect, useMemo, useState } from "react";

const departments = [
  "Arquitectura",
  "Gerencia de Proyectos",
  "Ingeniería",
  "Oficina Técnica",
  "Presupuesto",
  "Topografía",
];

const baseProviders = [
  "Alfonso Larraín y Asociados", "Apica", "Arquitectura AHA",
  "Arquitectura y Eficiencia Energética CEVCHILE", "Axisterra",
  "Carlos Gonzalez", "Christian Agurto", "Christian Kramm", "CODAM",
  "Constructora JR", "Consultora Urbanit", "DSS", "Ernesto Rahal",
  "Francisco Adasme y CIA", "Francisco Leiva", "GANELEC", "GBELEC",
  "HG Ingeniería", "INGACON", "Ingeniería de Diseños", "Labotal",
  "Megalec", "MLSM", "MOG Servicios de Ingeniería",
  "R&V Ingeniería de Suelos", "Recircula Gestión", "Riverine",
  "Rolando Fritz", "Servicios Generales Arco",
  "Servicios Generales Maxcri", "Sigma Ingenieros", "Victor Hugo Concha",
];

const motives = [
  "Alumbrado", "Asesoría", "Calificación Energética", "DIA",
  "Dibujo Técnico", "Electricidad", "Estructura", "EVA", "G. Proyectos",
  "Gas", "IMIV", "Mecánica de Suelos", "Revisor", "Semáforo",
  "Topografía", "Urbanización",
];

const projectsByType: Record<string, string[]> = {
  DS19: [
    "Altos San Clemente", "Brisas San Javier II", "Doña Agustina III",
    "Doña Agustina IV B", "Doña Agustina IV C", "Doña Ignacia IX",
    "Doña Ignacia X", "Parque Rosario", "Puertas del Sur IV", "Renku I",
    "Renku II", "Valles del Alba II",
  ],
  DS49: [
    "Constitución", "Jardines de Parral", "La Viña I", "Las Camelias",
    "Longaví Norte", "Los Conquistadores II", "Los Jazmines", "Los Lirios",
    "Mercedes de Tutuven", "Parque San Martín", "Parral", "Pelarco",
    "Portal del Valle", "Reserva Lircay I", "Reserva Lircay II",
    "Reserva Lircay III", "Reserva Lircay IV", "Retiro", "San Lorenzo",
    "San Rafael", "Senderos de Nancagua", "Villa la Florida III y IV",
    "Villa la Florida V", "Villa María",
  ],
  INMB: [
    "Alto Manque I", "Alto Manque II", "Altos del Maitén 9",
    "Altos del Maitén 10", "Altos del Maitén 11", "Altos del Maitén 12",
    "Camino al Agua", "Jardines de Van Gogh II",
    "Jardines de Van Gogh II y III", "Jardines de Van Gogh III",
    "Neyen III", "Parque Los Coihues", "Puerta Norte III", "San Pedro V",
  ],
  "G. Proyectos": ["Edificio Malpo", "Gerencia de Proyectos", "Sin Asignar"],
};

type Status = "Recibida" | "En proceso" | "Pendiente" | "Pagada";
type ProcessInfo = { id: string; name: string; deadline: string; isOpen: boolean; accepting: boolean };
type Payment = {
  id: string;
  requester: string;
  department: string;
  provider: string;
  project: string;
  type: string;
  motive: string;
  files: number;
  status: Status;
  date: string;
  documents?: Array<{ id: string; fileName: string; size: number }>;
};

const seedPayments: Payment[] = [
  { id: "PG-081", requester: "Camila Soto", department: "Ingeniería", provider: "Consultora Urbanit", project: "Doña Ignacia X", type: "DS19", motive: "IMIV", files: 2, status: "Recibida", date: "30 jul, 09:42" },
  { id: "PG-080", requester: "Diego Pérez", department: "Arquitectura", provider: "Francisco Leiva", project: "Altos del Maitén 12", type: "INMB", motive: "Revisor", files: 1, status: "En proceso", date: "29 jul, 16:18" },
  { id: "PG-079", requester: "Sofía Muñoz", department: "Oficina Técnica", provider: "GBELEC", project: "Alto Manque II", type: "INMB", motive: "Electricidad", files: 3, status: "Pendiente", date: "29 jul, 12:06" },
  { id: "PG-078", requester: "Matías Rojas", department: "Gerencia de Proyectos", provider: "CEVCHILE", project: "Renku II", type: "DS19", motive: "Calificación Energética", files: 1, status: "Pagada", date: "28 jul, 10:35" },
  { id: "PG-077", requester: "Josefa Díaz", department: "Topografía", provider: "Francisco Adasme y CIA", project: "Parque Los Coihues", type: "INMB", motive: "Topografía", files: 2, status: "En proceso", date: "28 jul, 09:11" },
];

function FieldHint({ value, options, noun }: { value: string; options: string[]; noun: string }) {
  if (!value || options.some((option) => option.toLowerCase() === value.trim().toLowerCase())) return null;
  return <span className="new-hint"><span>+</span> Se agregará “{value}” como {noun} nuevo</span>;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const part = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

export default function Home() {
  const [view, setView] = useState<"form" | "admin" | "repository">("form");
  const [requester, setRequester] = useState("");
  const [department, setDepartment] = useState("");
  const [projectType, setProjectType] = useState("DS19");
  const [providerOptions, setProviderOptions] = useState(baseProviders);
  const [motiveOptions, setMotiveOptions] = useState(motives);
  const [projectOptions, setProjectOptions] = useState(projectsByType);
  const [provider, setProvider] = useState("");
  const [project, setProject] = useState("");
  const [motive, setMotive] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sent, setSent] = useState(false);
  const [payments, setPayments] = useState(seedPayments);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    id: "2026-07-2",
    name: "Proceso 2 · Julio 2026",
    deadline: "2026-07-31T17:00:00-04:00",
    isOpen: true,
    accepting: true,
  });
  const [deadlineDraft, setDeadlineDraft] = useState("2026-07-31T17:00");
  const [savingProcess, setSavingProcess] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("Ingeniería");
  const [repositoryNotice, setRepositoryNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sentId, setSentId] = useState("");
  const [dataMode, setDataMode] = useState<"loading" | "live" | "demo">("loading");

  useEffect(() => {
    async function hydrate() {
      try {
        const [catalogResponse, submissionResponse, processResponse] = await Promise.all([
          fetch("/api/catalogs", { cache: "no-store" }),
          fetch("/api/submissions", { cache: "no-store" }),
          fetch("/api/process", { cache: "no-store" }),
        ]);
        if (!catalogResponse.ok || !submissionResponse.ok || !processResponse.ok) throw new Error("Datos no disponibles");
        const catalogData = await catalogResponse.json() as { entries: Array<{ kind: string; name: string; projectType: string | null }> };
        const submissionData = await submissionResponse.json() as {
          submissions: Array<Payment & { createdAt: string }>;
          documents: Array<{ id: string; submissionId: string; fileName: string; size: number }>;
        };
        const processData = await processResponse.json() as { process: ProcessInfo };
        setProcessInfo(processData.process);
        setDeadlineDraft(toDateTimeLocal(processData.process.deadline));
        const providerEntries = catalogData.entries.filter((entry) => entry.kind === "provider").map((entry) => entry.name);
        const motiveEntries = catalogData.entries.filter((entry) => entry.kind === "motive").map((entry) => entry.name);
        setProviderOptions(Array.from(new Set([...baseProviders, ...providerEntries])));
        setMotiveOptions(Array.from(new Set([...motives, ...motiveEntries])));
        setProjectOptions(Object.fromEntries(Object.entries(projectsByType).map(([type, items]) => [
          type,
          Array.from(new Set([
            ...items,
            ...catalogData.entries.filter((entry) => entry.kind === "project" && entry.projectType === type).map((entry) => entry.name),
          ])),
        ])));
        const livePayments = submissionData.submissions.map((item) => ({
          ...item,
          files: Number(item.files),
          date: new Date(item.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          documents: submissionData.documents.filter((document) => document.submissionId === item.id),
        }));
        setPayments(livePayments);
        setDataMode("live");
      } catch {
        setDataMode("demo");
      }
    }
    void hydrate();
  }, []);

  const currentProjects = projectOptions[projectType] ?? [];
  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const matchesStatus = statusFilter === "Todos" || payment.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch = !term || [payment.requester, payment.provider, payment.project, payment.id]
      .some((value) => value.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  }), [payments, search, statusFilter]);

  const counts = (status: Status) => payments.filter((payment) => payment.status === status).length;
  const deadlineExpired = Date.now() >= Date.parse(processInfo.deadline);
  const acceptingProcess = processInfo.isOpen && !deadlineExpired;
  const departmentPayments = payments.filter((payment) => payment.department === selectedDepartment);
  const repositoryStats = departments.map((name) => ({
    name,
    payments: payments.filter((payment) => payment.department === name),
  }));

  async function updateStatus(id: string, status: Status) {
    if (dataMode === "live") {
      const response = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) return;
    }
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, status } : payment));
  }

  async function updateProcess(changes: { isOpen?: boolean; deadline?: string }) {
    setSavingProcess(true);
    try {
      const response = await fetch("/api/process", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json() as { process?: ProcessInfo; error?: string };
      if (!response.ok || !result.process) throw new Error(result.error ?? "No fue posible actualizar el proceso.");
      setProcessInfo(result.process);
      setDeadlineDraft(toDateTimeLocal(result.process.deadline));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible actualizar el proceso.");
    } finally {
      setSavingProcess(false);
    }
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const cleanProvider = provider.trim();
    const cleanProject = project.trim();
    const cleanMotive = motive.trim();
    try {
      if (!files.length) throw new Error("Debes adjuntar al menos una factura.");
      const formData = new FormData();
      formData.set("requester", requester);
      formData.set("department", department);
      formData.set("provider", cleanProvider);
      formData.set("projectType", projectType);
      formData.set("project", cleanProject);
      formData.set("motive", cleanMotive);
      const commentField = (event.currentTarget.elements.namedItem("comment") as HTMLTextAreaElement | null)?.value ?? "";
      formData.set("comment", commentField);
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/submissions", { method: "POST", body: formData });
      const result = await response.json() as {
        submission?: { id: string; status: Status; documents: Array<{ id: string; fileName: string; size: number }> };
        error?: string;
      };
      if (!response.ok || !result.submission) throw new Error(result.error ?? "No fue posible guardar la solicitud.");
      const created: Payment = {
        id: result.submission.id,
        requester,
        department,
        provider: cleanProvider,
        project: cleanProject,
        type: projectType,
        motive: cleanMotive,
        files: files.length,
        status: result.submission.status,
        date: "Ahora",
        documents: result.submission.documents,
      };
      setPayments((current) => [created, ...current]);
      setProviderOptions((current) => Array.from(new Set([...current, cleanProvider])));
      setMotiveOptions((current) => Array.from(new Set([...current, cleanMotive])));
      setProjectOptions((current) => ({ ...current, [projectType]: Array.from(new Set([...(current[projectType] ?? []), cleanProject])) }));
      setSentId(result.submission.id);
      setDataMode("live");
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible guardar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setProvider("");
    setProject("");
    setMotive("");
    setRequester("");
    setDepartment("");
    setFiles([]);
    setSent(false);
    setSentId("");
    setSubmitError("");
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("form")} aria-label="Ir al inicio">
          <span className="brand-mark">P</span>
          <span>Portal de pagos<small>Gestión de facturas</small></span>
        </button>
        <nav aria-label="Navegación principal">
          <button className={view === "form" ? "active" : ""} onClick={() => setView("form")}>Subir factura</button>
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>Panel administrativo</button>
          <button className={view === "repository" ? "active" : ""} onClick={() => setView("repository")}>Repositorio</button>
        </nav>
        <div className="avatar" title="Administrador">MT</div>
      </header>

      {view === "form" ? (
        <section className="page-shell form-page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">Proceso abierto</span>
              <h1>Ingreso de facturas</h1>
              <p>Completa los datos y adjunta los documentos correspondientes al proceso actual.</p>
            </div>
            <div className="deadline">
              <span className="calendar-icon">{new Date(processInfo.deadline).getDate()}</span>
              <div><small>Fecha de cierre</small><strong>{new Date(processInfo.deadline).toLocaleString("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</strong></div>
            </div>
          </div>

          {acceptingProcess
            ? <div className="notice"><span>i</span><p><strong>{processInfo.name}</strong> Recibiremos documentos hasta la fecha de cierre indicada.</p></div>
            : <div className="notice process-closed-notice"><span>!</span><p><strong>Fuera de proceso de pago</strong> La recepción está cerrada. Esta factura deberá ingresarse en el próximo proceso.</p></div>}

          <form className="form-card" onSubmit={submitForm}>
            <div className="section-title"><span>01</span><div><h2>Datos generales</h2><p>Información para identificar y clasificar la solicitud.</p></div></div>
            <div className="form-grid">
              <label>Quién solicita <b>*</b><input required value={requester} onChange={(event) => setRequester(event.target.value)} placeholder="Nombre y apellido" /></label>
              <label>Departamento <b>*</b>
                <select required value={department} onChange={(event) => setDepartment(event.target.value)}><option value="" disabled>Seleccionar departamento</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label className="wide">Proveedor <b>*</b><input required list="providers" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Buscar o escribir proveedor nuevo" /><datalist id="providers">{providerOptions.map((item) => <option key={item} value={item} />)}</datalist><FieldHint value={provider} options={providerOptions} noun="proveedor" /></label>
            </div>

            <div className="divider" />
            <div className="section-title"><span>02</span><div><h2>Clasificación del proyecto</h2><p>Selecciona el tipo para ver los proyectos relacionados.</p></div></div>
            <fieldset className="type-field"><legend>Tipo de proyecto <b>*</b></legend><div className="type-options">
              {Object.keys(projectsByType).map((type) => <label key={type} className={projectType === type ? "selected" : ""}><input type="radio" name="type" value={type} checked={projectType === type} onChange={() => { setProjectType(type); setProject(""); }} /><span>{type}</span></label>)}
            </div></fieldset>
            <div className="form-grid">
              <label className="wide">Proyecto <b>*</b><input required list="projects" value={project} onChange={(event) => setProject(event.target.value)} placeholder={`Buscar proyecto de ${projectType} o escribir uno nuevo`} /><datalist id="projects">{currentProjects.map((item) => <option key={item} value={item} />)}</datalist><FieldHint value={project} options={currentProjects} noun="proyecto" /></label>
              <label className="wide">Motivo <b>*</b><input required list="motives" value={motive} onChange={(event) => setMotive(event.target.value)} placeholder="Buscar o escribir motivo nuevo" /><datalist id="motives">{motiveOptions.map((item) => <option key={item} value={item} />)}</datalist><FieldHint value={motive} options={motiveOptions} noun="motivo" /></label>
              <label className="wide">Comentario <span className="optional">Opcional</span><textarea name="comment" rows={3} placeholder="Agrega información útil para revisar el pago" /></label>
            </div>

            <div className="divider" />
            <div className="section-title"><span>03</span><div><h2>Documentos</h2><p>Puedes adjuntar una o varias facturas.</p></div></div>
            <label className={`dropzone ${files.length ? "has-files" : ""}`}>
              <input type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
              <span className="upload-icon">↑</span>
              <strong>{files.length ? `${files.length} archivo${files.length > 1 ? "s" : ""} seleccionado${files.length > 1 ? "s" : ""}` : "Arrastra tus facturas aquí"}</strong>
              <p>{files.length ? files.map((file) => file.name).join(" · ") : "o haz clic para seleccionar archivos"}</p>
              <small>PDF, Excel, Word o imagen · Máximo 15 MB por archivo</small>
            </label>

            {submitError && <div className="form-error"><span>!</span>{submitError}</div>}
            <div className="form-actions"><p><b>*</b> Campos obligatorios</p><button type="submit" className="primary" disabled={submitting || !acceptingProcess}>{!acceptingProcess ? "Proceso cerrado" : submitting ? "Guardando..." : "Enviar facturas"} <span>→</span></button></div>
          </form>

          {sent && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-modal"><span className="success-check">✓</span><h2 id="success-title">¡Facturas recibidas!</h2><p>Tu solicitud quedó registrada con el número <strong>{sentId}</strong> y estado <span className="badge received">Recibida</span>.</p><div className="modal-actions"><button className="secondary" onClick={() => setView("admin")}>Ver en el panel</button><button className="primary" onClick={resetForm}>Ingresar otra</button></div></div></div>}
        </section>
      ) : view === "admin" ? (
        <section className="page-shell admin-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Administración</span><h1>{processInfo.name}</h1><p>Revisa y actualiza el estado de las facturas recibidas.</p></div>
            <div className="process-control"><div><span className={`dot ${acceptingProcess ? "" : "closed"}`} /><small>Recepción</small><strong>{acceptingProcess ? "Abierta" : "Cerrada"}</strong></div><button disabled={savingProcess || (deadlineExpired && processInfo.isOpen)} className={acceptingProcess ? "close-process" : "open-process"} onClick={() => void updateProcess({ isOpen: !acceptingProcess })}>{acceptingProcess ? "Cerrar proceso" : deadlineExpired && processInfo.isOpen ? "Cambia la fecha" : "Reabrir proceso"}</button></div>
          </div>

          <div className="deadline-editor">
            <div><span className="calendar-icon">{new Date(processInfo.deadline).getDate()}</span><div><strong>Fecha y hora de cierre</strong><small>Después de esta fecha el formulario dejará de aceptar facturas.</small></div></div>
            <label>Fecha de cierre<input type="datetime-local" value={deadlineDraft} onChange={(event) => setDeadlineDraft(event.target.value)} /></label>
            <button disabled={savingProcess || !deadlineDraft} onClick={() => void updateProcess({ deadline: new Date(deadlineDraft).toISOString() })}>{savingProcess ? "Guardando..." : "Guardar fecha"}</button>
          </div>

          <div className="stats-grid">
            <button onClick={() => setStatusFilter("Todos")} className={statusFilter === "Todos" ? "selected" : ""}><span className="stat-icon all">▦</span><div><strong>{payments.length}</strong><small>Total recibidas</small></div></button>
            <button onClick={() => setStatusFilter("Recibida")} className={statusFilter === "Recibida" ? "selected" : ""}><span className="stat-icon received">↓</span><div><strong>{counts("Recibida")}</strong><small>Recibidas</small></div></button>
            <button onClick={() => setStatusFilter("En proceso")} className={statusFilter === "En proceso" ? "selected" : ""}><span className="stat-icon process">◷</span><div><strong>{counts("En proceso")}</strong><small>En proceso</small></div></button>
            <button onClick={() => setStatusFilter("Pendiente")} className={statusFilter === "Pendiente" ? "selected" : ""}><span className="stat-icon pending">!</span><div><strong>{counts("Pendiente")}</strong><small>Pendientes</small></div></button>
            <button onClick={() => setStatusFilter("Pagada")} className={statusFilter === "Pagada" ? "selected" : ""}><span className="stat-icon paid">✓</span><div><strong>{counts("Pagada")}</strong><small>Pagadas</small></div></button>
          </div>

          <div className="table-card">
            <div className="table-toolbar">
              <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proveedor, proyecto o solicitante" /></div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>Recibida</option><option>En proceso</option><option>Pendiente</option><option>Pagada</option></select>
              <button className="export-button">⇩ Exportar Excel</button>
            </div>
            <div className="table-wrap"><table><thead><tr><th>Solicitud</th><th>Proveedor</th><th>Proyecto</th><th>Departamento</th><th>Documentos</th><th>Estado</th><th /></tr></thead><tbody>
              {filteredPayments.map((payment) => <tr key={payment.id}>
                <td><strong>{payment.id}</strong><small>{payment.requester} · {payment.date}</small></td>
                <td><strong>{payment.provider}</strong><small>{payment.motive}</small></td>
                <td><strong>{payment.project}</strong><small>{payment.type}</small></td>
                <td>{payment.department}</td>
                <td><button className="files-button">▤ {payment.files} archivo{payment.files > 1 ? "s" : ""}</button></td>
                <td><select className={`status-select ${payment.status.toLowerCase().replace(" ", "-")}`} value={payment.status} onChange={(event) => updateStatus(payment.id, event.target.value as Status)}><option>Recibida</option><option>En proceso</option><option>Pendiente</option><option>Pagada</option></select></td>
                <td><button className="more" aria-label={`Más opciones para ${payment.id}`}>•••</button></td>
              </tr>)}
              {!filteredPayments.length && <tr><td colSpan={7} className="empty-state">No encontramos solicitudes con esos filtros.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Mostrando {filteredPayments.length} de {payments.length} solicitudes</span><div><button disabled>‹</button><button className="current">1</button><button disabled>›</button></div></div>
          </div>
        </section>
      ) : (
        <section className="page-shell repository-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Documentos organizados</span><h1>Repositorio de facturas</h1><p>Descarga juntas todas las facturas de un departamento para cargarlas en tu sistema.</p></div>
            <div className="repository-summary"><span>▣</span><div><small>Proceso actual</small><strong>{processInfo.name}</strong></div></div>
          </div>

          <div className="repository-explainer"><span>i</span><p>Cada factura se almacena automáticamente en la carpeta de su departamento. Al cerrar el proceso podrás descargar cada carpeta en formato ZIP.</p></div>

          <div className="folder-grid">
            {repositoryStats.map(({ name, payments: departmentItems }) => {
              const fileCount = departmentItems.reduce((total, item) => total + item.files, 0);
              return <button key={name} className={`folder-card ${selectedDepartment === name ? "selected" : ""}`} onClick={() => setSelectedDepartment(name)}>
                <span className="folder-shape"><i /></span>
                <div><strong>{name}</strong><small>{departmentItems.length} solicitudes · {fileCount} archivos</small></div>
                <span className="folder-arrow">→</span>
              </button>;
            })}
          </div>

          <div className="repository-card">
            <div className="repository-toolbar">
              <div><span className="mini-folder">▰</span><div><h2>{selectedDepartment}</h2><p>{departmentPayments.length} solicitudes en este proceso</p></div></div>
              <button className="primary download-folder" onClick={() => {
                if (dataMode === "live") {
                  window.location.href = `/api/departments/${encodeURIComponent(selectedDepartment)}/download`;
                } else {
                  setRepositoryNotice(true);
                  window.setTimeout(() => setRepositoryNotice(false), 4200);
                }
              }}>↓ Descargar carpeta (.zip)</button>
            </div>
            {departmentPayments.length ? <div className="file-list">
              {departmentPayments.flatMap((payment) => {
                const documentItems = payment.documents?.length
                  ? payment.documents
                  : Array.from({ length: payment.files }, (_, index) => ({ id: "", fileName: `Factura ${index + 1}`, size: 0 }));
                return documentItems.map((document, index) => (
                  <div className="file-row" key={`${payment.id}-${document.id || index}`}>
                    <span className="pdf-icon">{document.fileName.split(".").pop()?.slice(0, 4).toUpperCase() || "DOC"}</span>
                    <div><strong>{document.fileName}</strong><small>{payment.id} · {payment.provider} · {payment.project}</small></div>
                    <span className={`badge ${payment.status.toLowerCase().replace(" ", "-")}`}>{payment.status}</span>
                    {document.id
                      ? <a href={`/api/files/${encodeURIComponent(document.id)}`} aria-label={`Descargar ${document.fileName}`}>↓</a>
                      : <button aria-label={`Descargar factura ${index + 1} de ${payment.provider}`}>↓</button>}
                  </div>
                ));
              })}
            </div> : <div className="empty-folder"><span>▱</span><h3>Carpeta vacía</h3><p>Todavía no se han recibido facturas para {selectedDepartment}.</p></div>}
          </div>

          {repositoryNotice && <div className="repository-toast"><span>i</span><div><strong>Vista de demostración</strong><p>La descarga real estará disponible cuando el almacenamiento compartido termine de activarse.</p></div></div>}
        </section>
      )}
    </main>
  );
}
