"use client";
/* Mi cuenta · Empleos: tus solicitudes con el puesto, el negocio, el estado (el mismo de la pestaña Jobs), la entrevista
   si hay y la fecha. Abiertas arriba; cada una abre «Tu solicitud». El diseño de Mi cuenta no trae esta pantalla: se
   compone con la sección, las filas y el vacío del marco (anotado en REVISION). */
import { useRouter } from "next/navigation";
import type { MisSolicitudes } from "@/lib/mi-cuenta";
import { bi } from "@/lib/jobs-txt";
import { TAG_APP } from "../../n/[id]/Jobs";
import { Marco, useCuentaUi, type Bloque, type Fila, type Yo } from "../Marco";
import { diaCorto, horaDe } from "../fechas";

const ABIERTA = new Set(["sent", "seen", "contact", "interview"]);
export function Empleos({ d, es, yo }: { d: MisSolicitudes; es: boolean; yo: Yo }) {
  const E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ui = useCuentaUi();
  const fila = (a: MisSolicitudes[number]): Fila => {
    const tg = TAG_APP(es, a.ivOk)[a.st] ?? ["", "neutral"];
    return { key: a.num, ph: a.foto, ini: a.bname.slice(0, 1), t: bi(a.title, es), tag: tg, s: `${a.bname} · ${a.num} · ${diaCorto(a.at, a.tz, es)}`.toUpperCase(),
      x: a.st === "interview" && a.iv ? `${E2("Entrevista: ", "Interview: ")}${diaCorto(a.iv, a.tz, es)} · ${horaDe(a.iv, a.tz, es)}${a.ivOk ? "" : E2(" · confírmala", " · confirm it")}` : "", chev: true, on: () => router.push(`/solicitud/${a.num}`) };
  };
  const ab = d.filter((a) => ABIERTA.has(a.st)), cerradas = d.filter((a) => !ABIERTA.has(a.st));
  const B: Bloque[] = [];
  if (!d.length) B.push({ type: "empty", ic: "brief", t: E2("Todavía no aplicas a ningún empleo", "You have not applied to any job yet"), s: E2("Los negocios Pro publican vacantes con pago por hora en su pestaña Jobs. Aplicas sin CV.", "Pro businesses post jobs with hourly pay in their Jobs tab. You apply without a resume."), cta: E2("Explorar negocios", "Explore businesses"), onCta: () => router.push("/negocios") });
  if (ab.length) B.push({ type: "sec", t: E2("Abiertas", "Open"), s: `${ab.length}${E2(ab.length === 1 ? " SOLICITUD" : " SOLICITUDES", ab.length === 1 ? " APPLICATION" : " APPLICATIONS")}`, fs: "15px" }, { type: "rows", rows: ab.map(fila) });
  if (cerradas.length) B.push({ type: "sec", t: E2("Cerradas", "Closed"), fs: "15px", mt: "6px" }, { type: "rows", rows: cerradas.map(fila) });
  return <Marco es={es} code="USR-EMPLEOS" t={E2("Empleos", "Jobs")} s={`${ab.length}${E2(" ABIERTAS · ", " OPEN · ")}${cerradas.length}${E2(" CERRADAS", " CLOSED")}`} blocks={B} yo={yo} ui={ui} />;
}
