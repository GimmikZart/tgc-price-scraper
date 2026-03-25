alter table public.tournaments
  add column if not exists visibility public.visibility not null default 'public'::public.visibility;

create index if not exists tournaments_visibility_status_created_idx
  on public.tournaments (visibility, status, created_at desc);

create or replace function public.viewer_follows_profile(
  viewer_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when viewer_id is null or target_profile_id is null then false
      when viewer_id = target_profile_id then true
      else exists (
        select 1
        from public.friends relation
        where relation.user_profile = viewer_id
          and relation.friend_profile = target_profile_id
          and relation.blocked_at is null
      )
      and not exists (
        select 1
        from public.friends blocked_relation
        where blocked_relation.blocked_at is not null
          and (
            (
              blocked_relation.user_profile = viewer_id
              and blocked_relation.friend_profile = target_profile_id
            )
            or
            (
              blocked_relation.user_profile = target_profile_id
              and blocked_relation.friend_profile = viewer_id
            )
          )
      )
    end
$$;

create or replace function public.viewer_is_active_tournament_participant(
  target_tournament_id uuid,
  viewer_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_participants participant
    where participant.tournament_id = target_tournament_id
      and participant.profile_id = viewer_id
      and participant.status <> 'withdrawn'
  )
$$;

create or replace function public.viewer_can_access_tournament(
  target_tournament_id uuid,
  viewer_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments tournament
    where tournament.id = target_tournament_id
      and viewer_id is not null
      and (
        tournament.organizer_id = viewer_id
        or tournament.visibility = 'public'::public.visibility
        or public.viewer_is_active_tournament_participant(target_tournament_id, viewer_id)
        or (
          tournament.visibility = 'friends'::public.visibility
          and public.viewer_follows_profile(viewer_id, tournament.organizer_id)
        )
      )
  )
$$;

create or replace function public.viewer_can_self_join_tournament(
  target_tournament_id uuid,
  viewer_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments tournament
    where tournament.id = target_tournament_id
      and viewer_id is not null
      and tournament.status in ('draft'::public.tournament_status, 'open'::public.tournament_status)
      and (
        tournament.visibility = 'public'::public.visibility
        or (
          tournament.visibility = 'friends'::public.visibility
          and public.viewer_follows_profile(viewer_id, tournament.organizer_id)
        )
        or public.viewer_is_active_tournament_participant(target_tournament_id, viewer_id)
      )
  )
$$;

grant execute on function public.viewer_follows_profile(uuid, uuid) to authenticated;
grant execute on function public.viewer_is_active_tournament_participant(uuid, uuid) to authenticated;
grant execute on function public.viewer_can_access_tournament(uuid, uuid) to authenticated;
grant execute on function public.viewer_can_self_join_tournament(uuid, uuid) to authenticated;

drop policy if exists "tournaments_select_authenticated" on public.tournaments;
create policy "tournaments_select_authenticated"
on public.tournaments
for select
to authenticated
using (public.viewer_can_access_tournament(id, auth.uid()));

drop policy if exists "tournament_participants_select_authenticated" on public.tournament_participants;
create policy "tournament_participants_select_authenticated"
on public.tournament_participants
for select
to authenticated
using (
  auth.uid() = profile_id
  or public.viewer_can_access_tournament(tournament_id, auth.uid())
);

drop policy if exists "tournament_participants_insert_self_or_organizer" on public.tournament_participants;
create policy "tournament_participants_insert_self_or_organizer"
on public.tournament_participants
for insert
to authenticated
with check (
  auth.uid() = (
    select tournament.organizer_id
    from public.tournaments tournament
    where tournament.id = tournament_id
  )
  or (
    auth.uid() = profile_id
    and public.viewer_can_self_join_tournament(tournament_id, auth.uid())
  )
);

drop policy if exists "tournament_rounds_select_authenticated" on public.tournament_rounds;
create policy "tournament_rounds_select_authenticated"
on public.tournament_rounds
for select
to authenticated
using (public.viewer_can_access_tournament(tournament_id, auth.uid()));

drop policy if exists "tournament_matches_select_authenticated" on public.tournament_matches;
create policy "tournament_matches_select_authenticated"
on public.tournament_matches
for select
to authenticated
using (public.viewer_can_access_tournament(tournament_id, auth.uid()));
