import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Starfield } from '../../components/Starfield'
import { Btn } from '../../components/Btn'
import { parsePasteLines } from './pasteImport'
import { AiPromptSheet } from './AiPromptSheet'

type Spectrum = { id: string; left_label: string; right_label: string }
type Mode = 'one' | 'paste'

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

const statusLabel: Record<'ok' | 'needs-format' | 'duplicate', string> = {
  ok: '✓',
  'needs-format': 'Needs Left | Right',
  duplicate: 'Already in pack',
}

export function PackEditor({ packId, onBack }: { packId: string; onBack?: () => void }) {
  const [spectrums, setSpectrums] = useState<Spectrum[]>([])
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [mode, setMode] = useState<Mode>('one')
  const [pasteText, setPasteText] = useState('')
  const [importing, setImporting] = useState(false)
  const [showAiSheet, setShowAiSheet] = useState(false)

  async function load() {
    const { data } = await supabase.from('spectrums').select('id, left_label, right_label').eq('pack_id', packId)
    setSpectrums((data as Spectrum[]) ?? [])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId])

  async function addSpectrum() {
    await supabase.rpc('add_spectrum', { p_pack_id: packId, p_left_label: left, p_right_label: right })
    setLeft('')
    setRight('')
    await load()
  }

  const parsed = useMemo(
    () =>
      parsePasteLines(
        pasteText,
        spectrums.map((s) => ({ left_label: s.left_label, right_label: s.right_label }))
      ),
    [pasteText, spectrums]
  )

  async function importPasted() {
    setImporting(true)
    try {
      const remainingLines: string[] = []
      let validIndex = 0
      for (const r of parsed.results) {
        if (r.status !== 'ok') {
          // Keep lines that were never imported (bad format / duplicate) so the
          // user can see and fix them instead of losing them silently.
          remainingLines.push(r.line)
          continue
        }
        const pair = parsed.valid[validIndex]
        validIndex += 1
        const { error } = await supabase.rpc('add_spectrum', {
          p_pack_id: packId,
          p_left_label: pair.left,
          p_right_label: pair.right,
        })
        if (error) {
          // Failed to import (e.g. network/RPC error) — keep the line so it isn't lost.
          remainingLines.push(r.line)
        }
      }
      setPasteText(remainingLines.join('\n'))
      await load()
    } finally {
      setImporting(false)
    }
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
        {onBack && <Btn kind="ghost" size="sm" label="← Back to packs" onClick={onBack} />}

        <h2 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Pack editor</h2>

        <div style={cardStyle}>
          <h4 style={{ margin: 0, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
            Spectrums ({spectrums.length})
          </h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {spectrums.map((s) => (
              <li
                key={s.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,.04)',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {s.left_label} ↔ {s.right_label}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind={mode === 'one' ? 'primary' : 'secondary'} size="sm" label="Add one" onClick={() => setMode('one')} />
          <Btn kind={mode === 'paste' ? 'primary' : 'secondary'} size="sm" label="Paste a list" onClick={() => setMode('paste')} />
        </div>

        {mode === 'one' && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="left-label" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Left label
              </label>
              <input id="left-label" value={left} onChange={(e) => setLeft(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="right-label" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                Right label
              </label>
              <input id="right-label" value={right} onChange={(e) => setRight(e.target.value)} style={inputStyle} />
            </div>
            <Btn kind="primary" size="md" label="Add spectrum" onClick={addSpectrum} />
          </div>
        )}

        {mode === 'paste' && (
          <div style={cardStyle}>
            <label htmlFor="paste-list" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
              Paste a list (one card per line: Left | Right)
            </label>
            <textarea
              id="paste-list"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              placeholder={'Awful beer | Great beer\nCold vs Hot'}
              style={{
                ...inputStyle,
                height: 'auto',
                padding: 16,
                fontFamily: 'var(--font-mono)',
                resize: 'vertical' as const,
              }}
            />

            {pasteText.trim().length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parsed.results.map((r, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,.03)',
                      color: r.status === 'ok' ? 'var(--text)' : 'var(--text-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                    }}
                  >
                    <span>{r.line}</span>
                    <span>{statusLabel[r.status]}</span>
                  </li>
                ))}
              </ul>
            )}

            <Btn
              kind="primary"
              size="md"
              label={`Add ${parsed.valid.length} spectrums`}
              disabled={parsed.valid.length === 0 || importing}
              onClick={importPasted}
            />
          </div>
        )}

        <Btn kind="ghost" size="sm" label="Need ideas? Ask an AI" onClick={() => setShowAiSheet(true)} />

        {showAiSheet && <AiPromptSheet onClose={() => setShowAiSheet(false)} />}
      </div>
    </div>
  )
}
