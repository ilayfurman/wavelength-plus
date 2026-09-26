const AVATARS = ['🌮', '😬', '🐝', '🦄', '🦊', '🐙', '🌶️', '🎈', '🧠', '🐸', '🦁', '🍩']

export const AVATAR_BG: Record<string, string> = {
  '🌮': '#7ED3A4',
  '😬': '#F59BC0',
  '🐝': '#F6D060',
  '🦄': '#B889E8',
  '🦊': '#F4A259',
  '🐙': '#F6D060',
  '🌶️': '#FF8FB8',
  '🎈': '#5CC8F0',
  '🧠': '#F59BC0',
  '🐸': '#5CC8F0',
  '🦁': '#F4A259',
  '🍩': '#F59BC0',
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose an avatar"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '14px 10px', justifyItems: 'center' }}
    >
      {AVATARS.map((a) => {
        const selected = value === a
        return (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(a)}
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              border: 'none',
              background: AVATAR_BG[a] ?? 'var(--violet)',
              fontSize: 34,
              cursor: 'pointer',
              boxShadow: selected ? '0 0 0 2px #1A1440, 0 0 0 4px var(--gold)' : 'none',
              opacity: selected ? 1 : 0.7,
              transform: selected ? 'scale(1.05)' : 'scale(1)',
              transition: 'all .15s',
            }}
          >
            {a}
          </button>
        )
      })}
    </div>
  )
}
