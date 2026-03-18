alter table public.tournaments
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_label text;

alter table public.tournaments
  drop constraint if exists tournaments_location_pair_check;

alter table public.tournaments
  add constraint tournaments_location_pair_check check (
    (latitude is null and longitude is null)
    or
    (latitude is not null and longitude is not null)
  );

alter table public.tournaments
  drop constraint if exists tournaments_latitude_check;

alter table public.tournaments
  add constraint tournaments_latitude_check check (
    latitude is null or (latitude >= (-90)::double precision and latitude <= (90)::double precision)
  );

alter table public.tournaments
  drop constraint if exists tournaments_longitude_check;

alter table public.tournaments
  add constraint tournaments_longitude_check check (
    longitude is null or (longitude >= (-180)::double precision and longitude <= (180)::double precision)
  );

alter table public.tournaments
  drop constraint if exists tournaments_location_label_check;

alter table public.tournaments
  add constraint tournaments_location_label_check check (
    location_label is null or char_length(trim(location_label)) > 0
  );

create index if not exists tournaments_location_coordinates_idx
  on public.tournaments (latitude, longitude)
  where latitude is not null and longitude is not null;
