create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'deck_share_status'
      and n.nspname = 'public'
  ) then
    create type public.deck_share_status as enum ('pending', 'accepted', 'rejected');
  end if;
end
$$;

create table if not exists public.deck_shares (
  id uuid primary key default gen_random_uuid(),
  sender_user_uuid uuid not null references public.profiles(id) on delete cascade,
  receiver_user_uuid uuid not null references public.profiles(id) on delete cascade,
  status public.deck_share_status not null default 'pending',
  name text not null,
  leader text not null,
  cards jsonb not null default '[]'::jsonb,
  accepted_deck_id bigint references public.decks(id) on delete set null,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint deck_shares_sender_receiver_different check (sender_user_uuid <> receiver_user_uuid),
  constraint deck_shares_cards_is_array check (jsonb_typeof(cards) = 'array'),
  constraint deck_shares_status_timestamps_consistent check (
    (status = 'pending' and accepted_at is null and rejected_at is null)
    or (status = 'accepted' and accepted_at is not null and rejected_at is null)
    or (status = 'rejected' and rejected_at is not null and accepted_at is null)
  )
);

create index if not exists deck_shares_receiver_status_created_idx
  on public.deck_shares (receiver_user_uuid, status, created_at desc);

create index if not exists deck_shares_sender_status_created_idx
  on public.deck_shares (sender_user_uuid, status, created_at desc);

create or replace function public.deck_shares_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_deck_shares_set_updated_at on public.deck_shares;
create trigger trg_deck_shares_set_updated_at
before update on public.deck_shares
for each row
execute function public.deck_shares_set_updated_at();

create or replace function public.can_profiles_share_decks(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
as $$
  select (
    exists (
      select 1
      from public.friends f
      where (
        (f.user_profile = p_user_a and f.friend_profile = p_user_b)
        or (f.user_profile = p_user_b and f.friend_profile = p_user_a)
      )
      and f.blocked_at is null
    )
    and not exists (
      select 1
      from public.friends f
      where (
        (f.user_profile = p_user_a and f.friend_profile = p_user_b)
        or (f.user_profile = p_user_b and f.friend_profile = p_user_a)
      )
      and f.blocked_at is not null
    )
  );
$$;

create or replace function public.normalize_deck_slug(p_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_slug text;
begin
  v_slug := lower(coalesce(p_name, ''));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');

  if v_slug = '' then
    v_slug := 'deck';
  end if;

  return v_slug;
end;
$$;

create or replace function public.create_deck_share(
  p_receiver_user_uuid uuid,
  p_name text,
  p_leader text,
  p_cards jsonb
)
returns public.deck_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_user_uuid uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_leader text := nullif(btrim(p_leader), '');
  v_created_share public.deck_shares;
begin
  if v_sender_user_uuid is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_receiver_user_uuid is null then
    raise exception 'Destinatario non valido';
  end if;

  if p_receiver_user_uuid = v_sender_user_uuid then
    raise exception 'Non puoi inviare un deck a te stesso';
  end if;

  if not public.can_profiles_share_decks(v_sender_user_uuid, p_receiver_user_uuid) then
    raise exception 'Puoi inviare un deck solo a utenti tra seguiti o follower non bloccati';
  end if;

  if v_name is null then
    raise exception 'Nome deck non valido';
  end if;

  if v_leader is null then
    raise exception 'Leader deck non valido';
  end if;

  if p_cards is null or jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'Carte deck non valide';
  end if;

  insert into public.deck_shares (
    sender_user_uuid,
    receiver_user_uuid,
    status,
    name,
    leader,
    cards
  )
  values (
    v_sender_user_uuid,
    p_receiver_user_uuid,
    'pending',
    v_name,
    v_leader,
    p_cards
  )
  returning *
  into v_created_share;

  return v_created_share;
end;
$$;

create or replace function public.accept_deck_share(
  p_share_id uuid,
  p_deck_name text
)
returns public.decks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receiver_user_uuid uuid := auth.uid();
  v_share public.deck_shares;
  v_final_name text := nullif(btrim(p_deck_name), '');
  v_base_slug text;
  v_candidate_slug text;
  v_suffix integer := 2;
  v_created_deck public.decks;
  v_cards jsonb[];
begin
  if v_receiver_user_uuid is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_share_id is null then
    raise exception 'Deck condiviso non valido';
  end if;

  if v_final_name is null then
    raise exception 'Nome deck non valido';
  end if;

  select *
  into v_share
  from public.deck_shares
  where id = p_share_id
    and receiver_user_uuid = v_receiver_user_uuid
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Deck condiviso non trovato o non piu disponibile';
  end if;

  select coalesce(array_agg(card_item), array[]::jsonb[])
  into v_cards
  from jsonb_array_elements(v_share.cards) as card_item;

  if coalesce(array_length(v_cards, 1), 0) = 0 then
    raise exception 'Carte deck condiviso non valide';
  end if;

  v_base_slug := public.normalize_deck_slug(v_final_name);
  v_candidate_slug := v_base_slug;

  while exists (
    select 1
    from public.decks d
    where d.user_uuid = v_receiver_user_uuid
      and d.slug = v_candidate_slug
  ) loop
    v_candidate_slug := v_base_slug || '-' || v_suffix::text;
    v_suffix := v_suffix + 1;
  end loop;

  insert into public.decks (
    user_uuid,
    name,
    slug,
    leader,
    visibility,
    cards
  )
  values (
    v_receiver_user_uuid,
    v_final_name,
    v_candidate_slug,
    v_share.leader,
    'private',
    v_cards
  )
  returning *
  into v_created_deck;

  update public.deck_shares
  set
    status = 'accepted',
    accepted_deck_id = v_created_deck.id,
    accepted_at = timezone('utc', now()),
    rejected_at = null
  where id = v_share.id;

  return v_created_deck;
end;
$$;

create or replace function public.reject_deck_share(
  p_share_id uuid
)
returns public.deck_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receiver_user_uuid uuid := auth.uid();
  v_share public.deck_shares;
begin
  if v_receiver_user_uuid is null then
    raise exception 'Utente non autenticato';
  end if;

  if p_share_id is null then
    raise exception 'Deck condiviso non valido';
  end if;

  select *
  into v_share
  from public.deck_shares
  where id = p_share_id
    and receiver_user_uuid = v_receiver_user_uuid
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Deck condiviso non trovato o non piu disponibile';
  end if;

  update public.deck_shares
  set
    status = 'rejected',
    accepted_deck_id = null,
    accepted_at = null,
    rejected_at = timezone('utc', now())
  where id = v_share.id
  returning *
  into v_share;

  return v_share;
end;
$$;

grant select on table public.deck_shares to authenticated;
grant usage on type public.deck_share_status to authenticated;
revoke all on function public.create_deck_share(uuid, text, text, jsonb) from public;
revoke all on function public.accept_deck_share(uuid, text) from public;
revoke all on function public.reject_deck_share(uuid) from public;
grant execute on function public.create_deck_share(uuid, text, text, jsonb) to authenticated;
grant execute on function public.accept_deck_share(uuid, text) to authenticated;
grant execute on function public.reject_deck_share(uuid) to authenticated;

alter table public.deck_shares enable row level security;

drop policy if exists deck_shares_select_participants on public.deck_shares;
create policy deck_shares_select_participants
on public.deck_shares
for select
to authenticated
using (
  auth.uid() = sender_user_uuid
  or auth.uid() = receiver_user_uuid
);
