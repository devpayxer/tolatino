-- 0026 · Delivery del cliente (Fase 2 · bloque 2f): cada dirección guarda cómo se entrega (diseño ckVals · dropPref):
-- en la mano o en la puerta, qué hacer al llegar (timbre, no timbre, llamar, escribir) y la nota para el repartidor.
begin;
alter table user_addresses add column if not exists drop_pref jsonb;  -- {drop: 'mano'|'puerta', at: ['timbre'…], note: '…'}
commit;
