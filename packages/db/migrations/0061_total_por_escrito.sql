-- Fase 4 · 4l-2 · «El total, por escrito» (fase4-salud-pro.md §4l y Preguntas #1). Después de la consulta, la oficina manda el
-- total: honorario, lo del gobierno (aparte, a la agencia), el crédito de la consulta y extras opcionales que el cliente acepta
-- o no. El cliente lo acepta (queda registrado con hora, versión e IP: es su acuerdo) o no. Nada se cobra en la app: se paga a
-- la oficina; lo del gobierno nunca pasa por To'Latino. Una versión nueva reemplaza a la anterior (superseded); nada se borra.
create table written_totals (
  id bigserial primary key,
  operation_id bigint not null references operations(id),
  business_id text not null references businesses(id),
  city_id text not null references cities(id),
  version smallint not null check (version between 1 and 20),
  fee_cents int not null check (fee_cents between 0 and 10000000),
  gov_cents int not null default 0 check (gov_cents between 0 and 5000000),
  credit_cents int not null default 0 check (credit_cents >= 0 and credit_cents <= fee_cents),
  hours text check (hours ~ '^\d{1,3}(–\d{1,3})?$'),
  extras jsonb not null default '[]'::jsonb, -- [{name: {es, en}, cents}] · opcionales, cada uno con el OK del cliente
  note jsonb,                                  -- {es, en} · lo que incluye (sin datos del caso)
  total_cents int not null check (total_cents >= 0), -- honorario − crédito + gobierno (lo que dice «TOTAL POR ESCRITO»)
  valid_until timestamptz not null,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'superseded', 'expired')),
  accepted_at timestamptz, accepted_ip text, accepted_extras int[],
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (operation_id, version)
);
create index written_totals_op_idx on written_totals (operation_id, version desc);
create index written_totals_vence_idx on written_totals (valid_until) where status = 'sent';

-- La aceptación no se toca: una vez aceptado, el total queda como se aceptó.
create or replace function written_totals_inmutable() returns trigger language plpgsql as $$
begin
  if old.status = 'accepted' then raise exception 'el total aceptado no se puede cambiar'; end if;
  if new.total_cents <> old.total_cents or new.fee_cents <> old.fee_cents or new.gov_cents <> old.gov_cents or new.credit_cents <> old.credit_cents or new.extras <> old.extras then
    raise exception 'un total mandado no se cambia: se manda una versión nueva';
  end if;
  return new;
end $$;
create trigger written_totals_inmutable before update on written_totals for each row execute function written_totals_inmutable();

insert into notif_templates (key, grp, pref, sms, title, body) values
  ('pro_total', 'tx', 'cit', true, '{"es":"Tu total por escrito","en":"Your total in writing"}', '{"es":"{negocio} te mandó el total por escrito: {total}. Revísalo con calma en la app; nada se cobra hasta que lo aceptes.","en":"{negocio} sent you the total in writing: {total}. Review it in the app; nothing is charged until you accept."}'),
  ('pro_total_vence', 'tx', 'cit', false, '{"es":"Tu total vence pronto","en":"Your total expires soon"}', '{"es":"El total por escrito de {negocio} vence en 5 días.","en":"The written total from {negocio} expires in 5 days."}'),
  ('pro_terminado', 'tx', 'cit', true, '{"es":"Trámite terminado","en":"Case finished"}', '{"es":"{negocio} marcó tu trámite como terminado. Cuéntanos cómo te fue.","en":"{negocio} marked your case as finished. Tell us how it went."}'),
  ('biz_pro_ok', 'biz', null, true, '{"es":"Contrataron","en":"Hired"}', '{"es":"{cliente} aceptó el total por escrito: {total}{extras}.","en":"{cliente} accepted the written total: {total}{extras}."}'),
  ('biz_pro_no', 'biz', null, false, '{"es":"No contrató","en":"Did not hire"}', '{"es":"{cliente} no contrató por ahora. Solo pagó la consulta.","en":"{cliente} did not hire for now. Only paid the consultation."}')
on conflict (key) do nothing;
