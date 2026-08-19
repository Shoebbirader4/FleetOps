import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useFleetOpsAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      } else {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    loading,
    isAuthenticated: Boolean(session),
    signInWithEmail: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }),
    signUpWithEmail: (email: string, password: string, fullName: string, invitationToken?: string) => supabase.auth.signUp({ email, password, options: { data: { fullName, needsOnboarding: invitationToken ? false : true, invitationToken } } }),
    signOut: () => supabase.auth.signOut(),
    refreshSession: async () => {
      const result = await supabase.auth.refreshSession();
      if (result.error || !result.data.session) {
        await supabase.auth.signOut({ scope: "local" });
      }
      return result;
    },
  };
}
