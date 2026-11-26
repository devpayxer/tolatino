"use client";
/* 9j · Super Admin › Sistema › Flags (prototipo secSys «flags»; lib/sistema/flags.ts): cada interruptor con su estado, su alcance y quién lo cambió.
   Los que tienen su pantalla llevan ahí; los demás se encienden o apagan aquí con motivo; los «por ciudad o porcentaje» (scopable) se acotan con el
   editor. Compuesto con PanelBloques y ConfirmarMotivo (patrón 2ao). ES/EN por el idioma del admin. */
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Alcance, CiudadFlag, FlagAdm } from "@/lib/sistema/flags";
import { flagGuardar } from "./acciones-sistema";
import { ConfirmarMotivo, Toast, useAncho, useToast, type Confirmar } from "./Colas";
import { PestanasSistema } from "./sistema/Pestanas";
import { cuandoL, par, selectorIdioma, type L } from "./TextosComun";

export function SistemaFlags({ flags, ciudades, l, editar }: { flags: FlagAdm[]; ciudades: CiudadFlag[]; l: L; editar: boolean }) {
  const { E2 } = par(l), cuando = cuandoL(l), router = useRouter(), w = useAncho(), desk = w >= 1024;
  const [conf, setConf] = useState<Confirmar | null>(null), [toast, setToast] = useToast();
  const [sel, setSel] = useState<FlagAdm | null>(null);
  const [on, setOn] = useState(true), [scope, setScope] = useState<Alcance>("all"), [cities, setCities] = useState<string[]>([]), [pct, setPct] = useState("10");
  const nombre = (id: string) => ciudades.find((c) => c.id === id)?.name ?? id;
  const alcance = (f: Pick<FlagAdm, "scope" | "cities" | "percent">) => f.scope === "all" ? E2("Todas las ciudades", "All cities")
    : f.scope === "city" ? f.cities.map(nombre).join(", ") : `${f.percent} %${f.cities.length ? ` ${E2("en", "in")} ${f.cities.map(nombre).join(", ")}` : ` ${E2("de todas las ciudades", "of all cities")}`}`;
  const hecho = (m: string) => { setToast(m); setConf(null); setSel(null); router.refresh(); };
  const guardar = (f: FlagAdm, c: { enabled: boolean; scope: Alcance; cities: string[]; percent: number }, titulo: string) => setConf({
    titulo, cta: E2("Guardar", "Save"), sub: E2("Aplica al momento en todos los procesos. Queda en la auditoría con tu motivo.", "Applies right away in every process. It goes in the audit log with your reason."),
    plantillas: [E2("Prueba con pocas personas antes de abrirlo a todos.", "Test with a few people before opening it to everyone."), E2("Se apaga mientras se arregla un problema.", "Turned off while a problem is fixed.")],
    nota: "interna", hacer: async (m) => { const r = await flagGuardar(f.key, c.enabled, c.scope, c.cities, c.percent, m); return r.ok ? { ok: true, mensaje: E2(r.msg.es, r.msg.en) } : { ok: false, mensaje: E2(r.msg.es, r.msg.en) }; },
  });
  const cab: Bloque[] = [
    { type: "head", eye: E2("SUPER ADMIN · SISTEMA", "SUPER ADMIN · SYSTEM"), t: E2("Flags", "Flags"), h1: desk ? 26 : 22,
      s: E2("Los interruptores de la plataforma: qué está encendido, dónde y para cuántos. Cada cambio pide motivo y queda en la auditoría.", "The platform switches: what is on, where and for how many. Every change asks for a reason and goes in the audit log.") },
    selectorIdioma(l, router),
  ];
  if (conf) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}>
      <PanelBloques bloques={[{ type: "head", eye: E2("SISTEMA · FLAGS", "SYSTEM · FLAGS"), t: sel?.key ?? "Flags", onBack: () => setConf(null), h1: desk ? 26 : 22 }]} />
      <ConfirmarMotivo c={conf} desk={desk} onBack={() => setConf(null)} onDone={(r) => hecho(r.mensaje ?? E2("Listo.", "Done."))} />
      <Toast t={toast} desk={desk} />
    </div>);
  if (sel) {
    const B: Bloque[] = [
      { type: "head", eye: E2("SISTEMA · FLAGS", "SYSTEM · FLAGS"), t: sel.key, s: sel.note ?? undefined, onBack: () => setSel(null), h1: desk ? 26 : 22 },
      { type: "chips", k: E2("INTERRUPTOR", "SWITCH"), items: [{ l: E2("Encendido", "On"), v: on ? "selected" : "filter", onClick: () => setOn(true) }, { l: E2("Apagado", "Off"), v: !on ? "selected" : "filter", onClick: () => setOn(false) }] },
      { type: "chips", k: E2("ALCANCE", "SCOPE"), items: ([["all", E2("Todas las ciudades", "All cities")], ["city", E2("Por ciudad", "By city")], ["percent", E2("Por porcentaje", "By percentage")]] as [Alcance, string][])
        .map(([k, t]) => ({ l: t, v: scope === k ? "selected" : "filter", onClick: () => setScope(k) })) },
    ];
    if (scope !== "all") B.push({ type: "chips", k: scope === "city" ? E2("CIUDADES", "CITIES") : E2("CIUDADES (NINGUNA = TODAS)", "CITIES (NONE = ALL)"),
      items: ciudades.map((c) => ({ l: c.name, v: cities.includes(c.id) ? "selected" : "filter", onClick: () => setCities((x) => (x.includes(c.id) ? x.filter((y) => y !== c.id) : [...x, c.id])) })) });
    if (scope === "percent") B.push({ type: "field", k: E2("PORCENTAJE DE PERSONAS (1 A 99)", "PERCENTAGE OF PEOPLE (1 TO 99)"), val: pct, onChange: (v) => setPct(v.replace(/\D/g, "").slice(0, 2)), im: "numeric", max: 2, suf: "%",
      help: E2("La misma persona cae siempre del mismo lado: subir de 10 a 20 % suma personas, nunca cambia a las que ya lo tenían.", "The same person always lands on the same side: going from 10 to 20% adds people, it never changes those who already had it.") });
    B.push({ type: "note", tone: "info", icon: "info", t: E2(`Ahora: ${sel.enabled ? "encendido" : "apagado"} · ${alcance(sel)}.`, `Now: ${sel.enabled ? "on" : "off"} · ${alcance(sel)}.`) },
      { type: "acts", items: [{ l: E2("Guardar", "Save"), v: "action", off: (scope === "city" && !cities.length) || (scope === "percent" && !(Number(pct) >= 1 && Number(pct) <= 99)),
        onClick: () => guardar(sel, { enabled: on, scope, cities: scope === "all" ? [] : cities, percent: Number(pct) }, E2(`Cambiar ${sel.key}`, `Change ${sel.key}`)) }] });
    return <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 720 }}><PanelBloques bloques={B} /><Toast t={toast} desk={desk} /></div>;
  }
  const abrir = (f: FlagAdm) => { setSel(f); setOn(f.enabled); setScope(f.scope); setCities(f.cities); setPct(String(f.scope === "percent" ? f.percent : 10)); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <PanelBloques bloques={cab} h1={desk ? 26 : 22} />
      <PestanasSistema on="flags" l={l} />
      <PanelBloques bloques={[
        { type: "note", tone: "info", icon: "info", t: E2("Los que tienen su pantalla (El Compa, las apps, Push, las fichas, el pie de la web) se cambian ahí. Por ciudad o por porcentaje solo los que el código lee persona por persona.", "Those with their own screen (El Compa, the apps, Push, the listings, the web footer) are changed there. By city or percentage only those the code reads person by person.") },
        { type: "rows", k: E2(`${flags.length} INTERRUPTORES`, `${flags.length} FLAGS`), cols: desk ? "repeat(auto-fill,minmax(360px,1fr))" : undefined, items: flags.map((f) => ({
          key: f.key, icon: "bolt", t: f.key,
          s: `${f.note ?? ""}${f.note ? " · " : ""}${f.duenio ? `${E2("Se cambia en", "Changed in")} ${E2(f.duenio.t.es, f.duenio.t.en)}` : alcance(f)}${f.por ? ` · ${f.por} · ${cuando(f.at)}` : ""}`,
          tag: !f.enabled ? E2("APAGADO", "OFF") : f.scope === "all" ? E2("ENCENDIDO", "ON") : f.scope === "city" ? E2("POR CIUDAD", "BY CITY") : `${f.percent} %`,
          tone: !f.enabled ? "neutral" : f.scope === "all" ? "signal" : "action",
          tgOn: f.duenio || f.scopable ? undefined : f.enabled,
          onTg: editar && !f.duenio && !f.scopable ? () => { setSel(f); guardar(f, { enabled: !f.enabled, scope: "all", cities: [], percent: 100 }, f.enabled ? E2(`Apagar ${f.key}`, `Turn off ${f.key}`) : E2(`Encender ${f.key}`, `Turn on ${f.key}`)); } : undefined,
          chev: !!f.duenio || (editar && f.scopable),
          onClick: f.duenio ? () => router.push(f.duenio!.href) : editar && f.scopable ? () => abrir(f) : undefined,
        })) },
      ]} />
      <Toast t={toast} desk={desk} />
    </div>);
}
