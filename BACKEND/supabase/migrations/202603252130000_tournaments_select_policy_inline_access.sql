drop policy if exists "tournaments_select_authenticated" on public.tournaments;

create policy "tournaments_select_authenticated"
on public.tournaments
for select
to authenticated
using (
  auth.uid() is not null
  and (
    organizer_id = auth.uid()
    or visibility = 'public'::public.visibility
    or public.viewer_is_active_tournament_participant(id, auth.uid())
    or (
      visibility = 'friends'::public.visibility
      and public.viewer_follows_profile(auth.uid(), organizer_id)
    )
  )
);
