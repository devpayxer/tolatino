"use client";
/* USR-PERFIL (diseño «To'Latino Mi cuenta» · profV): así te ven (foto, nombre con la inicial del apellido, cómo te
   dicen), el formulario, teléfono (Cambiar) y mi ciudad (Ver). El correo se confirma con un enlace (2q); con el
   correo confirmado llegan los recibos. */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { subirFoto } from "@/lib/subir-foto";
import type { perfilDe } from "@/lib/perfil";
import { perfilFoto, perfilGuardar, perfilVerificar } from "../acciones-perfil";
import { Marco, useCuentaUi, type Bloque, type Yo } from "../Marco";

type P = NonNullable<Awaited<ReturnType<typeof perfilDe>>>;
const tel = (p: string) => p.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "+1 ($1) $2-$3");

export function Perfil({ p, es, yo }: { p: P; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi(), file = useRef<HTMLInputElement>(null);
  const base = { first: p.first ?? "", last: p.last ?? "", nick: p.nick ?? "", email: p.email ?? "" };
  const [f, setF] = useState(base), [err, setErr] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const dirty = (Object.keys(base) as (keyof typeof base)[]).some((k) => f[k] !== base[k]);
  const set = (o: Partial<typeof base>) => { setF({ ...f, ...o }); setErr({}); };
  const short = `${f.first.trim()}${f.last.trim() ? ` ${f.last.trim()[0]!.toUpperCase()}.` : ""}`;
  const guardar = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    const r = await perfilGuardar(f).catch(() => null);
    setBusy(false);
    if (r?.ok) { ui.toast(E2("Guardado. Así te ven ahora.", "Saved. This is how people see you now.")); router.refresh(); return; }
    const m = r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection.");
    if (r && !r.ok && r.campo) setErr({ [r.campo]: m }); else ui.toast(m);
  };
  const foto = async (fl: File | undefined) => {
    if (!fl) return;
    setBusy(true);
    const up = await subirFoto(fl).catch(() => null);
    const r = up?.ok && up.id ? await perfilFoto(up.id).catch(() => null) : null;
    setBusy(false);
    if (r?.ok) { ui.toast(E2("Foto lista.", "Photo updated.")); router.refresh(); } else ui.toast(up?.mensaje ? (es ? up.mensaje.es : up.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo."));
  };
  const [prueba, setPrueba] = useState<string | null>(null);
  const verificar = async () => {
    if (busy) return;
    setBusy(true);
    const r = await perfilVerificar().catch(() => null);
    setBusy(false);
    if (r?.ok) { if (r.enlacePrueba) setPrueba(r.enlacePrueba); ui.toast(E2(`Listo: revisa ${p.email}.`, `Done: check ${p.email}.`)); return; }
    ui.toast(r && !r.ok ? (es ? r.msg.es : r.msg.en) : E2("No se pudo. Revisa tu conexión.", "Could not do it. Check your connection."));
  };
  const quitarFoto = async () => { const r = await perfilFoto(null).catch(() => null); if (r?.ok) { ui.toast(E2("Quitaste tu foto.", "Photo removed.")); router.refresh(); } };
  const B: Bloque[] = [];
  if (p.quitada) B.push({ type: "note", tone: "danger", ic: "warning", s: E2(`To'Latino quitó tu foto: ${p.quitada}. Puedes subir otra.`, `To'Latino removed your photo: ${p.quitada}. You can upload another one.`) });
  B.push({ type: "rows", rows: [{ ph: p.foto, ini: yo.ini, t: short || E2("Tu nombre", "Your name"), s: `${E2("ASÍ TE VEN LOS NEGOCIOS Y LOS VECINOS", "HOW BUSINESSES AND NEIGHBORS SEE YOU")}${f.nick ? ` · "${f.nick.toUpperCase()}"` : ""}`,
    acts: [[p.foto ? E2("Cambiar foto", "Change photo") : E2("Agregar foto", "Add photo"), "secondary", () => file.current?.click()], ...(p.foto ? [[E2("Quitar", "Remove"), "secondary", quitarFoto] as [string, string, () => void]] : [])] }] });
  B.push({ type: "form", fields: [
    { k: E2("NOMBRE", "FIRST NAME"), v: f.first, onV: (v) => set({ first: v }), ph: "Ana", max: 24, err: err.first },
    { k: E2("APELLIDO", "LAST NAME"), v: f.last, onV: (v) => set({ last: v }), ph: "Rodríguez", max: 24, err: err.last, h: E2("Se muestra solo la inicial.", "Only the initial is shown.") },
    { k: E2("¿CÓMO TE DICEN?", "WHAT DO PEOPLE CALL YOU?"), v: f.nick, onV: (v) => set({ nick: v }), ph: E2("Ej.: Anita", "E.g.: Anita"), opt: E2("OPCIONAL", "OPTIONAL"), max: 20 },
    { k: E2("CORREO", "EMAIL"), v: f.email, onV: (v) => set({ email: v.trim() }), ph: "ana@correo.com", type: "email", max: 120, err: err.email, opt: p.email && f.email === base.email ? (p.verif ? E2("VERIFICADO", "VERIFIED") : E2("SIN VERIFICAR", "NOT VERIFIED")) : E2("OPCIONAL", "OPTIONAL"),
      h: E2("Para tus recibos y para recuperar tu cuenta.", "For receipts and account recovery.") },
  ] });
  // Verificar el correo (2q): un enlace de un solo uso que sirve 24 horas. En el sandbox el correo no sale: se abre aquí.
  if (p.email && !p.verif && f.email === base.email) B.push({ type: "note", tone: "warn", ic: "shield", t: E2("Confirma tu correo", "Confirm your email"),
    s: prueba ? E2("Modo pruebas: el correo no sale. Abre el enlace para confirmarlo.", "Test mode: the email is not sent. Open the link to confirm it.") : E2(`Te mandamos un enlace a ${p.email}. Hasta confirmarlo no te llegan recibos.`, `We send a link to ${p.email}. Until you confirm it you get no receipts.`),
    a: prueba ? E2("Abrir el enlace", "Open the link") : E2("Mandar el enlace", "Send the link"), onA: prueba ? () => router.push(prueba) : verificar });
  B.push({ type: "kv", kw: "120px", rows: [{ k: E2("TELÉFONO", "PHONE"), v: `${tel(p.phone)}${E2(" · verificado", " · verified")}`, l: E2("Cambiar", "Change"), on: () => router.push("/cuenta/perfil/telefono") },
    { k: E2("MI CIUDAD", "MY CITY"), v: p.ciudad ? `${p.ciudad}, PA` : E2("Sin elegir", "Not chosen"), l: E2("Ver", "View"), on: () => router.push("/cuenta/ajustes/ciudad") }] });
  B.push({ type: "note", tone: "info", ic: "lock", s: E2("En pedidos y reservaciones el negocio ve tu nombre y, solo mientras dura, tu teléfono.", "On orders and bookings the business sees your name and, only while it lasts, your phone.") });
  B.push({ type: "desk", b: [{ type: "acts", cols: "repeat(2,minmax(0,220px))", btns: [[E2("Guardar cambios", "Save changes"), "primary", "check", guardar, !dirty || busy], ...(dirty ? [[E2("Descartar", "Discard"), "secondary", "close", () => { setF(base); setErr({}); }] as [string, string, string, () => void]] : [])] }] });
  return (
    <>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { void foto(e.target.files?.[0]); e.target.value = ""; }} />
      <Marco es={es} code="USR-PERFIL" back="/cuenta" t={E2("Perfil", "Profile")} s={E2("NOMBRE · FOTO · CORREO", "NAME · PHOTO · EMAIL")} blocks={B} yo={yo} ui={ui}
        bar={[[busy ? E2("Guardando…", "Saving…") : E2("Guardar cambios", "Save changes"), "primary", guardar, !dirty || busy]]} />
    </>
  );
}
