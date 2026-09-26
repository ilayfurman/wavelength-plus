import { useRef, useState } from 'react'
import { Btn } from '../../components/Btn'

function buildPrompt(topic: string): string {
  return `Give me 25 cards for a party game where each card is two opposite ends of a scale, about "${topic}". Reply with one card per line, formatted exactly as: Left | Right. No numbering, no extra text.`
}

export function AiPromptSheet({ onClose }: { onClose?: () => void }) {
  const [topic, setTopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLDivElement>(null)

  function generate() {
    setPrompt(buildPrompt(topic))
    setCopied(false)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
    } catch {
      const selection = window.getSelection?.()
      const node = preRef.current
      if (selection && node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      setCopied(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(5,4,14,.65)' }} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxWidth: 480,
          margin: '0 auto',
          borderRadius: '30px 30px 0 0',
          background: 'linear-gradient(180deg,#221B4F,#130F30)',
          borderTop: '1px solid rgba(200,180,255,.2)',
          padding: '10px 18px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.25)', alignSelf: 'center' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ font: '700 22px/1 var(--font-body)', color: 'var(--text)' }}>Make a pack with AI</span>
          <span style={{ font: '400 14px/1.4 var(--font-body)', color: 'var(--text-muted)' }}>
            Copy this into ChatGPT, Claude or similar, then paste the reply back here.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ font: '600 11px/1 var(--font-body)', letterSpacing: '.16em', color: 'var(--text-muted)', paddingLeft: 6 }}>
            TOPIC
          </span>
          <input
            aria-label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 90s cartoons"
            style={{
              height: 52,
              borderRadius: 999,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              padding: '0 20px',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontSize: 17,
              fontWeight: 500,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Btn kind="primary" size="md" label="Generate" onClick={generate} />

        {prompt && (
          <>
            <div
              ref={preRef}
              style={{
                borderRadius: 18,
                padding: '14px 16px',
                background: 'var(--input-bg)',
                border: '1px solid rgba(255,209,102,.22)',
                font: '500 13px/1.55 var(--font-mono)',
                color: '#E9E2CF',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {prompt}
            </div>
            <Btn kind="secondary" size="sm" label={copied ? 'Copied!' : 'Copy'} onClick={copy} />
          </>
        )}

        <Btn kind="ghost" size="sm" label="I've got my list, paste it" onClick={onClose} />
      </div>
    </div>
  )
}
