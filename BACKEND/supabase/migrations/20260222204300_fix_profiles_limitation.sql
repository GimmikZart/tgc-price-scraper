alter table "public"."profiles" alter column "email" set not null;

alter table "public"."profiles" alter column "user_tag" drop not null;

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";


