-- 0122 · compa_copiloto (7g · docs/diseno/plan/fase7-compa.md §2 0122, §3 «Copiloto» y §4 7g). El copiloto del equipo en Super Admin ›
-- Soporte (la ficha de un caso TK-) y en la cola de ayudas escaladas (Colas › Ayuda con pedidos y citas): un RESUMEN del caso y un BORRADOR
-- de respuesta ES/EN que la persona del equipo lee, cambia si quiere y envía con su nombre por la acción de siempre. El copiloto nunca
-- envía, nunca devuelve dinero, nunca cambia el estado de un caso ni toca nada de dinero. El motor es el de 0118 (uso «copilot», modelo del
-- papel «copiloto» = Sonnet, interruptor compa.use.copilot, el mismo tope). Esta base suma:
-- · compa_drafts (SOLO INSERCIÓN): cada borrador que pidió alguien del equipo (resumen, borrador, siguiente paso, macro y ayuda sugeridas,
--   motor) de un caso TK- o de una ayuda escalada H-. Lo único que se anota después, UNA vez: si se envió tal cual, editado o se descartó
--   (used, used_at y, en un caso, el mensaje que salió). La base revisa que ese mensaje sea del mismo caso, de la misma persona del equipo,
--   para la persona (no una nota interna) y marcado from_draft. Nada se borra; rechaza tarjeta o SSN como Soporte.
-- · support_messages.from_draft: el mensaje del equipo salió de un borrador de El Compa (con o sin cambios). Solo un mensaje del equipo a la
--   persona; la regla de solo inserción de 0117 sigue igual y suma la columna (no cambia después).
-- · compa_conversations.help_request_id: la conversación del copiloto de una ayuda escalada (la de un caso usa support_case_id de 0118).
-- · Configuración › El Compa: compa_copiloto_dia_staff (borradores por persona del equipo al día).
-- Sin semilla. Idempotente: se puede aplicar dos veces.
begin;

-- ── El mensaje del equipo que salió de un borrador ──
alter table support_messages add column if not exists from_draft boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'support_messages_from_draft') then
    alter table support_messages add constraint support_messages_from_draft check (not from_draft or (sender = 'staff' and not internal));
  end if;
end $$;
-- La misma regla de 0117 (solo inserción; lo único que cambia, una vez, es ocultar el texto con motivo) con from_draft en lo que no cambia.
create or replace function support_messages_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'support_messages es solo de inserción'; end if;
  if tg_op = 'UPDATE' then
    -- Lo único que cambia, una vez: ocultar el texto con motivo (nada se borra).
    if old.hidden_at is not null or new.hidden_at is null
       or (new.case_id, new.sender, new.user_id, new.staff_id, new.body, new.photo_media_id, new.internal, new.macro_key, new.sys_key, new.vars, new.at, new.from_draft)
          is distinct from (old.case_id, old.sender, old.user_id, old.staff_id, old.body, old.photo_media_id, old.internal, old.macro_key, old.sys_key, old.vars, old.at, old.from_draft) then
      raise exception 'support_messages es solo de inserción (solo se oculta, con motivo, una vez)';
    end if;
    return new;
  end if;
  if texto_con_secretos(new.body) then raise exception 'support_sin_secretos: un mensaje no guarda números de tarjeta ni de seguro social'; end if;
  return new;
end $$;
drop trigger if exists support_messages_antes on support_messages;
create trigger support_messages_antes before insert or update or delete on support_messages for each row execute function support_messages_antes();

-- ── La conversación del copiloto de una ayuda escalada ──
alter table compa_conversations add column if not exists help_request_id bigint references help_requests (id);
create index if not exists compa_conv_copiloto_caso on compa_conversations (support_case_id, user_id) where use = 'copilot' and support_case_id is not null;
create index if not exists compa_conv_copiloto_ayuda on compa_conversations (help_request_id, user_id) where use = 'copilot' and help_request_id is not null;

-- ── Los borradores del copiloto (solo inserción; se anota una vez si se usó) ──
create table if not exists compa_drafts (
  id               uuid primary key default gen_random_uuid(),   -- va al navegador de quien lo pidió (como compa_actions): marca el envío
  conversation_id  bigint not null references compa_conversations (id),
  case_id          bigint references support_cases (id),
  help_request_id  bigint references help_requests (id),
  staff_id         uuid not null references users (id),
  city_id          text not null references cities (id),
  lang             text not null check (lang in ('es', 'en')),          -- el idioma del borrador (el de la persona que lo lee)
  summary          text not null check (char_length(summary) between 1 and 400),
  draft            text not null check (char_length(draft) between 1 and 2000),
  next_step        text check (char_length(next_step) <= 300),
  macro_key        text check (char_length(macro_key) <= 40),
  source_slug      text check (char_length(source_slug) <= 80),
  suggest_refund   boolean not null default false,                    -- «si corresponde, Resolver y devolver»: lo decide y lo toca una persona
  engine           text not null check (engine in ('modelo', 'reglas', 'simulador')),
  used             text check (used in ('sent_as_is', 'edited', 'discarded')),
  used_at          timestamptz,
  message_id       bigint references support_messages (id),
  is_test          boolean not null default false,
  at               timestamptz not null default now(),
  check ((case_id is null) <> (help_request_id is null)),
  check ((used is null) = (used_at is null)),
  check (message_id is null or (used in ('sent_as_is', 'edited') and case_id is not null))
);
create index if not exists compa_drafts_staff on compa_drafts (staff_id, at desc);
create index if not exists compa_drafts_caso on compa_drafts (case_id, at desc) where case_id is not null;
create index if not exists compa_drafts_ayuda on compa_drafts (help_request_id, at desc) where help_request_id is not null;
create index if not exists compa_drafts_sin_usar on compa_drafts (at) where used is null;
create index if not exists compa_drafts_mes on compa_drafts (at, used);
create or replace function compa_drafts_antes() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'compa_drafts es solo de inserción (un borrador no se borra)'; end if;
  if tg_op = 'INSERT' then
    if new.used is not null or new.message_id is not null then raise exception 'un borrador nace sin usar'; end if;
    if texto_con_secretos(new.summary) or texto_con_secretos(new.draft) or texto_con_secretos(new.next_step) then
      raise exception 'compa_sin_secretos: un borrador no guarda números de tarjeta ni de seguro social';
    end if;
    return new;
  end if;
  -- Lo único que se anota, UNA vez: si se envió tal cual, editado o se descartó (y en un caso, el mensaje que salió).
  if old.used is not null then raise exception 'compa_borrador_usado: ese borrador ya se usó o se descartó'; end if;
  if new.used is null
     or (new.id, new.conversation_id, new.case_id, new.help_request_id, new.staff_id, new.city_id, new.lang, new.summary, new.draft, new.next_step,
         new.macro_key, new.source_slug, new.suggest_refund, new.engine, new.is_test, new.at)
        is distinct from (old.id, old.conversation_id, old.case_id, old.help_request_id, old.staff_id, old.city_id, old.lang, old.summary, old.draft, old.next_step,
         old.macro_key, old.source_slug, old.suggest_refund, old.engine, old.is_test, old.at) then
    raise exception 'compa_drafts es solo de inserción (solo se anota una vez si se usó)';
  end if;
  -- El mensaje que salió tiene que ser de ESE caso, de ESA persona del equipo, para la persona (no una nota interna) y marcado from_draft.
  if new.message_id is not null and not exists (
       select 1 from support_messages m where m.id = new.message_id and m.case_id = new.case_id and m.staff_id = new.staff_id
          and m.sender = 'staff' and not m.internal and m.from_draft) then
    raise exception 'compa_borrador_mensaje: ese mensaje no salió de este borrador';
  end if;
  new.used_at := now();
  return new;
end $$;
drop trigger if exists compa_drafts_antes on compa_drafts;
create trigger compa_drafts_antes before insert or update or delete on compa_drafts for each row execute function compa_drafts_antes();

-- ── Configuración › El Compa ──
insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('compa_copiloto_dia_staff', 10, 2000, 200, '{"es":"borradores al día","en":"drafts per day"}', 'compa', '{"es":"Borradores del copiloto por persona del equipo al día","en":"Copilot drafts per team member per day"}',
    '{"es":"Pasado esto, ese día la persona escribe sin «Sugerir respuesta con El Compa» (las macros siguen). Cuenta aparte del tope del mes.","en":"Past this, that day the person writes without «Suggest a reply with El Compa» (macros still work). Counted apart from the monthly cap."}', true, null, null, 224)
on conflict (key) do update set min = excluded.min, max = excluded.max, def = excluded.def, unit = excluded.unit, section = excluded.section,
  label = excluded.label, help = excluded.help, editable = excluded.editable, bloqueo = excluded.bloqueo, edit_in = excluded.edit_in, sort = excluded.sort;

commit;
