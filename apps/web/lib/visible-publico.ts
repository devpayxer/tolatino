/* 9t · Lo que la página pública de un negocio muestra de lo que vende, en UNA sola definición: la usan las fichas (lib/pedir.ts, lib/citas.ts,
   lib/oficios-publico.ts, lib/salud-publico.ts, lib/pro-publico.ts) y Buscar › «Platos y servicios» (lib/buscar-platos.ts). Si una ficha deja de
   mostrar algo, Buscar deja de encontrarlo en el mismo cambio. Guardián buscarPlatosComoLaFicha: las fichas leen de aquí (sin copia del filtro) y
   Buscar también. Solo texto SQL (sin valores): `i` es el alias de items, `s` el de item_sections, `m` el de business_members. */

/* Menú (Comida): el plato que no se quitó y que To'Latino no ocultó. */
export const PLATO_VIVO = (i: string) => `${i}.module = 'menu' and ${i}.removed_at is null and ${i}.status = 'live'`;
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
