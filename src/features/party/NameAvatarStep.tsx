import { useState } from 'react'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'
import { AvatarPicker } from './AvatarPicker'

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

interface NameAvatarStepProps {
  initialName: string
  initialAvatar: string
  onContinue: (name: string, avatar: string) => void
}

export function NameAvatarStep({ initialName, initialAvatar, onContinue }: NameAvatarStepProps) {
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)

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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onContinue(name, avatar)
          }}
          style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="display-name" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              Name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>Avatar</span>
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>

          <Btn kind="primary" size="lg" label="Continue" />
        </form>
      </div>
    </div>
  )
}
