-- One-off data repair: before the previous migration's fix, a party could
-- reach status='playing' with a player who was never assigned a team
-- (joined after the last shuffle, while teams already existed). That
-- player's client is permanently stuck, and there's no in-app way to
-- recover since it isn't the client's status to fix. Reset any party
-- currently in exactly that broken state back to 'lobby' — same shape as
-- restart_party — so the host can shuffle/start again with the fix applied.
create temporary table broken_parties as
select distinct p.id
from public.parties p
join public.players pl on pl.party_id = p.id
where p.status = 'playing' and pl.team_id is null;

update public.parties
set status = 'lobby', turn_order = '[]'::jsonb, turn_index = 0, used_spectrum_ids = '{}'
where id in (select id from broken_parties);

delete from public.turns where party_id in (select id from broken_parties);

drop table broken_parties;
