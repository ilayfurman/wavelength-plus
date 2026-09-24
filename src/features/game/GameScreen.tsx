import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTurn } from './useTurn'
import { DialFan } from '../../components/DialFan'
import { TeamScoreboard } from '../../components/TeamScoreboard'
import { GameHeader } from '../../components/GameHeader'
import { ClueCard } from '../../components/ClueCard'
import { Btn } from '../../components/Btn'
import { Starfield } from '../../components/Starfield'
import { useDialBroadcast } from './useDialBroadcast'
import { Soundboard } from '../noises/Soundboard'

type Team = { id: string; name: string; score: number }

export function GameScreen({
  turnId,
  myPlayerId,
  myTeamId,
  teams,
  isHost,
  myMutedUntil,
  players,
  totalRounds,
}: {
  turnId: string
  myPlayerId: string
  myTeamId: string
  teams: Team[]
  isHost: boolean
  myMutedUntil: string | null
  players: { id: string; display_name: string }[]
  totalRounds: number
}) {
  const turn = useTurn(turnId)
  const [clueText, setClueText] = useState('')
  const [localGuess, setLocalGuess] = useState(0.5)
  const [menuOpen, setMenuOpen] = useState(false)
  const { broadcastMove } = useDialBroadcast(turnId, setLocalGuess)

  if (!turn) return <div>Loading…</div>

  const isPsychic = myPlayerId === turn.psychic_player_id
  const isActiveTeam = myTeamId === turn.team_id
  const spectrumLabel = 'Cold ↔ Hot' // fetched from spectrums table in Task 19's pack-aware version; static label acceptable here since it's read via a separate query wired in Task 19
  const psychicName = players.find((p) => p.id === turn.psychic_player_id)?.display_name ?? 'Psychic'

  async function submitClue(skipped: boolean) {
    await supabase.rpc('submit_clue', { p_turn_id: turnId, p_clue_text: skipped ? '' : clueText, p_skipped: skipped })
  }

  async function lockGuess() {
    await supabase.rpc('lock_guess', { p_turn_id: turnId, p_guess_position: localGuess })
  }

  async function placeBet(direction: 'left' | 'right') {
    await supabase.rpc('place_bet', { p_turn_id: turnId, p_team_id: myTeamId, p_direction: direction })
  }

  function moveGuess(v: number) {
    setLocalGuess(v)
    broadcastMove(v)
  }

  return (
    <div style={{ position: 'relative' }}>
      <Starfield />
      <div style={{ position: 'relative' }}>
        <GameHeader round={turn.round_number} total={totalRounds} onMenu={() => setMenuOpen(true)} />
        {menuOpen && (
          // TODO(Task 14): replace this stub with the real HostMenu bottom sheet.
          <div>Menu (coming in Task 14)</div>
        )}
        <TeamScoreboard teams={teams} activeTeamId={turn.team_id} />
        <Soundboard partyId={turn.party_id} myPlayerId={myPlayerId} mutedUntil={myMutedUntil} isHost={isHost} players={players} />
        <div>{spectrumLabel}</div>

        {turn.status === 'clue' && isPsychic && (
          <div>
            <ClueCard
              label="Your clue"
              clue={clueText}
              tone="gold"
              editable
              onClueChange={setClueText}
              placeholder="Type a clue…"
            />
            <Btn kind="primary" size="md" label="Submit clue" onClick={() => submitClue(false)} />
            <Btn kind="secondary" size="md" label="Said it out loud" onClick={() => submitClue(true)} />
          </div>
        )}
        {turn.status === 'clue' && !isPsychic && (
          <ClueCard label="Waiting for the clue…" clue="" tone="default" editable={false} />
        )}

        {turn.status !== 'clue' && (
          <ClueCard
            label={`${psychicName}'s clue`}
            clue={turn.clue_text ?? ''}
            tone="default"
            editable={false}
            live={!isActiveTeam}
          />
        )}

        {turn.status === 'guessing' && isActiveTeam && (
          <div>
            <DialFan value={localGuess} interactive onChange={moveGuess} />
            <Btn kind="primary" size="lg" label="Lock In Guess" onClick={lockGuess} />
          </div>
        )}
        {turn.status === 'guessing' && !isActiveTeam && <DialFan value={localGuess} />}

        {turn.status === 'betting' && !isActiveTeam && (
          <div>
            <DialFan value={turn.guess_position ?? 0.5} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn kind="secondary" size="md" label="Left" onClick={() => placeBet('left')} />
              <Btn kind="accent" size="md" label="Right" onClick={() => placeBet('right')} />
            </div>
          </div>
        )}
        {turn.status === 'betting' && isActiveTeam && <div>Waiting for other teams to bet…</div>}

        {turn.status === 'revealed' && (
          <div>
            <DialFan value={turn.guess_position ?? 0.5} revealedTarget={turn.target_position ?? undefined} />
            {isHost && (
              <Btn
                kind="primary"
                size="lg"
                label="Next turn"
                onClick={() => supabase.rpc('advance_turn', { p_party_id: turn.party_id })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
