import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Btn } from '../../components/Btn'

type PartySettings = {
  team_size: number
  rounds: number
  team_mode: 'random' | 'manual'
  noises_enabled: boolean
}

type Player = { id: string; display_name: string }

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8,6,24,.55)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 40,
}

const sheetStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  maxHeight: '80vh',
  overflowY: 'auto',
  background: 'var(--sheet)',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: '20px 20px 28px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  fontFamily: 'Rubik, system-ui, sans-serif',
  color: '#F4F2FB',
  transition: 'transform .2s ease',
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const titleStyle: CSSProperties = {
  font: '700 18px Fredoka, sans-serif',
}

const closeButtonStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(200,180,255,.18)',
  color: '#F4F2FB',
  cursor: 'pointer',
}

const errorTextStyle: CSSProperties = {
  color: '#FF8A8A',
  fontSize: 13,
  fontWeight: 500,
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const sectionLabelStyle: CSSProperties = {
  color: 'var(--text-muted, #93A2BF)',
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

function switchTrackStyle(checked: boolean): CSSProperties {
  return {
    width: 48,
    height: 28,
    borderRadius: 999,
    border: '1px solid rgba(200,180,255,.18)',
    background: checked ? 'var(--gold-cta, #FFC94D)' : 'rgba(8,6,24,.6)',
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
    background: checked ? '#1A1233' : '#93A2BF',
    transition: 'left 0.15s ease',
  }
}

const playerListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 180,
  overflowY: 'auto',
}

const playerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderRadius: 12,
  background: 'rgba(255,255,255,.05)',
}

const muteButtonStyle: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(255,255,255,.07)',
  border: '1px solid rgba(200,180,255,.18)',
  color: '#F4F2FB',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

export function HostMenu({
  open,
  onClose,
  partyId,
  currentPsychicName,
  players,
  myPlayerId,
  onMuteSuccess,
}: {
  open: boolean
  onClose: () => void
  partyId: string
  currentPsychicName: string
  players: Player[]
  myPlayerId: string
  onMuteSuccess?: () => void
}) {
  const [settings, setSettings] = useState<PartySettings | null>(null)
  const [confirmEndGame, setConfirmEndGame] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [mutingIds, setMutingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) {
      setConfirmEndGame(false)
      setErrorMessage(null)
      return
    }
    let cancelled = false
    async function loadSettings() {
      const { data } = await supabase
        .from('parties')
        .select('team_size, rounds, team_mode, noises_enabled')
        .eq('id', partyId)
        .single()
      if (!cancelled && data) setSettings(data as PartySettings)
    }
    void loadSettings()
    return () => {
      cancelled = true
    }
  }, [open, partyId])

  if (!open) return null

  async function toggleNoises() {
    if (!settings) return
    const previous = settings
    const next = !settings.noises_enabled
    setSettings({ ...settings, noises_enabled: next })
    setErrorMessage(null)
    const { error } = await supabase.rpc('set_noises_enabled', {
      p_party_id: partyId,
      p_noises_enabled: next,
    })
    if (error) {
      setSettings(previous)
      setErrorMessage('Could not change noises setting. Try again.')
    }
  }

  async function mutePlayer(playerId: string) {
    if (mutingIds.has(playerId)) return
    setMutingIds((prev) => new Set(prev).add(playerId))
    setErrorMessage(null)
    const { error } = await supabase.rpc('mute_player', { p_party_id: partyId, p_player_id: playerId, p_seconds: 30 })
    setMutingIds((prev) => {
      const next = new Set(prev)
      next.delete(playerId)
      return next
    })
    if (error) {
      setErrorMessage('Could not mute that player. Try again.')
      return
    }
    onMuteSuccess?.()
  }

  async function forceSkipTurn() {
    setErrorMessage(null)
    const { error } = await supabase.rpc('skip_turn', { p_party_id: partyId })
    if (error) setErrorMessage('Could not skip the turn. Try again.')
  }

  async function endGame() {
    if (!confirmEndGame) {
      setConfirmEndGame(true)
      return
    }
    setErrorMessage(null)
    const { error } = await supabase.rpc('end_game', { p_party_id: partyId })
    if (error) {
      setErrorMessage('Could not end the game. Try again.')
      return
    }
    setConfirmEndGame(false)
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerRowStyle}>
          <span style={titleStyle}>Host menu</span>
          <button type="button" style={closeButtonStyle} aria-label="Close menu" onClick={onClose}>
            ✕
          </button>
        </div>

        {errorMessage && <span role="alert" style={errorTextStyle}>{errorMessage}</span>}

        <div style={sectionStyle}>
          <div style={rowStyle}>
            <span style={sectionLabelStyle}>Noises</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings?.noises_enabled ?? false}
              aria-label="Toggle noises"
              style={switchTrackStyle(settings?.noises_enabled ?? false)}
              onClick={toggleNoises}
              disabled={!settings}
            >
              <span style={switchDotStyle(settings?.noises_enabled ?? false)} />
            </button>
          </div>
        </div>

        <div style={sectionStyle}>
          <span style={sectionLabelStyle}>Players</span>
          <div style={playerListStyle}>
            {players
              .filter((p) => p.id !== myPlayerId)
              .map((p) => (
                <div key={p.id} style={playerRowStyle}>
                  <span>{p.display_name}</span>
                  <button
                    type="button"
                    style={muteButtonStyle}
                    aria-label={`Mute ${p.display_name}`}
                    onClick={() => mutePlayer(p.id)}
                    disabled={mutingIds.has(p.id)}
                  >
                    Mute
                  </button>
                </div>
              ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <Btn
            kind="secondary"
            size="md"
            label={`Force-skip ${currentPsychicName}'s turn`}
            onClick={forceSkipTurn}
          />
          <Btn
            kind={confirmEndGame ? 'primary' : 'ghost'}
            size="md"
            label={confirmEndGame ? 'Tap again to confirm' : 'End game for everyone'}
            onClick={endGame}
          />
        </div>
      </div>
    </div>
  )
}
