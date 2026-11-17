-- Sandbox · el fundador pidió abrir las ciudades para ver los negocios demo (17 nov). SOLO esta carpeta (infra/pruebas/demos): el CI no la carga
-- (sus pruebas cuentan con Allentown, Wilkes-Barre, Scranton y Reading «próximamente») y producción nunca. En la base del sandbox la regla de
-- cities deja el cambio directo y lo anota en city_status_log como «directo», con este motivo. Idempotente: solo toca las que no están abiertas.
begin;
select set_config('tl.motivo', 'Sandbox: abrir para ver los negocios demo (pedido del fundador, 17 nov)', true);
update cities set status = 'on', updated_at = now() where id in ('alw', 'wbr', 'scr', 'rdg') and status <> 'on';
commit;
