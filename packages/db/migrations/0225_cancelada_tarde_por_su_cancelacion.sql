-- 0225 · La cancelación tarde cobrada sin su regla se busca por cuándo se CANCELÓ, no por cuándo se cobró (25 nov, revisión de efe56b9; guardián
-- liberarMira).
-- Antes: cobros › barrerCobradasTarde miraba los cobros capturados en los últimos dos días (captured_at), pero un viaje o un evento privado se cobra al
-- aceptarse, días antes de que quien pagó cancele tarde: si el proceso moría entre la cancelación y la regla (la mitad, la devolución del resto, el
-- depósito que se queda), el barrido nunca lo veía. Ahora parte de operations por cancelled_at (los últimos días; lo que sale de la ventana sin repararse
-- abre su alerta) y el reintento del aviso de lo aplicado también (avisoCobroFalta, sin depender de la alerta cobrada:). Este índice parcial es el de las
-- dos consultas: solo las cancelaciones tarde de viajes y eventos privados (pocas filas), por fecha de cancelación.
begin;
create index if not exists operations_cancelada_tarde_idx on operations (cancelled_at) where cancel_reason = 'tarde' and kind in ('trip', 'private_event');
commit;
