// ============================================================
// Supabase client config
// Fill these in from: Supabase Dashboard → Project Settings → API
// The "anon" key is safe to expose in frontend code — it only has the
// permissions your RLS policies grant it. NEVER put the service_role key here.
// ============================================================
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';

// "Remember me" support: session data is stored in localStorage (persists
// after the browser closes) unless the user unchecks "remember me", in which
// case we use sessionStorage (cleared when the tab/browser closes).
const REMEMBER_KEY = 'sb-remember-me';
function activeStorage() {
  return localStorage.getItem(REMEMBER_KEY) === 'false' ? window.sessionStorage : window.localStorage;
}
const customStorage = {
  getItem: (key) => activeStorage().getItem(key),
  setItem: (key, value) => activeStorage().setItem(key, value),
  removeItem: (key) => activeStorage().removeItem(key),
};

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: customStorage, persistSession: true, autoRefreshToken: true },
});
