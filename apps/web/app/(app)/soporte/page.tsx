import type { Metadata } from "next";
import { yo } from "@/lib/cuenta";
import { idioma } from "@/lib/idioma";
import { accesoPanel } from "@/lib/panel";
import { casoVecino, datosSoporte, horario } from "@/lib/soporte";
import { TEMAS_NEGOCIO, TEMAS_VECINO, type Tema } from "@/lib/soporte-comun";
import { Soporte } from "./Soporte";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Soporte · To'Latino" };

/* 7b · APP-SOPORTE (`To'Latino Soporte.dc.html` tal cual): Escríbenos, TO'LATINO ESTÁ REVISANDO (las ayudas escaladas), TUS CASOS, CASO NUEVO
   y el caso con su hilo. ?caso=TK-… abre un caso · ?nuevo=1&tema=…&op=…&otro=TK-… abre el formulario (con «Abrir otro caso» enlazado) ·
   ?negocio={id} = el mismo Soporte con el negocio como contexto (Panel › Más › Ayuda y Soporte; hueco #8). Sin sesión se puede escribir:
   «Entrar y enviar» guarda el borrador en el teléfono y vuelve aquí. Un caso ajeno no existe (el servidor lo busca con la sesión). */
export default async function Page({ searchParams }: { searchParams: Promise<{ caso?: string; nuevo?: string; tema?: string; op?: string; otro?: string; negocio?: string }> }) {
  const [sp, lang, u] = await Promise.all([searchParams, idioma(), yo().catch(() => null)]);
  const es = lang === "es";
  let negocio: { id: string; name: string } | null = null;
  if (sp.negocio) {
    const a = u ? await accesoPanel(String(sp.negocio)) : null;
    if (!a) {
      return (
        <main className="mx-auto flex min-h-[60dvh] max-w-[480px] flex-col justify-center gap-2 px-5">
          <span className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-text-muted">{es ? "SIN ACCESO" : "NO ACCESS"}</span>
          <h1 className="font-display text-[24px] font-extrabold tracking-[-0.04em]">{es ? "Sin acceso a este negocio" : "No access to this business"}</h1>
          <p className="text-[13.5px] text-text-2">{es ? "El Soporte de un negocio lo abre quien es parte de su equipo." : "A business's Support is for its team."}</p>
        </main>
      );
    }
    negocio = { id: a.negocio.id, name: a.negocio.name };
  }
  const q = { userId: u?.id ?? "", negocio: negocio?.id ?? null };
  const [datos, caso, h] = await Promise.all([
    u ? datosSoporte(q) : Promise.resolve(null),
    u && sp.caso ? casoVecino(q, String(sp.caso)) : Promise.resolve(null),
    horario(),
  ]);
  const temas: Tema[] = negocio ? TEMAS_NEGOCIO : TEMAS_VECINO;
  const pre = sp.nuevo ? { tema: temas.includes(sp.tema as Tema) ? (sp.tema as Tema) : null, op: sp.op ? String(sp.op).slice(0, 20) : null, otro: sp.otro ? String(sp.otro).slice(0, 20) : null } : null;
  return <Soporte es={es} conSesion={!!u} negocio={negocio} temas={temas} casos={datos?.casos ?? []} ops={datos?.ops ?? []} revs={datos?.revs ?? []} horario={h}
    caso={caso} casoPedido={sp.caso ? String(sp.caso).slice(0, 20) : null} pre={pre} />;
}
