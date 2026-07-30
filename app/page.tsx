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
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState("Ingeniería");
  const [repositoryNotice, setRepositoryNotice] = useState(false);

  useEffect(() => {
    const storedProviders = JSON.parse(localStorage.getItem("portal-providers") ?? "[]") as string[];
    const storedMotives = JSON.parse(localStorage.getItem("portal-motives") ?? "[]") as string[];
    const storedProjects = JSON.parse(localStorage.getItem("portal-projects") ?? "{}") as Record<string, string[]>;
    setProviderOptions(Array.from(new Set([...baseProviders, ...storedProviders])));
    setMotiveOptions(Array.from(new Set([...motives, ...storedMotives])));
    setProjectOptions(Object.fromEntries(Object.entries(projectsByType).map(([type, items]) => [
      type,
      Array.from(new Set([...items, ...(storedProjects[type] ?? [])])),
    ])));
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
  const departmentPayments = payments.filter((payment) => payment.department === selectedDepartment);
  const repositoryStats = departments.map((name) => ({
    name,
    payments: payments.filter((payment) => payment.department === name),
  }));

  function updateStatus(id: string, status: Status) {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, status } : payment));
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanProvider = provider.trim();
    const cleanProject = project.trim();
    const cleanMotive = motive.trim();

    if (cleanProvider && !providerOptions.some((item) => item.toLowerCase() === cleanProvider.toLowerCase())) {
      const customProviders = JSON.parse(localStorage.getItem("portal-providers") ?? "[]") as string[];
      localStorage.setItem("portal-providers", JSON.stringify(Array.from(new Set([...customProviders, cleanProvider]))));
      setProviderOptions((current) => [...current, cleanProvider]);
    }
    if (cleanMotive && !motiveOptions.some((item) => item.toLowerCase() === cleanMotive.toLowerCase())) {
      const customMotives = JSON.parse(localStorage.getItem("portal-motives") ?? "[]") as string[];
      localStorage.setItem("portal-motives", JSON.stringify(Array.from(new Set([...customMotives, cleanMotive]))));
      setMotiveOptions((current) => [...current, cleanMotive]);
    }
    if (cleanProject && !currentProjects.some((item) => item.toLowerCase() === cleanProject.toLowerCase())) {
      const customProjects = JSON.parse(localStorage.getItem("portal-projects") ?? "{}") as Record<string, string[]>;
      customProjects[projectType] = Array.from(new Set([...(customProjects[projectType] ?? []), cleanProject]));
      localStorage.setItem("portal-projects", JSON.stringify(customProjects));
      setProjectOptions((current) => ({ ...current, [projectType]: [...(current[projectType] ?? []), cleanProject] }));
    }
    setPayments((current) => [{
      id: `PG-${String(82 + Math.max(0, current.length - seedPayments.length)).padStart(3, "0")}`,
      requester,
      department,
      provider: cleanProvider,
      project: cleanProject,
      type: projectType,
      motive: cleanMotive,
      files: Math.max(files.length, 1),
      status: "Recibida",
      date: "Ahora",
    }, ...current]);
    setSent(true);
  }

  function resetForm() {
    setProvider("");
    setProject("");
    setMotive("");
    setRequester("");
    setDepartment("");
    setFiles([]);
    setSent(false);
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
              <span className="calendar-icon">31</span>
              <div><small>Fecha de cierre</small><strong>Viernes 31 de julio · 17:00</strong></div>
            </div>
          </div>

          <div className="notice"><span>i</span><p><strong>Proceso 2 · Julio 2026</strong> Recibiremos documentos hasta la fecha de cierre indicada.</p></div>

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
              <label className="wide">Comentario <span className="optional">Opcional</span><textarea rows={3} placeholder="Agrega información útil para revisar el pago" /></label>
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

            <div className="form-actions"><p><b>*</b> Campos obligatorios</p><button type="submit" className="primary">Enviar facturas <span>→</span></button></div>
          </form>

          {sent && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-modal"><span className="success-check">✓</span><h2 id="success-title">¡Facturas recibidas!</h2><p>Tu solicitud quedó registrada con el número <strong>PG-082</strong> y estado <span className="badge received">Recibida</span>.</p><div className="modal-actions"><button className="secondary" onClick={() => setView("admin")}>Ver en el panel</button><button className="primary" onClick={resetForm}>Ingresar otra</button></div></div></div>}
        </section>
      ) : view === "admin" ? (
        <section className="page-shell admin-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Administración</span><h1>Proceso 2 · Julio 2026</h1><p>Revisa y actualiza el estado de las facturas recibidas.</p></div>
            <div className="process-control"><div><span className={`dot ${isOpen ? "" : "closed"}`} /><small>Recepción</small><strong>{isOpen ? "Abierta" : "Cerrada"}</strong></div><button className={isOpen ? "close-process" : "open-process"} onClick={() => setIsOpen(!isOpen)}>{isOpen ? "Cerrar proceso" : "Reabrir proceso"}</button></div>
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
            <div className="repository-summary"><span>▣</span><div><small>Proceso actual</small><strong>Proceso 2 · Julio 2026</strong></div></div>
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
              <button className="primary download-folder" onClick={() => { setRepositoryNotice(true); window.setTimeout(() => setRepositoryNotice(false), 4200); }}>↓ Descargar carpeta (.zip)</button>
            </div>
            {departmentPayments.length ? <div className="file-list">
              {departmentPayments.flatMap((payment) => Array.from({ length: payment.files }, (_, index) => (
                <div className="file-row" key={`${payment.id}-${index}`}>
                  <span className="pdf-icon">PDF</span>
                  <div><strong>{payment.provider} · {payment.project}</strong><small>{payment.id} · Factura {index + 1} · {payment.requester}</small></div>
                  <span className={`badge ${payment.status.toLowerCase().replace(" ", "-")}`}>{payment.status}</span>
                  <button aria-label={`Descargar factura ${index + 1} de ${payment.provider}`}>↓</button>
                </div>
              )))}
            </div> : <div className="empty-folder"><span>▱</span><h3>Carpeta vacía</h3><p>Todavía no se han recibido facturas para {selectedDepartment}.</p></div>}
          </div>

          {repositoryNotice && <div className="repository-toast"><span>✓</span><div><strong>Descarga agrupada preparada</strong><p>En la versión definitiva se generará un ZIP con los archivos reales de {selectedDepartment}.</p></div></div>}
        </section>
      )}
    </main>
  );
}
