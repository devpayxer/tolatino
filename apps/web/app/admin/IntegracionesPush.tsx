"use client";
/* 8c · Super Admin › Sistema › Integraciones › Push (hueco #7 del plan de la Fase 8: tabs + kpis + rows del sistema, cambios con ConfirmarMotivo).
   Los tres canales (Web Push, APNs, FCM) con su interruptor y de dónde sale su llave (nunca la llave), los teléfonos con avisos por canal y app,
   la cola, lo de las últimas 24 h, los errores agrupados por código, los límites (Configuración › Apps, con motivo) y «Mandar un push de prueba a
   mi teléfono». Sin personas. */
import { PanelBloques, type PanelBloqueT as Bloque, type PanelFila as Fila } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EstadoPushAdmin } from "@/lib/push/admin";
import { pushCanal, pushConfig, pushProbar } from "./acciones-apps";
import type { ResAdm } from "./acciones-colas";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PESTANAS_SISTEMA } from "./sistema/Pestanas";
import { useE } from "./idioma-admin";

const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
type EF = (es: string, en: string) => string;
const PROVE = (E: EF): Record<string, string> => ({ webpush: "Web Push", apns: "APNs", fcm: "FCM", sim: E("Simulado (semilla)", "Simulated (seed)") });
const RESE = (E: EF): Record<string, string> => ({ enviado: E("entregados al proveedor", "delivered to the provider"), pruebas: E("en modo pruebas", "in test mode"), invalido: E("token inválido", "invalid token"), rechazado: E("rechazados", "rejected"), limite: E("límite del proveedor", "provider limit"), error: E("con error", "with errors"), apagado: E("canal apagado", "channel off") });
const cuandoE = (E: EF) => (iso: string) => new Intl.DateTimeFormat(E("es-US", "en-US"), { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function IntegracionesPush({ d, admin }: { d: EstadoPushAdmin; admin: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, E = useE(), PROV = PROVE(E), RES = RESE(E), cuando = cuandoE(E);
  const bi = (b: { es: string; en?: string } | null | undefined) => (b ? E(b.es, b.en || b.es) : "");
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E("Listo.", "Done.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E("SISTEMA · INTEGRACIONES · PUSH", "SYSTEM · INTEGRATIONS · PUSH"), t: "Push", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const tok = (p: string) => d.tokens.filter((x) => x.provider === p).reduce((a, x) => a + x.n, 0);
  const dia = (r: string) => d.dia.filter((x) => x.result === r).reduce((a, x) => a + x.n, 0);
  const B: Bloque[] = [
    { type: "head", eye: E("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E("Integraciones", "Integrations"), s: E("Avisos push propios: el servidor de avisos es nuestro; el último tramo es del sistema del teléfono (APNs en iPhone, FCM en Android, el servicio de push del navegador en la web). Sin costo.", "Our own push notifications: the notification server is ours; the last leg belongs to the phone’s system (APNs on iPhone, FCM on Android, the browser’s push service on the web). No cost."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E(p.l, p.en), on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: E("Llaves de las tiendas", "Store keys"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "selected", onClick: () => undefined },
      { l: "Wallet", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=wallet") }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E("TELÉFONOS CON AVISOS", "PHONES WITH NOTIFICATIONS"), v: String(d.tokens.reduce((a, x) => a + x.n, 0)), s: `Web ${tok("webpush")} · iPhone ${tok("apns")} · Android ${tok("fcm")}${tok("sim") ? ` · ${E("prueba", "test")} ${tok("sim")}` : ""}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E("ENTREGADOS · 24 H", "DELIVERED · 24 H"), v: String(dia("enviado") + dia("pruebas")), s: dia("pruebas") ? E(`${dia("pruebas")} en modo pruebas`, `${dia("pruebas")} in test mode`) : E("al proveedor", "to the provider") },
      { k: E("TOKENS INVÁLIDOS · 24 H", "INVALID TOKENS · 24 H"), v: String(dia("invalido")), s: E("revocados solos (410 / Unregistered)", "revoked automatically (410 / Unregistered)") },
      { k: E("EN COLA", "QUEUED"), v: String(d.cola.pendientes + d.cola.enviando), s: d.cola.reintentos ? E(`${d.cola.reintentos} reintentando${d.cola.vieja_min ? ` · el más viejo hace ${d.cola.vieja_min} min` : ""}`, `${d.cola.reintentos} retrying${d.cola.vieja_min ? ` · oldest ${d.cola.vieja_min} min ago` : ""}`) : E("nada esperando", "nothing waiting"), sFg: d.cola.vieja_min && d.cola.vieja_min > 10 ? "var(--tl-danger)" : undefined },
    ] },
    { type: "note", tone: "info", icon: "info", t: admin ? E("Apagar un canal deja de usarlo al instante: lo que iba por ahí sale por SMS de respaldo cuando la plantilla lo lleva. Cada cambio pide motivo y queda en la auditoría.", "Turning off a channel stops using it immediately: what was going through it goes out by backup SMS when the template has one. Every change asks for a reason and stays in the audit log.") : E("Solo un Admin enciende o apaga un canal o cambia los límites.", "Only an Admin turns a channel on or off or changes the limits.") },
    { type: "group", k: E("CANALES", "CHANNELS") },
    { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.canales.map((c): Fila => ({
      key: c.k, icon: c.k === "webpush" ? "globe" : "phone", t: c.es, s: [c.llave, c.detalle, c.at ? `${E("último cambio", "last change")} ${cuando(c.at)}` : null, !c.on && c.nota ? c.nota : null].filter(Boolean).join(" · "),
      tag: !c.on ? E("APAGADO", "OFF") : c.lista ? E("ENCENDIDO", "ON") : E("SIN LLAVE", "NO KEY"), tone: !c.on ? "action" : c.lista ? "signal" : "neutral",
      ...(admin ? { tgOn: c.on, onTg: () => setConf({ titulo: c.on ? E(`Apagar ${c.es}`, `Turn off ${c.es}`) : E(`Encender ${c.es}`, `Turn on ${c.es}`), cta: c.on ? E("Apagar", "Turn off") : E("Encender", "Turn on"), peligro: c.on,
        sub: c.on ? E("No se encola nada más por este canal y lo pendiente no sale; los avisos con SMS de respaldo salen por SMS.", "Nothing more is queued on this channel and pending items don’t go out; notifications with backup SMS go out by SMS.") : E("Los avisos nuevos vuelven a salir por este canal.", "New notifications go out through this channel again."),
        plantillas: c.on ? [E("El proveedor está fallando", "The provider is failing"), E("Llave comprometida", "Compromised key")] : [E("Ya se corrigió", "Already fixed"), E("Llave nueva subida", "New key uploaded")], nota: "interna", hacer: (m) => pushCanal(c.k, !c.on, m) }) } : {}),
    })) },
    { type: "group", k: E("TELÉFONOS CON AVISOS POR APP Y CANAL", "PHONES WITH NOTIFICATIONS BY APP AND CHANNEL") },
  ];
  if (!d.tokens.length) B.push({ type: "empty", icon: "bell", t: E("Nadie tiene avisos encendidos todavía", "Nobody has notifications on yet"), s: E("Aparecen cuando alguien dice que sí en la hoja previa o enciende «Avisos en este teléfono» en Mi cuenta.", "They show up when someone says yes on the pre-prompt sheet or turns on “Notifications on this phone” in My account.") });
  else B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.tokens.map((x): Fila => ({ key: `${x.provider}-${x.app}`, icon: "bell", t: `${APP[x.app] ?? x.app} · ${PROV[x.provider] ?? x.provider}`, r: String(x.n), s: E(`${x.n} vivos · ${x.n7} vistos en 7 días`, `${x.n} live · ${x.n7} seen in 7 days`) })) });
  B.push({ type: "group", k: E("ÚLTIMAS 24 H POR RESULTADO", "LAST 24 H BY RESULT") });
  B.push(d.dia.length ? { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.dia.map((x): Fila => ({ key: `${x.provider}-${x.result}`, icon: x.result === "enviado" || x.result === "pruebas" ? "check" : "warning", t: `${PROV[x.provider] ?? x.provider} · ${RES[x.result] ?? x.result}`, r: String(x.n) })) }
    : { type: "empty", icon: "clock", t: E("Nada en las últimas 24 horas", "Nothing in the last 24 hours"), s: E("Cada intento queda anotado (sin personas): plantilla, app, plataforma, resultado y código.", "Every attempt is logged (no people): template, app, platform, result and code.") });
  if (d.errores.length) B.push({ type: "group", k: E("ERRORES · 24 H", "ERRORS · 24 H") }, { type: "rows", items: d.errores.map((x): Fila => ({ key: `${x.provider}-${x.code}`, icon: "warning", t: `${PROV[x.provider] ?? x.provider} · ${x.code}`, r: String(x.n), s: `${E("último", "last")} ${cuando(x.ultimo)}` })) });
  B.push({ type: "group", k: E("LÍMITES · CONFIGURACIÓN › APPS", "LIMITS · SETTINGS › APPS") });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: d.cfg.map((k): Fila => ({
    key: k.key, icon: "clock", t: `${bi(k.label)}: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}`, s: `${bi(k.help)} ${E("De", "From")} ${k.min.toLocaleString("en-US")} ${E("a", "to")} ${k.max.toLocaleString("en-US")}${k.cambiado ? ` · ${E("de fábrica", "default")} ${k.def.toLocaleString("en-US")}` : ""}${k.at ? ` · ${E("cambiado", "changed")} ${cuando(k.at)}${k.quien ? ` ${E("por", "by")} ${k.quien}` : ""}` : ""}`,
    ...(admin ? { acts: [{ l: E("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: bi(k.label), cta: E("Guardar", "Save"), sub: E(`Ahora: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}. Entre ${k.min.toLocaleString("en-US")} y ${k.max.toLocaleString("en-US")}.`, `Now: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}. Between ${k.min.toLocaleString("en-US")} and ${k.max.toLocaleString("en-US")}.`),
      valor: { k: bi(k.unidad).toUpperCase(), ini: String(k.v), max: 6 }, plantillas: [E("Ajuste por volumen", "Volume adjustment"), E("Volver al de fábrica", "Back to default")], nota: "interna", hacer: (m, _e, v) => pushConfig(k.key, v, m) }) }] } : {}),
  })) });
  B.push({ type: "acts", items: [{ l: pend ? E("Mandando…", "Sending…") : E("Mandar un push de prueba a mi teléfono", "Send a test push to my phone"), v: "primary", icon: "bell", off: pend, onClick: () => start(async () => { const r = await pushProbar(); setToast(r.mensaje ?? ""); router.refresh(); }) }] });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
