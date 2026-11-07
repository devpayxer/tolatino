"use client";
/* ADM-USR · 360° (Super Admin.dc.html usrDetail): la persona como cuenta, lo que hizo y lo que hizo el equipo.
   Pestañas: Resumen, Seguridad, Confianza, Privacidad y (5c) Comunidad › Seguidores y siguiendo (bloqueó · silenció · «posible
   red» por dispositivo; los mensajes privados nunca se leen aquí: solo con un reporte, en Colas). Actividad y Dinero llegan con sus
   módulos. Cada acción pide motivo y queda en la auditoría; el servidor revisa permiso, ciudad y estado. */
import * as UI from "@tolatino/ui";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type ReactNode } from "react";
import type { Usuario360 } from "@/lib/admin-usuarios";
import type { Comunidad360 } from "@/lib/admin-vecinos";
import { ORDEN_SANCIONES, PLANTILLAS_USR, SANCIONES, sub as subSancion, type Sancion } from "@/lib/sanciones";
import {
  cambiarCiudadUsuario, cerrarSesiones, dispositivoAccion, exportarDatos, levantar, notaUsuario, pedirBorrado, quitarFotoPerfil, restablecerVerificacion, restaurarCuenta, sancionar,
} from "./acciones-usuarios";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { EST_USR, haceUsr } from "./Usuarios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const A = UI as unknown as Record<"AdminNote" | "AdminList" | "AuditLog" | "Icon", ComponentType<any>>;
/* Verbo de cada acción en el historial. */
const VERBO: Record<string, string> = {
  "usuario.nota": "agregó una nota a", "usuario.sancionar": "sancionó a", "usuario.levantar": "levantó la sanción de", "usuario.foto.quitar": "quitó la foto de",
  "usuario.sesiones.cerrar": "cerró las sesiones de", "usuario.sesion.cerrar": "cerró una sesión de", "usuario.sesion.bloquear": "bloqueó un dispositivo de",
  "usuario.dispositivo.bloquear": "bloqueó un dispositivo de", "usuario.dispositivo.desbloquear": "desbloqueó un dispositivo de", "usuario.verificacion.restablecer": "restableció la verificación de",
  "usuario.ciudad": "cambió la ciudad de", "usuario.borrado.pedir": "pidió borrar la cuenta de", "usuario.borrar": "borró la cuenta de", "usuario.restaurar": "restauró la cuenta de",
  "usuario.exportar": "exportó los datos de",
};
const CAMBIO_K: Record<string, string> = { phone: "Teléfono", city: "Ciudad", email: "Correo", name: "Nombre" };
const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" }) : "—");
const val = (x: unknown) => (x && typeof x === "object" ? Object.values(x as Record<string, unknown>).filter((v) => typeof v === "string" || typeof v === "number").join(" · ") : String(x ?? "—"));
const OK = "var(--tl-open-text)", WARN = "var(--tl-pro-ink)", BAD = "var(--tl-danger)";

export function U360({ u, tab, com }: { u: Usuario360; tab: string; com?: Comunidad360 | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [toast, setToast] = useToast();
  const [conf, setConf] = useState<Confirmar | null>(null);
  const [pend] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo. Quedó en la auditoría."); setConf(null); router.refresh(); };
  const P = u.puede, ir = (t: string) => router.push(`/admin/usuarios/${u.id}${t === "resumen" ? "" : `?tab=${t}`}`, { scroll: false });
  const nombre = u.nombre ?? "(sin nombre todavía)", corto = u.nombre?.split(" ")[0] ?? u.phone_b;
  const borrada = u.estado === "del", vigentes = u.sanciones.filter((x) => !x.lifted_at && (!x.ends_at || new Date(x.ends_at).getTime() > Date.now()));
  const intocable = u.yoMismo || !!u.staff;
  const stL = borrada ? "BORRADA" : u.estado === "ok" ? "ACTIVO" : EST_USR[u.estado] ?? u.estado.toUpperCase();
  const lugar = [u.zona, u.ciudad].filter(Boolean).join(" · ") || "Sin ciudad";
  const rol = ["Cliente", ...(u.negocios.some((n) => n.kind === "owner") ? ["Dueño"] : u.negocios.length ? ["Equipo de un negocio"] : []), ...(u.staff ? [`Equipo de To’Latino · ${u.staff}`] : [])].join(" · ");
  const cab: Bloque[] = [{
    type: "hero", t: nombre, s: `${lugar} · ${u.lang === "en" ? "English" : "Español"}${u.negocios.some((n) => n.kind === "owner") ? " · dueño" : ""}`,
    ph: u.photo ? `url("${u.photo}")` : "", ini: u.photo ? "" : nombre.slice(0, 1), st: stL, stFg: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", stDot: u.estado === "ok" ? "var(--tl-signal)" : "var(--tl-pro)", kpis: [], acts: [],
  }];

  /* Avisos de arriba: prueba, borrada (con Restaurar), sanción vigente (con Levantar), pedido de borrado en la cola. */
  const avisos: ReactNode[] = [];
  if (u.is_test) avisos.push(<A.AdminNote key="t" tone="info" icon="users">Cuenta de prueba: no cuenta en los números.</A.AdminNote>);
  if (borrada) {
    const gracia = u.status === "deleted_pending" && u.delete_at && new Date(u.delete_at).getTime() > Date.now();
    avisos.push(<A.AdminNote key="d" tone="bad" icon="trash" cta={gracia && P.admin ? "Restaurar" : undefined}
      onCta={() => setConf({ titulo: `Restaurar la cuenta de ${corto}`, sub: "Vuelve a como estaba y puede entrar otra vez.", hacer: (m) => restaurarCuenta(u.id, m) })}>
      {gracia ? `Borrada. Período de gracia hasta el ${fecha(u.delete_at)}: hasta entonces se puede restaurar. Después se borra todo, también sus transacciones; los pagos con tarjeta quedan solo en Stripe.` : "Borrada."}</A.AdminNote>);
  } else if (u.estado !== "ok") {
    const v = vigentes[0], hasta = v?.ends_at ? ` hasta el ${fecha(v.ends_at)}` : "";
    const lo = u.estado === "susp" || u.estado === "ban" ? "Lo ve al intentar entrar." : "Lo ve en su cuenta.";
    avisos.push(<A.AdminNote key="s" tone="bad" icon="warning" cta={P.retirar ? "Levantar" : undefined}
      onCta={() => setConf({ titulo: "¿Por qué se levanta?", hacer: (m) => levantar(u.id, m) })}>
      {`${stL.charAt(0)}${stL.slice(1).toLowerCase()}${hasta}${v ? `: ${v.reason}` : ""} · ${lo}`}</A.AdminNote>);
  }
  const pedido = u.cambiosSensibles.find((c) => c.status === "pending");
  if (pedido) avisos.push(<A.AdminNote key="p" tone="warn" icon="edit" cta={pedido.caso ? "Ver" : undefined} onCta={() => router.push(`/admin/colas?caso=${pedido.caso}`)}>
    {`Pedido de borrado en Cambios sensibles (#${pedido.id}): lo aplica otra persona del equipo.`}</A.AdminNote>);

  const alertas = u.compartidos.length + (u.phone_ok ? 0 : 1);
  const tabs: Bloque = { type: "tabs", items: ([["resumen", "Resumen"], ["seguridad", "Seguridad", alertas], ["confianza", "Confianza", vigentes.length], ["privacidad", "Privacidad"], ["comunidad", "Comunidad"]] as [string, string, number?][])
    .map(([k, l, n]) => ({ l, n: n ? String(n) : undefined, on: tab === k, onClick: () => ir(k) })) };

  const historial = (): ReactNode => u.historial.length
    ? <A.AuditLog rows={u.historial.slice(0, 10).map((x) => ({ who: x.quien ?? "Equipo", initials: (x.quien ?? "E").slice(0, 1), action: `${VERBO[x.action] ?? x.action} ${nombre}`, before: val(x.before), after: val(x.after), why: x.reason ?? undefined, when: haceUsr(x.at) }))} />
    : <A.AdminNote tone="info" icon="folder">Nadie del equipo ha hecho cambios aquí todavía.</A.AdminNote>;

  let cuerpo: ReactNode;
  if (tab === "seguridad") {
    const puedeS = (P.editar || P.retirar) && !borrada;
    const abiertas = u.dispositivos.reduce((a, d) => a + d.abiertas, 0);
    const cambiosCiudad = u.cambios.filter((c) => c.kind === "city"), cambiosTel = u.cambios.filter((c) => c.kind === "phone");
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: `DISPOSITIVOS Y SESIONES · ${u.dispositivos.length}`, first: true, link: puedeS && abiertas ? "Cerrar todas" : undefined,
          onLink: () => setConf({ titulo: `Cerrar todas las sesiones de ${corto}`, sub: "Tiene que entrar otra vez con el código por SMS en cada dispositivo.", cta: "Cerrar todas", hacer: (m) => cerrarSesiones(u.id, m) }) }]} />
        {u.dispositivos.length ? <PanelBloques bloques={[{ type: "rows", items: u.dispositivos.map((d, i) => {
          const bloq = d.dev_bloq || d.bloqueada;
          return {
            key: d.sid, icon: /iPhone|Android|iPad|Tableta/.test(d.nombre) ? "phone" : "grid", t: `${d.nombre}${d.nav ? ` · ${d.nav}` : ""} · ${d.app}`,
            s: `Primera vez ${fecha(d.primera)} · ${d.abiertas ? `última ${haceUsr(d.ultima)}` : `sesión cerrada · última ${haceUsr(d.ultima)}`}${d.ip ? ` · ${d.ip}` : ""}`,
            tag: bloq ? "BLOQUEADO" : i === 0 && u.compartidos.length && d.device ? "COMPARTIDO" : d.abiertas ? "ABIERTA" : null, tone: bloq || (i === 0 && u.compartidos.length) ? "danger" : "signal",
            acts: puedeS ? [
              ...(d.abiertas && !bloq ? [{ l: "Cerrar sesión", icon: "lock", onClick: () => setConf({ titulo: `Cerrar sesión en ${d.nombre}`, plantillas: ["Lo pidió la persona", "Posible acceso de otra persona", "Teléfono perdido o robado"], hacer: (m) => dispositivoAccion(u.id, d.sid, "cerrar", m) }) }] : []),
              ...(P.retirar ? [bloq
                ? { l: "Desbloquear", icon: "check", onClick: () => setConf({ titulo: `Desbloquear ${d.nombre}`, hacer: (m) => dispositivoAccion(u.id, d.sid, "desbloquear", m) }) }
                : { l: "Bloquear", icon: "ban", onClick: () => setConf({ titulo: `Bloquear ${d.nombre}`, sub: "Ninguna cuenta puede entrar desde este dispositivo.", peligro: true, plantillas: ["Teléfono perdido o robado", "Actividad sospechosa", "Cuentas vinculadas al mismo dispositivo"], hacer: (m) => dispositivoAccion(u.id, d.sid, "bloquear", m) }) }] : []),
            ] : undefined,
          };
        }) }]} /> : <A.AdminNote tone="info" icon="phone">No ha entrado desde ningún dispositivo.</A.AdminNote>}
        {u.compartidos.length ? <>
          <A.AdminNote tone="warn" icon="warning">Otras cuentas que entraron desde el mismo dispositivo:</A.AdminNote>
          <A.AdminList rows={u.compartidos.map((x) => ({ initials: (x.nombre ?? "?").slice(0, 1), title: x.nombre ?? "(sin nombre todavía)", sub: x.phone, tag: x.estado !== "ok" ? EST_USR[x.estado] : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}`) }))} />
        </> : null}
        <PanelBloques bloques={[{ type: "group", k: "VERIFICACIÓN" }, { type: "rows", items: [
          { icon: "phone", t: `Teléfono · ${u.phone_b}`, s: u.phone_ok ? `Verificado por SMS · ${fecha(u.phone_ok)}` : "Restablecida: al entrar le pedimos el código otra vez", tag: u.phone_ok ? "VERIFICADO" : "PENDIENTE", tone: u.phone_ok ? "signal" : "action" },
          ...(u.email ? [{ icon: "news", t: `Correo · ${u.email}`, s: u.email_ok ? "Verificado" : "Sin verificar", tag: u.email_ok ? "VERIFICADO" : null, tone: "signal" }] : []),
          ...cambiosTel.map((c) => ({ icon: "edit", t: `Cambió de teléfono: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? "Lo cambió el equipo" : "Lo cambió la persona"} · ${fecha(c.at)}` })),
          // Mi cuenta (2h): correo, y borrar la cuenta (30 días) o cancelarlo.
          ...u.cambios.filter((c) => c.kind === "email").map((c) => ({ icon: "news", t: `Cambió el correo: ${c.de ?? "—"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? "Lo cambió el equipo" : "Lo cambió la persona"} · ${fecha(c.at)}` })),
          ...u.cambios.filter((c) => c.kind === "delete" || c.kind === "undelete").map((c) => ({ icon: "trash", t: c.kind === "delete" ? `Pidió borrar su cuenta${c.a ? ` · motivo: ${({ uso: "ya no la usa", avisos: "muchos avisos", priv: "privacidad", ciudad: "se mudó", otra: "otra razón" } as Record<string, string>)[c.a] ?? c.a}` : ""}` : "Canceló el borrado de su cuenta", s: `Lo hizo la persona · ${fecha(c.at)}` })),
        ] }]} />
        {P.editar && !borrada && u.phone_ok ? <PanelBloques bloques={[{ type: "acts", items: [{ l: "Restablecer verificación", icon: "lock", off: pend, onClick: () => setConf({ titulo: `Restablecer verificación de ${corto}`, sub: "Se cierran sus sesiones y al entrar le pedimos el código por SMS otra vez. Úsalo si cree que alguien entró a su cuenta.", hacer: (m) => restablecerVerificacion(u.id, m) }) }] }]} /> : null}
        <PanelBloques bloques={[{ type: "group", k: "CIUDAD" }, { type: "kv", cols: desk ? 3 : 1, items: [{ k: "AHORA", v: u.ciudad ?? "Sin ciudad" }, { k: "ÚLTIMO CAMBIO", v: u.city_changed ? fecha(u.city_changed) : "Nunca" }, { k: "REGLA", v: "El vecino la cambia 1 vez cada 30 días" }] }]} />
        {cambiosCiudad.length ? <PanelBloques bloques={[{ type: "rows", items: cambiosCiudad.map((c) => ({ icon: "globe", t: `${c.de ?? "Sin ciudad"} → ${c.a ?? "—"}`, s: `${c.by === "staff" ? "La cambió el equipo" : "La cambió el vecino"} · ${fecha(c.at)}` })) }]} /> : null}
        {P.editar && !borrada ? <PanelBloques bloques={[{ type: "acts", items: [{ l: "Cambiar ciudad", icon: "globe", off: pend, onClick: () => setConf({
          titulo: `Cambiar la ciudad de ${corto}`, sub: "Se salta la regla de 30 días. Si la ciudad aún no abre, queda en su lista de espera.",
          elegir: { label: "CIUDAD NUEVA", items: u.ciudades.filter((c) => c.id !== u.city_id).map((c) => ({ k: c.id, l: `${c.name}${c.status !== "on" ? " · lista de espera" : ""}` })) },
          hacer: (m, e) => cambiarCiudadUsuario(u.id, e ?? "", m) }) }] }]} /> : null}
      </>);
  } else if (tab === "confianza") {
    const REP: Record<string, string> = { no_es: "No es de este negocio", inapropiado: "Contenido inapropiado", datos: "Muestra datos personales", spam: "Es publicidad o spam", otro: "Otro motivo" };
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: "ESTADO", v: u.estado === "ok" ? "Sin sanción" : `${stL.charAt(0)}${stL.slice(1).toLowerCase()}`, fg: u.estado === "ok" ? undefined : BAD },
          { k: "SANCIONES", v: String(u.sanciones.length) },
          { k: "REPORTES HECHOS", v: String(u.reportes.length) },
        ] }, { type: "group", k: "SANCIONES" }]} />
        {u.sanciones.length ? <PanelBloques bloques={[{ type: "rows", items: u.sanciones.flatMap((x) => {
          const k = SANCIONES[x.kind as Sancion], vence = x.ends_at && new Date(x.ends_at).getTime() <= Date.now();
          const fila = { icon: "warning", t: `${k?.es ?? x.kind} · ${x.reason}`, s: `${x.quien ?? "Equipo"} · ${fecha(x.starts_at)}${x.ends_at ? ` · hasta el ${fecha(x.ends_at)}` : ""}`, tag: x.lifted_at ? "LEVANTADA" : vence ? "TERMINÓ" : "VIGENTE", tone: x.lifted_at || vence ? "neutral" : "danger" };
          return x.lifted_at ? [{ icon: "check", t: x.lift_reason ? `Levantada · ${x.lift_reason}` : "Levantada", s: `${x.quien_levanto ?? "Equipo"} · ${fecha(x.lifted_at)}` }, fila] : [fila];
        }) }]} /> : <A.AdminNote tone="ok" icon="check">Nunca ha tenido una sanción.</A.AdminNote>}
        <PanelBloques bloques={[{ type: "group", k: `REPORTES QUE HIZO · ${u.reportes.length}` }]} />
        {u.reportes.length ? <PanelBloques bloques={[{ type: "rows", items: u.reportes.map((r) => ({ icon: "image", t: `Foto de ${r.negocio} · ${REP[r.reason] ?? r.reason}`, s: fecha(r.at), tag: r.status === "open" ? "ABIERTO" : "RESUELTO", tone: r.status === "open" ? "action" : "neutral", chev: true, onClick: () => router.push(`/admin/negocios/${r.bid}`) })) }]} />
          : <A.AdminNote tone="info" icon="bubble">Ninguno.</A.AdminNote>}
      </>);
  } else if (tab === "comunidad" && com) {
    const lista = (k: string, L: Comunidad360["listas"]["seg"], vacio: string) => <>
      <PanelBloques bloques={[{ type: "group", k: `${k} · ${L.length}` }]} />
      {L.length ? <A.AdminList rows={L.map((x) => ({ icon: "users", title: x.nombre, sub: `${x.rango} · ${x.ciudad ?? "Sin ciudad"} · ${fecha(x.at)}`, tag: x.mismo ? "MISMO DISPOSITIVO" : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/usuarios/${x.id}?tab=comunidad`) }))} />
        : <A.AdminNote tone="info" icon="users">{vacio}</A.AdminNote>}
    </>;
    cuerpo = (
      <>
        <PanelBloques bloques={[
          { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
            { k: "RANGO", v: String(com.rango) }, { k: "PUBLICACIONES", v: String(com.publicaciones), s: `${com.comentarios} comentarios` },
            { k: "VOTOS RECIBIDOS", v: `+${com.votos.up}`, s: `−${com.votos.dn}` }, { k: "MEJORES RESPUESTAS", v: String(com.mejores) }] },
          { type: "kv", cols: desk ? 3 : 2, items: [
            { k: "SEGUIDORES", v: String(com.seguidores) }, { k: "SIGUIENDO", v: String(com.siguiendo) }, { k: "BLOQUEÓ", v: String(com.bloqueo) }, { k: "SILENCIÓ", v: String(com.silencio) },
            { k: "CONVERSACIONES PRIVADAS", v: `${com.conversaciones} · el equipo no las lee salvo reporte` }, { k: "CUENTAS", v: com.ocultaCuentas ? "Ocultas al público" : "Visibles" },
            { k: "18 AÑOS O MÁS", v: com.declaracion ? `${com.declaracion.adulto ? "Declaró que sí" : "Declaró que no: no entra a la Comunidad"} · ${fecha(com.declaracion.at)}` : "Sin declarar", fg: com.declaracion?.adulto === false ? WARN : undefined },
            { k: "BIENVENIDA", v: com.bienvenida ? fecha(com.bienvenida) : "No la ha hecho" },
          ] },
        ]} />
        {com.ocultas ? <A.AdminNote tone="warn" icon="warning" cta="Ver" onCta={() => router.push(`/admin/contenido?tab=pub`)}>{`${com.ocultas} de sus publicaciones o comentarios están ocultos por las reglas.`}</A.AdminNote> : null}
        {com.red ? <A.AdminNote tone="bad" icon="warning">{`${com.red} ${com.red === 1 ? "seguidor entró" : "seguidores entraron"} desde el mismo dispositivo que esta cuenta: posible red de cuentas. El caso de red de cuentas se abre desde Reportes de usuario cuando exista esa cola (5d).`}</A.AdminNote> : null}
        {lista("SEGUIDORES", com.listas.seg, "Nadie la sigue todavía.")}
        {lista("SIGUIENDO", com.listas.sig, "No sigue a nadie.")}
        {lista("BLOQUEADOS", com.listas.blk, "No ha bloqueado a nadie.")}
        {com.listas.blk.length ? <A.AdminNote tone="info" icon="lock">El bloqueo es mutuo e invisible para la persona bloqueada.</A.AdminNote> : null}
        {lista("SILENCIADOS", com.listas.mut, "No ha silenciado a nadie.")}
        <A.AdminNote tone="info" icon="info">Seguir o tener seguidores no da puntos ni rango. Los mensajes privados solo se leen con un reporte abierto, en Colas › Mensajes reportados.</A.AdminNote>
      </>);
  } else if (tab === "privacidad") {
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "group", k: "SUS DATOS", first: true }]} />
        {P.exportar ? <PanelBloques bloques={[{ type: "acts", items: [{ l: "Exportar sus datos", icon: "folder", off: pend, onClick: () => setConf({
          titulo: `Exportar los datos de ${corto}`, sub: "Para un pedido de privacidad del vecino. Se descarga un archivo con su perfil, dispositivos, negocios, recomendaciones, reportes y sanciones.", cta: "Descargar",
          hacer: async (m) => {
            const r = await exportarDatos(u.id, m);
            if (r.ok && "archivo" in r && r.archivo) {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([r.archivo], { type: "application/json" }));
              a.download = `tolatino-datos-${u.id}.json`;
              document.body.appendChild(a); a.click(); a.remove();
            }
            return r;
          } }) }] }]} /> : <A.AdminNote tone="info" icon="lock">Tu rol no exporta datos.</A.AdminNote>}
      </>);
  } else {
    const acts: { l: string; v?: string; icon?: string; off?: boolean; onClick: () => void }[] = [];
    if (u.photo && (P.editar || P.retirar) && !borrada) acts.push({ l: "Quitar foto de perfil", icon: "image", onClick: () => setConf({ titulo: `Quitar la foto de ${corto}`, plantillas: PLANTILLAS_USR, hacer: (m) => quitarFotoPerfil(u.id, m) }) });
    if (P.retirar && !borrada && u.estado !== "ban" && !intocable) acts.push({ l: "Sancionar", v: "danger", icon: "warning", onClick: () => setConf({
      titulo: `Sanción a ${corto}`, peligro: true, plantillas: PLANTILLAS_USR,
      elegir: { label: "SANCIÓN", items: ORDEN_SANCIONES.filter((k) => !SANCIONES[k].admin || P.admin).map((k) => ({ k, l: `${SANCIONES[k].es} · ${subSancion(k)}` })) },
      hacer: (m, e) => sancionar(u.id, (e ?? "") as Sancion, m) }) });
    if (P.editar && !borrada && !intocable && !pedido) acts.push({ l: "Borrar datos", icon: "trash", onClick: () => setConf({
      titulo: "Pedido de borrado", sub: "Entra a Cambios sensibles; otra persona lo aprueba. Luego hay 30 días de gracia para restaurarla. Después se borra todo, también sus transacciones; los pagos con tarjeta quedan solo en Stripe.",
      cta: "Enviar a la cola", hacer: (m) => pedirBorrado(u.id, m) }) });
    cuerpo = (
      <>
        <PanelBloques bloques={[{ type: "kv", cols: desk ? 3 : 2, items: [
          { k: "TELÉFONO", v: `${u.phone_b} · ${u.phone_ok ? "Verificado" : "Pide código"}`, fg: u.phone_ok ? undefined : WARN },
          { k: "CORREO", v: u.email ? `${u.email} · ${u.email_ok ? "Verificado" : "Sin verificar"}` : "No dio" },
          { k: "CIUDAD", v: u.ciudad ?? "Sin ciudad" },
          { k: "ROL", v: rol },
          { k: "DESDE", v: fecha(u.creado) },
          { k: "ÚLTIMA VEZ", v: haceUsr(u.visto) },
          { k: "DISPOSITIVOS", v: String(u.dispositivos.length), fg: u.compartidos.length ? BAD : undefined },
        ] }]} />
        {u.compartidos.length ? <A.AdminNote tone="warn" icon="warning" cta="Ver" onCta={() => ir("seguridad")}>{`Comparte dispositivo con ${u.compartidos.length} ${u.compartidos.length === 1 ? "cuenta más" : "cuentas más"}.`}</A.AdminNote> : null}
        <PanelBloques bloques={[{ type: "group", k: "NOTAS INTERNAS", link: P.editar || P.retirar ? "Agregar nota" : undefined, onLink: () => setConf({ titulo: `Nota sobre ${corto}`, sub: "Solo la ve el equipo. El vecino nunca la ve.", cta: "Guardar", hacer: (m) => notaUsuario(u.id, m) }) }]} />
        {u.notas.length ? <A.AdminList rows={u.notas.map((x) => ({ icon: "edit", title: x.text, sub: `${x.quien ?? "Equipo"} · ${fecha(x.at)}` }))} />
          : <A.AdminNote tone="info" icon="edit">Sin notas. Úsalas para lo que el siguiente del equipo necesita saber.</A.AdminNote>}
        {u.negocios.length ? <>
          <PanelBloques bloques={[{ type: "group", k: "SUS NEGOCIOS" }]} />
          <A.AdminList rows={u.negocios.map((n) => ({ icon: "store", title: n.name, sub: `${n.kind === "owner" ? "Dueño" : "Equipo"} · ${n.cat} · ${n.plan === "pro" ? "Pro" : "Free"}`, tag: n.status !== "active" ? n.status.toUpperCase() : undefined, tone: "danger", chevron: true, onClick: () => router.push(`/admin/negocios/${n.id}`) }))} />
        </> : null}
        {acts.length ? <PanelBloques bloques={[{ type: "group", k: "ACCIONES" }, { type: "acts", items: acts.map((a) => ({ ...a, off: pend })) }]} /> : null}
        {intocable && !borrada ? <A.AdminNote tone="info" icon="lock">{u.yoMismo ? "Es tu cuenta: no te sancionas ni te borras desde aquí." : "Es del equipo de To’Latino: para sancionarla o borrarla, quítale el rol en Sistema › Equipo antes."}</A.AdminNote> : null}
      </>);
  }

  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "USUARIO 360°", t: nombre, onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1120 }}>
      <span role="link" onClick={() => router.push("/admin/usuarios")} style={{ display: "flex", alignItems: "center", gap: 6, font: "700 13px Manrope,sans-serif", color: "var(--tl-action)", cursor: "pointer" }}><A.Icon name="chevronLeft" size={15} color="var(--tl-action)" />Usuarios</span>
      <span style={{ font: "700 9.5px 'JetBrains Mono',monospace", letterSpacing: ".14em", color: "rgba(11,14,18,.45)" }}>USUARIO 360°</span>
      <PanelBloques bloques={cab} />
      {avisos}
      <PanelBloques bloques={[tabs]} />
      {cuerpo}
      <PanelBloques bloques={[{ type: "group", k: "HISTORIAL RECIENTE" }]} />
      {historial()}
      <Toast t={toast} desk={desk} />
    </div>
  );
}
