import { redirect } from "next/navigation";
import { miembroEquipo } from "@/lib/admin";
import { idioma } from "@/lib/idioma";
import { DosPasos } from "./DosPasos";

/* 9j · Super Admin › los dos pasos del equipo (hueco #7 del plan de la Fase 9). La ÚNICA página del Super Admin que se abre sin el segundo factor
   de la sesión (es donde se da): no usa requerir(). Sin cuenta o sin ser del equipo: a Entrar. Con el segundo factor ya dado: al Inicio del admin. */
export const dynamic = "force-dynamic";
export default async function Page() {
  const [m, l] = await Promise.all([miembroEquipo(), idioma()]);
  if (!m) redirect("/entrar?volver=/admin");
  if (m.dos.estado === "ok") redirect("/admin");
  return <DosPasos estado={m.dos.estado} espera={m.dos.espera} quedan={m.dos.quedan} l={l} />;
}
