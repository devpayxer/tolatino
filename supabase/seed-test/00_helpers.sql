-- Seeding helper: create a login-ready user (password '123') + profile. Idempotent by email.
create or replace function public._seed_user(
  p_email text, p_name text, p_initials text, p_color text,
  p_city text, p_lat double precision, p_lng double precision
) returns uuid language plpgsql as $fn$
declare uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      p_email, crypt('123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('display_name', p_name), now(), now(),
      '', '', '', '', '', '', false, false);
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, p_email,
      jsonb_build_object('sub', uid::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
  end if;
  insert into public.profiles (id, display_name, initials, avatar_color, city_label, lat, lng)
  values (uid, p_name, p_initials, p_color, p_city, p_lat, p_lng)
  on conflict (id) do update set display_name=excluded.display_name, initials=excluded.initials,
    avatar_color=excluded.avatar_color, city_label=excluded.city_label, lat=excluded.lat, lng=excluded.lng;
  return uid;
end $fn$;

select 'helpers installed' as status;
