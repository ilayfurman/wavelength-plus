import { useRef, useState } from 'react'
import { Btn } from '../../components/Btn'

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

function buildPrompt(topic: string): string {
  return `Give me 25 cards for a party game where each card is two opposite ends of a scale, about "${topic}". Reply with one card per line, formatted exactly as: Left | Right. No numbering, no extra text.`
}

export function AiPromptSheet({ onClose }: { onClose?: () => void }) {
  const [topic, setTopic] = useState('')
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        borderRadius: 22,
        background: 'var(--sheet)',
        border: '1px solid var(--surface-border)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Ask an AI</h3>
        {onClose && (
          <Btn kind="ghost" size="sm" label="Close" onClick={onClose} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="ai-topic" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Topic
        </label>
        <input
          id="ai-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. beer, movies, road trips"
          style={inputStyle}
        />
      </div>

      <Btn kind="primary" size="md" label="Generate" onClick={generate} />

      {prompt && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <pre
            ref={preRef}
            style={{
              margin: 0,
              padding: 16,
              borderRadius: 14,
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {prompt}
          </pre>
          <Btn kind="secondary" size="sm" label={copied ? 'Copied!' : 'Copy'} onClick={copy} />
        </div>
      )}
    </div>
  )
}
