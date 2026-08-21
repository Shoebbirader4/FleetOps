import { RefreshCw } from "lucide-react";

type WorkspaceStateProps = {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
  children: React.ReactNode;
};

export function WorkspaceState({ loading, error, empty, onRetry, children }: WorkspaceStateProps) {
  if (loading) return <div className="workspace-state"><RefreshCw className="spin" size={18} /> Loading live FleetOps data…</div>;
  if (error) { const retry = onRetry ?? (() => window.location.reload()); return <div className="workspace-state error-state"><span>This workspace could not load from Supabase. Check your session and try again.</span><button type="button" className="secondary-button compact-button" onClick={retry}><RefreshCw size={14} /> Retry</button></div>; }
  if (empty) return <div className="workspace-state">No records yet. Use the action above to create the first record.</div>;
  return <>{children}</>;
}

export type { WorkspaceStateProps };

