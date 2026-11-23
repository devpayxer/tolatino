-- 0213 · Las llaves de los proveedores en el llavero (docs/REVISION.md «Cómo llegan las llaves de terceros al servidor», 23 nov).
-- · store_secrets.kind suma las llaves de TEXTO de los proveedores que el servidor de la app usa: Stripe, Telnyx, WhatsApp (Meta), Amazon SES y su
--   tema de SNS, y Anthropic. El fundador las pone él mismo en Super Admin › Sistema › Integraciones › Llaves (el valor nunca pasa por Claude, el
--   repo ni el chat). Cada nombre es el de su variable en minúsculas (apps/web/lib/tiendas/llavero.ts, PROVEEDORES); la variable del entorno
--   (el sobre sellado) sigue de respaldo y, si existe, manda (apps/web/lib/llaves-proveedores.ts).
-- · store_secrets avisa por NOTIFY (canal tl_config, la misma función config_avisar de 0133): poner, rotar o retirar una llave se nota al instante
--   en todos los procesos (el lector guarda las llaves en la memoria del proceso y las olvida con el aviso).
-- · store_secret_checks: cada «Probar» (la llamada de solo lectura más barata contra el proveedor, o el simulador en pruebas), SOLO inserción: qué
--   llave (tipo y huella; nunca el valor), de dónde la tomó el servidor (llavero o entorno), si sirvió y un código corto del resultado, quién y cuándo.
--   «Lo que te toca» marca solo los pasos 9-1.x cuando la llave está y su última prueba de ESA huella salió bien.
-- Candados: store_secrets es diminuta (decenas de filas): el check nuevo se valida al momento. «set local lock_timeout» como 0211: si algo tiene la
-- tabla, la migración falla entera en 3 s y el siguiente despliegue la reintenta.
-- Solo expande (un check más ancho, un disparador, una tabla nueva). Para deshacerla: drop del disparador store_secrets_avisa, de la tabla
-- store_secret_checks (y su función) y volver al check de 0131 (solo si ninguna fila usa un tipo nuevo).
begin;
set local lock_timeout = '3s';

alter table store_secrets drop constraint if exists store_secrets_kind_check;
alter table store_secrets add constraint store_secrets_kind_check check (kind in ('asc_api_key', 'apns_key', 'fcm_service_account', 'play_service_account',
  'android_upload_keystore', 'ios_dist_cert', 'pass_type_cert', 'google_wallet_sa', 'pass_type_csr', 'github_token',
  'stripe_secret_key', 'stripe_publishable_key', 'stripe_webhook_secret', 'telnyx_api_key', 'telnyx_public_key', 'telnyx_from',
  'whatsapp_app_secret', 'whatsapp_verify_token', 'whatsapp_token', 'whatsapp_waba_id', 'ses_access_key_id', 'ses_secret_access_key',
  'correo_sns_tema', 'anthropic_api_key'));

drop trigger if exists store_secrets_avisa on store_secrets;
create trigger store_secrets_avisa after insert or update on store_secrets for each statement execute function config_avisar();

create table if not exists store_secret_checks (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind ~ '^[a-z][a-z0-9_]{2,40}$'),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  source      text not null check (source in ('llavero', 'entorno')),
  ok          boolean not null,
  result      text not null check (result ~ '^[a-z0-9_]{2,40}$'),
  by          uuid not null references users (id),
  at          timestamptz not null default now()
);
create index if not exists store_secret_checks_kind on store_secret_checks (kind, at desc);
create or replace function store_secret_checks_antes() returns trigger language plpgsql as $$
begin
  if tg_op <> 'INSERT' then raise exception 'store_secret_checks es solo de inserción'; end if;
  new.at := now();
  return new;
end $$;
drop trigger if exists store_secret_checks_antes on store_secret_checks;
create trigger store_secret_checks_antes before insert or update or delete on store_secret_checks for each row execute function store_secret_checks_antes();

commit;
