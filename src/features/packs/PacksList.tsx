import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Starfield } from '../../components/Starfield'
import { Btn } from '../../components/Btn'

type Pack = { id: string; name: string; share_code: string }

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

const cardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 16,
  padding: 24,
  borderRadius: 22,
  border: '1px solid var(--surface-border)',
  background: 'var(--surface)',
  boxSizing: 'border-box' as const,
}

export function PacksList({ onOpenPack }: { onOpenPack: (packId: string) => void }) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [newName, setNewName] = useState('')

  async function loadPacks() {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data } = await supabase.from('packs').select('id, name, share_code').eq('owner_id', userId)
    setPacks((data as Pack[]) ?? [])
  }

  useEffect(() => {
    loadPacks()
  }, [])

  async function createPack() {
    const { data } = await supabase.rpc('create_pack', { p_name: newName }).single()
    setNewName('')
    await loadPacks()
    if (data) onOpenPack((data as Pack).id)
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
          padding: '32px 20px',
          boxSizing: 'border-box',
          gap: 24,
          maxWidth: 520,
          margin: '0 auto',
        }}
      >
        <h2 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>My packs</h2>

        <div style={cardStyle}>
          {packs.length === 0 && (
            <p style={{ margin: 0, color: 'var(--text-subtle)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              No packs yet. Create one below.
            </p>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {packs.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onOpenPack(p.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,.04)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  <span>{p.name}</span>
                  <span
                    style={{
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      letterSpacing: '.08em',
                    }}
                  >
                    {p.share_code}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="new-pack-name" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              New pack name
            </label>
            <input id="new-pack-name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          </div>
          <Btn kind="primary" size="md" label="Create pack" onClick={createPack} />
        </div>
      </div>
    </div>
  )
}
