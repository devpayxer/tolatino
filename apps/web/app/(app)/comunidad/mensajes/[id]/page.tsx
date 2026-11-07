import { conversacion, sinLeerVecinos } from "@/lib/mensajes-vecinos";
import { conCuenta } from "../../sesion";
import { Chat } from "./Chat";

export const dynamic = "force-dynamic";

/* APP-COM-CHAT · la conversación con un vecino (id = la otra persona). Si no existe para quien mira (o hay un bloqueo: la misma
   respuesta), «No encontramos esta conversación». */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await conCuenta(`/comunidad/mensajes/${encodeURIComponent(id)}`);
  const c = await conversacion(s.u.id, id);
  // Abrirla la marca leída: el contador de la navegación se cuenta después.
  const me = c ? { ...s.me, sinLeer: await sinLeerVecinos(s.u.id) } : s.me;
  return <Chat es={s.es} yo={me} ciudad={s.loc.c.name} c={c} />;
}
