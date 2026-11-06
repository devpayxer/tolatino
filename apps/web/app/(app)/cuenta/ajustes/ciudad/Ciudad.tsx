"use client";
/* USR-CIUDAD (diseño «To'Latino Mi cuenta» · cityV): tu ciudad con sus negocios, desde cuándo y cuándo la puedes cambiar
   (cada 30 días), y a cuál: solo las ciudades abiertas. Para mirar otra ciudad no hace falta cambiarla. */
import { useRouter } from "next/navigation";
import type { ciudadDe } from "@/lib/perfil";
import { ciudadCambiar } from "../../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../../Marco";

type C = Awaited<ReturnType<typeof ciudadDe>>;
export function Ciudad({ c, es, yo }: { c: C; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat(es ? "es-US" : "en-US", { timeZone: "America/New_York", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "—");
  const yo1 = c.abiertas.find((x) => x.id === c.id);
  const cambiar = (id: string, name: string) => ui.setHoja({ title: E2(`¿Cambiar tu ciudad a ${name}?`, `Change your city to ${name}?`), sub: E2("La puedes volver a cambiar en 30 días.", "You can change it again in 30 days."), yes: E2("Cambiar", "Change"),
    onYes: async () => { const r = await ciudadCambiar(id).catch(() => null); if (r?.ok) { ui.toast(E2(`Tu ciudad ahora es ${name}.`, `Your city is now ${name}.`)); router.refresh(); } else ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo.", "Could not do it.")); } });
  const B: Bloque[] = [
    { type: "rows", rows: [{ ic: "pin", t: c.name ? `${c.name}, PA` : E2("Sin ciudad", "No city"), s: `${yo1 ? `${yo1.negocios} ${E2("NEGOCIOS", "BUSINESSES")}` : ""}`, tag: c.ok ? null : [E2("BLOQUEADA 30 DÍAS", "LOCKED 30 DAYS"), "neutral"] }] },
    { type: "kv", kw: "140px", rows: [{ k: E2("DESDE", "SINCE"), v: fecha(c.desde) }, { k: E2("PUEDES CAMBIARLA", "YOU CAN CHANGE IT"), v: c.ok ? E2("Ahora", "Now") : fecha(c.puede) }] },
  ];
  const otras = c.abiertas.filter((x) => x.id !== c.id);
  if (otras.length) B.push({ type: "sec", t: E2("Ciudades abiertas", "Open cities"), fs: "14px" }, { type: "rows", rows: otras.map((x) => ({ key: x.id, ic: "pin", t: `${x.name}, PA`, s: `${x.negocios} ${E2("NEGOCIOS", "BUSINESSES")}`,
    acts: [[c.ok ? E2("Cambiar a esta", "Switch to this one") : E2(`Desde el ${fecha(c.puede)}`, `From ${fecha(c.puede)}`), "secondary", () => (c.ok ? cambiar(x.id, x.name) : ui.toast(E2("Tu ciudad se cambia cada 30 días.", "Your city can change every 30 days.")))]] as [string, string, () => void][] })) });
  else B.push({ type: "note", tone: "info", ic: "info", s: E2("Por ahora hay una sola ciudad abierta. Las demás abren pronto: en el selector de ciudad del inicio te puedes anotar.", "For now there is only one open city. The others open soon: you can sign up from the city selector on home.") });
  B.push({ type: "note", tone: "info", ic: "globe", s: E2("Para mirar negocios de otra ciudad no hace falta cambiarla: usa el selector de ciudad del inicio.", "To browse businesses elsewhere you do not need to change it: use the city selector on home."), a: E2("Mirar otra ciudad", "Browse another city"), onA: () => router.push("/ciudad") });
  return <Marco es={es} code="USR-CIUDAD" back="/cuenta/ajustes" t={E2("Mi ciudad", "My city")} s={(c.name ? `${c.name}, PA` : "").toUpperCase()} blocks={B} yo={yo} ui={ui} />;
}
