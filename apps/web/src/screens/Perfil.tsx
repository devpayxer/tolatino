"use client";

import { BadgeCheck, Star, Bookmark, Store, ChevronRight } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Card } from "../components/primitives";
import { Avatar, SectionHeader } from "../components/ui";

/**
 * "Perfil" (profile) tab. Banner + avatar + tier progress + stats + activity.
 * Matches docs/design-system/reference/screenshots/consumer-dashboard-05-perfil.png.
 */
export function Perfil({ onPublishBusiness }: { onPublishBusiness: () => void }) {
  const { L } = useI18n();

  const stats = [
    { value: "142", label: L("Reseñas", "Reviews") },
    { value: "38", label: L("Guardados", "Saved") },
    { value: "214", label: L("Amigos", "Friends") },
  ];

  const activity = [
    { icon: <Star size={16} className="text-gold" />, title: L("Reseñaste Taquería La Esperanza", "You reviewed Taquería La Esperanza"), when: L("Hace 2 días", "2 days ago") },
    { icon: <Bookmark size={16} className="text-primary" />, title: L("Guardaste Bissap Baobab", "You saved Bissap Baobab"), when: L("Hace 5 días", "5 days ago") },
    { icon: <Star size={16} className="text-gold" />, title: L("Reseñaste Mission Smile", "You reviewed Mission Smile"), when: L("Hace 1 semana", "1 week ago") },
  ];

  return (
    <div className="px-4 pb-6 pt-1">
      {/* profile card */}
      <Card className="overflow-hidden">
        <div className="relative h-24 bg-gradient-to-br from-primary to-primary-800">
          <button className="absolute right-3 top-3 rounded-pill bg-white/20 px-3 py-1.5 text-[12px] font-extrabold text-white">
            {L("Editar", "Edit")}
          </button>
        </div>
        <div className="px-4 pb-4">
          <Avatar initials="AR" tone="gold" size={72} className="-mt-10 border-4 border-surface" />
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[19px] font-extrabold text-ink">Ana Reyes</span>
            <BadgeCheck size={17} className="text-primary" />
          </div>
          <div className="text-[12.5px] font-semibold text-muted">@anareyes · Gulfton, Houston</div>

          {/* tier progress */}
          <div className="mt-3 rounded-tile bg-warn-soft px-3 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-warn">
                <Star size={14} className="fill-gold text-gold" />
                {L("Local Gold · Nivel 8", "Local Gold · Level 8")}
              </div>
              <span className="text-[12px] font-extrabold text-warn">1,420</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-gold/25">
              <div className="h-full w-[62%] rounded-pill bg-gold" />
            </div>
          </div>

          {/* stats */}
          <div className="mt-4 grid grid-cols-3">
            {stats.map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? "border-l border-hair" : ""}`}>
                <div className="text-[19px] font-extrabold text-ink">{s.value}</div>
                <div className="text-[11px] font-bold text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* publish-your-business CTA → business side */}
      <button
        onClick={onPublishBusiness}
        className="mt-3 flex w-full items-center gap-3 rounded-card bg-gradient-to-br from-primary to-primary-800 p-4 text-left text-white shadow-glow"
      >
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-tile bg-white/15">
          <Store size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold">{L("Publica tu negocio", "List your business")}</div>
          <div className="text-[11.5px] font-semibold text-white/80">{L("Llega a clientes latinos cerca de ti.", "Reach Latino customers near you.")}</div>
        </div>
        <ChevronRight size={18} className="flex-none text-white/80" />
      </button>

      {/* activity */}
      <SectionHeader title={L("Tu actividad", "Your activity")} />
      <div className="space-y-2.5">
        {activity.map((a) => (
          <Card key={a.title} className="flex items-center gap-3 p-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-tile bg-canvas">{a.icon}</div>
            <div className="min-w-0 flex-1 text-[12.5px] font-bold text-ink">{a.title}</div>
            <div className="flex-none text-[10.5px] font-bold text-muted-soft">{a.when}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
