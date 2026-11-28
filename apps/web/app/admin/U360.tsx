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
import { EST_USR, haceUsr } from "./Usuarios";
import { useE2 } from "./idioma-admin";
import { SoporteDe360, type CasoSop } from "./SoporteDe360";
import type { CompaUsuario } from "@/lib/compa/admin-compa";
import { useAhora } from "@/lib/ahora";
import { bajarPorPost } from "@/lib/bajar-post";

import { tec } from "@/lib/tec";

type EF = (es: string, en: string) => string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "Icon", ComponentType<any>>;
const PUSH_APP = (E2: EF): Record<string, string> => ({ cliente: "To'Latino", negocio: E2("Negocios", "Business"), delivery: E2("Repartidor", "Driver"), checkin: E2("Puerta", "Door"), web: "Web" });
const PUSH_PROV = (E2: EF): Record<string, string> => ({ apns: "APNs", fcm: "FCM", webpush: "Web Push", sim: E2("simulado (semilla)", "simulated (seed)") });
const LLAVE_POR = (E2: EF): Record<string, string> => ({
  user: E2("la quitó la persona", "removed by the person"), staff: E2("la revocó el equipo", "revoked by the team"),
  sistema: E2("la quitó el sistema", "removed by the system")
});
const PUSH_MOTIVO = (E2: EF): Record<string, string> => ({
  salir: E2("salió de la cuenta", "signed out"), invalido: E2("el proveedor dijo que ya no sirve", "the provider said it no longer works"),
  apagado: E2("los apagó la persona", "turned off by the person"), reemplazado: E2("lo reemplazó otro", "replaced by another"),
  admin: E2("el equipo", "the team"), vencido: E2("sin uso", "unused")
});
/* Verbo de cada acción en el historial. */
const VERBO = (E2: EF): Record<string, string> => ({
  "usuario.nota": E2("agregó una nota a", "added a note to"), "usuario.sancionar": E2("sancionó a", "sanctioned"),
  "usuario.levantar": E2("levantó la sanción de", "lifted the sanction of"), "usuario.foto.quitar": E2("quitó la foto de", "removed the photo of"),
  "usuario.sesiones.cerrar": E2("cerró las sesiones de", "closed the sessions of"),
  "usuario.sesion.cerrar": E2("cerró una sesión de", "closed a session of"),
  "usuario.sesion.bloquear": E2("bloqueó un dispositivo de", "blocked a device of"),
  "usuario.dispositivo.bloquear": E2("bloqueó un dispositivo de", "blocked a device of"),
  "usuario.dispositivo.desbloquear": E2("desbloqueó un dispositivo de", "unblocked a device of"),
  "usuario.push.revocar": E2("revocó los avisos de un teléfono de", "revoked a phone’s notifications for"),
  "usuario.llave.revocar": E2("revocó una llave de acceso de", "revoked a passkey of"),
  "usuario.verificacion.restablecer": E2("restableció la verificación de", "reset the verification of"),
  "usuario.ciudad": E2("cambió la ciudad de", "changed the city of"),
  "usuario.borrado.pedir": E2("pidió borrar la cuenta de", "requested deleting the account of"),
  "usuario.borrar": E2("borró la cuenta de", "deleted the account of"), "usuario.restaurar": E2("restauró la cuenta de", "restored the account of"),
  "usuario.exportar": E2("exportó los datos de", "exported the data of"),
  "usuario.red.caso": E2("abrió un caso de red de cuentas de", "opened an account-network case for"),
  "usuario.evt.caso": E2("abrió un caso de Eventos de", "opened an Events case for"),
  "usuario.ver_como": E2("vio en solo lectura los datos de", "viewed read-only the data of"),
  "usuario.fusion.pedir": E2("pidió fusionar la cuenta de", "requested merging the account of"),
  "usuario.fusionar": E2("fusionó la cuenta de", "merged the account of")
});
const CAMBIO_K: Record<string, string> = { phone: "Teléfono", city: "Ciudad", email: "Correo", name: "Nombre" };
const fechaL = (iso: string | null, en = false) => (iso ? new Date(iso).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const OK = "var(--tl-open-text)", WARN = "var(--tl-pro-ink)", BAD = "var(--tl-danger)";

export function U360({ u, tab, sub = "pub", com, pts, mon, topeAjuste = 500, topeMonedas = 500, act = null, sop, cpa, pri = null, cif = null, din }: { sop?: CasoSop[]; cpa?: CompaUsuario | null; u: Usuario360; tab: string; sub?: string; com?: Comunidad360 | null; pts?: Puntos360 | null; mon?: Monedas360 | null; topeAjuste?: number; topeMonedas?: number; act?: Actividad360 | null; pri?: Privacidad360 | null;
  cif?: Cifras360 | null; din?: Dinero360 | null }) {
  const ahora = useAhora(); // 9b-1 · «hace N min»: el mismo ahora en el servidor y en la hidratación (lib/ahora.tsx)
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const { E2 } = useE2(), en = E2("", "x") === "x", fecha = (iso: string | null) => fechaL(iso, en), bi = (b: { es: string; en?: string }) => (en && b.en) || b.es;
  const PA = PUSH_APP(E2), PP = PUSH_PROV(E2), LP = LLAVE_POR(E2), PM = PUSH_MOTIVO(E2), VB = VERBO(E2), EU = EST_USR(E2), PLU = PLANTILLAS_USR(E2);
  const subS = (k: Sancion) => (en ? (SANCIONES[k].dias ? `${SANCIONES[k].dias} days · lifts on its own` : k === "ban" ? "Permanent · confirmed by an Admin" : "Until a person lifts it") : subSancion(k));
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const [comoVista, setComoVista] = useState<{ k: string; n: number; filas: Record<string, unknown>[] }[] | null>(null);
  // 28 nov · «Exportar sus datos» vuelve con el id del enlace: se baja AQUÍ, con la acción ya terminada (no revalida: nada del router llegando), y la
  // pantalla se refresca cuando la descarga ya arrancó, no a la vez. Con router.refresh() justo detrás del envío, Safari (iPhone, iPad) cortaba
  // la descarga y el enlace de un uso quedaba gastado sin archivo (lib/bajar-post.ts; guardián bajarSinCarrera).
  const hecho = (r: ResAdm & { enlace?: string }) => {
    setToast(r.mensaje ?? E2("Listo. Quedó en la auditoría.", "Done. It’s in the audit log.")); setConf(null);
    if (r.enlace) bajarPorPost(`/api/admin/usuarios/archivo/${encodeURIComponent(r.enlace)}`, () => router.refresh());
    else router.refresh();
  };
  const P = u.puede, ir = (t: string) => router.push(`/admin/usuarios/${u.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const nombre = u.nombre ?? E2("(sin nombre todavía)", "(no name yet)"), corto = u.nombre?.split(" ")[0] ?? u.phone_b;
  const borrada = u.estado === "del", vigentes = u.sanciones.filter((x) => !x.lifted_at && (!x.ends_at || new Date(x.ends_at).getTime() > Date.now()));
  const intocable = u.yoMismo || !!u.staff;
  const stL = borrada ? E2("BORRADA", "DELETED") : u.estado === "ok" ? E2("ACTIVO", "ACTIVE") : EU[u.estado] ?? u.estado.toUpperCase();
  const lugar = [u.zona, u.ciudad].filter(Boolean).join(" · ") || E2("Sin ciudad", "No city");
  const rol = [E2("Cliente", "Customer"), ...(u.negocios.some((n) => n.kind === "owner") ? [E2("Dueño", "Owner")] : u.negocios.length ? [E2("Equipo de un negocio", "Business team")] : []), ...(u.staff ? [`${E2("Equipo de To’Latino", "To’Latino team")} · ${u.staff}`] : [])].join(" · ");
  const cab: Bloque[] = [{
    type: "hero", t: nombre, s: `${lugar} · ${u.lang === "en" ? "English" : E2("Español", "Spanish")}${u.negocios.some((n) => n.kind === "owner") ? E2(" · dueño", " · owner") : ""}`,
    ph: u.photo ? `url("${u.photo}")` : "", ini: u.photo ? "" : nombre.slice(0, 1), st: stL, stFg: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", stDot: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", acts: [],
    // 9n-9 · Las cifras del prototipo (PEDIDOS · CITAS · RANGO), derivadas; el Wallet del prototipo no existe (solo tarjeta).
    kn: 3, kpis: cif ? [{ v: String(cif.pedidos), k: E2("PEDIDOS", "ORDERS") }, { v: String(cif.citas), k: E2("CITAS", "BOOKINGS") }, { v: String(cif.rango), k: `${E2("RANGO", "RANK")} · ${(cif.rango_es ?? "Vecino").toUpperCase()}` }] : [],
  }];

  /* Avisos de arriba: prueba, borrada (con Restaurar), sanción vigente (con Levantar), pedido de borrado en la cola. */
  const avisos: ReactNode[] = [];
  if (u.is_test) avisos.push(<A.AdminNote key="t" tone="info" icon="users">{E2("Cuenta de prueba: no cuenta en los números.", "Test account: not counted in the numbers.")}</A.AdminNote>);
  if (borrada) {
    const gracia = u.status === "deleted_pending" && u.delete_at && new Date(u.delete_at).getTime() > Date.now();
    avisos.push(<A.AdminNote key="d" tone="bad" icon="trash" cta={gracia && P.admin ? E2("Restaurar", "Restore") : undefined}
      onCta={() => setConf({ titulo: E2(`Restaurar la cuenta de ${corto}`, `Restore ${corto}’s account`), sub: E2("Vuelve a como estaba y puede entrar otra vez.", "It goes back to how it was and they can sign in again."), nota: "interna", hacer: (m) => restaurarCuenta(u.id, m) })}>
      {gracia ? E2(`Borrada. Período de gracia hasta el ${fecha(u.delete_at)}: hasta entonces se puede restaurar. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada» (lo pide la ley) y los pagos con tarjeta quedan en Stripe.`, `Deleted. Grace period until ${fecha(u.delete_at)}: until then it can be restored. After that everything of theirs is deleted; their orders and charges remain as “Deleted account” (required by law) and card payments stay in Stripe.`) : u.status === "merged" ? E2("Fusionada con otra cuenta: ya no entra.", "Merged into another account: can no longer sign in.") : E2("Borrada.", "Deleted.")}</A.AdminNote>);
  } else if (u.estado !== "ok") {
    const v = vigentes[0], hasta = v?.ends_at ? E2(` hasta el ${fecha(v.ends_at)}`, ` until ${fecha(v.ends_at)}`) : "";
    const lo = u.estado === "susp" || u.estado === "ban" ? E2("Lo ve al intentar entrar.", "They see it when trying to sign in.") : E2("Lo ve en su cuenta.", "They see it in their account.");
    avisos.push(<A.AdminNote key="s" tone="bad" icon="warning" cta={P.retirar ? E2("Levantar", "Lift") : undefined}
      onCta={() => setConf({ titulo: E2("¿Por qué se levanta?", "Why is it being lifted?"), nota: "interna", hacer: (m) => levantar(u.id, m) })}>
      {`${stL.charAt(0)}${stL.slice(1).toLowerCase()}${hasta}${v ? `: ${v.reason}` : ""} · ${lo}`}</A.AdminNote>);
  }
  const pedido = u.cambiosSensibles.find((c) => c.status === "pending");
  if (pedido) avisos.push(<A.AdminNote key="p" tone="warn" icon="edit" cta={pedido.caso ? E2("Ver", "View") : undefined} onCta={() => router.push(`/admin/colas?caso=${pedido.caso}`)}>
    {E2(`Pedido de borrado en Cambios sensibles (#${pedido.id}): lo aplica otra persona del equipo.`, `Deletion request in Sensitive changes (#${pedido.id}): another team member applies it.`)}</A.AdminNote>);

  const alertas = u.compartidos.length + (u.phone_ok ? 0 : 1);
  const tabs: Bloque = { type: "tabs", items: ([["resumen", E2("Resumen", "Summary")], ["act", E2("Actividad", "Activity")], ...(din !== undefined ? [["din", E2("Dinero", "Money")] as [string, string]] : []), ["seguridad", E2("Seguridad", "Security"), alertas], ["confianza", E2("Confianza", "Trust"), vigentes.length], ["privacidad", E2("Privacidad", "Privacy")], ["comunidad", E2("Comunidad", "Community")], ...(sop ? [["soporte", E2("Soporte", "Support")] as [string, string]] : []), ...(cpa !== undefined ? [["compa", "El Compa"] as [string, string]] : [])] as [string, string, number?][])
    .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: tab === k, onClick: () => ir(k) })) };

  const historial = (): ReactNode => u.historial.length
    ? <A.AuditLog rows={u.historial.slice(0, 10).map((x) => ({ who: x.quien ?? E2("Equipo", "Team"), initials: (x.quien ?? "E").slice(0, 1), action: `${VB[x.action] ?? x.action} ${nombre}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: haceUsr(x.at, ahora, en) }))} />
    : <A.AdminNote tone="info" icon="folder">{E2("Nadie del equipo ha hecho cambios aquí todavía.", "No one on the team has made changes here yet.")}</A.AdminNote>;

  let cuerpo: ReactNode;
  if (tab === "seguridad") {
    const puedeS = (P.editar || P.retirar) && !borrada;
    const abiertas = u.dispositivos.reduce((a, d) => a + d.abiertas, 0);
    const cambiosCiudad = u.cambios.filter((c) => c.kind === "city"), cambiosTel = u.cambios.filter((c) => c.kind === "phone");
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: `${E2("DISPOSITIVOS Y SESIONES", "DEVICES AND SESSIONS")} · ${u.dispositivos.length}`, first: true, link: puedeS && abiertas ? E2("Cerrar todas", "Close all") : undefined,
          onLink: () => setConf({ titulo: E2(`Cerrar todas las sesiones de ${corto}`, `Close all of ${corto}’s sessions`), sub: E2("Tiene que entrar otra vez en cada dispositivo, con el código por SMS o con su llave de acceso.", "They have to sign in again on each device, with the SMS code or their passkey."), cta: E2("Cerrar todas", "Close all"), nota: "interna", hacer: (m) => cerrarSesiones(u.id, m) }) }]} />
        {u.dispositivos.length ? <PanelBloques bloques={[{ type: "rows", items: u.dispositivos.map((d, i) => {
          const bloq = d.dev_bloq || d.bloqueada;
          return {
            key: d.sid, icon: /iPhone|Android|iPad|Tableta/.test(d.nombre) ? "phone" : "grid", t: `${d.nombre}${d.nav ? ` · ${d.nav}` : ""} · ${d.app}`,
            s: `${E2("Primera vez", "First seen")} ${fecha(d.primera)} · ${d.abiertas ? `${E2("última", "last")} ${haceUsr(d.ultima, ahora, en)}` : `${E2("sesión cerrada · última", "session closed · last")} ${haceUsr(d.ultima, ahora, en)}`}${d.ip ? ` · ${d.ip}` : ""}`,
            tag: bloq ? E2("BLOQUEADO", "BLOCKED") : i === 0 && u.compartidos.length && d.device ? E2("COMPARTIDO", "SHARED") : d.abiertas ? E2("ABIERTA", "OPEN") : null, tone: bloq || (i === 0 && u.compartidos.length) ? "danger" : "signal",
            acts: puedeS ? [
              ...(d.abiertas && !bloq ? [{ l: E2("Cerrar sesión", "Close session"), icon: "lock", onClick: () => setConf({ titulo: E2(`Cerrar sesión en ${d.nombre}`, `Close session on ${d.nombre}`), plantillas: [E2("Lo pidió la persona", "The person asked for it"), E2("Posible acceso de otra persona", "Possible access by someone else"), E2("Teléfono perdido o robado", "Lost or stolen phone")], nota: "interna", hacer: (m) => dispositivoAccion(u.id, d.sid, "cerrar", m) }) }] : []),
              ...(P.retirar ? [bloq
                ? { l: E2("Desbloquear", "Unblock"), icon: "check", onClick: () => setConf({ titulo: `${E2("Desbloquear", "Unblock")} ${d.nombre}`, nota: "interna", hacer: (m) => dispositivoAccion(u.id, d.sid, "desbloquear", m) }) }
                : { l: E2("Bloquear", "Block"), icon: "ban", onClick: () => setConf({ titulo: `${E2("Bloquear", "Block")} ${d.nombre}`, sub: E2("Ninguna cuenta puede entrar desde este dispositivo.", "No account can sign in from this device."), peligro: true, plantillas: [E2("Teléfono perdido o robado", "Lost or stolen phone"), E2("Actividad sospechosa", "Suspicious activity"), E2("Cuentas vinculadas al mismo dispositivo", "Accounts linked to the same device")], nota: "interna", hacer: (m) => dispositivoAccion(u.id, d.sid, "bloquear", m) }) }] : []),
            ] : undefined,
          };
        }) }]} /> : <A.AdminNote tone="info" icon="phone">{E2("No ha entrado desde ningún dispositivo.", "Hasn’t signed in from any device.")}</A.AdminNote>}
        {/* 8c · Avisos push: los teléfonos y navegadores con avisos (enmascarados) y revocar uno con motivo. */}
        <PanelBloques bloques={[{ type: "group", k: `${E2("AVISOS PUSH", "PUSH NOTIFICATIONS")} · ${u.push.filter((x) => !x.revocado).length} ${E2("VIVO", "LIVE")}${u.push.filter((x) => !x.revocado).length === 1 || en ? "" : "S"}` }]} />
        {u.push.length ? <PanelBloques bloques={[{ type: "rows", items: u.push.map((x) => ({
          key: `push-${x.id}`, icon: x.platform === "web" ? "globe" : "phone", t: `${x.label} · ${PA[x.app] ?? x.app}`,
          s: `${PP[x.provider] ?? x.provider} · ${E2("huella", "fingerprint")} …${x.huella} · ${E2("desde", "since")} ${fecha(x.desde)} · ${E2("visto", "seen")} ${haceUsr(x.visto, ahora, en)}${x.ultimo ? ` · ${E2("último aviso", "last notification")} ${haceUsr(x.ultimo, ahora, en)}` : ""}${x.revocado ? ` · ${E2("revocado", "revoked")} ${fecha(x.revocado)} (${PM[x.motivo ?? ""] ?? x.motivo})` : ""}`,
          tag: x.revocado ? E2("REVOCADO", "REVOKED") : x.prueba ? E2("PRUEBA", "TEST") : E2("VIVO", "LIVE"), tone: x.revocado ? "neutral" : "signal", dim: !!x.revocado,
          acts: P.editar && !x.revocado ? [{ l: E2("Revocar", "Revoke"), icon: "ban", onClick: () => setConf({ titulo: E2(`Revocar los avisos de ${x.label}`, `Revoke notifications for ${x.label}`), sub: E2("Deja de recibir push en ese teléfono. Lo crítico le sigue llegando por SMS; puede volver a encenderlos ella con su sesión.", "That phone stops getting push notifications. Critical ones still arrive by SMS; they can turn them back on from their session."), peligro: true,
            plantillas: [E2("Teléfono perdido o robado", "Lost or stolen phone"), E2("Lo pidió la persona", "The person asked for it"), E2("Avisos a un teléfono que no es suyo", "Notifications to a phone that isn’t theirs")], nota: "interna", hacer: (m) => pushRevocar(u.id, x.id, m) }) }] : undefined,
        })) }]} /> : <A.AdminNote tone="info" icon="bell">{E2("No tiene avisos push en ningún teléfono: le llegan en la campana y por SMS cuando aplica.", "No push notifications on any phone: they arrive in the bell and by SMS when it applies.")}</A.AdminNote>}
        {/* 8d · Llaves de acceso (Face ID / huella): el dispositivo, cuándo se agregó, la última vez y cuántas entradas; revocar con motivo (aviso a la persona). */}
        <PanelBloques bloques={[{ type: "group", k: `${E2("LLAVES DE ACCESO", "PASSKEYS")} · ${u.llaves.filter((x) => !x.revocada).length} ${en ? "LIVE" : u.llaves.filter((x) => !x.revocada).length === 1 ? "VIVA" : "VIVAS"}` }]} />
        {u.llaves.length ? <PanelBloques bloques={[{ type: "rows", items: u.llaves.map((k) => ({
          key: `llave-${k.id}`, icon: "key", t: `${k.nombre} · ${PA[k.app] ?? k.app}${k.plat === "web" ? "" : ` (${k.plat === "ios" ? "iOS" : "Android"})`}`,
          s: `${E2("Agregada", "Added")} ${fecha(k.creada)} · ${k.usada ? E2(`última vez ${fecha(k.usada)} · ${k.usos} ${k.usos === 1 ? "entrada" : "entradas"}`, `last used ${fecha(k.usada)} · ${k.usos} ${k.usos === 1 ? "sign-in" : "sign-ins"}`) : E2("sin usar todavía", "not used yet")}${k.conf ? E2(` · ${k.conf} ${k.conf === 1 ? "confirmación" : "confirmaciones"} (archivo o borrado)`, ` · ${k.conf} ${k.conf === 1 ? "confirmation" : "confirmations"} (data file or deletion)`) : ""}${k.sync ? E2(" · sincronizada", " · synced") : ""}${k.revocada ? ` · ${LP[k.por ?? ""] ?? k.por} ${fecha(k.revocada)}${k.motivo ? ` (${k.motivo})` : ""}` : ""}`,
          tag: k.revocada ? E2("QUITADA", "REMOVED") : E2("VIVA", "LIVE"), tone: k.revocada ? "neutral" : "signal", dim: !!k.revocada,
          acts: P.editar && !k.revocada && !borrada ? [{ l: E2("Revocar", "Revoke"), icon: "ban", onClick: () => setConf({ titulo: E2(`Revocar la llave de ${k.nombre}`, `Revoke the passkey on ${k.nombre}`), sub: E2("Ya no entra con esa llave (Face ID o huella). Sigue entrando con el código por SMS y puede agregar otra. Le avisamos por SMS y en la app.", "They can no longer sign in with that passkey (Face ID or fingerprint). They can still sign in with the SMS code and add another one. We notify them by SMS and in the app."), peligro: true,
            plantillas: [E2("Teléfono perdido o robado", "Lost or stolen phone"), E2("Lo pidió la persona", "The person asked for it"), E2("Posible acceso de otra persona", "Possible access by someone else")], nota: "interna", hacer: (m) => llaveRevocar(u.id, k.id, m) }) }] : undefined,
        })) }]} /> : <A.AdminNote tone="info" icon="key">{E2("No tiene llaves de acceso: entra con el código por SMS.", "No passkeys: they sign in with the SMS code.")}</A.AdminNote>}
        {u.compartidos.length ? <>
          <A.AdminNote tone="warn" icon="warning">{E2("Otras cuentas que entraron desde el mismo dispositivo:", "Other accounts that signed in from the same device:")}</A.AdminNote>
          <A.AdminList rows={u.compartidos.map((x) => ({ initials: (x.nombre ?? "?").slice(0, 1), title: x.nombre ?? E2("(sin nombre todavía)", "(no name yet)"), sub: x.phone, tag: x.estado !== "ok" ? EU[x.estado] : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("VERIFICACIÓN", "VERIFICATION") }, { type: "rows", items: [
          { icon: "phone", t: `${E2("Teléfono", "Phone")} · ${u.phone_b}`, s: u.phone_ok ? `${E2("Verificado por SMS", "Verified by SMS")} · ${fecha(u.phone_ok)}` : E2("Restablecida: al entrar le pedimos el código otra vez", "Reset: we ask for the code again at sign-in"), tag: u.phone_ok ? E2("VERIFICADO", "VERIFIED") : E2("PENDIENTE", "PENDING"), tone: u.phone_ok ? "signal" : "action" },
          ...(u.email ? [{ icon: "news", t: `${E2("Correo", "Email")} · ${u.email}`, s: u.email_ok ? E2("Verificado", "Verified") : E2("Sin verificar", "Not verified"), tag: u.email_ok ? E2("VERIFICADO", "VERIFIED") : null, tone: "signal" }] : []),
          ...cambiosTel.map((c) => ({ icon: "edit", t: `${E2("Cambió de teléfono", "Changed phone")}: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E2("Lo cambió el equipo", "Changed by the team") : E2("Lo cambió la persona", "Changed by the person")} · ${fecha(c.at)}` })),
          // Mi cuenta (2h): correo, y borrar la cuenta (30 días) o cancelarlo.
          ...u.cambios.filter((c) => c.kind === "email").map((c) => ({ icon: "news", t: `${E2("Cambió el correo", "Changed email")}: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E2("Lo cambió el equipo", "Changed by the team") : E2("Lo cambió la persona", "Changed by the person")} · ${fecha(c.at)}` })),
          ...u.cambios.filter((c) => c.kind === "passkey").map((c) => ({ icon: "key", t: c.de ? `${E2("Llave de acceso de", "Passkey on")} ${c.de}: ${c.a ?? "—"}` : `${E2("Llave de acceso", "Passkey")}: ${c.a ?? "—"}`, s: `${c.by === "staff" ? E2("Lo hizo el equipo", "Done by the team") : c.by === "sistema" ? E2("Lo hizo el sistema", "Done by the system") : E2("Lo hizo la persona", "Done by the person")} · ${fecha(c.at)}` })),
          ...u.cambios.filter((c) => c.kind === "delete" || c.kind === "undelete").map((c) => ({ icon: "trash", t: c.kind === "delete" ? `${E2("Pidió borrar su cuenta", "Asked to delete their account")}${c.a ? ` · ${E2("motivo", "reason")}: ${(({ uso: E2("ya no la usa", "no longer uses it"), avisos: E2("muchos avisos", "too many notifications"), priv: E2("privacidad", "privacy"), ciudad: E2("se mudó", "moved"), otra: E2("otra razón", "other reason") }) as Record<string, string>)[c.a] ?? c.a}` : ""}` : E2("Canceló el borrado de su cuenta", "Cancelled their account deletion"), s: `${E2("Lo hizo la persona", "Done by the person")} · ${fecha(c.at)}` })),
        ] }]} />
        {P.editar && !borrada && u.phone_ok ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Restablecer verificación", "Reset verification"), icon: "lock", off: pend, onClick: () => setConf({ titulo: E2(`Restablecer verificación de ${corto}`, `Reset ${corto}’s verification`), sub: E2("Se cierran sus sesiones, se quitan sus llaves de acceso y al entrar le pedimos el código por SMS otra vez. Úsalo si cree que alguien entró a su cuenta.", "Their sessions close, their passkeys are removed and we ask for the SMS code again at sign-in. Use it if they think someone got into their account."), nota: "interna", hacer: (m) => restablecerVerificacion(u.id, m) }) }] }]} /> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("CIUDAD", "CITY") }, { type: "kv", cols: desk ? 3 : 1, items: [{ k: E2("AHORA", "NOW"), v: u.ciudad ?? E2("Sin ciudad", "No city") }, { k: E2("ÚLTIMO CAMBIO", "LAST CHANGE"), v: u.city_changed ? fecha(u.city_changed) : E2("Nunca", "Never") }, { k: E2("REGLA", "RULE"), v: E2("El vecino la cambia 1 vez cada 30 días", "Neighbors can change it once every 30 days") }] }]} />
        {cambiosCiudad.length ? <PanelBloques bloques={[{ type: "rows", items: cambiosCiudad.map((c) => ({ icon: "globe", t: `${c.de ?? E2("Sin ciudad", "No city")} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? E2("La cambió el equipo", "Changed by the team") : E2("La cambió el vecino", "Changed by the neighbor")} · ${fecha(c.at)}` })) }]} /> : null}
        {P.editar && !borrada ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Cambiar ciudad", "Change city"), icon: "globe", off: pend, onClick: () => setConf({
          titulo: E2(`Cambiar la ciudad de ${corto}`, `Change ${corto}’s city`), sub: E2("Se salta la regla de 30 días. Si la ciudad aún no abre, queda en su lista de espera.", "It skips the 30-day rule. If the city isn’t open yet, they go on its waitlist."),
          elegir: { label: E2("CIUDAD NUEVA", "NEW CITY"), items: u.ciudades.filter((c) => c.id !== u.city_id).map((c) => ({ k: c.id, l: `${c.name}${c.status !== "on" ? E2(" · lista de espera", " · waitlist") : ""}` })) },
          nota: "interna", hacer: (m, e) => cambiarCiudadUsuario(u.id, e ?? "", m) }) }] }]} /> : null}
      </>);
  } else if (tab === "confianza") {
    const REP: Record<string, string> = { no_es: E2("No es de este negocio", "Not from this business"), inapropiado: E2("Contenido inapropiado", "Inappropriate content"), datos: E2("Muestra datos personales", "Shows personal data"), spam: E2("Es publicidad o spam", "Ad or spam"), otro: E2("Otro motivo", "Other reason") };
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: E2("ESTADO", "STATUS"), v: u.estado === "ok" ? E2("Sin sanción", "No sanction") : `${stL.charAt(0)}${stL.slice(1).toLowerCase()}`, fg: u.estado === "ok" ? undefined : BAD },
          { k: E2("SANCIONES", "SANCTIONS"), v: String(u.sanciones.length) },
          { k: E2("REPORTES HECHOS", "REPORTS MADE"), v: String(u.reportes.length) },
        ] }, { type: "group", k: E2("SANCIONES", "SANCTIONS") }]} />
        {u.sanciones.length ? <PanelBloques bloques={[{ type: "rows", items: u.sanciones.flatMap((x) => {
          const k = SANCIONES[x.kind as Sancion], vence = x.ends_at && new Date(x.ends_at).getTime() <= Date.now();
          const fila = { icon: "warning", t: `${k ? bi(k) : x.kind} · ${x.reason}`, s: `${x.quien ?? E2("Equipo", "Team")} · ${fecha(x.starts_at)}${x.ends_at ? ` · ${E2("hasta el", "until")} ${fecha(x.ends_at)}` : ""}`, tag: x.lifted_at ? E2("LEVANTADA", "LIFTED") : vence ? E2("TERMINÓ", "ENDED") : E2("VIGENTE", "ACTIVE"), tone: x.lifted_at || vence ? "neutral" : "danger" };
          return x.lifted_at ? [{ icon: "check", t: x.lift_reason ? `${E2("Levantada", "Lifted")} · ${x.lift_reason}` : E2("Levantada", "Lifted"), s: `${x.quien_levanto ?? E2("Equipo", "Team")} · ${fecha(x.lifted_at)}` }, fila] : [fila];
        }) }]} /> : <A.AdminNote tone="ok" icon="check">{E2("Nunca ha tenido una sanción.", "Has never had a sanction.")}</A.AdminNote>}
        <PanelBloques bloques={[{ type: "group", k: `${E2("REPORTES QUE HIZO", "REPORTS THEY MADE")} · ${u.reportes.length}` }]} />
        {u.reportes.length ? <PanelBloques bloques={[{ type: "rows", items: u.reportes.map((r) => ({ icon: "image", t: `${E2("Foto de", "Photo of")} ${r.negocio} · ${REP[r.reason] ?? r.reason}`, s: fecha(r.at), tag: r.status === "open" ? E2("ABIERTO", "OPEN") : E2("RESUELTO", "RESOLVED"), tone: r.status === "open" ? "action" : "neutral", chev: true, onClick: () => router.push(`/admin/negocios/${r.bid}`) })) }]} />
          : <A.AdminNote tone="info" icon="bubble">{E2("Ninguno.", "None.")}</A.AdminNote>}
      </>);
  } else if (tab === "comunidad" && com) {
    // 5i · Usuarios 360° › Comunidad (MEM 696–699): arriba rango, puntos, monedas, votos recibidos y la red; debajo las sub-pestañas
    // Publicaciones · Comentarios · Seguidores y siguiendo · Puntos y monedas · Cupones y referidos (sin El Patio, decisión G).
    const lista = (k: string, L: Comunidad360["listas"]["seg"], vacio: string) => <>
      <PanelBloques bloques={[{ type: "group", k: `${k} · ${L.length}` }]} />
      {L.length ? <A.AdminList rows={L.map((x) => ({ icon: "users", title: x.nombre, sub: `${x.rango} · ${x.ciudad ?? E2("Sin ciudad", "No city")} · ${fecha(x.at)}`, tag: x.mismo ? E2("MISMO DISPOSITIVO", "SAME DEVICE") : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}?tab=comunidad&sub=seg`) }))} />
        : <A.AdminNote tone="info" icon="users">{vacio}</A.AdminNote>}
    </>;
    const EST_C: Record<string, string> = { visible: E2("SE VE", "VISIBLE"), hidden: E2("OCULTO", "HIDDEN"), deleted: E2("BORRADO POR SU AUTOR", "DELETED BY ITS AUTHOR") };
    const TIPO_C: Record<string, string> = { pregunta: E2("Pregunta", "Question"), recomendacion: E2("Recomendación", "Recommendation"), encuesta: E2("Encuesta", "Poll"), publicacion: E2("Publicación", "Post") };
    const EST_K: Record<string, string> = { issued: E2("CÓDIGO VIVO", "LIVE CODE"), used: E2("USADO", "USED"), expired: E2("VENCIDO · MONEDAS DEVUELTAS", "EXPIRED · COINS RETURNED") };
    const subTabs: Bloque = { type: "tabs", items: ([["pub", E2("Publicaciones", "Posts"), com.pubs.length], ["cm", E2("Comentarios", "Comments"), com.cms.length], ["seg", E2("Seguidores y siguiendo", "Followers and following")], ["pym", E2("Puntos y monedas", "Points and coins")], ["cup", E2("Cupones y referidos", "Coupons and referrals")]] as [string, string, number?][])
      .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: sub === k, onClick: () => router.push(`/admin/usuarios/${u.id}?tab=comunidad&sub=${k}`, { scroll: false }) })) };
    let parte: ReactNode = null;
    if (sub === "pub") parte = com.pubs.length ? <PanelBloques bloques={[{ type: "rows", items: com.pubs.map((x) => ({ key: x.id, icon: "bubble", t: x.body,
      s: `${TIPO_C[x.kind] ?? E2("Publicación", "Post")} · ${x.ciudad} · +${x.up} / −${x.dn} · ${x.cms} ${E2("comentarios", "comments")} · ${fecha(x.at)}${x.rep ? ` · ${x.rep} ${E2("reportes", "reports")}` : ""}${x.why ? ` · ${x.why}` : ""}`,
      tag: EST_C[x.status] ?? x.status, tone: x.status === "hidden" ? "danger" : "neutral", chev: x.status !== "deleted", onClick: x.status !== "deleted" ? () => router.push(`/admin/contenido/hilo/${x.id}`) : undefined })) },
      { type: "acts", items: [{ l: E2("Ver todo en Contenido", "See all in Content"), v: "secondary", icon: "search", onClick: () => router.push(`/admin/contenido?autor=${u.id}`) }] }]} />
      : <PanelBloques bloques={[{ type: "empty", icon: "bubble", t: E2("Sin publicaciones", "No posts"), s: E2("Todavía no ha publicado en la Comunidad.", "Hasn’t posted in the Community yet.") }]} />;
    else if (sub === "cm") parte = com.cms.length ? <PanelBloques bloques={[{ type: "rows", items: com.cms.map((x) => ({ key: x.id, icon: "chat", t: x.body,
      s: `+${x.up} / −${x.dn} · ${fecha(x.at)}${x.rep ? ` · ${x.rep} ${E2("reportes", "reports")}` : ""}${x.why ? ` · ${x.why}` : ""}`, tag: EST_C[x.status] ?? x.status, tone: x.status === "hidden" ? "danger" : "neutral",
      chev: true, onClick: () => router.push(`/admin/contenido/hilo/${x.post}?c=${x.id}`) })) }]} />
      : <PanelBloques bloques={[{ type: "empty", icon: "chat", t: E2("Sin comentarios", "No comments"), s: E2("Todavía no ha comentado en la Comunidad.", "Hasn’t commented in the Community yet.") }]} />;
    else if (sub === "seg") parte = <>
        {lista(E2("SEGUIDORES", "FOLLOWERS"), com.listas.seg, E2("Nadie la sigue todavía.", "No one follows them yet."))}
        {lista(E2("SIGUIENDO", "FOLLOWING"), com.listas.sig, E2("No sigue a nadie.", "Doesn’t follow anyone."))}
        {lista(E2("BLOQUEADOS", "BLOCKED"), com.listas.blk, E2("No ha bloqueado a nadie.", "Hasn’t blocked anyone."))}
        {com.listas.blk.length ? <A.AdminNote tone="info" icon="lock">{E2("El bloqueo es mutuo e invisible para la persona bloqueada.", "Blocking is mutual and invisible to the blocked person.")}</A.AdminNote> : null}
        {lista(E2("SILENCIADOS", "MUTED"), com.listas.mut, E2("No ha silenciado a nadie.", "Hasn’t muted anyone."))}
        <A.AdminNote tone="info" icon="info">{E2("Seguir o tener seguidores no da puntos ni rango. Los mensajes privados solo se leen con un reporte abierto, en Colas › Mensajes reportados.", "Following or having followers gives no points or rank. Private messages are only read with an open report, in Queues › Reported messages.")}</A.AdminNote>
      </>;
    else if (sub === "pym") parte = <>
        {pts && <>
          <PanelBloques bloques={[{ type: "group", k: E2("PUNTOS Y RANGO", "POINTS AND RANK") },
            { type: "kv", cols: desk ? 3 : 2, items: [
              { k: E2("RANGO ACTUAL", "CURRENT RANK"), v: `${pts.n} · ${bi(pts.name)}` }, { k: E2("PUNTOS", "POINTS"), v: E2(`${pts.total.toLocaleString("en-US")} · ${pts.mes} este mes · ${pts.hoy} hoy`, `${pts.total.toLocaleString("en-US")} · ${pts.mes} this month · ${pts.hoy} today`) },
              pts.sig && pts.req ? { k: `${E2("PARA SUBIR A", "TO REACH")} ${bi(pts.sig).toUpperCase()}`, v: bi(pts.req) } : { k: E2("SIGUIENTE", "NEXT"), v: E2("Ya está en el rango más alto", "Already at the highest rank") },
              { k: E2("REGLA", "RULE"), v: E2(`Máximo ${pts.tope} puntos al día`, `Up to ${pts.tope} points a day`) }, { k: E2("PISO DEL RANGO", "RANK FLOOR"), v: `${pts.piso} · ${E2("el rango no baja solo", "rank doesn’t drop on its own")}` }] },
            ...(P.editar && !intocable && !borrada ? [{ type: "acts" as const, items: [
              { l: E2("Ajustar puntos", "Adjust points"), v: "secondary", icon: "star", onClick: () => setConf({ titulo: `${E2("Puntos", "Points")} · ${corto}`, sub: E2(`Ahora: ${pts.total.toLocaleString("en-US")}. Tu rol ajusta hasta ${topeAjuste.toLocaleString("en-US")} de una vez. La persona ve el ajuste y el motivo. Queda en la auditoría.`, `Now: ${pts.total.toLocaleString("en-US")}. Your role adjusts up to ${topeAjuste.toLocaleString("en-US")} at once. The person sees the adjustment and the reason. It stays in the audit log.`),
                elegir: { label: E2("TIPO", "TYPE"), items: [{ k: "c", l: E2("Sumar", "Add") }, { k: "d", l: E2("Restar", "Subtract") }] }, valor: { k: E2("CANTIDAD", "AMOUNT"), ini: "", max: 4 }, cta: E2("Aplicar", "Apply"),
                plantillas: [E2("Puntos de un voto de cuentas del mismo dispositivo", "Points from a vote by accounts on the same device"), E2("Error del sistema", "System error"), E2("Devolver lo que se restó por error", "Return what was subtracted by mistake")], nota: "persona", hacer: (m, e, v) => usrAjustarPuntos(u.id, e, v, m) }) },
              ...(P.admin ? [{ l: E2("Cambiar rango", "Change rank"), v: "secondary", icon: "shield", onClick: () => setConf({ titulo: `${E2("Rango", "Rank")} · ${corto}`, sub: E2("Coronel (9) lo da el equipo a quien modera con buen criterio. Bajarlo solo por fraude. General del Barrio sale del cierre de la Tabla. La persona ve el motivo.", "The team gives Coronel (9) to those who moderate with good judgment. Lower it only for fraud. General del Barrio comes from the Leaderboard close. The person sees the reason."),
                elegir: { label: E2("RANGO", "RANK"), items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ k: String(n), l: String(n) })) }, cta: E2("Cambiar", "Change"), peligro: true,
                plantillas: [E2("Invitación a moderar su ciudad (Coronel)", "Invitation to moderate their city (Coronel)"), E2("Fraude: votos desde cuentas del mismo dispositivo", "Fraud: votes from accounts on the same device")], nota: "persona", hacer: (m, e) => usrPisoRango(u.id, e, m) }) }] : []),
            ] }] : []),
            { type: "group", k: E2("PUNTOS · MOVIMIENTOS", "POINTS · ACTIVITY") },
            pts.log.length ? { type: "rows", items: pts.log.map((x) => ({ key: x.id, icon: "star", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? BAD : undefined,
              t: x.motive === "ajuste" ? `${E2("Ajuste del equipo", "Team adjustment")}: ${x.reason ?? ""}` : `${x.motive === "reverso" ? E2("Se restó · ", "Subtracted · ") : x.motive === "restaurado" ? E2("Volvió · ", "Returned · ") : ""}${x.label ? bi(x.label) : x.rule}${x.reason === "oculto" ? E2(" (oculto por las reglas)", " (hidden by the rules)") : x.reason === "borrado" ? E2(" (borrado)", " (deleted)") : ""}`,
              s: `${x.quien ? `${E2("Equipo", "Team")} · ${x.quien} · ` : ""}${fecha(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}` })) } : { type: "empty", icon: "star", t: E2("Sin movimientos", "No activity"), s: E2("Todavía no ha sumado puntos.", "Hasn’t earned points yet.") },
          ]} />
        </>}
        {mon && <>
          <PanelBloques bloques={[{ type: "group", k: E2("MONEDAS · SIN VALOR EN DINERO", "COINS · NO CASH VALUE") },
            { type: "kv", cols: desk ? 3 : 2, items: [{ k: E2("SALDO", "BALANCE"), v: `${mon.saldo.toLocaleString("en-US")} ${E2("monedas", "coins")}` }, { k: E2("CÓDIGOS VIVOS", "LIVE CODES"), v: String(mon.codigos) }, { k: E2("VALOR", "VALUE"), v: E2("Sin valor en dinero · no se compran ni se cambian", "No cash value · can’t be bought or exchanged") }] },
            ...(P.editar && !intocable && !borrada ? [{ type: "acts" as const, items: [
              { l: E2("Ajustar monedas", "Adjust coins"), v: "secondary", icon: "ticket", onClick: () => setConf({ titulo: `${E2("Monedas", "Coins")} · ${corto}`, sub: E2(`Ahora: ${mon.saldo.toLocaleString("en-US")}. Tu rol ajusta hasta ${topeMonedas.toLocaleString("en-US")} de una vez; nunca por debajo de 0. La persona ve el ajuste y el motivo. Queda en la auditoría.`, `Now: ${mon.saldo.toLocaleString("en-US")}. Your role adjusts up to ${topeMonedas.toLocaleString("en-US")} at once; never below 0. The person sees the adjustment and the reason. It stays in the audit log.`),
                elegir: { label: E2("TIPO", "TYPE"), items: [{ k: "c", l: E2("Sumar", "Add") }, { k: "d", l: E2("Restar", "Subtract") }] }, valor: { k: E2("CANTIDAD", "AMOUNT"), ini: "", max: 4 }, cta: E2("Aplicar", "Apply"),
                plantillas: [E2("Error del sistema", "System error"), E2("Devolver un canje que el negocio no respetó", "Return a redemption the business didn’t honor"), E2("Monedas por una cuenta duplicada", "Coins from a duplicate account")], nota: "persona", hacer: (m, e, v) => usrAjustarMonedas(u.id, e, v, m) }) },
            ] }] : []),
            { type: "group", k: E2("MONEDAS · MOVIMIENTOS", "COINS · ACTIVITY") },
            mon.log.length ? { type: "rows", items: mon.log.map((x) => ({ key: x.id, icon: "ticket", ibg: x.delta < 0 ? "rgba(192,57,43,.1)" : undefined, ifg: x.delta < 0 ? BAD : undefined,
              t: x.motivo === "ajuste" ? `${E2("Ajuste del equipo", "Team adjustment")}: ${x.reason ?? ""}` : (({ welcome: E2("Bienvenida", "Welcome"), premio_mes: E2("Premio de la Tabla del Barrio", "Neighborhood Leaderboard prize"), canje: E2("Canjeó un cupón", "Redeemed a coupon"), devolucion: E2("Código vencido: monedas devueltas", "Expired code: coins returned") }) as Record<string, string>)[x.motivo] ?? E2("Monedas", "Coins"),
              s: `${x.quien ? `${E2("Equipo", "Team")} · ${x.quien} · ` : ""}${fecha(x.at)}`, r: x.delta > 0 ? `+${x.delta}` : `−${-x.delta}` })) } : { type: "empty", icon: "ticket", t: E2("Sin movimientos", "No activity"), s: E2("Todavía no tiene monedas.", "Has no coins yet.") },
          ]} />
        </>}
      </>;
    else if (sub === "cup") parte = <PanelBloques bloques={[
      { type: "group", k: `${E2("CUPONES CANJEADOS", "REDEEMED COUPONS")} · ${com.cupones.length}` },
      com.cupones.length ? { type: "rows", items: com.cupones.map((x) => ({ key: x.id, icon: "ticket", t: `${x.titulo} · ${x.negocio}`, s: `${x.costo} ${E2("monedas", "coins")} · ${x.codigo} · ${fecha(x.at)}`, tag: EST_K[x.status] ?? x.status, tone: x.status === "used" ? "signal" : "neutral" })) }
        : { type: "empty", icon: "ticket", t: E2("Sin cupones", "No coupons"), s: E2("Todavía no ha canjeado monedas por un cupón.", "Hasn’t redeemed coins for a coupon yet.") },
      { type: "group", k: E2("REFERIDOS · SIN DINERO, SOLO CUENTAN PARA CAPITÁN", "REFERRALS · NO MONEY, THEY ONLY COUNT TOWARD CAPITÁN") },
      { type: "kv", cols: desk ? 3 : 2, items: [{ k: E2("SU CÓDIGO", "THEIR CODE"), v: com.referidos.codigo ?? E2("Todavía no tiene", "None yet") }, { k: E2("INVITADOS", "INVITED"), v: String(com.referidos.invitados) }, { k: E2("PARTICIPAN", "TAKING PART"), v: String(com.referidos.activos) },
        { k: E2("LLEGÓ INVITADA POR", "INVITED BY"), v: com.referidos.vino ?? E2("Nadie", "No one") }] },
      ...(com.referidos.lista.length ? [{ type: "rows" as const, items: com.referidos.lista.map((x, i) => ({ key: String(i), icon: "users", t: x.nombre, s: fecha(x.at), tag: x.estado === "active" ? E2("PARTICIPA", "TAKING PART") : E2("SE UNIÓ", "JOINED"), tone: x.estado === "active" ? "signal" : "neutral" })) }] : []),
    ]} />;
    cuerpo = (
      <>
        <PanelBloques bloques={[
          { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
            { k: E2("RANGO", "RANK"), v: String(com.rango), s: pts ? bi(pts.name) : undefined }, { k: E2("PUNTOS", "POINTS"), v: pts ? pts.total.toLocaleString("en-US") : "—", s: pts ? E2(`${pts.mes} este mes`, `${pts.mes} this month`) : undefined },
            { k: E2("MONEDAS", "COINS"), v: mon ? mon.saldo.toLocaleString("en-US") : "—", s: E2("sin valor en dinero", "no cash value") }, { k: E2("VOTOS RECIBIDOS", "VOTES RECEIVED"), v: `+${com.votos.up}`, s: `−${com.votos.dn} · ${com.mejores} ${E2("mejores respuestas", "best answers")}` }] },
          { type: "kv", cols: desk ? 3 : 2, items: [
            { k: E2("PUBLICACIONES", "POSTS"), v: `${com.publicaciones} · ${com.comentarios} ${E2("comentarios", "comments")}` }, { k: E2("SEGUIDORES", "FOLLOWERS"), v: String(com.seguidores) }, { k: E2("SIGUIENDO", "FOLLOWING"), v: String(com.siguiendo) },
            { k: E2("BLOQUEÓ", "BLOCKED"), v: String(com.bloqueo) }, { k: E2("SILENCIÓ", "MUTED"), v: String(com.silencio) },
            { k: E2("CONVERSACIONES PRIVADAS", "PRIVATE CONVERSATIONS"), v: `${com.conversaciones} · ${E2("el equipo no las lee salvo reporte", "the team doesn’t read them unless reported")}` }, { k: E2("CUENTAS", "ACCOUNTS"), v: com.ocultaCuentas ? E2("Ocultas al público", "Hidden from the public") : E2("Visibles", "Visible") },
            { k: E2("18 AÑOS O MÁS", "18 OR OLDER"), v: com.declaracion ? `${com.declaracion.adulto ? E2("Declaró que sí", "Declared yes") : E2("Declaró que no: no entra a la Comunidad", "Declared no: can’t enter the Community")} · ${fecha(com.declaracion.at)}` : E2("Sin declarar", "Not declared"), fg: com.declaracion?.adulto === false ? WARN : undefined },
            { k: E2("BIENVENIDA", "WELCOME"), v: com.bienvenida ? fecha(com.bienvenida) : E2("No la ha hecho", "Not done yet") },
          ] },
        ]} />
        {com.ocultas ? <A.AdminNote tone="warn" icon="warning" cta={E2("Ver", "View")} onCta={() => router.push(`/admin/contenido?autor=${u.id}&est=hid`)}>{E2(`${com.ocultas} de sus publicaciones o comentarios están ocultos por las reglas.`, `${com.ocultas} of their posts or comments are hidden by the rules.`)}</A.AdminNote> : null}
        {com.red ? <A.AdminNote tone="bad" icon="warning" cta={P.editar && !intocable && !borrada ? E2("Abrir caso de red de cuentas", "Open account-network case") : undefined}
          onCta={() => setConf({ titulo: `${E2("Caso de red de cuentas", "Account-network case")} · ${corto}`, sub: E2("Va a Colas › Reportes de usuario con la marca «posible red». Lo decide una persona, con la escalera de sanciones y la apelación. Queda en la auditoría.", "It goes to Queues › User reports flagged “possible network”. A person decides, with the sanction ladder and the appeal. It stays in the audit log."), cta: E2("Abrir caso", "Open case"),
            plantillas: [E2("Seguidores desde el mismo dispositivo", "Followers from the same device"), E2("Votos entre cuentas del mismo dispositivo", "Votes between accounts on the same device"), E2("Lo reportaron vecinos", "Reported by neighbors")], nota: "interna", hacer: (m) => usrCasoRed(u.id, m) })}>
          {E2(`${com.red} ${com.red === 1 ? "seguidor entró" : "seguidores entraron"} desde el mismo dispositivo que esta cuenta: posible red de cuentas.`, `${com.red} ${com.red === 1 ? "follower" : "followers"} signed in from the same device as this account: possible account network.`)}</A.AdminNote> : null}
        <PanelBloques bloques={[subTabs]} />
        {parte}
      </>);
  } else if (tab === "act" && act) {
    // 6j · Actividad (prototipo usrDetail «act»): cuántas operaciones en 90 días y BOLETOS DE EVENTOS (estado, transferencias, devoluciones,
    // entradas) y RSVP. Cada boleto abre Buscar boleto; el evento, su ficha. Nunca el teléfono de otra persona.
    const ST: Record<string, [string, string]> = { valid: [E2("VÁLIDO", "VALID"), "signal"], used: [E2("USADO", "USED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "neutral"], void: [E2("ANULADO", "VOID"), "danger"], replaced: [E2("TRANSFERIDO", "TRANSFERRED"), "neutral"] };
    const RV: Record<string, string> = { going: E2("VA", "GOING"), cancelled: E2("YA NO VA", "NOT GOING"), expired: E2("VENCIÓ", "EXPIRED"), attended: E2("LLEGÓ", "ATTENDED") };
    const k = act.kpi, usd = (c: number) => `$${(c / 100).toFixed(2)}`;
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [{ k: E2("PEDIDOS · 90 D", "ORDERS · 90 D"), v: String(k.pedidos) }, { k: E2("CITAS · 90 D", "BOOKINGS · 90 D"), v: String(k.citas) }, { k: E2("RESERVACIONES · 90 D", "RESERVATIONS · 90 D"), v: String(k.reservas), s: k.privados ? E2(`${k.privados} eventos privados`, `${k.privados} private events`) : undefined },
        { k: E2("BOLETOS", "TICKETS"), v: String(k.boletos), s: `${k.rsvp} RSVP · ${E2("devuelto", "refunded")} ${usd(act.devuelto.devuelto)}` }] },
      act.boletos.length ? { type: "rows", k: `${E2("BOLETOS DE EVENTOS", "EVENT TICKETS")} · ${act.boletos.length}`, items: act.boletos.map((b) => ({ key: b.code, icon: "ticket", t: `${bi(b.evento)} · ${diaCorto(b.dia, !en)}`,
        s: [b.code, b.tipo ? bi(b.tipo) : undefined, b.kind === "comp" ? E2("cortesía", "comp") : b.precio ? usd(b.precio) : null, b.num, b.de ? E2("lo recibió por transferencia", "received by transfer") : null, b.a ? (b.a === "transfiriendo" ? E2("transfiriendo", "transferring") : E2("lo pasó a otra persona", "passed it to someone else")) : null, b.entro ? `${E2("entró", "got in")} ${b.entro}` : null].filter(Boolean).join(" · "),
        tag: ST[b.st]?.[0] ?? b.st, tone: ST[b.st]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/eventos/boleto/${b.code}`) })) } as Bloque
        : { type: "note", tone: "info", icon: "ticket", t: E2("Sin boletos.", "No tickets.") } as Bloque,
      act.rsvp.length ? { type: "rows", k: `RSVP · ${act.rsvp.length}`, items: act.rsvp.map((r, i) => ({ key: `r${i}`, icon: "users", t: `${bi(r.evento)} · ${diaCorto(r.dia, !en)}`, s: E2(`${r.party} ${r.party === 1 ? "persona" : "personas"}${r.llegaron ? ` · llegaron ${r.llegaron}` : ""}`, `${r.party} ${r.party === 1 ? "person" : "people"}${r.llegaron ? ` · ${r.llegaron} arrived` : ""}`),
        tag: RV[r.st] ?? r.st, tone: r.st === "going" ? "signal" : "neutral", chev: true, onClick: () => router.push(`/admin/eventos/${r.eid}`) })) } as Bloque
        : { type: "note", tone: "info", icon: "users", t: E2("Sin RSVP.", "No RSVPs.") } as Bloque,
    ]} />;
  } else if (tab === "din" && din) {
    // 9n-9 · Dinero (prototipo usrDetail «din», solo tx:ver): cobrado 90 d, retenido ahora y devuelto; sus tarjetas (últimos 4) y sus últimos cobros.
    const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
    const PST: Record<string, [string, string]> = { held: [E2("RETENIDO", "HELD"), "action"], captured: [E2("COBRADO", "CHARGED"), "neutral"], released: [E2("LIBERADO", "RELEASED"), "neutral"], refunded: [E2("DEVUELTO", "REFUNDED"), "neutral"], partially_refunded: [E2("DEVUELTO EN PARTE", "PARTLY REFUNDED"), "neutral"], failed: [E2("FALLÓ", "FAILED"), "danger"] };
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [{ k: E2("COBRADO · 90 D", "CHARGED · 90 D"), v: usd(din.cobrado) }, { k: E2("RETENIDO AHORA", "HELD NOW"), v: usd(din.retenido) }, { k: E2("DEVUELTO · 90 D", "REFUNDED · 90 D"), v: usd(din.devuelto) }] },
      { type: "group", k: E2("MÉTODOS DE PAGO", "PAYMENT METHODS") },
      din.tarjetas.length ? { type: "rows", items: din.tarjetas.map((t, i) => ({ key: `t${i}`, icon: "card", t: `${t.brand} •••• ${t.last4}`, s: `${E2("Vence", "Expires")} ${t.exp}${t.def ? E2(" · predeterminada", " · default") : ""}${t.sim ? E2(" · simulada", " · simulated") : ""}`, m: "STRIPE" })) } as Bloque
        : { type: "note", tone: "info", icon: "card", t: E2("Todavía no ha guardado una tarjeta.", "Hasn’t saved a card yet.") } as Bloque,
      { type: "note", tone: "info", icon: "lock", t: E2("El número completo lo guarda Stripe; aquí solo se ven los últimos 4.", "Stripe keeps the full number; only the last 4 show here.") },
      din.cobros.length ? { type: "rows", k: `${E2("ÚLTIMOS COBROS", "LATEST CHARGES")} · ${din.n}`, items: din.cobros.map((c) => ({ key: c.id, icon: "dollar", t: `${c.negocio}${c.num ? ` · ${c.num}` : ""}`,
        s: `${new Date(c.at).toLocaleDateString(en ? "en-US" : "es-US", { day: "numeric", month: "short", year: "numeric" })}${c.last4 ? ` · •••• ${c.last4}` : ""}${c.devuelto ? ` · ${E2("devuelto", "refunded")} ${usd(c.devuelto)}` : ""}`,
        r: usd(c.cents), tag: PST[c.status]?.[0] ?? c.status, tone: PST[c.status]?.[1] ?? "neutral", chev: true, onClick: () => router.push(`/admin/negocios/${c.biz}?tab=din`) })) } as Bloque
        : { type: "note", tone: "info", icon: "dollar", t: E2("Sin cobros con tarjeta.", "No card charges.") } as Bloque,
    ]} />;
  } else if (tab === "soporte" && sop) {
    cuerpo = <SoporteDe360 casos={sop} vacio={E2("Esta persona no ha escrito a Soporte.", "This person hasn’t written to Support.")} />;
  } else if (tab === "compa" && cpa) {
    // 7i · El Compa de esta persona: cifras de 30 días y sus conversaciones SIN texto (el hilo, en la ficha anotada; solo Admin y Soporte).
    const RES: Record<string, [string, string]> = { open: [E2("ABIERTA", "OPEN"), "neutral"], self_resolved: [E2("RESOLVIÓ SOLO", "SELF-RESOLVED"), "neutral"], action_done: [E2("ACCIÓN CONFIRMADA", "ACTION CONFIRMED"), "signal"], handed_off: [E2("A UNA PERSONA", "TO A PERSON"), "action"], to_owner: [E2("AL DUEÑO", "TO THE OWNER"), "action"] };
    const USO: Record<string, string> = { neighbor: E2("Vecinos", "Neighbors"), owner: E2("Panel del negocio", "Business panel"), auto_reply: E2("Respuestas automáticas", "Auto replies") };
    const MOT: Record<string, string> = { money: E2("dinero", "money"), account: E2("cuenta", "account"), safety: E2("seguridad", "safety"), asked_person: E2("lo pidió", "asked for it"), unknown: E2("no supo", "didn’t know"), owner: E2("dueño", "owner") };
    const r = cpa.porResultado, solo = (r.self_resolved ?? 0) + (r.action_done ?? 0);
    cuerpo = <PanelBloques bloques={[
      { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
        { k: E2("CONVERSACIONES · 30 D", "CONVERSATIONS · 30 D"), v: String(cpa.conv30), s: Object.entries(cpa.porUso).map(([k, n]) => `${n} ${USO[k] ?? k}`).join(" · ") || E2("ninguna", "none"), bg: "var(--tl-ink)", fg: "var(--tl-white)" },
        { k: E2("RESOLVIÓ SOLO", "SELF-RESOLVED"), v: cpa.conv30 ? `${Math.round((solo / cpa.conv30) * 100)} %` : "—", s: E2(`${cpa.acciones} acciones confirmadas`, `${cpa.acciones} confirmed actions`) },
        { k: E2("A UNA PERSONA", "TO A PERSON"), v: String((r.handed_off ?? 0) + (r.to_owner ?? 0)), s: E2(`${cpa.sinIa} sin IA (reglas fijas)`, `${cpa.sinIa} without AI (fixed rules)`) },
        { k: E2("MARCADAS · NO SUPO", "FLAGGED · DIDN’T KNOW"), v: `${cpa.marcadas} · ${cpa.noSupo}`, s: E2("marcadas por el equipo · preguntas sin respuesta", "flagged by the team · unanswered questions"), sFg: cpa.marcadas ? "var(--tl-danger)" : undefined }] },
      cpa.filas.length ? { type: "rows", k: E2("SUS CONVERSACIONES", "THEIR CONVERSATIONS"), items: cpa.filas.map((x) => ({ key: x.num, icon: x.ai ? "chat" : "lock", chev: cpa.leer,
        onClick: cpa.leer ? () => router.push(`/admin/compa?cp=${encodeURIComponent(x.num)}`) : undefined,
        t: `${x.num} · ${USO[x.uso] ?? x.uso}`, s: `${x.turnos} ${en ? (x.turnos === 1 ? "message" : "messages") : x.turnos === 1 ? "mensaje" : "mensajes"} · ${x.ciudad} · ${haceUsr(x.at, ahora, en)}${x.motivo ? ` · ${E2("motivo", "reason")}: ${MOT[x.motivo] ?? x.motivo}` : ""}${x.purgada ? E2(" · texto borrado por la retención", " · text deleted by retention") : ""}${x.marcada ? E2(" · MARCADA", " · FLAGGED") : ""}`,
        tag: RES[x.resultado]?.[0] ?? x.resultado, tone: x.marcada ? "danger" : RES[x.resultado]?.[1] ?? "neutral" })) } as Bloque
        : { type: "empty", icon: "chat", t: E2("Esta persona no ha hablado con El Compa", "This person hasn’t talked to El Compa"), s: E2("Cuando use la hoja de ayuda, Soporte o el panel, sale aquí (sin el texto).", "When they use the help sheet, Support or the panel, it shows here (without the text).") } as Bloque,
      { type: "note", tone: "ink", icon: "shield", t: cpa.leer ? E2("La lista no muestra lo que se habló. Al abrir una conversación ves el hilo (tapado como se guardó) y tu lectura queda anotada.", "The list doesn’t show what was said. Opening a conversation shows the thread (masked as stored) and your reading is logged.") : E2("Tu rol ve las cifras. El hilo lo leen Admin y Soporte, y cada lectura queda anotada.", "Your role sees the numbers. Admin and Support read the thread, and every reading is logged.") },
    ]} />;
  } else if (tab === "privacidad") {
    // 9d · Privacidad (L186, L189): sus archivos, el borrado y su purga por tabla, «ver como» de solo lectura, lo que aceptó, sus avisos y Fusionar.
    const x = pri;
    const EST_ARCH: Record<string, [string, string]> = { pendiente: [E2("PEDIDO", "REQUESTED"), "action"], armando: [E2("ARMANDO", "BUILDING"), "action"], listo: [E2("LISTO", "READY"), "signal"], bajado: [E2("BAJADO", "DOWNLOADED"), "neutral"], vencido: [E2("VENCIDO", "EXPIRED"), "neutral"], fallo: [E2("NO SALIÓ", "FAILED"), "danger"] };
    const ACC: Record<string, string> = { borrar: E2("borradas", "deleted"), vaciar: E2("vaciadas", "emptied"), seudonimizar: E2("seudonimizadas", "pseudonymized") };
    const resumen = (f: Record<string, unknown>) => Object.entries(f).filter(([, v]) => v != null && v !== "" && typeof v !== "object").slice(0, 4).map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join(" · ");
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: E2("SUS ARCHIVOS (DESCARGAR MIS DATOS)", "THEIR FILES (DOWNLOAD MY DATA)"), first: true }]} />
        {P.exportar ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Exportar sus datos", "Export their data"), icon: "folder", off: pend, onClick: () => setConf({
          titulo: E2(`Exportar los datos de ${corto}`, `Export ${corto}’s data`), sub: E2("Para un pedido de privacidad que llegó por Soporte. Es el mismo archivo que la persona pide en Mi cuenta: lo que el mapa de datos dice que se exporta, en JSON y CSV.", "For a privacy request that came through Support. It’s the same file the person requests in My account: what the data map says is exported, in JSON and CSV."), cta: E2("Descargar", "Download"),
          // 26 nov · Se baja como «Descargar mis datos» de la persona: un formulario POST al mismo sitio con el id del enlace (un uso, vence en minutos);
          // antes el ZIP llegaba entero en base64 en la respuesta de la acción (guardián exportacionEnFlujo). Lo manda `hecho`, con la acción ya terminada.
          nota: "interna", hacer: (m) => exportarDatos(u.id, m) }) }] }]} /> : <A.AdminNote tone="info" icon="lock">{E2("Tu rol no exporta datos.", "Your role doesn’t export data.")}</A.AdminNote>}
        {x?.archivos.length ? <A.AdminList rows={x.archivos.map((e) => ({ icon: "folder", title: `${e.negocio ? `${E2("Del negocio", "From the business")} ${e.negocio}` : E2("Su archivo", "Their file")} · ${E2("pedido", "requested")} ${fecha(e.pedido)}`,
          sub: [e.equipo ? E2(`Lo pidió ${e.equipo} (equipo)`, `Requested by ${e.equipo} (team)`) : E2("Lo pidió la persona", "Requested by the person"), e.bytes ? `${Math.max(1, Math.round(e.bytes / 1024))} KB` : null, e.bajado ? `${E2("bajado", "downloaded")} ${fecha(e.bajado)}` : null].filter(Boolean).join(" · "),
          tag: EST_ARCH[e.estado]?.[0] ?? e.estado.toUpperCase(), tone: EST_ARCH[e.estado]?.[1] ?? "neutral" }))} />
          : <A.AdminNote tone="info" icon="folder">{E2("No ha pedido su archivo.", "Hasn’t requested their file.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E2("BORRADO A LOS 30 DÍAS", "DELETION AFTER 30 DAYS") }]} />
        {x?.purga ? <>
          <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
            { k: E2("PURGADA", "PURGED"), v: fecha(x.purga.at) }, { k: E2("RESULTADO", "RESULT"), v: x.purga.ok ? E2("Completa", "Complete") : E2(`Faltan ${x.purga.pendientes} filas`, `${x.purga.pendientes} rows left`), fg: x.purga.ok ? OK : BAD },
            { k: E2("FILAS", "ROWS"), v: String(x.purga.filas) }, { k: E2("TABLAS REVISADAS", "TABLES CHECKED"), v: String(x.purga.tablas) }, { k: E2("NEGOCIOS SIN DUEÑO", "BUSINESSES WITHOUT OWNER"), v: String(x.purga.negocios) }, { k: E2("FOTOS FUERA DEL ALMACÉN", "PHOTOS REMOVED FROM STORAGE"), v: String(x.purga.fotos) },
          ] }]} />
          <A.AdminList rows={x.purga.items.filter((it) => it.filas > 0).map((it) => ({ icon: it.accion === "borrar" ? "trash" : "edit", title: `${it.tabla}.${it.columna}`, sub: `${it.filas} ${ACC[it.accion] ?? it.accion}` }))} />
          <A.AdminNote tone="info" icon="check">{E2(`${x.purga.items.filter((it) => it.filas === 0).length} tablas más del mapa revisadas sin nada suyo.`, `${x.purga.items.filter((it) => it.filas === 0).length} more tables in the map checked with nothing of theirs.`)}</A.AdminNote>
        </> : x?.borrado ? <A.AdminNote tone="warn" icon="clock">{E2(`${x.borrado.porElEquipo ? "Borrado pedido por el equipo" : "La persona pidió borrar su cuenta"}: se borra el ${fecha(x.borrado.at)}. Ese día el barrido la purga por el mapa de datos y aquí se ve cada tabla.`, `${x.borrado.porElEquipo ? "Deletion requested by the team" : "The person asked to delete their account"}: it’s deleted on ${fecha(x.borrado.at)}. That day the sweep purges it by the data map and each table shows here.`)}</A.AdminNote>
          : <A.AdminNote tone="info" icon="trash">{E2("No hay un borrado programado.", "No deletion scheduled.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E2("VER COMO (SOLO LECTURA)", "VIEW AS (READ-ONLY)"), link: comoVista ? E2("Cerrar", "Close") : undefined, onLink: () => setComoVista(null) }]} />
        {comoVista ? (comoVista.length ? comoVista.map((pt) => <div key={pt.k}><PanelBloques bloques={[{ type: "group", k: `${pt.k.toUpperCase().replace(/_/g, " ")} · ${pt.n}` }]} />
          <A.AdminList rows={pt.filas.map((f, i) => ({ icon: "search", title: resumen(f) || "—", sub: i === 0 && pt.n > 3 ? E2(`y ${pt.n - 3} más`, `and ${pt.n - 3} more`) : undefined }))} /></div>)
          : <A.AdminNote tone="info" icon="search">{E2("No tiene nada guardado aparte de su cuenta.", "Nothing stored besides their account.")}</A.AdminNote>)
          : <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Ver como (solo lectura)", "View as (read-only)"), icon: "search", onClick: () => setConf({ titulo: E2(`Ver lo que guardamos de ${corto}`, `See what we store about ${corto}`), sub: E2("Lo mismo que trae su archivo, sin poder cambiar nada. El motivo queda en la auditoría antes de ver.", "The same as their file, without being able to change anything. The reason goes into the audit log before you see it."), cta: E2("Ver", "View"),
            plantillas: [E2("Pedido de privacidad por Soporte", "Privacy request through Support"), E2("Revisar un reclamo de la persona", "Review a complaint from the person")], nota: "interna", hacer: async (m) => { const r = await verComo(u.id, m); if (r.ok && "partes" in r && r.partes) setComoVista(r.partes); return r; } }) }] }]} />}

        <PanelBloques bloques={[{ type: "group", k: E2("TÉRMINOS QUE ACEPTÓ", "TERMS ACCEPTED") }]} />
        {x?.terminos.length ? <A.AdminList rows={x.terminos.map((t) => ({ icon: "check", title: bi(t.t), sub: [t.s ? bi(t.s) : undefined, `${E2("aceptado", "accepted")} ${fecha(t.at)}`].filter(Boolean).join(" · ") }))} />
          : <A.AdminNote tone="info" icon="shield">{E2("No hay términos anotados.", "No terms on record.")}</A.AdminNote>}

        <PanelBloques bloques={[{ type: "group", k: E2("AVISOS QUE RECIBE", "NOTIFICATIONS THEY GET") }]} />
        <A.AdminNote tone="info" icon="bell">{`${x?.avisos.apagados.length ? `${E2("Apagó", "Turned off")}: ${x.avisos.apagados.join(", ")}.` : E2("Recibe todos los avisos.", "Gets all notifications.")} ${x?.avisos.silencio ? E2("Respeta sus horas de silencio (de 10 PM a 7 AM, salvo lo crítico).", "Respects their quiet hours (10 PM to 7 AM, except critical ones).") : E2("Sin horas de silencio.", "No quiet hours.")}`}</A.AdminNote>

        <PanelBloques bloques={[{ type: "group", k: E2("FUSIONAR CUENTAS", "MERGE ACCOUNTS") }]} />
        {x?.pedidoFusion ? <A.AdminNote tone="warn" icon="users" cta={x.pedidoFusion.caso ? E2("Ver", "View") : undefined} onCta={() => router.push(`/admin/colas?caso=${x.pedidoFusion?.caso}`)}>
          {E2(`Pedido de fusión en Cambios sensibles (#${x.pedidoFusion.id}${x.pedidoFusion.pidio ? `, lo pidió ${x.pedidoFusion.pidio}` : ""}): lo aplica otra persona del equipo.`, `Merge request in Sensitive changes (#${x.pedidoFusion.id}${x.pedidoFusion.pidio ? `, requested by ${x.pedidoFusion.pidio}` : ""}): another team member applies it.`)}</A.AdminNote> : null}
        {x?.fusiones.length ? <A.AdminList rows={x.fusiones.map((f) => ({ icon: "users", title: f.desde === u.id ? E2("Esta cuenta se fusionó en otra", "This account was merged into another") : E2("Otra cuenta se fusionó en esta", "Another account was merged into this one"),
          sub: E2(`${fecha(f.at)} · lo pidió ${f.pidio ?? "equipo"} · lo aprobó ${f.aprobo ?? "equipo"} · ${Object.values(f.tablas).reduce((a, n) => a + n, 0)} filas movidas`, `${fecha(f.at)} · requested by ${f.pidio ?? "team"} · approved by ${f.aprobo ?? "team"} · ${Object.values(f.tablas).reduce((a, n) => a + n, 0)} rows moved`), chevron: true,
          onClick: () => router.push(`/admin/usuarios/${f.desde === u.id ? f.hacia : f.desde}?tab=privacidad`) }))} /> : null}
        {P.editar && !borrada && !intocable && !x?.pedidoFusion ? <PanelBloques bloques={[{ type: "acts", items: [{ l: E2("Fusionar con otra cuenta", "Merge with another account"), icon: "users", onClick: () => setConf({
          titulo: E2(`Fusionar la cuenta de ${corto} en otra`, `Merge ${corto}’s account into another`), sub: E2("Sus pedidos, cobros, direcciones, guardados, reseñas y publicaciones pasan a la cuenta del teléfono que escribas; esta queda fusionada y ya no entra. Entra a Cambios sensibles: lo aplica otra persona del equipo.", "Their orders, charges, addresses, saved items, reviews and posts move to the account of the phone you enter; this one is merged and can no longer sign in. It goes to Sensitive changes: another team member applies it."),
          cta: E2("Enviar a la cola", "Send to the queue"), valor: { k: E2("TELÉFONO DE LA OTRA CUENTA (10 NÚMEROS)", "OTHER ACCOUNT’S PHONE (10 DIGITS)"), ini: "", max: 14 }, plantillas: [E2("Cambió de número y abrió otra cuenta", "Changed number and opened another account"), E2("Lo pidió la persona por Soporte", "The person asked through Support")],
          nota: "interna", hacer: (m, _e, v) => pedirFusion(u.id, v, m) }) }] }]} />
          : !x?.pedidoFusion && !x?.fusiones.length ? <A.AdminNote tone="info" icon="users">{borrada ? E2("Una cuenta borrada o fusionada no se fusiona.", "A deleted or merged account can’t be merged.") : E2("Tu rol no fusiona cuentas.", "Your role doesn’t merge accounts.")}</A.AdminNote> : null}
      </>);
  } else {
    const acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    if (u.photo && (P.editar || P.retirar) && !borrada) acts.push({ l: E2("Quitar foto de perfil", "Remove profile photo"), icon: "image", onClick: () => setConf({ titulo: E2(`Quitar la foto de ${corto}`, `Remove ${corto}’s photo`), plantillas: PLU, nota: "persona", hacer: (m) => quitarFotoPerfil(u.id, m) }) });
    // 9n-3 · Enviar mensaje del equipo (AdminMessage): por la app o por SMS; tope por hora y por destinatario, sin enlaces.
    if (P.editar && !borrada && !u.yoMismo) acts.push({ l: E2("Enviar mensaje", "Send message"), icon: "chat", onClick: () => setConf({
      titulo: E2(`Mensaje a ${corto}`, `Message to ${corto}`), sub: E2("Lo ve en su campana y, si eliges SMS, también por texto (no sale de noche ni a quien dijo STOP). Sin enlaces. El motivo de abajo es interno: queda en la auditoría.", "They see it in their bell and, if you choose SMS, also by text (not sent at night or to anyone who said STOP). No links. The reason below is internal: it stays in the audit log."),
      cta: E2("Enviar", "Send"), elegir: { label: E2("POR DÓNDE", "HOW"), items: [{ k: "push", l: E2("En la app (campana y push)", "In the app (bell and push)") }, ...(u.phone_ok ? [{ k: "sms", l: E2("Por SMS", "By SMS") }] : [])] },
      valor: { k: E2("MENSAJE (HASTA 280 LETRAS)", "MESSAGE (UP TO 280 CHARACTERS)"), ini: "", area: true, max: 280 }, plantillas: [E2("Aviso sobre su cuenta", "Notice about their account"), E2("Respuesta a lo que pidió por Soporte", "Reply to what they asked through Support"), E2("Aviso de seguridad", "Security notice")],
      nota: "interna", hacer: (m, e, v) => enviarMensaje(u.id, e ?? "push", v, m) }) });
    if (P.retirar && !borrada && u.estado !== "ban" && !intocable) acts.push({ l: E2("Sancionar", "Sanction"), v: "danger", icon: "warning", onClick: () => setConf({
      titulo: E2(`Sanción a ${corto}`, `Sanction for ${corto}`), peligro: true, plantillas: PLU,
      elegir: { label: E2("SANCIÓN", "SANCTION"), items: ORDEN_SANCIONES.filter((k) => !SANCIONES[k].admin || P.admin).map((k) => ({ k, l: `${bi(SANCIONES[k])} · ${subS(k)}` })) },
      nota: "persona", hacer: (m, e) => sancionar(u.id, (e ?? "") as Sancion, m) }) });
    if (P.editar && !borrada && !intocable && !pedido) acts.push({ l: E2("Borrar datos", "Delete data"), icon: "trash", onClick: () => setConf({
      titulo: E2("Pedido de borrado", "Deletion request"), sub: E2("Entra a Cambios sensibles; otra persona lo aprueba. Luego hay 30 días de gracia para restaurarla. Después se borra todo lo suyo; sus pedidos y cobros quedan como «Cuenta borrada» (lo pide la ley) y los pagos con tarjeta quedan en Stripe.", "It goes to Sensitive changes; another person approves it. Then there are 30 grace days to restore it. After that everything of theirs is deleted; their orders and charges remain as “Deleted account” (required by law) and card payments stay in Stripe."),
      cta: E2("Enviar a la cola", "Send to the queue"), nota: "interna", hacer: (m) => pedirBorrado(u.id, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: E2("TELÉFONO", "PHONE"), v: `${u.phone_b} · ${u.phone_ok ? E2("Verificado", "Verified") : E2("Pide código", "Asks for code")}`, fg: u.phone_ok ? undefined : WARN },
          { k: E2("CORREO", "EMAIL"), v: u.email ? `${u.email} · ${u.email_ok ? E2("Verificado", "Verified") : E2("Sin verificar", "Not verified")}` : E2("No dio", "Not given") },
          { k: E2("CIUDAD", "CITY"), v: u.ciudad ?? E2("Sin ciudad", "No city") },
          { k: E2("ROL", "ROLE"), v: rol },
          { k: E2("DESDE", "SINCE"), v: fecha(u.creado) },
          { k: E2("ÚLTIMA VEZ", "LAST SEEN"), v: haceUsr(u.visto, ahora, en) },
          { k: E2("DISPOSITIVOS", "DEVICES"), v: String(u.dispositivos.length), fg: u.compartidos.length ? BAD : undefined },
        ] }]} />
        {u.compartidos.length ? <A.AdminNote tone="warn" icon="warning" cta={E2("Ver", "View")} onCta={() => ir("seguridad")}>{E2(`Comparte dispositivo con ${u.compartidos.length} ${u.compartidos.length === 1 ? "cuenta más" : "cuentas más"}.`, `Shares a device with ${u.compartidos.length} ${u.compartidos.length === 1 ? "other account" : "other accounts"}.`)}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: E2("NOTAS INTERNAS", "INTERNAL NOTES"), link: P.editar || P.retirar ? E2("Agregar nota", "Add note") : undefined, onLink: () => setConf({ titulo: E2(`Nota sobre ${corto}`, `Note about ${corto}`), sub: E2("Solo la ve el equipo. El vecino nunca la ve.", "Only the team sees it. The neighbor never does."), cta: E2("Guardar", "Save"), nota: "interna", hacer: (m) => notaUsuario(u.id, m) }) }]} />
        {u.notas.length ? <A.AdminList rows={u.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? E2("Equipo", "Team")} · ${fecha(x.at)}` }))} />
          : <A.AdminNote tone="info" icon="edit">{E2("Sin notas. Úsalas para lo que el siguiente del equipo necesita saber.", "No notes. Use them for what the next team member needs to know.")}</A.AdminNote>}
        {u.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: E2("SUS NEGOCIOS", "THEIR BUSINESSES") }]} />
          <A.AdminList rows={u.negocios.map((n) => ({ icon: "store", title: n.name, sub: `${n.kind === "owner" ? E2("Dueño", "Owner") : E2("Equipo", "Team")} · ${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}`, tag: n.status !== "active" ? n.status.toUpperCase() : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }))} />
        </> : null}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: E2("ACCIONES", "ACTIONS") }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
        {intocable && !borrada ? <A.AdminNote tone="info" icon="lock">{u.yoMismo ? E2("Es tu cuenta: no te sancionas ni te borras desde aquí.", "It’s your account: you can’t sanction or delete yourself from here.") : E2("Es del equipo de To’Latino: para sancionarla o borrarla, quítale el rol en Sistema › Equipo antes.", "It belongs to the To’Latino team: to sanction or delete it, remove the role in System › Team first.")}</A.AdminNote> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("USUARIO 360°", "USER 360°"), t: nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/usuarios")} {...tec(() => router.push("/admin/usuarios"))} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />{E2("Usuarios", "Users")}</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.6)" }}>{E2("USUARIO 360°", "USER 360°")}</span>
      <PanelBloques bloques={cab} />
      {avisos}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: E2("HISTORIAL RECIENTE", "RECENT HISTORY") }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
