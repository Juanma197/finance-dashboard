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
  const win = typeof window !== "undefined" ? window : {};
  const cfg = win.WEALTH_OS_CONFIG || {};
  const env = win.__ENV__ || {};
  window.WEALTH_OS_CONFIG = {
    supabaseUrl: cfg.supabaseUrl || env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: cfg.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    get isSupabaseEnabled() {
      return !!(this.supabaseUrl && this.supabaseAnonKey);
    },
  };
})();
