-- Perf: several client flows made 2-3 sequential RPC round trips where each
-- step's result only fed the next call (never displayed in between), adding
-- pure network latency for no benefit. These wrap the existing RPCs (kept
-- as-is, still used standalone elsewhere) in a single call each.

create or replace function public.create_and_join_party(
  p_display_name text, p_avatar text, p_team_size int default 2, p_rounds int default 3
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_party public.parties;
  new_player public.players;
begin
  new_party := public.create_party(p_team_size, p_rounds);
  new_player := public.join_party(new_party.room_code, p_display_name, p_avatar);
  return jsonb_build_object('party_id', new_party.id, 'room_code', new_party.room_code, 'player_id', new_player.id);
end;
$$;

grant execute on function public.create_and_join_party(text, text, int, int) to authenticated;

create or replace function public.restart_and_start_party(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.restart_party(p_party_id);
  return public.start_game(p_party_id);
end;
$$;

grant execute on function public.restart_and_start_party(uuid) to authenticated;

create or replace function public.restart_shuffle_and_start_party(p_party_id uuid)
returns public.turns
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.restart_party(p_party_id);
  perform public.shuffle_teams(p_party_id);
  return public.start_game(p_party_id);
end;
$$;

grant execute on function public.restart_shuffle_and_start_party(uuid) to authenticated;
