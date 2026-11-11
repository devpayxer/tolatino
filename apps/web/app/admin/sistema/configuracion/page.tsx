import { requerir } from "@/lib/admin";
import { catalogoConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { Configuracion } from "../../Configuracion";

/* ADM-SYS › Configuración (5i): el catálogo config_keys con su valor, límites, unidad y último cambio. Ver: permiso de Sistema;
   cambiar: solo un Admin (lo revisa la acción). El umbral de auto-ocultar se muestra aquí y se cambia con su regla (Auto-moderación).
   7i · El Compa: el modelo de cada papel; Soporte: la línea del horario tal como la leen las pantallas. */
export default async function Page() {
  const s = await requerir("sys", "ver");
  const [filas, ah, modelos, horario] = await Promise.all([
    catalogoConfig(),
    db().query<{ reportes: number | null; horas: number | null }>(`select (params->>'reportes')::int as reportes, (params->>'horas')::int as horas from mod_rules where key = 'autohide'`),
    // 7i · El Compa: el modelo de cada papel (de compa_models) y cómo dicen las pantallas el horario del equipo (Soporte).
    (await import("@/lib/compa/admin-compa")).modelosPorPapel(),
    (await import("@/lib/soporte")).lineaHorario(true),
  ]);
  const a = ah.rows[0];
  return <Configuracion filas={filas} admin={s.role === "admin" && s.puede("sys", "editar")} autoOcultar={a ? { reportes: a.reportes ?? 5, horas: a.horas ?? 24 } : null}
    modelos={modelos} horario={horario} />;
}
