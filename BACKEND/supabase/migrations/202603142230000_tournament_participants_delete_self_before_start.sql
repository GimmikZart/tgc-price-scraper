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
  or (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and t.status in ('draft', 'open')
    )
  )
);
