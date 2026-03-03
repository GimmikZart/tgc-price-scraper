DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'friends'
      AND pg_get_userbyid(c.relowner) = current_user
  ) THEN
    ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Friends delete if partecipant" ON public.friends;
    DROP POLICY IF EXISTS "Friends update if partecipant" ON public.friends;
    DROP POLICY IF EXISTS friends_authenticated_select ON public.friends;
    DROP POLICY IF EXISTS friends_authenticated_insert_own ON public.friends;
    DROP POLICY IF EXISTS friends_authenticated_update_own ON public.friends;
    DROP POLICY IF EXISTS friends_authenticated_delete_own ON public.friends;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'friends'
        AND column_name = 'friend_profile'
        AND data_type <> 'uuid'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM public.friends
        WHERE friend_profile IS NULL
          OR btrim(friend_profile) = ''
          OR friend_profile !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ) THEN
        RAISE EXCEPTION 'Cannot convert public.friends.friend_profile to uuid because invalid values are present';
      END IF;

      ALTER TABLE public.friends
      ALTER COLUMN friend_profile TYPE uuid
      USING friend_profile::uuid;
    END IF;

    ALTER TABLE public.friends
      ALTER COLUMN user_profile SET DEFAULT auth.uid(),
      ALTER COLUMN friend_profile SET NOT NULL;

    WITH ranked_relationships AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY user_profile, friend_profile
          ORDER BY
            (blocked_at IS NOT NULL) DESC,
            blocked_at DESC NULLS LAST,
            created_at DESC,
            id DESC
        ) AS row_rank
      FROM public.friends
    )
    DELETE FROM public.friends
    WHERE id IN (
      SELECT id
      FROM ranked_relationships
      WHERE row_rank > 1
    );

    ALTER TABLE public.friends DROP CONSTRAINT IF EXISTS friends_pkey;
    DROP INDEX IF EXISTS public.friends_pkey;

    CREATE UNIQUE INDEX IF NOT EXISTS friends_pkey
      ON public.friends USING btree (id);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'friends_pkey'
        AND conrelid = 'public.friends'::regclass
    ) THEN
      ALTER TABLE public.friends
        ADD CONSTRAINT friends_pkey PRIMARY KEY USING INDEX friends_pkey;
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS friends_user_profile_friend_profile_key
      ON public.friends USING btree (user_profile, friend_profile);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'friends_user_profile_friend_profile_check'
        AND conrelid = 'public.friends'::regclass
    ) THEN
      ALTER TABLE public.friends
        ADD CONSTRAINT friends_user_profile_friend_profile_check
        CHECK (user_profile <> friend_profile);
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'friends_user_profile_fkey'
        AND conrelid = 'public.friends'::regclass
    ) THEN
      ALTER TABLE public.friends
        ADD CONSTRAINT friends_user_profile_fkey
        FOREIGN KEY (user_profile)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'friends_friend_profile_fkey'
        AND conrelid = 'public.friends'::regclass
    ) THEN
      ALTER TABLE public.friends
        ADD CONSTRAINT friends_friend_profile_fkey
        FOREIGN KEY (friend_profile)
        REFERENCES public.profiles (id)
        ON DELETE CASCADE;
    END IF;

    CREATE POLICY friends_authenticated_select
    ON public.friends
    AS permissive
    FOR SELECT
    TO authenticated
    USING (true);

    CREATE POLICY friends_authenticated_insert_own
    ON public.friends
    AS permissive
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_profile);

    CREATE POLICY friends_authenticated_update_own
    ON public.friends
    AS permissive
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_profile)
    WITH CHECK (auth.uid() = user_profile);

    CREATE POLICY friends_authenticated_delete_own
    ON public.friends
    AS permissive
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_profile);

    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE public.friends
      TO authenticated;

    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE public.friends
      TO service_role;

    GRANT USAGE, SELECT
      ON SEQUENCE public.friends_id_seq
      TO authenticated;

    GRANT USAGE, SELECT
      ON SEQUENCE public.friends_id_seq
      TO service_role;
  ELSE
    RAISE NOTICE 'Skipping friends patch: current_user (%) is not table owner', current_user;
  END IF;
END $$;
