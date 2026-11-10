import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { yo } from "@/lib/cuenta";
import { db } from "@/lib/db";
import { misDirecciones, numeroVecino } from "@/lib/direcciones";
import { idioma } from "@/lib/idioma";
import { resumen } from "@/lib/mi-cuenta";
import { misNegocios } from "@/lib/panel";
import { estadoVecino } from "@/lib/compa/hoja";
import { casosAbiertos, horario } from "@/lib/soporte";
import { horarioCorto } from "@/lib/soporte-comun";
import { Inicio } from "./Inicio";
import { yoMarco } from "./yo";

/* USR-HOME · Mi cuenta (diseño homeV): tu tarjeta de vecino, completa tu cuenta, tu semana, lo que espera de ti, accesos,
   tu apoyo al barrio y tu cuenta. Todo del servidor; lo que todavía no existe (Wallet) no se muestra; los boletos (6c) están en Accesos y en Mi cuenta › Boletos. La tarjeta de vecino
   lleva el rango y las monedas (5g; sin valor en dinero) como el prototipo, y las reseñas en lugar del Wallet. */
export const metadata: Metadata = { title: "Mi cuenta · To'Latino" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await yo();
  if (!u?.first_name) redirect(`/entrar?volver=${encodeURIComponent("/cuenta")}`);
  const lang = await idioma(), es = lang === "es";
  const [sanciones, dirs, me, r, nv, negs, del, com, sopN, sopH, compa] = await Promise.all([
    db().query<{ kind: string; reason: string; ends_at: string | null }>(
      `select kind, reason, ends_at from sanctions where target_kind = 'user' and target_id = $1::text and kind in ('adv', 'mute7', 'nopub')
          and lifted_at is null and (ends_at is null or ends_at > now()) order by starts_at desc limit 3`, [u.id]),
    misDirecciones(u.id), yoMarco(u, es), resumen(u.id), numeroVecino(u.id), misNegocios(u.id),
    db().query<{ d: string | null }>(`select to_char(delete_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as d from users where id = $1`, [u.id]),
    db().query<{ en: boolean; rango: number; nombre: { es: string; en: string } | null; monedas: number }>(
      `select coalesce(cp.welcome_at is not null and cp.adult is true, false) as en, coalesce(cp.rank_level, 1) as rango, r.name as nombre, coalesce(cp.coins, 0) as monedas
         from users u left join community_profiles cp on cp.user_id = u.id left join ranks r on r.level = coalesce(cp.rank_level, 1) where u.id = $1`, [u.id]),
    casosAbiertos(u.id), horario(),
    // 7d · «EL COMPA · IA AL INSTANTE» en Ayuda y soporte solo si está encendido para esta persona (si falla, la fila de siempre).
    estadoVecino(u.id).then((e) => e.encendido).catch(() => false),
  ]);
  const c0 = com.rows[0];
  return <Inicio es={es} yo={me} r={r} dirs={dirs.length} ciudad={nv?.ciudad ?? null} nick={u.nick} borrar={del.rows[0]?.d ?? null}
    nombre={[u.first_name, u.last_name].filter(Boolean).join(" ")} negocio={negs[0] ? { id: negs[0].id, name: negs[0].name } : null}
    sanciones={sanciones.rows.map((x) => ({ kind: x.kind, reason: x.reason, hasta: x.ends_at }))}
    com={c0?.en ? { rango: c0.rango, nombre: c0.nombre ?? { es: "Recluta", en: "Recruit" }, monedas: c0.monedas } : null}
    soporte={{ abiertos: sopN, horario: horarioCorto(sopH, es), compa }} />;
}
