-- 0184 · 9t (19 nov) · Pedir el archivo con tus datos y borrar tu cuenta con la llave de acceso, además del código por SMS
-- (LAUNCH «Pedir el archivo con la llave de acceso»; fase9-apertura.md §3.7 «con el código de entrada otra vez (o la llave)»).
-- Autenticación (Opus/high). Lo que pone la base; lo demás lo hace lib/llaves/llaves.ts (retoConfirmar, confirmarConLlave, usarConfirmacionEn),
-- con la MISMA verificación de la firma que entrar (firmaDeLlave; guardián confirmarConLlave):
-- · webauthn_challenges: dos propósitos nuevos, uno por cosa que se confirma: 'data_export' (pedir el archivo, el tuyo o el de tu negocio) y
--   'account_delete' (borrar tu cuenta). Los mismos nombres que el código por SMS (otp_codes.purpose). Un reto de entrar no sirve para confirmar,
--   uno de confirmar no sirve para entrar, y el del archivo no sirve para borrar (gastarReto filtra por propósito). Los de confirmar nacen
--   SIEMPRE atados a una cuenta (user_id no nulo): la de la sesión que lo pidió. Lo demás no cambia: un uso, vence a los passkey_reto_s,
--   solo su huella.
-- · passkey_log (solo inserción, igual que antes): 'confirmo' (la llave confirmó; detail = el propósito) y 'confirmar_fallo' (con su motivo).
--   El tope de fallos por hora (passkey_fallos_hora) cuenta los de confirmar por cuenta y por dirección: sus dos índices.
-- El pedido mismo queda donde siempre: account_changes 'export' (el archivo) y 'delete' (el borrado).
-- Idempotente: se puede aplicar dos veces. Nada se borra.
begin;

alter table webauthn_challenges drop constraint if exists webauthn_challenges_purpose_check;
alter table webauthn_challenges add constraint webauthn_challenges_purpose_check
  check (purpose in ('registro', 'entrar', 'confirmar', 'data_export', 'account_delete'));
alter table webauthn_challenges drop constraint if exists webauthn_challenges_confirmar_con_cuenta;
alter table webauthn_challenges add constraint webauthn_challenges_confirmar_con_cuenta
  check (purpose not in ('data_export', 'account_delete') or user_id is not null);

alter table passkey_log drop constraint if exists passkey_log_action_check;
alter table passkey_log add constraint passkey_log_action_check
  check (action in ('registrada', 'registro_fallo', 'entro', 'entrar_fallo', 'quitada', 'revocada', 'contador', 'confirmo', 'confirmar_fallo'));
create index if not exists passkey_log_conf_fallos_user_idx on passkey_log (user_id, at desc) where action = 'confirmar_fallo';
create index if not exists passkey_log_conf_fallos_ip_idx on passkey_log (ip, at desc) where action = 'confirmar_fallo';

commit;
