"use client";

import { useState } from "react";
import { Users, Briefcase, UserCheck, Clock, DollarSign, Eye } from "lucide-react";
import { useI18n } from "../../../lib/i18n";
import { Card, StatTile, StatusPill, PrimaryButton } from "../../../components/primitives";
import { Avatar } from "../../../components/ui";
import { ModuleShell, ModuleTabs, SegToggle } from "./_shell";

/**
 * Staff module — "Personal y empleos". Roster + job postings.
 * Matches reference/screenshots/module-08-staff.png.
 */
type Mode = "staff" | "jobs";
type STab = "team" | "schedule" | "attendance" | "payroll" | "roles";

const TEAM = [
  { name: "Elisabeth Rivera", initials: "ER", title: { es: "Fundadora", en: "Founder" }, role: { es: "Dueña", en: "Owner" }, tone: "primary" as const, status: { es: "En turno", en: "On shift" }, on: true },
  { name: "Marisa Díaz", initials: "MD", title: { es: "Jefa de panadería", en: "Head baker" }, role: { es: "Gerente", en: "Manager" }, tone: "warn" as const, status: { es: "En turno", en: "On shift" }, on: true },
  { name: "Marco Pellegrino", initials: "MP", title: { es: "Repartidor líder", en: "Lead driver" }, role: { es: "Repartidor", en: "Driver" }, tone: "neutral" as const, status: { es: "En entrega #2487", en: "On delivery #2487" }, on: true },
  { name: "Carlos Méndez", initials: "CM", title: { es: "Cocinero de línea", en: "Line cook" }, role: { es: "Staff", en: "Staff" }, tone: "neutral" as const, status: { es: "En descanso", en: "On break" }, on: false },
];

const JOBS = [
  { title: { es: "Cocinero de línea", en: "Line cook" }, when: { es: "hace 3 días", en: "3 days ago" }, pay: "$18/hr", type: { es: "Tiempo completo · con experiencia", en: "Full-time · experience required" }, applicants: 12, views: 328 },
  { title: { es: "Repartidor", en: "Driver" }, when: { es: "hace 1 semana", en: "1 week ago" }, pay: "$16.50/hr", type: { es: "Tiempo completo", en: "Full-time" }, applicants: 5, views: 186 },
  { title: { es: "Recepción", en: "Front desk" }, when: { es: "hace 2 horas", en: "2 hours ago" }, pay: "$17/hr", type: { es: "Medio tiempo", en: "Part-time" }, applicants: 3, views: 94 },
];

export function StaffModule({ onBack }: { onBack: () => void }) {
  const { L } = useI18n();
  const [mode, setMode] = useState<Mode>("staff");
  const [tab, setTab] = useState<STab>("team");

  return (
    <ModuleShell title={mode === "staff" ? L("Personal", "Staff") : L("Empleos", "Jobs")} subtitle={mode === "staff" ? L("14 activos · 5 en turno", "14 active · 5 on shift") : L("3 vacantes · 18 candidatos", "3 openings · 18 applicants")} onBack={onBack}>
      <div className="px-4 pb-3">
        <SegToggle
          segments={[
            { id: "staff", label: L("Personal", "Staff"), icon: <Users size={14} />, badge: 5 },
            { id: "jobs", label: L("Empleos", "Jobs"), icon: <Briefcase size={14} />, badge: 24 },
          ]}
          active={mode}
          onChange={setMode}
        />
      </div>

      {mode === "staff" ? (
        <>
          <ModuleTabs
            tabs={[
              { id: "team", label: L("Equipo", "Roster") },
              { id: "schedule", label: L("Horario", "Schedule") },
              { id: "attendance", label: L("Asistencia", "Attendance") },
              { id: "payroll", label: L("Nómina", "Payroll") },
              { id: "roles", label: L("Roles", "Roles") },
            ]}
            active={tab}
            onChange={setTab}
            className="pb-3"
          />
          <div className="space-y-4 px-4">
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile icon={<Users size={14} className="text-primary" />} label={L("Total", "Total")} value="14" sub={L("3 gerentes · 11 staff", "3 managers · 11 staff")} />
              <StatTile icon={<UserCheck size={14} className="text-success" />} label={L("En turno", "On shift")} value="5" sub={L("2 en descanso", "2 on break")} />
              <StatTile icon={<Clock size={14} className="text-warn" />} label={L("Horas · sem", "Hours · wk")} value="428" sub="▲ 12%" subTone="success" />
              <StatTile icon={<DollarSign size={14} className="text-rose" />} label={L("Costo · 30d", "Cost · 30d")} value="$22.8k" sub={L("28% de ingresos", "28% of revenue")} />
            </div>

            {tab === "team" ? (
              <div className="space-y-2.5">
                {TEAM.map((m) => (
                  <Card key={m.name} className="flex items-center gap-3 p-3">
                    <Avatar initials={m.initials} tone="canvas" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-extrabold text-ink">{m.name}</span>
                        <StatusPill tone={m.tone}>{L(m.role.es, m.role.en)}</StatusPill>
                      </div>
                      <div className="text-[11.5px] font-semibold text-muted">{L(m.title.es, m.title.en)}</div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-[10.5px] font-extrabold ${m.on ? "text-success" : "text-muted-soft"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.on ? "bg-success" : "bg-muted-soft"}`} /> {L(m.status.es, m.status.en)}
                    </span>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-5 text-center">
                <div className="text-[14px] font-extrabold text-ink">
                  {tab === "schedule" ? L("Horario semanal", "Weekly schedule") : tab === "attendance" ? L("Reloj checador", "Time clock") : tab === "payroll" ? L("Nómina", "Payroll") : L("Roles y permisos", "Roles & permissions")}
                </div>
                <p className="mx-auto mt-1 max-w-[260px] text-[12px] font-semibold leading-snug text-muted">
                  {L("Administra turnos, asistencia, nómina y permisos del equipo.", "Manage shifts, attendance, payroll and team permissions.")}
                </p>
              </Card>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4 px-4 pt-1">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon={<Briefcase size={14} className="text-primary" />} label={L("Vacantes", "Open")} value="3" />
            <StatTile icon={<Users size={14} className="text-rose" />} label={L("Candidatos", "Applicants")} value="18" />
            <StatTile icon={<Eye size={14} className="text-muted" />} label={L("Vistas", "Views")} value="484" />
          </div>
          <PrimaryButton className="w-full">{L("Publicar vacante", "Post a job")}</PrimaryButton>
          <div className="space-y-2.5">
            {JOBS.map((j) => (
              <Card key={j.title.es} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13.5px] font-extrabold text-ink">{L(j.title.es, j.title.en)}</span>
                  <span className="flex-none text-[13px] font-extrabold text-primary">{j.pay}</span>
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-muted-soft">{L(j.when.es, j.when.en)}</div>
                <div className="mt-1 text-[11.5px] font-semibold text-muted">{L(j.type.es, j.type.en)}</div>
                <div className="mt-2 flex items-center justify-between border-t border-hair pt-2">
                  <span className="text-[11px] font-bold text-muted">👥 {j.applicants} {L("candidatos", "applicants")} · 👁 {j.views}</span>
                  <button className="text-[11.5px] font-extrabold text-primary">{L("Ver candidatos ›", "Open pipeline ›")}</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
