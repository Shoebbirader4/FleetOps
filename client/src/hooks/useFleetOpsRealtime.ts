import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export function useFleetOpsRealtime(orgId?: string) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`fleetops-org-${orgId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicles", filter: `orgId=eq.${orgId}` }, () => {
        void utils.dashboard.summary.invalidate();
        void utils.vehicles.list.invalidate();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders", filter: `orgId=eq.${orgId}` }, () => {
        void utils.dashboard.summary.invalidate();
        void utils.workOrders.list.invalidate();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `orgId=eq.${orgId}` }, () => {
        void utils.notifications.list.invalidate();
        void utils.dashboard.summary.invalidate();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, utils]);
}
