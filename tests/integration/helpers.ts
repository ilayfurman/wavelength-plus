import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const LOCAL_URL = 'http://127.0.0.1:54321'
// This is the well-known local Supabase anon key printed by `supabase start`.
const LOCAL_ANON_KEY = process.env.SUPABASE_LOCAL_ANON_KEY!

export function anonClient(): SupabaseClient {
  return createClient(LOCAL_URL, LOCAL_ANON_KEY)
}

export async function signUpAndSignIn(): Promise<SupabaseClient> {
  const client = anonClient()
  const email = `test-user-${randomUUID()}@example.com`
  const password = 'password123!'
  const { error: signUpError } = await client.auth.signUp({ email, password })
  if (signUpError) throw signUpError
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return client
}
