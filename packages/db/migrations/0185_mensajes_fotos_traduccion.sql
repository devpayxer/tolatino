-- 0185 · 9t (19 nov) · Mensajes (2p): fotos en el chat y «Ver traducción» ES↔EN (LAUNCH «Mensajes (2p)»; lo que quedaba tras 9m).
-- Lo que pone la base; lo demás lo hacen lib/mensajes.ts (enviar con foto, quién ve qué), app/api/mensajes/foto (subir y ver, PRIVADA) y
-- lib/traduccion.ts (el mismo «Ver traducción» de 5h, con su caché y su tope).
-- · Fotos PRIVADAS: media.owner_kind 'chat', bajo «privado/m/» (nginx nunca sirve «privado/»). Al subirla, el servidor la endereza, la reduce,
--   le quita los metadatos (la ubicación de la cámara) y la pasa por el modelo propio de imágenes (regla `img`, como la Comunidad): si está
--   bien queda 'visible'; si el modelo la marca o no responde, 'review' (nunca abierto: nada se ve sin revisar) con la nota de por qué
--   (media.check_note). Mientras no se envía, owner_id = 'pendiente' y solo la ve quien la subió; al enviarla, owner_id = el id del mensaje.
--   La ven las dos partes de la conversación (el vecino; el negocio con la parte «Mensajes» del panel) y el equipo de To'Latino solo con un
--   reporte abierto de esa conversación o la foto en la cola «medios», y cada vez queda en la auditoría.
-- · chat_messages.media_id: la foto del mensaje (una foto va en un solo mensaje: índice único). Un mensaje puede ser solo la foto (body '').
-- · chat_messages.lang: el idioma del texto (lo detecta el servidor al enviar con el traductor propio; si no se sabe, el de la app de quien
--   escribe). null = no se sabe (lo de antes de 9t, las respuestas automáticas y los avisos del sistema): sin «Ver traducción».
-- · ugc_translations.target_kind 'chat_message' (la misma caché derivada de 5h) y la purga de la cuenta también la cuenta.
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

-- ── Fotos del chat ──
do $$ begin perform pg_temp.ampliar_check('media', 'media_owner_kind_check', array['chat']); end $$;
alter table media add column if not exists check_note text;
alter table media drop constraint if exists media_check_note_check;
alter table media add constraint media_check_note_check check (char_length(check_note) <= 300);
-- Una foto del chat siempre es privada y vive bajo «privado/m/» (o «privado/borrada» después de la purga de la cuenta).
alter table media drop constraint if exists media_chat_privada;
alter table media add constraint media_chat_privada check (owner_kind <> 'chat' or (private and (url like 'privado/m/%' or url = 'privado/borrada')));
-- El tope de subidas por persona y hora (app/api/mensajes/foto): cuenta las suyas recientes.
create index if not exists media_chat_subidas_idx on media (uploaded_by, created_at desc) where owner_kind = 'chat';

alter table chat_messages add column if not exists media_id uuid references media (id);
alter table chat_messages add column if not exists lang text;
alter table chat_messages drop constraint if exists chat_messages_lang_check;
alter table chat_messages add constraint chat_messages_lang_check check (lang in ('es', 'en'));
create unique index if not exists chat_messages_media_uidx on chat_messages (media_id) where media_id is not null;
-- Solo la foto (sin texto) también es un mensaje; lo demás como antes (oculto o vaciado por la purga: body '').
alter table chat_messages drop constraint if exists chat_messages_body_check;
alter table chat_messages add constraint chat_messages_body_check
  check ((char_length(body) between 1 and 1000) or (body = '' and (hidden_at is not null or media_id is not null)));
-- La foto la ponen las personas (vecino o negocio), nunca una respuesta automática ni un aviso del sistema.
alter table chat_messages drop constraint if exists chat_messages_foto_de_persona;
alter table chat_messages add constraint chat_messages_foto_de_persona check (media_id is null or sender in ('user', 'business'));

-- Cuando una persona del equipo decide una foto en revisión (se ve o se quita), las dos pantallas abiertas se ponen al día en vivo: el mismo aviso
-- de 9m (NOTIFY 'mensajes', solo de qué conversación es; nunca el texto ni la foto).
create or replace function media_chat_vivo() returns trigger language plpgsql as $$
declare t record;
begin
  select th.id, th.user_id, th.business_id into t from chat_messages m join chat_threads th on th.id = m.thread_id where m.media_id = new.id;
  if found then perform pg_notify('mensajes', json_build_object('k', 'chat', 't', t.id, 'u', t.user_id, 'b', t.business_id)::text); end if;
  return null;
end $$;
drop trigger if exists media_chat_vivo on media;
create trigger media_chat_vivo after update of status on media for each row
  when (new.owner_kind = 'chat' and new.status is distinct from old.status) execute function media_chat_vivo();

-- ── «Ver traducción» en Mensajes ──
do $$ begin perform pg_temp.ampliar_check('ugc_translations', 'ugc_translations_target_kind_check', array['chat_message']); end $$;

-- La purga de una cuenta: tampoco queda la traducción de lo que escribió en Mensajes (L680). Igual a 0134 más la línea de 'chat_message'.
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
          or (t.target_kind = 'chat_message' and t.target_id in (select x.id from chat_messages x where x.sender_user_id = cuenta));
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
