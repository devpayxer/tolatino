-- Semilla de pruebas · 9i · Ciudades (fase9-apertura.md §2 0139 y §4 9i; el plan la llamaba 0053, que ya es de 9e). SOLO SANDBOX (decisión I; regla 13).
-- Reading en «beta» con una vecina invitada (Inés, +15705559701): ella ve Reading como abierta; cualquier otra persona ve «próximamente» y se puede anotar
-- en la lista de espera. Así se mira en el sandbox el estado que tendrá Hazleton en la beta cerrada (§3.1, 9u). Pasar Reading a «on» es del asistente
-- (Super Admin › Ciudades): esta semilla no abre ninguna ciudad. El equipo local de Reading: Raúl (+15705559702), Ciudad manager de Reading, de ficción
-- como el resto del equipo de las pruebas (entra con el código en pantalla: staff_mfa_pruebas, como 0057). La pone Ana (+15705550199).
-- Idempotente: Reading solo pasa a «beta» si estaba «próximamente»; la invitación se identifica por la ciudad y la persona.
begin;

insert into users (phone, phone_verified_at, first_name, last_name, home_city_id, lang, is_test) values
  ('+15705559701', now(), 'Inés', 'Invitada', 'rdg', 'es', true),
  ('+15705559702', now(), 'Raúl', 'Reading', 'rdg', 'es', true)
on conflict (phone) do nothing;

insert into staff_members (user_id, role, cities, status, added_by)
select u.id, 'ciudad', '{rdg}', 'active', a.id from users u, users a where u.phone = '+15705559702' and a.phone = '+15705550199'
on conflict (user_id) do nothing;
insert into staff_mfa_pruebas (phone, note) values ('+15705559702', 'Raúl · Ciudad manager de Reading de las pruebas')
on conflict (phone) do nothing;

update cities set status = 'beta' where id = 'rdg' and status = 'soon';

insert into city_beta_invites (city_id, user_id, invited_by, reason, is_test)
select 'rdg', u.id, a.id, 'Vecina de confianza para la beta de Reading (semilla del sandbox)', true
  from users u, users a
 where u.phone = '+15705559701' and a.phone = '+15705550199'
   and not exists (select 1 from city_beta_invites i where i.city_id = 'rdg' and i.user_id = u.id and i.revoked_at is null);

commit;
