"use client";
/* ADM-USR · 360° (Super Admin.dc.html usrDetail): la persona como cuenta, lo que hizo y lo que hizo el equipo.
   Pestañas: Resumen, Seguridad, Confianza, Privacidad y (5c) Comunidad › Seguidores y siguiendo (bloqueó · silenció · «posible
   red» por dispositivo; los mensajes privados nunca se leen aquí: solo con un reporte, en Colas). 6j: Actividad (cuántas operaciones en
   90 días y BOLETOS DE EVENTOS con transferencias, devoluciones y entradas, RSVP); Dinero llega con su módulo. 7i: El Compa (cifras de 30 días y
   sus conversaciones SIN texto; el hilo se abre en la ficha anotada de Super Admin › El Compa, solo con compa:editar). Cada acción pide motivo y queda en la auditoría; el servidor revisa permiso, ciudad y estado. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Usuario360 } from "@/lib/admin-usuarios";
import type { Comunidad360 } from "@/lib/admin-vecinos";
import type { Cifras360, Dinero360 } from "@/lib/admin-usuarios";
import type { Monedas360, Puntos360 } from "@/lib/admin-gam";
import type { Actividad360 } from "@/lib/evt-admin";
import { diaCorto } from "@/lib/evt-comun";
import { usrAjustarMonedas, usrAjustarPuntos, usrPisoRango } from "./acciones-gam";
import { ORDEN_SANCIONES, PLANTILLAS_USR, SANCIONES, sub as subSancion, type Sancion } from "@/lib/sanciones";
import {
  cambiarCiudadUsuario, cerrarSesiones, enviarMensaje, dispositivoAccion, exportarDatos, llaveRevocar, pushRevocar, levantar, notaUsuario, pedirBorrado, pedirFusion, quitarFotoPerfil, restablecerVerificacion, restaurarCuenta, sancionar, usrCasoRed, verComo,
} from "./acciones-usuarios";
import type { Privacidad360 } from "@/lib/datos/admin";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { EST_USR, EST_USR_EN, haceUsr } from "./Usuarios";
import { useE } from "./idioma-admin";
import { SoporteDe360, type CasoSop } from "./SoporteDe360";
import type { CompaUsuario } from "@/lib/compa/admin-compa";
import { useAhora } from "@/lib/ahora";

import { tec } from "@/lib/tec";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "Icon", ComponentType<any>>;
const PUSH_APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
const PUSH_PROV: Record<string, string> = { apns: "APNs", fcm: "FCM", webpush: "Web Push", sim: "simulado (semilla)" };
const PUSH_APP_EN: Record<string, string> = { cliente: "To'Latino", negocio: "Business", delivery: "Driver", checkin: "Door", web: "Web" };
const PUSH_PROV_EN: Record<string, string> = { apns: "APNs", fcm: "FCM", webpush: "Web Push", sim: "simulated (seed)" };
const LLAVE_POR: Record<string, string> = { user: "la quitó la persona", staff: "la revocó el equipo", sistema: "la quitó el sistema" };
const LLAVE_POR_EN: Record<string, string> = { user: "removed by the person", staff: "revoked by the team", sistema: "removed by the system" };
const PUSH_MOTIVO: Record<string, string> = { salir: "salió de la cuenta", invalido: "el proveedor dijo que ya no sirve", apagado: "los apagó la persona", reemplazado: "lo reemplazó otro", admin: "el equipo", vencido: "sin uso" };
const PUSH_MOTIVO_EN: Record<string, string> = { salir: "signed out", invalido: "the provider said it no longer works", apagado: "turned off by the person", reemplazado: "replaced by another", admin: "the team", vencido: "unused" };
/* Verbo de cada acción en el historial. */
const VERBO: Record<string, string> = {
  "usuario.nota": "agregó una nota a", "usuario.sancionar": "sancionó a", "usuario.levantar": "levantó la sanción de", "usuario.foto.quitar": "quitó la foto de",
  "usuario.sesiones.cerrar": "cerró las sesiones de", "usuario.sesion.cerrar": "cerró una sesión de", "usuario.sesion.bloquear": "bloqueó un dispositivo de",
  "usuario.dispositivo.bloquear": "bloqueó un dispositivo de", "usuario.dispositivo.desbloquear": "desbloqueó un dispositivo de", "usuario.push.revocar": "revocó los avisos de un teléfono de", "usuario.llave.revocar": "revocó una llave de acceso de", "usuario.verificacion.restablecer": "restableció la verificación de",
  "usuario.ciudad": "cambió la ciudad de", "usuario.borrado.pedir": "pidió borrar la cuenta de", "usuario.borrar": "borró la cuenta de", "usuario.restaurar": "restauró la cuenta de",
  "usuario.exportar": "exportó los datos de", "usuario.red.caso": "abrió un caso de red de cuentas de", "usuario.evt.caso": "abrió un caso de Eventos de",
  "usuario.ver_como": "vio en solo lectura los datos de", "usuario.fusion.pedir": "pidió fusionar la cuenta de", "usuario.fusionar": "fusionó la cuenta de",
};
const VERBO_EN: Record<string, string> = {
  "usuario.nota": "added a note to", "usuario.sancionar": "sanctioned", "usuario.levantar": "lifted the sanction of", "usuario.foto.quitar": "removed the photo of",
  "usuario.sesiones.cerrar": "closed the sessions of", "usuario.sesion.cerrar": "closed a session of", "usuario.sesion.bloquear": "blocked a device of",
  "usuario.dispositivo.bloquear": "blocked a device of", "usuario.dispositivo.desbloquear": "unblocked a device of", "usuario.push.revocar": "revoked a phone’s notifications for", "usuario.llave.revocar": "revoked a passkey of", "usuario.verificacion.restablecer": "reset the verification of",
  "usuario.ciudad": "changed the city of", "usuario.borrado.pedir": "requested deleting the account of", "usuario.borrar": "deleted the account of", "usuario.restaurar": "restored the account of",
  "usuario.exportar": "exported the data of", "usuario.red.caso": "opened an account-network case for", "usuario.evt.caso": "opened an Events case for",
  "usuario.ver_como": "viewed read-only the data of", "usuario.fusion.pedir": "requested merging the account of", "usuario.fusionar": "merged the account of",
};
const PLANTILLAS_USR_EN = ["Repeat offender", "First time", "Accounts linked to the same device", "The context justifies the action"];
const CAMBIO_K: Record<string, string> = { phone: "Teléfono", city: "Ciudad", email: "Correo", name: "Nombre" };
const fechaL = (iso: string | null, en = false) => (iso ? new Date(iso).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const OK = "var(--tl-open-text)", WARN = "var(--tl-pro-ink)", BAD = "var(--tl-danger)";

export function U360({ u, tab, sub = "pub", com, pts, mon, topeAjuste = 500, topeMonedas = 500, act = null, sop, cpa, pri = null, cif = null, din }: { sop?: CasoSop[]; cpa?: CompaUsuario | null; u: Usuario360; tab: string; sub?: string; com?: Comunidad360 | null; pts?: Puntos360 | null; mon?: Monedas360 | null; topeAjuste?: number; topeMonedas?: number; act?: Actividad360 | null; pri?: Privacidad360 | null;
  cif?: Cifras360 | null; din?: Dinero360 | null }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const E = useE(), en = E("", "x") === "x", fecha = (iso: string | null) => fechaL(iso, en), bi = (b: { es: string; en?: string }) => (en && b.en) || b.es;
  const PA = en ? PUSH_APP_EN : PUSH_APP, PP = en ? PUSH_PROV_EN : PUSH_PROV, LP = en ? LLAVE_POR_EN : LLAVE_POR, PM = en ? PUSH_MOTIVO_EN : PUSH_MOTIVO, VB = en ? VERBO_EN : VERBO, EU = en ? EST_USR_EN : EST_USR, PLU = en ? PLANTILLAS_USR_EN : PLANTILLAS_USR;
  const subS = (k: Sancion) => (en ? (SANCIONES[k].dias ? `${SANCIONES[k].dias} days · lifts on its own` : k === "ban" ? "Permanent · confirmed by an Admin" : "Until a person lifts it") : subSancion(k));
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const [comoVista, setComoVista] = useState<{ k: string; n: number; filas: Record<string, unknown>[] }[] | null>(null);
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null); router.refresh(); };
  const P = u.puede, ir = (t: string) => router.push(`/admin/usuarios/${u.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const nombre = u.nombre ?? E("(sin nombre todavía)", "(no name yet)"), corto = u.nombre?.split(" ")[0] ?? u.phone_b;
  const borrada = u.estado === "del", vigentes = u.sanciones.filter((x) => !x.lifted_at && (!x.ends_at || new Date(x.ends_at).getTime() > Date.now()));
  const intocable = u.yoMismo || !!u.staff;
  const stL = borrada ? E("BORRADA", "DELETED") : u.estado === "ok" ? E("ACTIVO", "ACTIVE") : EU[u.estado] ?? u.estado.toUpperCase();
  const lugar = [u.zona, u.ciudad].filter(Boolean).join(" · ") || E("Sin ciudad", "No city");
  const rol = [E("Cliente", "Customer"), ...(u.negocios.some((n) => n.kind === "owner") ? [E("Dueño", "Owner")] : u.negocios.length ? [E("Equipo de un negocio", "Business team")] : []), ...(u.staff ? [`${E("Equipo de To’Latino", "To’Latino team")} · ${u.staff}`] : [])].join(" · ");
  const cab: Bloque[] = [{
    type: "hero", t: nombre, s: `${lugar} · ${u.lang === "en" ? "English" : E("Español", "Spanish")}${u.negocios.some((n) => n.kind === "owner") ? E(" · dueño", " · owner") : ""}`,
    ph: u.photo ? `url("${u.photo}")` : "", ini: u.photo ? "" : nombre.slice(0, 1), st: stL, stFg: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", stDot: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", acts: [],
    // 9n-9 · Las cifras del prototipo (PEDIDOS · CITAS · RANGO), derivadas; el Wallet del prototipo no existe (solo tarjeta).
    kn: 3, kpis: cif ? [{ v: String(cif.pedidos), k: E("PEDIDOS", "ORDERS") }, { v: String(cif.citas), k: E("CITAS", "BOOKINGS") }, { v: String(cif.rango), k: `${E("RANGO", "RANK")} · ${(cif.rango_es ?? "Vecino").toUpperCase()}` }] : [],
  }];

  /* Avisos de arriba: prueba, borrada (con Restaurar), sanción vigente (con Levantar), pedido de borrado en la cola. */
  const avisos: ReactNode[] = [];
  if (u.is_test) avisos.push(<A.AdminNote key="t" tone="info" icon="users">{E("Cuenta de prueba: no cuenta en los números.", "Test account: not counted in the numbers.")}</A.AdminNote>);
  if (borrada) {
    const gracia = u.status === "deleted_pending" && u.delete_at && new Date(u.delete_at).getTime() > Date.now();
    avisos.push(<A.AdminNote key="d" tone="bad" icon="trash" cta={gracia && P.admin ? E("Restaurar", "Restore") : undefined}
      onCta={() => setConf({ titulo: E(`Restaurar la cuenta de ${corto}`, `Restore ${corto}’s account`), sub: E("Vuelve a como estaba y puede entrar otra vez.", "It goes back to how it was and they can sign in again."), hacer: (m) => restaurarCuenta(u.id, m) })}>
      {gracia ? E(`Borrada. Período de gracia hasta el ${fecha(u.delete_at)}: hasta entonces se puede restaurar. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada» (lo pide la ley) y los pagos con tarjeta quedan en Stripe.`, `Deleted. Grace period until ${fecha(u.delete_at)}: until then it can be restored. After that everything of theirs is deleted; their orders and charges remain as “Deleted account” (required by law) and card payments stay in Stripe.`) : u.status === "merged" ? E("Fusionada con otra cuenta: ya no entra.", "Merged into another account: can no longer sign in.") : E("Borrada.", "Deleted.")}</A.AdminNote>);
  } else if (u.estado !== "ok") {
    const v = vigentes[0], hasta = v?.ends_at ? E(` hasta el ${fecha(v.ends_at)}`, ` until ${fecha(v.ends_at)}`) : "";
    const lo = u.estado === "susp" || u.estado === "ban" ? E("Lo ve al intentar entrar.", "They see it when trying to sign in.") : E("Lo ve en su cuenta.", "They see it in their account.");
    avisos.push(<A.AdminNote key="s" tone="bad" icon="warning" cta={P.retirar ? E("Levantar", "Lift") : undefined}
      onCta={() => setConf({ titulo: E("¿Por qué se levanta?", "Why is it being lifted?"), hacer: (m) => levantar(u.id, m) })}>
      {`${stL.charAt(0)}${stL.slice(1).toLowerCase()}${hasta}${v ? `: ${v.reason}` : ""} · ${lo}`}</A.AdminNote>);
  }
  const pedido = u.cambiosSensibles.find((c) => c.status === "pending");
  if (pedido) avisos.push(<A.AdminNote key="p" tone="warn" icon="edit" cta={pedido.caso ? E("Ver", "View") : undefined} onCta={() => router.push(`/admin/colas?caso=${pedido.caso}`)}>
    {E(`Pedido de borrado en Cambios sensibles (#${pedido.id}): lo aplica otra persona del equipo.`, `Deletion request in Sensitive changes (#${pedido.id}): another team member applies it.`)}</A.AdminNote>);

  const alertas = u.compartidos.length + (u.phone_ok ? 0 : 1);
  const tabs: Bloque = { type: "tabs", items: ([["resumen", E("Resumen", "Summary")], ["act", E("Actividad", "Activity")], ...(din !== undefined ? [["din", E("Dinero", "Money")] as [string, string]] : []), ["seguridad", E("Seguridad", "Security"), alertas], ["confianza", E("Confianza", "Trust"), vigentes.length], ["privacidad", E("Privacidad", "Privacy")], ["comunidad", E("Comunidad", "Community")], ...(sop ? [["soporte", E("Soporte", "Support")] as [string, string]] : []), ...(cpa !== undefined ? [["compa", "El Compa"] as [string, string]] : [])] as [string, string, number?][])
    .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: tab === k, onClick: () => ir(k) })) };

  const historial = (): ReactNode => u.historial.length
    ? <A.AuditLog rows={u.historial.slice(0, 10).map((x) => ({ who: x.quien ?? E("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: `${VB[x.action] ?? x.action} ${nombre}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: haceUsr(x.at, ahora, en) }))} />
    : <A.AdminNote tone="info" icon="folder">{E("Nadie del equipo ha hecho cambios aquí todavía.", "No one on the team has made changes here yet.")}</A.AdminNote>;

  let cuerpo: ReactNode;
  if (tab === "seguridad") {
    const puedeS = (P.editar || P.retirar) && !borrada;
    const abiertas = u.dispositivos.reduce((a, d) => a + d.abiertas, 0);
    const cambiosCiudad = u.cambios.filter((c) => c.kind === "city"), cambiosTel = u.cambios.filter((c) => c.kind === "phone");
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: `${E("DISPOSITIVOS Y SESIONES", "DEVICES AND SESSIONS")} · ${u.dispositivos.length}`, first: true, link: puedeS && abiertas ? E("Cerrar todas", "Close all") : undefined,
          onLink: () => setConf({ titulo: E(`Cerrar todas las sesiones de ${corto}`, `Close all of ${corto}’s sessions`), sub: E("Tiene que entrar otra vez en cada dispositivo, con el código por SMS o con su llave de acceso.", "They have to sign in again on each device, with the SMS code or their passkey."), cta: E("Cerrar todas", "Close all"), hacer: (m) => cerrarSesiones(u.id, m) }) }]} />
        {u.dispositivos.length ? <PanelBloques bloques={[{ type: "rows", items: u.dispositivos.map((d, i) => {
          const bloq = d.dev_bloq || d.bloqueada;
          return {
            key: d.sid, icon: /iPhone|Android|iPad|Tableta/.test(d.nombre) ? "phone" : "grid", t: `${d.nombre}${d.nav ? ` · ${d.nav}` : ""} · ${d.app}`,
            s: `${E("Primera vez", "First seen")} ${fecha(d.primera)} · ${d.abiertas ? `${E("última", "last")} ${haceUsr(d.ultima, ahora, en)}` : `${E("sesión cerrada · última", "session closed · last")} ${haceUsr(d.ultima, ahora, en)}`}${d.ip ? ` · ${d.ip}` : ""}`,
            tag: bloq ? E("BLOQUEADO", "BLOCKED") : i === 0 && u.compartidos.length && d.device ? E("COMPARTIDO", "SHARED") : d.abiertas ? E("ABIERTA", "OPEN") : null, tone: bloq || (i === 0 && u.compartidos.length) ? "danger" : "signal",
            acts: puedeS ? [
              ...(d.abiertas && !bloq ? [{ l: E("Cerrar sesión", "Close session"), icon: "lock", onClick: () => setConf({ titulo: E(`Cerrar sesión en ${d.nombre}`, `Close session on ${d.nombre}`), plantillas: [E("Lo pidió la persona", "The person asked for it"), E("Posible acceso de otra persona", "Possible access by someone else"), E("Teléfono perdido o robado", "Lost or stolen phone")], hacer: (m) => dispositivoAccion(u.id, d.sid, "cerrar", m) }) }] : []),
              ...(P.retirar ? [bloq
                ? { l: E("Desbloquear", "Unblock"), icon: "check", onClick: () => setConf({ titulo: `${E("Desbloquear", "Unblock")} ${d.nombre}`, hacer: (m) => dispositivoAccion(u.id, d.sid, "desbloquear", m) }) }
                : { l: E("Bloquear", "Block"), icon: "ban", onClick: () => setConf({ titulo: `${E("Bloquear", "Block")} ${d.nombre}`, sub: E("Ninguna cuenta puede entrar desde este dispositivo.", "No account can sign in from this device."), peligro: true, plantillas: [E("Teléfono perdido o robado", "Lost or stolen phone"), E("Actividad sospechosa", "Suspicious activity"), E("Cuentas vinculadas al mismo dispositivo", "Accounts linked to the same device")], hacer: (m) => dispositivoAccion(u.id, d.sid, "bloquear", m) }) }] : []),
            ] : undefined,
          };
        }) }]} /> : <A.AdminNote tone="info" icon="phone">{E("No ha entrado desde ningún dispositivo.", "Hasn’t signed in from any device.")}</A.AdminNote>}
        {/* 8c · Avisos push: los teléfonos y navegadores con avisos (enmascarados) y revocar uno con motivo. */}
        <PanelBloques bloques={[{ type: "group", k: `${E("AVISOS PUSH", "PUSH NOTIFICATIONS")} · ${u.push.filter((x) => !x.revocado).length} ${E("VIVO", "LIVE")}${u.push.filter((x) => !x.revocado).length === 1 || en ? "" : "S"}` }]} />
        {u.push.length ? <PanelBloques bloques={[{ type: "rows", items: u.push.map((x) => ({
          key: `push-${x.id}`, icon: x.platform === "web" ? "globe" : "phone", t: `${x.label} · ${PA[x.app] ?? x.app}`,
          s: `${PP[x.provider] ?? x.provider} · ${E("huella", "fingerprint")} …${x.huella} · ${E("desde", "since")} ${fecha(x.desde)} · ${E("visto", "seen")} ${haceUsr(x.visto, ahora, en)}${x.ultimo ? ` · ${E("último aviso", "last notification")} ${haceUsr(x.ultimo, ahora, en)}` : ""}${x.revocado ? ` · ${E("revocado", "revoked")} ${fecha(x.revocado)} (${PM[x.motivo ?? ""] ?? x.motivo})` : ""}`,
          tag: x.revocado ? E("REVOCADO", "REVOKED") : x.prueba ? E("PRUEBA", "TEST") : E("VIVO", "LIVE"), tone: x.revocado ? "neutral" : "signal", dim: !!x.revocado,
          acts: P.editar && !x.revocado ? [{ l: E("Revocar", "Revoke"), icon: "ban", onClick: () => setConf({ titulo: E(`Revocar los avisos de ${x.label}`, `Revoke notifications for ${x.label}`), sub: E("Deja de recibir push en ese teléfono. Lo crítico le sigue llegando por SMS; puede volver a encenderlos ella con su sesión.", "That phone stops getting push notifications. Critical ones still arrive by SMS; they can turn them back on from their session."), peligro: true,
            plantillas: [E("Teléfono perdido o robado", "Lost or stolen phone"), E("Lo pidió la persona", "The person asked for it"), E("Avisos a un teléfono que no es suyo", "Notifications to a phone that isn’t theirs")], hacer: (m) => pushRevocar(u.id, x.id, m) }) }] : undefined,
        })) }]} /> : <A.AdminNote tone="info" icon="bell">{E("No tiene avisos push en ningún teléfono: le llegan en la campana y por SMS cuando aplica.", "No push notifications on any phone: they arrive in the bell and by SMS when it applies.")}</A.AdminNote>}
        {/* 8d · Llaves de acceso (Face ID / huella): el dispositivo, cuándo se agregó, la última vez y cuántas entradas; revocar con motivo (aviso a la persona). */}
        <PanelBloques bloques={[{ type: "group", k: `${E("LLAVES DE ACCESO", "PASSKEYS")} · ${u.llaves.filter((x) => !x.revocada).length} ${en ? "LIVE" : u.llaves.filter((x) => !x.revocada).length === 1 ? "VIVA" : "VIVAS"}` }]} />
        {u.llaves.length ? <PanelBloques bloques={[{ type: "rows", items: u.llaves.map((k) => ({
          key: `llave-${k.id}`, icon: "key", t: `${k.nombre} · ${PA[k.app] ?? k.app}${k.plat === "web" ? "" : ` (${k.plat === "ios" ? "iOS" : "Android"})`}`,
          s: `${E("Agregada", "Added")} ${fecha(k.creada)} · ${k.usada ? E(`última vez ${fecha(k.usada)} · ${k.usos} ${k.usos === 1 ? "entrada" : "entradas"}`, `last used ${fecha(k.usada)} · ${k.usos} ${k.usos === 1 ? "sign-in" : "sign-ins"}`) : E("sin usar todavía", "not used yet")}${k.conf ? E(` · ${k.conf} ${k.conf === 1 ? "confirmación" : "confirmaciones"} (archivo o borrado)`, ` · ${k.conf} ${k.conf === 1 ? "confirmation" : "confirmations"} (data file or deletion)`) : ""}${k.sync ? E(" · sincronizada", " · synced") : ""}${k.revocada ? ` · ${LP[k.por ?? ""] ?? k.por} ${fecha(k.revocada)}${k.motivo ? ` (${k.motivo})` : ""}` : ""}`,
          tag: k.revocada ? E("QUITADA", "REMOVED") : E("VIVA", "LIVE"), tone: k.revocada ? "neutral" : "signal", dim: !!k.revocada,
          acts: P.editar && !k.revocada && !borrada ? [{ l: E("Revocar", "Revoke"), icon: "ban", onClick: () => setConf({ titulo: E(`Revocar la llave de ${k.nombre}`, `Revoke the passkey on ${k.nombre}`), sub: E("Ya no entra con esa llave (Face ID o huella). Sigue entrando con el código por SMS y puede agregar otra. Le avisamos por SMS y en la app.", "They can no longer sign in with that passkey (Face ID or fingerprint). They can still sign in with the SMS code and add another one. We notify them by SMS and in the app."), peligro: true,
            plantillas: [E("Teléfono perdido o robado", "Lost or stolen phone"), E("Lo pidió la persona", "The person asked for it"), E("Posible acceso de otra persona", "Possible access by someone else")], hacer: (m) => llaveRevocar(u.id, k.id, m) }) }] : undefined,
        })) }]} /> : <A.AdminNote tone="info" icon="key">{E("No tiene llaves de acceso: entra con el código por SMS.", "No passkeys: they sign in with the SMS code.")}</A.AdminNote>}
        {u.compartidos.length ? <>
          <A.AdminNote tone="warn" icon="warning">{E("Otras cuentas que entraron desde el mismo dispositivo:", "Other accounts that signed in from the same device:")}</A.AdminNote>
          <A.AdminList rows={u.compartidos.map((x) => ({ initials: (x.nombre ?? "?").slice(0, 1), title: x.nombre ?? E("(sin nombre todavía)", "(no name yet)"), sub: x.phone, tag: x.estado !== "ok" ? EU[x.estado] : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: E("VERIFICACIÓN", "VERIFICATION") }, { type: "rows", items: [
          { icon: "phone", t: `${E("Teléfono", "Phone")} · ${u.phone_b}`, s: u.phone_ok ? `${E("Verificado por SMS", "Verified by SMS")} · ${fecha(u.phone_ok)}` : E("Restablecida: al entrar le pedimos el código otra vez", "Reset: we ask for the code again at sign-in"), tag: u.phone_ok ? E("VERIFICADO", "VERIFIED") : E("PENDIENTE", "PENDING"), tone: u.phone_ok ? "signal" : "action" },
          ...(u.email ? [{ icon: "news", t: `${E("Correo", "Email")} · ${u.email}`, s: u.email_ok ? E("Verificado", "Verified") : E("Sin verificar", "Not verified"), tag: u.email_ok ? E("VERIFICADO", "VERIFIED") : null, tone: "signal" }] : []),
          ...cambiosTel.map((c) => ({ icon: "edit", t: `${E("Cambió de teléfono", "Changed phone")}: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E("Lo cambió el equipo", "Changed by the team") : E("Lo cambió la persona", "Changed by the person")} · ${fecha(c.at)}` })),
          // Mi cuenta (2h): correo, y borrar la cuenta (30 días) o cancelarlo.
          ...u.cambios.filter((c) => c.kind === "email").map((c) => ({ icon: "news", t: `${E("Cambió el correo", "Changed email")}: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E("Lo cambió el equipo", "Changed by the team") : E("Lo cambió la persona", "Changed by the person")} · ${fecha(c.at)}` })),
          ...u.cambios.filter((c) => c.kind === "passkey").map((c) => ({ icon: "key", t: c.de ? `${E("Llave de acceso de", "Passkey on")} ${c.de}: ${c.a ?? "—"}` : `${E("Llave de acceso", "Passkey")}: ${c.a ?? "—"}`, s: `${c.by === "staff" ? E("Lo hizo el equipo", "Done by the team") : c.by === "sistema" ? E("Lo hizo el sistema", "Done by the system") : E("Lo hizo la persona", "Done by the person")} · ${fecha(c.at)}` })),
          ...u.cambios.filter((c) => c.kind === "delete" || c.kind === "undelete").map((c) => ({ icon: "trash", t: c.kind === "delete" ? `${E("Pidió borrar su cuenta", "Asked to delete their account")}${c.a ? ` · ${E("motivo", "reason")}: ${((en ? { uso: "no longer uses it", avisos: "too many notifications", priv: "privacy", ciudad: "moved", otra: "other reason" } : { uso: "ya no la usa", avisos: "muchos avisos", priv: "privacidad", ciudad: "se mudó", otra: "otra razón" }) as Record<string, string>)[c.a] ?? c.a}` : ""}` : E("Canceló el borrado de su cuenta", "Cancelled their account deletion"), s: `${E("Lo hizo la persona", "Done by the person")} · ${fecha(c.at)}` })),
        ] }]} />
        {P.editar && !borrada && u.phone_ok ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Restablecer verificación", "Reset verification"), icon: "lock", off: pend, onClick: () => setConf({ titulo: E(`Restablecer verificación de ${corto}`, `Reset ${corto}’s verification`), sub: E("Se cierran sus sesiones, se quitan sus llaves de acceso y al entrar le pedimos el código por SMS otra vez. Úsalo si cree que alguien entró a su cuenta.", "Their sessions close, their passkeys are removed and we ask for the SMS code again at sign-in. Use it if they think someone got into their account."), hacer: (m) => restablecerVerificacion(u.id, m) }) }] }]} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E("CIUDAD", "CITY") }, { type: "kv", cols: desk ? 3 : 1, items: [{ k: E("AHORA", "NOW"), v: u.ciudad ?? E("Sin ciudad", "No city") }, { k: E("ÚLTIMO CAMBIO", "LAST CHANGE"), v: u.city_changed ? fecha(u.city_changed) : E("Nunca", "Never") }, { k: E("REGLA", "RULE"), v: E("El vecino la cambia 1 vez cada 30 días", "Neighbors can change it once every 30 days") }] }]} />
        {cambiosCiudad.length ? <PanelBloques bloques={[{ type: "rows", items: cambiosCiudad.map((c) => ({ icon: "globe", t: `${c.de ?? E("Sin ciudad", "No city")} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E("La cambió el equipo", "Changed by the team") : E("La cambió el vecino", "Changed by the neighbor")} · ${fecha(c.at)}` })) }]} /> : null}
        {P.editar && !borrada ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Cambiar ciudad", "Change city"), icon: "globe", off: pend, onClick: () => setConf({
          titulo: E(`Cambiar la ciudad de ${corto}`, `Change ${corto}’s city`), sub: E("Se salta la regla de 30 días. Si la ciudad aún no abre, queda en su lista de espera.", "It skips the 30-day rule. If the city isn’t open yet, they go on its waitlist."),
          elegir: { label: E("CIUDAD NUEVA", "NEW CITY"), items: u.ciudades.filter((c) => c.id !== u.city_id).map((c) => ({ k: c.id, l: `${c.name}${c.status !== "on" ? E(" · lista de espera", " · waitlist") : ""}` })) },
          hacer: (m, e) => cambiarCiudadUsuario(u.id, e ?? "", m) }) }] }]} /> : null}
      </>);
  } else if (tab === "confianza") {
    const REP: Record<string, string> = en ? { no_es: "Not from this business", inapropiado: "Inappropriate content", datos: "Shows personal data", spam: "Ad or spam", otro: "Other reason" } : { no_es: "No es de este negocio", inapropiado: "Contenido inapropiado", datos: "Muestra datos personales", spam: "Es publicidad o spam", otro: "Otro motivo" };
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: E("ESTADO", "STATUS"), v: u.estado === "ok" ? E("Sin sanción", "No sanction") : `${stL.charAt(0)}${stL.slice(1).toLowerCase()}`, fg: u.estado === "ok" ? undefined : BAD },
          { k: E("SANCIONES", "SANCTIONS"), v: String(u.sanciones.length) },
          { k: E("REPORTES HECHOS", "REPORTS MADE"), v: String(u.reportes.length) },
        ] }, { type: "group", k: E("SANCIONES", "SANCTIONS") }]} />
        {u.sanciones.length ? <PanelBloques bloques={[{ type: "rows", items: u.sanciones.flatMap((x) => {
          const k = SANCIONES[x.kind as Sancion], vence = x.ends_at && new Date(x.ends_at).getTime() <= Date.now();
          const fila = { icon: "warning", t: `${k ? bi(k) : x.kind} · ${x.reason}`, s: `${x.quien ?? E("Equipo", "Team")} · ${fecha(x.starts_at)}${x.ends_at ? ` · ${E("hasta el", "until")} ${fecha(x.ends_at)}` : ""}`, tag: x.lifted_at ? E("LEVANTADA", "LIFTED") : vence ? E("TERMINÓ", "ENDED") : E("VIGENTE", "ACTIVE"), tone: x.lifted_at || vence ? "neutral" : "danger" };
          return x.lifted_at ? [{ icon: "check", t: x.lift_reason ? `${E("Levantada", "Lifted")} · ${x.lift_reason}` : E("Levantada", "Lifted"), s: `${x.quien_levanto ?? E("Equipo", "Team")} · ${fecha(x.lifted_at)}` }, fila] : [fila];
        }) }]} /> : <A.AdminNote tone="ok" icon="check">{E("Nunca ha tenido una sanción.", "Has never had a sanction.")}</A.AdminNote>}
        <PanelBloques bloques={[{ type: "group", k: `${E("REPORTES QUE HIZO", "REPORTS THEY MADE")} · ${u.reportes.length}` }]} />
        {u.reportes.length ? <PanelBloques bloques={[{ type: "rows", items: u.reportes.map((r) => ({ icon: "image", t: `${E("Foto de", "Photo of")} ${r.negocio} · ${REP[r.reason] ?? r.reason}`, s: fecha(r.at), tag: r.status === "open" ? E("ABIERTO", "OPEN") : E("RESUELTO", "RESOLVED"), tone: r.status === "open" ? "action" : "neutral", chev: true, onClick: () => router.push(`/admin/negocios/${r.bid}`) })) }]} />
          : <A.AdminNote tone="info" icon="bubble">{E("Ninguno.", "None.")}</A.AdminNote>}
      </>);
  } else if (tab === "comunidad" && com) {
    // 5i · Usuarios 360° › Comunidad (MEM 696–699): arriba rango, puntos, monedas, votos recibidos y la red; debajo las sub-pestañas
    // Publicaciones · Comentarios · Seguidores y siguiendo · Puntos y monedas · Cupones y referidos (sin El Patio, decisión G).
    const lista = (k: string, L: Comunidad360["listas"]["seg"], vacio: string) => <>
      <PanelBloques bloques={[{ type: "group", k: `${k} · ${L.length}` }]} />
      {L.length ? <A.AdminList rows={L.map((x) => ({ icon: "users", title: x.nombre, sub: `${x.rango} · ${x.ciudad ?? E("Sin ciudad", "No city")} · ${fecha(x.at)}`, tag: x.mismo ? E("MISMO DISPOSITIVO", "SAME DEVICE") : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}?tab=comunidad&sub=seg`) }))} />
        : <A.AdminNote tone="info" icon="users">{vacio}</A.AdminNote>}
    </>;
    const EST_C: Record<string, string> = en ? { visible: "VISIBLE", hidden: "HIDDEN", deleted: "DELETED BY ITS AUTHOR" } : { visible: "SE VE", hidden: "OCULTO", deleted: "BORRADO POR SU AUTOR" };
    const TIPO_C: Record<string, string> = en ? { pregunta: "Question", recomendacion: "Recommendation", encuesta: "Poll", publicacion: "Post" } : { pregunta: "Pregunta", recomendacion: "Recomendación", encuesta: "Encuesta", publicacion: "Publicación" };
    const EST_K: Record<string, string> = en ? { issued: "LIVE CODE", used: "USED", expired: "EXPIRED · COINS RETURNED" } : { issued: "CÓDIGO VIVO", used: "USADO", expired: "VENCIDO · MONEDAS DEVUELTAS" };
    const subTabs: Bloque = { type: "tabs", items: ([["pub", E("Publicaciones", "Posts"), com.pubs.length], ["cm", E("Comentarios", "Comments"), com.cms.length], ["seg", E("Seguidores y siguiendo", "Followers and following")], ["pym", E("Puntos y monedas", "Points and coins")], ["cup", E("Cupones y referidos", "Coupons and referrals")]] as [string, string, number?][])
      .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: sub === k, onClick: () => router.push(`/admin/usuarios/${u.id}?tab=comunidad&sub=${k}`, { scroll: false }) })) };
    let parte: ReactNode = null;
    if (sub === "pub") parte = com.pubs.length ? <PanelBloques bloques={[{ type: "rows", items: com.pubs.map((x) => ({ key: x.id, icon: "bubble", t: x.body,
      s: `${TIPO_C[x.kind] ?? E("Publicación", "Post")} · ${x.ciudad} · +${x.up} / −${x.dn} · ${x.cms} ${E("comentarios", "comments")} · ${fecha(x.at)}${x.rep ? ` · ${x.rep} ${E("reportes", "reports")}` : ""}${x.why ? ` · ${x.why}` : ""}`,
      tag: EST_C[x.status] ?? x.status, tone: x.status === "hidden" ? "danger" : "neutral", chev: x.status !== "deleted", onClick: x.status !== "deleted" ? () => router.push(`/admin/contenido/hilo/${x.id}`) : undefined })) },
      { type: "acts", items: [{ l: E("Ver todo en Contenido", "See all in Content"), v: "secondary", icon: "search", onClick: () => router.push(`/admin/contenido?autor=${u.id}`) }] }]} />
      : <PanelBloques bloques={[{ type: "empty", icon: "bubble", t: E("Sin publicaciones", "No posts"), s: E("Todavía no ha publicado en la Comunidad.", "Hasn’t posted in the Community yet.") }]} />;
    else if (sub === "cm") parte = com.cms.length ? <PanelBloques bloques={[{ type: "rows", items: com.cms.map((x) => ({ key: x.id, icon: "chat", t: x.body,
      s: `+${x.up} / −${x.dn} · ${fecha(x.at)}${x.rep ? ` · ${x.rep} ${E("reportes", "reports")}` : ""}${x.why ? ` · ${x.why}` : ""}`, tag: EST_C[x.status] ?? x.status, tone: x.status === "hidden" ? "danger" : "neutral",
      chev: true, onClick: () => router.push(`/admin/contenido/hilo/${x.post}?c=${x.id}`) })) }]} />
      : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E("Sin comentarios", "No comments"), s: E("Todavía no ha comentado en la Comunidad.", "Hasn’t commented in the Community yet.") }]} />;
    else if (sub === "seg") parte = <>
        {lista(E("SEGUIDORES", "FOLLOWERS"), com.listas.seg, E("Nadie la sigue todavía.", "No one follows them yet."))}
        {lista(E("SIGUIENDO", "FOLLOWING"), com.listas.sig, E("No sigue a nadie.", "Doesn’t follow anyone."))}
        {lista(E("BLOQUEADOS", "BLOCKED"), com.listas.blk, E("No ha bloqueado a nadie.", "Hasn’t blocked anyone."))}
        {com.listas.blk.length ? <A.AdminNote tone="info" icon="lock">{E("El bloqueo es mutuo e invisible para la persona bloqueada.", "Blocking is mutual and invisible to the blocked person.")}</A.AdminNote> : null}
        {lista(E("SILENCIADOS", "MUTED"), com.listas.mut, E("No ha silenciado a nadie.", "Hasn’t muted anyone."))}
        <A.AdminNote tone="info" icon="info">{E("Seguir o tener seguidores no da puntos ni rango. Los mensajes privados solo se leen con un reporte abierto, en Colas › Mensajes reportados.", "Following or having followers gives no points or rank. Private messages are only read with an open report, in Queues › Reported messages.")}</A.AdminNote>
      </>;
    else if (sub === "pym") parte = <>
        {pts && <>
          <PanelBloques bloques={[{ type: "group", k: E("PUNTOS Y RANGO", "POINTS AND RANK") },
            { type: "kv", cols: desk ? 3 : 2, items: [
              { k: E("RANGO ACTUAL", "CURRENT RANK"), v: `${pts.n} · ${bi(pts.name)}` }, { k: E("PUNTOS", "POINTS"), v: E(`${pts.total.toLocaleString("en-US")} · ${pts.mes} este mes · ${pts.hoy} hoy`, `${pts.total.toLocaleString("en-US")} · ${pts.mes} this month · ${pts.hoy} today`) },
              pts.sig && pts.req ? { k: `${E("PARA SUBIR A", "TO REACH")} ${bi(pts.sig).toUpperCase()}`, v: bi(pts.req) } : { k: E("SIGUIENTE", "NEXT"), v: E("Ya está en el rango más alto", "Already at the highest rank") },
              { k: E("REGLA", "RULE"), v: E(`Máximo ${pts.tope} puntos al día`, `Up to ${pts.tope} points a day`) }, { k: E("PISO DEL RANGO", "RANK FLOOR"), v: `${pts.piso} · ${E("el rango no baja solo", "rank doesn’t drop on its own")}` }] },
            ...(P.editar && !intocable && !borrada ? [{ type: "acts" as const, items: [
              { l: E("Ajustar puntos", "Adjust points"), v: "secondary", icon: "star", onClick: () => setConf({ titulo: `${E("Puntos", "Points")} · ${corto}`, sub: E(`Ahora: ${pts.total.toLocaleString("en-US")}. Tu rol ajusta hasta ${topeAjuste.toLocaleString("en-US")} de una vez. La persona ve el ajuste y el motivo. Queda en la auditoría.`, `Now: ${pts.total.toLocaleString("en-US")}. Your role adjusts up to ${topeAjuste.toLocaleString("en-US")} at once. The person sees the adjustment and the reason. It stays in the audit log.`),
                elegir: { label: E("TIPO", "TYPE"), items: [{ k: "c", l: E("Sumar", "Add") }, { k: "d", l: E("Restar", "Subtract") }] }, valor: { k: E("CANTIDAD", "AMOUNT"), ini: "", max: 4 }, cta: E("Aplicar", "Apply"),
                plantillas: [E("Puntos de un voto de cuentas del mismo dispositivo", "Points from a vote by accounts on the same device"), E("Error del sistema", "System error"), E("Devolver lo que se restó por error", "Return what was subtracted by mistake")], hacer: (m, e, v) => usrAjustarPuntos(u.id, e, v, m) }) },
              ...(P.admin ? [{ l: E("Cambiar rango", "Change rank"), v: "secondary", icon: "shield", onClick: () => setConf({ titulo: `${E("Rango", "Rank")} · ${corto}`, sub: E("Coronel (9) lo da el equipo a quien modera con buen criterio. Bajarlo solo por fraude. General del Barrio sale del cierre de la Tabla. La persona ve el motivo.", "The team gives Coronel (9) to those who moderate with good judgment. Lower it only for fraud. General del Barrio comes from the Leaderboard close. The person sees the reason."),
                elegir: { label: E("RANGO", "RANK"), items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ k: String(n), l: String(n) })) }, cta: E("Cambiar", "Change"), peligro: true,
                plantillas: [E("Invitación a moderar su ciudad (Coronel)", "Invitation to moderate their city (Coronel)"), E("Fraude: votos desde cuentas del mismo dispositivo", "Fraud: votes from accounts on the same device")], hacer: (m, e) => usrPisoRango(u.id, e, m) }) }] : []),
            ] }] : []),
            { type: "group", k: E("PUNTOS · MOVIMIENTOS", "POINTS · ACTIVITY") },
            pts.log.length ? { type: "rows", items: pts.log.map((x) => ({ key: x.id, icon: "star", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? BAD : undefined,
              t: x.motive === "ajuste" ? `${E("Ajuste del equipo", "Team adjustment")}: ${x.reason ?? ""}` : `${x.motive === "reverso" ? E("Se restó · ", "Subtracted · ") : x.motive === "restaurado" ? E("Volvió · ", "Returned · ") : ""}${x.label ? bi(x.label) : x.rule}${x.reason === "oculto" ? E(" (oculto por las reglas)", " (hidden by the rules)") : x.reason === "borrado" ? E(" (borrado)", " (deleted)") : ""}`,
              s: `${x.quien ? `${E("Equipo", "Team")} · ${x.quien} · ` : ""}${fecha(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}` })) } : { type: "empty", icon: "star", t: E("Sin movimientos", "No activity"), s: E("Todavía no ha sumado puntos.", "Hasn’t earned points yet.") },
          ]} />
        </>}
        {mon && <>
          <PanelBloques bloques={[{ type: "group", k: E("MONEDAS · SIN VALOR EN DINERO", "COINS · NO CASH VALUE") },
            { type: "kv", cols: desk ? 3 : 2, items: [{ k: E("SALDO", "BALANCE"), v: `${mon.saldo.toLocaleString("en-US")} ${E("monedas", "coins")}` }, { k: E("CÓDIGOS VIVOS", "LIVE CODES"), v: String(mon.codigos) }, { k: E("VALOR", "VALUE"), v: E("Sin valor en dinero · no se compran ni se cambian", "No cash value · can’t be bought or exchanged") }] },
            ...(P.editar && !intocable && !borrada ? [{ type: "acts" as const, items: [
              { l: E("Ajustar monedas", "Adjust coins"), v: "secondary", icon: "ticket", onClick: () => setConf({ titulo: `${E("Monedas", "Coins")} · ${corto}`, sub: E(`Ahora: ${mon.saldo.toLocaleString("en-US")}. Tu rol ajusta hasta ${topeMonedas.toLocaleString("en-US")} de una vez; nunca por debajo de 0. La persona ve el ajuste y el motivo. Queda en la auditoría.`, `Now: ${mon.saldo.toLocaleString("en-US")}. Your role adjusts up to ${topeMonedas.toLocaleString("en-US")} at once; never below 0. The person sees the adjustment and the reason. It stays in the audit log.`),
                elegir: { label: E("TIPO", "TYPE"), items: [{ k: "c", l: E("Sumar", "Add") }, { k: "d", l: E("Restar", "Subtract") }] }, valor: { k: E("CANTIDAD", "AMOUNT"), ini: "", max: 4 }, cta: E("Aplicar", "Apply"),
                plantillas: [E("Error del sistema", "System error"), E("Devolver un canje que el negocio no respetó", "Return a redemption the business didn’t honor"), E("Monedas por una cuenta duplicada", "Coins from a duplicate account")], hacer: (m, e, v) => usrAjustarMonedas(u.id, e, v, m) }) },
            ] }] : []),
            { type: "group", k: E("MONEDAS · MOVIMIENTOS", "COINS · ACTIVITY") },
            mon.log.length ? { type: "rows", items: mon.log.map((x) => ({ key: x.id, icon: "ticket", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? BAD : undefined,
              t: x.motivo === "ajuste" ? `${E("Ajuste del equipo", "Team adjustment")}: ${x.reason ?? ""}` : ((en ? { welcome: "Welcome", premio_mes: "Neighborhood Leaderboard prize", canje: "Redeemed a coupon", devolucion: "Expired code: coins returned" } : { welcome: "Bienvenida", premio_mes: "Premio de la Tabla del Barrio", canje: "Canjeó un cupón", devolucion: "Código vencido: monedas devueltas" }) as Record<string, string>)[x.motivo] ?? E("Monedas", "Coins"),
              s: `${x.quien ? `${E("Equipo", "Team")} · ${x.quien} · ` : ""}${fecha(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}` })) } : { type: "empty", icon: "ticket", t: E("Sin movimientos", "No activity"), s: E("Todavía no tiene monedas.", "Has no coins yet.") },
          ]} />
        </>}
      </>;
    else if (sub === "cup") parte = <PanelBloques bloques={[
      { type: "group", k: `${E("CUPONES CANJEADOS", "REDEEMED COUPONS")} · ${com.cupones.length}` },
      com.cupones.length ? { type: "rows", items: com.cupones.map((x) => ({ key: x.id, icon: "ticket", t: `${x.titulo} · ${x.negocio}`, s: `${x.costo} ${E("monedas", "coins")} · ${x.codigo} · ${fecha(x.at)}`, tag: EST_K[x.status] ?? x.status, tone: x.status === "used" ? "signal" : "neutral" })) }
        : { type: "empty", icon: "ticket", t: E("Sin cupones", "No coupons"), s: E("Todavía no ha canjeado monedas por un cupón.", "Hasn’t redeemed coins for a coupon yet.") },
      { type: "group", k: E("REFERIDOS · SIN DINERO, SOLO CUENTAN PARA CAPITÁN", "REFERRALS · NO MONEY, THEY ONLY COUNT TOWARD CAPITÁN") },
      { type: "kv", cols: desk ? 3 : 2, items: [{ k: E("SU CÓDIGO", "THEIR CODE"), v: com.referidos.codigo ?? E("Todavía no tiene", "None yet") }, { k: E("INVITADOS", "INVITED"), v: String(com.referidos.invitados) }, { k: E("PARTICIPAN", "TAKING PART"), v: String(com.referidos.activos) },
        { k: E("LLEGÓ INVITADA POR", "INVITED BY"), v: com.referidos.vino ?? E("Nadie", "No one") }] },
      ...(com.referidos.lista.length ? [{ type: "rows" as const, items: com.referidos.lista.map((x, i) => ({ key: String(i), icon: "users", t: x.nombre, s: fecha(x.at), tag: x.estado === "active" ? E("PARTICIPA", "TAKING PART") : E("SE UNIÓ", "JOINED"), tone: x.estado === "active" ? "signal" : "neutral" })) }] : []),
    ]} />;
    cuerpo = (
      <>
        <PanelBloques bloques={[
          { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
            { k: E("RANGO", "RANK"), v: String(com.rango), s: pts ? bi(pts.name) : undefined }, { k: E("PUNTOS", "POINTS"), v: pts ? pts.total.toLocaleString("en-US") : "—", s: pts ? E(`${pts.mes} este mes`, `${pts.mes} this month`) : undefined },
            { k: E("MONEDAS", "COINS"), v: mon ? mon.saldo.toLocaleString("en-US") : "—", s: E("sin valor en dinero", "no cash value") }, { k: E("VOTOS RECIBIDOS", "VOTES RECEIVED"), v: `+${com.votos.up}`, s: `−${com.votos.dn} · ${com.mejores} ${E("mejores respuestas", "best answers")}` }] },
          { type: "kv", cols: desk ? 3 : 2, items: [
            { k: E("PUBLICACIONES", "POSTS"), v: `${com.publicaciones} · ${com.comentarios} ${E("comentarios", "comments")}` }, { k: E("SEGUIDORES", "FOLLOWERS"), v: String(com.seguidores) }, { k: E("SIGUIENDO", "FOLLOWING"), v: String(com.siguiendo) },
            { k: E("BLOQUEÓ", "BLOCKED"), v: String(com.bloqueo) }, { k: E("SILENCIÓ", "MUTED"), v: String(com.silencio) },
            { k: E("CONVERSACIONES PRIVADAS", "PRIVATE CONVERSATIONS"), v: `${com.conversaciones} · ${E("el equipo no las lee salvo reporte", "the team doesn’t read them unless reported")}` }, { k: E("CUENTAS", "ACCOUNTS"), v: com.ocultaCuentas ? E("Ocultas al público", "Hidden from the public") : E("Visibles", "Visible") },
            { k: E("18 AÑOS O MÁS", "18 OR OLDER"), v: com.declaracion ? `${com.declaracion.adulto ? E("Declaró que sí", "Declared yes") : E("Declaró que no: no entra a la Comunidad", "Declared no: can’t enter the Community")} · ${fecha(com.declaracion.at)}` : E("Sin declarar", "Not declared"), fg: com.declaracion?.adulto === false ? WARN : undefined },
            { k: E("BIENVENIDA", "WELCOME"), v: com.bienvenida ? fecha(com.bienvenida) : E("No la ha hecho", "Not done yet") },
          ] },
        ]} />
        {com.ocultas ? <A.AdminNote tone="warn" icon="warning" cta={E("Ver", "View")} onCta={() => router.push(`/admin/contenido?autor=${u.id}&est=hid`)}>{E(`${com.ocultas} de sus publicaciones o comentarios están ocultos por las reglas.`, `${com.ocultas} of their posts or comments are hidden by the rules.`)}</A.AdminNote> : null}
        {com.red ? <A.AdminNote tone="bad" icon="warning" cta={P.editar && !intocable && !borrada ? E("Abrir caso de red de cuentas", "Open account-network case") : undefined}
          onCta={() => setConf({ titulo: `${E("Caso de red de cuentas", "Account-network case")} · ${corto}`, sub: E("Va a Colas › Reportes de usuario con la marca «posible red». Lo decide una persona, con la escalera de sanciones y la apelación. Queda en la auditoría.", "It goes to Queues › User reports flagged “possible network”. A person decides, with the sanction ladder and the appeal. It stays in the audit log."), cta: E("Abrir caso", "Open case"),
            plantillas: [E("Seguidores desde el mismo dispositivo", "Followers from the same device"), E("Votos entre cuentas del mismo dispositivo", "Votes between accounts on the same device"), E("Lo reportaron vecinos", "Reported by neighbors")], hacer: (m) => usrCasoRed(u.id, m) })}>
          {E(`${com.red} ${com.red === 1 ? "seguidor entró" : "seguidores entraron"} desde el mismo dispositivo que esta cuenta: posible red de cuentas.`, `${com.red} ${com.red === 1 ? "follower" : "followers"} signed in from the same device as this account: possible account network.`)}</A.AdminNote> : null}
        <PanelBloques bloques={[subTabs]} />
        {parte}
      </>);
  } else if (tab === "act" && act) {
    // 6j · Actividad (prototipo usrDetail «act»): cuántas operaciones en 90 días y BOLETOS DE EVENTOS (estado, transferencias, devoluciones,
    // entradas) y RSVP. Cada boleto abre Buscar boleto; el evento, su ficha. Nunca el teléfono de otra persona.
    const ST: Record<string, [string, string]> = { valid: [E("VÁLIDO", "VALID"), "signal"], used: [E("USADO", "USED"), "neutral"], refunded: [E("DEVUELTO", "REFUNDED"), "neutral"], void: [E("ANULADO", "VOID"), "danger"], replaced: [E("TRANSFERIDO", "TRANSFERRED"), "neutral"] };
    const RV: Record<string, string> = en ? { going: "GOING", cancelled: "NOT GOING", expired: "EXPIRED", attended: "ATTENDED" } : { going: "VA", cancelled: "YA NO VA", expired: "VENCIÓ", attended: "LLEGÓ" };
    const k = act.kpi, usd = (c: number) => `$${(c / 100).toFixed(2)}`;
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [{ k: E("PEDIDOS · 90 D", "ORDERS · 90 D"), v: String(k.pedidos) }, { k: E("CITAS · 90 D", "BOOKINGS · 90 D"), v: String(k.citas) }, { k: E("RESERVACIONES · 90 D", "RESERVATIONS · 90 D"), v: String(k.reservas), s: k.privados ? E(`${k.privados} eventos privados`, `${k.privados} private events`) : undefined },
        { k: E("BOLETOS", "TICKETS"), v: String(k.boletos), s: `${k.rsvp} RSVP · ${E("devuelto", "refunded")} ${usd(act.devuelto.devuelto)}` }] },
      act.boletos.length ? { type: "rows", k: `${E("BOLETOS DE EVENTOS", "EVENT TICKETS")} · ${act.boletos.length}`, items: act.boletos.map((b) => ({ key: b.code, icon: "ticket", t: `${bi(b.evento)} · ${diaCorto(b.dia, !en)}`,
        s: [b.code, b.tipo ? bi(b.tipo) : undefined, b.kind === "comp" ? E("cortesía", "comp") : b.precio ? usd(b.precio) : null, b.num, b.de ? E("lo recibió por transferencia", "received by transfer") : null, b.a ? (b.a === "transfiriendo" ? E("transfiriendo", "transferring") : E("lo pasó a otra persona", "passed it to someone else")) : null, b.entro ? `${E("entró", "got in")} ${b.entro}` : null].filter(Boolean).join(" · "),
        tag: ST[b.st]?.[0] ?? b.st, tone: ST[b.st]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/eventos/boleto/${b.code}`) })) } as Bloque
        : { type: "note", tone: "info", icon: "ticket", t: E("Sin boletos.", "No tickets.") } as Bloque,
      act.rsvp.length ? { type: "rows", k: `RSVP · ${act.rsvp.length}`, items: act.rsvp.map((r, i) => ({ key: `r${i}`, icon: "users", t: `${bi(r.evento)} · ${diaCorto(r.dia, !en)}`, s: E(`${r.party} ${r.party === 1 ? "persona" : "personas"}${r.llegaron ? ` · llegaron ${r.llegaron}` : ""}`, `${r.party} ${r.party === 1 ? "person" : "people"}${r.llegaron ? ` · ${r.llegaron} arrived` : ""}`),
        tag: RV[r.st] ?? r.st, tone: r.st === "going" ? "signal" : "neutral", chev: true, onClick: () => router.push(`/admin/eventos/${r.eid}`) })) } as Bloque
        : { type: "note", tone: "info", icon: "users", t: E("Sin RSVP.", "No RSVPs.") } as Bloque,
    ]} />;
  } else if (tab === "din" && din) {
    // 9n-9 · Dinero (prototipo usrDetail «din», solo tx:ver): cobrado 90 d, retenido ahora y devuelto; sus tarjetas (últimos 4) y sus últimos cobros.
    const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
    const PST: Record<string, [string, string]> = { held: [E("RETENIDO", "HELD"), "action"], captured: [E("COBRADO", "CHARGED"), "neutral"], released: [E("LIBERADO", "RELEASED"), "neutral"], refunded: [E("DEVUELTO", "REFUNDED"), "neutral"], partially_refunded: [E("DEVUELTO EN PARTE", "PARTLY REFUNDED"), "neutral"], failed: [E("FALLÓ", "FAILED"), "danger"] };
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [{ k: E("COBRADO · 90 D", "CHARGED · 90 D"), v: usd(din.cobrado) }, { k: E("RETENIDO AHORA", "HELD NOW"), v: usd(din.retenido) }, { k: E("DEVUELTO · 90 D", "REFUNDED · 90 D"), v: usd(din.devuelto) }] },
      { type: "group", k: E("MÉTODOS DE PAGO", "PAYMENT METHODS") },
      din.tarjetas.length ? { type: "rows", items: din.tarjetas.map((t, i) => ({ key: `t${i}`, icon: "card", t: `${t.brand} •••• ${t.last4}`, s: `${E("Vence", "Expires")} ${t.exp}${t.def ? E(" · predeterminada", " · default") : ""}${t.sim ? E(" · simulada", " · simulated") : ""}`, m: "STRIPE" })) } as Bloque
        : { type: "note", tone: "info", icon: "card", t: E("Todavía no ha guardado una tarjeta.", "Hasn’t saved a card yet.") } as Bloque,
      { type: "note", tone: "info", icon: "lock", t: E("El número completo lo guarda Stripe; aquí solo se ven los últimos 4.", "Stripe keeps the full number; only the last 4 show here.") },
      din.cobros.length ? { type: "rows", k: `${E("ÚLTIMOS COBROS", "LATEST CHARGES")} · ${din.n}`, items: din.cobros.map((c) => ({ key: c.id, icon: "dollar", t: `${c.negocio}${c.num ? ` · ${c.num}` : ""}`,
        s: `${new Date(c.at).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" })}${c.last4 ? ` · •••• ${c.last4}` : ""}${c.devuelto ? ` · ${E("devuelto", "refunded")} ${usd(c.devuelto)}` : ""}`,
        r: usd(c.cents), tag: PST[c.status]?.[0] ?? c.status, tone: PST[c.status]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/negocios/${c.biz}?tab=din`) })) } as Bloque
        : { type: "note", tone: "info", icon: "dollar", t: E("Sin cobros con tarjeta.", "No card charges.") } as Bloque,
    ]} />;
  } else if (tab === "soporte" && sop) {
    cuerpo = <SoporteDe360 casos={sop} vacio={E("Esta persona no ha escrito a Soporte.", "This person hasn’t written to Support.")} />;
  } else if (tab === "compa" && cpa) {
    // 7i · El Compa de esta persona: cifras de 30 días y sus conversaciones SIN texto (el hilo, en la ficha anotada; solo Admin y Soporte).
    const RES: Record<string, [string, string]> = { open: [E("ABIERTA", "OPEN"), "neutral"], self_resolved: [E("RESOLVIÓ SOLO", "SELF-RESOLVED"), "neutral"], action_done: [E("ACCIÓN CONFIRMADA", "ACTION CONFIRMED"), "signal"], handed_off: [E("A UNA PERSONA", "TO A PERSON"), "action"], to_owner: [E("AL DUEÑO", "TO THE OWNER"), "action"] };
    const USO: Record<string, string> = en ? { neighbor: "Neighbors", owner: "Business panel", auto_reply: "Auto replies" } : { neighbor: "Vecinos", owner: "Panel del negocio", auto_reply: "Respuestas automáticas" };
    const MOT: Record<string, string> = en ? { money: "money", account: "account", safety: "safety", asked_person: "asked for it", unknown: "didn’t know", owner: "owner" } : { money: "dinero", account: "cuenta", safety: "seguridad", asked_person: "lo pidió", unknown: "no supo", owner: "dueño" };
    const r = cpa.porResultado, solo = (r.self_resolved ?? 0) + (r.action_done ?? 0);
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
        { k: E("CONVERSACIONES · 30 D", "CONVERSATIONS · 30 D"), v: String(cpa.conv30), s: Object.entries(cpa.porUso).map(([k, n]) => `${n} ${USO[k] ?? k}`).join(" · ") || E("ninguna", "none"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: E("RESOLVIÓ SOLO", "SELF-RESOLVED"), v: cpa.conv30 ? `${Math.round((solo / cpa.conv30) * 100)} %` : "—", s: E(`${cpa.acciones} acciones confirmadas`, `${cpa.acciones} confirmed actions`) },
        { k: E("A UNA PERSONA", "TO A PERSON"), v: String((r.handed_off ?? 0) + (r.to_owner ?? 0)), s: E(`${cpa.sinIa} sin IA (reglas fijas)`, `${cpa.sinIa} without AI (fixed rules)`) },
        { k: E("MARCADAS · NO SUPO", "FLAGGED · DIDN’T KNOW"), v: `${cpa.marcadas} · ${cpa.noSupo}`, s: E("marcadas por el equipo · preguntas sin respuesta", "flagged by the team · unanswered questions"), sFg: cpa.marcadas ? "var(--tl-danger)" : undefined }] },
      cpa.filas.length ? { type: "rows", k: E("SUS CONVERSACIONES", "THEIR CONVERSATIONS"), items: cpa.filas.map((x) => ({ key: x.num, icon: x.ai ? "chat" : "lock", chev: cpa.leer,
        onClick: cpa.leer ? () => router.push(`/admin/compa?cp=${encodeURIComponent(x.num)}`) : undefined,
        t: `${x.num} · ${USO[x.uso] ?? x.uso}`, s: `${x.turnos} ${en ? (x.turnos === 1 ? "message" : "messages") : x.turnos === 1 ? "mensaje" : "mensajes"} · ${x.ciudad} · ${haceUsr(x.at, ahora, en)}${x.motivo ? ` · ${E("motivo", "reason")}: ${MOT[x.motivo] ?? x.motivo}` : ""}${x.purgada ? E(" · texto borrado por la retención", " · text deleted by retention") : ""}${x.marcada ? E(" · MARCADA", " · FLAGGED") : ""}`,
        tag: RES[x.resultado]?.[0] ?? x.resultado, tone: x.marcada ? "danger" : RES[x.resultado]?.[1] ?? "neutral" })) } as Bloque
        : { type: "empty", icon: "chat", t: E("Esta persona no ha hablado con El Compa", "This person hasn’t talked to El Compa"), s: E("Cuando use la hoja de ayuda, Soporte o el panel, sale aquí (sin el texto).", "When they use the help sheet, Support or the panel, it shows here (without the text).") } as Bloque,
      { type: "note", tone: "ink", icon: "shield", t: cpa.leer ? E("La lista no muestra lo que se habló. Al abrir una conversación ves el hilo (tapado como se guardó) y tu lectura queda anotada.", "The list doesn’t show what was said. Opening a conversation shows the thread (masked as stored) and your reading is logged.") : E("Tu rol ve las cifras. El hilo lo leen Admin y Soporte, y cada lectura queda anotada.", "Your role sees the numbers. Admin and Support read the thread, and every reading is logged.") },
    ]} />;
  } else if (tab === "privacidad") {
    // 9d · Privacidad (L186, L189): sus archivos, el borrado y su purga por tabla, «ver como» de solo lectura, lo que aceptó, sus avisos y Fusionar.
    const x = pri;
    const EST_ARCH: Record<string, [string, string]> = { pendiente: [E("PEDIDO", "REQUESTED"), "action"], armando: [E("ARMANDO", "BUILDING"), "action"], listo: [E("LISTO", "READY"), "signal"], bajado: [E("BAJADO", "DOWNLOADED"), "neutral"], vencido: [E("VENCIDO", "EXPIRED"), "neutral"], fallo: [E("NO SALIÓ", "FAILED"), "danger"] };
    const ACC: Record<string, string> = en ? { borrar: "deleted", vaciar: "emptied", seudonimizar: "pseudonymized" } : { borrar: "borradas", vaciar: "vaciadas", seudonimizar: "seudonimizadas" };
    const descargar = (b64: string) => {
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bytes], { type: "application/zip" })); a.download = `tolatino-datos-${u.id}.zip`;
      document.body.appendChild(a); a.click(); a.remove();
    };
    const resumen = (f: Record<string, unknown>) => Object.entries(f).filter(([, v]) => v != null && v !== "" && typeof v !== "object").slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(" · ");
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: E("SUS ARCHIVOS (DESCARGAR MIS DATOS)", "THEIR FILES (DOWNLOAD MY DATA)"), first: true }]} />
        {P.exportar ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Exportar sus datos", "Export their data"), icon: "folder", off: pend, onClick: () => setConf({
          titulo: E(`Exportar los datos de ${corto}`, `Export ${corto}’s data`), sub: E("Para un pedido de privacidad que llegó por Soporte. Es el mismo archivo que la persona pide en Mi cuenta: lo que el mapa de datos dice que se exporta, en JSON y CSV.", "For a privacy request that came through Support. It’s the same file the person requests in My account: what the data map says is exported, in JSON and CSV."), cta: E("Descargar", "Download"),
          hacer: async (m) => { const r = await exportarDatos(u.id, m); if (r.ok && "archivo" in r && r.archivo) descargar(r.archivo); return r; } }) }] }]} /> : <A.AdminNote tone="info" icon="lock">{E("Tu rol no exporta datos.", "Your role doesn’t export data.")}</A.AdminNote>}
        {x?.archivos.length ? <A.AdminList rows={x.archivos.map((e) => ({ icon: "folder", title: `${e.negocio ? `${E("Del negocio", "From the business")} ${e.negocio}` : E("Su archivo", "Their file")} · ${E("pedido", "requested")} ${fecha(e.pedido)}`,
          sub: [e.equipo ? E(`Lo pidió ${e.equipo} (equipo)`, `Requested by ${e.equipo} (team)`) : E("Lo pidió la persona", "Requested by the person"), e.bytes ? `${Math.max(1, Math.round(e.bytes / 1024))} KB` : null, e.bajado ? `${E("bajado", "downloaded")} ${fecha(e.bajado)}` : null].filter(Boolean).join(" · "),
          tag: EST_ARCH[e.estado]?.[0] ?? e.estado.toUpperCase(), tone: EST_ARCH[e.estado]?.[1] ?? "neutral" }))} />
          : <A.AdminNote tone="info" icon="folder">{E("No ha pedido su archivo.", "Hasn’t requested their file.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E("BORRADO A LOS 30 DÍAS", "DELETION AFTER 30 DAYS") }]} />
        {x?.purga ? <>
          <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
            { k: E("PURGADA", "PURGED"), v: fecha(x.purga.at) }, { k: E("RESULTADO", "RESULT"), v: x.purga.ok ? E("Completa", "Complete") : E(`Faltan ${x.purga.pendientes} filas`, `${x.purga.pendientes} rows left`), fg: x.purga.ok ? OK : BAD },
            { k: E("FILAS", "ROWS"), v: String(x.purga.filas) }, { k: E("TABLAS REVISADAS", "TABLES CHECKED"), v: String(x.purga.tablas) }, { k: E("NEGOCIOS SIN DUEÑO", "BUSINESSES WITHOUT OWNER"), v: String(x.purga.negocios) }, { k: E("FOTOS FUERA DEL ALMACÉN", "PHOTOS REMOVED FROM STORAGE"), v: String(x.purga.fotos) },
          ] }]} />
          <A.AdminList rows={x.purga.items.filter((it) => it.filas > 0).map((it) => ({ icon: it.accion === "borrar" ? "trash" : "edit", title: `${it.tabla}.${it.columna}`, sub: `${it.filas} ${ACC[it.accion] ?? it.accion}` }))} />
          <A.AdminNote tone="info" icon="check">{E(`${x.purga.items.filter((it) => it.filas === 0).length} tablas más del mapa revisadas sin nada suyo.`, `${x.purga.items.filter((it) => it.filas === 0).length} more tables in the map checked with nothing of theirs.`)}</A.AdminNote>
        </> : x?.borrado ? <A.AdminNote tone="warn" icon="clock">{E(`${x.borrado.porElEquipo ? "Borrado pedido por el equipo" : "La persona pidió borrar su cuenta"}: se borra el ${fecha(x.borrado.at)}. Ese día el barrido la purga por el mapa de datos y aquí se ve cada tabla.`, `${x.borrado.porElEquipo ? "Deletion requested by the team" : "The person asked to delete their account"}: it’s deleted on ${fecha(x.borrado.at)}. That day the sweep purges it by the data map and each table shows here.`)}</A.AdminNote>
          : <A.AdminNote tone="info" icon="trash">{E("No hay un borrado programado.", "No deletion scheduled.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E("VER COMO (SOLO LECTURA)", "VIEW AS (READ-ONLY)"), link: comoVista ? E("Cerrar", "Close") : undefined, onLink: () => setComoVista(null) }]} />
        {comoVista ? (comoVista.length ? comoVista.map((pt) => <div key={pt.k}><PanelBloques bloques={[{ type: "group", k: `${pt.k.toUpperCase().replace(/_/g, " ")} · ${pt.n}` }]} />
          <A.AdminList rows={pt.filas.map((f, i) => ({ icon: "search", title: resumen(f) || "—", sub: i === 0 && pt.n > 3 ? E(`y ${pt.n - 3} más`, `and ${pt.n - 3} more`) : undefined }))} /></div>)
          : <A.AdminNote tone="info" icon="search">{E("No tiene nada guardado aparte de su cuenta.", "Nothing stored besides their account.")}</A.AdminNote>)
          : <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Ver como (solo lectura)", "View as (read-only)"), icon: "search", onClick: () => setConf({ titulo: E(`Ver lo que guardamos de ${corto}`, `See what we store about ${corto}`), sub: E("Lo mismo que trae su archivo, sin poder cambiar nada. El motivo queda en la auditoría antes de ver.", "The same as their file, without being able to change anything. The reason goes into the audit log before you see it."), cta: E("Ver", "View"),
            plantillas: [E("Pedido de privacidad por Soporte", "Privacy request through Support"), E("Revisar un reclamo de la persona", "Review a complaint from the person")], hacer: async (m) => { const r = await verComo(u.id, m); if (r.ok && "partes" in r && r.partes) setComoVista(r.partes); return r; } }) }] }]} />}

        <PanelBloques bloques={[{ type: "group", k: E("TÉRMINOS QUE ACEPTÓ", "TERMS ACCEPTED") }]} />
        {x?.terminos.length ? <A.AdminList rows={x.terminos.map((t) => ({ icon: "check", title: bi(t.t), sub: [t.s ? bi(t.s) : undefined, `${E("aceptado", "accepted")} ${fecha(t.at)}`].filter(Boolean).join(" · ") }))} />
          : <A.AdminNote tone="info" icon="shield">{E("No hay términos anotados.", "No terms on record.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E("AVISOS QUE RECIBE", "NOTIFICATIONS THEY GET") }]} />
        <A.AdminNote tone="info" icon="bell">{`${x?.avisos.apagados.length ? `${E("Apagó", "Turned off")}: ${x.avisos.apagados.join(", ")}.` : E("Recibe todos los avisos.", "Gets all notifications.")} ${x?.avisos.silencio ? E("Respeta sus horas de silencio (de 10 PM a 7 AM, salvo lo crítico).", "Respects their quiet hours (10 PM to 7 AM, except critical ones).") : E("Sin horas de silencio.", "No quiet hours.")}`}</A.AdminNote>

        <PanelBloques bloques={[{ type: "group", k: E("FUSIONAR CUENTAS", "MERGE ACCOUNTS") }]} />
        {x?.pedidoFusion ? <A.AdminNote tone="warn" icon="users" cta={x.pedidoFusion.caso ? E("Ver", "View") : undefined} onCta={() => router.push(`/admin/colas?caso=${x.pedidoFusion?.caso}`)}>
          {E(`Pedido de fusión en Cambios sensibles (#${x.pedidoFusion.id}${x.pedidoFusion.pidio ? `, lo pidió ${x.pedidoFusion.pidio}` : ""}): lo aplica otra persona del equipo.`, `Merge request in Sensitive changes (#${x.pedidoFusion.id}${x.pedidoFusion.pidio ? `, requested by ${x.pedidoFusion.pidio}` : ""}): another team member applies it.`)}</A.AdminNote> : null}
        {x?.fusiones.length ? <A.AdminList rows={x.fusiones.map((f) => ({ icon: "users", title: f.desde === u.id ? E("Esta cuenta se fusionó en otra", "This account was merged into another") : E("Otra cuenta se fusionó en esta", "Another account was merged into this one"),
          sub: E(`${fecha(f.at)} · lo pidió ${f.pidio ?? "equipo"} · lo aprobó ${f.aprobo ?? "equipo"} · ${Object.values(f.tablas).reduce((a, n) => a + n, 0)} filas movidas`, `${fecha(f.at)} · requested by ${f.pidio ?? "team"} · approved by ${f.aprobo ?? "team"} · ${Object.values(f.tablas).reduce((a, n) => a + n, 0)} rows moved`), chevron: true,
          onClick: () => router.push(`/admin/usuarios/${f.desde === u.id ? f.hacia : f.desde}?tab=privacidad`) }))} /> : null}
        {P.editar && !borrada && !intocable && !x?.pedidoFusion ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E("Fusionar con otra cuenta", "Merge with another account"), icon: "users", onClick: () => setConf({
          titulo: E(`Fusionar la cuenta de ${corto} en otra`, `Merge ${corto}’s account into another`), sub: E("Sus pedidos, cobros, direcciones, guardados, reseñas y publicaciones pasan a la cuenta del teléfono que escribas; esta queda fusionada y ya no entra. Entra a Cambios sensibles: lo aplica otra persona del equipo.", "Their orders, charges, addresses, saved items, reviews and posts move to the account of the phone you enter; this one is merged and can no longer sign in. It goes to Sensitive changes: another team member applies it."),
          cta: E("Enviar a la cola", "Send to the queue"), valor: { k: E("TELÉFONO DE LA OTRA CUENTA (10 NÚMEROS)", "OTHER ACCOUNT’S PHONE (10 DIGITS)"), ini: "", max: 14 }, plantillas: [E("Cambió de número y abrió otra cuenta", "Changed number and opened another account"), E("Lo pidió la persona por Soporte", "The person asked through Support")],
          hacer: (m, _e, v) => pedirFusion(u.id, v, m) }) }] }]} />
          : !x?.pedidoFusion && !x?.fusiones.length ? <A.AdminNote tone="info" icon="users">{borrada ? E("Una cuenta borrada o fusionada no se fusiona.", "A deleted or merged account can’t be merged.") : E("Tu rol no fusiona cuentas.", "Your role doesn’t merge accounts.")}</A.AdminNote> : null}
      </>);
  } else {
    const acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    if (u.photo && (P.editar || P.retirar) && !borrada) acts.push({ l: E("Quitar foto de perfil", "Remove profile photo"), icon: "image", onClick: () => setConf({ titulo: E(`Quitar la foto de ${corto}`, `Remove ${corto}’s photo`), plantillas: PLU, hacer: (m) => quitarFotoPerfil(u.id, m) }) });
    // 9n-3 · Enviar mensaje del equipo (AdminMessage): por la app o por SMS; tope por hora y por destinatario, sin enlaces.
    if (P.editar && !borrada && !u.yoMismo) acts.push({ l: E("Enviar mensaje", "Send message"), icon: "chat", onClick: () => setConf({
      titulo: E(`Mensaje a ${corto}`, `Message to ${corto}`), sub: E("Lo ve en su campana y, si eliges SMS, también por texto (no sale de noche ni a quien dijo STOP). Sin enlaces. El motivo de abajo es interno: queda en la auditoría.", "They see it in their bell and, if you choose SMS, also by text (not sent at night or to anyone who said STOP). No links. The reason below is internal: it stays in the audit log."),
      cta: E("Enviar", "Send"), elegir: { label: E("POR DÓNDE", "HOW"), items: [{ k: "push", l: E("En la app (campana y push)", "In the app (bell and push)") }, ...(u.phone_ok ? [{ k: "sms", l: E("Por SMS", "By SMS") }] : [])] },
      valor: { k: E("MENSAJE (HASTA 280 LETRAS)", "MESSAGE (UP TO 280 CHARACTERS)"), ini: "", area: true, max: 280 }, plantillas: [E("Aviso sobre su cuenta", "Notice about their account"), E("Respuesta a lo que pidió por Soporte", "Reply to what they asked through Support"), E("Aviso de seguridad", "Security notice")],
      hacer: (m, e, v) => enviarMensaje(u.id, e ?? "push", v, m) }) });
    if (P.retirar && !borrada && u.estado !== "ban" && !intocable) acts.push({ l: E("Sancionar", "Sanction"), v: "danger", icon: "warning", onClick: () => setConf({
      titulo: E(`Sanción a ${corto}`, `Sanction for ${corto}`), peligro: true, plantillas: PLU,
      elegir: { label: E("SANCIÓN", "SANCTION"), items: ORDEN_SANCIONES.filter((k) => !SANCIONES[k].admin || P.admin).map((k) => ({ k, l: `${bi(SANCIONES[k])} · ${subS(k)}` })) },
      hacer: (m, e) => sancionar(u.id, (e ?? "") as Sancion, m) }) });
    if (P.editar && !borrada && !intocable && !pedido) acts.push({ l: E("Borrar datos", "Delete data"), icon: "trash", onClick: () => setConf({
      titulo: E("Pedido de borrado", "Deletion request"), sub: E("Entra a Cambios sensibles; otra persona lo aprueba. Luego hay 30 días de gracia para restaurarla. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada» (lo pide la ley) y los pagos con tarjeta quedan en Stripe.", "It goes to Sensitive changes; another person approves it. Then there are 30 grace days to restore it. After that everything of theirs is deleted; their orders and charges remain as “Deleted account” (required by law) and card payments stay in Stripe."),
      cta: E("Enviar a la cola", "Send to the queue"), hacer: (m) => pedirBorrado(u.id, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: E("TELÉFONO", "PHONE"), v: `${u.phone_b} · ${u.phone_ok ? E("Verificado", "Verified") : E("Pide código", "Asks for code")}`, fg: u.phone_ok ? undefined : WARN },
          { k: E("CORREO", "EMAIL"), v: u.email ? `${u.email} · ${u.email_ok ? E("Verificado", "Verified") : E("Sin verificar", "Not verified")}` : E("No dio", "Not given") },
          { k: E("CIUDAD", "CITY"), v: u.ciudad ?? E("Sin ciudad", "No city") },
          { k: E("ROL", "ROLE"), v: rol },
          { k: E("DESDE", "SINCE"), v: fecha(u.creado) },
          { k: E("ÚLTIMA VEZ", "LAST SEEN"), v: haceUsr(u.visto, ahora, en) },
          { k: E("DISPOSITIVOS", "DEVICES"), v: String(u.dispositivos.length), fg: u.compartidos.length ? BAD : undefined },
        ] }]} />
        {u.compartidos.length ? <A.AdminNote tone="warn" icon="warning" cta={E("Ver", "View")} onCta={() => ir("seguridad")}>{E(`Comparte dispositivo con ${u.compartidos.length} ${u.compartidos.length === 1 ? "cuenta más" : "cuentas más"}.`, `Shares a device with ${u.compartidos.length} ${u.compartidos.length === 1 ? "other account" : "other accounts"}.`)}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: E("NOTAS INTERNAS", "INTERNAL NOTES"), link: P.editar || P.retirar ? E("Agregar nota", "Add note") : undefined, onLink: () => setConf({ titulo: E(`Nota sobre ${corto}`, `Note about ${corto}`), sub: E("Solo la ve el equipo. El vecino nunca la ve.", "Only the team sees it. The neighbor never does."), cta: E("Guardar", "Save"), hacer: (m) => notaUsuario(u.id, m) }) }]} />
        {u.notas.length ? <A.AdminList rows={u.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? E("Equipo", "Team")} · ${fecha(x.at)}` }))} />
          : <A.AdminNote tone="info" icon="edit">{E("Sin notas. Úsalas para lo que el siguiente del equipo necesita saber.", "No notes. Use them for what the next team member needs to know.")}</A.AdminNote>}
        {u.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: E("SUS NEGOCIOS", "THEIR BUSINESSES") }]} />
          <A.AdminList rows={u.negocios.map((n) => ({ icon: "store", title: n.name, sub: `${n.kind === "owner" ? E("Dueño", "Owner") : E("Equipo", "Team")} · ${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}`, tag: n.status !== "active" ? n.status.toUpperCase() : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }))} />
        </> : null}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: E("ACCIONES", "ACTIONS") }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
        {intocable && !borrada ? <A.AdminNote tone="info" icon="lock">{u.yoMismo ? E("Es tu cuenta: no te sancionas ni te borras desde aquí.", "It’s your account: you can’t sanction or delete yourself from here.") : E("Es del equipo de To’Latino: para sancionarla o borrarla, quítale el rol en Sistema › Equipo antes.", "It belongs to the To’Latino team: to sanction or delete it, remove the role in System › Team first.")}</A.AdminNote> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("USUARIO 360°", "USER 360°"), t: nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/usuarios")} {...tec(() => router.push("/admin/usuarios"))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E("Usuarios", "Users")}</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E("USUARIO 360°", "USER 360°")}</span>
      <PanelBloques bloques={cab} />
      {avisos}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: E("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
