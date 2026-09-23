import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

type Player = { id: string; display_name: string; avatar: string; team_id: string | null }

export function Lobby({
  partyId,
  roomCode,
  isHost,
  onStartGame,
}: {
  partyId: string
  roomCode: string
  isHost: boolean
  onStartGame: () => void
}) {
  const [players, setPlayers] = useState<Player[]>([])
  const [teamSize, setTeamSize] = useState(2)
  const [rounds, setRounds] = useState(3)

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('id, display_name, avatar, team_id')
      .eq('party_id', partyId)
      .order('created_at')
    setPlayers((data as Player[]) ?? [])
  }

  useEffect(() => {
    loadPlayers()
    const channel = supabase
      .channel(`lobby:${partyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `party_id=eq.${partyId}` }, () => {
        loadPlayers()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  async function reshuffle() {
    await supabase.rpc('shuffle_teams', { p_party_id: partyId })
  }

  async function saveSettings() {
    await supabase.rpc('set_party_settings', {
      p_party_id: partyId,
      p_team_size: teamSize,
      p_rounds: rounds,
      p_team_mode: 'random',
      p_noises_enabled: true,
    })
  }

  return (
    <div>
      <h2>
        Room code: <span>{roomCode}</span>
      </h2>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            <span>{p.avatar}</span> <span>{p.display_name}</span>
          </li>
        ))}
      </ul>
      {isHost && (
        <div>
          <label>
            Team size
            <input
              type="number"
              min={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              onBlur={saveSettings}
            />
          </label>
          <label>
            Rounds
            <input
              type="number"
              min={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              onBlur={saveSettings}
            />
          </label>
          <button onClick={reshuffle}>Reshuffle</button>
          <button onClick={onStartGame}>Start game</button>
        </div>
      )}
    </div>
  )
}
