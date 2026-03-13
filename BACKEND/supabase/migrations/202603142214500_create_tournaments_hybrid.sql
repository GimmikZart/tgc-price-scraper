create extension if not exists pgcrypto;

do $$
begin
  create type public.tournament_format as enum (
    'single_elimination',
    'swiss',
    'round_robin'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_status as enum (
    'draft',
    'open',
    'started',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_participant_status as enum (
    'registered',
    'active',
    'withdrawn',
    'eliminated'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_round_status as enum (
    'pending',
    'active',
    'completed'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_match_status as enum (
    'pending',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.tournament_match_result as enum (
    'player1_win',
    'player2_win',
    'draw'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  format public.tournament_format not null,
  game text not null check (char_length(trim(game)) > 0),
  max_participants integer not null check (max_participants >= 2 and max_participants <= 2048),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  status public.tournament_status not null default 'draft',
  settings jsonb not null default '{}'::jsonb,
  current_round integer not null default 0 check (current_round >= 0),
  total_rounds integer check (total_rounds is null or total_rounds > 0),
  winner_participant_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournaments_started_requires_started_at check (
    status not in ('started', 'completed') or started_at is not null
  ),
  constraint tournaments_completed_requires_completed_at check (
    status <> 'completed' or completed_at is not null
  ),
  constraint tournaments_cancelled_requires_cancelled_at check (
    status <> 'cancelled' or cancelled_at is not null
  ),
  constraint tournaments_current_round_within_total check (
    total_rounds is null or current_round <= total_rounds
  )
);

create table if not exists public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  seed integer check (seed is null or seed > 0),
  status public.tournament_participant_status not null default 'registered',
  joined_at timestamptz not null default timezone('utc', now()),
  withdrawn_at timestamptz,
  dropped_round integer check (dropped_round is null or dropped_round >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_participants_unique_user unique (tournament_id, profile_id),
  constraint tournament_participants_id_tournament_unique unique (id, tournament_id),
  constraint tournament_participants_status_withdrawn_requires_timestamp check (
    status <> 'withdrawn' or withdrawn_at is not null
  )
);

create table if not exists public.tournament_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_number integer not null check (round_number >= 1),
  label text,
  status public.tournament_round_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_rounds_unique_round unique (tournament_id, round_number),
  constraint tournament_rounds_id_tournament_unique unique (id, tournament_id),
  constraint tournament_rounds_completed_requires_completed_at check (
    status <> 'completed' or completed_at is not null
  )
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round_id uuid not null,
  round_number integer not null check (round_number >= 1),
  table_number integer check (table_number is null or table_number >= 1),
  status public.tournament_match_status not null default 'pending',
  result public.tournament_match_result,
  player1_participant_id uuid,
  player2_participant_id uuid,
  winner_participant_id uuid,
  match_id uuid unique references public.matches(id) on delete set null,
  is_bye boolean not null default false,
  score jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tournament_matches_round_fk
    foreign key (round_id, tournament_id)
    references public.tournament_rounds (id, tournament_id)
    on delete cascade,
  constraint tournament_matches_player1_fk
    foreign key (player1_participant_id, tournament_id)
    references public.tournament_participants (id, tournament_id),
  constraint tournament_matches_player2_fk
    foreign key (player2_participant_id, tournament_id)
    references public.tournament_participants (id, tournament_id),
  constraint tournament_matches_winner_fk
    foreign key (winner_participant_id, tournament_id)
    references public.tournament_participants (id, tournament_id),
  constraint tournament_matches_unique_round_table unique (round_id, table_number),
  constraint tournament_matches_requires_at_least_one_player check (
    player1_participant_id is not null or player2_participant_id is not null
  ),
  constraint tournament_matches_players_different check (
    player1_participant_id is null
    or player2_participant_id is null
    or player1_participant_id <> player2_participant_id
  ),
  constraint tournament_matches_bye_shape check (
    (is_bye = false and player1_participant_id is not null and player2_participant_id is not null)
    or
    (
      is_bye = true
      and (
        (player1_participant_id is not null and player2_participant_id is null)
        or
        (player1_participant_id is null and player2_participant_id is not null)
      )
    )
  ),
  constraint tournament_matches_winner_is_player check (
    winner_participant_id is null
    or winner_participant_id = player1_participant_id
    or winner_participant_id = player2_participant_id
  ),
  constraint tournament_matches_completed_requires_result check (
    status <> 'completed' or (result is not null and completed_at is not null)
  ),
  constraint tournament_matches_result_winner_consistency check (
    result is null
    or (
      (result = 'player1_win' and winner_participant_id = player1_participant_id)
      or (result = 'player2_win' and winner_participant_id = player2_participant_id)
      or (result = 'draw' and winner_participant_id is null)
    )
  ),
  constraint tournament_matches_bye_no_draw check (
    is_bye = false or result <> 'draw'
  ),
  constraint tournament_matches_bye_no_linked_match check (
    is_bye = false or match_id is null
  )
);

alter table public.tournaments
  drop constraint if exists tournaments_winner_participant_fk;

alter table public.tournaments
  add constraint tournaments_winner_participant_fk
  foreign key (winner_participant_id)
  references public.tournament_participants (id)
  on delete set null;

create index if not exists tournaments_organizer_status_created_idx
  on public.tournaments (organizer_id, status, created_at desc);

create index if not exists tournaments_game_status_created_idx
  on public.tournaments (game, status, created_at desc);

create index if not exists tournaments_status_created_idx
  on public.tournaments (status, created_at desc);

create index if not exists tournament_participants_tournament_status_joined_idx
  on public.tournament_participants (tournament_id, status, joined_at);

create index if not exists tournament_participants_profile_created_idx
  on public.tournament_participants (profile_id, created_at desc);

create index if not exists tournament_rounds_tournament_status_round_idx
  on public.tournament_rounds (tournament_id, status, round_number);

create index if not exists tournament_matches_tournament_round_status_table_idx
  on public.tournament_matches (tournament_id, round_number, status, table_number);

create index if not exists tournament_matches_round_status_idx
  on public.tournament_matches (round_id, status);

create index if not exists tournament_matches_player1_idx
  on public.tournament_matches (player1_participant_id);

create index if not exists tournament_matches_player2_idx
  on public.tournament_matches (player2_participant_id);

create index if not exists tournament_matches_match_id_idx
  on public.tournament_matches (match_id);

alter table public.matches
  add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;

create index if not exists matches_tournament_created_idx
  on public.matches (tournament_id, created_at desc);

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'match_result'
      and n.nspname = 'public'
  ) then
    alter type public.match_result add value if not exists 'draw';
  end if;
end
$$;

alter table public.matches
  drop constraint if exists matches_challenger_result_check;

alter table public.matches
  drop constraint if exists matches_opponent_result_check;

alter table public.matches
  add constraint matches_challenger_result_check check (
    challenger_result::text in ('won', 'lost', 'draw')
  );

alter table public.matches
  add constraint matches_opponent_result_check check (
    opponent_result::text in ('won', 'lost', 'draw')
  );

alter table public.matches
  drop constraint if exists matches_completed_result_consistency_check;

alter table public.matches
  add constraint matches_completed_result_consistency_check check (
    status <> 'completed'
    or (
      (challenger_result::text = 'won' and opponent_result::text = 'lost' and winner_id = challenger_id)
      or (challenger_result::text = 'lost' and opponent_result::text = 'won' and winner_id = opponent_id)
      or (challenger_result::text = 'draw' and opponent_result::text = 'draw' and winner_id is null)
    )
  );

create or replace function public.tournament_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_tournaments_set_updated_at on public.tournaments;
create trigger trg_tournaments_set_updated_at
before update on public.tournaments
for each row
execute function public.tournament_set_updated_at();

drop trigger if exists trg_tournament_participants_set_updated_at on public.tournament_participants;
create trigger trg_tournament_participants_set_updated_at
before update on public.tournament_participants
for each row
execute function public.tournament_set_updated_at();

drop trigger if exists trg_tournament_rounds_set_updated_at on public.tournament_rounds;
create trigger trg_tournament_rounds_set_updated_at
before update on public.tournament_rounds
for each row
execute function public.tournament_set_updated_at();

drop trigger if exists trg_tournament_matches_set_updated_at on public.tournament_matches;
create trigger trg_tournament_matches_set_updated_at
before update on public.tournament_matches
for each row
execute function public.tournament_set_updated_at();

grant select, insert, update, delete on table public.tournaments to authenticated;
grant select, insert, update, delete on table public.tournament_participants to authenticated;
grant select, insert, update, delete on table public.tournament_rounds to authenticated;
grant select, insert, update, delete on table public.tournament_matches to authenticated;

alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_rounds enable row level security;
alter table public.tournament_matches enable row level security;

drop policy if exists "tournaments_select_authenticated" on public.tournaments;
create policy "tournaments_select_authenticated"
on public.tournaments
for select
to authenticated
using (true);

drop policy if exists "tournaments_insert_by_organizer" on public.tournaments;
create policy "tournaments_insert_by_organizer"
on public.tournaments
for insert
to authenticated
with check (auth.uid() = organizer_id);

drop policy if exists "tournaments_update_by_organizer" on public.tournaments;
create policy "tournaments_update_by_organizer"
on public.tournaments
for update
to authenticated
using (auth.uid() = organizer_id)
with check (auth.uid() = organizer_id);

drop policy if exists "tournaments_delete_by_organizer" on public.tournaments;
create policy "tournaments_delete_by_organizer"
on public.tournaments
for delete
to authenticated
using (auth.uid() = organizer_id);

drop policy if exists "tournament_participants_select_authenticated" on public.tournament_participants;
create policy "tournament_participants_select_authenticated"
on public.tournament_participants
for select
to authenticated
using (true);

drop policy if exists "tournament_participants_insert_self_or_organizer" on public.tournament_participants;
create policy "tournament_participants_insert_self_or_organizer"
on public.tournament_participants
for insert
to authenticated
with check (
  auth.uid() = profile_id
  or auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_participants_update_self_or_organizer" on public.tournament_participants;
create policy "tournament_participants_update_self_or_organizer"
on public.tournament_participants
for update
to authenticated
using (
  auth.uid() = profile_id
  or auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
)
with check (
  auth.uid() = profile_id
  or auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_participants_delete_organizer" on public.tournament_participants;
create policy "tournament_participants_delete_organizer"
on public.tournament_participants
for delete
to authenticated
using (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_rounds_select_authenticated" on public.tournament_rounds;
create policy "tournament_rounds_select_authenticated"
on public.tournament_rounds
for select
to authenticated
using (true);

drop policy if exists "tournament_rounds_insert_organizer" on public.tournament_rounds;
create policy "tournament_rounds_insert_organizer"
on public.tournament_rounds
for insert
to authenticated
with check (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_rounds_update_organizer" on public.tournament_rounds;
create policy "tournament_rounds_update_organizer"
on public.tournament_rounds
for update
to authenticated
using (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
)
with check (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_rounds_delete_organizer" on public.tournament_rounds;
create policy "tournament_rounds_delete_organizer"
on public.tournament_rounds
for delete
to authenticated
using (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_matches_select_authenticated" on public.tournament_matches;
create policy "tournament_matches_select_authenticated"
on public.tournament_matches
for select
to authenticated
using (true);

drop policy if exists "tournament_matches_insert_organizer" on public.tournament_matches;
create policy "tournament_matches_insert_organizer"
on public.tournament_matches
for insert
to authenticated
with check (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_matches_update_organizer" on public.tournament_matches;
create policy "tournament_matches_update_organizer"
on public.tournament_matches
for update
to authenticated
using (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
)
with check (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "tournament_matches_delete_organizer" on public.tournament_matches;
create policy "tournament_matches_delete_organizer"
on public.tournament_matches
for delete
to authenticated
using (
  auth.uid() = (
    select organizer_id
    from public.tournaments
    where id = tournament_id
  )
);

drop policy if exists "matches_insert_by_challenger" on public.matches;
create policy "matches_insert_by_challenger"
on public.matches
for insert
to authenticated
with check (
  auth.uid() = challenger_id
  or (
    tournament_id is not null
    and auth.uid() = (
      select organizer_id
      from public.tournaments
      where id = tournament_id
    )
  )
);

drop policy if exists "matches_update_by_participants" on public.matches;
create policy "matches_update_by_participants"
on public.matches
for update
to authenticated
using (
  (
    tournament_id is null
    and (auth.uid() = challenger_id or auth.uid() = opponent_id)
  )
  or (
    tournament_id is not null
    and auth.uid() = (
      select organizer_id
      from public.tournaments
      where id = tournament_id
    )
  )
)
with check (
  (
    tournament_id is null
    and (auth.uid() = challenger_id or auth.uid() = opponent_id)
  )
  or (
    tournament_id is not null
    and auth.uid() = (
      select organizer_id
      from public.tournaments
      where id = tournament_id
    )
  )
);

drop policy if exists "matches_delete_by_participants" on public.matches;
create policy "matches_delete_by_participants"
on public.matches
for delete
to authenticated
using (
  (
    tournament_id is null
    and (auth.uid() = challenger_id or auth.uid() = opponent_id)
  )
  or (
    tournament_id is not null
    and auth.uid() = (
      select organizer_id
      from public.tournaments
      where id = tournament_id
    )
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tournaments',
    'tournament_participants',
    'tournament_rounds',
    'tournament_matches'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end
$$;
