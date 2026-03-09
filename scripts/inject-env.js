/**
 * Build-time script to inject Vercel env vars into config.js
 * Run: node scripts/inject-env.js
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel
 */
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.js");
let config = fs.readFileSync(configPath, "utf8");

const url = (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

config = config.replace(
  /supabaseUrl: cfg\.supabaseUrl \|\| env\.VITE_SUPABASE_URL \|\| env\.NEXT_PUBLIC_SUPABASE_URL \|\| ""/,
  `supabaseUrl: cfg.supabaseUrl || env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "${url}"`
);
config = config.replace(
  /supabaseAnonKey: cfg\.supabaseAnonKey \|\| env\.VITE_SUPABASE_ANON_KEY \|\| env\.NEXT_PUBLIC_SUPABASE_ANON_KEY \|\| ""/,
  `supabaseAnonKey: cfg.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "${key}"`
);

fs.writeFileSync(configPath, config);
console.log("Config updated with env vars");
