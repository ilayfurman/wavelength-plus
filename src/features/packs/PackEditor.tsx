import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Spectrum = { id: string; left_label: string; right_label: string }

export function PackEditor({ packId }: { packId: string }) {
  const [spectrums, setSpectrums] = useState<Spectrum[]>([])
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')

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

  return (
    <div>
      <ul>
        {spectrums.map((s) => (
          <li key={s.id}>
            {s.left_label} ↔ {s.right_label}
          </li>
        ))}
      </ul>
      <label htmlFor="left-label">Left label</label>
      <input id="left-label" value={left} onChange={(e) => setLeft(e.target.value)} />
      <label htmlFor="right-label">Right label</label>
      <input id="right-label" value={right} onChange={(e) => setRight(e.target.value)} />
      <button onClick={addSpectrum}>Add spectrum</button>
    </div>
  )
}
