import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Starfield } from '../../components/Starfield'
import { Logo } from '../../components/Logo'
import { Btn } from '../../components/Btn'

type Player = { id: string; display_name: string; avatar: string; team_id: string | null }
type Team = { id: string; name: string }
type TeamMode = 'random' | 'manual'

const inputStyle: CSSProperties = {
  width: '100%',
  height: 52,
  padding: '0 16px',
  borderRadius: 14,
  background: 'var(--input-bg)',
  border: '1px solid var(--input-border)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  boxSizing: 'border-box',
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 24,
  borderRadius: 16,
  border: '1px solid rgba(200,180,255,.18)',
  background: 'rgba(255,255,255,.04)',
  boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
}

const roomCodeCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '14px 22px',
  borderRadius: 999,
  background: 'rgba(255,255,255,.07)',
  border: '1px solid rgba(200,180,255,.16)',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
  alignSelf: 'center',
}

const roomCodeValueStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.14em',
  color: 'var(--gold)',
}

const chipStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,.06)',
  border: '1px solid rgba(200,180,255,.14)',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
}

const segmentGroupStyle: CSSProperties = {
  display: 'flex',
  borderRadius: 999,
  background: 'rgba(8,6,24,.6)',
  border: '1px solid var(--input-border)',
  padding: 4,
  gap: 4,
}

function segmentButtonStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    fontWeight: 600,
    background: active ? 'var(--gold-cta)' : 'transparent',
    color: active ? 'var(--gold-cta-text)' : 'var(--text-muted)',
  }
}

function switchTrackStyle(checked: boolean): CSSProperties {
  return {
    width: 48,
    height: 28,
    borderRadius: 999,
    border: '1px solid var(--input-border)',
    background: checked ? 'var(--gold-cta)' : 'rgba(8,6,24,.6)',
    position: 'relative',
    cursor: 'pointer',
    padding: 0,
    flex: 'none',
    transition: 'background 0.15s ease',
  }
}

function switchDotStyle(checked: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 2,
    left: checked ? 22 : 2,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: checked ? 'var(--gold-cta-text)' : 'var(--text-muted)',
    transition: 'left 0.15s ease',
  }
}

const stepperRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const stepperControlsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const stepperButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,.07)',
  border: '1px solid rgba(200,180,255,.18)',
  color: 'var(--text)',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
}

const stepperValueStyle: CSSProperties = {
  minWidth: 24,
  textAlign: 'center',
  fontFamily: 'var(--font-body)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
}

export function Lobby({
  partyId,
  roomCode,
  isHost,
  onStartGame,
}: {
  partyId: string
  roomCode: string
  isHost: boolean
  onStartGame: () => Promise<void> | void
}) {
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSize, setTeamSize] = useState(2)
  const [rounds, setRounds] = useState(3)
  const [teamMode, setTeamModeState] = useState<TeamMode>('random')
  const [noisesEnabled, setNoisesEnabledState] = useState(true)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [teamNameInput, setTeamNameInput] = useState('')

  async function loadPlayers() {
    const { data } = await supabase
      .from('players')
      .select('id, display_name, avatar, team_id')
      .eq('party_id', partyId)
      .order('created_at')
    setPlayers((data as Player[]) ?? [])
  }

  async function loadTeams() {
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .eq('party_id', partyId)
      .order('created_at')
    setTeams((data as Team[]) ?? [])
  }

  async function loadPartySettings() {
    const { data } = await supabase
      .from('parties')
      .select('team_size, rounds, team_mode, noises_enabled')
      .eq('id', partyId)
      .single()
    if (data) {
      setTeamSize(data.team_size)
      setRounds(data.rounds)
      setTeamModeState(data.team_mode as TeamMode)
      setNoisesEnabledState(data.noises_enabled)
    }
  }

  async function loadMyPlayerId() {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    const { data } = await supabase
      .from('players')
      .select('id')
      .eq('party_id', partyId)
      .eq('account_id', userId)
      .single()
    setMyPlayerId(data?.id ?? null)
  }

  useEffect(() => {
    loadPlayers()
    loadTeams()
    loadPartySettings()
    loadMyPlayerId()
    const channel = supabase
      .channel(`lobby:${partyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `party_id=eq.${partyId}` }, () => {
        loadPlayers()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `party_id=eq.${partyId}` }, () => {
        loadTeams()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` }, () => {
        loadPartySettings()
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

  async function saveSettings(overrides?: { teamMode?: TeamMode; noisesEnabled?: boolean; teamSize?: number; rounds?: number }) {
    await supabase.rpc('set_party_settings', {
      p_party_id: partyId,
      p_team_size: overrides?.teamSize ?? teamSize,
      p_rounds: overrides?.rounds ?? rounds,
      p_team_mode: overrides?.teamMode ?? teamMode,
      p_noises_enabled: overrides?.noisesEnabled ?? noisesEnabled,
    })
  }

  function selectTeamMode(mode: TeamMode) {
    setTeamModeState(mode)
    void saveSettings({ teamMode: mode })
  }

  function toggleNoises() {
    const next = !noisesEnabled
    setNoisesEnabledState(next)
    void saveSettings({ noisesEnabled: next })
  }

  function changeTeamSize(next: number) {
    const clamped = Math.max(1, next)
    setTeamSize(clamped)
    void saveSettings({ teamSize: clamped })
  }

  function changeRounds(next: number) {
    const clamped = Math.max(1, next)
    setRounds(clamped)
    void saveSettings({ rounds: clamped })
  }

  async function joinTeam(teamName: string) {
    if (!myPlayerId || !teamName.trim()) return
    await supabase.rpc('assign_manual_team', {
      p_party_id: partyId,
      p_player_id: myPlayerId,
      p_team_name: teamName.trim(),
    })
    setTeamNameInput('')
  }

  async function handleStartGame() {
    setStartError(null)
    setStarting(true)
    try {
      await onStartGame()
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Could not start the game. Try again.')
    } finally {
      setStarting(false)
    }
  }

  const allTeamsAssigned = players.length > 0 && players.every((p) => p.team_id !== null)
  const startDisabled = (teamMode === 'manual' && !allTeamsAssigned) || starting

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
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Logo variant="inline" size="sm" />
        </div>

        <div style={roomCodeCardStyle}>
          <span>Room code:</span>
          <span style={roomCodeValueStyle}>{roomCode}</span>
        </div>

        <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          <div style={cardStyle}>
            <span style={labelStyle}>Players</span>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {players.map((p) => (
                <li key={p.id} style={chipStyle}>
                  <span>{p.avatar}</span> <span>{p.display_name}</span>
                </li>
              ))}
            </ul>
          </div>

          {isHost && (
            <>
              <div style={cardStyle}>
                <span style={labelStyle}>Teams</span>
                <div style={segmentGroupStyle} role="radiogroup" aria-label="Team mode">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={teamMode === 'random'}
                    style={segmentButtonStyle(teamMode === 'random')}
                    onClick={() => selectTeamMode('random')}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={teamMode === 'manual'}
                    style={segmentButtonStyle(teamMode === 'manual')}
                    onClick={() => selectTeamMode('manual')}
                  >
                    Pick
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={stepperRowStyle}>
                  <span style={labelStyle}>Team size</span>
                  <div style={stepperControlsStyle}>
                    <button type="button" style={stepperButtonStyle} onClick={() => changeTeamSize(teamSize - 1)} aria-label="Decrease team size">
                      −
                    </button>
                    <span style={stepperValueStyle}>{teamSize}</span>
                    <button type="button" style={stepperButtonStyle} onClick={() => changeTeamSize(teamSize + 1)} aria-label="Increase team size">
                      +
                    </button>
                  </div>
                </div>
                <div style={stepperRowStyle}>
                  <span style={labelStyle}>Rounds</span>
                  <div style={stepperControlsStyle}>
                    <button type="button" style={stepperButtonStyle} onClick={() => changeRounds(rounds - 1)} aria-label="Decrease rounds">
                      −
                    </button>
                    <span style={stepperValueStyle}>{rounds}</span>
                    <button type="button" style={stepperButtonStyle} onClick={() => changeRounds(rounds + 1)} aria-label="Increase rounds">
                      +
                    </button>
                  </div>
                </div>
                <div style={stepperRowStyle}>
                  <span style={labelStyle}>Noises</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={noisesEnabled}
                    aria-label="Toggle noises"
                    style={switchTrackStyle(noisesEnabled)}
                    onClick={toggleNoises}
                  >
                    <span style={switchDotStyle(noisesEnabled)} />
                  </button>
                </div>
              </div>
            </>
          )}

          {teamMode === 'manual' && (
            <div style={cardStyle}>
              <span style={labelStyle}>Pick your team</span>
              {teams.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {teams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      style={{ ...chipStyle, cursor: 'pointer', border: '1px solid rgba(169,139,255,.5)' }}
                      onClick={() => joinTeam(t.name)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="New team name"
                  value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  style={inputStyle}
                  aria-label="New team name"
                />
                <div style={{ width: 160 }}>
                  <Btn kind="accent" size="md" label="Create / join team" onClick={() => joinTeam(teamNameInput)} />
                </div>
              </div>
            </div>
          )}

          {isHost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'auto' }}>
              {startError && (
                <span role="alert" style={{ color: 'var(--comets)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
                  {startError}
                </span>
              )}
              <Btn kind="secondary" size="md" label="Reshuffle" onClick={reshuffle} />
              <Btn kind="primary" size="lg" label="Start game" onClick={handleStartGame} disabled={startDisabled} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
