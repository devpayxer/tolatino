import { notFound } from "next/navigation";
import { requerir } from "@/lib/admin";
import { hiloAdmin } from "@/lib/admin-contenido";
import { HiloAdmin } from "../../../HiloAdmin";

/* ADM-CONT › el hilo (MEM 700, threadDetail · det `cont · th:post#cm`): la publicación como en la Comunidad y sus comentarios, con el
   comentario de origen marcado (?c=). Ver: permiso de Contenido y ciudad de quien mira; ocultar o restaurar: cont:retirar. */
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ c?: string }> }) {
  const s = await requerir("cont", "ver");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const h = await hiloAdmin(s, id);
  if (!h) notFound();
  return <HiloAdmin h={h} marcado={/^\d{1,18}$/.test(sp.c ?? "") ? sp.c! : null} puede={s.puede("cont", "retirar")} />;
}
