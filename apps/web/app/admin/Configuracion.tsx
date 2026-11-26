"use client";
/* 5i · Super Admin › Sistema › Configuración (Super Admin.dc.html secSys sub «cfg»; hueco #10 del plan de la Fase 5): los valores de
   config_keys por sección, cada uno con su unidad, su valor de fábrica y sus límites; «CAMBIADO» si no es el de fábrica. Tocar una fila
   (solo un Admin) pide el valor nuevo y el motivo; el servidor revisa los límites y deja la auditoría antes → después. Lo que todavía no
   se cambia aquí (un texto que ve la persona dice el número) se ve con su motivo; lo que se cambia en otra pantalla, con «Ir». */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FilaConfig, Seccion } from "@/lib/config";
import { configCambiar, configModelo } from "./acciones-config";
import type { ModeloPapel } from "@/lib/compa/admin-compa";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { useE2 } from "./idioma-admin";

const SECCION: Record<Seccion, string> = {
  comunidad: "COMUNIDAD", gamificacion: "GAMIFICATION", salud_pro: "DOCTORES Y PROFESIONALES", hogar_auto: "HOGAR Y AUTO · PRE-ESTIMADO, PRESUPUESTO, EMERGENCIA Y APARTADO", noche: "NOCHE", edu: "EDUCACIÓN · NIÑOS · DEPORTE", fe_inm_autos: "IGLESIAS · BIENES RAÍCES · AUTOS", eventos: "EVENTOS", compa: "EL COMPA", soporte: "SOPORTE", apps: "APPS",
  retencion: "RETENCIÓN · CUÁNTO SE GUARDA", crecimiento: "CRECIMIENTO", negocios: "NEGOCIOS · LA PÁGINA DEL NEGOCIO",
  dinero: "DINERO · PLAN FREE, PAGOS AL BANCO, CONCILIACIÓN Y ALERTAS",
  avisos: "AVISOS Y CANALES · SMS, WHATSAPP Y CORREO",
  ciudades: "CIUDADES · EL AVISO DE APERTURA",
  despliegues: "DESPLIEGUES · VUELTA ATRÁS Y MANTENIMIENTO",
  repartidor: "REPARTIDOR · OFERTAS Y PRUEBA DE ENTREGA",
  colas: "COLAS · PLAZOS Y CASOS TOMADOS",
};
// 9f-4 · Los nombres de las secciones en inglés (la persona del equipo con la app en inglés).
const SECCION_EN: Record<string, string> = {
  COMUNIDAD: "COMMUNITY", "DOCTORES Y PROFESIONALES": "DOCTORS AND PROFESSIONALS", "HOGAR Y AUTO · PRE-ESTIMADO, PRESUPUESTO, EMERGENCIA Y APARTADO": "HOME AND AUTO · PRE-ESTIMATE, QUOTE, EMERGENCY AND HOLDS", NOCHE: "NIGHTLIFE",
  "EDUCACIÓN · NIÑOS · DEPORTE": "EDUCATION · KIDS · SPORTS", "IGLESIAS · BIENES RAÍCES · AUTOS": "CHURCHES · REAL ESTATE · CARS", EVENTOS: "EVENTS", SOPORTE: "SUPPORT", "RETENCIÓN · CUÁNTO SE GUARDA": "RETENTION · HOW LONG IT’S KEPT",
  CRECIMIENTO: "GROWTH", "NEGOCIOS · LA PÁGINA DEL NEGOCIO": "BUSINESSES · THE BUSINESS PAGE", "DINERO · PLAN FREE, PAGOS AL BANCO, CONCILIACIÓN Y ALERTAS": "MONEY · FREE PLAN, PAYOUTS, RECONCILIATION AND ALERTS", "AVISOS Y CANALES · SMS, WHATSAPP Y CORREO": "NOTIFICATIONS AND CHANNELS · SMS, WHATSAPP AND EMAIL",
  "CIUDADES · EL AVISO DE APERTURA": "CITIES · THE LAUNCH NOTICE", "DESPLIEGUES · VUELTA ATRÁS Y MANTENIMIENTO": "DEPLOYS · ROLLBACK AND MAINTENANCE", "REPARTIDOR · OFERTAS Y PRUEBA DE ENTREGA": "DRIVER · OFFERS AND PROOF OF DELIVERY",
  "COLAS · PLAZOS Y CASOS TOMADOS": "QUEUES · DEADLINES AND TAKEN CASES", "EVENTOS · PUBLICAR Y REVISAR": "EVENTS · PUBLISH AND REVIEW", "EVENTOS · RSVP Y VENTA": "EVENTS · RSVP AND SALES", "EVENTOS · DESPUÉS DE COMPRAR": "EVENTS · AFTER PURCHASE",
  "EVENTOS · CAMBIOS Y PAGO AL ORGANIZADOR": "EVENTS · CHANGES AND ORGANIZER PAYOUT", "EVENTOS · AVISOS Y RECORDATORIOS": "EVENTS · NOTICES AND REMINDERS", "EVENTOS · LA PUERTA": "EVENTS · THE DOOR", "EVENTOS · EVENTO PRIVADO": "EVENTS · PRIVATE EVENT", "EVENTOS · CONFIANZA": "EVENTS · TRUST",
};
/* 9d · Retención: todo lo que dice cuánto se guarda algo (las claves nuevas de 0134 y las retenciones que ya corrían en su sección: El Compa,
   los errores, la ruta, la analítica, las notas privadas…) se ve junto aquí, cada una con sus límites. */
const RETIENE = /^(retener_|export_|purga_lote$)|_retener_(dias|meses)$|_purga_dias$/;
/* 6j · Configuración › Eventos: las ~50 claves de la Fase 6 en subgrupos (lo que cubre cada una). */
const SUB_EVT: [string, RegExp][] = [
  ["EVENTOS · PUBLICAR Y REVISAR", /^evt_(revision_h|fechas_max|dias_adelante|fotos_max|dias_seguidos_max)$/],
  ["EVENTOS · RSVP Y VENTA", /^(rsvp_guarda_min|evt_apartado_min|evt_boletos_por_orden_max|evt_boletos_persona_fecha_max|evt_codigo_intentos_max|evt_apartados_vivos_max)$/],
  ["EVENTOS · DESPUÉS DE COMPRAR", /^(bol_transferir_h|bol_cancelar_h|espera_oferta_min|evt_cortesias_max|bol_transferencias_dia_max)$/],
  ["EVENTOS · CAMBIOS Y PAGO AL ORGANIZADOR", /^evt_(aviso_max|pago_dia|retener_nuevo_cents|cancelaciones_confianza|cancelaciones_dias|ajuste_dias|cancelar_lote)$/],
  ["EVENTOS · AVISOS Y RECORDATORIOS", /^evt_(recordatorio_hora|aforo_aviso_pct)$/],
  ["EVENTOS · LA PUERTA", /^puerta_/],
  ["EVENTOS · EVENTO PRIVADO", /^evp_/],
  ["EVENTOS · CONFIANZA", /^evt_senal_/],
];
let EN = false;
const bi = (b: { es: string; en?: string } | null | undefined) => (b ? (EN ? b.en || b.es : b.es) : "");
const fmt = (f: { key: string; unidad: { es: string; en?: string } }, v: number) => (f.key.endsWith("_cents") ? `$${(v / 100).toFixed(2)}` : `${v.toLocaleString("en-US")} ${bi(f.unidad)}`);
const cuando = (iso: string) => new Intl.DateTimeFormat(EN ? "en-US" : "es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

type Modelos = { papeles: ModeloPapel[]; modelos: { id: string; label: string; entrada: number; salida: number }[] };
export function Configuracion({ filas, admin, autoOcultar, modelos = null, horario = null }: { filas: FilaConfig[]; admin: boolean; autoOcultar: { reportes: number; horas: number } | null;
  modelos?: Modelos | null; horario?: string | null }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2();
  EN = E2("", "x") === "x"; const secL = (k: string) => (EN ? SECCION_EN[k] ?? k : k);
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Guardado.", "Saved.")); setConf(null); router.refresh(); };
  const tabs: Bloque = { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: EN ? p.en : p.l, on: p.k === "cfg", onClick: () => (p.k === "cfg" ? undefined : router.push(p.href)) })) };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SISTEMA", "SYSTEM"), t: E2("Configuración", "Settings"), onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const editar = (f: FilaConfig) => {
    if (f.editIn) return router.push(f.editIn);
    if (!f.editable) return setToast(`${E2("Todavía no se cambia aquí", "Can’t be changed here yet")}: ${bi(f.bloqueo)}`);
    if (!admin) return setToast(E2("Solo un Admin cambia la configuración.", "Only an Admin changes settings."));
    setConf({
      titulo: bi(f.label), cta: E2("Guardar", "Save"),
      sub: E2(`Ahora: ${fmt(f, f.v)} · de fábrica: ${fmt(f, f.def)} · de ${fmt(f, f.min)} a ${fmt(f, f.max)}. Aplica desde ahora en todas las ciudades. El motivo queda en la auditoría.`, `Now: ${fmt(f, f.v)} · default: ${fmt(f, f.def)} · from ${fmt(f, f.min)} to ${fmt(f, f.max)}. Applies from now on in every city. The reason stays in the audit log.`),
      valor: { k: E2(`VALOR NUEVO (${bi(f.unidad).toUpperCase()})`, `NEW VALUE (${bi(f.unidad).toUpperCase()})`), ini: String(f.v), max: 7 },
      plantillas: [E2("Lo pidió el fundador", "The founder asked for it"), E2("Ajuste con datos reales", "Adjusted with real data"), E2("Volver al de fábrica", "Back to default")],
      nota: "interna", hacer: (m, _e, v) => configCambiar(f.key, v, m),
    });
  };
  const B: Bloque[] = [
    { type: "head", eye: E2("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E2("Configuración", "Settings"), s: E2("Plazos y límites de la plataforma, cada uno con sus límites. Cambiar un valor aplica a todas las ciudades y queda en la auditoría con antes → después.", "Platform deadlines and limits, each with its bounds. Changing a value applies to every city and stays in the audit log with before → after."), h1: desk ? 26 : 22 },
    tabs,
    { type: "note", tone: "info", icon: "info", t: E2(`Moneda: USD · Hora: la de cada ciudad. ${admin ? "Toca un valor para cambiarlo." : "Solo un Admin cambia la configuración."}`, `Currency: USD · Time: each city’s. ${admin ? "Tap a value to change it." : "Only an Admin changes settings."}`) },
  ];
  for (const sec of Object.keys(SECCION) as Seccion[]) {
    const T = filas.filter((f) => (sec === "retencion" ? f.seccion === sec || RETIENE.test(f.key) : f.seccion === sec && !RETIENE.test(f.key)));
    if (!T.length) continue;
    // 6j · Eventos va en subgrupos (y lo que no cae en uno, al final con el nombre de la sección).
    const grupos: [string, FilaConfig[]][] = sec === "eventos"
      ? [...SUB_EVT.map(([k, re]): [string, FilaConfig[]] => [k, T.filter((f) => re.test(f.key))]), [SECCION[sec], T.filter((f) => !SUB_EVT.some(([, re]) => re.test(f.key)))]]
      : [[SECCION[sec], T]];
    for (const [gk, L] of grupos) {
    if (!L.length) continue;
    B.push({ type: "group", k: secL(gk) });
    const items: { key: string; icon: string; t: string; r: string; s: string; tag: string | null; tone: string; dim: boolean; chev: boolean; onClick: () => void }[] = L.map((f) => ({
      key: f.key as string, icon: f.editable ? "edit" : "lock", t: desk ? bi(f.label) : `${bi(f.label)} · ${fmt(f, f.v)}`, r: desk ? fmt(f, f.v) : "",
      s: [bi(f.help), f.editable ? E2(`De fábrica ${fmt(f, f.def)} · de ${fmt(f, f.min)} a ${fmt(f, f.max)}`, `Default ${fmt(f, f.def)} · from ${fmt(f, f.min)} to ${fmt(f, f.max)}`) : `${E2("No se cambia todavía", "Can’t be changed yet")}: ${bi(f.bloqueo)}`, f.editIn ? E2("Se cambia en su pantalla", "Changed on its own screen") : null,
        f.at ? `${E2("Último cambio", "Last change")}: ${f.quien ?? E2("equipo", "team")} · ${cuando(f.at)}` : null].filter(Boolean).join(" · "),
      tag: f.cambiado ? E2("CAMBIADO", "CHANGED") : !f.editable ? E2("SOLO LECTURA", "READ ONLY") : null, tone: f.cambiado ? "action" : "neutral", dim: !f.editable,
      chev: f.editable && (admin || !!f.editIn), onClick: () => editar(f),
    }));
    if (sec === "comunidad" && autoOcultar) items.push({ key: "autohide", icon: "shield", t: desk ? E2("Auto-ocultar por reportes", "Auto-hide by reports") : `${E2("Auto-ocultar por reportes", "Auto-hide by reports")} · ${autoOcultar.reportes} ${E2("en", "in")} ${autoOcultar.horas} h`, r: desk ? `${autoOcultar.reportes} ${E2("en", "in")} ${autoOcultar.horas} h` : "",
      s: E2("Es un parámetro de su regla: se cambia en Contenido › Auto-moderación, junto con el interruptor de la regla.", "It’s a parameter of its rule: change it in Content › Auto-moderation, with the rule’s switch."), tag: null, tone: "neutral", dim: false, chev: true, onClick: () => router.push("/admin/contenido?tab=auto") });
    // 7i · Soporte: cómo dicen las pantallas el horario del equipo con estos números («lunes a viernes, de 9 AM a 6 PM»).
    if (sec === "soporte" && horario) B.push({ type: "note", tone: "info", icon: "clock", t: E2(`Las pantallas de Soporte y El Compa dicen: «El equipo atiende ${horario}» (hora de cada ciudad). Cambia con los días y las horas de abajo.`, `The Support and El Compa screens say: “The team is available ${horario}” (each city’s time). It changes with the days and hours below.`) });
    B.push({ type: "rows", cols: desk ? "repeat(auto-fill,minmax(420px,1fr))" : "1fr", items });
    // 7i · El Compa: el modelo de cada papel, de los encendidos en la lista de precios (compa_models); motivo y auditoría.
    if (sec === "compa" && gk === SECCION.compa && modelos) {
      const PAPEL: Record<string, [string, string]> = { cotidiano: [E2("Modelo de vecinos, panel y respuestas", "Model for neighbors, dashboard and replies"), E2("El más barato que cumpla (decisión F).", "The cheapest that does the job (decision F).")], copiloto: [E2("Modelo del copiloto del equipo", "Team copilot model"), E2("Uno mayor, solo para los borradores de Soporte.", "A larger one, only for Support drafts.")] };
      const cambiarM = (p: ModeloPapel) => {
        if (!admin) return setToast(E2("Solo un Admin cambia la configuración.", "Only an Admin changes settings."));
        const otros = modelos.modelos.filter((m) => m.id !== p.id);
        if (!otros.length) return setToast(E2("No hay otro modelo encendido en la lista de precios.", "No other model is on in the price list."));
        setConf({ titulo: PAPEL[p.papel]![0], cta: E2("Guardar", "Save"), elegir: { label: E2("MODELO", "MODEL"), items: otros.map((m) => ({ k: m.id, l: `${m.label} · $${m.entrada.toFixed(2)} / $${m.salida.toFixed(2)} ${E2("por millón de tokens", "per million tokens")}` })) },
          sub: E2(`Ahora: ${p.label ?? "ninguno"}. Solo los modelos encendidos en la lista de precios; el precio de cada uno no se escribe en el código. Vale desde la próxima llamada y queda en la auditoría.`, `Now: ${p.label ?? "none"}. Only models on in the price list; each one’s price isn’t written in the code. It applies from the next call and stays in the audit log.`),
          plantillas: [E2("Lo pidió el fundador", "The founder asked for it"), E2("Mejor calidad al mismo costo", "Better quality at the same cost"), E2("Bajar el gasto", "Lower spending")], nota: "interna", hacer: (m, e) => configModelo(p.papel, e ?? "", m) });
      };
      B.push({ type: "rows", k: E2("MODELO DE CADA PAPEL", "MODEL FOR EACH ROLE"), cols: desk ? "repeat(auto-fill,minmax(420px,1fr))" : "1fr", items: modelos.papeles.map((p) => ({
        key: `modelo-${p.papel}`, icon: admin ? "edit" : "lock", t: desk ? PAPEL[p.papel]![0] : `${PAPEL[p.papel]![0]} · ${p.label ?? E2("ninguno", "none")}`, r: desk ? p.label ?? E2("ninguno", "none") : "",
        s: `${PAPEL[p.papel]![1]} ${E2("De los modelos encendidos en la lista de precios.", "From the models on in the price list.")}`, tag: null, tone: "neutral", dim: false, chev: admin, onClick: () => cambiarM(p) })) });
    }
    }
  }
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}

/* dinero fijo: super admin (cifras de contabilidad del equipo, siempre con dos decimales) */
