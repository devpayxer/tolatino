-- 0104 · Traducciones propias (Fase 5 · 5h · docs/diseno/plan/fase5-comunidad.md §2 «0104 traducciones», §4 5h y §6 #15).
-- «Ver traducción» / «Ver original» (D3) bajo el texto de una publicación, un comentario, una reseña, la respuesta del negocio a una
-- reseña y un comentario de Novedades, cuando el idioma del texto no es el de la app.
-- · El texto nunca sale de nuestros servidores: lo traduce el servicio propio `traductor` (LibreTranslate autoalojado, modelos Argos
--   ES↔EN) por la red interna del compose (guardián traduccionPropia).
-- · ugc_translations es DERIVADO (una caché): pk (qué, cuál, a qué idioma, sha-256 del texto de origen). Si el texto se edita, cambia el
--   hash y se traduce otra vez; lo viejo no se vuelve a leer. Se puede tirar entero y se regenera solo (por eso no lleva estados).
-- · ugc_translation_uses: el límite por persona (una fila por persona o dispositivo, ventana de una hora; tope en platform_config
--   `com_traduccion_hora`). Es un contador, no un registro: no guarda qué se tradujo.
-- · Idioma del texto: com_posts, com_comments y reviews ya lo guardan (`lang`); faltaban la respuesta del negocio a una reseña
--   (reviews.reply_lang) y los comentarios de Novedades (post_comments.lang). Lo existente queda con el idioma de la app de fábrica
--   (español). Desde 5h el servidor lo detecta al publicar con el /detect del servicio; si no responde, el idioma de la app.
-- Idempotente: if not exists, funciones que se reemplazan, configuración on conflict. Nada de lo de las personas se borra.
begin;

create table if not exists ugc_translations (
  target_kind text not null check (target_kind in ('com_post', 'com_comment', 'review', 'review_reply', 'post_comment')),
  target_id   bigint not null,
  src_lang    text not null check (src_lang in ('es', 'en')),
  dst_lang    text not null check (dst_lang in ('es', 'en')),
  src_hash    text not null check (src_hash ~ '^[0-9a-f]{64}$'),
  text        text not null check (char_length(text) between 1 and 4000),
  engine      text not null check (char_length(engine) between 1 and 60),
  ms          integer not null check (ms >= 0),
  created_at  timestamptz not null default now(),
  primary key (target_kind, target_id, dst_lang, src_hash),
  check (src_lang <> dst_lang)
);

create table if not exists ugc_translation_uses (
  who          text primary key check (who ~ '^[ud]:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  window_start timestamptz not null,
  n            integer not null check (n >= 0)
);

-- Una traducción más para esta persona (u:<user id>) o este dispositivo (d:<tl_dev>): suma en la ventana de la hora y dice si todavía
-- cabe en el tope. Atómico (upsert): dos pedidos a la vez cuentan los dos.
create or replace function trad_usar(quien text, tope integer) returns boolean language plpgsql as $$
declare v integer;
begin
  insert into ugc_translation_uses as t (who, window_start, n) values (quien, date_trunc('hour', now()), 1)
  on conflict (who) do update
     set n = case when t.window_start = date_trunc('hour', now()) then t.n + 1 else 1 end,
         window_start = date_trunc('hour', now())
  returning n into v;
  return v <= tope;
end $$;

alter table reviews add column if not exists reply_lang text;
alter table reviews drop constraint if exists reviews_reply_lang_check;
alter table reviews add constraint reviews_reply_lang_check check (reply_lang in ('es', 'en'));
update reviews set reply_lang = 'es' where reply is not null and reply_lang is null;

alter table post_comments add column if not exists lang text not null default 'es';
alter table post_comments drop constraint if exists post_comments_lang_check;
alter table post_comments add constraint post_comments_lang_check check (lang in ('es', 'en'));

insert into platform_config (key, value, note) values
  ('com_traduccion_hora', '60', 'Comunidad y reseñas: «Ver traducción» por persona en una hora (el traductor es propio; el tope lo protege)')
on conflict (key) do nothing;

commit;
