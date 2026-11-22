import "server-only";
import type { PoolClient } from "pg";
import { tx } from "./db";
import { ipCliente, mismoOrigen, yo } from "./cuenta";
import { evento } from "./eventos";

/* Toque de contacto (llamar, cómo llegar, compartir, escribir…): alimenta las estadísticas del negocio en su panel y en el Super Admin
   (contact_taps). Es lo ÚNICO que escribe contact_taps (guardián toqueSobreviveSalida). La única puerta es /api/toque, que la página llama con
   lib/contar-toque.ts (sendBeacon o fetch keepalive) porque casi siempre la página se va justo después (tel:, el mapa del teléfono, compartir):
   en Safari una acción del servidor se cancelaba al abrir tel: y el toque no se contaba (CI 45042985880, tarAK en iPhone SE e iPad).
   Las reglas son las de siempre (antes en app/(app)/acciones.ts, registrarToque): mismo origen; id y tipo válidos; una vez cada 10 min por
   persona (o red) y negocio; máx. 60 por red y hora; la gente del propio negocio no cuenta; y el evento «contactar».
   22 nov · La bandeja de lib/contar-toque.ts manda el mismo toque más de una vez (el beacon, que no confirma, y el reintento, que sí; ver ahí).
   La ventana de 10 min NO distingue por tipo: con un toque contado, cualquier otro de esa persona (o red) a ese negocio en 10 min no cuenta,
   así que un reintento nunca se cuela como otro toque. Pero dos copias que llegan A LA VEZ pasaban las dos el «not exists» (cada consulta ve la
   base de antes de la otra): por eso cada toque toma primero un candado de la transacción por (negocio o semilla, persona o red) y la consulta
   corre después, viendo lo que la otra ya dejó. Las reglas no cambian.
   22 nov (0211) · Quedaba un hueco: una persona SIN sesión cuyo primer envío llegó, cuyo reintento falló y que vuelve desde OTRA red (otra IP)
   no la ve la ventana (otra red) ni el candado (otra llave), y contaba dos veces. Ahora el id del toque de la bandeja viaja («toque», un uuid) y la
   base lo impone: contact_taps.tap_key con índice único parcial y «on conflict do nothing» (una copia del mismo toque no escribe nada, desde la
   red que sea). Sin id (una página vieja abierta) cuenta como antes. Las reglas no cambian. */
/* El candado: dos copias del mismo toque (misma persona o red, mismo negocio o semilla) entran de una en una. */
const enFila = (c: PoolClient, llave: string) => c.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [llave]);
const ID_NEG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/* El id del toque (lib/contar-toque.ts · uuid()): un uuid o nada. */
const TOQUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const TOQUES = new Set(["call", "whatsapp", "directions", "share", "calendar", "copy", "message"]);

export async function contarToque(id: string, kind: string, origen: string, toque: string | null = null): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (typeof id !== "string" || !ID_NEG.test(id) || !TOQUES.has(kind)) return;
  if (toque !== null && (typeof toque !== "string" || !TOQUE.test(toque))) return;
  const [u, ip] = await Promise.all([yo(), ipCliente()]);
  // Cuenta para las cifras del panel: una vez cada 10 min por persona (o red) y negocio; máx. 60 por red y hora;
  // la gente del propio negocio no cuenta. Nadie puede inflar los contactos de un negocio.
  const t = await tx(async (c) => { await enFila(c, `toque:${id}:${u?.id ?? ip ?? ""}`); return c.query<{ city: string }>(
    `insert into contact_taps (business_id, user_id, kind, source, ip, tap_key)
     select b.id, $2, $3, left($4, 60), $5::inet, $6::uuid from businesses b where b.id = $1 and b.status = 'active'
        and not exists (select 1 from business_members m where m.business_id = b.id and m.user_id = $2::uuid and m.status = 'active')
        and not exists (select 1 from contact_taps t where t.business_id = b.id and t.at > now() - interval '10 minutes'
                         and (($2::uuid is not null and t.user_id = $2::uuid) or ($2::uuid is null and $5::inet is not null and t.ip = $5::inet and t.user_id is null)))
        and ($5::inet is null or (select count(*) from contact_taps t where t.ip = $5::inet and t.at > now() - interval '1 hour') < 60)
     on conflict do nothing
     returning (select city_id from businesses where id = business_id) as city`,
    [id, u?.id ?? null, kind, String(origen ?? ""), ip, toque],
  ); });
  if (t.rows[0]) await evento("contactar", { ref: id, ciudad: t.rows[0].city, userId: u?.id ?? null, props: { kind } });
}

/* 9g · «Llamar» desde una semilla (un negocio que un vecino recomendó y que aún no reclamó su página; LAUNCH L175): cuenta como un contacto de la
   semilla (contact_taps.seed_id), con las mismas reglas que un negocio: una vez cada 10 min por persona (o red) y semilla, máx. 60 por red y hora. */
export async function contarToqueSemilla(id: string, origen: string, toque: string | null = null): Promise<void> {
  if (!(await mismoOrigen())) return;
  if (typeof id !== "string" || !/^\d{1,18}$/.test(id)) return;
  if (toque !== null && (typeof toque !== "string" || !TOQUE.test(toque))) return;
  const [u, ip] = await Promise.all([yo(), ipCliente()]);
  const t = await tx(async (c) => { await enFila(c, `semilla:${id}:${u?.id ?? ip ?? ""}`); return c.query<{ city: string }>(
    `insert into contact_taps (seed_id, user_id, kind, source, ip, tap_key)
     select s.id, $2, 'call', left($3, 60), $4::inet, $5::uuid from seed_listings s where s.id = $1::bigint and s.status = 'shown' and s.phone is not null
        and not exists (select 1 from contact_taps t where t.seed_id = s.id and t.at > now() - interval '10 minutes'
                         and (($2::uuid is not null and t.user_id = $2::uuid) or ($2::uuid is null and $4::inet is not null and t.ip = $4::inet and t.user_id is null)))
        and ($4::inet is null or (select count(*) from contact_taps t where t.ip = $4::inet and t.at > now() - interval '1 hour') < 60)
     on conflict do nothing
     returning (select city_id from seed_listings where id = seed_id) as city`,
    [id, u?.id ?? null, String(origen ?? ""), ip, toque],
  ); });
  if (t.rows[0]) await evento("contactar", { ref: `semilla:${id}`, ciudad: t.rows[0].city, userId: u?.id ?? null, props: { kind: "call", semilla: true } });
}
