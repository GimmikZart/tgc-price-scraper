create type "public"."condition" as enum ('Perfect', 'Used', 'Worn', 'Damaged');

alter table "public"."sell_listings" add column "condition" public.condition;


