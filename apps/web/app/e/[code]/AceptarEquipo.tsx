"use client";
import { PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { InvitacionVista } from "@/lib/equipo-invitacion";
import { subirFoto } from "@/lib/subir-foto";
import { equipoAceptarCodigo } from "./acciones";

const LANG: Record<string, string> = { es: "Español", en: "English", pt: "Português" };

/* 9n-2 · Aceptar la invitación al equipo (L101): «te invitó a su equipo» + tu foto, tus palabras y tus idiomas (lo mismo que el dueño pone de sí en
   Tu página › Equipo). Compuesta con PanelBloques: head, note, photos, field, chips, acts. Sin invitación válida, el motivo y a dónde ir. */
export function AceptarEquipo({ es, codigo, tel, nombre, v, error }: { es: boolean; codigo: string; tel: string; nombre: string; v: InvitacionVista | null; error: { es: string; en: string } | null }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), [pend, start] = useTransition();
  const [foto, setFoto] = useState<{ id: string; url: string } | null>(null), [bio, setBio] = useState(""), [langs, setLangs] = useState<string[]>([es ? "es" : "en"]);
  const [err, setErr] = useState(""), [hecho, setHecho] = useState<{ id: string; nombre: string } | null>(null), [subiendo, setSubiendo] = useState(false);
  const tl = tel.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
  const B: Bloque[] = [];
  if (hecho) {
    B.push({ type: "head", eye: E2("LISTO", "DONE"), t: E2(`Ya eres parte del equipo de ${hecho.nombre}`, `You are on the ${hecho.nombre} team`), s: E2("El negocio ya lo sabe. Sales en su página con tu foto cuando él lo deje encendido.", "The business knows. You show on its page with your photo when it keeps that on.") });
    B.push({ type: "acts", items: [{ l: E2("Ver la página del negocio", "View the business page"), v: "primary", icon: "store", onClick: () => router.push(`/n/${hecho.id}`) }, { l: E2("Ir a mi cuenta", "Go to my account"), v: "secondary", onClick: () => router.push("/cuenta") }] });
  } else if (!v) {
    B.push({ type: "head", eye: E2("INVITACIÓN AL EQUIPO", "TEAM INVITE"), t: E2("Esta invitación no sirve", "This invite does not work"), s: error ? (es ? error.es : error.en) : "" });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E2(`Entraste con ${tl}. La invitación solo sirve con el teléfono al que el negocio la mandó, una sola vez y antes de 7 días.`, `Signed in as ${tl}. The invite only works with the phone the business sent it to, once, and within 7 days.`) });
    B.push({ type: "acts", items: [{ l: E2("Ir al inicio", "Go home"), v: "secondary", onClick: () => router.push("/") }] });
  } else {
    const rol = (es ? v.rol : v.rolEn || v.rol) || (v.renta ? E2("Renta su espacio", "Rents a space") : "");
    B.push({ type: "head", eye: E2("INVITACIÓN AL EQUIPO", "TEAM INVITE"), t: E2(`${v.dueno ? v.dueno.split(" ")[0] : v.negocio.nombre} te invitó a ${v.negocio.nombre}`, `${v.dueno ? v.dueno.split(" ")[0] : v.negocio.nombre} invited you to ${v.negocio.nombre}`), s: rol ? E2(`Entras como ${rol}.`, `You join as ${rol}.`) : E2("Pon tu foto, tus palabras y tus idiomas, y acepta.", "Add your photo, words and languages, then accept.") });
    B.push({ type: "group", k: E2("TU PERFIL · LO VE EL CLIENTE", "YOUR PROFILE · CLIENTS SEE IT") });
    B.push({ type: "photos", k: E2("TU FOTO", "YOUR PHOTO"), count: `${foto ? 1 : 0}/1`, cols: 3, items: foto ? [{ bg: `url("${foto.url}")`, onClick: () => setFoto(null) }] : [], addL: subiendo ? E2("Subiendo…", "Uploading…") : E2("Subir foto", "Upload photo"),
      onAdd: foto || subiendo ? undefined : () => {
        const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
        i.onchange = async () => { const f = i.files?.[0]; if (!f) return; setSubiendo(true); const r = await subirFoto(f); setSubiendo(false); if (r.ok && r.id && r.url) setFoto({ id: r.id, url: r.url }); else setErr(r.mensaje ? (es ? r.mensaje.es : r.mensaje.en) : E2("No se pudo subir la foto.", "Could not upload the photo.")); };
        i.click();
      } });
    B.push({ type: "field", k: E2("TUS PALABRAS · SALEN EN «QUIÉN ESTÁ DETRÁS»", "YOUR WORDS · SHOWN IN “WHO IS BEHIND IT”"), val: bio, onChange: (x: string) => setBio(x), ph: E2("Cuenta cómo empezaste y qué haces mejor.", "Say how you started and what you do best."), max: 280, area: true, rows: 3, count: `${bio.length}/280` });
    B.push({ type: "chips", k: E2("IDIOMAS", "LANGUAGES"), items: (["es", "en", "pt"] as const).map((k) => { const on = langs.includes(k); return { l: LANG[k]!, v: on ? "selected" : "filter", onClick: () => setLangs(on ? langs.filter((l) => l !== k) : [...langs, k]) }; }) });
    if (err) B.push({ type: "note", tone: "warn", icon: "warning", t: err });
    B.push({ type: "note", tone: "ink", icon: "shield", t: E2(`Entraste con ${tl}. La invitación solo sirve con ese teléfono, una sola vez, y vence a los 7 días.`, `Signed in as ${tl}. The invite only works with that phone, once, and expires in 7 days.`) });
    B.push({ type: "acts", items: [{ l: pend ? E2("Entrando…", "Joining…") : E2("Aceptar y entrar al equipo", "Accept and join the team"), v: "primary", icon: "check", off: pend || subiendo || !langs.length,
      onClick: () => start(async () => {
        setErr("");
        const r = await equipoAceptarCodigo(codigo, { photo: foto?.id ?? null, bio: [bio, ""], langs }).catch(() => null);
        if (!r) { setErr(E2("No se pudo. Revisa tu señal.", "Could not. Check your signal.")); return; }
        if (!r.ok) { setErr(es ? r.mensaje.es : r.mensaje.en); return; }
        setHecho({ id: r.negocio.id, nombre: r.negocio.nombre });
      }) }] });
  }
  void nombre;
  return (
    <div className="min-h-dvh bg-paper pb-10" data-screen-label="Equipo · aceptar invitación">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 px-4 pt-[calc(20px+env(safe-area-inset-top))]">
        <PanelBloques bloques={B} h1={24} />
      </div>
    </div>
  );
}
