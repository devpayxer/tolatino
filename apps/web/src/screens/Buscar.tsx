"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  MapPin,
  Globe,
  Heart,
  Search,
  SlidersHorizontal,
  X,
  BadgeCheck,
  Star,
  MessageCircle,
  Store,
  CalendarDays,
  ShoppingBag,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PhoneFrame, Card, StatusPill, EmptyState, categoryTile } from "../components/primitives";
import { type Business } from "../data/businesses";
import { searchBusinesses } from "../data/queries";

/**
 * "Buscar" — business discovery surface (top tabs + search). Discover state
 * (recent searches) and results state (filters + business cards).
 * Matches docs/design-system/reference/screenshots/mobile-02-search.png.
 * Result tier shows on the card (verified badge); tapping opens the detail.
 */
type TopTab = "chat" | "negocios" | "eventos" | "tiendas";

const TOP_TABS: { id: TopTab; icon: typeof Store; es: string; en: string }[] = [
  { id: "chat", icon: MessageCircle, es: "Chat", en: "Chat" },
  { id: "negocios", icon: Store, es: "Negocios", en: "Businesses" },
  { id: "eventos", icon: CalendarDays, es: "Eventos", en: "Events" },
  { id: "tiendas", icon: ShoppingBag, es: "Tiendas", en: "Shops" },
];

export function Buscar({ onBack, onOpenBusiness }: { onBack: () => void; onOpenBusiness: (id: string) => void }) {
  const { L, lang, setLang } = useI18n();
  const [top, setTop] = useState<TopTab>("negocios");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>(["open", "mexicana", "tacos"]);

  const recent = [
    L("taquería", "taqueria"),
    L("mecánico cerca", "mechanic near me"),
    L("salón de belleza", "beauty salon"),
  ];

  const q = query.trim();
  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    searchBusinesses(q).then((r) => {
      if (active) {
        setResults(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [q]);

  const filterChips = [
    { id: "open", es: "Abierto ahora", en: "Open now" },
    { id: "mexicana", es: "Mexicana", en: "Mexican" },
    { id: "tacos", es: "Tacos", en: "Tacos" },
  ];

  return (
    <PhoneFrame>
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Atrás", "Back")}>
          <ChevronLeft size={20} />
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-1.5 text-[12px] font-bold text-ink">
            <MapPin size={13} className="text-primary" />
            Houston, TX
          </button>
          <button
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            className="flex items-center gap-1 rounded-pill bg-canvas px-2.5 py-1.5 text-[12px] font-bold text-ink"
            aria-label={L("Cambiar idioma", "Switch language")}
          >
            <Globe size={13} className="text-primary" />
            {lang === "es" ? "ES" : "EN"}
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Guardados", "Saved")}>
            <Heart size={17} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-rose px-1 text-[9px] font-extrabold text-white">
              2
            </span>
          </button>
        </div>
      </div>

      {/* top category tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOP_TABS.map(({ id, icon: Icon, es, en }) => {
          const on = top === id;
          return (
            <button
              key={id}
              onClick={() => setTop(id)}
              className={`flex flex-none items-center gap-1.5 rounded-pill px-3.5 py-2 text-[12.5px] font-extrabold ${
                on ? "bg-primary text-white" : "border border-hair bg-surface text-muted"
              }`}
            >
              <Icon size={15} strokeWidth={on ? 2.4 : 2} />
              {L(es, en)}
            </button>
          );
        })}
      </div>

      {top !== "negocios" ? (
        <EmptyState
          icon="🔎"
          title={L("Próximamente", "Coming soon")}
          sub={L("Esta sección llega pronto.", "This section is on the way.")}
        />
      ) : (
        <div className="px-4 pb-6 pt-2">
          {/* search field */}
          <div className="flex items-center gap-2 rounded-[16px] border border-line bg-surface px-3.5 py-3">
            <Search size={18} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L("Busca tacos, mecánico, salón…", "Search tacos, mechanic, salon…")}
              className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:text-muted-soft"
            />
            {query ? (
              <button onClick={() => setQuery("")} aria-label={L("Borrar", "Clear")}>
                <X size={18} className="text-muted" />
              </button>
            ) : null}
          </div>

          {q ? (
            <>
              {/* filter chips */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button className="flex flex-none items-center gap-1.5 rounded-pill border border-hair bg-surface px-3 py-2 text-[12px] font-extrabold text-ink">
                  <SlidersHorizontal size={14} /> {L("Filtros", "Filters")}
                </button>
                {filterChips.map((f) => {
                  const on = filters.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilters((cur) => (on ? cur.filter((x) => x !== f.id) : [...cur, f.id]))}
                      className={`flex flex-none items-center gap-1.5 rounded-pill px-3 py-2 text-[12px] font-extrabold ${
                        on ? "bg-primary text-white" : "border border-hair bg-surface text-muted"
                      }`}
                    >
                      {L(f.es, f.en)} {on ? <X size={13} /> : null}
                    </button>
                  );
                })}
              </div>

              {/* count + map */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-ink">
                  {loading
                    ? L("Buscando…", "Searching…")
                    : `${results.length} ${
                        results.length === 1
                          ? L("resultado cerca de ti", "result near you")
                          : L("resultados cerca de ti", "results near you")
                      }`}
                </span>
                <button className="flex items-center gap-1 rounded-pill border border-hair bg-surface px-3 py-1.5 text-[12px] font-extrabold text-primary">
                  <MapPin size={13} /> {L("Mapa", "Map")}
                </button>
              </div>

              {/* results */}
              <div className="mt-3 space-y-2.5">
                {!loading &&
                  results.map((b) => (
                    <BusinessResult key={b.id} b={b} onClick={() => onOpenBusiness(b.id)} />
                  ))}
                {!loading && results.length === 0 ? (
                  <p className="px-1 pt-1 text-[12px] font-semibold text-muted">
                    {L("Sin resultados. Prueba otra búsqueda.", "No results. Try another search.")}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">{L("Buscar negocios", "Search businesses")}</h1>
              <h2 className="mb-2 mt-5 text-[13px] font-extrabold uppercase tracking-wide text-muted">{L("Búsquedas recientes", "Recent searches")}</h2>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button
                    key={r}
                    onClick={() => setQuery(r)}
                    className="flex items-center gap-1.5 rounded-pill border border-hair bg-surface px-3 py-2 text-[12.5px] font-bold text-ink"
                  >
                    {r} <X size={13} className="text-muted-soft" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </PhoneFrame>
  );
}

function BusinessResult({ b, onClick }: { b: Business; onClick: () => void }) {
  const { L } = useI18n();
  return (
    <Card onClick={onClick} className="flex gap-3 p-2.5">
      <div className="h-[72px] w-[72px] flex-none rounded-tile" style={categoryTile(b.seed)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate text-[14px] font-extrabold text-ink">{b.name}</span>
            {b.verified ? <BadgeCheck size={15} className="flex-none text-primary" /> : null}
          </div>
          <Heart size={17} className="flex-none text-rose" />
        </div>
        <div className="mt-1">
          <StatusPill tone={b.verified ? "primary" : "neutral"}>{L(b.cat.es, b.cat.en)}</StatusPill>
          <span className="ml-1.5 text-[11.5px] font-bold text-muted">· {b.dist}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold">
          <Star size={13} className="fill-gold text-gold" />
          <span className="text-ink">{b.rating.toFixed(1)}</span>
          <span className="text-muted-soft">({b.reviews})</span>
          <span className="text-muted-soft">· {b.price}</span>
          <span className={b.open ? "text-success" : "text-rose"}>· {b.open ? L("Abierto", "Open") : L("Cerrado", "Closed")}</span>
        </div>
      </div>
    </Card>
  );
}
