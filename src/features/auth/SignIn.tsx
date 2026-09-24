import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setCodeSent(true)
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) setError(error.message)
  }

  return (
    <div>
      <h1>On the Retsef</h1>
      {!codeSent ? (
        <form onSubmit={sendCode}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Send code</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <label htmlFor="otp">6-digit code</label>
          <input id="otp" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button type="submit">Verify</button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  )
}
