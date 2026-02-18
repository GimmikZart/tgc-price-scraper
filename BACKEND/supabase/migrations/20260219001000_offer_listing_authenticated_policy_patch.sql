DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'offer_listing'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    ALTER TABLE public.offer_listing ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS offer_listing_authenticated_all ON public.offer_listing;

    CREATE POLICY offer_listing_authenticated_all
    ON public.offer_listing
    AS permissive
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping offer_listing policy patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;
