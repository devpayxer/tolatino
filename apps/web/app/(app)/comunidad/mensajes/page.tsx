import { misConversaciones } from "@/lib/mensajes-vecinos";
import { conCuenta } from "../sesion";
import { Mensajes } from "./Mensajes";

export const dynamic = "force-dynamic";

/* APP-COM-MENSAJES · las conversaciones con vecinos, la más reciente primero (30 por página con cursor). */
export default async function Page() {
  const s = await conCuenta("/comunidad/mensajes");
  const d = await misConversaciones(s.u.id, null);
  return <Mensajes es={s.es} yo={s.me} ciudad={s.loc.c.name} d={d} />;
}
