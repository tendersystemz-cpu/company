import { createClient } from '@supabase/supabase-js';

export function getSupabaseEnvStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || null;

  return {
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    urlHost: url ? new URL(url).host : null,
    keyPrefix: key ? `${key.slice(0, 8)}...` : null
  };
}

export function hasSupabaseEnv() {
  const env = getSupabaseEnvStatus();
  return env.hasUrl && env.hasKey;
}

export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
