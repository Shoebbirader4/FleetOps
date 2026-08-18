import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useFleetOpsAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
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
    signUpWithEmail: (email: string, password: string, fullName: string) => supabase.auth.signUp({ email, password, options: { data: { fullName, needsOnboarding: true } } }),
    signOut: () => supabase.auth.signOut(),
  };
}
