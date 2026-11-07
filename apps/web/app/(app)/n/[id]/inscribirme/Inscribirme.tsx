"use client";
/* APP-NEG-EDU-INSCRIPCION · móvil y desktop (neg-edu-flow.js bookVals L29–55). 1 Para quién (para mí · para mi hijo o hija · para otra
   persona; con hijo: nombre de pila, edad o grado y «Soy su mamá, papá o tutor legal»; nivel donde el curso lo pide; equipo en la liga;
   nota con el aviso de datos médicos) → 2 Grupo (los llenos no se eligen; sin cupo → lista de espera) → 3 Revisa y envía (resumen, cómo se
   paga, tu matrícula en cada caso, bueno saber, plan por escrito que se acepta, avisos). Lo decide el servidor (inscribirme); la pantalla
   solo muestra. Nunca se piden fecha de nacimiento, fotos ni datos médicos del niño. */
import * as UI from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentType } from "react";
import { etiquetaGrupo, fechaCorta, FORMA, LINEA_EDU, usdI, VOC } from "@/lib/inscripciones-comun";
import { DONATIVO, LINEA_FE } from "@/lib/fe-comun";
import { AVISO_NOTA, FRANJAS, diaVis, type Franja } from "@/lib/visitas-inm-comun";
import { contratoTexto } from "@/lib/deporte-comun";
import { GRADOS } from "@/lib/ninos-comun";
import type { BookingInsc, Nivel, Para } from "@/lib/inscripciones";
import { MetodoPago, marcaB, tarjetaL, type ModoTarjeta, type Tarjeta } from "../../../pago/MetodoPago";
import { esperaAccion, inscribirmeAccion } from "./acciones";

type N = "Icon" | "Button" | "Chip" | "StepHeader" | "PaymentSummary" | "DepositOutcomes";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Icon, Button, Chip, StepHeader, PaymentSummary, DepositOutcomes } = UI as unknown as Record<N, ComponentType<any>>;
const K = "font-mono text-[10px] font-bold tracking-[0.2em] text-ink/[.42]";
const caja = "rounded-[18px] border border-ink/[.07] bg-white";
const campo = "box-border w-full rounded-[13px] border border-ink/[.12] bg-white px-[13px] py-[11px] text-[14px] font-medium outline-none";

export function Inscribirme({ b, es, pago, yo, grupo0, banda0 }: { b: BookingInsc; es: boolean; pago: { modo: ModoTarjeta; pk: string | null; tarjetas: Tarjeta[] } | null; yo: boolean; grupo0: string | null; banda0: string | null }) {
  const E2 = (a: string, z: string) => (es ? a : z);
  const router = useRouter();
  const s = b.svc, nm = (x: { es: string; en: string } | null | undefined) => (x ? (es ? x.es : x.en || x.es) : ""), V = VOC[b.rubro];
  const usaBanda = b.bandas.length > 0;
  const libreG = (g: BookingInsc["grupos"][number]) => g.libres > 0 || g.mia;
  const [paso, setPaso] = useState(0), [para, setPara] = useState<Para>(b.para[0]!), [tutor, setTutor] = useState(false);
  const [nNombre, setNNombre] = useState(""), [nEdad, setNEdad] = useState(""), [nGrado, setNGrado] = useState(""), [nEscuela, setNEscuela] = useState("");
  const [nivel, setNivel] = useState<Nivel | null>(null), [equipo, setEquipo] = useState(""), [nota, setNota] = useState(""), [sms, setSms] = useState(true), [plan, setPlan] = useState(false), [acepto, setAcepto] = useState(false);
  const [grupo, setGrupo] = useState<string | null>(grupo0 && b.grupos.some((g) => g.id === grupo0 && libreG(g)) ? grupo0 : b.grupos.find(libreG)?.id ?? null);
  const [banda, setBanda] = useState<string | null>(banda0 && b.bandas.some((x) => x.id === banda0) ? banda0 : b.bandas.find((x) => x.libres > 0 || x.mia)?.id ?? null);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(pago?.tarjetas ?? []), [tarjeta, setTarjeta] = useState<Tarjeta | null>(pago?.tarjetas.find((t) => t.def) ?? pago?.tarjetas[0] ?? null);
  // 4ie · Iglesias «Pedir fecha»: la fecha deseada y la franja (la oficina confirma, propone otra o dice que no hay). Nada se cobra.
  const fe = b.rubro === "fe", [fecha, setFecha] = useState<string | null>(null), [franja, setFranja] = useState<Franja | null>(null), [masFechas, setMasFechas] = useState(false);
  const [hoja, setHoja] = useState(false), [declinada, setDeclinada] = useState<string | null>(null), [error, setError] = useState<string | null>(null), [ocupado, setOcupado] = useState(false), [anotado, setAnotado] = useState(!!b.espera);
  const clave = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "");
  const G = b.grupos.find((g) => g.id === grupo) ?? null, B = b.bandas.find((x) => x.id === banda) ?? null;
  const mat = b.mat, curso = s.k === "curso", resto = s.cents - (curso ? s.mat : 0);
  const linea = fe ? nm(LINEA_FE) : b.rubro === "edu" ? nm(LINEA_EDU) : b.rubro === "dep" ? E2("Solo se cobra lo que ves aquí: nada que aparezca después en la tarjeta.", "Only what you see here is charged: nothing showing up later on your card.") : E2("Los datos de tu niño van cifrados y se borran a los 30 días.", "Your child's details are encrypted and deleted after 30 days.");
  // ── Validación de cada paso (el servidor lo vuelve a revisar todo) ──
  const okNino = para !== "hijo" || (tutor && /^[\p{L}][\p{L}' -]{0,29}$/u.test(nNombre.trim()) && (nEdad !== "" || nGrado !== ""));
  const ok0 = okNino && (!s.lvl || !!nivel) && (!s.team || equipo.trim().length >= 2);
  const sinCupo = usaBanda ? !b.bandas.some((x) => x.libres > 0 || x.mia) : b.necesitaGrupo && !b.grupos.some(libreG);
  const ok1 = b.fecha ? !!fecha && !!franja : usaBanda ? !!B && (B.libres > 0 || B.mia) : !b.necesitaGrupo || (!!G && libreG(G));
  const listo = ok0 && ok1 && (!mat || !!tarjeta) && (!plan || acepto) && !b.tope;
  const falta = !okNino ? (para === "hijo" && !tutor ? E2("Confirma que eres su mamá, papá o tutor", "Confirm you are the parent or guardian") : E2("Pon el nombre y la edad o el grado", "Add the name and the age or grade"))
    : s.lvl && !nivel ? E2("Elige el nivel", "Pick the level") : s.team && equipo.trim().length < 2 ? E2("Escribe el nombre del equipo", "Write the team name")
    : !ok1 && b.fecha ? (!fecha ? E2("Elige la fecha", "Pick the date") : E2("Elige la franja", "Pick the time of day")) : !ok1 ? (sinCupo ? E2("No hay cupo: anótate en la lista de espera", "No openings: join the waitlist") : usaBanda ? E2("Elige la edad", "Pick the age") : E2(`Elige el ${V.grupo.es}`, `Pick the ${V.grupo.en}`))
    : mat && !tarjeta ? E2("Elige la tarjeta de la matrícula", "Choose the card for the fee") : plan && !acepto ? E2("Acepta el plan por escrito", "Accept the written plan") : "";
  const okPaso = paso === 0 ? ok0 : paso === 1 ? ok1 : listo;
  const entrar = () => router.push(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`);
  const volver = () => router.push(`/n/${b.negocio.id}?tab=svc`);
  const enviar = async () => {
    if (!listo || ocupado) return;
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await inscribirmeAccion(b.negocio.id, {
      svc: s.id, grupo: usaBanda ? null : grupo, banda: usaBanda ? banda : null, para, tutor, nino: para === "hijo" ? { nombre: nNombre.trim(), edad: nEdad === "" ? null : Number(nEdad), grado: nGrado || null, escuela: nEscuela.trim() || null, nota: nota.trim() || null } : undefined,
      nivel, equipo: s.team ? equipo.trim() : null, nota: para === "hijo" ? "" : nota, plan, sms, pm: mat ? tarjeta?.pm ?? null : null, clave: clave.current, fecha: b.fecha ? fecha : null, franja: b.fecha ? franja : null,
    }).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    if (r.ok) { router.push(`/insc/${r.numero}`); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en); setOcupado(false);
    if ("tarjeta" in r && r.tarjeta && tarjeta) { setDeclinada(tarjeta.pm); clave.current = crypto.randomUUID(); }
    if ("grupo" in r && r.grupo) { setPaso(1); router.refresh(); }
  };
  const anotarme = async () => {
    if (!yo) return entrar();
    setOcupado(true); setError(null);
    const r = await esperaAccion(b.negocio.id, s.id, usaBanda ? null : grupo ?? b.grupos[0]?.id ?? null, usaBanda ? banda ?? b.bandas[0]?.id ?? null : null).catch(() => ({ ok: false as const, msg: { es: "No se pudo. Revisa tu conexión.", en: "Could not. Check your connection." } }));
    setOcupado(false);
    if (r.ok) { setAnotado(true); router.refresh(); return; }
    if ("entrar" in r && r.entrar) return entrar();
    setError(es ? r.msg.es : r.msg.en);
  };
  const sigue = () => { if (!okPaso) return; if (paso === 2) return void enviar(); setPaso(paso + 1); window.scrollTo({ top: 0 }); };
  const TT = [E2("Para quién", "Who it is for"), b.fecha ? E2("Fecha", "Date") : usaBanda ? E2("Edad y cupo", "Age and opening") : b.necesitaGrupo ? E2(`Elige el ${V.grupo.es}`, `Pick the ${V.grupo.en}`) : E2("Cuándo empiezas", "When you start"), E2("Revisa y envía", "Review and send")];
  const precioL = fe ? (s.cents ? `${E2("Donativo sugerido", "Suggested donation")} ${usdI(s.cents)}` : E2("Gratis", "Free")) : `${usdI(s.cents)} ${nm(FORMA[s.k].por)}`;

  // ── Bloques ──
  const lineaNota = <div className="flex items-start gap-2.5 rounded-[14px] bg-action/[.07] px-3.5 py-3"><span className="grid flex-none pt-px"><Icon name="check" size={16} color="var(--tl-action)" /></span><span className="text-pretty text-[12.5px] font-bold leading-[1.45] text-action-hover">{linea}</span></div>;
  const tarjetaSvc = (
    <div className={`flex items-center gap-[13px] px-[15px] py-3.5 ${caja}`}>
      <span className="h-[54px] w-[54px] flex-none rounded-[15px] bg-photo-bg" style={s.foto ? { backgroundImage: `url(${s.foto})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-extrabold leading-[1.2] tracking-[-0.02em]">{nm(s.name)}</div>
        <div className="mt-[5px] font-mono text-[9.5px] font-semibold tracking-[0.06em] text-ink/50">{[precioL, curso && s.mat ? `${nm(V.mat)} ${usdI(s.mat)}` : "", s.sem ? E2(`${s.sem} semanas`, `${s.sem} weeks`) : ""].filter(Boolean).join(" · ").toUpperCase()}</div>
      </div>
      <button type="button" onClick={volver} className="flex-none text-[12px] font-bold text-action">{E2("Cambiar", "Change")}</button>
    </div>
  );
  const PARA: Record<Para, string> = { yo: E2("Para mí", "For me"), hijo: E2("Para mi hijo o hija", "For my child"), otro: E2("Para otra persona", "For someone else") };
  const bloquePara = (
    <div className={`flex flex-col gap-4 p-4 ${caja}`}>
      {b.para.length > 1 && <div>
        <div className={K}>{E2("¿PARA QUIÉN ES?", "WHO IS IT FOR?")}</div>
        <div role="radiogroup" aria-label={E2("Para quién", "Who it is for")} className="mt-2 flex flex-wrap gap-2">{b.para.map((p) => <Chip key={p} variant={para === p ? "selected" : "filter"} role="radio" aria-checked={para === p} onClick={() => setPara(p)}>{PARA[p]}</Chip>)}</div>
      </div>}
      {para === "hijo" && <div className="flex flex-col gap-3">
        <div className={K}>{E2("TU NIÑO O NIÑA", "YOUR CHILD")}</div>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Nombre de pila", "First name")}</span><input value={nNombre} onChange={(e) => setNNombre(e.target.value.slice(0, 30))} className={campo} aria-label={E2("Nombre de pila", "First name")} autoComplete="off" /></label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Edad", "Age")}</span>
            <select value={nEdad} onChange={(e) => { setNEdad(e.target.value); if (e.target.value) { setNGrado(""); const n = Number(e.target.value), m = b.bandas.find((x) => n >= x.min && n <= x.max); if (m) setBanda(m.id); } }} className={campo} aria-label={E2("Edad", "Age")}><option value="">—</option>{Array.from({ length: 18 }, (_, i) => <option key={i} value={i}>{i} {E2(i === 1 ? "año" : "años", i === 1 ? "year" : "years")}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("o el grado", "or grade")}</span>
            <select value={nGrado} onChange={(e) => { setNGrado(e.target.value); if (e.target.value) setNEdad(""); }} className={campo} aria-label={E2("Grado", "Grade")}><option value="">—</option>{GRADOS.map((g) => <option key={g} value={g}>{g}</option>)}</select></label>
        </div>
        {b.rubro === "ninos" && <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold">{E2("Escuela · solo si los recogen ahí", "School · only if they pick up there")}</span><input value={nEscuela} onChange={(e) => setNEscuela(e.target.value.slice(0, 60))} className={campo} aria-label={E2("Escuela", "School")} autoComplete="off" /></label>}
        <div role="checkbox" aria-checked={tutor} tabIndex={0} onClick={() => setTutor(!tutor)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTutor(!tutor); } }} className="flex cursor-pointer items-start gap-2.5 rounded-[13px] bg-paper px-3.5 py-3">
          <span className={`mt-px grid h-[20px] w-[20px] flex-none place-items-center rounded-[6px] ${tutor ? "bg-ink" : "border-[1.5px] border-ink/30 bg-white"}`}>{tutor && <Icon name="check" size={13} color="var(--tl-white)" strokeWidth={2.4} />}</span>
          <span className="text-[13px] font-bold leading-[1.4]">{E2("Soy su mamá, papá o tutor legal.", "I am the parent or legal guardian.")}</span>
        </div>
        <div className="text-[11.5px] font-medium leading-[1.5] text-ink/55">{E2("No pedimos fecha de nacimiento, fotos, acta ni vacunas: eso se entrega en persona al lugar.", "We do not ask for birth date, photos, birth certificate or vaccines: those are handed in person.")}</div>
      </div>}
      {s.lvl && <div>
        <div className={K}>{E2("TU NIVEL", "YOUR LEVEL")}</div>
        <div role="radiogroup" aria-label={E2("Nivel", "Level")} className="mt-2 flex flex-wrap gap-2">{([["cero", "Desde cero", "From zero"], ["algo", "Sé algo", "I know some"], ["medio", "Intermedio", "Intermediate"]] as [Nivel, string, string][]).map(([k, a, z]) => <Chip key={k} variant={nivel === k ? "selected" : "filter"} role="radio" aria-checked={nivel === k} onClick={() => setNivel(k)}>{es ? a : z}</Chip>)}</div>
      </div>}
      {s.team && <label className="flex flex-col gap-1.5"><span className={K}>{E2("NOMBRE DEL EQUIPO", "TEAM NAME")}</span><input value={equipo} onChange={(e) => setEquipo(e.target.value.slice(0, 40))} className={campo} aria-label={E2("Nombre del equipo", "Team name")} /></label>}
      <div>
        <div className="flex justify-between gap-2.5"><span className={K}>{E2("NOTA · OPCIONAL", "NOTE · OPTIONAL")}</span><span className="font-mono text-[9.5px] font-semibold text-ink/[.42]">{nota.length}/200</span></div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value.slice(0, 200))} rows={2} aria-label={E2("Nota", "Note")} placeholder={E2("Ej.: trabajo de noche los viernes…", "E.g. I work nights on Fridays…")}
          className="mt-2 box-border w-full resize-none rounded-[13px] border border-ink/[.12] px-[13px] py-[11px] text-[13px] font-medium leading-[1.5] outline-none" />
        <div className="mt-1.5 text-[11.5px] font-medium leading-[1.45] text-ink/55">{fe ? `${nm(AVISO_NOTA)}${b.neutro ? E2(" Tu nota va cifrada: solo la ve la oficina y se borra a los 30 días.", " Your note is encrypted: only the office sees it and it is deleted after 30 days.") : ""}` : E2("No escribas datos médicos aquí; los hablas en persona con el lugar.", "Do not write medical details here; talk about them in person with the place.")}</div>
      </div>
      {lineaNota}
    </div>
  );
  const opcion = (k: string, sel: boolean, ok: boolean, titulo: string, sub: string, der: string, on: () => void) => (
    <button key={k} type="button" role="radio" aria-checked={sel} aria-disabled={!ok} disabled={!ok} onClick={on}
      className={`flex w-full items-center gap-3 rounded-[15px] px-3.5 py-[13px] text-left ${sel ? "border-[1.5px] border-ink bg-white" : "border border-ink/[.1] bg-white"} ${ok ? "" : "opacity-50"}`}>
      <span className={`grid h-[20px] w-[20px] flex-none place-items-center rounded-full ${sel ? "bg-ink" : "border-[1.5px] border-ink/30"}`}>{sel && <span className="h-2 w-2 rounded-full bg-white" />}</span>
      <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold leading-[1.3]">{titulo}</span><span className="mt-0.5 block font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{sub.toUpperCase()}</span></span>
      <span className="flex-none font-mono text-[10px] font-bold tracking-[0.08em]" style={{ color: ok ? "var(--tl-open-text)" : "rgba(11,14,18,.45)" }}>{der}</span>
    </button>
  );
  const libresL = (n: number, mia: boolean) => (mia ? E2("TU CUPO", "YOUR SPOT") : n ? E2(n === 1 ? "QUEDA 1" : `QUEDAN ${n}`, `${n} LEFT`) : E2("LLENO", "FULL"));
  const bloqueGrupo = (
    <div className={`flex flex-col gap-3 p-4 ${caja}`}>
      {b.fecha ? <>
        <div className={K}>{E2("FECHA QUE TE GUSTARÍA", "DATE YOU WOULD LIKE")}</div>
        <div role="radiogroup" aria-label={E2("Fecha", "Date")} className="flex flex-wrap gap-2">{b.fechas.slice(0, masFechas ? 59 : 14).map((d) => <Chip key={d} variant={fecha === d ? "selected" : "filter"} role="radio" aria-checked={fecha === d} onClick={() => setFecha(d)}>{diaVis(d, es)}</Chip>)}</div>
        {!masFechas && <button type="button" onClick={() => setMasFechas(true)} className="self-start text-[12.5px] font-bold text-action">{E2("Más fechas", "More dates")}</button>}
        <div className={K}>{E2("FRANJA", "TIME OF DAY")}</div>
        <div role="radiogroup" aria-label={E2("Franja", "Time of day")} className="flex flex-wrap gap-2">{FRANJAS.map(([k, a, z]) => <Chip key={k} variant={franja === k ? "selected" : "filter"} role="radio" aria-checked={franja === k} onClick={() => setFranja(k)}>{es ? a : z}</Chip>)}</div>
        <div className="text-[12px] font-medium leading-[1.5] text-ink/60">{E2("La oficina te confirma el día y la hora, o te propone otra fecha.", "The office confirms the day and time, or proposes another date.")}</div>
      </> : usaBanda ? <>
        <div className={K}>{E2("EDAD · CUPOS", "AGE · OPENINGS")}</div>
        <div role="radiogroup" aria-label={E2("Edad", "Age")} className="flex flex-col gap-2">{b.bandas.map((x) => opcion(x.id, banda === x.id, x.libres > 0 || x.mia, nm(x.label), s.k === "semana" ? `${usdI(s.cents)} ${nm(FORMA.semana.por)}` : precioL, libresL(x.libres, x.mia), () => setBanda(x.id)))}</div>
      </> : b.necesitaGrupo ? <>
        <div className={K}>{E2("GRUPOS · EMPIEZA", "GROUPS · STARTS")}</div>
        {b.grupos.length ? <div role="radiogroup" aria-label={E2("Grupo", "Group")} className="flex flex-col gap-2">{b.grupos.map((g) => opcion(g.id, grupo === g.id, libreG(g), nm(g.label) || etiquetaGrupo(g.dows, g.min, es),
          g.empezo ? E2("YA EMPEZÓ · TE UNES AHORA", "ALREADY STARTED · JOIN NOW") : `${E2("EMPIEZA", "STARTS")} ${fechaCorta(g.inicio, es)}${g.fin ? ` · ${E2("TERMINA", "ENDS")} ${fechaCorta(g.fin, es)}` : ""}`, libresL(g.libres, g.mia), () => setGrupo(g.id)))}</div>
          : <div className="rounded-[15px] bg-paper px-[15px] py-3.5 text-[13.5px] font-bold leading-[1.4]">{E2("Todavía no hay grupos con fecha.", "There are no dated groups yet.")}</div>}
      </> : <div className="rounded-[15px] bg-paper px-[15px] py-3.5 text-[13.5px] font-bold leading-[1.4]">{E2("Empiezas cuando el lugar te confirme; te dicen el primer día.", "You start once the place confirms; they tell you the first day.")}</div>}
      {sinCupo && <div className="flex flex-col gap-2.5 rounded-[15px] bg-paper px-[15px] py-3.5">
        <div className="text-[13.5px] font-bold leading-[1.4]">{anotado ? (b.espera?.estado === "offered" ? E2("Te ofrecieron un cupo: tómalo antes de que venza.", "You were offered a spot: take it before it expires.") : E2(`Estás en la lista de espera${b.espera ? ` · hay ${b.espera.pos} antes que tú` : ""}.`, `You are on the waitlist${b.espera ? ` · ${b.espera.pos} ahead of you` : ""}.`)) : E2("No hay cupo ahora. Si se abre uno, te lo ofrecemos y te lo guardan 48 horas.", "No openings now. If one opens, we offer it to you and it is held 48 hours.")}</div>
        {!anotado && <Button variant="secondary" disabled={ocupado} onClick={() => void anotarme()}>{E2("Anotarme en la lista de espera", "Join the waitlist")}</Button>}
      </div>}
      {lineaNota}
    </div>
  );
  // La etiqueta del grupo («Lun y Mié 7 PM») + la fecha real; si la etiqueta ya habla del inicio, solo la fecha real.
  const grupoL = usaBanda ? nm(B?.label) : G ? `${/^(empieza|starts)\b/i.test(nm(G.label)) ? "" : `${nm(G.label) || etiquetaGrupo(G.dows, G.min, es)} · `}${G.empezo ? E2("ya empezó", "already started") : `${E2("empieza el", "starts")} ${fechaCorta(G.inicio, es)}`}` : "";
  const filas: [string, string][] = [[fe ? E2("TU LUGAR", "YOUR SPOT") : E2("INSCRIPCIÓN", "ENROLLMENT"), nm(s.name)], ...(b.fecha && fecha ? [[E2("FECHA", "DATE"), `${diaVis(fecha, es)}${franja ? ` · ${(FRANJAS.find((z) => z[0] === franja) ?? FRANJAS[0]!)[es ? 1 : 2]}` : ""}`] as [string, string]] : []), ...(grupoL ? [[usaBanda ? E2("EDAD", "AGE") : nm(V.grupo).toUpperCase(), grupoL] as [string, string]] : []),
    [E2("PARA", "FOR"), para === "hijo" ? `${nNombre.trim() || E2("Tu hijo o hija", "Your child")}${nEdad ? ` · ${nEdad} ${E2("años", "yrs")}` : nGrado ? ` · ${nGrado}` : ""}` : PARA[para]],
    ...(nivel ? [[E2("NIVEL", "LEVEL"), { cero: E2("Desde cero", "From zero"), algo: E2("Sé algo", "I know some"), medio: E2("Intermedio", "Intermediate") }[nivel]] as [string, string]] : []),
    ...(s.team ? [[E2("EQUIPO", "TEAM"), equipo.trim()] as [string, string]] : []),
    [E2("PRECIO", "PRICE"), fe ? precioL : s.cents ? precioL : E2("Gratis si calificas", "Free if you qualify")],
    ...(s.cert ? [[E2("TE LLEVAS", "YOU GET"), `${nm(s.cert)}${s.oficial ? E2(" · oficial", " · official") : E2(" · constancia de la escuela", " · school certificate")}`] as [string, string]] : []),
    ...(b.contrato || s.k === "mes" && b.rubro === "dep" ? [[E2("CONTRATO", "CONTRACT"), contratoTexto({ contrato: b.contrato, salir: b.salir }, es)] as [string, string]] : []),
    ...(b.g1 ? [[E2("PRIMERA CLASE", "FIRST CLASS"), b.g1 === "si" ? E2("Gratis", "Free") : E2("Ya la usaste aquí en los últimos 90 días", "Already used here in the last 90 days")] as [string, string]] : [])];
  const resumen = (
    <div className={`overflow-hidden ${caja}`}>
      <div className="border-b border-ink/[.07] px-[15px] py-3.5"><div className={K}>{E2("RESUMEN", "SUMMARY")}</div><div className="mt-[5px] font-display text-[15px] font-extrabold leading-[1.2] tracking-[-0.02em]">{b.negocio.nombre}</div></div>
      <div className="px-[15px] py-0.5">{filas.map(([k, v2], n) => <div key={k} className={`flex justify-between gap-3.5 py-[11px] ${n ? "border-t border-ink/[.06]" : ""}`}><span className="flex-none pt-0.5 font-mono text-[9px] font-bold tracking-[0.14em] text-ink/[.42]">{k}</span><span className="text-right text-[12.5px] font-bold leading-[1.45]">{v2}</span></div>)}</div>
    </div>
  );
  const enLugar = fe ? (s.cents ? nm(DONATIVO) : E2("Es gratis.", "It is free.")) : curso ? (b.matLocal ? E2(`Matrícula de ${usdI(b.matLocal)} y el resto (${usdI(resto)}) en la escuela.`, `${usdI(b.matLocal)} fee and the rest (${usdI(resto)}) at the school.`) : resto > 0 ? (plan ? E2(`El resto (${usdI(resto)}) en ${b.plan} pagos sin intereses, en la escuela.`, `The rest (${usdI(resto)}) in ${b.plan} interest-free payments, at the school.`) : E2(`El resto (${usdI(resto)}) en la escuela el primer día.`, `The rest (${usdI(resto)}) at the school on day one.`)) : E2("Nada más.", "Nothing else."))
    : s.cents ? E2(`${precioL}, en el lugar.`, `${precioL}, at the place.`) : E2("Gratis si calificas; el lugar te dice.", "Free if you qualify; the place tells you.");
  const pay = {
    screenLabel: "Inscripción · pago", priceLabel: E2("PRECIO", "PRICE"), lines: [{ label: nm(s.name), value: s.cents ? precioL : E2("Gratis", "Free") }],
    totalLabel: E2("HOY PAGAS", "TODAY YOU PAY"), total: usdI(mat), howLabel: E2("CÓMO SE PAGA", "HOW YOU PAY"), bar: null,
    rows: [[E2("Hoy, al enviar", "Today, on sending"), mat ? E2(`Se retienen ${usdI(mat)} de ${nm(V.mat).toLowerCase()} en tu tarjeta; se cobran cuando confirman y se descuentan del total. Si no confirman, se liberan completos.`, `${usdI(mat)} ${nm(V.mat).toLowerCase()} is held on your card; charged when they confirm and taken off the total. If they do not confirm, it is fully released.`) : E2("No se cobra nada ni se pide tarjeta.", "Nothing is charged and no card is needed."), mat],
      [E2("En el lugar", "At the place"), enLugar, null]]
      .map(([label, sub, v], k) => ({ label, sub, value: v == null ? E2("En el lugar", "At the place") : usdI(Number(v)), dot: k === 0 && mat ? "var(--tl-ink)" : "rgba(11,14,18,.18)", color: "var(--tl-ink)" })),
    card: mat > 0 ? { screenLabel: "Inscripción · método de pago", kind: yo && tarjeta ? "brand" : "none", brand: tarjeta ? marcaB(tarjeta.marca) : "", label: yo && tarjeta ? tarjetaL(tarjeta) : E2("Tu tarjeta", "Your card"),
      sub: !yo ? E2("ENTRA PARA ELEGIRLA", "SIGN IN TO CHOOSE IT") : declinada && tarjeta?.pm === declinada ? E2("TU BANCO LA RECHAZÓ · CAMBIA DE TARJETA", "YOUR BANK DECLINED IT · CHANGE CARD") : E2("SE RETIENE AL ENVIAR", "HELD WHEN YOU SEND"),
      change: yo && tarjeta ? E2("Cambiar", "Change") : E2("Elegir", "Choose"), onClick: () => (yo ? setHoja(true) : entrar()) } : null,
  };
  const ini = G && !G.empezo ? fechaCorta(G.inicio, es) : null, GR = "var(--tl-open-text)", RD = "var(--tl-danger)";
  const salidas = mat > 0 ? { screenLabel: "Inscripción · tu matrícula", title: `${E2("Tu ", "Your ")}${nm(V.mat).toLowerCase()}${E2(" de ", " of ")}${usdI(mat)}`.toUpperCase(),
    rows: [[E2("No hay cupo o no contestan", "No opening or no reply"), E2("Se libera completa", "Fully released"), GR], [E2("Te proponen otro grupo y no te sirve", "They propose another group and it does not work"), E2("Se libera completa", "Fully released"), GR],
      [ini ? E2(`Cancelas antes de empezar (${ini})`, `You cancel before it starts (${ini})`) : E2("Cancelas antes de empezar", "You cancel before it starts"), `${E2("Te devolvemos ", "We refund ")}${usdI(mat)}`, GR],
      [E2("Cancelas después de empezar", "You cancel after it starts"), E2("Se queda con la escuela", "Kept by the school"), RD], [E2("El grupo no abre o el lugar cancela", "The group does not open or the place cancels"), `${E2("Te devolvemos ", "We refund ")}${usdI(mat)}`, GR]]
      .map(([label, value, color], k) => ({ label, value, color, top: k ? "1px solid rgba(11,14,18,.07)" : "none" })),
    foot: E2("Lo que se libera vuelve a tu tarjeta en unos días; lo devuelto, en 3 a 5 días hábiles.", "Released holds clear in a few days; refunds take 3 to 5 business days.") } : null;
  const cal = curso && b.plan && G ? Array.from({ length: b.plan }, (_, i) => i) : [];
  const cuota = b.plan ? Math.floor(resto / b.plan / 100) * 100 : 0, primera = resto - cuota * Math.max(0, b.plan - 1);
  const bloquePlan = curso && b.plan > 0 && resto > 0 ? (
    <div data-screen-label="Inscripción · plan de pagos" className={`flex flex-col gap-3 p-4 ${caja}`}>
      <div role="switch" aria-checked={plan} aria-label={E2("Plan de pagos", "Payment plan")} tabIndex={0} onClick={() => { setPlan(!plan); setAcepto(false); }} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPlan(!plan); setAcepto(false); } }} className="flex cursor-pointer items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2(`Pagar el resto en ${b.plan} pagos sin intereses`, `Pay the rest in ${b.plan} interest-free payments`)}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Se pagan en la escuela. To'Latino no cobra cuotas ni las carga a tu tarjeta.", "Paid at the school. To'Latino does not charge installments or put them on your card.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${plan ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${plan ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
      {plan && G && <>
        <div className="rounded-[13px] bg-paper px-3.5 py-3">{cal.map((i) => <div key={i} className="flex justify-between py-1 text-[12.5px] font-bold"><span>{E2(`Pago ${i + 1}`, `Payment ${i + 1}`)} · {fechaCorta(new Date(Date.parse(`${G.inicio}T12:00:00Z`) + 30 * i * 86400000).toISOString().slice(0, 10), es)}</span><span>{usdI(i === 0 ? primera : cuota)}</span></div>)}</div>
        <div role="checkbox" aria-checked={acepto} tabIndex={0} onClick={() => setAcepto(!acepto)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAcepto(!acepto); } }} className="flex cursor-pointer items-start gap-2.5">
          <span className={`mt-px grid h-[20px] w-[20px] flex-none place-items-center rounded-[6px] ${acepto ? "bg-ink" : "border-[1.5px] border-ink/30 bg-white"}`}>{acepto && <Icon name="check" size={13} color="var(--tl-white)" strokeWidth={2.4} />}</span>
          <span className="text-[12.5px] font-bold leading-[1.45]">{E2("Acepto este plan por escrito. Queda guardado con la fecha y la hora.", "I accept this written plan. It is saved with the date and time.")}</span>
        </div>
      </>}
    </div>
  ) : null;
  const bueno = (
    <div data-screen-label="Inscripción · bueno saber" className={`flex flex-col gap-2.5 p-4 ${caja}`}>
      <div className={K}>{E2("BUENO SABER", "GOOD TO KNOW")}</div>
      {[linea, ...(s.no.length ? [`${E2("Va aparte: ", "Not included: ")}${s.no.map((x) => nm(x)).join(" · ")}`] : []),
        curso ? (mat || b.matLocal ? E2(`Gratis hasta que empiece${ini ? ` (${ini})` : ""}. Después: la ${nm(V.mat).toLowerCase()} no se devuelve.`, `Free until it starts${ini ? ` (${ini})` : ""}. After that, the ${nm(V.mat).toLowerCase()} is not refunded.`) : E2("Cancelar es gratis.", "Cancelling is free."))
          : b.rubro === "dep" && s.k === "mes" ? `${contratoTexto({ contrato: b.contrato, salir: b.salir }, es)}. ${E2("Puedes pedir la baja en la app y queda la constancia con fecha.", "You can ask to cancel in the app and you get a dated record.")}` : E2("Cancelar es gratis.", "Cancelling is free."),
        fe ? E2("Te esperamos.", "See you there.") : E2("Trae una identificación el primer día.", "Bring an ID on the first day.")]
        .map((t) => <div key={t} className="flex items-start gap-2 text-[12.5px] font-medium leading-[1.5] text-ink/75"><span className="grid flex-none pt-0.5"><Icon name="check" size={13} color="var(--tl-open-text)" /></span>{t}</div>)}
    </div>
  );
  const extras = (
    <div className={`flex flex-col gap-3.5 p-4 ${caja}`}>
      <div role="switch" aria-checked={sms} aria-label={E2("Avisos", "Alerts")} tabIndex={0} onClick={() => setSms(!sms)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSms(!sms); } }} className="flex cursor-pointer items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-[13.5px] font-bold">{E2("Avisos", "Alerts")}</div><div className="mt-0.5 text-[12px] font-medium leading-[1.45] text-ink/55">{E2("Te avisamos en Avisos cuando te confirmen, si cambia el grupo y el día antes de empezar.", "We let you know in Alerts when you are confirmed, if the group changes and the day before you start.")}</div></div>
        <span className={`relative h-6 w-[42px] flex-none rounded-full transition-colors ${sms ? "bg-ink" : "bg-ink/20"}`}><span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${sms ? "translate-x-[21px]" : "translate-x-[3px]"}`} /></span>
      </div>
    </div>
  );
  const errorBox = error ? <div role="alert" className="rounded-[14px] bg-danger/[.08] px-3.5 py-3 text-[12.5px] font-semibold text-danger">{error}</div> : null;
  const enviarL = E2("Enviar solicitud", "Send request");
  const payK = E2("HOY PAGAS", "TODAY YOU PAY"), barSub = `${E2("TOTAL ", "TOTAL ")}${s.cents ? precioL : E2("GRATIS", "FREE")}`.toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-paper">
      <div data-screen-label="APP-NEG-EDU-INSCRIPCION · móvil" className="pb-[150px] lg:hidden">
        <div className="sticky top-[57px] z-20 grid lg:top-0"><StepHeader title={TT[paso]} step={paso + 1} total={3} backLabel={E2("Volver", "Back")} onBack={paso > 0 ? () => { setPaso(paso - 1); window.scrollTo({ top: 0 }); } : volver} /></div>
        <div className="flex flex-col gap-3 px-4 pt-4">
          {paso === 0 && <>{tarjetaSvc}{bloquePara}</>}
          {paso === 1 && bloqueGrupo}
          {paso === 2 && <>{resumen}<PaymentSummary {...pay} />{salidas && <DepositOutcomes {...salidas} />}{bloquePlan}{bueno}{extras}</>}
          {b.tope && <div role="alert" className="rounded-[14px] bg-pro/[.14] px-3.5 py-3 text-[12.5px] font-semibold text-pro-ink">{E2(`${b.negocio.nombre} ya recibió las solicitudes de este mes en la app: llama a la oficina.`, `${b.negocio.nombre} already got this month's in-app requests: call the office.`)}</div>}
          {errorBox}
        </div>
        <div data-screen-label="Inscripción · barra" className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/[.08] bg-paper/[.96] px-4 pb-5 pt-3 backdrop-blur-[14px]">
          <div className="flex items-center gap-3.5">
            <div className="min-w-0 flex-none pl-1"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.02em]">{usdI(mat)}</div><div className="mt-1 max-w-[140px] truncate font-mono text-[8.5px] font-semibold tracking-[0.06em] text-ink/45">{barSub}</div></div>
            <div className="flex min-w-0 flex-1"><Button block disabled={!okPaso || ocupado} onClick={sigue}>{paso === 2 ? (ocupado ? E2("Enviando…", "Sending…") : enviarL) : E2("Continuar", "Continue")}</Button></div>
          </div>
          {!okPaso && falta && <div className="mt-[9px] text-center font-mono text-[9.5px] font-semibold tracking-[0.1em] text-pro-ink">{falta.toUpperCase()}</div>}
        </div>
      </div>
      <div data-screen-label="APP-NEG-EDU-INSCRIPCION · desktop" className="mx-auto hidden max-w-[1180px] px-[30px] pb-[60px] pt-[22px] lg:block">
        <button type="button" onClick={volver} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-action"><Icon name="chevronLeft" size={16} strokeWidth={2} />{b.negocio.nombre}</button>
        <div className="mt-3.5"><h1 className="m-0 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em]">{fe ? (b.fecha ? E2("Pedir fecha", "Ask for a date") : E2("Inscribirme", "Sign up")) : nm(V.inscribir)}</h1><div className="mt-[9px] font-mono text-[11px] font-semibold tracking-[0.06em] text-ink/50">{`${b.negocio.nombre} · ${nm(s.name)}`.toUpperCase()}</div></div>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_400px] items-start gap-x-12 gap-y-8">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[0]}</div><div className="flex flex-col gap-3">{tarjetaSvc}{bloquePara}</div></div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{TT[1]}</div>{bloqueGrupo}</div>
            <div><div className="mb-3 font-display text-[20px] font-extrabold leading-[1.1] tracking-[-0.03em]">{E2("Antes de enviar", "Before you send")}</div><div className="flex flex-col gap-3">{salidas && <DepositOutcomes {...salidas} />}{bloquePlan}{bueno}{extras}</div></div>
          </div>
          <aside className="sticky top-[96px] flex flex-col gap-3">
            {resumen}<PaymentSummary {...pay} />
            <div className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-5 py-[18px] shadow-[var(--shadow-float)]">
              {!listo && <div className="text-center text-[12px] font-bold text-pro-ink">{falta}</div>}
              <div className="flex items-center gap-3.5">
                <div className="flex-none pl-0.5"><div className="font-mono text-[9px] font-semibold tracking-[0.12em] text-ink/45">{payK}</div><div className="mt-1 font-display text-[21px] font-extrabold leading-none tracking-[-0.02em]">{usdI(mat)}</div></div>
                <div className="flex min-w-0 flex-1"><Button variant="primary" block disabled={!listo || ocupado} onClick={() => void enviar()}>{ocupado ? E2("Enviando…", "Sending…") : enviarL}</Button></div>
              </div>
              <div className="text-center font-mono text-[9.5px] font-semibold tracking-[0.08em] text-ink/50">{barSub}</div>
              {errorBox}
            </div>
          </aside>
        </div>
      </div>
      {hoja && pago && (
        <MetodoPago es={es} tarjetas={tarjetas} sel={tarjeta?.pm ?? null} declinada={declinada} modo={pago.modo} pk={pago.pk}
          nota={`${E2("PARA TU MATRÍCULA DE ", "FOR YOUR ")}${usdI(mat)}${E2("", " FEE")} · ${E2("SE RETIENE AL ENVIAR · SE COBRA AL CONFIRMAR", "HELD WHEN YOU SEND · CHARGED ON CONFIRMATION")}`}
          onClose={() => setHoja(false)}
          onUsar={(t, nueva) => { if (nueva && !tarjetas.some((x) => x.pm === nueva.pm)) setTarjetas((L) => [nueva, ...L]); setTarjeta(t); setHoja(false); if (declinada && t.pm !== declinada) setError(null); }} />
      )}
    </div>
  );
}
