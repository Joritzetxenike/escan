import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let client;
    let subscription;

    try {
      client = getSupabase();
    } catch (configurationError) {
      setError(configurationError);
      setLoading(false);
      return undefined;
    }

    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError(sessionError);
        } else {
          setSession(data.session);
        }
        setLoading(false);
      })
      .catch((sessionError) => {
        if (!active) return;
        setError(sessionError);
        setLoading(false);
      });

    const result = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });

    subscription = result.data.subscription;

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      role: session?.user?.app_metadata?.role || 'user',
      isAdmin: session?.user?.app_metadata?.role === 'admin',
      loading,
      error,
      signIn: async (email, password) => {
        const client = getSupabase();
        const result = await client.auth.signInWithPassword({
          email,
          password,
        });
        return result;
      },
      signOut: async () => {
        const client = getSupabase();
        return client.auth.signOut();
      },
    }),
    [error, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return value;
}
