/* 7a · El texto de un artículo de ayuda (Markdown de docs/ayuda/, ya filtrado por audiencia en el servidor) a piezas de React, sin HTML
   crudo: párrafos, listas (con renglones que siguen), tablas, citas, **negrita**, *cursiva*, `código` y enlaces. Un «`otro-articulo.md`»
   se vuelve enlace a /ayuda/{slug} con su título SOLO si la persona puede leerlo (la lista de títulos visibles la manda el servidor);
   si no, queda como texto. Los enlaces de afuera no se siguen (no hay en la ayuda; si un día los hay, salen como texto).
   9e · Las páginas legales (docs/legal/) usan el mismo renderizador con `rutas`: un [texto](/ruta) interno (solo letras, números, guiones y
   barras) se vuelve enlace; nada de afuera. */
import Link from "next/link";
import type { ReactNode } from "react";

type Bi = { es: string; en: string };
export type Visibles = Record<string, Bi>;

const MONO = "'JetBrains Mono',monospace";

function enLinea(t: string, vis: Visibles, es: boolean, k: string, rutas = false): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*([^*\s][^*]*?)\*(?![\w*])|(?<![\w_])_([^_\s][^_]*?)_(?![\w_]))/g;
  let i = 0, m: RegExpExecArray | null, n = 0;
  while ((m = re.exec(t))) {
    if (m.index > i) out.push(t.slice(i, m.index));
    const key = `${k}-${n++}`;
    if (m[2] != null) out.push(<strong key={key} className="font-bold text-ink">{enLinea(m[2], vis, es, key, rutas)}</strong>);
    else if (m[3] != null) {
      const slug = m[3].replace(/\.md$/, "");
      const v = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? vis[slug] : undefined;
      out.push(v ? <Link key={key} href={`/ayuda/${slug}`} className="font-bold text-action underline-offset-2 hover:underline">{es ? v.es : v.en || v.es}</Link>
        : <code key={key} className="rounded-[5px] bg-ink/[.05] px-1 py-px text-[0.86em]" style={{ fontFamily: MONO }}>{m[3]}</code>);
    } else if (m[4] != null) {
      const href = m[5]!, slug = href.replace(/^\/ayuda\//, "").replace(/\.md$/, "");
      out.push(vis[slug] ? <Link key={key} href={`/ayuda/${slug}`} className="font-bold text-action underline-offset-2 hover:underline">{m[4]}</Link>
        : rutas && /^\/[a-z0-9\-/]*$/.test(href) ? <Link key={key} href={href} className="font-bold text-action underline-offset-2 hover:underline">{m[4]}</Link>
        : <span key={key}>{m[4]}</span>);
    } else out.push(<em key={key}>{m[6] ?? m[7]}</em>);
    i = re.lastIndex;
  }
  if (i < t.length) out.push(t.slice(i));
  return out;
}

const celdas = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((x) => x.trim());

/* Bloques: párrafo · lista (- o 1.) · tabla · cita. Un renglón con sangría sigue al punto de lista anterior. */
export function Md({ texto, vis, es, rutas = false }: { texto: string; vis: Visibles; es: boolean; rutas?: boolean }) {
  const L = texto.replace(/\r/g, "").split("\n"), out: ReactNode[] = [];
  let i = 0, b = 0;
  const p = "text-[14px] font-medium leading-[1.6] text-ink/[.78] [text-wrap:pretty]";
  while (i < L.length) {
    const l = L[i]!;
    if (!l.trim()) { i++; continue; }
    const k = `b${b++}`;
    if (/^\s*\|/.test(l)) {
      const filas: string[] = [];
      while (i < L.length && /^\s*\|/.test(L[i]!)) filas.push(L[i++]!);
      const cab = celdas(filas[0]!), cuerpo = filas.slice(1).filter((x) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(x)).map(celdas);
      out.push(
        <div key={k} className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px] leading-[1.5]">
            <thead><tr>{cab.map((c, j) => <th key={j} className="border-b border-ink/10 px-1 py-2 align-bottom font-bold text-ink/60" style={{ font: `600 9.5px ${MONO}`, letterSpacing: ".08em", textTransform: "uppercase" }}>{enLinea(c, vis, es, `${k}h${j}`, rutas)}</th>)}</tr></thead>
            <tbody>{cuerpo.map((f, r) => <tr key={r}>{f.map((c, j) => <td key={j} className={`border-b border-ink/[.06] px-1 py-2 align-top text-ink/[.78] ${j === 0 ? "font-semibold text-ink" : "font-medium"}`}>{enLinea(c, vis, es, `${k}c${r}-${j}`, rutas)}</td>)}</tr>)}</tbody>
          </table>
        </div>);
      continue;
    }
    if (/^\s*>/.test(l)) {
      const q: string[] = [];
      while (i < L.length && /^\s*>/.test(L[i]!)) q.push(L[i++]!.replace(/^\s*>\s?/, ""));
      out.push(<div key={k} className="rounded-[14px] bg-danger-tint px-3.5 py-3 text-[13.5px] font-semibold leading-[1.55] text-ink">{enLinea(q.join(" "), vis, es, k, rutas)}</div>);
      continue;
    }
    if (/^\s*(-|\*|\d+\.)\s/.test(l)) {
      const items: { n: string | null; t: string; sub: boolean }[] = [];
      while (i < L.length && L[i]!.trim()) {
        const x = L[i]!, m = /^(\s*)(-|\*|(\d+)\.)\s+(.*)$/.exec(x);
        if (m) items.push({ n: m[3] ?? null, t: m[4]!, sub: m[1]!.length >= 2 });
        else if (items.length) items[items.length - 1]!.t += " " + x.trim();
        else break;
        i++;
      }
      out.push(
        <div key={k} className="flex flex-col gap-[9px]">
          {items.map((x, j) => (
            <div key={j} className={`flex items-start gap-2.5 ${x.sub ? "pl-5" : ""}`}>
              {x.n ? <span className="mt-px w-4 flex-none text-[13px] font-extrabold text-action">{x.n}.</span> : <span className="mt-2 size-1.5 flex-none rounded-full bg-action" />}
              <span className={p}>{enLinea(x.t, vis, es, `${k}i${j}`, rutas)}</span>
            </div>))}
        </div>);
      continue;
    }
    const par: string[] = [];
    while (i < L.length && L[i]!.trim() && !/^\s*(\||>|-\s|\*\s|\d+\.\s)/.test(L[i]!)) par.push(L[i++]!.trim());
    if (!par.length) { par.push(L[i++]!.trim()); }
    out.push(<p key={k} className={`m-0 ${p}`}>{enLinea(par.join(" "), vis, es, k, rutas)}</p>);
  }
  return <>{out}</>;
}
