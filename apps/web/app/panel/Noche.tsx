"use client";
/* Lo que vendes › Tu herramienta de Noche («Esta noche»). Diseño: Panel v2 · dash2-cat.js TOOLS['NEG-NOCHE'] (blocksC L387–396,
   summary L322); plan fase4-noche.md §4na y §5. Cover de esta noche (o del próximo día que abre) −/+ $5, «después de cierta hora»
   (solo si sube), las 3 próximas noches que abre si son distintas, edad, lista de la noche, la fila AHORA (se ve en vivo y dura 60
   min), la música, quién toca y el código de vestimenta (huecos #5 del diseño, compuestos con field), el tope de la lista y las
   REGLAS · NO SE APAGAN con candado. Cada toque se guarda en el servidor (acciones-noche.ts) con su historia. */
import type { PanelBloqueT as Bloque, PanelFila as Fila } from "@tolatino/ui";
import { diaNoche, FILAS, hNoche, LISTA_HORAS, MUSICA, resumenNoche, tituloNoche, usdN, type HerrNoche, type NocheIn } from "@/lib/noche-comun";
import { nocheFila, nocheGuardar } from "./acciones-noche";
import type { Ctx, Sec } from "./Panel";

const lock = (t: string, s: string): Fila => ({ icon: "lock", ibg: "rgba(11,14,18,.06)", ifg: "var(--tl-ink)", t, s, compact: true });

export function filaHerramientaNoche(c: Ctx): Fila | null {
  const h = c.svc?.noche, { E2 } = c;
  if (!h || h.porFecha) return null;
  return { icon: "drink", t: tituloNoche(c.es), s: resumenNoche(h, c.es), tag: E2("TU HERRAMIENTA", "YOUR TOOL"), tone: "action", chev: true, onClick: () => c.go("mod", "herramienta") };
}

/* La fila de esta noche: también en Panel › Hoy (la puerta la cambia sin entrar a Lo que vendes). */
export function filaAhoraBloque(c: Ctx, h: HerrNoche, hoy: boolean): Bloque {
  const { E2, es } = c;
  const viva = h.fila?.viva ? h.fila.min : null;
  return { type: "chips", k: E2("CÓMO ESTÁ LA FILA AHORA", "HOW THE LINE IS RIGHT NOW"),
    help: viva != null ? E2(`se ve en vivo · la pusiste a las ${hNoche(h.fila!.hora)}`, `shows live · set at ${hNoche(h.fila!.hora)}`) : h.fila ? E2(`la última: ${hNoche(h.fila.hora)} · ya no sale como «ahora»`, `last one: ${hNoche(h.fila.hora)} · no longer shows as “now”`) : E2("se ve en vivo", "shows live"),
    items: FILAS.map(([v, a, b]) => ({ l: es ? a : b, v: viva === v ? "selected" : "filter",
      onClick: () => c.run(() => (hoy ? nocheFila(c.d.id, v) : nocheGuardar(c.d.id, { fila: v })), E2("Listo. La gente lo ve en tu página.", "Done. People see it on your page.")) })) };
}

export function herramientaNocheBloques(c: Ctx): Sec {
  const h = c.svc!.noche!, { E2, es } = c, cols2 = c.desk ? "repeat(2,minmax(0,1fr))" : undefined;
  const ok = E2("Guardado · tu página ya lo dice.", "Saved · your page says so now.");
  const save = (p: NocheIn, m = ok) => c.run(() => nocheGuardar(c.d.id, p), m);
  const out: (Bloque | null)[] = [
    { type: "head", eye: E2("LO QUE VENDES · TU HERRAMIENTA", "WHAT YOU SELL · YOUR TOOL"), onBack: () => c.go("mod"), t: tituloNoche(es),
      s: E2("Lo que preguntan antes de salir: cuánto es el cover y cómo está la fila. Lo que pongas aquí sale esta noche en tu página.", "What people ask before going out: the cover and the line. What you set shows tonight on your page.") },
  ];
  if (h.porFecha) {
    out.push({ type: "note", tone: "info", icon: "info", t: E2("Trabajas por fecha (DJ, promotor o salón): no tienes cover ni fila. Lo que vendes va en Servicios con «Por fecha».", "You work by date (DJ, promoter or hall): no cover or line. What you sell goes in Services as “By date”."), cta: E2("Servicios", "Services"), onCta: () => c.go("mod", "servicios") });
    return { blocks: out, ed: null };
  }
  // El cover de la próxima noche que abre (hoy si abre): «Cover de esta noche» o «Cover del viernes».
  const n0 = h.noches.find((n) => n.abre) ?? h.noches[0]!, hoy = n0 === h.noches[0];
  if (!h.noches.some((n) => n.abre)) out.push({ type: "note", tone: "warn", icon: "clock", t: E2("Tu horario no tiene noches abiertas esta semana: tu página no dice el cover. Revisa Tu página › Horario.", "Your hours have no open nights this week: your page shows no cover. Check Your page › Hours."), cta: E2("Horario", "Hours"), onCta: () => c.go("pag", "horario") });
  out.push({ type: "step", t: hoy ? E2("Cover de esta noche", "Tonight’s cover") : E2(`Cover del ${diaNoche(n0.dow, true)}`, `${diaNoche(n0.dow, false)} cover`), s: E2("El que ves es el que pagas en la puerta.", "What you see is what you pay at the door."),
    v: h.cover ? usdN(h.cover) : E2("Gratis", "Free"), onM: () => save({ cover: Math.max(0, h.cover - 500) }), onP: () => save({ cover: Math.min(10000, h.cover + 500) }) });
  out.push({ type: "chips", k: E2("DESPUÉS DE CIERTA HORA", "AFTER A CERTAIN TIME"), help: E2("solo si sube", "only if it goes up"), items: ([[null, E2("Igual toda la noche", "Same all night")], [660, E2(`Después de las 11 PM · ${usdN(h.cover + 500)}`, `After 11 PM · ${usdN(h.cover + 500)}`)],
    [720, E2(`Después de las 12 AM · ${usdN(h.cover + 1000)}`, `After 12 AM · ${usdN(h.cover + 1000)}`)]] as [number | null, string][]).map(([m, l]) => ({ l, v: (h.afterMin ?? null) === m ? "selected" : "filter",
      onClick: () => save({ after: m == null ? null : { min: m, cents: h.cover + (m === 660 ? 500 : 1000) } }) })) });
  if (h.afterMin != null && h.afterCents != null) out.push({ type: "note", tone: "info", icon: "info", t: E2(`Tu página dice: ${usdN(h.afterCents)} después de las ${hNoche(h.afterMin)}.`, `Your page says: ${usdN(h.afterCents)} after ${hNoche(h.afterMin)}.`) });
  // Las 3 próximas noches que abre, si esa noche es distinto.
  const otras = h.noches.filter((n) => n.abre && n !== n0).slice(0, 3);
  for (const n of otras) {
    const cv = h.byDow[String(n.dow)] ?? h.cover;
    out.push({ type: "step", t: E2(`El ${diaNoche(n.dow, true)}`, diaNoche(n.dow, false)), s: h.byDow[String(n.dow)] != null ? E2("Distinto a esta noche.", "Different from tonight.") : E2("Si esa noche es distinto.", "If that night is different."),
      v: cv ? usdN(cv) : E2("Gratis", "Free"), onM: () => save({ byDow: { d: n.dow, cents: Math.max(0, cv - 500) } }), onP: () => save({ byDow: { d: n.dow, cents: Math.min(10000, cv + 500) } }) });
  }
  if (Object.keys(h.byDow).length) out.push({ type: "acts", items: [{ l: E2("Igual todas las noches", "Same every night"), v: "ghost", icon: "close", onClick: () => save({ igual: true }) }] });
  out.push({ type: "chips", k: E2("EDAD MÍNIMA", "MINIMUM AGE"), items: [18, 21].map((n) => ({ l: `${n}+`, v: h.edad === n ? "selected" : "filter", onClick: () => save({ edad: n }) })) });
  out.push({ type: "chips", k: E2("LISTA DE LA NOCHE", "GUEST LIST"), help: h.lista ? E2("anotarse es gratis · entra con el precio de la lista hasta esa hora", "signing up is free · list price until that time") : undefined,
    items: [{ l: E2("Sin lista", "No list"), v: !h.lista ? "selected" : "filter", onClick: () => save({ lista: null }) }, ...LISTA_HORAS.map((m) => ({ l: hNoche(m), v: h.lista && h.listaHasta === m ? "selected" : "filter", onClick: () => save({ lista: m }) }))] });
  if (h.lista) out.push({ type: "step", t: E2("Tope de la lista", "List cap"), s: h.listaTope ? E2("Al llenarse, tu página dice «La lista de esta noche está llena».", "When full, your page says “Tonight’s list is full”.") : E2("Sin tope: se anota quien quiera.", "No cap: anyone can sign up."),
    v: h.listaTope ? String(h.listaTope) : E2("Sin tope", "No cap"), onM: () => save({ tope: !h.listaTope || h.listaTope <= 25 ? null : h.listaTope - 25 }), onP: () => save({ tope: Math.min(2000, (h.listaTope ?? 0) + 25) }) });
  out.push(filaAhoraBloque(c, h, false));
  out.push({ type: "chips", k: E2("MÚSICA DE ESTA NOCHE", "TONIGHT’S MUSIC"), help: E2("al menos una", "at least one"), items: MUSICA.map(([v, a, b]) => ({ l: es ? a : b, v: h.musica.includes(v) ? "selected" : "filter",
    onClick: () => { const L = h.musica.includes(v) ? h.musica.filter((x) => x !== v) : [...h.musica, v]; if (L.length) save({ musica: L }); else c.toast(E2("Deja al menos una.", "Keep at least one.")); } })) });
  // Quién toca y el código de vestimenta (texto corto; se guarda con su botón).
  const txt = (key: "ntNota" | "ntDress", k: string, ph: string, cur: string, campo: "nota" | "vestimenta") => {
    const v = (c.ui[key] as string | undefined) ?? cur;
    out.push({ type: "field", k, val: v, max: 60, count: `${v.length}/60`, ph, onChange: (x) => c.setUi({ [key]: x.slice(0, 60) }) });
    if (v.trim() !== cur) out.push({ type: "acts", items: [{ l: E2("Guardar", "Save"), icon: "check", onClick: () => c.run(() => nocheGuardar(c.d.id, { [campo]: v.trim() || null }), ok, () => c.setUi({ [key]: undefined })) }] });
  };
  txt("ntNota", E2("QUIÉN TOCA · OPCIONAL", "WHO PLAYS · OPTIONAL"), E2("Ej. DJ Kelvin · bachata y merengue", "e.g. DJ Kelvin · bachata and merengue"), h.musicaNota?.es ?? "", "nota");
  txt("ntDress", E2("CÓDIGO DE VESTIMENTA · OPCIONAL", "DRESS CODE · OPTIONAL"), E2("Ej. Sin gorra ni chancletas", "e.g. No caps or flip-flops"), h.vestimenta?.es ?? "", "vestimenta");
  out.push({ type: "rows", k: E2("REGLAS · NO SE APAGAN", "RULES · ALWAYS ON"), cols: cols2, items: [
    lock(E2("El cover publicado es el de la puerta", "The posted cover is the door price"), E2("Si cambia, cambia aquí primero.", "If it changes, change it here first.")),
    lock(E2("El mínimo de mesa no es un cargo extra", "Table minimum is not an extra fee"), E2("Se consume en la noche.", "It is spent during the night.")),
    lock(E2("To’Latino no vende tragos ni cobra el cover", "To’Latino sells no drinks and charges no cover"), E2("Se paga en el local; la edad se revisa en la puerta.", "Paid at the venue; age is checked at the door.")),
  ] });
  if (h.forzado) out.push({ type: "note", tone: "info", icon: "info", t: E2("To’Latino ajustó el tipo de tu negocio. Si no es correcto, escríbenos.", "To’Latino adjusted your business type. If it is wrong, write to us."), cta: E2("Escribir a Soporte", "Write to Support"), onCta: () => window.location.assign(`/soporte?negocio=${encodeURIComponent(c.d.id)}&nuevo=1&tema=cuenta`) });
  return { blocks: out, ed: null };
}
