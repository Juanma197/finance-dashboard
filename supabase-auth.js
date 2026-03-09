/**
 * Wealth OS - Supabase Authentication
 *
 * Handles sign in, sign up, sign out, and session detection.
 * Uses Supabase Auth. Only active when Supabase is configured.
 */
(function (global) {
  function getSupabase() {
    return global.WealthOSSupabase?.getClient?.() || null;
  }

  async function getSession() {
    const sb = getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function signIn(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: { message: "Supabase not configured" } };
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signUp(email, password) {
    const sb = getSupabase();
    if (!sb) return { error: { message: "Supabase not configured" } };
    const { data, error } = await sb.auth.signUp({ email, password });
    return { data, error };
  }

  async function signOut() {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  }

  function onAuthStateChange(callback) {
    const sb = getSupabase();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange(callback);
    return data?.subscription?.unsubscribe || (() => {});
  }

  global.WealthOSAuth = {
    getSession,
    getUser,
    signIn,
    signUp,
    signOut,
    onAuthStateChange,
  };
})(typeof window !== "undefined" ? window : globalThis);
