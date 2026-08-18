import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { supabase } from "@/lib/supabase";
import "./index.css";

const queryClient = new QueryClient();
const API_TIMEOUT_MS = 15_000;

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        return {};
      },
      async fetch(input, init) {
        const request = async (accessToken?: string) => {
          const headers = new Headers(init?.headers);
          if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
          try {
            return await globalThis.fetch(input, { ...(init ?? {}), headers, credentials: "include", signal: controller.signal });
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              throw new Error(`FleetOps API request timed out after ${API_TIMEOUT_MS / 1000} seconds.`);
            }
            throw error;
          } finally {
            window.clearTimeout(timeout);
          }
        };
        const { data } = await supabase.auth.getSession();
        let response = await request(data.session?.access_token);
        if (response.status === 401) {
          const refreshed = await supabase.auth.refreshSession();
          if (refreshed.data.session?.access_token) response = await request(refreshed.data.session.access_token);
          if (response.status === 401 && !refreshed.data.session) window.dispatchEvent(new CustomEvent("fleetops-session-expired"));
        }
        return response;
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
