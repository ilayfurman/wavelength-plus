-- Create a security definer function to safely check party membership without recursive RLS checks
create or replace function public.is_party_member(party_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from players
    where players.party_id = is_party_member.party_id
      and players.account_id = auth.uid()
  );
$$;

-- Fix the players RLS policy to use the security definer function
drop policy "select players if party member" on public.players;

create policy "select players if party member" on public.players for select
using (public.is_party_member(party_id));

-- Fix the party_packs RLS policy to use the security definer function
drop policy "select party_packs if member" on public.party_packs;

create policy "select party_packs if member" on public.party_packs for select
using (public.is_party_member(party_id));

-- Fix the teams RLS policy to use the security definer function
drop policy "select teams if party member" on public.teams;

create policy "select teams if party member" on public.teams for select
using (public.is_party_member(party_id));
