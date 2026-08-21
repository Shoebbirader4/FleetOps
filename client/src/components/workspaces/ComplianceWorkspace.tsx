import { useState } from "react";
import { Check, Download, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { WorkspaceState as State } from "@/components/workspaces/WorkspaceState";
import type { DocumentRow, FleetVehicle } from "@/types/fleet";

function downloadCsv(filename: string, content: string) { const blob = new Blob([content], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
function downloadPdf(filename: string, base64: string) { const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)); const blob = new Blob([bytes], { type: "application/pdf" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "orange" | "red" }) { return <div className={`kpi-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

export function ComplianceWorkspace() {
  const utils = trpc.useUtils();
  const documents = trpc.documents.list.useQuery(undefined, { retry: false });
  const documentExport = trpc.documents.exportCsv.useQuery(undefined, { enabled: false, retry: false });
  const documentPdfExport = trpc.documents.exportPdf.useQuery(undefined, { enabled: false, retry: false });
  const vehicles = trpc.vehicles.list.useQuery(undefined, { retry: false });
  const safeVehicles = vehicles.data?.filter((vehicle: FleetVehicle) => vehicle?.id && vehicle.licensePlate) ?? [];
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("RC");
  const [expiryDate, setExpiryDate] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [fileData, setFileData] = useState("");
  const [renewalId, setRenewalId] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [historyDocumentId, setHistoryDocumentId] = useState("");
  const versions = trpc.documents.versions.useQuery({ documentId: historyDocumentId }, { enabled: Boolean(historyDocumentId), retry: false });
  const createDocument = trpc.documents.create.useMutation({ onSuccess: () => { setTitle(""); setExpiryDate(""); setFileData(""); toast.success("Compliance document uploaded"); void utils.documents.list.invalidate(); }, onError: (error) => toast.error("Document upload failed", { description: error.message }) });
  const updateDocument = trpc.documents.update.useMutation({ onSuccess: () => { setRenewalId(""); setRenewalDate(""); toast.success("Document renewed"); void utils.documents.list.invalidate(); if (historyDocumentId) void versions.refetch(); }, onError: (error) => toast.error("Document renewal failed", { description: error.message }) });
  const accessDocument = trpc.documents.access.useMutation({ onSuccess: ({ url }) => { window.open(url, "_blank", "noopener,noreferrer"); }, onError: (error) => toast.error("Document access denied", { description: error.message }) });
  const now = Date.now();
  const allDocuments = documents.data ?? [];
  const expired = allDocuments.filter((item: DocumentRow) => new Date(item.expiryDate).getTime() < now);
  const expiring = allDocuments.filter((item: DocumentRow) => new Date(item.expiryDate).getTime() >= now && new Date(item.expiryDate).getTime() <= now + 30 * 24 * 60 * 60 * 1000);
  const missing = allDocuments.filter((item: DocumentRow) => !item.fileKey && !item.fileUrl);
  const valid = allDocuments.filter((item: DocumentRow) => !expired.includes(item) && !expiring.includes(item) && !missing.includes(item));

  return <div className="compliance-workspace">
    <div className="workspace-form panel">
      <div><div className="panel-kicker">Compliance operations</div><h2>Upload or renew a document</h2><p>Keep registration, insurance, permit, and fitness records current. Expiry alerts are evaluated by the maintenance automation.</p></div>
      <form className="invite-form" onSubmit={(event) => { event.preventDefault(); if (!fileData || !expiryDate || !title.trim()) return; createDocument.mutate({ title: title.trim(), docType, expiryDate: new Date(expiryDate), vehicleId: vehicleId || undefined, fileData }); }}>
        <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Vehicle insurance 2026" /></label>
        <label>Type<select value={docType} onChange={(event) => setDocType(event.target.value)}><option value="RC">Registration certificate</option><option value="INSURANCE">Insurance</option><option value="PERMIT">Permit</option><option value="FITNESS">Fitness</option><option value="PUC">PUC</option></select></label>
        <label>Vehicle<select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="">Organization document</option>{safeVehicles.map((vehicle: FleetVehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate}</option>)}</select></label>
        <label>Expiry date<input required type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></label>
        <label>File<input required type="file" accept="application/pdf,image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setFileData(String(reader.result)); reader.readAsDataURL(file); }} /></label>
        <button className="primary-button" disabled={createDocument.isPending || !fileData}><Plus size={16} />{createDocument.isPending ? "Uploading…" : "Save document"}</button>
      </form>
    </div>
    <section className="panel workspace-table">
      <div className="panel-heading"><div><div className="panel-kicker">Compliance vault</div><h2>Documents and expiries</h2></div><div className="inline-actions"><span className={`signal-chip ${expiring.length ? "warn" : "good"}`}><ShieldCheck size={13} /> {expiring.length} due within 30 days</span><button type="button" className="secondary-button compact-button" disabled={documentExport.isFetching} onClick={() => { void documentExport.refetch().then(({ data }) => { if (data) { downloadCsv(data.filename, data.content); toast.success(`Exported ${data.rowCount} documents`); } }); }}><Download size={14} />{documentExport.isFetching ? "Preparing…" : "Export CSV"}</button><button type="button" className="secondary-button compact-button" disabled={documentPdfExport.isFetching} onClick={() => { void documentPdfExport.refetch().then(({ data }) => { if (data) { downloadPdf(data.filename, data.content); toast.success(`Exported ${data.rowCount} documents to PDF`); } }); }}><Download size={14} />{documentPdfExport.isFetching ? "Preparing…" : "Export PDF"}</button></div></div>
      <div className="workspace-kpi-grid compact-summary"><Kpi label="Valid" value={String(valid.length)} detail="current records" tone="green" /><Kpi label="Expiring" value={String(expiring.length)} detail="next 30 days" tone={expiring.length ? "orange" : "green"} /><Kpi label="Expired" value={String(expired.length)} detail="renewal required" tone={expired.length ? "red" : "green"} /><Kpi label="Missing file" value={String(missing.length)} detail="metadata or upload gap" tone={missing.length ? "red" : "green"} /></div>
      <State loading={documents.isLoading} error={documents.isError} empty={!documents.isLoading && !documents.isError && !documents.data?.length}>
        <div className="resource-list">{(documents.data ?? []).map((document: DocumentRow) => { const expiryTime = new Date(document.expiryDate).getTime(); const isExpired = expiryTime < now; const isExpiring = !isExpired && expiryTime <= now + 30 * 24 * 60 * 60 * 1000; const isMissing = !document.fileKey && !document.fileUrl; return <div className="resource-row" key={document.id}><div><strong>{document.title}</strong><span>{document.docType} · {document.vehicle?.licensePlate ?? "Organization record"}</span></div><div className="document-actions"><span className={`status-label ${isExpired || isMissing ? "expired" : isExpiring ? "pending" : "accepted"}`}>{isMissing ? "File missing" : isExpired ? `Expired ${new Date(document.expiryDate).toLocaleDateString("en-IN")}` : isExpiring ? `Expires ${new Date(document.expiryDate).toLocaleDateString("en-IN")}` : "Current"}</span>{renewalId === document.id ? <form className="renew-form" onSubmit={(event) => { event.preventDefault(); if (renewalDate) updateDocument.mutate({ id: document.id, expiryDate: new Date(renewalDate) }); }}><input required type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} /><button className="secondary-button compact-button" disabled={updateDocument.isPending}>Save</button></form> : <><button type="button" className="secondary-button compact-button" disabled={accessDocument.isPending || !document.fileKey} onClick={() => accessDocument.mutate({ id: document.id, kind: "DOCUMENT" })}>{accessDocument.isPending ? "Opening…" : "Open file"}</button><button type="button" className="secondary-button compact-button" onClick={() => setHistoryDocumentId(historyDocumentId === document.id ? "" : document.id)}>{historyDocumentId === document.id ? "Hide history" : "History"}</button><button type="button" className="secondary-button compact-button" onClick={() => { setRenewalId(document.id); setRenewalDate(new Date(document.expiryDate).toISOString().slice(0, 10)); }}>Renew</button></>}</div></div>; })}</div>
      </State>
    </section>
    {historyDocumentId && <section className="panel workspace-table"><div className="panel-heading"><div><div className="panel-kicker">Append-only record history</div><h2>Document versions</h2></div><span className="signal-chip good">{versions.data?.length ?? 0} versions</span></div><State loading={versions.isLoading} error={versions.isError} empty={!versions.isLoading && !versions.isError && !(versions.data ?? []).length}><div className="resource-list">{(versions.data ?? []).map((version: any) => <div className="resource-row" key={version.id}><div><strong>Version {version.versionNumber} · {version.title}</strong><span>{version.docType} · expires {new Date(version.expiryDate).toLocaleDateString("en-IN")}</span><small>Recorded {new Date(version.createdAt).toLocaleString("en-IN")}</small></div><span className="resource-meta">{version.fileKey ? "File stored" : "Metadata only"}</span></div>)}</div></State></section>}
  </div>;
}
