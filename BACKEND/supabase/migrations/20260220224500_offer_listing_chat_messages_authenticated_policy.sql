DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'offer_listing_chat_messages'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    ALTER TABLE public.offer_listing_chat_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS offer_listing_chat_messages_authenticated_all
      ON public.offer_listing_chat_messages;

    CREATE POLICY offer_listing_chat_messages_authenticated_all
    ON public.offer_listing_chat_messages
    AS permissive
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE public.offer_listing_chat_messages
      TO authenticated;

    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE public.offer_listing_chat_messages
      TO service_role;

    GRANT USAGE, SELECT
      ON SEQUENCE public.offer_listing_chat_messages_id_seq
      TO authenticated;

    GRANT USAGE, SELECT
      ON SEQUENCE public.offer_listing_chat_messages_id_seq
      TO service_role;
  ELSE
    RAISE NOTICE 'Skipping offer_listing_chat_messages policy patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;
