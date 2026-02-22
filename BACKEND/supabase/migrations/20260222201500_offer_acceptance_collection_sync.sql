set check_function_bodies = off;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'sell_listings'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    ALTER TABLE public.sell_listings
      DROP CONSTRAINT IF EXISTS sell_listings_quantity_check;

    ALTER TABLE public.sell_listings
      ADD CONSTRAINT sell_listings_quantity_check
      CHECK (
        quantity >= 0
        AND (
          status <> 'active'::public.sell_listing_status
          OR quantity > 0
        )
      );
  ELSE
    RAISE NOTICE 'Skipping sell_listings quantity constraint patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'collection'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    UPDATE public.collection
    SET card_number = coalesce(card_number, 0)
    WHERE card_number IS NULL;

    UPDATE public.collection
    SET card_number = 0
    WHERE card_number < 0;

    WITH grouped AS (
      SELECT
        user_uuid,
        card_id,
        MIN(id) AS keep_id,
        SUM(card_number)::integer AS total_card_number
      FROM public.collection
      WHERE user_uuid IS NOT NULL
        AND card_id IS NOT NULL
      GROUP BY user_uuid, card_id
    )
    UPDATE public.collection c
    SET card_number = grouped.total_card_number
    FROM grouped
    WHERE c.id = grouped.keep_id;

    WITH grouped AS (
      SELECT
        user_uuid,
        card_id,
        MIN(id) AS keep_id
      FROM public.collection
      WHERE user_uuid IS NOT NULL
        AND card_id IS NOT NULL
      GROUP BY user_uuid, card_id
      HAVING COUNT(*) > 1
    )
    DELETE FROM public.collection c
    USING grouped
    WHERE c.user_uuid = grouped.user_uuid
      AND c.card_id = grouped.card_id
      AND c.id <> grouped.keep_id;

    DELETE FROM public.collection
    WHERE card_number = 0;

    ALTER TABLE public.collection
      ALTER COLUMN card_number SET DEFAULT 0;

    ALTER TABLE public.collection
      ALTER COLUMN card_number SET NOT NULL;

    ALTER TABLE public.collection
      DROP CONSTRAINT IF EXISTS collection_card_number_non_negative_check;

    ALTER TABLE public.collection
      ADD CONSTRAINT collection_card_number_non_negative_check
      CHECK (card_number >= 0);

    CREATE UNIQUE INDEX IF NOT EXISTS collection_user_uuid_card_id_key
      ON public.collection USING btree (user_uuid, card_id);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'collection_user_uuid_card_id_key'
        AND conrelid = 'public.collection'::regclass
    ) THEN
      ALTER TABLE public.collection
        ADD CONSTRAINT collection_user_uuid_card_id_key
        UNIQUE USING INDEX collection_user_uuid_card_id_key;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping collection uniqueness patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.apply_offer_listing_acceptance_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  target_listing public.sell_listings%rowtype;
  offer_quantity integer;
  seller_owned_quantity integer;
  remaining_listing_quantity integer;
begin
  if new.status <> 'Accepted'::public.offer_status then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'Accepted'::public.offer_status then
    return new;
  end if;

  offer_quantity := coalesce(new.quantity, 0);
  if offer_quantity <= 0 then
    raise exception 'Offer % has invalid quantity %', new.id, offer_quantity;
  end if;

  select *
  into target_listing
  from public.sell_listings
  where id = new.sell_list_id
  for update;

  if not found then
    raise exception 'Sell listing % not found for offer %', new.sell_list_id, new.id;
  end if;

  if target_listing.status <> 'active'::public.sell_listing_status then
    raise exception 'Sell listing % is not active', target_listing.id;
  end if;

  if target_listing.quantity < offer_quantity then
    raise exception 'Offer quantity (%) exceeds available listing quantity (%) for listing %',
      offer_quantity,
      target_listing.quantity,
      target_listing.id;
  end if;

  if target_listing.seller_uuid is null then
    raise exception 'Sell listing % has no seller', target_listing.id;
  end if;

  if new.offerer_id is null then
    raise exception 'Offer % has no buyer', new.id;
  end if;

  if target_listing.seller_uuid = new.offerer_id then
    raise exception 'Seller and buyer cannot be the same user for listing %', target_listing.id;
  end if;

  select c.card_number
  into seller_owned_quantity
  from public.collection c
  where c.user_uuid = target_listing.seller_uuid
    and c.card_id = target_listing.card_id
  for update;

  if seller_owned_quantity is null then
    raise exception 'Seller % has no card % in collection', target_listing.seller_uuid, target_listing.card_id;
  end if;

  if seller_owned_quantity < offer_quantity then
    raise exception 'Seller collection quantity (%) is below offer quantity (%) for card %',
      seller_owned_quantity,
      offer_quantity,
      target_listing.card_id;
  end if;

  remaining_listing_quantity := target_listing.quantity - offer_quantity;

  update public.sell_listings
  set quantity = remaining_listing_quantity,
      status = case
        when remaining_listing_quantity = 0 then 'sold'::public.sell_listing_status
        else target_listing.status
      end
  where id = target_listing.id;

  update public.collection
  set card_number = card_number - offer_quantity
  where user_uuid = target_listing.seller_uuid
    and card_id = target_listing.card_id;

  insert into public.collection (user_uuid, card_id, card_number)
  values (new.offerer_id, target_listing.card_id, offer_quantity)
  on conflict (user_uuid, card_id)
  do update
  set card_number = public.collection.card_number + excluded.card_number;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_collection_card_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  if new.card_number is null then
    raise exception 'card_number cannot be null';
  end if;

  if new.card_number < 0 then
    raise exception 'card_number cannot be negative (row id %, user %, card %)', new.id, new.user_uuid, new.card_id;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_collection_row_when_empty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  delete from public.collection
  where id = new.id;

  return new;
end;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offer_listing'
      AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Skipping trg_offer_listing_apply_acceptance_effects: required columns are missing';
    RETURN;
  END IF;

  IF has_table_privilege(current_user, 'public.offer_listing', 'TRIGGER') THEN
    DROP TRIGGER IF EXISTS trg_offer_listing_apply_acceptance_effects ON public.offer_listing;

    CREATE TRIGGER trg_offer_listing_apply_acceptance_effects
    AFTER INSERT OR UPDATE OF status ON public.offer_listing
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_offer_listing_acceptance_effects();
  ELSE
    RAISE NOTICE 'Skipping trg_offer_listing_apply_acceptance_effects: current_user (%) has no TRIGGER privilege', current_user;
  END IF;
END $$;

DO $$
BEGIN
  IF has_table_privilege(current_user, 'public.collection', 'TRIGGER') THEN
    DROP TRIGGER IF EXISTS trg_collection_validate_card_number ON public.collection;
    DROP TRIGGER IF EXISTS trg_collection_delete_when_empty ON public.collection;

    CREATE TRIGGER trg_collection_validate_card_number
    BEFORE INSERT OR UPDATE OF card_number ON public.collection
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_collection_card_number();

    CREATE TRIGGER trg_collection_delete_when_empty
    AFTER INSERT OR UPDATE OF card_number ON public.collection
    FOR EACH ROW
    WHEN (NEW.card_number = 0)
    EXECUTE FUNCTION public.delete_collection_row_when_empty();
  ELSE
    RAISE NOTICE 'Skipping collection triggers: current_user (%) has no TRIGGER privilege', current_user;
  END IF;
END $$;
