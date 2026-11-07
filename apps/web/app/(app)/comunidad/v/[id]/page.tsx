import { bloqueoMio, perfilVecino } from "@/lib/vecinos";
import { conCuenta } from "../../sesion";
import { Vecino } from "./Vecino";

export const dynamic = "force-dynamic";

/* APP-COM-VECINO · el perfil de un vecino («yo» = el mío). Si no existe para quien mira (o hay un bloqueo de por medio: la misma
   respuesta), «No encontramos a este vecino»; solo quien bloqueó ve «Bloqueaste a …» con Desbloquear. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await conCuenta(`/comunidad/v/${encodeURIComponent(id)}`);
  const v = await perfilVecino(s.u.id, id);
  const bloqueado = v ? null : await bloqueoMio(s.u.id, id);
  return <Vecino es={s.es} yo={s.me} ciudad={s.loc.c.name} v={v} bloqueado={bloqueado} />;
}
