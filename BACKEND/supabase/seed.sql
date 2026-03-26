-- Currencies
INSERT INTO public.currencies (code, created_at) VALUES
  ('EUR', now()),
  ('USD', now());

-- Languages
INSERT INTO public.languages (code, name, created_at) VALUES
  ('EN', 'English', now()),
  ('IT', 'Italian', now()),
  ('JP', 'Japanese', now());

-- Games
INSERT INTO public.games (name, code, slug, created_at) VALUES
  ('One Piece', 'OP', 'one-piece', now()),
  ('Riftbound', 'RB', 'riftbound', now());

-- Sets
INSERT INTO public.sets (code, name, slug, game, created_at) VALUES
  ('OP11', 'A Fist of Divine Speed', 'op11', (SELECT id FROM public.games WHERE code = 'OP'), now()),
  ('RB01', 'Base Set', 'rb01', (SELECT id FROM public.games WHERE code = 'RB'), now());

-- Stores
INSERT INTO public.stores (
  name,
  regular_price_selector,
  image_selector,
  website,
  logo_url,
  created_at
) VALUES
  (
    'Il Covo del Nerd',
    'p.product-page-price bdi',
    '.wp-post-image',
    'https://www.ilcovodelnerd.com/',
    'https://www.ilcovodelnerd.com/wp-content/uploads/2025/01/covologoRI-1024x740.png',
    now()
  ),
  (
    'Il Nuovo Mondo',
    '.current-price-value',
    '.js-qv-product-cover',
    'https://www.ilnuovomondoshop.it/',
    'https://www.ilnuovomondoshop.it/img/logo-1673967349.jpg',
    now()
  );

-- Products
INSERT INTO public.products (
  store,
  set,
  lang,
  currency,
  regular_price,
  original_price,
  url,
  image_url,
  created_at,
  last_update
) VALUES
  (
    (SELECT id FROM public.stores WHERE name = 'Il Covo del Nerd'),
    (SELECT id FROM public.sets WHERE code = 'OP11'),
    (SELECT id FROM public.languages WHERE code = 'EN'),
    (SELECT id FROM public.currencies WHERE code = 'EUR'),
    '4.99',
    '4.99',
    'https://www.ilcovodelnerd.com/shop/prodotti-sigillati/riftbound-league-of-legends/riftbound-league-of-legends-box-set-one-origins-24-bustine-eng/',
    'https://www.ilcovodelnerd.com/wp-content/uploads/2024/09/GESTIONALE-2.0.png',
    now(),
    now()
  );
