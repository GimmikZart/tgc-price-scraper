set check_function_bodies = off;

DO $$
BEGIN
  IF to_regclass('public.deck_cards') IS NOT NULL
    AND to_regclass('public.cards') IS NOT NULL
    AND to_regclass('public.decks') IS NOT NULL THEN
    WITH aggregated_deck_cards AS (
      SELECT
        dc.deck_id,
        array_agg(
          jsonb_build_object(
            'card_id', c.card_id,
            'card_number', dc.card_number
          )
          ORDER BY dc.id
        ) AS cards_payload
      FROM public.deck_cards dc
      JOIN public.cards c
        ON c.id = dc.card_id
      GROUP BY dc.deck_id
    )
    UPDATE public.decks d
    SET cards = aggregated_deck_cards.cards_payload
    FROM aggregated_deck_cards
    WHERE d.id = aggregated_deck_cards.deck_id
      AND coalesce(array_length(d.cards, 1), 0) = 0;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.collection
  DROP CONSTRAINT IF EXISTS collection_card_id_fkey;

ALTER TABLE IF EXISTS public.sell_listings
  DROP CONSTRAINT IF EXISTS sell_listings_card_id_fkey;

DROP TABLE IF EXISTS public.deck_cards;

DROP TABLE IF EXISTS public.cards;
