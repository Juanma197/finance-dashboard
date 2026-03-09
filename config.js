/**
 * Wealth OS - Supabase configuration
 *
 * Set supabaseUrl and supabaseAnonKey to enable cloud sync.
 * If either is empty, the app runs in local-only mode (localStorage).
 *
 * Option 1: Set window.WEALTH_OS_CONFIG before this script runs, e.g. in index.html:
 *   <script>
 *     window.WEALTH_OS_CONFIG = { supabaseUrl: "https://xxx.supabase.co", supabaseAnonKey: "your-key" };
 *   </script>
 *
 * Option 2: Edit the defaults below.
 *
 * See SUPABASE_SETUP.md for Vercel deployment.
 */
(function () {
  const cfg = (typeof window !== "undefined" && window.WEALTH_OS_CONFIG) || {};
  window.WEALTH_OS_CONFIG = {
    supabaseUrl: cfg.supabaseUrl || "",
    supabaseAnonKey: cfg.supabaseAnonKey || "",
    get isSupabaseEnabled() {
      return !!(this.supabaseUrl && this.supabaseAnonKey);
    },
  };
})();
