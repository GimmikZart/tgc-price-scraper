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
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'offer_listing'
        AND column_name = 'delivered_at'
    ) THEN
      ALTER TABLE public.offer_listing ADD COLUMN delivered_at timestamp with time zone;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'offer_listing'
        AND column_name = 'received_at'
    ) THEN
      ALTER TABLE public.offer_listing ADD COLUMN received_at timestamp with time zone;
    END IF;

    ALTER TABLE public.offer_listing ALTER COLUMN offer SET DEFAULT '0'::numeric;

    GRANT DELETE ON TABLE public.offer_listing TO postgres;
    GRANT INSERT ON TABLE public.offer_listing TO postgres;
    GRANT REFERENCES ON TABLE public.offer_listing TO postgres;
    GRANT SELECT ON TABLE public.offer_listing TO postgres;
    GRANT TRIGGER ON TABLE public.offer_listing TO postgres;
    GRANT TRUNCATE ON TABLE public.offer_listing TO postgres;
    GRANT UPDATE ON TABLE public.offer_listing TO postgres;
  ELSE
    RAISE NOTICE 'Skipping offer_listing patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'user_tag'
    ) THEN
      ALTER TABLE public.profiles ALTER COLUMN user_tag SET NOT NULL;
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_tag_key ON public.profiles USING btree (user_tag);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'profiles_user_tag_key'
        AND conrelid = 'public.profiles'::regclass
    ) THEN
      ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_tag_key UNIQUE USING INDEX profiles_user_tag_key;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping profiles patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    RETURN;
  END IF;

  IF has_table_privilege(current_user, 'auth.users', 'TRIGGER') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ELSE
    RAISE NOTICE 'Skipping auth.users trigger patch: current_user (%) has no TRIGGER privilege', current_user;
  END IF;
END $$;

