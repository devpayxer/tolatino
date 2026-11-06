-- Fase 4 · 4j-2 · Los avisos que faltaban de una cita de Doctores, también neutros (sin consultorio, servicio ni paciente).
insert into notif_templates (key, grp, pref, sms, title, body) values
  ('sal_cita_alt_fin', 'tx', 'cit', true, '{"es":"Venció la otra hora","en":"The new time expired"}', '{"es":"Venció la otra hora que te propusieron. Puedes pedir otra cita en la app.","en":"The new time you were offered expired. You can request another visit in the app."}'),
  ('biz_sal_cx', 'biz', null, true, '{"es":"Cita cancelada","en":"Visit cancelled"}', '{"es":"Se canceló la cita del {dia} a las {hora}. La hora quedó libre.","en":"The {dia} {hora} visit was cancelled. The time is open again."}'),
  ('biz_sal_alt_ok', 'biz', null, true, '{"es":"Aceptaron la otra hora","en":"New time accepted"}', '{"es":"Aceptaron la otra hora: {dia} a las {hora}. La cita quedó confirmada.","en":"The new time was accepted: {dia} at {hora}. The visit is confirmed."}'),
  ('biz_sal_tarde', 'biz', null, true, '{"es":"Llega tarde","en":"Running late"}', '{"es":"El paciente de las {hora} avisó que llega {min} min tarde.","en":"The {hora} patient said they will be {min} min late."}')
on conflict (key) do nothing;
