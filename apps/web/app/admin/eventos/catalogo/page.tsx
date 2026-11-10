import { requerir } from "@/lib/admin";
import { catalogoEvt } from "@/lib/evt-admin";
import { CatalogoEventos } from "../../CatalogoEventos";

/* 6j · ADM-EVT › Catálogo de formatos y géneros (hueco #8). Lo ve quien ve Eventos; lo cambia un Admin (evt:retirar). */
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requerir("evt", "ver");
  return <CatalogoEventos d={await catalogoEvt()} puede={s.puede("evt", "retirar")} />;
}
