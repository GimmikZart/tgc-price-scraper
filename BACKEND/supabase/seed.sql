-- Currencies
INSERT INTO public.currencies (code, created_at) VALUES
  ('€', now()),
  ('$', now());

-- Languages
INSERT INTO public.languages (code, name, created_at) VALUES
  ('EN', 'English', now()),
  ('IT', 'Italian', now()),
  ('JP', 'Japanese', now());

-- Games
INSERT INTO public.games (name, code, created_at) VALUES
  ('One Piece', 'OP', now()),
  ('Riftbound', 'RB', now());

-- Sets
INSERT INTO public.sets (code, name, game, created_at) VALUES
  ('OP11', 'A Fist of Divine Speed ', 1, now()),
  ('RB01', 'Base Set', 2, now());

-- Stores
INSERT INTO public.stores (name, price_selector, image_selector, website, logo_url, created_at) VALUES
  ('Il Covo del Nerd', 'p.product-page-price bdi', '.wp-post-image', 'https://www.ilcovodelnerd.com/', 'https://www.ilcovodelnerd.com/wp-content/uploads/2025/01/covologoRI-1024x740.png', now()),
  ('Il Nuovo Mondo', '.current-price-value', '.js-qv-product-cover', 'https://www.ilnuovomondoshop.it/', 'https://www.ilnuovomondoshop.it/img/logo-1673967349.jpg', now());

-- Products
INSERT INTO public.products (store, set, lang, price, currency, url, image_url, created_at) VALUES
  (
    1, -- Il Covo del Nerd
    1, -- OP11 - One Piece
    1, -- EN
    '4.99',
    1, -- EUR
    'https://www.ilcovodelnerd.com/shop/prodotti-sigillati/riftbound-league-of-legends/riftbound-league-of-legends-box-set-one-origins-24-bustine-eng/',
    'https://www.ilcovodelnerd.com/wp-content/uploads/2024/09/GESTIONALE-2.0.png',
    now()
  );
