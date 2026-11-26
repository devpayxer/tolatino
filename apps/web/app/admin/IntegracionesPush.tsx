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
import { useE2 } from "./idioma-admin";

const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
type EF = (es: string, en: string) => string;
const PROVE = (E2: EF): Record<string, string> => ({ webpush: "Web Push", apns: "APNs", fcm: "FCM", sim: E2("Simulado (semilla)", "Simulated (seed)") });
const RESE = (E2: EF): Record<string, string> => ({ enviado: E2("entregados al proveedor", "delivered to the provider"), pruebas: E2("en modo pruebas", "in test mode"), invalido: E2("token inválido", "invalid token"), rechazado: E2("rechazados", "rejected"), limite: E2("límite del proveedor", "provider limit"), error: E2("con error", "with errors"), apagado: E2("canal apagado", "channel off") });
const cuandoE = (E2: EF) => (iso: string) => new Intl.DateTimeFormat((E2("", "x") === "x" ? "en-US" : "es-US"), { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function IntegracionesPush({ d, admin }: { d: EstadoPushAdmin; admin: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024, { E2 } = useE2(), PROV = PROVE(E2), RES = RESE(E2), cuando = cuandoE(E2);
  const bi = (b: { es: string; en?: string } | null | undefined) => (b ? E2(b.es, b.en || b.es) : "");
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? E2("Listo.", "Done.")); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SISTEMA · INTEGRACIONES · PUSH", "SYSTEM · INTEGRATIONS · PUSH"), t: "Push", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const tok = (p: string) => d.tokens.filter((x) => x.provider === p).reduce((a, x) => a + x.n, 0);
  const dia = (r: string) => d.dia.filter((x) => x.result === r).reduce((a, x) => a + x.n, 0);
  const B: Bloque[] = [
    { type: "head", eye: E2("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E2("Integraciones", "Integrations"), s: E2("Avisos push propios: el servidor de avisos es nuestro; el último tramo es del sistema del teléfono (APNs en iPhone, FCM en Android, el servicio de push del navegador en la web). Sin costo.", "Our own push notifications: the notification server is ours; the last leg belongs to the phone’s system (APNs on iPhone, FCM on Android, the browser’s push service on the web). No cost."), h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: E2(p.l, p.en), on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: E2("Llaves de las tiendas", "Store keys"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "selected", onClick: () => undefined },
      { l: "Wallet", v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=wallet") }, { l: E2("Proveedores", "Providers"), v: "filter", onClick: () => router.push("/admin/sistema/integraciones?tab=proveedores") }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: E2("TELÉFONOS CON AVISOS", "PHONES WITH NOTIFICATIONS"), v: String(d.tokens.reduce((a, x) => a + x.n, 0)), s: `Web ${tok("webpush")} · iPhone ${tok("apns")} · Android ${tok("fcm")}${tok("sim") ? ` · ${E2("prueba", "test")} ${tok("sim")}` : ""}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: E2("ENTREGADOS · 24 H", "DELIVERED · 24 H"), v: String(dia("enviado") + dia("pruebas")), s: dia("pruebas") ? E2(`${dia("pruebas")} en modo pruebas`, `${dia("pruebas")} in test mode`) : E2("al proveedor", "to the provider") },
      { k: E2("TOKENS INVÁLIDOS · 24 H", "INVALID TOKENS · 24 H"), v: String(dia("invalido")), s: E2("revocados solos (410 / Unregistered)", "revoked automatically (410 / Unregistered)") },
      { k: E2("EN COLA", "QUEUED"), v: String(d.cola.pendientes + d.cola.enviando), s: d.cola.reintentos ? E2(`${d.cola.reintentos} reintentando${d.cola.vieja_min ? ` · el más viejo hace ${d.cola.vieja_min} min` : ""}`, `${d.cola.reintentos} retrying${d.cola.vieja_min ? ` · oldest ${d.cola.vieja_min} min ago` : ""}`) : E2("nada esperando", "nothing waiting"), sFg: d.cola.vieja_min && d.cola.vieja_min > 10 ? "var(--tl-danger)" : undefined },
    ] },
    { type: "note", tone: "info", icon: "info", t: admin ? E2("Apagar un canal deja de usarlo al instante: lo que iba por ahí sale por SMS de respaldo cuando la plantilla lo lleva. Cada cambio pide motivo y queda en la auditoría.", "Turning off a channel stops using it immediately: what was going through it goes out by backup SMS when the template has one. Every change asks for a reason and stays in the audit log.") : E2("Solo un Admin enciende o apaga un canal o cambia los límites.", "Only an Admin turns a channel on or off or changes the limits.") },
    { type: "group", k: E2("CANALES", "CHANNELS") },
    { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.canales.map((c): Fila => ({
      key: c.k, icon: c.k === "webpush" ? "globe" : "phone", t: c.es, s: [c.llave, c.detalle, c.at ? `${E2("último cambio", "last change")} ${cuando(c.at)}` : null, !c.on && c.nota ? c.nota : null].filter(Boolean).join(" · "),
      tag: !c.on ? E2("APAGADO", "OFF") : c.lista ? E2("ENCENDIDO", "ON") : E2("SIN LLAVE", "NO KEY"), tone: !c.on ? "action" : c.lista ? "signal" : "neutral",
      ...(admin ? { tgOn: c.on, onTg: () => setConf({ titulo: c.on ? E2(`Apagar ${c.es}`, `Turn off ${c.es}`) : E2(`Encender ${c.es}`, `Turn on ${c.es}`), cta: c.on ? E2("Apagar", "Turn off") : E2("Encender", "Turn on"), peligro: c.on,
        sub: c.on ? E2("No se encola nada más por este canal y lo pendiente no sale; los avisos con SMS de respaldo salen por SMS.", "Nothing more is queued on this channel and pending items don’t go out; notifications with backup SMS go out by SMS.") : E2("Los avisos nuevos vuelven a salir por este canal.", "New notifications go out through this channel again."),
        plantillas: c.on ? [E2("El proveedor está fallando", "The provider is failing"), E2("Llave comprometida", "Compromised key")] : [E2("Ya se corrigió", "Already fixed"), E2("Llave nueva subida", "New key uploaded")], nota: "interna", hacer: (m) => pushCanal(c.k, !c.on, m) }) } : {}),
    })) },
    { type: "group", k: E2("TELÉFONOS CON AVISOS POR APP Y CANAL", "PHONES WITH NOTIFICATIONS BY APP AND CHANNEL") },
  ];
  if (!d.tokens.length) B.push({ type: "empty", icon: "bell", t: E2("Nadie tiene avisos encendidos todavía", "Nobody has notifications on yet"), s: E2("Aparecen cuando alguien dice que sí en la hoja previa o enciende «Avisos en este teléfono» en Mi cuenta.", "They show up when someone says yes on the pre-prompt sheet or turns on “Notifications on this phone” in My account.") });
  else B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.tokens.map((x): Fila => ({ key: `${x.provider}-${x.app}`, icon: "bell", t: `${APP[x.app] ?? x.app} · ${PROV[x.provider] ?? x.provider}`, r: String(x.n), s: E2(`${x.n} vivos · ${x.n7} vistos en 7 días`, `${x.n} live · ${x.n7} seen in 7 days`) })) });
  B.push({ type: "group", k: E2("ÚLTIMAS 24 H POR RESULTADO", "LAST 24 H BY RESULT") });
  B.push(d.dia.length ? { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.dia.map((x): Fila => ({ key: `${x.provider}-${x.result}`, icon: x.result === "enviado" || x.result === "pruebas" ? "check" : "warning", t: `${PROV[x.provider] ?? x.provider} · ${RES[x.result] ?? x.result}`, r: String(x.n) })) }
    : { type: "empty", icon: "clock", t: E2("Nada en las últimas 24 horas", "Nothing in the last 24 hours"), s: E2("Cada intento queda anotado (sin personas): plantilla, app, plataforma, resultado y código.", "Every attempt is logged (no people): template, app, platform, result and code.") });
  if (d.errores.length) B.push({ type: "group", k: E2("ERRORES · 24 H", "ERRORS · 24 H") }, { type: "rows", items: d.errores.map((x): Fila => ({ key: `${x.provider}-${x.code}`, icon: "warning", t: `${PROV[x.provider] ?? x.provider} · ${x.code}`, r: String(x.n), s: `${E2("último", "last")} ${cuando(x.ultimo)}` })) });
  B.push({ type: "group", k: E2("LÍMITES · CONFIGURACIÓN › APPS", "LIMITS · SETTINGS › APPS") });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: d.cfg.map((k): Fila => ({
    key: k.key, icon: "clock", t: `${bi(k.label)}: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}`, s: `${bi(k.help)} ${E2("De", "From")} ${k.min.toLocaleString("en-US")} ${E2("a", "to")} ${k.max.toLocaleString("en-US")}${k.cambiado ? ` · ${E2("de fábrica", "default")} ${k.def.toLocaleString("en-US")}` : ""}${k.at ? ` · ${E2("cambiado", "changed")} ${cuando(k.at)}${k.quien ? ` ${E2("por", "by")} ${k.quien}` : ""}` : ""}`,
    ...(admin ? { acts: [{ l: E2("Cambiar", "Change"), icon: "edit", onClick: () => setConf({ titulo: bi(k.label), cta: E2("Guardar", "Save"), sub: E2(`Ahora: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}. Entre ${k.min.toLocaleString("en-US")} y ${k.max.toLocaleString("en-US")}.`, `Now: ${k.v.toLocaleString("en-US")} ${bi(k.unidad)}. Between ${k.min.toLocaleString("en-US")} and ${k.max.toLocaleString("en-US")}.`),
      valor: { k: bi(k.unidad).toUpperCase(), ini: String(k.v), max: 6 }, plantillas: [E2("Ajuste por volumen", "Volume adjustment"), E2("Volver al de fábrica", "Back to default")], nota: "interna", hacer: (m, _e, v) => pushConfig(k.key, v, m) }) }] } : {}),
  })) });
  B.push({ type: "acts", items: [{ l: pend ? E2("Mandando…", "Sending…") : E2("Mandar un push de prueba a mi teléfono", "Send a test push to my phone"), v: "primary", icon: "bell", off: pend, onClick: () => start(async () => { const r = await pushProbar(); setToast(r.mensaje ?? ""); router.refresh(); }) }] });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
