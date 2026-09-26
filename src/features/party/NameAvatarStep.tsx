import { useState } from 'react'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'
import { AvatarPicker, AVATAR_BG } from './AvatarPicker'

const pillInputStyle = {
  flex: 1,
  minWidth: 0,
  height: 58,
  borderRadius: 999,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  padding: '0 22px',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 19,
  fontWeight: 600,
  outline: 'none',
  boxSizing: 'border-box' as const,
}

interface NameAvatarStepProps {
  initialName: string
  initialAvatar: string
  onContinue: (name: string, avatar: string) => void
  title?: string
  continueLabel?: string
  onBack?: () => void
}

export function NameAvatarStep({
  initialName,
  initialAvatar,
  onContinue,
  title = 'Who are you tonight?',
  continueLabel = 'Continue',
  onBack,
}: NameAvatarStepProps) {
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          maxWidth: 480,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 20px',
          gap: 32,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                position: 'absolute',
                left: 0,
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 26,
                lineHeight: 1,
                cursor: 'pointer',
                padding: 4,
              }}
            >
              ‹
            </button>
          )}
          <Logo variant="inline" size="sm" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onContinue(name, avatar)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <h1 style={{ margin: '10px 0 0', font: '700 32px/1.1 var(--font-display)', color: 'var(--text)' }}>
            {title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                flex: 'none',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: AVATAR_BG[avatar] ?? 'var(--violet)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                boxShadow: '0 0 0 3px #120F2E, 0 0 0 5px var(--gold)',
              }}
            >
              {avatar}
            </span>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={pillInputStyle}
            />
          </div>
          <p style={{ margin: '-6px 0 0 78px', font: '400 13px var(--font-body)', color: 'var(--text-muted)' }}>
            Pre-filled from last time. Joke names welcome.
          </p>

          <div style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.16em', color: 'var(--text-muted)', marginTop: 10 }}>
            PICK AN AVATAR
          </div>
          <AvatarPicker value={avatar} onChange={setAvatar} />

          <div style={{ marginTop: 8 }}>
            <Btn kind="primary" size="lg" label={continueLabel} />
          </div>
        </form>
      </div>
    </div>
  )
}
