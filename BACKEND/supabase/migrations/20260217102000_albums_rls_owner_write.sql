alter table "public"."albums" enable row level security;

create policy "Enable read access for all users"
on "public"."albums"
as permissive
for select
to public
using (true);

create policy "Enable insert for album owner"
on "public"."albums"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_uuid));

create policy "Enable update for album owner"
on "public"."albums"
as permissive
for update
to authenticated
using ((auth.uid() = user_uuid))
with check ((auth.uid() = user_uuid));

create policy "Enable delete for album owner"
on "public"."albums"
as permissive
for delete
to authenticated
using ((auth.uid() = user_uuid));
