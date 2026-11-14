"use client";
/* 8f · «Reportar un problema» (fase8-apps.md §4 8f y §5; hueco #5: no hay diseño, se compone con el sistema — PanelBloques: encabezado, fotos,
   campo, nota, línea de tiempo y acciones — y va a docs/REVISION.md con captura). Lo de §1c:
   - la captura arriba (tocar = verla grande; «Quitar» = no se manda); sin captura, «Agregar una captura» (un archivo de la galería);
   - la línea «Se envía también: el modelo del teléfono, la versión de la app y las últimas pantallas, sin lo que escribiste.»;
   - «Ver lo que se envía» muestra el registro AQUÍ, en el teléfono;
   - NADA sale del teléfono hasta tocar «Enviar» (guardián reporteConConsentimiento): la captura se sube como foto PRIVADA, el registro se lee y
     se manda, y el servidor abre el caso TK- (tema técnico). Al terminar: «Recibimos tu reporte · TK-…».
   Todo lo decide el servidor; aquí solo se muestra. */
import { IconButton, PanelBloques, type PanelBloqueT as Bloque } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { esApp } from "@/lib/nativo/puente";
import { capturaGuardada, registro } from "@/lib/nativo/reporte";
import { subirFotoPrivada } from "@/lib/subir-foto";
import { uuid } from "@/lib/uuid";
import { reportar } from "./acciones";

type Bi = { es: string; en: string };
export function Reportar({ es, conSesion, negocio, agitado, horario }: { es: boolean; conSesion: boolean; negocio: { id: string; name: string } | null; agitado: boolean; horario: Bi }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter();
  const [txt, setTxt] = useState(""), [cap, setCap] = useState<{ blob: Blob; url: string; origen: "agitar" | "archivo" } | null>(null), [grande, setGrande] = useState(false);
  const [lineas, setLineas] = useState<string[] | null>(null), [err, setErr] = useState(""), [hecho, setHecho] = useState<string | null>(null), [clave] = useState(() => uuid());
  const [pend, start] = useTransition(), file = useRef<HTMLInputElement>(null);
  const [desk, setDesk] = useState(false);
  useEffect(() => { const f = () => setDesk(window.innerWidth >= 1024); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  // La captura que la app tomó al agitar: se muestra aquí, en el teléfono (no se sube hasta «Enviar»).
  useEffect(() => {
    if (!agitado || !esApp()) return;
    let url = "";
    void capturaGuardada().then((b) => { if (b) { url = URL.createObjectURL(b); setCap({ blob: b, url, origen: "agitar" }); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [agitado]);
  const elegir = (f: File) => { if (!/^image\//.test(f.type)) return; if (cap) URL.revokeObjectURL(cap.url); setCap({ blob: f, url: URL.createObjectURL(f), origen: "archivo" }); setErr(""); };
  const quitar = () => { if (cap) URL.revokeObjectURL(cap.url); setCap(null); setGrande(false); };
  const atras = () => router.push(negocio ? `/panel/${negocio.id}/mas` : "/soporte");
  // «Ver lo que se envía»: el registro, leído y mostrado AQUÍ (no sale del teléfono).
  const ver = () => { if (lineas) { setLineas(null); return; } void registro().then((L) => setLineas(L.slice(-40))); };

  function enviar() {
    if (txt.replace(/\s+/g, "").length < 10) { setErr(E2("Cuéntanos un poco más (10 letras o más).", "Tell us a bit more (10 characters or more).")); return; }
    if (!conSesion) { router.push(`/entrar?volver=${encodeURIComponent(`/soporte/reportar${negocio ? `?negocio=${negocio.id}` : ""}`)}`); return; }
    setErr("");
    start(async () => {
      // Lo que sale del teléfono, y solo ahora: la captura (foto privada) y el registro técnico.
      let foto: string | null = null;
      if (cap) {
        const s = await subirFotoPrivada(new File([cap.blob], "captura.jpg", { type: cap.blob.type || "image/jpeg" })).catch(() => ({ ok: false as const, id: undefined, mensaje: undefined }));
        if (!s.ok || !s.id) { setErr(s.mensaje ? (es ? s.mensaje.es : s.mensaje.en) : E2("No se pudo subir la captura. Quítala o prueba de nuevo.", "The capture could not be uploaded. Remove it or try again.")); return; }
        foto = s.id;
      }
      const reg = await registro().catch(() => [] as string[]);
      const r = await reportar({ texto: txt, foto, registro: reg, captura: cap?.origen ?? null, clave }, negocio?.id ?? null);
      if (!r.ok) { setErr(es ? r.msg.es : r.msg.en); return; }
      setHecho(r.numero ?? "");
    });
  }

  const B: Bloque[] = hecho !== null ? [
    { type: "head", eye: E2("AYUDA Y SOPORTE", "HELP AND SUPPORT"), t: E2("Recibimos tu reporte", "We got your report"), onBack: atras, h1: desk ? 28 : 22 },
    { type: "note", tone: "ok", icon: "check", t: E2(`Recibimos tu reporte · ${hecho}. Una persona del equipo lo revisa (${horario.es}) y te contesta en Ayuda y soporte.`, `We got your report · ${hecho}. A person on the team reviews it (${horario.en}) and replies in Help and support.`) },
    { type: "acts", items: [{ l: E2("Ver el caso", "See the case"), v: "primary", icon: "chat", onClick: () => router.push(`/soporte?caso=${hecho}${negocio ? `&negocio=${negocio.id}` : ""}`) }, { l: E2("Listo", "Done"), v: "secondary", onClick: atras }] },
  ] : [
    { type: "head", eye: negocio ? `${negocio.name.toUpperCase()} · ${E2("AYUDA Y SOPORTE", "HELP AND SUPPORT")}` : E2("AYUDA Y SOPORTE", "HELP AND SUPPORT"), t: E2("Reportar un problema", "Report a problem"),
      s: E2("Algo no funciona en la app: cuéntanos qué pasó. Te contesta una persona del equipo.", "Something is not working in the app: tell us what happened. A person on the team replies."), onBack: atras, h1: desk ? 28 : 22 },
    cap ? { type: "photos", k: E2("CAPTURA", "CAPTURE"), cols: desk ? 4 : 3, items: [{ key: "cap", bg: `url("${cap.url}")`, tag: cap.origen === "agitar" ? E2("ESTA PANTALLA", "THIS SCREEN") : undefined, onClick: () => setGrande(true) }],
      selActs: [{ l: E2("Ver grande", "View large"), icon: "search", onClick: () => setGrande(true) }, { l: E2("Quitar", "Remove"), icon: "close", onClick: quitar }] }
      : { type: "photos", k: E2("CAPTURA · OPCIONAL", "CAPTURE · OPTIONAL"), cols: desk ? 4 : 3, items: [], addL: E2("Agregar una captura", "Add a capture"), onAdd: () => file.current?.click() },
    { type: "field", k: E2("CUÉNTANOS QUÉ PASÓ", "TELL US WHAT HAPPENED"), val: txt, area: true, rows: 5, max: 800, count: `${txt.length}/800`,
      ph: E2("Qué estabas haciendo, qué esperabas y qué pasó…", "What you were doing, what you expected and what happened…"), onChange: (v: string) => { setTxt(v); setErr(""); },
      help: E2("No escribas números de tarjeta ni contraseñas. Nunca te los pedimos.", "Do not write card numbers or passwords. We never ask for them.") },
    { type: "note", tone: "info", icon: "info", t: E2("Se envía también: el modelo del teléfono, la versión de la app y las últimas pantallas, sin lo que escribiste.", "Also sent: the phone model, the app version and the last screens, without what you typed."),
      cta: lineas ? E2("Ocultar", "Hide") : E2("Ver lo que se envía", "See what is sent"), onCta: ver },
    lineas ? (lineas.length ? { type: "timeline", k: E2("LO QUE SE ENVÍA · ÚLTIMAS PANTALLAS", "WHAT IS SENT · LAST SCREENS"), items: lineas.map((l) => ({ t: l.slice(9), s: l.slice(0, 8) })) }
      : { type: "note", tone: "ink", icon: "info", t: E2("Todavía no hay pantallas anotadas en este teléfono.", "No screens noted on this phone yet.") }) : null,
    err ? { type: "note", tone: "danger", icon: "warning", t: err } : null,
    { type: "acts", items: [{ l: pend ? E2("Enviando…", "Sending…") : conSesion ? E2("Enviar", "Send") : E2("Entrar y enviar", "Sign in and send"), v: "primary", icon: "check", off: pend, onClick: enviar },
      { l: E2("Cancelar", "Cancel"), v: "secondary", off: pend, onClick: atras }] },
  ].filter(Boolean) as Bloque[];

  return (
    <div data-pantalla="APP-REPORTAR" data-screen-label={`Reportar un problema · ${desk ? "desktop" : "móvil"}`} className="min-h-full bg-paper text-ink">
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) elegir(f); e.target.value = ""; }} />
      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: desk ? 640 : "none", padding: desk ? "26px 30px 64px" : "16px 16px 110px" }}>
        <PanelBloques bloques={B} h1={desk ? 28 : 22} />
      </div>
      {grande && cap ? (
        <div role="dialog" aria-modal="true" aria-label={E2("Captura", "Capture")} className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-3 bg-ink/90 p-4" onClick={() => setGrande(false)}>
          <img src={cap.url} alt={E2("La captura que se envía con tu reporte", "The capture sent with your report")} className="max-h-[80dvh] max-w-full rounded-[14px] object-contain" />
          <span data-cerrar onClick={() => setGrande(false)} role="presentation"><IconButton icon="close" size={44} label={E2("Cerrar", "Close")} onClick={() => setGrande(false)} /></span>
        </div>
      ) : null}
    </div>
  );
}
