create extension if not exists pgcrypto;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'invalid', 'canceled', 'rejected')),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  challenger_deck jsonb,
  opponent_deck jsonb,
  challenger_result text check (challenger_result in ('won', 'lost')),
  opponent_result text check (opponent_result in ('won', 'lost')),
  winner_id uuid references public.profiles(id) on delete set null,
  cancel_reason text check (cancel_reason in ('canceled', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  challenger_deck_selected_at timestamptz,
  opponent_deck_selected_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  constraint matches_players_different check (challenger_id <> opponent_id),
  constraint matches_winner_is_player check (
    winner_id is null
    or winner_id = challenger_id
    or winner_id = opponent_id
  ),
  constraint matches_terminal_requires_completed_at check (
    status not in ('completed', 'invalid')
    or completed_at is not null
  ),
  constraint matches_terminal_requires_results check (
    status not in ('completed', 'invalid')
    or (challenger_result is not null and opponent_result is not null)
  ),
  constraint matches_active_requires_decks check (
    status <> 'active'
    or (
      challenger_deck is not null
      and opponent_deck is not null
      and started_at is not null
    )
  ),
  constraint matches_canceled_requires_metadata check (
    status not in ('canceled', 'rejected')
    or (cancel_reason is not null and canceled_at is not null)
  )
);

create index if not exists matches_challenger_status_created_idx
  on public.matches (challenger_id, status, created_at desc);

create index if not exists matches_opponent_status_created_idx
  on public.matches (opponent_id, status, created_at desc);

create index if not exists matches_game_status_created_idx
  on public.matches (game, status, created_at desc);

create index if not exists matches_created_at_idx
  on public.matches (created_at desc);

create or replace function public.matches_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_matches_set_updated_at on public.matches;
create trigger trg_matches_set_updated_at
before update on public.matches
for each row
execute function public.matches_set_updated_at();

grant select, insert, update, delete on table public.matches to authenticated;

alter table public.matches enable row level security;

drop policy if exists "matches_select_authenticated" on public.matches;
create policy "matches_select_authenticated"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "matches_insert_by_challenger" on public.matches;
create policy "matches_insert_by_challenger"
on public.matches
for insert
to authenticated
with check (auth.uid() = challenger_id);

drop policy if exists "matches_update_by_participants" on public.matches;
create policy "matches_update_by_participants"
on public.matches
for update
to authenticated
using (auth.uid() = challenger_id or auth.uid() = opponent_id)
with check (auth.uid() = challenger_id or auth.uid() = opponent_id);

drop policy if exists "matches_delete_by_participants" on public.matches;
create policy "matches_delete_by_participants"
on public.matches
for delete
to authenticated
using (auth.uid() = challenger_id or auth.uid() = opponent_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    execute 'alter publication supabase_realtime add table public.matches';
  end if;
end
$$;
