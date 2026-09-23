import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useTurn } from './useTurn'
import { DialFan } from '../../components/DialFan'
import { TeamScoreboard } from '../../components/TeamScoreboard'
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
}: {
  turnId: string
  myPlayerId: string
  myTeamId: string
  teams: Team[]
  isHost: boolean
  myMutedUntil: string | null
  players: { id: string; display_name: string }[]
}) {
  const turn = useTurn(turnId)
  const [clueText, setClueText] = useState('')
  const [localGuess, setLocalGuess] = useState(0.5)
  const { broadcastMove } = useDialBroadcast(turnId, setLocalGuess)

  if (!turn) return <div>Loading…</div>

  const isPsychic = myPlayerId === turn.psychic_player_id
  const isActiveTeam = myTeamId === turn.team_id
  const spectrumLabel = 'Cold ↔ Hot' // fetched from spectrums table in Task 19's pack-aware version; static label acceptable here since it's read via a separate query wired in Task 19

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
    <div>
      <TeamScoreboard teams={teams} activeTeamId={turn.team_id} />
      <Soundboard partyId={turn.party_id} myPlayerId={myPlayerId} mutedUntil={myMutedUntil} isHost={isHost} players={players} />
      <div>{spectrumLabel}</div>

      {turn.status === 'clue' && isPsychic && (
        <div>
          <input value={clueText} onChange={(e) => setClueText(e.target.value)} placeholder="Type a clue (optional)" />
          <button onClick={() => submitClue(false)}>Submit clue</button>
          <button onClick={() => submitClue(true)}>Said it out loud</button>
        </div>
      )}
      {turn.status === 'clue' && !isPsychic && <div>Waiting for the clue…</div>}

      {turn.status !== 'clue' && <div>Clue: {turn.clue_text}</div>}

      {turn.status === 'guessing' && isActiveTeam && (
        <div>
          <DialFan value={localGuess} interactive onChange={moveGuess} />
          <button onClick={lockGuess}>Lock In Guess</button>
        </div>
      )}
      {turn.status === 'guessing' && !isActiveTeam && <DialFan value={localGuess} />}

      {turn.status === 'betting' && !isActiveTeam && (
        <div>
          <DialFan value={turn.guess_position ?? 0.5} />
          <button onClick={() => placeBet('left')}>Left</button>
          <button onClick={() => placeBet('right')}>Right</button>
        </div>
      )}
      {turn.status === 'betting' && isActiveTeam && <div>Waiting for other teams to bet…</div>}

      {turn.status === 'revealed' && (
        <div>
          <DialFan value={turn.guess_position ?? 0.5} revealedTarget={turn.target_position ?? undefined} />
          {isHost && <button onClick={() => supabase.rpc('advance_turn', { p_party_id: turn.party_id })}>Next turn</button>}
        </div>
      )}
    </div>
  )
}
