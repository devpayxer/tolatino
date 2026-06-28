"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, Tag, Calendar, Heart, Eye, MessageCircle } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile, PrimaryButton, GhostButton, categoryTile } from "../../../components/primitives";
import { Avatar } from "../../../components/ui";
import { ModuleShell, ModuleTabs } from "./_shell";

/**
 * Updates module — "Novedades". Posts/offers to followers.
 * Matches reference/screenshots/module-06-updates.png.
 */
type Tab = "all" | "live" | "scheduled" | "drafts";
type PostType = "news" | "offer" | "event";

const POSTS = [
  { type: "offer" as PostType, text: { es: "🌮 Domingos de masa madre: 20% en todos los panes, todo el día.", en: "🌮 Sourdough Sundays: 20% off all loaves, all day." }, when: { es: "hace 2 h", en: "2h ago" }, img: true, views: "4,820", loves: "312", comments: "28" },
  { type: "news" as PostType, text: { es: "Conoce a Marisa, nuestra nueva panadera ✨ Trae 10 años de experiencia.", en: "Meet Marisa, our new baker ✨ She brings 10 years of experience." }, when: { es: "hace 1 d", en: "1d ago" }, img: true, views: "1,820", loves: "142", comments: "12" },
];

export function UpdatesModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [tab, setTab] = useState<Tab>("all");
  const [type, setType] = useState<PostType>("news");

  return (
    <ModuleShell title={L("Novedades", "Updates")} subtitle={L("142 seguidores · 2 en vivo", "142 followers · 2 live")} onBack={onBack}>
      <ModuleTabs
        tabs={[
          { id: "all", label: L("Todas", "All") },
          { id: "live", label: L("En vivo", "Live"), count: 2 },
          { id: "scheduled", label: L("Programadas", "Scheduled"), count: 1 },
          { id: "drafts", label: L("Borradores", "Drafts"), count: 1 },
        ]}
        active={tab}
        onChange={setTab}
        className="pb-3"
      />

      <div className="space-y-4 px-4">
        {/* composer */}
        <Card className="p-3.5">
          <div className="flex gap-2.5">
            <Avatar initials="TE" tone="primary" size={36} />
            <div className="flex-1 rounded-tile bg-canvas px-3 py-2.5 text-[12.5px] font-semibold text-muted-soft">
              {L("¿Qué hay de nuevo en tu negocio? Oferta · evento · aviso…", "What's new at your business? Offer · event · news…")}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted">{L("Tipo:", "Type:")}</span>
            {([["news", L("Aviso", "News")], ["offer", L("Oferta", "Offer")], ["event", L("Evento", "Event")]] as const).map(([t, lbl]) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-pill px-3 py-1 text-[11.5px] font-extrabold ${type === t ? "bg-primary text-white" : "bg-canvas text-muted"}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="mt-2.5 flex gap-2">
            {[[<ImageIcon key="i" size={14} />, L("Foto", "Photo")], [<Video key="v" size={14} />, L("Video", "Video")], [<Tag key="t" size={14} />, L("Oferta", "Offer")]].map(([ic, lbl], i) => (
              <button key={i} className="flex items-center gap-1.5 rounded-pill border border-hair bg-surface px-3 py-1.5 text-[11.5px] font-extrabold text-muted">
                {ic} {lbl}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <GhostButton className="flex-1 py-2.5 text-[12px]">{L("Borrador", "Draft")}</GhostButton>
            <GhostButton className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px]">
              <Calendar size={14} /> {L("Programar", "Schedule")}
            </GhostButton>
            <PrimaryButton className="flex-1 py-2.5 text-[12px]">{L("Publicar", "Post")}</PrimaryButton>
          </div>
        </Card>

        {/* performance */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile icon={<span className="text-[12px]">👥</span>} label={L("Seguidores", "Followers")} value="142" sub={L("▲ 14 nuevos", "▲ 14 new")} subTone="success" />
          <StatTile icon={<Eye size={14} className="text-primary" />} label={L("Alcance prom.", "Avg reach")} value="1,820" sub="▲ 28%" subTone="success" />
        </div>

        {/* posts */}
        <div className="space-y-2.5">
          {POSTS.map((p) => (
            <Card key={p.text.es} className="overflow-hidden">
              {p.img ? <div className="h-28" style={categoryTile(p.text.es)} /> : null}
              <div className="p-3">
                <div className="mb-1.5 inline-flex rounded-pill bg-canvas px-2 py-0.5 text-[10px] font-extrabold text-muted">
                  {p.type === "offer" ? L("Oferta", "Offer") : p.type === "event" ? L("Evento", "Event") : L("Aviso", "News")} · {L(p.when.es, p.when.en)}
                </div>
                <p className="text-[12.5px] font-semibold leading-snug text-ink">{L(p.text.es, p.text.en)}</p>
                <div className="mt-2.5 flex gap-4 text-[11px] font-bold text-muted-soft">
                  <span className="flex items-center gap-1"><Eye size={13} /> {p.views}</span>
                  <span className="flex items-center gap-1"><Heart size={13} /> {p.loves}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={13} /> {p.comments}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}
