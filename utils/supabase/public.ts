import { createClient } from "@supabase/supabase-js";
import { LOAD_TIMEOUT_MS } from "@/lib/with-timeout";

// Cancels a request that outlives the load timeout, on top of any signal supabase passes in.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(LOAD_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

// Cookie-free client for public reads, so pages using it can be statically regenerated.
export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}
