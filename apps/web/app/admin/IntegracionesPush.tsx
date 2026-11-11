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

const APP: Record<string, string> = { cliente: "To'Latino", negocio: "Negocios", delivery: "Repartidor", checkin: "Puerta", web: "Web" };
const PROV: Record<string, string> = { webpush: "Web Push", apns: "APNs", fcm: "FCM", sim: "Simulado (semilla)" };
const RES: Record<string, string> = { enviado: "entregados al proveedor", pruebas: "en modo pruebas", invalido: "token inválido", rechazado: "rechazados", limite: "límite del proveedor", error: "con error", apagado: "canal apagado" };
const cuando = (iso: string) => new Intl.DateTimeFormat("es-US", { timeZone: "America/New_York", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/\./g, "");

export function IntegracionesPush({ d, admin }: { d: EstadoPushAdmin; admin: boolean }) {
  const router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast(), [pend, start] = useTransition();
  const hecho = (r: ResAdm) => { setToast(r.mensaje ?? "Listo."); setConf(null); router.refresh(); };
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: "SISTEMA · INTEGRACIONES · PUSH", t: "Push", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={hecho} />
      <Toast t={toast} desk={desk} />
    </div>);
  const tok = (p: string) => d.tokens.filter((x) => x.provider === p).reduce((a, x) => a + x.n, 0);
  const dia = (r: string) => d.dia.filter((x) => x.result === r).reduce((a, x) => a + x.n, 0);
  const B: Bloque[] = [
    { type: "head", eye: "SUPER ADMIN · SISTEMA", t: "Integraciones", s: "Avisos push propios: el servidor de avisos es nuestro; el último tramo es del sistema del teléfono (APNs en iPhone, FCM en Android, el servicio de push del navegador en la web). Sin costo.", h1: desk ? 26 : 22 },
    { type: "tabs", items: PESTANAS_SISTEMA.map((p) => ({ l: p.l, on: p.k === "integ", onClick: () => (p.k === "integ" ? undefined : router.push(p.href)) })) },
    { type: "chips", items: [{ l: "Llaves de las tiendas", v: "filter", onClick: () => router.push("/admin/sistema/integraciones") }, { l: "Push", v: "selected", onClick: () => undefined }] },
    { type: "kpis", cols: desk ? "repeat(4,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", items: [
      { k: "TELÉFONOS CON AVISOS", v: String(d.tokens.reduce((a, x) => a + x.n, 0)), s: `Web ${tok("webpush")} · iPhone ${tok("apns")} · Android ${tok("fcm")}${tok("sim") ? ` · prueba ${tok("sim")}` : ""}`, bg: "var(--tl-ink)", fg: "var(--tl-white)" },
      { k: "ENTREGADOS · 24 H", v: String(dia("enviado") + dia("pruebas")), s: dia("pruebas") ? `${dia("pruebas")} en modo pruebas` : "al proveedor" },
      { k: "TOKENS INVÁLIDOS · 24 H", v: String(dia("invalido")), s: "revocados solos (410 / Unregistered)" },
      { k: "EN COLA", v: String(d.cola.pendientes + d.cola.enviando), s: d.cola.reintentos ? `${d.cola.reintentos} reintentando${d.cola.vieja_min ? ` · el más viejo hace ${d.cola.vieja_min} min` : ""}` : "nada esperando", sFg: d.cola.vieja_min && d.cola.vieja_min > 10 ? "var(--tl-danger)" : undefined },
    ] },
    { type: "note", tone: "info", icon: "info", t: admin ? "Apagar un canal deja de usarlo al instante: lo que iba por ahí sale por SMS de respaldo cuando la plantilla lo lleva. Cada cambio pide motivo y queda en la auditoría." : "Solo un Admin enciende o apaga un canal o cambia los límites." },
    { type: "group", k: "CANALES" },
    { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.canales.map((c): Fila => ({
      key: c.k, icon: c.k === "webpush" ? "globe" : "phone", t: c.es, s: [c.llave, c.detalle, c.at ? `último cambio ${cuando(c.at)}` : null, !c.on && c.nota ? c.nota : null].filter(Boolean).join(" · "),
      tag: !c.on ? "APAGADO" : c.lista ? "ENCENDIDO" : "SIN LLAVE", tone: !c.on ? "action" : c.lista ? "signal" : "neutral",
      ...(admin ? { tgOn: c.on, onTg: () => setConf({ titulo: c.on ? `Apagar ${c.es}` : `Encender ${c.es}`, cta: c.on ? "Apagar" : "Encender", peligro: c.on,
        sub: c.on ? "No se encola nada más por este canal y lo pendiente no sale; los avisos con SMS de respaldo salen por SMS." : "Los avisos nuevos vuelven a salir por este canal.",
        plantillas: c.on ? ["El proveedor está fallando", "Llave comprometida"] : ["Ya se corrigió", "Llave nueva subida"], hacer: (m) => pushCanal(c.k, !c.on, m) }) } : {}),
    })) },
    { type: "group", k: "TELÉFONOS CON AVISOS POR APP Y CANAL" },
  ];
  if (!d.tokens.length) B.push({ type: "empty", icon: "bell", t: "Nadie tiene avisos encendidos todavía", s: "Aparecen cuando alguien dice que sí en la hoja previa o enciende «Avisos en este teléfono» en Mi cuenta." });
  else B.push({ type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.tokens.map((x): Fila => ({ key: `${x.provider}-${x.app}`, icon: "bell", t: `${APP[x.app] ?? x.app} · ${PROV[x.provider] ?? x.provider}`, r: String(x.n), s: `${x.n} vivos · ${x.n7} vistos en 7 días` })) });
  B.push({ type: "group", k: "ÚLTIMAS 24 H POR RESULTADO" });
  B.push(d.dia.length ? { type: "rows", cols: desk ? "repeat(3,minmax(0,1fr))" : "1fr", items: d.dia.map((x): Fila => ({ key: `${x.provider}-${x.result}`, icon: x.result === "enviado" || x.result === "pruebas" ? "check" : "warning", t: `${PROV[x.provider] ?? x.provider} · ${RES[x.result] ?? x.result}`, r: String(x.n) })) }
    : { type: "empty", icon: "clock", t: "Nada en las últimas 24 horas", s: "Cada intento queda anotado (sin personas): plantilla, app, plataforma, resultado y código." });
  if (d.errores.length) B.push({ type: "group", k: "ERRORES · 24 H" }, { type: "rows", items: d.errores.map((x): Fila => ({ key: `${x.provider}-${x.code}`, icon: "warning", t: `${PROV[x.provider] ?? x.provider} · ${x.code}`, r: String(x.n), s: `último ${cuando(x.ultimo)}` })) });
  B.push({ type: "group", k: "LÍMITES · CONFIGURACIÓN › APPS" });
  B.push({ type: "rows", cols: desk ? "repeat(2,minmax(0,1fr))" : "1fr", items: d.cfg.map((k): Fila => ({
    key: k.key, icon: "clock", t: `${k.label.es}: ${k.v.toLocaleString("en-US")} ${k.unidad.es}`, s: `${k.help?.es ?? ""} De ${k.min.toLocaleString("en-US")} a ${k.max.toLocaleString("en-US")}${k.cambiado ? ` · de fábrica ${k.def.toLocaleString("en-US")}` : ""}${k.at ? ` · cambiado ${cuando(k.at)}${k.quien ? ` por ${k.quien}` : ""}` : ""}`,
    ...(admin ? { acts: [{ l: "Cambiar", icon: "edit", onClick: () => setConf({ titulo: k.label.es, cta: "Guardar", sub: `Ahora: ${k.v.toLocaleString("en-US")} ${k.unidad.es}. Entre ${k.min.toLocaleString("en-US")} y ${k.max.toLocaleString("en-US")}.`,
      valor: { k: k.unidad.es.toUpperCase(), ini: String(k.v), max: 6 }, plantillas: ["Ajuste por volumen", "Volver al de fábrica"], hacer: (m, _e, v) => pushConfig(k.key, v, m) }) }] } : {}),
  })) });
  B.push({ type: "acts", items: [{ l: pend ? "Mandando…" : "Mandar un push de prueba a mi teléfono", v: "primary", icon: "bell", off: pend, onClick: () => start(async () => { const r = await pushProbar(); setToast(r.mensaje ?? ""); router.refresh(); }) }] });
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}><PanelBloques bloques={B} h1={desk ? 26 : 22} /><Toast t={toast} desk={desk} /></div>;
}
