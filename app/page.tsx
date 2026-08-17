"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const departments = [
  "Arquitectura",
  "Gerencia de Proyectos",
  "Ingeniería",
  "Oficina Técnica",
  "Presupuesto",
  "Topografía",
];

const requesters = [
  "Ronald Torres",
  "Jorge Arenas",
  "Albert Cifuentes",
  "Cintya Gonzalez",
  "Maria Jose Troncoso",
  "Marcelo Troncoso",
  "Diego Diaz",
  "Jesus Sierra",
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
  periodDeadline: string;
  waitingForPeriod: boolean;
  documents?: Array<{ id: string; fileName: string; size: number }>;
};
type CatalogEntry = {
  id: number;
  kind: "provider" | "project";
  name: string;
  projectType: string | null;
  createdAt?: string;
};

const seedPayments: Payment[] = [
  { id: "PG-081", requester: "Camila Soto", department: "Ingeniería", provider: "Consultora Urbanit", project: "Doña Ignacia X", type: "DS19", motive: "IMIV", files: 2, status: "Recibida", date: "30 jul, 09:42", periodDeadline: "2026-07-31T17:00:00-04:00", waitingForPeriod: false },
  { id: "PG-080", requester: "Diego Pérez", department: "Arquitectura", provider: "Francisco Leiva", project: "Altos del Maitén 12", type: "INMB", motive: "Revisor", files: 1, status: "En proceso", date: "29 jul, 16:18", periodDeadline: "2026-07-31T17:00:00-04:00", waitingForPeriod: false },
  { id: "PG-079", requester: "Sofía Muñoz", department: "Oficina Técnica", provider: "GBELEC", project: "Alto Manque II", type: "INMB", motive: "Electricidad", files: 3, status: "Pendiente", date: "29 jul, 12:06", periodDeadline: "2026-07-31T17:00:00-04:00", waitingForPeriod: false },
  { id: "PG-078", requester: "Matías Rojas", department: "Gerencia de Proyectos", provider: "CEVCHILE", project: "Renku II", type: "DS19", motive: "Calificación Energética", files: 1, status: "Pagada", date: "28 jul, 10:35", periodDeadline: "2026-07-31T17:00:00-04:00", waitingForPeriod: false },
  { id: "PG-077", requester: "Josefa Díaz", department: "Topografía", provider: "Francisco Adasme y CIA", project: "Parque Los Coihues", type: "INMB", motive: "Topografía", files: 2, status: "En proceso", date: "28 jul, 09:11", periodDeadline: "2026-07-31T17:00:00-04:00", waitingForPeriod: false },
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

function formatPeriodDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [view, setView] = useState<"form" | "status" | "admin" | "repository">("form");
  const [requester, setRequester] = useState("");
  const [department, setDepartment] = useState("");
  const [projectType, setProjectType] = useState("DS19");
  const [providerOptions, setProviderOptions] = useState(baseProviders);
  const [motiveOptions, setMotiveOptions] = useState(motives);
  const [projectOptions, setProjectOptions] = useState(projectsByType);
  const [provider, setProvider] = useState("");
  const [project, setProject] = useState("");
  const [motive, setMotive] = useState("");
  const [providerCustom, setProviderCustom] = useState(false);
  const [projectCustom, setProjectCustom] = useState(false);
  const [motiveCustom, setMotiveCustom] = useState(false);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sent, setSent] = useState(false);
  const [payments, setPayments] = useState(seedPayments);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [publicDepartmentFilter, setPublicDepartmentFilter] = useState("Todos");
  const [publicProviderFilter, setPublicProviderFilter] = useState("Todos");
  const [publicSelectedPeriod, setPublicSelectedPeriod] = useState("");
  const [documentPayment, setDocumentPayment] = useState<Payment | null>(null);
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
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [adminSelectedPeriod, setAdminSelectedPeriod] = useState("");
  const [repositoryNotice, setRepositoryNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sentId, setSentId] = useState("");
  const [sentWaiting, setSentWaiting] = useState(false);
  const [dataMode, setDataMode] = useState<"loading" | "live" | "demo">("loading");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [privateDestination, setPrivateDestination] = useState<"admin" | "repository">("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [catalogManagerOpen, setCatalogManagerOpen] = useState(false);
  const [adminCatalogs, setAdminCatalogs] = useState<CatalogEntry[]>([]);
  const [catalogKind, setCatalogKind] = useState<"provider" | "project">("provider");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingCatalog, setEditingCatalog] = useState<CatalogEntry | null>(null);
  const [catalogDraft, setCatalogDraft] = useState("");
  const [catalogTypeDraft, setCatalogTypeDraft] = useState("DS19");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    async function hydrate() {
      try {
        const [catalogResponse, submissionResponse, processResponse, authResponse] = await Promise.all([
          fetch("/api/catalogs", { cache: "no-store" }),
          fetch("/api/status", { cache: "no-store" }),
          fetch("/api/process", { cache: "no-store" }),
          fetch("/api/admin-auth", { cache: "no-store" }),
        ]);
        if (!catalogResponse.ok || !submissionResponse.ok || !processResponse.ok) throw new Error("Datos no disponibles");
        const catalogData = await catalogResponse.json() as { entries: Array<{ kind: string; name: string; projectType: string | null }> };
        const submissionData = await submissionResponse.json() as {
          submissions: Array<Payment & { createdAt: string }>;
          documents: Array<{ id: string; submissionId: string; fileName: string; size: number }>;
        };
        const processData = await processResponse.json() as { process: ProcessInfo };
        if (authResponse.ok) {
          const authData = await authResponse.json() as { authenticated: boolean };
          setIsAdmin(authData.authenticated);
        }
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
          waitingForPeriod: Boolean(Number(item.waitingForPeriod)),
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

  useEffect(() => {
    const preventBrowserFileOpen = (event: DragEvent) => {
      if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", preventBrowserFileOpen);
    window.addEventListener("drop", preventBrowserFileOpen);
    return () => {
      window.removeEventListener("dragover", preventBrowserFileOpen);
      window.removeEventListener("drop", preventBrowserFileOpen);
    };
  }, []);

  async function loadAdminData() {
    const [response, catalogResponse] = await Promise.all([
      fetch("/api/submissions", { cache: "no-store" }),
      fetch("/api/catalogs/admin", { cache: "no-store" }),
    ]);
    if (!response.ok || !catalogResponse.ok) throw new Error("No fue posible cargar los datos administrativos.");
    const data = await response.json() as {
      submissions: Array<Payment & { createdAt: string }>;
      documents: Array<{ id: string; submissionId: string; fileName: string; size: number }>;
    };
    const catalogData = await catalogResponse.json() as { entries: CatalogEntry[] };
    setAdminCatalogs(catalogData.entries);
    setPayments(data.submissions.map((item) => ({
      ...item,
      files: Number(item.files),
      waitingForPeriod: Boolean(Number(item.waitingForPeriod)),
      date: new Date(item.createdAt).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      documents: data.documents.filter((document) => document.submissionId === item.id),
    })));
  }

  async function saveCatalogEntry() {
    if (!editingCatalog) return;
    setCatalogBusy(true);
    setCatalogError("");
    try {
      const response = await fetch("/api/catalogs/admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editingCatalog.id, name: catalogDraft, projectType: catalogTypeDraft }),
      });
      const result = await response.json() as { entry?: CatalogEntry; error?: string };
      if (!response.ok || !result.entry) throw new Error(result.error ?? "No fue posible modificar el elemento.");
      setAdminCatalogs((current) => current.map((entry) => entry.id === result.entry!.id ? { ...entry, ...result.entry } : entry));
      if (editingCatalog.kind === "provider") {
        setProviderOptions((current) => Array.from(new Set(current.map((item) => item === editingCatalog.name ? result.entry!.name : item))));
      } else {
        setProjectOptions((current) => {
          const next = Object.fromEntries(Object.entries(current).map(([type, items]) => [type, items.filter((item) => item !== editingCatalog.name)]));
          const targetType = result.entry!.projectType ?? editingCatalog.projectType ?? "DS19";
          next[targetType] = Array.from(new Set([...(next[targetType] ?? []), result.entry!.name]));
          return next;
        });
      }
      setEditingCatalog(null);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "No fue posible modificar el elemento.");
    } finally {
      setCatalogBusy(false);
    }
  }

  async function deleteCatalogEntry(entry: CatalogEntry) {
    if (!window.confirm(`¿Eliminar "${entry.name}" de la lista? Las solicitudes anteriores no se modificarán.`)) return;
    setCatalogBusy(true);
    setCatalogError("");
    try {
      const response = await fetch(`/api/catalogs/admin?id=${entry.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible eliminar el elemento.");
      setAdminCatalogs((current) => current.filter((item) => item.id !== entry.id));
      if (entry.kind === "provider") setProviderOptions((current) => current.filter((item) => item !== entry.name));
      if (entry.kind === "project") setProjectOptions((current) => ({
        ...current,
        [entry.projectType ?? ""]: (current[entry.projectType ?? ""] ?? []).filter((item) => item !== entry.name),
      }));
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "No fue posible eliminar el elemento.");
    } finally {
      setCatalogBusy(false);
    }
  }

  async function openPrivate(destination: "admin" | "repository") {
    if (!isAdmin) {
      setPrivateDestination(destination);
      setPassword("");
      setLoginError("");
      setLoginOpen(true);
      return;
    }
    try {
      await loadAdminData();
      setView(destination);
    } catch {
      setIsAdmin(false);
      setPrivateDestination(destination);
      setLoginOpen(true);
    }
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible ingresar.");
      setIsAdmin(true);
      await loadAdminData();
      setLoginOpen(false);
      setPassword("");
      setView(privateDestination);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No fue posible ingresar.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/admin-auth", { method: "DELETE" });
    setIsAdmin(false);
    setView("form");
  }

  const currentProjects = projectOptions[projectType] ?? [];
  const searchedPayments = useMemo(() => payments.filter((payment) => {
    const term = search.toLowerCase();
    const matchesSearch = !term || [payment.requester, payment.provider, payment.project, payment.id]
      .some((value) => (value ?? "").toLowerCase().includes(term))
      || payment.department.toLowerCase().includes(term);
    return matchesSearch;
  }), [payments, search]);
  const adminPeriods = useMemo(() => Array.from(new Set([
    processInfo.deadline,
    ...payments
      .filter((payment) => !payment.waitingForPeriod && payment.periodDeadline)
      .map((payment) => payment.periodDeadline),
  ].filter(Boolean))).sort((a, b) => Date.parse(b) - Date.parse(a)), [payments, processInfo.deadline]);
  const effectiveAdminPeriod = adminPeriods.includes(adminSelectedPeriod) ? adminSelectedPeriod : (adminPeriods[0] ?? "");
  const effectivePublicPeriod = publicSelectedPeriod === "__waiting__"
    ? "__waiting__"
    : adminPeriods.includes(publicSelectedPeriod) ? publicSelectedPeriod : (adminPeriods[0] ?? "");
  const adminPeriodPayments = useMemo(() => payments.filter((payment) =>
    !payment.waitingForPeriod && payment.periodDeadline === effectiveAdminPeriod
  ), [payments, effectiveAdminPeriod]);
  const filteredPayments = useMemo(() => searchedPayments.filter((payment) => {
    if (statusFilter === "En espera") return payment.waitingForPeriod;
    if (payment.waitingForPeriod || payment.periodDeadline !== effectiveAdminPeriod) return false;
    return statusFilter === "Todos" || payment.status === statusFilter;
  }), [searchedPayments, statusFilter, effectiveAdminPeriod]);
  const publicFilteredPayments = useMemo(() => searchedPayments.filter((payment) =>
    (publicDepartmentFilter === "Todos" || payment.department === publicDepartmentFilter)
    && (publicProviderFilter === "Todos" || payment.provider === publicProviderFilter)
    && (effectivePublicPeriod === "__waiting__"
      ? payment.waitingForPeriod
      : !payment.waitingForPeriod && payment.periodDeadline === effectivePublicPeriod)
  ), [searchedPayments, publicDepartmentFilter, publicProviderFilter, effectivePublicPeriod]);
  const publicProviders = useMemo(() => Array.from(new Set(payments.map((payment) => payment.provider))).sort((a, b) => a.localeCompare(b, "es")), [payments]);

  const counts = (status: Status) => adminPeriodPayments.filter((payment) => payment.status === status).length;
  const waitingCount = payments.filter((payment) => payment.waitingForPeriod).length;
  const deadlineExpired = Date.now() >= Date.parse(processInfo.deadline);
  const acceptingProcess = processInfo.isOpen && !deadlineExpired;
  const departmentPayments = payments.filter((payment) => payment.department === selectedDepartment && !payment.waitingForPeriod);
  const repositoryPeriods = adminPeriods;
  const effectivePeriod = repositoryPeriods.includes(selectedPeriod) ? selectedPeriod : (repositoryPeriods[0] ?? "");
  const periodPayments = departmentPayments.filter((payment) => payment.periodDeadline === effectivePeriod);
  const repositoryStats = departments.map((name) => ({
    name,
    payments: payments.filter((payment) =>
      payment.department === name
      && !payment.waitingForPeriod
      && payment.periodDeadline === effectivePeriod
    ),
  }));
  const visibleCatalogs = adminCatalogs.filter((entry) =>
    entry.kind === catalogKind && (!catalogSearch || entry.name.toLowerCase().includes(catalogSearch.toLowerCase()))
  );

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
      const result = await response.json() as { process?: ProcessInfo; assignedWaiting?: number; error?: string };
      if (!response.ok || !result.process) throw new Error(result.error ?? "No fue posible actualizar el proceso.");
      setProcessInfo(result.process);
      setDeadlineDraft(toDateTimeLocal(result.process.deadline));
      if (result.assignedWaiting) {
        setPayments((current) => current.map((payment) => payment.waitingForPeriod
          ? { ...payment, waitingForPeriod: false, periodDeadline: result.process!.deadline }
          : payment));
        setAdminSelectedPeriod(result.process.deadline);
        setStatusFilter("Todos");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible actualizar el proceso.");
    } finally {
      setSavingProcess(false);
    }
  }

  async function deleteSubmission() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      if (dataMode === "live") {
        const response = await fetch(`/api/submissions/${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "No fue posible eliminar el registro.");
      }
      setPayments((current) => current.filter((payment) => payment.id !== pendingDelete.id));
      setPendingDelete(null);
      setOpenMenuId(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "No fue posible eliminar el registro.");
    } finally {
      setDeleting(false);
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
      formData.set("comment", comment);
      files.forEach((file) => formData.append("files", file));
      const response = await fetch("/api/submissions", { method: "POST", body: formData });
      const result = await response.json() as {
        submission?: { id: string; status: Status; waitingForPeriod: boolean; documents: Array<{ id: string; fileName: string; size: number }> };
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
        periodDeadline: result.submission.waitingForPeriod ? "" : processInfo.deadline,
        waitingForPeriod: result.submission.waitingForPeriod,
        documents: result.submission.documents,
      };
      setPayments((current) => [created, ...current]);
      setProviderOptions((current) => Array.from(new Set([...current, cleanProvider])));
      setMotiveOptions((current) => Array.from(new Set([...current, cleanMotive])));
      setProjectOptions((current) => ({ ...current, [projectType]: Array.from(new Set([...(current[projectType] ?? []), cleanProject])) }));
      setSentId(result.submission.id);
      setSentWaiting(result.submission.waitingForPeriod);
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
    setProviderCustom(false);
    setProjectCustom(false);
    setMotiveCustom(false);
    setComment("");
    setRequester("");
    setDepartment("");
    setProjectType("DS19");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSent(false);
    setSentId("");
    setSentWaiting(false);
    setSubmitError("");
  }

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;
    setFiles((current) => [...current, ...Array.from(fileList)].filter((file, index, all) =>
      all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index
    ));
    setSubmitError("");
  }

  function removeFile(target: File) {
    setFiles((current) => current.filter((file) => file !== target));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
    const transferredFiles = Array.from(event.dataTransfer.files);
    const itemFiles = Array.from(event.dataTransfer.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    addFiles([...transferredFiles, ...itemFiles]);
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
          <button className={view === "status" ? "active" : ""} onClick={() => setView("status")}>Consultar estado</button>
          <button className={view === "admin" ? "active" : ""} onClick={() => void openPrivate("admin")}>Panel administrativo</button>
          <button className={view === "repository" ? "active" : ""} onClick={() => void openPrivate("repository")}>Repositorio</button>
        </nav>
        {isAdmin ? <button className="admin-session" onClick={() => void logout()} title="Cerrar sesión">MT <span>Salir</span></button> : <div className="avatar" title="Zona administrativa protegida">🔒</div>}
      </header>

      {view === "form" ? (
        <section className="page-shell form-page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{acceptingProcess ? "Proceso abierto" : "Recepción en espera"}</span>
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
            : <div className="notice waiting-notice"><span>i</span><p><strong>Fuera del proceso actual</strong> Puedes cargar tus facturas normalmente. Quedarán en espera y se asignarán automáticamente cuando se abra el próximo período de pago.</p></div>}

          <form className="form-card" onSubmit={submitForm}>
            <div className="section-title"><span>01</span><div><h2>Datos generales</h2><p>Información para identificar y clasificar la solicitud.</p></div></div>
            <div className="form-grid">
              <label>Quién solicita <b>*</b><select required value={requester} onChange={(event) => setRequester(event.target.value)}><option value="" disabled>Seleccionar solicitante</option>{requesters.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Departamento <b>*</b>
                <select required value={department} onChange={(event) => setDepartment(event.target.value)}><option value="" disabled>Seleccionar departamento</option>{departments.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label className="wide">Proveedor <b>*</b>
                <select required value={providerCustom ? "__new__" : provider} onChange={(event) => { const isNew = event.target.value === "__new__"; setProviderCustom(isNew); setProvider(isNew ? "" : event.target.value); }}><option value="" disabled>Seleccionar proveedor</option>{providerOptions.map((item) => <option key={item} value={item}>{item}</option>)}<option value="__new__">+ Agregar proveedor nuevo</option></select>
                {providerCustom && <input autoFocus required value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Escribe el proveedor nuevo" />}
                {providerCustom && <FieldHint value={provider} options={providerOptions} noun="proveedor" />}
              </label>
            </div>

            <div className="divider" />
            <div className="section-title"><span>02</span><div><h2>Clasificación del proyecto</h2><p>Selecciona el tipo para ver los proyectos relacionados.</p></div></div>
            <fieldset className="type-field"><legend>Tipo de proyecto <b>*</b></legend><div className="type-options">
              {Object.keys(projectsByType).map((type) => <label key={type} className={projectType === type ? "selected" : ""}><input type="radio" name="type" value={type} checked={projectType === type} onChange={() => { setProjectType(type); setProject(""); setProjectCustom(false); }} /><span>{type}</span></label>)}
            </div></fieldset>
            <div className="form-grid">
              <label className="wide">Proyecto <b>*</b>
                <select required value={projectCustom ? "__new__" : project} onChange={(event) => { const isNew = event.target.value === "__new__"; setProjectCustom(isNew); setProject(isNew ? "" : event.target.value); }}><option value="" disabled>Seleccionar proyecto de {projectType}</option>{currentProjects.map((item) => <option key={item} value={item}>{item}</option>)}<option value="__new__">+ Agregar proyecto nuevo</option></select>
                {projectCustom && <input autoFocus required value={project} onChange={(event) => setProject(event.target.value)} placeholder={`Escribe el proyecto nuevo de ${projectType}`} />}
                {projectCustom && <FieldHint value={project} options={currentProjects} noun="proyecto" />}
              </label>
              <label className="wide">Motivo <b>*</b>
                <select required value={motiveCustom ? "__new__" : motive} onChange={(event) => { const isNew = event.target.value === "__new__"; setMotiveCustom(isNew); setMotive(isNew ? "" : event.target.value); }}><option value="" disabled>Seleccionar motivo</option>{motiveOptions.map((item) => <option key={item} value={item}>{item}</option>)}<option value="__new__">+ Agregar motivo nuevo</option></select>
                {motiveCustom && <input autoFocus required value={motive} onChange={(event) => setMotive(event.target.value)} placeholder="Escribe el motivo nuevo" />}
                {motiveCustom && <FieldHint value={motive} options={motiveOptions} noun="motivo" />}
              </label>
              <label className="wide">Comentario <span className="optional">Opcional</span><textarea name="comment" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Agrega información útil para revisar el pago" /></label>
            </div>

            <div className="divider" />
            <div className="section-title"><span>03</span><div><h2>Documentos</h2><p>Puedes adjuntar una o varias facturas.</p></div></div>
            <label
              className={`dropzone ${files.length ? "has-files" : ""} ${isDraggingFiles ? "is-dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDraggingFiles(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDraggingFiles(false); }}
              onDrop={handleFileDrop}
            >
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
              <span className="upload-icon">↑</span>
              <strong>{files.length ? `${files.length} archivo${files.length > 1 ? "s" : ""} seleccionado${files.length > 1 ? "s" : ""}` : "Arrastra tus facturas aquí"}</strong>
              <p>{files.length ? "Puedes seguir agregando más archivos" : "o haz clic para seleccionar archivos"}</p>
              <small>PDF, Excel, Word o imagen · Máximo 15 MB por archivo</small>
            </label>

            {files.length > 0 && <div className="selected-files" aria-live="polite">
              <div className="selected-files-heading"><strong>Archivos preparados</strong><span>{files.length} de 20</span></div>
              {files.map((file, index) => <div className="selected-file" key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className="selected-file-number">{index + 1}</span>
                <div><strong>{file.name}</strong><small>{formatFileSize(file.size)}</small></div>
                <button type="button" onClick={() => removeFile(file)} aria-label={`Quitar ${file.name}`} title="Quitar archivo">×</button>
              </div>)}
            </div>}

            {submitError && <div className="form-error"><span>!</span>{submitError}</div>}
            <div className="form-actions"><p><b>*</b> Campos obligatorios</p><div className="form-action-buttons"><button type="button" className="secondary clear-form" onClick={resetForm} disabled={submitting}>Limpiar formulario</button><button type="submit" className="primary" disabled={submitting}>{submitting ? "Guardando..." : acceptingProcess ? "Enviar facturas" : "Guardar en espera"} <span>→</span></button></div></div>
          </form>

          {sent && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="success-modal"><span className="success-check">✓</span><h2 id="success-title">{sentWaiting ? "¡Facturas guardadas en espera!" : "¡Facturas recibidas!"}</h2><p>{sentWaiting ? <>Tu solicitud <strong>{sentId}</strong> quedó protegida y será asignada automáticamente al próximo período de pago.</> : <>Tu solicitud quedó registrada con el número <strong>{sentId}</strong> y estado <span className="badge received">Recibida</span>.</>}</p><div className="modal-actions"><button className="secondary" onClick={() => { setSent(false); setView("status"); }}>Consultar estado</button><button className="primary" onClick={resetForm}>Ingresar otra</button></div></div></div>}
        </section>
      ) : view === "status" ? (
        <section className="page-shell status-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Seguimiento público</span><h1>Estado de facturas</h1><p>Busca una solicitud para revisar en qué etapa se encuentra.</p></div>
            <div className="repository-summary"><span>⌕</span><div><small>Proceso actual</small><strong>{processInfo.name}</strong></div></div>
          </div>
          <div className="status-filters">
            <div className="status-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por número, proveedor o proyecto" /></div>
            <label>Período de pago<select value={effectivePublicPeriod} onChange={(event) => setPublicSelectedPeriod(event.target.value)}><option value="__waiting__">En espera del próximo período</option>{adminPeriods.map((period) => <option key={period} value={period}>Período {formatPeriodDate(period)}</option>)}</select></label>
            <label>Departamento<select value={publicDepartmentFilter} onChange={(event) => setPublicDepartmentFilter(event.target.value)}><option>Todos</option>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Proveedor<select value={publicProviderFilter} onChange={(event) => setPublicProviderFilter(event.target.value)}><option>Todos</option>{publicProviders.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="table-card public-status-card">
            <div className="table-wrap"><table><thead><tr><th>Solicitud</th><th>Proveedor</th><th>Proyecto</th><th>Departamento</th><th>Documentos</th><th>Estado</th></tr></thead><tbody>
              {publicFilteredPayments.map((payment) => <tr key={payment.id}>
                <td><strong>{payment.id}</strong><small>{payment.date}</small></td>
                <td><strong>{payment.provider}</strong></td>
                <td><strong>{payment.project}</strong><small>{payment.type}</small></td>
                <td>{payment.department}</td>
                <td><button className="files-button" onClick={() => setDocumentPayment(payment)}>▤ {payment.files} archivo{payment.files === 1 ? "" : "s"}<small>Ver documentos</small></button></td>
                <td>{payment.waitingForPeriod ? <span className="badge waiting">En espera de período</span> : <span className={`badge ${payment.status.toLowerCase().replace(" ", "-")}`}>{payment.status}</span>}</td>
              </tr>)}
              {!publicFilteredPayments.length && <tr><td colSpan={6} className="empty-state">No encontramos solicitudes con esos filtros.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Mostrando {publicFilteredPayments.length} solicitudes · {effectivePublicPeriod === "__waiting__" ? "En espera del próximo período" : `Período ${formatPeriodDate(effectivePublicPeriod)}`}</span></div>
          </div>
        </section>
      ) : view === "admin" ? (
        <section className="page-shell admin-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Administración</span><h1>{processInfo.name}</h1><p>Revisa y actualiza el estado de las facturas recibidas.</p></div>
            <div className="process-control"><div><span className={`dot ${acceptingProcess ? "" : "closed"}`} /><small>Período de pago</small><strong>{acceptingProcess ? "Abierto" : `${waitingCount} en espera`}</strong></div><button disabled={savingProcess || (deadlineExpired && processInfo.isOpen)} className={acceptingProcess ? "close-process" : "open-process"} onClick={() => void updateProcess({ isOpen: !acceptingProcess })}>{acceptingProcess ? "Cerrar proceso" : deadlineExpired && processInfo.isOpen ? "Cambia la fecha" : "Abrir período"}</button></div>
          </div>

          <div className="deadline-editor">
            <div><span className="calendar-icon">{new Date(processInfo.deadline).getDate()}</span><div><strong>Fecha y hora de cierre</strong><small>Después de esta fecha las facturas nuevas quedarán en espera.</small></div></div>
            <label>Fecha de cierre<input type="datetime-local" value={deadlineDraft} onChange={(event) => setDeadlineDraft(event.target.value)} /></label>
            <button disabled={savingProcess || !deadlineDraft} onClick={() => void updateProcess({ deadline: new Date(deadlineDraft).toISOString() })}>{savingProcess ? "Guardando..." : "Guardar fecha"}</button>
          </div>

          <div className="catalog-admin">
            <button className="catalog-toggle" onClick={() => setCatalogManagerOpen((current) => !current)} aria-expanded={catalogManagerOpen}>
              <span>⌘</span><div><strong>Administrar proveedores y proyectos</strong><small>Revisa, corrige o elimina los elementos agregados desde el formulario.</small></div><b>{catalogManagerOpen ? "Cerrar" : "Revisar listas"}</b>
            </button>
            {catalogManagerOpen && <div className="catalog-panel">
              <div className="catalog-toolbar">
                <div className="catalog-tabs">
                  <button className={catalogKind === "provider" ? "active" : ""} onClick={() => setCatalogKind("provider")}>Proveedores</button>
                  <button className={catalogKind === "project" ? "active" : ""} onClick={() => setCatalogKind("project")}>Proyectos</button>
                </div>
                <input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder={`Buscar ${catalogKind === "provider" ? "proveedor" : "proyecto"}`} />
              </div>
              <div className="catalog-note"><span>i</span> Aquí aparecen los nombres nuevos agregados por los usuarios. Las listas originales se mantienen protegidas.</div>
              {catalogError && <div className="form-error"><span>!</span>{catalogError}</div>}
              <div className="catalog-list">
                {visibleCatalogs.map((entry) => <div className="catalog-row" key={entry.id}>
                  <div><strong>{entry.name}</strong><small>{entry.kind === "project" ? `Proyecto ${entry.projectType}` : "Proveedor agregado"} · Las solicitudes anteriores no cambian</small></div>
                  <button disabled={catalogBusy} onClick={() => { setEditingCatalog(entry); setCatalogDraft(entry.name); setCatalogTypeDraft(entry.projectType ?? "DS19"); setCatalogError(""); }}>Modificar</button>
                  <button className="catalog-delete" disabled={catalogBusy} onClick={() => void deleteCatalogEntry(entry)}>Eliminar</button>
                </div>)}
                {!visibleCatalogs.length && <div className="empty-catalog">No hay {catalogKind === "provider" ? "proveedores" : "proyectos"} nuevos con esa búsqueda.</div>}
              </div>
            </div>}
          </div>

          <div className="admin-period-filter">
            <div className="admin-period-copy">
              <span className="calendar-icon">{effectiveAdminPeriod ? new Date(effectiveAdminPeriod).getDate() : "—"}</span>
              <div><small>Período seleccionado</small><strong>{effectiveAdminPeriod ? `Período de pago ${formatPeriodDate(effectiveAdminPeriod)}` : "Sin períodos registrados"}</strong><p>Los contadores y la tabla muestran solamente las facturas de esta fecha.</p></div>
            </div>
            <label>Historial de períodos<select value={effectiveAdminPeriod} disabled={!adminPeriods.length || statusFilter === "En espera"} onChange={(event) => { setAdminSelectedPeriod(event.target.value); setStatusFilter("Todos"); }}>
              {adminPeriods.map((period) => <option key={period} value={period}>Período de pago {formatPeriodDate(period)}</option>)}
            </select></label>
            {statusFilter === "En espera" && <div className="admin-period-waiting"><span>⌛</span><div><strong>Bandeja en espera</strong><small>No pertenece a ningún período hasta abrir una nueva fecha.</small></div></div>}
          </div>

          <div className="stats-grid">
            <button onClick={() => setStatusFilter("Todos")} className={statusFilter === "Todos" ? "selected" : ""}><span className="stat-icon all">▦</span><div><strong>{adminPeriodPayments.length}</strong><small>Total del período</small></div></button>
            <button onClick={() => setStatusFilter("En espera")} className={statusFilter === "En espera" ? "selected" : ""}><span className="stat-icon waiting">⌛</span><div><strong>{waitingCount}</strong><small>En espera</small></div></button>
            <button onClick={() => setStatusFilter("Recibida")} className={statusFilter === "Recibida" ? "selected" : ""}><span className="stat-icon received">↓</span><div><strong>{counts("Recibida")}</strong><small>Recibidas</small></div></button>
            <button onClick={() => setStatusFilter("En proceso")} className={statusFilter === "En proceso" ? "selected" : ""}><span className="stat-icon process">◷</span><div><strong>{counts("En proceso")}</strong><small>En proceso</small></div></button>
            <button onClick={() => setStatusFilter("Pendiente")} className={statusFilter === "Pendiente" ? "selected" : ""}><span className="stat-icon pending">!</span><div><strong>{counts("Pendiente")}</strong><small>Pendientes</small></div></button>
            <button onClick={() => setStatusFilter("Pagada")} className={statusFilter === "Pagada" ? "selected" : ""}><span className="stat-icon paid">✓</span><div><strong>{counts("Pagada")}</strong><small>Pagadas</small></div></button>
          </div>

          <div className="table-card">
            <div className="table-toolbar">
              <div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proveedor, proyecto o solicitante" /></div>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option><option>En espera</option><option>Recibida</option><option>En proceso</option><option>Pendiente</option><option>Pagada</option></select>
              <button className="export-button">⇩ Exportar Excel</button>
            </div>
            <div className="table-wrap"><table><thead><tr><th>Solicitud</th><th>Proveedor</th><th>Proyecto</th><th>Departamento</th><th>Documentos</th><th>Estado</th><th /></tr></thead><tbody>
              {filteredPayments.map((payment) => <tr key={payment.id}>
                <td><strong>{payment.id}</strong><small>{payment.requester} · {payment.date}</small></td>
                <td><strong>{payment.provider}</strong><small>{payment.motive}</small></td>
                <td><strong>{payment.project}</strong><small>{payment.type}</small></td>
                <td>{payment.department}</td>
                <td><button className="files-button" onClick={() => setDocumentPayment(payment)}>▤ {payment.files} archivo{payment.files > 1 ? "s" : ""}<small>Ver documentos</small></button></td>
                <td>{payment.waitingForPeriod ? <span className="badge waiting">En espera de período</span> : <select className={`status-select ${payment.status.toLowerCase().replace(" ", "-")}`} value={payment.status} onChange={(event) => updateStatus(payment.id, event.target.value as Status)}><option>Recibida</option><option>En proceso</option><option>Pendiente</option><option>Pagada</option></select>}</td>
                <td><div className="row-actions">
                  <button className="more" aria-label={`Más opciones para ${payment.id}`} aria-expanded={openMenuId === payment.id} onClick={() => setOpenMenuId((current) => current === payment.id ? null : payment.id)}>•••</button>
                  {openMenuId === payment.id && <div className="action-menu"><button onClick={() => { setPendingDelete(payment); setOpenMenuId(null); setDeleteError(""); }}><span>×</span> Eliminar registro</button></div>}
                </div></td>
              </tr>)}
              {!filteredPayments.length && <tr><td colSpan={7} className="empty-state">No encontramos solicitudes con esos filtros.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>{statusFilter === "En espera" ? `Mostrando ${filteredPayments.length} facturas en espera` : `Mostrando ${filteredPayments.length} de ${adminPeriodPayments.length} solicitudes del período`}</span><div><button disabled>‹</button><button className="current">1</button><button disabled>›</button></div></div>
          </div>

          {pendingDelete && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="success-modal delete-modal">
            <span className="delete-icon">×</span>
            <h2 id="delete-title">¿Eliminar este registro?</h2>
            <p>Se eliminará <strong>{pendingDelete.id}</strong>, junto con {pendingDelete.files} archivo{pendingDelete.files === 1 ? "" : "s"} de <strong>{pendingDelete.provider}</strong>. Esta acción es permanente.</p>
            {deleteError && <div className="form-error"><span>!</span>{deleteError}</div>}
            <div className="modal-actions"><button className="secondary" disabled={deleting} onClick={() => setPendingDelete(null)}>Cancelar</button><button className="danger-button" disabled={deleting} onClick={() => void deleteSubmission()}>{deleting ? "Eliminando..." : "Sí, eliminar"}</button></div>
          </div></div>}
        </section>
      ) : (
        <section className="page-shell repository-page">
          <div className="admin-heading">
            <div><span className="eyebrow">Documentos organizados</span><h1>Repositorio de facturas</h1><p>Descarga juntas todas las facturas de un departamento para cargarlas en tu sistema.</p></div>
            <div className="repository-summary"><span>▣</span><div><small>Proceso actual</small><strong>{processInfo.name}</strong></div></div>
          </div>

          <div className="repository-explainer"><span>i</span><p>Las cantidades de las carpetas corresponden únicamente al período de pago seleccionado: <strong>{effectivePeriod ? formatPeriodDate(effectivePeriod) : "sin período"}</strong>.</p></div>

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

          <div className="period-section">
            <div className="period-heading"><div><span className="eyebrow">{selectedDepartment}</span><h2>Períodos de pago</h2></div><small>{repositoryPeriods.length} período{repositoryPeriods.length === 1 ? "" : "s"}</small></div>
            {repositoryPeriods.length ? <div className="period-grid">
              {repositoryPeriods.map((period) => {
                const items = departmentPayments.filter((payment) => payment.periodDeadline === period);
                const fileCount = items.reduce((total, item) => total + item.files, 0);
                return <button key={period} className={`period-card ${effectivePeriod === period ? "selected" : ""}`} onClick={() => setSelectedPeriod(period)}>
                  <span className="folder-shape"><i /></span>
                  <div><strong>Período de pago {formatPeriodDate(period)}</strong><small>{items.length} solicitudes · {fileCount} archivos</small></div>
                  <span className="folder-arrow">→</span>
                </button>;
              })}
            </div> : <div className="empty-periods">Todavía no existen períodos de pago.</div>}
          </div>

          <div className="repository-card">
            <div className="repository-toolbar">
              <div><span className="mini-folder">▰</span><div><h2>{selectedDepartment}</h2><p>{effectivePeriod ? `Período de pago ${formatPeriodDate(effectivePeriod)} · ${periodPayments.length} solicitudes` : "Sin período seleccionado"}</p></div></div>
              <button className="primary download-folder" onClick={() => {
                if (dataMode === "live" && effectivePeriod) {
                  window.location.href = `/api/departments/${encodeURIComponent(selectedDepartment)}/download?period=${encodeURIComponent(effectivePeriod)}`;
                } else {
                  setRepositoryNotice(true);
                  window.setTimeout(() => setRepositoryNotice(false), 4200);
                }
              }} disabled={!effectivePeriod}>↓ Descargar período (.zip)</button>
            </div>
            {periodPayments.length ? <div className="file-list">
              {periodPayments.flatMap((payment) => {
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
            </div> : <div className="empty-folder"><span>▱</span><h3>Carpeta vacía</h3><p>Todavía no se han recibido facturas para este período.</p></div>}
          </div>

          {repositoryNotice && <div className="repository-toast"><span>i</span><div><strong>Vista de demostración</strong><p>La descarga real estará disponible cuando el almacenamiento compartido termine de activarse.</p></div></div>}
        </section>
      )}

      {editingCatalog && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="catalog-edit-title">
        <div className="success-modal login-modal">
          <span className="login-lock">✎</span>
          <h2 id="catalog-edit-title">Modificar {editingCatalog.kind === "provider" ? "proveedor" : "proyecto"}</h2>
          <p>El cambio se aplicará a la lista disponible para las próximas solicitudes.</p>
          <label>Nombre<input autoFocus value={catalogDraft} onChange={(event) => setCatalogDraft(event.target.value)} /></label>
          {editingCatalog.kind === "project" && <label>Tipo de proyecto<select value={catalogTypeDraft} onChange={(event) => setCatalogTypeDraft(event.target.value)}><option>DS19</option><option>DS49</option><option>INMB</option><option>G. Proyectos</option></select></label>}
          {catalogError && <div className="form-error"><span>!</span>{catalogError}</div>}
          <div className="modal-actions">
            <button className="secondary" disabled={catalogBusy} onClick={() => setEditingCatalog(null)}>Cancelar</button>
            <button className="primary" disabled={catalogBusy || !catalogDraft.trim()} onClick={() => void saveCatalogEntry()}>{catalogBusy ? "Guardando..." : "Guardar cambio"}</button>
          </div>
        </div>
      </div>}

      {loginOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <form className="success-modal login-modal" onSubmit={login}>
          <span className="login-lock">🔒</span>
          <h2 id="login-title">Acceso administrativo</h2>
          <p>Ingresa la contraseña para abrir el panel administrativo y el repositorio.</p>
          <label>Contraseña<input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Ingresa tu contraseña" /></label>
          {loginError && <div className="form-error"><span>!</span>{loginError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary" disabled={loggingIn} onClick={() => setLoginOpen(false)}>Cancelar</button>
            <button type="submit" className="primary" disabled={loggingIn || !password}>{loggingIn ? "Ingresando..." : "Ingresar"}</button>
          </div>
        </form>
      </div>}

      {documentPayment && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="documents-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setDocumentPayment(null); }}>
        <div className="success-modal document-modal">
          <span className="document-modal-icon">▤</span>
          <h2 id="documents-title">Documentos de {documentPayment.id}</h2>
          <p><strong>{documentPayment.provider}</strong> · {documentPayment.project}</p>
          <div className="document-modal-list">
            {(documentPayment.documents ?? []).map((document, index) => <div className="document-modal-row" key={document.id || `${document.fileName}-${index}`}>
              <span className="pdf-icon">{document.fileName.split(".").pop()?.slice(0, 4).toUpperCase() || "DOC"}</span>
              <div><strong>{document.fileName}</strong><small>{formatFileSize(document.size)}</small></div>
              {isAdmin && document.id ? <a href={`/api/files/${encodeURIComponent(document.id)}?view=1`} target="_blank" rel="noreferrer">Abrir</a> : <span className="document-loaded">✓ Cargado</span>}
            </div>)}
            {!documentPayment.documents?.length && <div className="empty-catalog">No hay nombres de documentos disponibles.</div>}
          </div>
          {!isAdmin && <div className="document-privacy"><span>i</span> Por seguridad, en la consulta pública se muestran los nombres. Los archivos se abren desde el panel administrativo o el repositorio.</div>}
          <div className="modal-actions"><button type="button" className="primary" onClick={() => setDocumentPayment(null)}>Cerrar</button></div>
        </div>
      </div>}
    </main>
  );
}
