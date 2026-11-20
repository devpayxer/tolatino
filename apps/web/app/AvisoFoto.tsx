"use client";
/* AJ · Revisión automática de las fotos públicas (docs/diseno/plan/fotos-revision-automatica.md, «Espejo y triángulo» · quien sube). UNA sola hoja,
   montada en el layout raíz, para TODA pantalla que sube una foto con subirFoto (lib/subir-foto.ts avisa con el evento «tl:foto-estado»): una foto
   «en revisión» se ve como lo que es, un ESTADO (etiqueta EN REVISIÓN, no un fallo), y una «rechazada» dice el motivo; las dos con el camino a «Pedir
   revisión» (Mi cuenta › Avisos de moderación, donde la persona cuenta por qué es un error). La frase la arma el servidor (lib/fotos-decision.ts
   mensajeSubida) en los dos idiomas; aquí solo se muestra. La miniatura sale del visor privado (/api/medios/revision/{id}: solo quien la subió);
   si no carga (sin almacén, o ya no está), queda el marcador del sistema. Compuesta como las hojas de confirmación (velo, hoja con asa, título,
   una frase, botón principal y secundario) con Tag, Icon y Button del sistema; FocoHojas le da el foco, el Escape y el regreso del foco. */
import { Button, fotoFondo, Icon, Tag } from "@tolatino/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dosIdiomas } from "@/lib/dos-idiomas";
import { EVENTO_FOTO, type AvisoFotoDetalle } from "@/lib/subir-foto";

const enEspanol = () => { try { return !/(?:^|;\s*)tl_lang=en(?:;|$)/.test(document.cookie); } catch { return true; } };

export function AvisoFoto() {
  const router = useRouter();
  const [a, setA] = useState<(AvisoFotoDetalle & { es: boolean }) | null>(null);
  useEffect(() => {
    const alAvisar = (e: Event) => setA({ ...(e as CustomEvent<AvisoFotoDetalle>).detail, es: enEspanol() });
    window.addEventListener(EVENTO_FOTO, alAvisar);
    return () => window.removeEventListener(EVENTO_FOTO, alAvisar);
  }, []);
  if (!a) return null;
  const es = a.es, E2 = (x: string, y: string) => dosIdiomas(es, x, y), rev = a.estado === "revision";
  const cerrar = () => setA(null);
  return (
    <div data-pantalla="FOTO-ESTADO" style={{ position: "fixed", inset: 0, zIndex: 100 }}>
      <div onClick={cerrar} style={{ position: "absolute", inset: 0, background: "rgba(11,14,18,.5)" }} />
      <div role="dialog" aria-modal="true" aria-labelledby="aviso-foto-t" style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxWidth: 560, margin: "0 auto", borderRadius: "24px 24px 0 0",
        padding: "14px 20px calc(22px + env(safe-area-inset-bottom))", background: "var(--tl-white)", boxSizing: "border-box", color: "var(--tl-ink)" }}>
        <div style={{ width: 38, height: 4, borderRadius: 9, background: "rgba(11,14,18,.15)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <span style={{ position: "relative", width: 64, height: 64, borderRadius: 16, background: "var(--tl-photo-bg)", display: "grid", placeItems: "center", flex: "none", overflow: "hidden" }}>
            <Icon name="image" size={24} color="rgba(11,14,18,.6)" />
            {a.id ? <span aria-hidden style={{ position: "absolute", inset: 0, background: `${fotoFondo(`/api/medios/revision/${a.id}`, 64)} center/cover` }} /> : null}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex" }}><Tag tone={rev ? "action" : "danger"}>{rev ? E2("EN REVISIÓN", "UNDER REVIEW") : E2("NO SE PUBLICÓ", "NOT PUBLISHED")}</Tag></div>
            <div id="aviso-foto-t" style={{ marginTop: 6, font: "800 20px/1.2 Sora,sans-serif", letterSpacing: "-.03em", textWrap: "pretty" }}>
              {rev ? E2("Tu foto está en revisión", "Your photo is under review") : E2("No pudimos publicar tu foto", "We couldn’t publish your photo")}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, font: "500 14px/1.5 Manrope,sans-serif", color: "rgba(11,14,18,.68)", textWrap: "pretty" }}>{es ? a.mensaje.es : a.mensaje.en}</div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {a.id ? <div style={{ display: "flex" }}><Button variant="primary" block onClick={() => { cerrar(); router.push(`/cuenta/moderacion?k=media&id=${encodeURIComponent(a.id!)}`); }}>{E2("Pedir revisión", "Ask for a review")}</Button></div> : null}
          <div style={{ display: "flex" }}><Button variant={a.id ? "secondary" : "primary"} block onClick={cerrar}>{E2("Entendido", "Got it")}</Button></div>
        </div>
      </div>
    </div>);
}
