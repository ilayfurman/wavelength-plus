create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_display_name text not null default 'Player',
  default_avatar text not null default '🙂',
  created_at timestamptz not null default now()
);

create table public.packs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  share_code text not null unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.spectrums (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.packs(id) on delete cascade,
  left_label text not null,
  right_label text not null
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_id uuid not null references public.profiles(id),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  team_size int not null default 2 check (team_size >= 1),
  rounds int not null default 3 check (rounds >= 1),
  team_mode text not null default 'random' check (team_mode in ('random', 'manual')),
  noises_enabled boolean not null default true,
  turn_order jsonb not null default '[]'::jsonb,
  turn_index int not null default 0,
  used_spectrum_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  name text not null,
  score int not null default 0
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  account_id uuid not null references public.profiles(id),
  display_name text not null,
  avatar text not null,
  team_id uuid references public.teams(id) on delete set null,
  muted_until timestamptz,
  created_at timestamptz not null default now(),
  unique (party_id, account_id)
);

create table public.party_packs (
  party_id uuid not null references public.parties(id) on delete cascade,
  pack_id uuid not null references public.packs(id) on delete cascade,
  primary key (party_id, pack_id)
);

create table public.turns (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  round_number int not null,
  team_id uuid not null references public.teams(id),
  psychic_player_id uuid not null references public.players(id),
  spectrum_id uuid not null references public.spectrums(id),
  target_position numeric not null check (target_position >= 0 and target_position <= 1),
  clue_text text,
  guess_position numeric check (guess_position >= 0 and guess_position <= 1),
  status text not null default 'clue' check (status in ('clue', 'guessing', 'betting', 'revealed')),
  created_at timestamptz not null default now()
);

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.turns(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  direction text not null check (direction in ('left', 'right')),
  correct boolean,
  created_at timestamptz not null default now(),
  unique (turn_id, team_id)
);

create index on public.players (party_id);
create index on public.teams (party_id);
create index on public.turns (party_id);
create index on public.bets (turn_id);
create index on public.spectrums (pack_id);
