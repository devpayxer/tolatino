"use client";
/* 9m · Buscar por propiedad o por carro (L559): compuesto con Chip, SearchBar-like input, BusinessRow y Button del sistema (el diseño no trae la
   pantalla: REVISION 9m). Casas: Renta · Venta, recámaras (1+ · 2+ · 3+ · 4+) y precio máximo. Carros: año desde, millas máximo, precio máximo y
   marca o modelo. Cada fila abre la ficha del negocio con esa casa o ese carro abierto (?item=). */
import * as UI from "@tolatino/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType, type CSSProperties } from "react";
import type { FilaInv, FiltroCarro, FiltroCasa } from "@/lib/inventario-buscar";

type N = "Chip" | "Button" | "BusinessRow" | "Icon";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Chip, Button, BusinessRow, Icon } = UI as unknown as Record<N, ComponentType<any>>;
const MONO = "'JetBrains Mono',monospace";
const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;

export function Inventario({ lang, ciudad, t, casa, carro, r }: {
  lang: "es" | "en"; ciudad: string; t: "casa" | "carro"; casa: FiltroCasa | null; carro: FiltroCarro | null; r: { filas: FilaInv[]; mas: string | null; total: number };
}) {
  const es = lang === "es", E2 = (a: string, b: string) => (es ? a : b);
  const router = useRouter(), ruta = usePathname(), sp = useSearchParams();
  const [marca, setMarca] = useState(carro?.marca ?? ""), [max, setMax] = useState(String((casa ?? carro)?.max ?? ""));
  const ir = (c: Record<string, string | number | null>) => {
    const q = new URLSearchParams(sp.toString());
    q.delete("c");
    for (const [k, v] of Object.entries(c)) { if (v == null || v === "") q.delete(k); else q.set(k, String(v)); }
    router.replace(`${ruta}?${q}`, { scroll: false });
  };
  const chip = (l: string, on: boolean, f: () => void, k: string) => <span key={k} style={{ flex: "none", display: "flex" }}><Chip variant={on ? "selected" : "filter"} onClick={f}>{l}</Chip></span>;
  const K: CSSProperties = { font: `700 9.5px ${MONO}`, letterSpacing: ".14em", color: "rgba(11,14,18,.5)" };
  const meta = (x: FilaInv) => (t === "casa"
    ? [x.d.rec != null ? `${x.d.rec} ${E2("REC", "BD")}` : "", x.d.banos ? `${x.d.banos} ${E2("BAÑOS", "BA")}` : "", x.d.ft2 ? `${x.d.ft2.toLocaleString("en-US")} FT²` : "", x.zona ?? ""]
    : [x.d.anio ? String(x.d.anio) : "", x.d.millas != null ? `${x.d.millas.toLocaleString("en-US")} MI` : "", E2("EN LA PUERTA", "OUT THE DOOR")]).filter(Boolean).join(" · ");
  const fila = (x: FilaInv) => (
    <div key={x.id} data-inventario={x.id} style={{ display: "grid" }}>
      <BusinessRow name={x.titulo} meta={`${meta(x)}`.toUpperCase()} slot={`${usd(x.precio)}${t === "casa" && casa?.modo === "renta" ? E2("/mes", "/mo") : ""}`} image={x.foto ?? undefined}
        onClick={() => router.push(`/n/${x.biz}?tab=svc&item=${x.id}`)} />
      <span style={{ margin: "4px 0 0 4px", font: `600 9.5px ${MONO}`, letterSpacing: ".06em", color: "rgba(11,14,18,.45)" }}>{x.negocio.toUpperCase()}</span>
    </div>
  );
  return (
    <div data-pantalla="APP-BUSCAR-INVENTARIO" className="mx-auto flex w-full max-w-[920px] flex-col gap-4 px-4 pb-10 pt-5 lg:px-6 lg:pt-8">
      <div className="flex flex-col gap-1.5">
        <span style={K}>{`${E2("BUSCAR", "SEARCH")} · ${ciudad.toUpperCase()}`}</span>
        <h1 className="m-0 font-display text-[24px] font-extrabold tracking-[-0.035em] lg:text-[30px]">{t === "casa" ? E2("Casas y apartamentos", "Homes and apartments") : E2("Carros a la venta", "Cars for sale")}</h1>
      </div>
      <div className="hs flex gap-1.5 overflow-x-auto">
        {chip(E2("Casas", "Homes"), t === "casa", () => router.replace(`${ruta}?t=casa`, { scroll: false }), "t-casa")}
        {chip(E2("Carros", "Cars"), t === "carro", () => router.replace(`${ruta}?t=carro`, { scroll: false }), "t-carro")}
      </div>
      {t === "casa" && casa ? (
        <div className="flex flex-col gap-2.5">
          <div className="hs flex gap-1.5 overflow-x-auto">
            {chip(E2("Renta", "Rent"), casa.modo === "renta", () => ir({ modo: null }), "m-r")}
            {chip(E2("Venta", "Sale"), casa.modo === "venta", () => ir({ modo: "venta" }), "m-v")}
            {[1, 2, 3, 4].map((n) => chip(`${n}+ ${E2("rec.", "bd")}`, casa.recamaras === n, () => ir({ rec: casa.recamaras === n ? null : n }), `r${n}`))}
          </div>
        </div>
      ) : null}
      {t === "carro" && carro ? (
        <div className="flex flex-col gap-2.5">
          <div className="hs flex gap-1.5 overflow-x-auto">
            {[2015, 2018, 2020, 2022].map((y) => chip(`${y}+`, carro.desde === y, () => ir({ desde: carro.desde === y ? null : y }), `y${y}`))}
            {[50_000, 100_000].map((m) => chip(`${E2("Hasta", "Up to")} ${(m / 1000).toFixed(0)}k mi`, carro.millas === m, () => ir({ millas: carro.millas === m ? null : m }), `mi${m}`))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ir({ marca: marca.trim() || null }); }} className="flex items-center gap-2">
            <input value={marca} onChange={(e) => setMarca(e.target.value.slice(0, 30))} placeholder={E2("Marca o modelo: Toyota, Civic…", "Make or model: Toyota, Civic…")} aria-label={E2("Marca o modelo", "Make or model")}
              className="h-[46px] min-w-0 flex-1 rounded-[13px] border-[1.5px] border-ink/[.14] bg-white px-3.5 text-[15px] font-semibold outline-none" />
            <Button variant="secondary" size="md" onClick={() => ir({ marca: marca.trim() || null })}>{E2("Buscar", "Search")}</Button>
          </form>
        </div>
      ) : null}
      <form onSubmit={(e) => { e.preventDefault(); ir({ max: max.replace(/\D/g, "") || null }); }} className="flex items-center gap-2">
        <span className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-[13px] border-[1.5px] border-ink/[.14] bg-white px-3.5">
          <Icon name="dollar" size={16} color="rgba(11,14,18,.45)" />
          <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" placeholder={t === "casa" && casa?.modo === "renta" ? E2("Precio máximo al mes", "Max price per month") : E2("Precio máximo", "Max price")}
            aria-label={E2("Precio máximo", "Max price")} className="min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold outline-none" />
        </span>
        <Button variant="secondary" size="md" onClick={() => ir({ max: max.replace(/\D/g, "") || null })}>{E2("Aplicar", "Apply")}</Button>
      </form>
      <span style={K}>{`${r.total} ${t === "casa" ? (r.total === 1 ? E2("PROPIEDAD", "PROPERTY") : E2("PROPIEDADES", "PROPERTIES")) : r.total === 1 ? E2("CARRO", "CAR") : E2("CARROS", "CARS")} · ${E2("DEL MÁS BARATO", "CHEAPEST FIRST")}`}</span>
      {r.filas.length ? <div className="grid gap-2.5 lg:grid-cols-2">{r.filas.map(fila)}</div> : (
        <div className="rounded-[18px] border border-dashed border-ink/[.16] bg-white px-4 py-6 text-center">
          <div className="font-display text-[16px] font-extrabold">{E2("Nada con esos filtros", "Nothing with those filters")}</div>
          <div className="mt-1 text-[12.5px] font-medium text-ink/60">{E2("Quita un filtro o sube el precio.", "Remove a filter or raise the price.")}</div>
        </div>
      )}
      {r.mas ? <div className="flex"><Button variant="secondary" size="md" block onClick={() => ir({ c: r.mas })}>{E2("Ver más", "See more")}</Button></div> : null}
    </div>
  );
}
