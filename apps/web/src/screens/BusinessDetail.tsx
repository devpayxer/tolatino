"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  Share2,
  Heart,
  MoreHorizontal,
  Star,
  BadgeCheck,
  MapPin,
  Clock,
  Phone,
  Store,
  Info,
  ShoppingCart,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { PhoneFrame, Card, StatusPill, PrimaryButton, GhostButton, categoryTile } from "../components/primitives";
import { Avatar, SectionHeader } from "../components/ui";
import type { Business } from "../data/businesses";
import { fetchBusiness } from "../data/queries";

/**
 * Business detail — tier-aware (DESIGN_RULES.md §2).
 * Verified → full overview (photo, rating, amenities, info, review, actions).
 * Unverified → minimal + a "claim your business" upsell (never a dead end).
 * Matches docs/design-system/reference/screenshots/mobile-03-business-detail.png.
 */
export function BusinessDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { L } = useI18n();
  const [b, setB] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchBusiness(id).then((biz) => {
      if (active) {
        setB(biz);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PhoneFrame>
        <div className="flex items-center gap-3 px-4 pb-2 pt-1">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Atrás", "Back")}>
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="px-4 pt-10 text-center text-[13px] font-semibold text-muted">{L("Cargando…", "Loading…")}</div>
      </PhoneFrame>
    );
  }

  if (!b) {
    return (
      <PhoneFrame>
        <div className="p-4">
          <button onClick={onBack} className="text-[13px] font-extrabold text-primary">
            ‹ {L("Volver", "Back")}
          </button>
        </div>
      </PhoneFrame>
    );
  }

  /* ---- Unverified: minimal + claim ---- */
  if (!b.verified) {
    return (
      <PhoneFrame>
        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Atrás", "Back")}>
            <ChevronLeft size={20} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Compartir", "Share")}>
            <Share2 size={17} />
          </button>
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-card bg-canvas text-muted">
              <Store size={24} />
            </div>
            <div>
              <div className="text-[19px] font-extrabold text-ink">{b.name}</div>
              <div className="mt-1">
                <StatusPill tone="warn" dot>
                  {L("Sin verificar", "Unverified")}
                </StatusPill>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[12.5px] font-semibold text-muted">
            {L(b.cat.es, b.cat.en)} · {b.dist}
          </div>

          {/* unverified callout */}
          <div className="mt-4 rounded-card bg-warn-soft p-4">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-warn">
              <Info size={16} /> {L("Negocio sin verificar", "Unverified business")}
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-warn">
              {L(
                "La información puede estar incompleta o desactualizada. Aún no ha sido reclamado por su dueño.",
                "Info may be incomplete or out of date. It hasn't been claimed by its owner yet.",
              )}
            </p>
          </div>

          {/* limited info */}
          <SectionHeader title={L("Información", "Information")} />
          <Card className="divide-y divide-hair">
            <InfoRow icon={<MapPin size={16} className="text-muted" />} text={b.address ?? "—"} />
          </Card>

          {/* claim upsell — not a dead end */}
          <div className="mt-5 rounded-card border border-hair bg-surface p-4 text-center">
            <div className="text-[14px] font-extrabold text-ink">{L("¿Es tu negocio?", "Is this your business?")}</div>
            <p className="mt-1 text-[12.5px] font-semibold text-muted">
              {L("Reclámalo para editar la información, responder reseñas y vender.", "Claim it to edit info, reply to reviews, and sell.")}
            </p>
            <PrimaryButton className="mt-3 w-full">{L("Reclamar mi negocio", "Claim my business")}</PrimaryButton>
          </div>
        </div>
      </PhoneFrame>
    );
  }

  /* ---- Verified: full overview ---- */
  return (
    <PhoneFrame>
      {/* photo header */}
      <div className="relative h-56" style={categoryTile(b.seed)}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-card" aria-label={L("Atrás", "Back")}>
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink shadow-card" aria-label={L("Compartir", "Share")}>
              <Share2 size={16} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-rose shadow-card" aria-label={L("Guardar", "Save")}>
              <Heart size={16} />
            </button>
          </div>
        </div>
        {b.promo ? (
          <span className="absolute bottom-3 left-3">
            <span className="rounded-pill bg-gold px-2.5 py-1 text-[10.5px] font-extrabold text-ink">{L(b.promo.es, b.promo.en)}</span>
          </span>
        ) : null}
        <span className="absolute bottom-3 right-3 rounded-pill bg-ink/55 px-2.5 py-1 text-[10.5px] font-extrabold text-white">1 / 8</span>
      </div>

      <div className="px-4 pb-24">
        {/* title */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[20px] font-extrabold text-ink">{b.name}</span>
            <BadgeCheck size={18} className="flex-none text-primary" />
          </div>
          <button className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-canvas text-ink" aria-label={L("Más", "More")}>
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* meta */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-bold">
          <StatusPill tone="primary">{L(b.cat.es, b.cat.en)}</StatusPill>
          <span className="text-muted">{b.price}</span>
          <span className="text-muted">· {b.dist}</span>
          <span className={b.open ? "text-success" : "text-rose"}>· {b.open ? L("Abierto ahora", "Open now") : L("Cerrado", "Closed")}</span>
        </div>

        {/* rating */}
        <div className="mt-2 flex items-center gap-1.5 text-[13px] font-bold">
          <Star size={15} className="fill-gold text-gold" />
          <span className="text-ink">{b.rating.toFixed(1)}</span>
          <span className="text-muted-soft">
            ({b.reviews} {L("reseñas", "reviews")})
          </span>
        </div>

        {/* about */}
        {b.about ? <p className="mt-3 text-[13px] font-semibold leading-relaxed text-muted">{L(b.about.es, b.about.en)}</p> : null}

        {/* amenities */}
        {b.amenities ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {b.amenities.map((a) => (
              <span key={a.es} className="rounded-pill bg-canvas px-3 py-1.5 text-[11.5px] font-bold text-ink">
                {L(a.es, a.en)}
              </span>
            ))}
          </div>
        ) : null}

        {/* info */}
        <SectionHeader title={L("Información", "Information")} />
        <Card className="divide-y divide-hair">
          <InfoRow icon={<MapPin size={16} className="text-muted" />} text={b.address ?? "—"} />
          {b.hours ? <InfoRow icon={<Clock size={16} className="text-muted" />} text={L(b.hours.es, b.hours.en)} /> : null}
          {b.phone ? <InfoRow icon={<Phone size={16} className="text-muted" />} text={b.phone} /> : null}
        </Card>

        {/* featured review */}
        <SectionHeader title={L("Reseña destacada", "Featured review")} />
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <Avatar initials="MG" tone="primary" size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold text-ink">María G.</div>
              <div className="flex items-center gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={11} className="fill-gold text-gold" />
                ))}
              </div>
            </div>
            <span className="text-[10.5px] font-bold text-muted-soft">{L("Hace 3 días", "3 days ago")}</span>
          </div>
          <p className="mt-2 text-[12.5px] font-semibold leading-snug text-ink">
            {L("«Los mejores tacos al pastor del barrio. Porciones generosas y trato familiar.»", "“Best al pastor tacos in the neighborhood. Generous portions and a family feel.”")}
          </p>
        </Card>
      </div>

      {/* sticky action bar */}
      <div className="sticky bottom-0 flex gap-2.5 border-t border-hair bg-surface px-4 py-3">
        <GhostButton className="flex flex-1 items-center justify-center gap-1.5">
          <Phone size={16} /> {L("Llamar", "Call")}
        </GhostButton>
        <PrimaryButton className="flex flex-[2] items-center justify-center gap-1.5">
          <ShoppingCart size={16} /> {L("Pedir ahora", "Order now")}
        </PrimaryButton>
      </div>
    </PhoneFrame>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex-none">{icon}</span>
      <span className="text-[12.5px] font-semibold text-ink">{text}</span>
    </div>
  );
}
