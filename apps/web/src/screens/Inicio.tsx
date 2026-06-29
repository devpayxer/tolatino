"use client";

import { useEffect, useState } from "react";
import { Search, BadgeCheck, Star } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { categoryTile } from "../components/primitives";
import { SectionHeader } from "../components/ui";
import { nearbyBusinesses } from "../data/queries";
import type { Business } from "../data/businesses";
import { InicioDesktop } from "./InicioDesktop";

/**
 * "Inicio" — the discovery-first Home (the landing surface of the app).
 * Leads with search + categories + nearby businesses (live from Supabase),
 * in the spirit of the Welcome reference (mobile-01-welcome). Account/activity
 * lives on the Perfil tab, not here.
 */
const HOME_CATEGORIES = [
  { id: "food", es: "Comida", en: "Food" },
  { id: "beauty", es: "Belleza", en: "Beauty" },
  { id: "services", es: "Servicios", en: "Services" },
  { id: "health", es: "Salud", en: "Health" },
  { id: "auto", es: "Auto", en: "Auto" },
  { id: "home", es: "Hogar", en: "Home" },
  { id: "events", es: "Eventos", en: "Events" },
  { id: "pets", es: "Mascotas", en: "Pets" },
];

export function Inicio({
  onSearch,
  onOpenBusiness,
  onPublishBusiness,
}: {
  onSearch: (query?: string) => void;
  onOpenBusiness: (id: string) => void;
  onPublishBusiness: () => void;
}) {
  const { L } = useI18n();
  const [nearby, setNearby] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    nearbyBusinesses(8).then((list) => {
      if (active) {
        setNearby(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* desktop home (lg+) — the provided ToLatino Desktop Web design */}
      <InicioDesktop nearby={nearby} onSearch={onSearch} onOpenBusiness={onOpenBusiness} onPublishBusiness={onPublishBusiness} />

      {/* mobile home */}
      <div className="px-4 pb-6 lg:hidden">
      {/* greeting + hero search (search hero hidden on desktop — top nav has it) */}
      <div className="lg:mx-auto lg:max-w-2xl lg:pt-2 lg:text-center">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink lg:text-[34px]">{L("Hola, Ana 👋", "Hey, Ana 👋")}</h1>
        <p className="mt-1 text-[12.5px] font-semibold leading-snug text-muted lg:text-[15px]">
          {L("Descubre negocios latinos cerca de ti.", "Discover Latino businesses near you.")}
        </p>
        <button
          onClick={() => onSearch()}
          className="mt-4 flex w-full items-center gap-2.5 rounded-[16px] border border-line bg-surface px-3.5 py-3.5 text-left shadow-card lg:mt-6 lg:hidden"
        >
          <Search size={18} className="text-primary" />
          <span className="text-[14px] font-semibold text-muted-soft">{L("Busca tacos, mecánico, salón…", "Search tacos, mechanic, salon…")}</span>
        </button>
      </div>

      {/* categories */}
      <SectionHeader title={L("Explora por categoría", "Browse by category")} />
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-8 lg:gap-4 lg:overflow-visible lg:px-0">
        {HOME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => onSearch(L(c.es, c.en))}
            className="flex w-16 flex-none flex-col items-center gap-1.5 lg:w-auto"
          >
            <span className="h-14 w-14 rounded-card border border-hair lg:h-auto lg:aspect-square lg:w-full" style={categoryTile(c.id)} />
            <span className="text-center text-[11px] font-bold leading-tight text-ink lg:text-[12.5px]">{L(c.es, c.en)}</span>
          </button>
        ))}
      </div>

      {/* nearby (live) */}
      <SectionHeader
        title={L("Cerca de ti", "Near you")}
        action={
          <button onClick={() => onSearch()} className="text-[12px] font-bold text-primary">
            {L("Ver todo", "See all")}
          </button>
        }
      />
      {loading ? (
        <p className="px-1 text-[12px] font-semibold text-muted">{L("Cargando…", "Loading…")}</p>
      ) : nearby.length === 0 ? (
        <p className="px-1 text-[12px] font-semibold text-muted">{L("Aún no hay negocios cerca.", "No businesses nearby yet.")}</p>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {nearby.map((b) => (
            <NearbyCard key={b.id} b={b} onClick={() => onOpenBusiness(b.id)} />
          ))}
        </div>
      )}
      </div>
    </>
  );
}

function NearbyCard({ b, onClick }: { b: Business; onClick: () => void }) {
  const { L } = useI18n();
  return (
    <button onClick={onClick} className="w-44 flex-none overflow-hidden rounded-card border border-hair bg-surface text-left lg:w-auto">
      <div className="relative h-24" style={categoryTile(b.seed)}>
        {b.promo ? (
          <span className="absolute left-2 top-2 rounded-pill bg-gold px-2 py-0.5 text-[9.5px] font-extrabold text-ink">{L(b.promo.es, b.promo.en)}</span>
        ) : null}
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1">
          <span className="truncate text-[13px] font-extrabold text-ink">{b.name}</span>
          {b.verified ? <BadgeCheck size={13} className="flex-none text-primary" /> : null}
        </div>
        <div className="mt-0.5 truncate text-[11px] font-semibold text-muted">{L(b.cat.es, b.cat.en)}</div>
        <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
          <Star size={11} className="fill-gold text-gold" />
          <span className="text-ink">{b.rating.toFixed(1)}</span>
          {b.dist ? <span className="text-muted-soft">· {b.dist}</span> : null}
          <span className={b.open ? "text-success" : "text-rose"}>· {b.open ? L("Abierto", "Open") : L("Cerrado", "Closed")}</span>
        </div>
      </div>
    </button>
  );
}
