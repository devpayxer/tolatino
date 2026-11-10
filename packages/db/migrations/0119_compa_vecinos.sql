-- 0119 · compa_vecinos (7d · docs/diseno/plan/fase7-compa.md §2 0119, §3 y §4 7d). El Compa para vecinos: la hoja de ayuda (2as) sobre cada
-- operación y los pasos guiados (2at) en Soporte. Esta base solo suma lo que esas pantallas necesitan; el motor es de 0118.
-- · operation_events.actor suma 'compa' (MD L1521: «cancel_request confirmado = OperationEvent con by "compa"»). Lo escribe la MISMA
--   función de cancelar del cliente de cada módulo (citas-flujo, reservas) cuando la llama acciones.ts confirmar(): la persona confirmó; El
--   Compa lo preparó. operations.cancelled_by sigue 'user' (quien decidió fue la persona).
-- · help_requests.origin ('form' | 'compa'), DERIVADO por la base al crear la solicitud: 'compa' si en las últimas 2 horas El Compa le abrió a
--   ESA persona el formulario de ESA operación desde la hoja (mensaje de El Compa con step_key 'formulario'). Nadie lo escribe a mano y no cambia.
-- · compa_reads (SOLO INSERCIÓN): quién del equipo abrió el hilo de qué conversación y cuándo (MD «solo el equipo con permiso compa lee el
--   hilo»). El plan lo ponía en 0124 (7i); la ficha con el hilo llega en 7d, así que la tabla llega aquí (se dice en REVISION).
-- · Plantilla compa_caso (vecino, en la app): «Tu caso pasó a Soporte».
-- · app_events.name suma compa_abrir, compa_mensaje, compa_accion y compa_persona (analítica sin texto ni personas).
-- · Índice para la hoja: las conversaciones de una operación.
-- Idempotente: se puede aplicar dos veces.
begin;

-- ── El Compa como autor de un evento de la operación (la persona confirmó lo que El Compa preparó) ──
alter table operation_events drop constraint if exists operation_events_actor_check;
alter table operation_events add constraint operation_events_actor_check check (actor in ('user', 'business', 'member', 'system', 'admin', 'compa'));

-- ── ¿Cuántas ayudas abrió El Compa? (derivado por la base) ──
alter table help_requests add column if not exists origin text not null default 'form';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'help_requests_origin_check') then
    alter table help_requests add constraint help_requests_origin_check check (origin in ('form', 'compa'));
  end if;
end $$;
create index if not exists compa_conv_operacion on compa_conversations (operation_id, user_id) where operation_id is not null;
create or replace function help_requests_origen() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then new.origin := old.origin; return new; end if;
  new.origin := case when exists (
      select 1 from compa_conversations c join compa_messages m on m.conversation_id = c.id
       where c.operation_id = new.operation_id and c.user_id = new.user_id and c.use = 'neighbor'
         and m.sender = 'compa' and m.step_key = 'formulario' and m.at > now() - interval '2 hours')
    then 'compa' else 'form' end;
  return new;
end $$;
drop trigger if exists help_requests_origen on help_requests;
create trigger help_requests_origen before insert or update of origin on help_requests for each row execute function help_requests_origen();

-- ── Lecturas del equipo (solo inserción) ──
create table if not exists compa_reads (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references compa_conversations (id),
  staff_id        uuid not null references users (id),
  city_id         text not null references cities (id),
  at              timestamptz not null default now()
);
create index if not exists compa_reads_conv on compa_reads (conversation_id, at desc);
create index if not exists compa_reads_staff on compa_reads (staff_id, at desc);
create or replace function compa_reads_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'compa_reads es solo de inserción'; end if;
  return new;
end $$;
drop trigger if exists compa_reads_antes on compa_reads;
create trigger compa_reads_antes before insert or update or delete on compa_reads for each row execute function compa_reads_antes();

-- ── Aviso al vecino ──
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('compa_caso', 'tx', null, false, '{"es":"Tu caso pasó a Soporte · {num}","en":"Your case went to Support · {num}"}',
    '{"es":"El Compa le pasó tu caso con el resumen. Una persona del equipo te escribe {cuando}. Lo ves en Mi cuenta › Ayuda y soporte.","en":"El Compa passed your case on with a summary. A person from the team writes to you {cuando}. See it in My account › Help and support."}')
on conflict (key) do update set title = excluded.title, body = excluded.body
  where notif_templates.edited_by is null;

-- ── Analítica propia (lista cerrada; la misma que lib/eventos.ts) ──
alter table app_events drop constraint if exists app_events_name_check;
alter table app_events add constraint app_events_name_check check (name in ('ver_categoria', 'ver_ficha', 'buscar', 'contactar', 'entrar', 'registrarse', 'publicar_negocio', 'recomendar', 'reclamar', 'reportar_foto', 'pedir_aviso', 'pedir', 'ver_evento', 'rsvp', 'guardar_evento', 'compartir_evento', 'compa_abrir', 'compa_mensaje', 'compa_accion', 'compa_persona'));

commit;
