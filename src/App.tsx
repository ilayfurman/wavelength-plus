import { useEffect, useState } from 'react'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { SignIn } from './features/auth/SignIn'
import { Home } from './features/home/Home'
import { AvatarPicker } from './features/party/AvatarPicker'
import { createParty } from './features/party/CreateParty'
import { joinParty } from './features/party/JoinParty'
import { Lobby } from './features/party/Lobby'
import { supabase } from './lib/supabaseClient'

type Route = { name: 'home' } | { name: 'join'; roomCode: string } | { name: 'lobby'; partyId: string; roomCode: string; isHost: boolean }

function Gate() {
  const { session, loading } = useAuth()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [displayName, setDisplayName] = useState('Player')
  const [avatar, setAvatar] = useState('🌮')

  useEffect(() => {
    const hash = window.location.hash.match(/^#\/join\/([A-Z]{4})$/i)
    if (hash) setRoute({ name: 'join', roomCode: hash[1].toUpperCase() })
  }, [])

  if (loading) return <div data-testid="app-root">Loading…</div>
  if (!session) return <div data-testid="app-root"><SignIn /></div>

  async function handleCreate() {
    const party = await createParty()
    const player = await joinParty(party.room_code, displayName, avatar)
    setRoute({ name: 'lobby', partyId: party.id, roomCode: party.room_code, isHost: true })
    void player
  }

  async function handleJoin(roomCode: string) {
    const player = (await joinParty(roomCode, displayName, avatar)) as { party_id: string }
    setRoute({ name: 'lobby', partyId: player.party_id, roomCode, isHost: false })
  }

  return (
    <div data-testid="app-root">
      {route.name === 'home' || route.name === 'join' ? (
        <div>
          <label>
            Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <AvatarPicker value={avatar} onChange={setAvatar} />
          <Home onCreate={handleCreate} onJoin={(code) => handleJoin(code)} />
        </div>
      ) : (
        <Lobby
          partyId={route.partyId}
          roomCode={route.roomCode}
          isHost={route.isHost}
          onStartGame={async () => {
            await supabase.rpc('start_game', { p_party_id: route.partyId })
          }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
