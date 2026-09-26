// Supabase RPC errors (PostgrestError) are plain objects with a `message`
// field, not real Error instances — a bare `err instanceof Error` check
// always misses them and silently falls back to a generic message, hiding
// the actual reason (e.g. a raised SQL exception's text) from the user.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message
  }
  return fallback
}
