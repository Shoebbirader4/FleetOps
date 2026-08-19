import { RefreshCw } from "lucide-react";

type WorkspaceStateProps = { loading?: boolean; error?: boolean; empty?: boolean; children: React.ReactNode };

export function WorkspaceState({ loading, error, empty, children }: WorkspaceStateProps) {
  if (loading) return <div className="workspace-state"><RefreshCw className="spin" size={18} /> Loading live FleetOps data…</div>;
  if (error) return <div className="workspace-state error-state">This workspace could not load from Supabase. Check your session and try again.</div>;
  if (empty) return <div className="workspace-state">No records yet. Use the action above to create the first record.</div>;
  return <>{children}</>;
}
