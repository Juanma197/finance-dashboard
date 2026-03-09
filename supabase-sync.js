/**
 * Wealth OS - Supabase Sync Layer
 *
 * Loads data from Supabase when logged in, writes updates to Supabase.
 * Falls back to localStorage when offline or not configured.
 * All tables are scoped by user_id (RLS enforced).
 */
(function (global) {
  const KEYS = {
    accounts: "wealth-os-accounts",
    transactions: "wealth-os-transactions",
    investments: "wealth-os-investments",
    properties: "wealth-os-properties",
    liabilities: "wealth-os-liabilities",
    insurance: "wealth-os-insurance",
    recurring: "wealth-os-recurring",
    business: "wealth-os-business",
    tax: "wealth-os-tax",
    goals: "wealth-os-goals",
    settings: "wealth-os-settings",
    netWorthSnapshots: "wealth-os-networth-snapshots",
    monthlySnapshots: "wealth-os-monthly-snapshots",
    transfers: "wealth-os-transfers",
    reminders: "wealth-os-reminders",
    ukAllowances: "wealth-os-uk-allowances",
  };

  const ARRAY_TABLES = [
    "accounts", "transactions", "transfers", "goals", "reminders",
    "recurring_items", "properties", "liabilities", "insurance", "networth_snapshots"
  ];

  const TABLE_MAP = {
    accounts: "accounts",
    transactions: "transactions",
    investments: "investments",
    properties: "properties",
    liabilities: "liabilities",
    insurance: "insurance",
    recurring: "recurring_items",
    business: "business",
    tax: "tax",
    goals: "goals",
    settings: "settings",
    netWorthSnapshots: "networth_snapshots",
    monthlySnapshots: "snapshots",
    transfers: "transfers",
    reminders: "reminders",
    ukAllowances: "uk_allowances",
  };

  const SINGLETON_KEYS = ["settings", "business", "tax", "ukAllowances", "investments"];

  function getSupabase() {
    return global.WealthOSSupabase?.getClient?.() || null;
  }

  function storageRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearAppStorage() {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  }

  async function loadFromSupabase() {
    const sb = getSupabase();
    const user = (await global.WealthOSAuth?.getUser?.()) || null;
    if (!sb || !user?.id) return null;

    const out = {};

    for (const [dataKey, tableName] of Object.entries(TABLE_MAP)) {
      try {
        if (SINGLETON_KEYS.includes(dataKey)) {
          const { data, error } = await sb.from(tableName).select("data").eq("user_id", user.id).maybeSingle();
          if (error && error.code !== "PGRST116") {
            console.warn("Supabase load error:", tableName, error);
            continue;
          }
          out[dataKey] = (data?.data && typeof data.data === "object") ? data.data : {};
        } else {
          const { data, error } = await sb.from(tableName).select("data").eq("user_id", user.id);
          if (error) {
            if (error.code === "42P01") continue;
            console.warn("Supabase load error:", tableName, error);
            continue;
          }
          const arr = Array.isArray(data) ? data.map((r) => r.data).filter(Boolean) : [];
          out[dataKey] = arr;
        }
      } catch (e) {
        console.warn("Supabase load exception:", tableName, e);
      }
    }

    return out;
  }

  async function saveToSupabase(dataKey, value) {
    const sb = getSupabase();
    const user = (await global.WealthOSAuth?.getUser?.()) || null;
    if (!sb || !user?.id) return { ok: false };

    const tableName = TABLE_MAP[dataKey];
    if (!tableName) return { ok: false };

    try {
      if (SINGLETON_KEYS.includes(dataKey)) {
        const payload = typeof value === "object" && value !== null ? value : {};
        const { error } = await sb.from(tableName).upsert(
          { user_id: user.id, data: payload },
          { onConflict: "user_id" }
        );
        return { ok: !error };
      }

      const arr = Array.isArray(value) ? value : [];
      await sb.from(tableName).delete().eq("user_id", user.id);
      for (const item of arr) {
        const { error } = await sb.from(tableName).insert({ user_id: user.id, data: item });
        if (error) {
          console.warn("Supabase insert error:", tableName, error);
        }
      }
      return { ok: true };
    } catch (e) {
      console.warn("Supabase save error:", dataKey, e);
      return { ok: false };
    }
  }

  function saveWithSync(dataKey, value) {
    const key = KEYS[dataKey];
    if (key) storageWrite(key, value);
    if (getSupabase()) {
      saveToSupabase(dataKey, value).catch(() => {});
    }
  }

  async function loadWithSync() {
    const user = await global.WealthOSAuth?.getUser?.();
    const sb = getSupabase();

    if (sb && user) {
      try {
        const remote = await loadFromSupabase();
        if (remote) {
          clearAppStorage();
          Object.entries(remote).forEach(([k, v]) => {
            if (v !== undefined && KEYS[k]) storageWrite(KEYS[k], v);
          });
          return { source: "supabase", data: remote };
        }
      } catch (e) {
        console.warn("[WealthOS] Supabase load failed, using localStorage:", e);
      }
    }

    return { source: "local", data: null };
  }

  global.WealthOSSync = {
    loadFromSupabase,
    saveToSupabase,
    saveWithSync,
    loadWithSync,
    clearAppStorage,
    KEYS,
    TABLE_MAP,
  };
})(typeof window !== "undefined" ? window : globalThis);
