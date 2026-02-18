-- Temporary simplified RLS: allow full CRUD only to authenticated users.
-- Existing policies are replaced to avoid conflicts with older permissive rules.

DO $$
DECLARE
  target_table text;
  table_owner text;
  existing_policy record;
  target_tables text[] := ARRAY[
    'albums',
    'brands',
    'card_album',
    'cards',
    'categories',
    'collection',
    'currencies',
    'deck_cards',
    'decks',
    'games',
    'languages',
    'offer_listing',
    'products',
    'profiles',
    'sell_listings',
    'sets',
    'stores'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    SELECT pg_get_userbyid(c.relowner)
    INTO table_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = target_table;

    -- Skip missing tables and tables not owned by the current migration role.
    IF table_owner IS NULL OR table_owner <> current_user THEN
      CONTINUE;
    END IF;

    EXECUTE format('alter table public.%I enable row level security', target_table);

    FOR existing_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = target_table
    LOOP
      EXECUTE format('drop policy if exists %I on public.%I', existing_policy.policyname, target_table);
    END LOOP;

    EXECUTE format(
      'create policy %I on public.%I as permissive for all to authenticated using (true) with check (true)',
      target_table || '_authenticated_all',
      target_table
    );
  END LOOP;
END $$;
