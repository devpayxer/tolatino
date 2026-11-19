/* 9t · Lo que la página pública de un negocio muestra de lo que vende, en UNA sola definición: la usan las fichas (lib/pedir.ts, lib/citas.ts,
   lib/oficios-publico.ts, lib/salud-publico.ts, lib/pro-publico.ts y, desde 9t-2, lib/fiestas-publico.ts, lib/trans-publico.ts,
   lib/noche-publico.ts, lib/inscripciones-publico.ts y lib/fe-publico.ts) y Buscar › «Platos y servicios» (lib/buscar-platos.ts). Si una ficha deja de
   mostrar algo, Buscar deja de encontrarlo en el mismo cambio. Guardián buscarPlatosComoLaFicha: las fichas leen de aquí (sin copia del filtro) y
   Buscar también. Solo texto SQL (sin valores): `i` es el alias de items, `s` el de item_sections, `m` el de business_members. */

/* Menú (Comida): el plato que no se quitó y que To'Latino no ocultó. */
export const PLATO_VIVO = (i: string) => `${i}.module = 'menu' and ${i}.removed_at is null and ${i}.status = 'live'`;
/* 9t · Mercados (lib/merc-publico.ts mercPublico): el producto que no se quitó y que To'Latino no ocultó (lo de 21+ o solo en la tienda también sale,
   con «Cómo llegar»). Tiendas, y la tienda de Auto, Hogar y Transporte (lib/apartados.ts tiendaVenta): lo que se vende en la app (sin 21+ ni solo en la
   tienda). Las fichas y los platos guardados (lib/platos-guardados.ts) leen esto mismo. */
export const PRODUCTO_MERCADO_VIVO = (i: string) => `${i}.module = 'shop' and ${i}.removed_at is null and ${i}.status = 'live'`;
export const ARTICULO_TIENDA_VIVO = (i: string) => `${i}.module = 'shop' and ${i}.removed_at is null and ${i}.sell and not ${i}.in_store_only and ${i}.age_min = 0 and ${i}.status = 'live'`;
/* La sección del menú que se ve en la página («Se ve en tu página»). */
export const SECCION_MENU_VISIBLE = (s: string) => `${s}.module = 'menu' and ${s}.removed_at is null and ${s}.visible`;

/* Servicios de Auto y Hogar, Doctores y Profesionales: se vende en línea, no lo ocultó To'Latino y no es un extra. */
export const SERVICIO_VIVO = (i: string) => `${i}.module = 'svc' and ${i}.removed_at is null and ${i}.sell and ${i}.status = 'live' and not ${i}.is_extra`;

/* Servicios de Belleza (citas): lo que se reserva con alguien (rentas, ventas y autos tienen su propio módulo). Los extras se listan aparte. */
export const SERVICIO_BELLEZA = (i: string) => `${i}.module = 'svc' and ${i}.removed_at is null and ${i}.sell and ${i}.status <> 'hidden' and coalesce(${i}.svc_kind, '') not in ('renta', 'venta', 'auto')`;

/* Quien recibe citas y sale en la página (lib/citas.ts gente(): activo, en la página, sin ocultar por To'Latino, que recibe citas). */
export const PERSONA_RECIBE = (m: string) => `${m}.status = 'active' and ${m}.show_on_page and ${m}.hidden_by_admin is null and ${m}.takes_bookings`;
/* Un servicio de Belleza sale si alguien que recibe lo hace: los marcados en staff_services o, sin nadie marcado, cualquiera que recibe
   (lib/citas.ts servicios(): `hacen`). */
export const ALGUIEN_LO_HACE = (i: string) =>
  `exists (select 1 from business_members m where m.business_id = ${i}.business_id and ${PERSONA_RECIBE("m")}
            and (not exists (select 1 from staff_services ss where ss.item_id = ${i}.id) or exists (select 1 from staff_services ss where ss.item_id = ${i}.id and ss.member_id = m.id)))`;

/* 9t-2 · Las demás categorías que venden con servicios: Fiestas (lib/fiestas-publico.ts), Transporte (lib/trans-publico.ts) e Iglesias
   (lib/fe-publico.ts) listan lo que cumple SERVICIO_VIVO; Noche y Educación/Niños/Deporte, además, solo lo de su tipo (abajo). Las fichas y
   Buscar leen esto mismo. */
/* Educación, Niños y Deporte (lib/inscripciones-publico.ts): cursos, programas o membresías con su forma de cobrar. */
export const CURSO_INSC = (i: string) => `${i}.svc_kind in ('curso', 'mes', 'semana', 'clase', 'hora')`;
/* Noche (lib/noche-publico.ts): sus tipos; la Lista solo con la lista encendida («Esta noche», noche_settings.list_on) y la noche especial solo
   con su evento de To'Latino en vivo (una fecha que sale al público y no terminó). */
export const SERVICIO_NOCHE = (i: string) =>
  `${i}.svc_kind in ('cover', 'lista', 'mesa', 'vip', 'fecha', 'evento')
        and (${i}.svc_kind <> 'lista' or exists (select 1 from noche_settings ns where ns.business_id = ${i}.business_id and ns.list_on))
        and (${i}.svc_kind <> 'evento' or exists (select 1 from events e where e.id::text = ${i}.svc_attrs->>'event_id' and e.business_id = ${i}.business_id
                                                   and exists (select 1 from event_dates d where d.event_id = e.id and d.listable and d.ends_at > now())))`;
