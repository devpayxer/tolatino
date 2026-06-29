"use client";

import {
  Search,
  Store,
  CalendarDays,
  MessageCircle,
  Briefcase,
  Car,
  Home as HomeIcon,
  Truck,
  Tag,
  BadgeCheck,
  Star,
  Heart,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { categoryTile } from "../components/primitives";
import { Avatar } from "../components/ui";
import type { Business } from "../data/businesses";

/**
 * Desktop home (lg+). Rebuilt to match the provided "ToLatino Desktop Web"
 * design: gradient hero + big search, vertical shortcuts, recommended
 * businesses, community feed, this-week events, and a list-your-business CTA.
 * Rendered with To'Latino tokens/primitives; mobile keeps its own Inicio.
 */

const CHIPS: { id: string; es: string; en: string; dot: string }[] = [
  { id: "food", es: "Comida", en: "Food", dot: "#E8954A" },
  { id: "beauty", es: "Belleza", en: "Beauty", dot: "#E0568F" },
  { id: "auto", es: "Mecánica", en: "Auto", dot: "#7B61FF" },
  { id: "health", es: "Salud", en: "Health", dot: "#1F9D57" },
  { id: "professional", es: "Legal", en: "Legal", dot: "#6D4DF6" },
  { id: "home", es: "Hogar", en: "Home", dot: "#D6A22A" },
];

const SHORTCUTS: { icon: LucideIcon; es: string; en: string; cEs: string; cEn: string; fg: string; bg: string; q: string }[] = [
  { icon: Store, es: "Negocios", en: "Businesses", cEs: "1,240 negocios", cEn: "1,240 places", fg: "#E8954A", bg: "#FCEBD6", q: "Negocios" },
  { icon: CalendarDays, es: "Eventos", en: "Events", cEs: "38 esta semana", cEn: "38 this week", fg: "#7B61FF", bg: "#EFEBFF", q: "Eventos" },
  { icon: MessageCircle, es: "Comunidad", en: "Community", cEs: "6.4k vecinos", cEn: "6.4k neighbors", fg: "#2F6FED", bg: "#E5EFFB", q: "Comunidad" },
  { icon: Briefcase, es: "Empleos", en: "Jobs", cEs: "210 vacantes", cEn: "210 openings", fg: "#1F9D57", bg: "#E3F5EA", q: "Empleos" },
  { icon: Car, es: "Autos", en: "Cars", cEs: "480 en venta", cEn: "480 for sale", fg: "#6D4DF6", bg: "#E8E4FB", q: "Autos" },
  { icon: HomeIcon, es: "Bienes Raíces", en: "Real Estate", cEs: "320 anuncios", cEn: "320 listings", fg: "#D6A22A", bg: "#FCF1C7", q: "Bienes raíces" },
  { icon: Truck, es: "Transporte", en: "Transport", cEs: "64 servicios", cEn: "64 services", fg: "#E0568F", bg: "#FBE9F0", q: "Transporte" },
  { icon: Tag, es: "Ofertas", en: "Deals", cEs: "95 activas", cEn: "95 active", fg: "#C28A1A", bg: "#FCF1C7", q: "Ofertas" },
];

const POSTS = [
  { ini: "MR", name: "Marisol R.", hood: "Bellaire", time: { es: "hace 2 h", en: "2h ago" }, tag: { es: "Recomienda", en: "Recommends" }, tone: "success" as const, text: { es: "Don Beto Mecánica me salvó el carro en una hora. ¡Súper honestos! 🙌", en: "Don Beto Auto fixed my car in an hour. Super honest! 🙌" }, recs: 24, comments: 6 },
  { ini: "JT", name: "Jorge T.", hood: "Spring Branch", time: { es: "hace 5 h", en: "5h ago" }, tag: { es: "Pregunta", en: "Asks" }, tone: "primary" as const, text: { es: "¿Dónde venden pan dulce de verdad por Spring Branch?", en: "Where can I find real pan dulce around Spring Branch?" }, recs: 8, comments: 14 },
  { ini: "LF", name: "Lucía F.", hood: "Gulfton", time: { es: "hace 1 d", en: "1d ago" }, tag: { es: "Local", en: "Local" }, tone: "gold" as const, text: { es: "Nuevo mercado latino abrió en Gulfton, precios increíbles 🛒", en: "New Latino market opened in Gulfton, amazing prices 🛒" }, recs: 42, comments: 9 },
];

const EVENTS = [
  { day: { es: "VIE", en: "FRI" }, date: "04", title: { es: "Noche de Lotería", en: "Lotería Night" }, place: "Plaza Latina", going: 48, price: { es: "Gratis", en: "Free" } },
  { day: { es: "SÁB", en: "SAT" }, date: "05", title: { es: "Mercadito Artesanal", en: "Artisan Market" }, place: { es: "Parque Hidalgo", en: "Hidalgo Park" }, going: 120, price: { es: "Gratis", en: "Free" } },
  { day: { es: "DOM", en: "SUN" }, date: "06", title: { es: "Concierto de Cumbia", en: "Cumbia Concert" }, place: { es: "Salón Tropicana", en: "Tropicana Hall" }, going: 86, price: "$25" },
];

export function InicioDesktop({
  nearby,
  onSearch,
  onOpenBusiness,
  onPublishBusiness,
}: {
  nearby: Business[];
  onSearch: (query?: string) => void;
  onOpenBusiness: (id: string) => void;
  onPublishBusiness: () => void;
}) {
  const { L } = useI18n();
  const recommended = nearby.slice(0, 4);

  return (
    <div className="hidden space-y-9 pb-12 lg:block">
      {/* hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#8268FF] via-primary to-[#5B3FD6] p-11 text-white shadow-glow">
        <div className="flex items-center gap-10">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-pill bg-white/15 px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide">
              {L("Tu comunidad en línea", "Your community online")}
            </span>
            <h1 className="mt-4 max-w-[620px] text-[40px] font-extrabold leading-[1.08] tracking-tight">
              {L("Todo lo latino de Houston, en un solo lugar", "Everything Latino in Houston, all in one place")}
            </h1>
            <p className="mt-3 max-w-[540px] text-[15px] font-semibold text-white/85">
              {L("Encuentra negocios, eventos, empleos y vecinos de confianza cerca de ti.", "Find trusted businesses, events, jobs and neighbors near you.")}
            </p>
            <div className="mt-6 flex max-w-[620px] items-center gap-2 rounded-[16px] bg-white p-1.5 shadow-card">
              <Search size={18} className="ml-2.5 flex-none text-primary" />
              <input
                onFocus={() => onSearch()}
                placeholder={L("Taquería, mecánico, salón, apartamento…", "Taco spot, mechanic, salon, apartment…")}
                className="min-w-0 flex-1 bg-transparent py-2 text-[14px] font-semibold text-ink outline-none placeholder:text-muted-soft"
              />
              <button onClick={() => onSearch()} className="flex-none rounded-[12px] bg-primary px-5 py-2.5 text-[13.5px] font-extrabold text-white">
                {L("Buscar", "Search")}
              </button>
            </div>
            {/* category chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSearch(L(c.es, c.en))}
                  className="flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1.5 text-[12.5px] font-extrabold text-white backdrop-blur hover:bg-white/25"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.dot }} />
                  {L(c.es, c.en)}
                </button>
              ))}
            </div>
          </div>

          {/* hero featured card (xl only) */}
          {recommended[0] ? (
            <button
              onClick={() => onOpenBusiness(recommended[0].id)}
              className="hidden w-[300px] flex-none overflow-hidden rounded-[22px] bg-surface text-left shadow-sheet xl:block"
            >
              <div className="h-36" style={categoryTile(recommended[0].seed)} />
              <div className="p-4">
                <div className="flex items-center gap-1">
                  <span className="truncate text-[15px] font-extrabold text-ink">{recommended[0].name}</span>
                  {recommended[0].verified ? <BadgeCheck size={15} className="flex-none text-primary" /> : null}
                </div>
                <div className="mt-0.5 text-[12px] font-semibold text-muted">{L(recommended[0].cat.es, recommended[0].cat.en)}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold">
                  <Star size={13} className="fill-gold text-gold" />
                  <span className="text-ink">{recommended[0].rating.toFixed(1)}</span>
                  <span className="text-muted-soft">({recommended[0].reviews})</span>
                  <span className="ml-auto text-success">{recommended[0].open ? L("Abierto", "Open") : L("Cerrado", "Closed")}</span>
                </div>
              </div>
            </button>
          ) : null}
        </div>
      </section>

      {/* shortcuts */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.es}
              onClick={() => onSearch(s.q)}
              className="flex items-center gap-3 rounded-card border border-hair bg-surface p-4 text-left transition hover:shadow-card"
            >
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-tile" style={{ backgroundColor: s.bg }}>
                <Icon size={22} style={{ color: s.fg }} />
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-extrabold text-ink">{L(s.es, s.en)}</div>
                <div className="text-[11.5px] font-bold text-muted-soft">{L(s.cEs, s.cEn)}</div>
              </div>
            </button>
          );
        })}
      </section>

      {/* recommended */}
      <section>
        <SectionHead title={L("Recomendados cerca de ti", "Recommended near you")} onAll={() => onSearch()} L={L} />
        {recommended.length === 0 ? (
          <p className="text-[13px] font-semibold text-muted">{L("Aún no hay negocios cerca.", "No businesses nearby yet.")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {recommended.map((b) => (
              <BizCard key={b.id} b={b} onClick={() => onOpenBusiness(b.id)} L={L} />
            ))}
          </div>
        )}
      </section>

      {/* community + events */}
      <section className="grid grid-cols-1 gap-8 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <SectionHead title={L("De la comunidad", "From the community")} onAll={() => onSearch("Comunidad")} L={L} />
          <div className="space-y-3">
            {POSTS.map((p) => (
              <div key={p.name} className="rounded-card border border-hair bg-surface p-4">
                <div className="flex items-center gap-2.5">
                  <Avatar initials={p.ini} tone="canvas" size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-extrabold text-ink">{p.name}</span>
                      <span className="text-[11px] font-semibold text-muted-soft">· {p.hood} · {L(p.time.es, p.time.en)}</span>
                    </div>
                  </div>
                  <span className={`rounded-pill px-2.5 py-1 text-[10.5px] font-extrabold ${p.tone === "success" ? "bg-success-soft text-success" : p.tone === "gold" ? "bg-warn-soft text-warn" : "bg-primary/10 text-primary"}`}>
                    {L(p.tag.es, p.tag.en)}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] font-semibold leading-snug text-ink">{L(p.text.es, p.text.en)}</p>
                <div className="mt-3 flex gap-5 text-[11.5px] font-bold text-muted-soft">
                  <span className="flex items-center gap-1"><Heart size={13} /> {p.recs}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} /> {p.comments}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2">
          <SectionHead title={L("Esta semana", "This week")} onAll={() => onSearch("Eventos")} L={L} />
          <div className="space-y-3">
            {EVENTS.map((e) => (
              <div key={e.date} className="flex items-center gap-3 rounded-card border border-hair bg-surface p-3">
                <div className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-tile bg-primary/10">
                  <span className="text-[10px] font-extrabold uppercase text-primary">{L(e.day.es, e.day.en)}</span>
                  <span className="text-[18px] font-extrabold leading-none text-ink">{e.date}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-extrabold text-ink">{L(e.title.es, e.title.en)}</div>
                  <div className="truncate text-[11.5px] font-semibold text-muted">{typeof e.place === "string" ? e.place : L(e.place.es, e.place.en)} · {e.going} {L("asistirán", "going")}</div>
                </div>
                <span className="flex-none rounded-pill bg-canvas px-2.5 py-1 text-[11px] font-extrabold text-ink">{typeof e.price === "string" ? e.price : L(e.price.es, e.price.en)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* business CTA */}
      <section className="flex items-center gap-8 overflow-hidden rounded-[24px] bg-gradient-to-br from-primary to-[#8268FF] p-9 text-white shadow-glow">
        <div className="min-w-0 flex-1">
          <h2 className="text-[24px] font-extrabold tracking-tight">{L("¿Tienes un negocio?", "Own a business?")}</h2>
          <p className="mt-1 text-[14px] font-semibold text-white/85">{L("Publica gratis y llega a miles de clientes latinos.", "List free and reach thousands of Latino customers.")}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-white/65">{L("Gratis · listo en 2 minutos", "Free · ready in 2 minutes")}</p>
        </div>
        <button onClick={onPublishBusiness} className="flex flex-none items-center gap-2 rounded-[14px] bg-white px-6 py-3.5 text-[14px] font-extrabold text-primary">
          {L("Publicar mi negocio", "List my business")} <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}

function SectionHead({ title, onAll, L }: { title: string; onAll: () => void; L: (a: string, b: string) => string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[20px] font-extrabold tracking-tight text-ink">{title}</h2>
      <button onClick={onAll} className="text-[13px] font-extrabold text-primary">{L("Ver todo", "See all")}</button>
    </div>
  );
}

function BizCard({ b, onClick, L }: { b: Business; onClick: () => void; L: (a: string, b: string) => string }) {
  return (
    <div className="group overflow-hidden rounded-card border border-hair bg-surface text-left">
      <button onClick={onClick} className="block w-full text-left">
        <div className="relative h-36" style={categoryTile(b.seed)}>
          {b.promo ? (
            <span className="absolute left-2.5 top-2.5 rounded-pill bg-gold px-2.5 py-1 text-[10px] font-extrabold text-ink">{L(b.promo.es, b.promo.en)}</span>
          ) : null}
          <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-muted-soft">
            <Heart size={15} />
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex items-center gap-1">
            <span className="truncate text-[14px] font-extrabold text-ink">{b.name}</span>
            {b.verified ? <BadgeCheck size={14} className="flex-none text-primary" /> : null}
          </div>
          <div className="mt-0.5 text-[12px] font-semibold text-muted">{L(b.cat.es, b.cat.en)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold">
            <Star size={13} className="fill-gold text-gold" />
            <span className="text-ink">{b.rating.toFixed(1)}</span>
            <span className="text-muted-soft">({b.reviews})</span>
            {b.price ? <span className="text-muted-soft">· {b.price}</span> : null}
            {b.dist ? <span className="text-muted-soft">· {b.dist}</span> : null}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-hair pt-2">
            <span className={`text-[11.5px] font-extrabold ${b.open ? "text-success" : "text-rose"}`}>{b.open ? L("Abierto", "Open") : L("Cerrado", "Closed")}</span>
            {b.verified ? (
              <span className="text-[10.5px] font-bold text-muted-soft">{L(`Recomendado por ${b.reviews > 99 ? "99+" : b.reviews} vecinos`, `Recommended by ${b.reviews > 99 ? "99+" : b.reviews} neighbors`)}</span>
            ) : (
              <span className="text-[10.5px] font-bold text-muted-soft">{L("Aún sin verificar", "Not yet verified")}</span>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
