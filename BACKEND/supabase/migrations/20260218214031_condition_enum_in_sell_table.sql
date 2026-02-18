DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'condition'
  ) THEN
    CREATE TYPE public.condition AS ENUM ('Perfect', 'Used', 'Worn', 'Damaged');
  END IF;
END $$;

ALTER TABLE public.sell_listings
ADD COLUMN IF NOT EXISTS condition public.condition;
