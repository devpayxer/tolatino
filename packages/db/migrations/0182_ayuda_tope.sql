-- 9t (19 nov) · El tope de «Ayuda con …» entra al catálogo de Configuración (LAUNCH «El tope de Ayuda con … no tiene su prueba»).
-- · ayuda_tope_dia: cuántas solicitudes de ayuda (pedido, cita, visita, fiesta, viaje, noche, inscripción, boletos…) abre una persona en
--   24 h. Antes era un 5 fijo en lib/ayuda.ts y lib/ayuda-cita.ts; ahora lo leen las dos con cfg_int (acotado) dentro de la misma
--   transacción que cuenta y el Super Admin lo cambia con motivo (Configuración › Soporte). Un reporte de seguridad nunca se frena.
-- Idempotente: insert … on conflict do nothing.
begin;

insert into config_keys (key, min, max, def, unit, section, label, help, editable, bloqueo, edit_in, sort) values
  ('ayuda_tope_dia', 1, 50, 5, '{"es":"solicitudes en 24 h","en":"requests in 24 h"}', 'soporte',
    '{"es":"Solicitudes de ayuda que abre una persona en 24 h","en":"Help requests a person opens in 24 h"}',
    '{"es":"Ayuda con un pedido, una cita, una visita, una fiesta, un viaje, la noche, una inscripción o boletos. Al llegar, la persona ve «Abriste muchas solicitudes hoy». Un reporte de seguridad nunca se frena por este límite.","en":"Help with an order, booking, visit, party, trip, night out, enrollment or tickets. Once reached, the person sees «You opened many requests today». A safety report is never blocked by this limit."}',
    true, null, null, 305)
on conflict (key) do nothing;

commit;
