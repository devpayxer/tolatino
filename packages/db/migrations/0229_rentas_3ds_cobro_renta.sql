-- 0229 · Rentas: 3-D Secure en el COBRO de la renta al recogerla (LAUNCH 9q, 28 nov). Tras retener el depósito, la renta se cobra fuera de sesión
-- (captura automática); si el banco pide autenticar ese cobro, antes contaba como un «no» (falloRecoger y el depósito se soltaba). Ahora
-- (lib/rentas.ts › terminarCobroRenta) la verificación queda a nombre del cliente como la del depósito (payment_actions kind 'renta' con su operación; su
-- base es la llave de la intención + «-cobro»), el depósito sigue retenido mientras espera y le llega este aviso con el enlace a la hoja
-- (/pago/verificar?pi=…). Al confirmarla, la renta queda cobrada con ESE intento; si no la confirma en verificacion_min, el intento se cancela, el
-- depósito se suelta una vez y se aplica lo de siempre (falloRecoger: cambia la tarjeta).
-- (1) La plantilla renta_verify_cobro (cliente, como renta_verify: SMS si no hay push). Nada más: payment_actions ya acepta 'renta' con su operación (0228).
-- Compatible con la versión anterior de la app: solo suma una plantilla que la app anterior no usa. Idempotente; nada se borra.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
insert into notif_templates (key, grp, pref, sms, sms_mode, push, push_private, app, biz_pref, title, body) values
  ('renta_verify_cobro', 'tx', null, true, 'sin_push', true, false, 'cliente', null, '{"es": "Tu banco pide confirmar el cobro de la renta", "en": "Your bank asks you to confirm the rental charge"}',
   '{"es": "Para entregarte {articulo}, {negocio} cobra {monto} de renta y tu banco pide que confirmes que eres tú. Ábrelo y confírmalo en los próximos {min} minutos; si no, no se cobra nada y la renta sigue apartada.", "en": "To hand you {articulo}, {negocio} charges {monto} rent and your bank asks you to confirm it is you. Open it and confirm within the next {min} minutes; otherwise nothing is charged and the rental stays on hold."}')
on conflict (key) do nothing;
commit;
