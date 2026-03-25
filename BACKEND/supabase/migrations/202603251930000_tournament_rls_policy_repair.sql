alter table public.tournaments enable row level security;

grant select, insert, update, delete on table public.tournaments to authenticated;

drop policy if exists "tournaments_select_authenticated" on public.tournaments;
create policy "tournaments_select_authenticated"
on public.tournaments
for select
to authenticated
using (public.viewer_can_access_tournament(id, auth.uid()));

drop policy if exists "tournaments_insert_by_organizer" on public.tournaments;
create policy "tournaments_insert_by_organizer"
on public.tournaments
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = organizer_id
);

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
