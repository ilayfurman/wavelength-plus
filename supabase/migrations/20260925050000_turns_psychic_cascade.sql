-- turns.psychic_player_id referenced players(id) with the default RESTRICT
-- behavior (no ON DELETE clause) — so leave_party's `delete from players`
-- hit a foreign-key violation for anyone who had ever been psychic in any
-- turn, which is guaranteed true for every player by the time a game
-- finishes. That's why "Leave game" silently did nothing on the final
-- scoreboard: the RPC errored, and nothing in the client surfaced it. Turn
-- history is already treated as disposable elsewhere (confirm_rematch bulk
-- deletes all of a party's turns when the host reopens the lobby), so
-- cascading here is consistent, not a new kind of data loss.
alter table public.turns drop constraint turns_psychic_player_id_fkey;
alter table public.turns
  add constraint turns_psychic_player_id_fkey
  foreign key (psychic_player_id) references public.players(id) on delete cascade;
