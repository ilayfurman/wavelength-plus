import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Pack = { id: string; name: string; share_code: string }

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
    <div>
      <h2>My packs</h2>
      <ul>
        {packs.map((p) => (
          <li key={p.id}>
            <button onClick={() => onOpenPack(p.id)}>{p.name}</button> ({p.share_code})
          </li>
        ))}
      </ul>
      <label htmlFor="new-pack-name">New pack name</label>
      <input id="new-pack-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      <button onClick={createPack}>Create pack</button>
    </div>
  )
}
