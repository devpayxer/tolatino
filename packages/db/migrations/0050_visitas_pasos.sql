-- 0050 · La cita de un taller y la visita del hogar en curso (Fase 4 · bloque 4c). Diseño: neg-auto-flow.js (en el taller ·
-- trabajando · listo para recoger) y neg-hogar-flow.js (va en camino · en tu casa · trabajando · terminado · no había nadie).
-- Los pasos viven en operations.status_detail (road · in · work · ready · noshow) y cada uno deja su evento; aquí solo
-- los avisos nuevos al cliente.
begin;
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('cita_camino', 'tx', null, true, '{"es": "Va en camino", "en": "On the way"}', '{"es": "{negocio} va en camino a tu casa. Llega dentro de tu franja.", "en": "{negocio} is on the way to your home, within your window."}'),
  ('cita_recibido', 'tx', null, true, '{"es": "Tu carro está en el taller", "en": "Your car is at the shop"}', '{"es": "{negocio} recibió tu carro. Nada se hace ni se cobra sin tu OK.", "en": "{negocio} received your car. Nothing is done or charged without your OK."}'),
  ('cita_listo', 'tx', null, true, '{"es": "Listo", "en": "Ready"}', '{"es": "{negocio} terminó. Revisa el trabajo antes de pagar.", "en": "{negocio} is done. Check the work before paying."}'),
  ('cita_listo_auto', 'tx', null, true, '{"es": "Tu carro está listo", "en": "Your car is ready"}', '{"es": "Tu carro está listo para recoger en {negocio}.", "en": "Your car is ready for pickup at {negocio}."}'),
  ('cita_nadie', 'tx', null, true, '{"es": "No había nadie en casa", "en": "Nobody was home"}', '{"es": "{negocio} llegó a tu casa y no pudo entrar.", "en": "{negocio} arrived at your home and could not get in."}')
on conflict (key) do nothing;
commit;
