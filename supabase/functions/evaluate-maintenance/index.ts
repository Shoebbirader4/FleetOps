import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`;
  if (!authorization || authorization !== expected) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { data: organizations, error: orgError } = await supabase.from("organizations").select("id");
    if (orgError) throw orgError;

    let createdWorkOrders = 0;
    let lowStockAlerts = 0;

    for (const organization of organizations ?? []) {
      const { data: vehicles, error: vehicleError } = await supabase.from("vehicles").select("id, licensePlate, currentOdometer").eq("orgId", organization.id);
      if (vehicleError) throw vehicleError;
      const { data: admins, error: adminError } = await supabase.from("users").select("id").eq("orgId", organization.id).in("role", ["SUPERADMIN", "FLEET_MANAGER", "INVENTORY_MANAGER"]);
      if (adminError) throw adminError;

      for (const vehicle of vehicles ?? []) {
        const { data: components, error: componentError } = await supabase.from("components").select("id, name, expectedLifeKm, lastServicedOdometer, alertThresholdKm").eq("vehicleId", vehicle.id);
        if (componentError) throw componentError;
        for (const component of components ?? []) {
          const consumed = Number(vehicle.currentOdometer) - Number(component.lastServicedOdometer);
          if (consumed < Number(component.alertThresholdKm)) continue;
          const { data: existing } = await supabase.from("work_orders").select("id").eq("orgId", organization.id).eq("vehicleId", vehicle.id).in("status", ["OPEN", "IN_PROGRESS"]).ilike("title", `%${component.name}%`).limit(1);
          if (existing?.length) continue;
          const { data: workOrder, error: workOrderError } = await supabase.from("work_orders").insert({ orgId: organization.id, vehicleId: vehicle.id, title: `${component.name} service threshold reached`, description: `${component.name} crossed its service threshold.`, priority: consumed >= Number(component.expectedLifeKm) ? "CRITICAL" : "HIGH" }).select("id").single();
          if (workOrderError) throw workOrderError;
          if (admins?.length) {
            const { error: notificationError } = await supabase.from("notifications").insert(admins.map((admin) => ({ orgId: organization.id, recipientId: admin.id, title: "Predictive maintenance alert", message: `${vehicle.licensePlate}: ${component.name} crossed its service threshold.`, type: "MAINTENANCE_THRESHOLD", referenceId: workOrder.id })));
            if (notificationError) throw notificationError;
          }
          createdWorkOrders += 1;
        }
      }

      const { data: parts, error: partsError } = await supabase.from("inventory_parts").select("id, sku, name, quantityOnHand, minReorderLevel").eq("orgId", organization.id);
      if (partsError) throw partsError;
      for (const part of parts ?? []) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: existingAlert } = await supabase.from("notifications").select("id").eq("orgId", organization.id).eq("referenceId", part.id).eq("type", "INVENTORY_LOW").gte("createdAt", since).limit(1);
        if (existingAlert?.length || !admins?.length || Number(part.quantityOnHand) > Number(part.minReorderLevel)) continue;
        const { error: notificationError } = await supabase.from("notifications").insert(admins.map((admin) => ({ orgId: organization.id, recipientId: admin.id, title: "Inventory below reorder level", message: `${part.name} (${part.sku}) has ${part.quantityOnHand} units remaining.`, type: "INVENTORY_LOW", referenceId: part.id })));
        if (notificationError) throw notificationError;
        lowStockAlerts += 1;
      }
    }

    return Response.json({ ok: true, organizations: organizations?.length ?? 0, createdWorkOrders, lowStockAlerts });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
