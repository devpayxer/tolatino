-- 0187 · 9t (19 nov) · Mensajes entre vecinos (Comunidad › Mensajes): fotos y «Ver traducción» ES↔EN (LAUNCH «Mensajes · lo que quedó de 9t» (2)).
-- Lo mismo que 0185 hizo para Mensajes cliente ↔ negocio, en dm_messages. Lo demás lo hacen lib/mensajes-vecinos.ts (enviar con foto, quién ve
-- qué), app/api/mensajes/foto (subir y ver, PRIVADA; la misma ruta con «para=dm») y lib/traduccion.ts (kind dm_message, la misma caché y el tope).
-- · Fotos PRIVADAS: media.owner_kind 'dm', bajo «privado/m/» (nginx nunca sirve «privado/»), sin metadatos, revisadas por el modelo propio al
--   subirlas (regla `img`): bien → 'visible'; marcada o sin servicio → 'review' y caso en la cola «medios». Mientras no se envía, owner_id =
--   'pendiente' (solo la ve quien la subió; a las 24 h sin mandar la saca el barrido: lib/mensajes-purga.ts); al enviarla, owner_id = el id del
--   mensaje. La ven las dos personas de la conversación (sin bloqueo, la conversación abierta, el mensaje sin ocultar) y el equipo de To'Latino solo
--   con un caso abierto (la conversación reportada o la foto en «medios»), y cada vez queda en la auditoría.
-- · dm_messages.media_id: la foto del mensaje (una foto va en un solo mensaje: índice único); un mensaje puede ser solo la foto (body '').
-- · dm_messages.lang: el idioma del texto (lo detecta el servidor al enviar; si no se sabe, el de la app de quien escribe). null = no se sabe.
-- · Un mensaje no se edita: tampoco su foto ni su idioma (dm_messages_antes). La foto tiene que ser una foto de Mensajes entre vecinos de quien
--   escribe (la base lo vuelve a mirar aunque alguien inserte directo).
-- · El último texto de la conversación con solo una foto: «Foto · Photo» (la lista lo dice en el idioma de cada quien).
-- · Arreglo de paso: dm_messages_body_check pedía 1–1000 letras SIEMPRE, y la purga de una cuenta borrada (mapa de datos: body '' con hidden_at)
--   chocaba con eso: la purga de alguien con mensajes entre vecinos fallaba. Ahora body '' vale con hidden_at (oculto o purgado) o con la foto.
-- · ugc_translations.target_kind 'dm_message' y la purga de la cuenta también la cuenta (datos_purga_pendiente).
-- · Aviso en vivo cuando el equipo decide una foto en revisión (el mismo NOTIFY 'mensajes' de 9m, k 'dm'; nunca el texto ni la foto).
-- Idempotente: se puede aplicar dos veces. Nada se borra: un mensaje se oculta y una foto se quita con motivo (estados).
begin;

create or replace function pg_temp.ampliar_check(t regclass, nombre text, valores text[]) returns void language plpgsql as $$
declare d text; v text; nuevo text := '';
begin
  select pg_get_constraintdef(oid) into d from pg_constraint where conname = nombre and conrelid = t;
  if d is null then return; end if;
  foreach v in array valores loop
    if position(quote_literal(v) in d) = 0 then nuevo := nuevo || quote_literal(v) || '::text, '; end if;
  end loop;
  if nuevo = '' then return; end if;
  execute format('alter table %s drop constraint %I', t, nombre);
  execute format('alter table %s add constraint %I %s', t, nombre, replace(d, 'ARRAY[', 'ARRAY[' || nuevo));
end $$;

-- ── Fotos de Mensajes entre vecinos ──
do $$ begin perform pg_temp.ampliar_check('media', 'media_owner_kind_check', array['dm']); end $$;
-- Una foto de Mensajes entre vecinos siempre es privada y vive bajo «privado/m/» (o «privado/borrada» después de la purga de la cuenta).
alter table media drop constraint if exists media_dm_privada;
alter table media add constraint media_dm_privada check (owner_kind <> 'dm' or (private and (url like 'privado/m/%' or url = 'privado/borrada')));
-- El tope de subidas por persona y hora cuenta las dos (cliente ↔ negocio y entre vecinos): app/api/mensajes/foto.
create index if not exists media_msj_subidas_idx on media (uploaded_by, created_at desc) where owner_kind in ('chat', 'dm');
-- El barrido de las fotos subidas y nunca mandadas (lib/mensajes-purga.ts) lee por aquí, sin recorrer todas las fotos.
create index if not exists media_msj_pendientes_idx on media (created_at) where owner_id = 'pendiente' and purged_at is null and owner_kind in ('chat', 'dm');

alter table dm_messages add column if not exists media_id uuid references media (id);
alter table dm_messages add column if not exists lang text;
alter table dm_messages drop constraint if exists dm_messages_lang_check;
alter table dm_messages add constraint dm_messages_lang_check check (lang in ('es', 'en'));
create unique index if not exists dm_messages_media_uidx on dm_messages (media_id) where media_id is not null;
-- Solo la foto (sin texto) también es un mensaje; un mensaje oculto o vaciado por la purga de la cuenta queda con body '' (y hidden_at).
alter table dm_messages drop constraint if exists dm_messages_body_check;
alter table dm_messages add constraint dm_messages_body_check
  check ((char_length(btrim(body)) between 1 and 1000) or (body = '' and (hidden_at is not null or media_id is not null)));

-- Antes de guardar un mensaje: lo de 0134 (las dos personas, abierta, sin bloqueo, «solo a quien te sigue», la purga vacía el texto una vez) y
-- ahora también: la foto ni el idioma se cambian después, y la foto es una de Mensajes entre vecinos que subió quien escribe.
create or replace function dm_messages_antes() returns trigger language plpgsql as $$
declare t record; otro uuid;
begin
  if tg_op = 'DELETE' then raise exception 'en Mensajes nada se borra: se oculta con motivo'; end if;
  if tg_op = 'UPDATE' then
    if (new.media_id, new.lang) is distinct from (old.media_id, old.lang) then raise exception 'un mensaje no se edita'; end if;
    -- 9d · D5: el texto de quien borró su cuenta se vacía una vez (quién, cuándo y la conversación quedan; el otro vecino ve «Cuenta borrada»).
    if coalesce(current_setting('tl.purga', true), '') = 'si' and new.body = '' and old.body <> ''
       and (new.thread_id, new.sender_user_id, new.created_at, new.city_id) is not distinct from (old.thread_id, old.sender_user_id, old.created_at, old.city_id)
       and exists (select 1 from users u where u.id = old.sender_user_id and u.delete_at is not null and u.delete_at <= now()) then
      return new;
    end if;
    if (new.thread_id, new.sender_user_id, new.body, new.created_at, new.city_id) is distinct from (old.thread_id, old.sender_user_id, old.body, old.created_at, old.city_id) then
      raise exception 'un mensaje no se edita';
    end if;
    return new;
  end if;
  select * into t from dm_threads where id = new.thread_id for update;
  if new.sender_user_id <> t.a_user_id and new.sender_user_id <> t.b_user_id then raise exception 'solo escriben las dos personas de la conversación'; end if;
  if t.closed_at is not null then raise exception 'la conversación está cerrada'; end if;
  otro := case when new.sender_user_id = t.a_user_id then t.b_user_id else t.a_user_id end;
  if com_bloqueados(new.sender_user_id, otro) then raise exception 'hay un bloqueo entre las dos personas'; end if;
  if not exists (select 1 from follows f where f.follower_user_id = otro and f.target_kind = 'user' and f.target_id = new.sender_user_id::text)
     and not exists (select 1 from dm_messages m where m.thread_id = new.thread_id and m.sender_user_id = otro) then
    raise exception 'solo le escribes a quien te sigue';
  end if;
  if new.media_id is not null and not exists (select 1 from media x where x.id = new.media_id and x.owner_kind = 'dm' and x.private
       and x.uploaded_by = new.sender_user_id and x.purged_at is null and x.status in ('visible', 'review')) then
    raise exception 'la foto de un mensaje es una foto de Mensajes que subió quien escribe';
  end if;
  new.city_id := t.city_id;
  return new;
end $$;

-- Después: lo de 0099, con «Foto · Photo» como último texto cuando el mensaje es solo la foto.
create or replace function dm_messages_despues() returns trigger language plpgsql as $$
declare ult record;
begin
  perform com_derivados_on();
  if tg_op = 'INSERT' then
    update dm_threads t set last_at = new.created_at, last_from = new.sender_user_id,
           last_text = case when new.body = '' and new.media_id is not null then 'Foto · Photo' when char_length(new.body) > 160 then left(new.body, 157) || '…' else new.body end,
           a_unread = case when new.sender_user_id = t.b_user_id then t.a_unread + 1 else 0 end,
           b_unread = case when new.sender_user_id = t.a_user_id then t.b_unread + 1 else 0 end,
           a_read_at = case when new.sender_user_id = t.a_user_id then now() else t.a_read_at end,
           b_read_at = case when new.sender_user_id = t.b_user_id then now() else t.b_read_at end
     where t.id = new.thread_id;
  elsif new.hidden_at is distinct from old.hidden_at then
    select m.body, m.hidden_at, m.media_id into ult from dm_messages m where m.thread_id = new.thread_id order by m.id desc limit 1;
    update dm_threads t set last_text = case when ult.hidden_at is not null then '' when ult.body = '' and ult.media_id is not null then 'Foto · Photo'
                                             when char_length(ult.body) > 160 then left(ult.body, 157) || '…' else ult.body end
     where t.id = new.thread_id;
  end if;
  perform com_derivados_off();
  return null;
end $$;

-- Cuando una persona del equipo decide una foto en revisión (se ve o se quita), las dos pantallas abiertas se ponen al día en vivo: el mismo
-- aviso de 9m (NOTIFY 'mensajes', solo de qué conversación es; nunca el texto ni la foto).
create or replace function media_dm_vivo() returns trigger language plpgsql as $$
declare t record;
begin
  select th.id, th.a_user_id, th.b_user_id into t from dm_messages m join dm_threads th on th.id = m.thread_id where m.media_id = new.id;
  if found then perform pg_notify('mensajes', json_build_object('k', 'dm', 't', t.id, 'a', t.a_user_id, 'b', t.b_user_id)::text); end if;
  return null;
end $$;
drop trigger if exists media_dm_vivo on media;
create trigger media_dm_vivo after update of status on media for each row
  when (new.owner_kind = 'dm' and new.status is distinct from old.status) execute function media_dm_vivo();

-- ── «Ver traducción» en Mensajes entre vecinos ──
do $$ begin perform pg_temp.ampliar_check('ugc_translations', 'ugc_translations_target_kind_check', array['dm_message']); end $$;

-- La purga de una cuenta: tampoco queda la traducción de lo que escribió en Mensajes entre vecinos (L680). Igual a 0185 más la línea de 'dm_message'.
create or replace function datos_purga_pendiente(cuenta uuid, tel text) returns table (tabla text, columna text, accion text, n bigint) language plpgsql stable as $$
declare m record; k bigint;
begin
  for m in select d.* from data_map d where d.accion in ('borrar', 'vaciar', 'seudonimizar') and d.rol in ('persona', 'telefono') order by d.orden loop
    if m.fn = 'traducciones' then
      -- Las traducciones derivadas de lo que escribió (L680): ninguna queda.
      select count(*) into k from ugc_translations t
       where (t.target_kind = 'com_post' and t.target_id in (select p.id from com_posts p where p.author_user_id = cuenta))
          or (t.target_kind = 'com_comment' and t.target_id in (select x.id from com_comments x where x.author_user_id = cuenta))
          or (t.target_kind in ('review', 'review_reply') and t.target_id in (select r.id from reviews r where r.user_id = cuenta))
          or (t.target_kind = 'post_comment' and t.target_id in (select x.id from post_comments x where x.user_id = cuenta))
          or (t.target_kind = 'chat_message' and t.target_id in (select x.id from chat_messages x where x.sender_user_id = cuenta))
          or (t.target_kind = 'dm_message' and t.target_id in (select x.id from dm_messages x where x.sender_user_id = cuenta));
    elsif m.tabla = 'compa_conversations' then
      -- 7i · Una conversación ABIERTA espera a cerrarse (el barrido la cierra a las 24 h) y compa_purgar la vacía en la pasada siguiente.
      select count(*) into k from compa_conversations c where c.user_id = cuenta and c.closed_at is not null and c.purged_at is null;
    elsif m.tabla = 'compa_messages' then
      select count(*) into k from compa_messages x join compa_conversations c on c.id = x.conversation_id
       where x.user_id = cuenta and x.text is not null and c.closed_at is not null;
    elsif m.tabla = 'media' then
      -- Sus fotos: las que subió (las personales, no las del negocio), las de sus publicaciones y la de su perfil; ninguna queda sin purgar.
      execute format('select count(*) from media x where x.purged_at is null and ((x.uploaded_by = $1 and (%s))'
                  || ' or (x.owner_kind = ''com_post'' and x.owner_id in (select p.id::text from com_posts p where p.author_user_id = $1))'
                  || ' or (x.owner_kind = ''user'' and x.owner_id = $1::text))', coalesce(m.donde_sql, 'true')) into k using cuenta;
    elsif m.rol = 'telefono' then
      if tel is null then continue; end if;
      execute format('select count(*) from %I where %I = $1', m.tabla, m.columna) into k using tel;
    elsif m.accion = 'borrar' then
      execute format('select count(*) from %I where %I = $1 and (%s)', m.tabla, m.columna, coalesce(m.donde_sql, 'true')) into k using cuenta;
    else
      execute format('select count(*) from %I where %I = $1 and (%s) and (%s)', m.tabla, m.columna, coalesce(m.donde_sql, 'true'), coalesce(m.pendiente_sql, 'false')) into k using cuenta;
    end if;
    if k > 0 then tabla := m.tabla; columna := m.columna; accion := m.accion; n := k; return next; end if;
  end loop;
end $$;

commit;
