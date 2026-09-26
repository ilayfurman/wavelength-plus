import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Starfield } from '../../components/Starfield'
import { Btn } from '../../components/Btn'

type Pack = { id: string; name: string; share_code: string; card_count?: number }

const codePillStyle = {
  padding: '8px 12px',
  borderRadius: 999,
  background: 'rgba(8,6,24,.6)',
  border: '1px solid rgba(200,180,255,.14)',
  font: '700 13px/1 var(--font-mono)',
  letterSpacing: '.12em',
  color: 'var(--gold)',
}

export function PacksList({
  onOpenPack,
  onBack,
}: {
  onOpenPack: (packId: string) => void
  onBack?: () => void
}) {
  const [packs, setPacks] = useState<Pack[]>([])
  const [addCode, setAddCode] = useState('')
  const [newName, setNewName] = useState('')

  async function loadPacks() {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data } = await supabase
      .from('packs')
      .select('id, name, share_code, spectrums(count)')
      .eq('owner_id', userId)
    setPacks(
      ((data as (Pack & { spectrums?: { count: number }[] })[]) ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        share_code: p.share_code,
        card_count: p.spectrums?.[0]?.count ?? 0,
      }))
    )
  }

  useEffect(() => {
    loadPacks()
  }, [])

  async function createPack() {
    const { data } = await supabase.rpc('create_pack', { p_name: newName.trim() || 'New pack' }).single()
    setNewName('')
    await loadPacks()
    if (data) onOpenPack((data as Pack).id)
  }

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 16px',
          boxSizing: 'border-box',
          gap: 12,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(200,180,255,.16)',
                color: 'var(--text)',
                fontSize: 22,
                lineHeight: 1,
                cursor: 'pointer',
                flex: 'none',
              }}
            >
              ‹
            </button>
          )}
          <span style={{ font: '700 26px/1 var(--font-body)', color: 'var(--text)' }}>My packs</span>
        </div>

        <div
          style={{
            borderRadius: 22,
            padding: 16,
            background: 'linear-gradient(135deg, rgba(255,209,102,.2), rgba(255,111,163,.12) 55%, rgba(140,107,255,.16))',
            border: '1px solid rgba(255,209,102,.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ font: '700 18px/1 var(--font-body)', color: 'var(--text)' }}>Starter deck</span>
            <span style={{ font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}>
              100 cards · always included
            </span>
          </div>
          <span
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              background: 'rgba(255,209,102,.16)',
              font: '600 11px/1 var(--font-body)',
              letterSpacing: '.1em',
              color: 'var(--gold)',
            }}
          >
            BUILT-IN
          </span>
        </div>

        {packs.map((p) => (
          <button
            key={p.id}
            onClick={() => onOpenPack(p.id)}
            style={{
              borderRadius: 22,
              padding: '14px 16px',
              background: 'linear-gradient(180deg, rgba(52,40,110,.55), rgba(24,18,56,.6))',
              border: '1px solid rgba(200,180,255,.12)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <span style={{ font: '600 17px/1 var(--font-body)', color: 'var(--text)' }}>{p.name}</span>
              <span style={{ font: '400 13px/1 var(--font-body)', color: 'var(--text-muted)' }}>
                {p.card_count ?? 0} cards
              </span>
            </div>
            <span style={codePillStyle}>{p.share_code}</span>
            <span style={{ font: '500 20px/1 var(--font-body)', color: 'var(--text-muted)' }}>›</span>
          </button>
        ))}

        <div
          style={{
            borderRadius: 22,
            padding: 14,
            background: 'rgba(255,255,255,.03)',
            border: '1px dashed rgba(200,180,255,.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.16em', color: 'var(--text-muted)' }}>
            ADD A FRIEND'S PACK
          </span>
          <p style={{ margin: 0, font: '400 13px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            Coming soon — for now, a host can attach a friend's pack by code from the lobby.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={addCode}
              onChange={(e) => setAddCode(e.target.value.toUpperCase())}
              placeholder="Share code"
              aria-label="Share code"
              disabled
              style={{
                flex: 1,
                minWidth: 0,
                height: 50,
                borderRadius: 999,
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                padding: '0 18px',
                color: 'var(--text)',
                font: '600 16px/1 var(--font-mono)',
                letterSpacing: '.14em',
                outline: 'none',
                textTransform: 'uppercase',
                boxSizing: 'border-box',
                opacity: 0.5,
              }}
            />
            <div style={{ width: 84 }}>
              <Btn kind="accent" size="sm" label="Add" disabled />
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="new-pack-name" style={{ font: '400 12px/1 var(--font-body)', color: 'var(--text-muted)', paddingLeft: 6 }}>
            New pack name
          </label>
          <input
            id="new-pack-name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Food Fights"
            style={{
              height: 50,
              borderRadius: 999,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              padding: '0 18px',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <Btn kind="primary" size="lg" label="Create pack" onClick={createPack} />
      </div>
    </div>
  )
}
