-- Fase 4 · 4l-2 · Guardián en la base: el total por escrito siempre es la suma de sus partes (honorario − crédito + gobierno).
-- Los extras opcionales van aparte y se suman solo con el OK del cliente.
alter table written_totals add constraint written_totals_suma check (total_cents = fee_cents - credit_cents + gov_cents);
