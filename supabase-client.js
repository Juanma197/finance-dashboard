/**
 * Wealth OS - Supabase client
 *
 * Creates the Supabase client when config is present.
 * Returns null if Supabase is not configured (local-only mode).
 */
(function (global) {
  let client = null;

  function getClient() {
    if (client) return client;
    const config = global.WEALTH_OS_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
    const supabaseLib = global.supabase || global.supabaseClient;
    if (supabaseLib && typeof supabaseLib.createClient === "function") {
      client = supabaseLib.createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
    return client;
  }

  global.WealthOSSupabase = {
    getClient,
    isEnabled: function () {
      return !!getClient();
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
