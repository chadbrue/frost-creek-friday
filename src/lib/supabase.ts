import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _admin: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _admin
}

function makeProxy(getter: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_, prop) {
      const client = getter()
      const value = (client as unknown as Record<string | symbol, unknown>)[prop]
      // Bind functions so `this` is always the real client, not the proxy
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value
    },
  })
}

export const supabase = makeProxy(getSupabase)
export const supabaseAdmin = makeProxy(getSupabaseAdmin)
