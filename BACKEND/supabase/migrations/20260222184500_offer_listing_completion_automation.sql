set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.finalize_offer_listing_when_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  if new.delivered_at is null or new.received_at is null then
    return new;
  end if;

  update public.offer_listing
  set status = 'Accepted'::public.offer_status
  where id = new.id
    and status <> 'Accepted'::public.offer_status;

  delete from public.offer_listing_chat_messages
  where offer_listing_id = new.id;

  return new;
end;
$function$
;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offer_listing'
      AND column_name = 'delivered_at'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offer_listing'
      AND column_name = 'received_at'
  ) THEN
    RAISE NOTICE 'Skipping trg_offer_listing_finalize_when_completed: required columns are missing';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'offer_listing'
      AND t.tgname = 'trg_offer_listing_finalize_when_completed'
      AND NOT t.tgisinternal
  ) THEN
    RETURN;
  END IF;

  IF has_table_privilege(current_user, 'public.offer_listing', 'TRIGGER') THEN
    CREATE TRIGGER trg_offer_listing_finalize_when_completed
    AFTER INSERT OR UPDATE OF delivered_at, received_at ON public.offer_listing
    FOR EACH ROW
    EXECUTE FUNCTION public.finalize_offer_listing_when_completed();
  ELSE
    RAISE NOTICE 'Skipping trg_offer_listing_finalize_when_completed: current_user (%) has no TRIGGER privilege', current_user;
  END IF;
END $$;
