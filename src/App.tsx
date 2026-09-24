import { useEffect, useState } from 'react'
import { AuthProvider } from './features/auth/AuthProvider'
import { useAuth } from './features/auth/useAuth'
import { SignIn } from './features/auth/SignIn'
import { Home } from './features/home/Home'
import { NameAvatarStep } from './features/party/NameAvatarStep'
import { createParty } from './features/party/CreateParty'
import { joinParty } from './features/party/JoinParty'
import { Lobby } from './features/party/Lobby'
import { GameScreen } from './features/game/GameScreen'
import { FinalScoreboard } from './features/game/FinalScoreboard'
import { PacksList } from './features/packs/PacksList'
import { PackEditor } from './features/packs/PackEditor'
import { supabase } from './lib/supabaseClient'
import { Starfield } from './components/Starfield'
import { Logo } from './components/Logo'

type Route =
  | { name: 'home' }
  | { name: 'join'; roomCode: string }
  | { name: 'lobby'; partyId: string; roomCode: string; isHost: boolean }
  | { name: 'packs' }
  | { name: 'packEditor'; packId: string }

function Splash() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Starfield />
      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '32px 20px',
          boxSizing: 'border-box',
        }}
      >
        <Logo variant="icon" size="lg" />
        <Logo variant="stacked" size="xl" />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: 14, margin: 0 }}>
          The Guess-the-Dial Party Game
        </p>
      </div>
    </div>
  )
}

function PartyRoom({
  partyId,
  roomCode,
  isHost,
  onBackToHome,
}: {
  partyId: string
  roomCode: string
  isHost: boolean
  onBackToHome: () => void
}) {
  const [status, setStatus] = useState<'lobby' | 'playing' | 'finished'>('lobby')
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null)
  const [teams, setTeams] = useState<{ id: string; name: string; score: number }[]>([])
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myTeamId, setMyTeamId] = useState<string | null>(null)
  const [myMutedUntil, setMyMutedUntil] = useState<string | null>(null)
  const [players, setPlayers] = useState<{ id: string; display_name: string }[]>([])
  const [rounds, setRounds] = useState(3)
  const [noisesEnabled, setNoisesEnabled] = useState(true)

  async function reloadPartyState() {
    const { data: party } = await supabase.from('parties').select('status, rounds, noises_enabled').eq('id', partyId).single()
    setStatus(party!.status)
    setRounds(party!.rounds)
    setNoisesEnabled(party!.noises_enabled)
    const { data: teamRows } = await supabase.from('teams').select('id, name, score').eq('party_id', partyId)
    setTeams(teamRows ?? [])
    const { data: turnRows } = await supabase
      .from('turns_view')
      .select('id')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false })
      .limit(1)
    setCurrentTurnId(turnRows?.[0]?.id ?? null)
    const { data: playerRows } = await supabase.from('players').select('id, display_name, muted_until').eq('party_id', partyId)
    setPlayers((playerRows ?? []).map((p) => ({ id: p.id, display_name: p.display_name })))
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { data: me } = await supabase
      .from('players')
      .select('id, team_id, muted_until')
      .eq('party_id', partyId)
      .eq('account_id', userId)
      .single()
    setMyPlayerId(me?.id ?? null)
    setMyTeamId(me?.team_id ?? null)
    setMyMutedUntil(me?.muted_until ?? null)
  }

  useEffect(() => {
    reloadPartyState()
    const channel = supabase
      .channel(`party-room:${partyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` }, reloadPartyState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turns', filter: `party_id=eq.${partyId}` }, reloadPartyState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `party_id=eq.${partyId}` }, reloadPartyState)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId])

  if (status === 'lobby') {
    return (
      <Lobby
        partyId={partyId}
        roomCode={roomCode}
        isHost={isHost}
        onStartGame={async () => {
          const { error } = await supabase.rpc('start_game', { p_party_id: partyId })
          if (error) throw error
        }}
      />
    )
  }
  if (status === 'playing' && currentTurnId && myPlayerId && myTeamId) {
    return (
      <GameScreen
        key={currentTurnId}
        turnId={currentTurnId}
        myPlayerId={myPlayerId}
        myTeamId={myTeamId}
        teams={teams}
        isHost={isHost}
        myMutedUntil={myMutedUntil}
        players={players}
        totalRounds={rounds}
        noisesEnabled={noisesEnabled}
      />
    )
  }
  if (status === 'finished') {
    return (
      <FinalScoreboard
        teams={teams}
        onPlayAgain={async () => {
          const { error: restartError } = await supabase.rpc('restart_party', { p_party_id: partyId })
          if (restartError) throw restartError
          const { error } = await supabase.rpc('start_game', { p_party_id: partyId })
          if (error) throw error
        }}
        onNewTeams={async () => {
          const { error: restartError } = await supabase.rpc('restart_party', { p_party_id: partyId })
          if (restartError) throw restartError
          const { error: shuffleError } = await supabase.rpc('shuffle_teams', { p_party_id: partyId })
          if (shuffleError) throw shuffleError
          const { error } = await supabase.rpc('start_game', { p_party_id: partyId })
          if (error) throw error
        }}
        onBackToHome={onBackToHome}
      />
    )
  }
  return <Splash />
}

function Gate() {
  const { session, loading } = useAuth()
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [displayName, setDisplayName] = useState('Player')
  const [avatar, setAvatar] = useState('🌮')
  const [nameAvatarSet, setNameAvatarSet] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.match(/^#\/join\/([A-Z]{4})$/i)
    if (hash) setRoute({ name: 'join', roomCode: hash[1].toUpperCase() })
  }, [])

  if (loading) return <div data-testid="app-root"><Splash /></div>
  if (!session) return <div data-testid="app-root"><SignIn /></div>

  async function handleCreate() {
    const party = await createParty()
    const player = await joinParty(party.room_code, displayName, avatar)
    setRoute({ name: 'lobby', partyId: party.id, roomCode: party.room_code, isHost: true })
    void player
  }

  async function handleJoin(roomCode: string) {
    setJoinError(null)
    try {
      const player = (await joinParty(roomCode, displayName, avatar)) as { party_id: string }
      setRoute({ name: 'lobby', partyId: player.party_id, roomCode, isHost: false })
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join that room. Check the code and try again.')
    }
  }

  return (
    <div data-testid="app-root">
      {route.name === 'home' || route.name === 'join' ? (
        !nameAvatarSet ? (
          <NameAvatarStep
            initialName={displayName}
            initialAvatar={avatar}
            onContinue={(name, chosenAvatar) => {
              setDisplayName(name)
              setAvatar(chosenAvatar)
              setNameAvatarSet(true)
            }}
          />
        ) : (
          <>
            <Home onCreate={handleCreate} onJoin={(code) => handleJoin(code)} onOpenPacks={() => setRoute({ name: 'packs' })} />
            {joinError && (
              <p role="alert" style={{ position: 'fixed', bottom: 16, left: 0, right: 0, textAlign: 'center', color: 'var(--comets)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                {joinError}
              </p>
            )}
          </>
        )
      ) : route.name === 'packs' ? (
        <PacksList onOpenPack={(packId) => setRoute({ name: 'packEditor', packId })} onBack={() => setRoute({ name: 'home' })} />
      ) : route.name === 'packEditor' ? (
        <PackEditor packId={route.packId} onBack={() => setRoute({ name: 'packs' })} />
      ) : (
        <PartyRoom
          partyId={route.partyId}
          roomCode={route.roomCode}
          isHost={route.isHost}
          onBackToHome={() => setRoute({ name: 'home' })}
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
