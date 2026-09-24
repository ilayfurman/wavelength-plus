import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'

const CODE_LENGTH = 6

const inputStyle = {
  width: '100%',
  height: 52,
  padding: '0 16px',
  borderRadius: 14,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  boxSizing: 'border-box' as const,
}

const digitBoxStyle = {
  width: 44,
  height: 52,
  borderRadius: 14,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 22,
  fontWeight: 600,
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
}

export function SignIn() {
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [codeSent, setCodeSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])

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
    const code = digits.join('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error) setError(error.message)
  }

  function handleDigitChange(index: number, value: string) {
    const char = value.slice(-1).replace(/[^0-9]/g, '')
    setDigits((prev) => {
      const next = [...prev]
      next[index] = char
      return next
    })
    if (char && index < CODE_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus()
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && digits[index] === '' && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  function handleDigitPaste(index: number, e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '')
    if (!pasted) return
    e.preventDefault()
    setDigits((prev) => {
      const next = [...prev]
      let cursor = index
      for (const char of pasted) {
        if (cursor >= CODE_LENGTH) break
        next[cursor] = char
        cursor += 1
      }
      const focusIndex = Math.min(cursor, CODE_LENGTH - 1)
      digitRefs.current[focusIndex]?.focus()
      return next
    })
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          padding: '32px 20px',
          boxSizing: 'border-box',
        }}
      >
        <Logo variant="stacked" size="xl" />

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!codeSent ? (
            <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label htmlFor="email" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <Btn kind="primary" size="lg" label="Send code" />
            </form>
          ) : (
            <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span id="otp-group-label" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  6-digit code
                </span>
                <div
                  role="group"
                  aria-labelledby="otp-group-label"
                  style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      aria-label={`Code digit ${index + 1}`}
                      ref={(el) => {
                        digitRefs.current[index] = el
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={(e) => handleDigitPaste(index, e)}
                      style={digitBoxStyle}
                    />
                  ))}
                </div>
              </div>
              <Btn kind="primary" size="lg" label="Verify" />
            </form>
          )}
          {error && (
            <p role="alert" style={{ color: 'var(--comets)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
