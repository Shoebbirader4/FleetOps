/* Signal Ledger: persistent rail, asymmetric command canvas, warm paper workspace. */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { useFleetOpsAuth } from "./hooks/useFleetOpsAuth";
import { trpc } from "./lib/trpc";
import { Route, Switch, useRoute } from "wouter";

function WorkspaceRoute() {
  const [, params] = useRoute("/workspace/:section");
  return <Home initialSection={decodeURIComponent(params?.section ?? "Command center")} />;
}

function DefaultRoute() {
  return <Home />;
}

function GuardedWorkspaceRoute({ section, allowedRoles }: { section: string; allowedRoles: string[] }) {
  const { session, loading } = useFleetOpsAuth();
  const summary = trpc.dashboard.summary.useQuery(undefined, { enabled: Boolean(session), retry: false });
  if (loading || (session && summary.isLoading)) return <div className="auth-page"><div className="auth-card"><h1>Loading workspace access…</h1></div></div>;
  if (session && summary.data?.role && !allowedRoles.includes(summary.data.role)) return <div className="auth-page"><div className="auth-card"><h1>Workspace access restricted.</h1><p>Your FleetOps role does not have access to the {section} workspace.</p><a className="primary-button" href="/">Return to command center</a></div></div>;
  return <Home initialSection={section} />;
}

function DriverRoute() { return <GuardedWorkspaceRoute section="Driver portal" allowedRoles={["DRIVER", "SUPERADMIN", "FLEET_MANAGER"]} />; }
function AccountantRoute() { return <GuardedWorkspaceRoute section="Accountant ledger" allowedRoles={["ACCOUNTANT", "SUPERADMIN"]} />; }
function TeamRoute() { return <GuardedWorkspaceRoute section="Team" allowedRoles={["SUPERADMIN", "FLEET_MANAGER"]} />; }
function InventoryRoute() { return <GuardedWorkspaceRoute section="Inventory" allowedRoles={["INVENTORY_MANAGER", "SUPERADMIN"]} />; }

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            <Route path="/driver" component={DriverRoute} />
            <Route path="/accountant" component={AccountantRoute} />
            <Route path="/team" component={TeamRoute} />
            <Route path="/inventory" component={InventoryRoute} />
            <Route path="/workspace/:section" component={WorkspaceRoute} />
            <Route path="/" component={DefaultRoute} />
            <Route component={DefaultRoute} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
