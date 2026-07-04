'use client';

// Personal y Empleos / Staff module (business dashboard). MODE TOGGLE
// Personal · Empleos (initial from `tab`). Personal sub-tabs: Equipo (roster
// cards → member bottom-sheet), Horario (today gantt with a "now" line),
// Asistencia (time-clock list), Nómina (run-payroll summary + action), Roles
// (permission matrix). Empleos sub-tabs: Vacantes (openings + post-job),
// Candidatos (applicant pipeline), Visibilidad (toggles). Free tier LOCKS
// Horario/Asistencia/Nómina (PRO upsell) and caps the roster at 2 members.
// Mobile-first; on desktop it fans out into multi-column grids + sticky rails.
// Real state: mode, sub-tabs, roster filter, member sheet, invite sheet,
// post-job flow, run-payroll toast, visibility toggles.

import { useMemo, useState } from 'react';
import {
  Award, Briefcase, Calendar, Check, ChevronLeft, ChevronRight, Clock, DollarSign,
  Eye, Inbox, Lock, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Shield, User, Users,
} from 'lucide-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';

type Mode = 'staff' | 'jobs';
type StaffTab = 'roster' | 'schedule' | 'time' | 'payroll' | 'roles';
type JobTab = 'jobs' | 'pipeline' | 'visibility';
type Role = 'owner' | 'manager' | 'staff' | 'driver';

type Member = {
  id: number; nm: string; c: string; role: Role; titleEs: string; titleEn: string;
  hours: string; dot: string; stEs: string; stEn: string; permsEs: string; permsEn: string;
  since: string; invited?: boolean;
};
type Job = {
  id: number; titleEs: string; titleEn: string; pay: string; typeEs: string; typeEn: string;
  applied: number; viewed: number; whenEs: string; whenEn: string; tag: 'live' | 'new' | 'paused';
};

const cardCls = 'rounded-card-sm border border-hair bg-white shadow-card';

// role pill (data colors → inline hex, tokens for className where possible)
const ROLE_PILL: Record<Role, string> = {
  owner: 'bg-ink text-white',
  manager: 'bg-lilac text-primary-dark',
  staff: 'bg-green-bg text-green-dark',
  driver: 'bg-pink-bg text-pink-dark',
};
const TAG_PILL: Record<Job['tag'], string> = {
  live: 'bg-green-bg text-green-dark',
  new: 'bg-pink-bg text-pink-dark',
  paused: 'bg-lilac-2 text-ink-2',
};

const initialsOf = (nm: string) => nm.split(' ').map((x) => x[0]).slice(0, 2).join('');

export function StaffModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;
  void isPremium; void ci; // ctx destructured per module contract; not all fields used here
  const salon = ctx.rubro === 'beauty';

  const [mode, setMode] = useState<Mode>(tab === 'jobs' ? 'jobs' : 'staff');
  const [stabStaff, setStabStaff] = useState<StaffTab>('roster');
  const [stabJobs, setStabJobs] = useState<JobTab>('jobs');
  const [rfilter, setRfilter] = useState<'all' | 'onshift' | Role>('all');
  const [viewing, setViewing] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'owner'>>('staff');
  const [extra, setExtra] = useState<Member[]>([]);
  const [jobsExtra, setJobsExtra] = useState<Job[]>([]);
  const [vis, setVis] = useState({ pub: true, board: true, email: false, boost: false });
  const [payrollDone, setPayrollDone] = useState(false);
  const [toast, setToast] = useState('');

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2000);
  };

  const roleLabel = (r: Role) => ({ owner: L('Dueña', 'Owner'), manager: L('Gerente', 'Manager'), staff: 'Staff', driver: L('Repartidor', 'Driver') }[r]);

  const baseRoster = useMemo<Member[]>(
    () => [
      { id: 1, nm: 'Elisabeth Rivera', c: '#7B61FF', role: 'owner', titleEs: 'Fundadora', titleEn: 'Founder', hours: 'Full-time', dot: '#1F9D57', stEs: 'En turno', stEn: 'On shift', permsEs: 'Acceso total', permsEn: 'All access', since: '2002' },
      { id: 2, nm: 'Marisa Díaz', c: '#1F9D57', role: 'manager', titleEs: salon ? 'Estilista jefa' : 'Jefa de panadería', titleEn: salon ? 'Lead stylist' : 'Head baker', hours: 'Full-time', dot: '#1F9D57', stEs: 'En turno', stEn: 'On shift', permsEs: 'Todo menos pagos', permsEn: 'All but billing', since: '2024' },
      { id: 3, nm: 'Marco Pellegrino', c: '#E8954A', role: 'driver', titleEs: 'Repartidor líder', titleEn: 'Lead driver', hours: 'Part-time', dot: '#1F9D57', stEs: 'En entrega · #2487', stEn: 'On delivery · #2487', permsEs: 'Pedidos y entregas', permsEn: 'Orders & deliveries', since: '2023' },
      { id: 4, nm: 'Sofía Reyes', c: '#D6336C', role: 'staff', titleEs: salon ? 'Recepción' : 'Atención a clientes', titleEn: 'Front of house', hours: 'Full-time', dot: '#1F9D57', stEs: 'En turno · piso', stEn: 'On shift · floor', permsEs: 'Pedidos y reservas', permsEn: 'Orders & bookings', since: '2024' },
      { id: 5, nm: 'Carlos Méndez', c: '#2A5C8A', role: 'staff', titleEs: salon ? 'Asistente' : 'Cocinero de línea', titleEn: salon ? 'Assistant' : 'Line cook', hours: 'Full-time', dot: '#F4B740', stEs: 'En descanso', stEn: 'On break', permsEs: 'Menú y pedidos', permsEn: 'Menu & orders', since: '2024' },
      { id: 6, nm: 'David Bao', c: '#138A72', role: 'manager', titleEs: salon ? 'Colorista' : 'Sommelier', titleEn: salon ? 'Colorist' : 'Sommelier', hours: 'Full-time', dot: '#1F9D57', stEs: 'En turno · barra', stEn: 'On shift · bar', permsEs: 'Barra y vinos', permsEn: 'Bar & wine', since: '2023' },
      { id: 7, nm: 'Lucía Martín', c: '#9F1239', role: 'driver', titleEs: 'Repartidora', titleEn: 'Driver', hours: 'Part-time', dot: '#C0BBD0', stEs: 'Libre hoy', stEn: 'Off today', permsEs: 'Pedidos y entregas', permsEn: 'Orders & deliveries', since: '2025' },
    ],
    [salon],
  );

  const roster = useMemo(() => [...extra, ...baseRoster], [extra, baseRoster]);
  const jobs = useMemo<Job[]>(
    () => [
      ...jobsExtra,
      { id: 1, titleEs: 'Cocinero de línea · noche', titleEn: 'Line cook · evening', pay: '$22–$26/hr', typeEs: 'Tiempo completo · 4 días', typeEn: 'Full-time · 4 days/wk', applied: 12, viewed: 280, whenEs: 'hace 8 días', whenEn: '8 days ago', tag: 'live' },
      { id: 2, titleEs: 'Repartidor · fines de semana', titleEn: 'Driver · weekends', pay: `$18/hr + ${L('propinas', 'tips')}`, typeEs: 'Medio tiempo · Sáb–Dom', typeEn: 'Part-time · Sat–Sun', applied: 8, viewed: 142, whenEs: 'hace 4 días', whenEn: '4 days ago', tag: 'live' },
      { id: 3, titleEs: 'Pastelero · masa madre', titleEn: 'Pastry chef · sourdough', pay: '$28–$32/hr', typeEs: 'Tiempo completo · 5 días', typeEn: 'Full-time · 5 days/wk', applied: 4, viewed: 62, whenEs: 'ayer', whenEn: 'yesterday', tag: 'new' },
    ],
    [jobsExtra, L],
  );
  const applicantTotal = jobs.reduce((a, j) => a + j.applied, 0);
  const onShiftCount = 5;

  // ---------- shared chip helpers ----------
  const modeBtn = (on: boolean) =>
    `relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;
  const subChip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[12px] ${on ? 'bg-ink font-extrabold text-white' : 'bg-lilac-2 font-bold text-ink-2'}`;
  const filterChip = (on: boolean) =>
    `flex-none cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'border border-lilac-line bg-white font-bold text-ink-soft'}`;

  const dotColor = (dot: string) => (dot === '#1F9D57' ? 'text-green-dark' : dot === '#F4B740' ? 'text-amber-ink' : 'text-muted-2');

  // ============================ PERSONAL ============================
  const staffKpis = isFree
    ? [
        { Icon: Users, c: '#6D4DF6', bg: '#F1EFFA', label: L('Equipo', 'Team'), value: '2', delta: L('límite Free', 'Free limit'), dCls: 'text-amber-ink' },
        { Icon: User, c: '#1F8A4C', bg: '#E3F5EA', label: L('Activos', 'Active'), value: '2', delta: '—', dCls: 'text-muted-2' },
        { Icon: Clock, c: '#B5791A', bg: '#FCEFD6', label: L('Reloj', 'Time clock'), value: '—', delta: 'Verified', dCls: 'text-amber-ink' },
        { Icon: DollarSign, c: '#D6336C', bg: '#FDE7EF', label: L('Nómina', 'Payroll'), value: '—', delta: 'Verified', dCls: 'text-amber-ink' },
      ]
    : [
        { Icon: Users, c: '#6D4DF6', bg: '#F1EFFA', label: L('Total', 'Total staff'), value: '14', delta: L('3 gerentes · 11 staff', '3 mgrs · 11 staff'), dCls: 'text-muted-2' },
        { Icon: User, c: '#1F8A4C', bg: '#E3F5EA', label: L('En turno', 'On shift now'), value: '5', delta: L('2 en descanso', '2 on break'), dCls: 'text-muted-2' },
        { Icon: Clock, c: '#B5791A', bg: '#FCEFD6', label: L('Horas · sem', 'Hours · wk'), value: '428', delta: '▲ 12%', dCls: 'text-green-dark' },
        { Icon: DollarSign, c: '#D6336C', bg: '#FDE7EF', label: L('Costo · 30d', 'Labor · 30d'), value: '$22.8k', delta: L('28% de ingresos', '28% of revenue'), dCls: 'text-muted-2' },
      ];

  const kpiRow = (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {staffKpis.map((k) => (
        <div key={k.label} className={`${cardCls} p-3.5`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}>
            <k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} />
          </span>
          <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
          <div className="mt-0.5 text-[19px] font-extrabold text-ink">{k.value}</div>
          <div className={`text-[9.5px] font-extrabold ${k.dCls}`}>{k.delta}</div>
        </div>
      ))}
    </div>
  );

  // ---- gating ----
  const gated: Record<string, boolean> = { schedule: true, time: true, payroll: true };
  const staffLocked = isFree && mode === 'staff' && !!gated[stabStaff];
  const lockCopy: Record<string, [string, string]> = {
    schedule: [L('Horarios con Verified', 'Scheduling with Verified'), L('Crea horarios semanales, copia turnos y notifica a tu equipo.', 'Build weekly schedules, copy shifts and notify your team.')],
    time: [L('Reloj con Verified', 'Time clock with Verified'), L('Controla entradas, descansos y horas extra automáticamente.', 'Track clock-ins, breaks and overtime automatically.')],
    payroll: [L('Nómina con Verified', 'Payroll with Verified'), L('Corre la nómina con depósito directo e impuestos automáticos.', 'Run payroll with direct deposit and auto-filed taxes.')],
  };

  const lockCard = (() => {
    const [title, sub] = lockCopy[stabStaff] ?? lockCopy.schedule;
    return (
      <div className={`${cardCls} px-6 py-8 text-center`}>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-tile bg-ink">
          <Lock size={24} strokeWidth={2.2} className="text-amber" />
        </span>
        <div className="mt-3.5 text-[16px] font-extrabold text-ink">{title}</div>
        <div className="mx-auto mt-2 max-w-[340px] text-[12.5px] font-medium leading-relaxed text-muted">{sub}</div>
        <button
          onClick={() => ctx.go('billing')}
          className="mt-4 cursor-pointer rounded-btn-lg bg-primary px-5 py-3 text-[12.5px] font-extrabold text-white shadow-cta-sm"
        >
          {L('Mejorar a Verified', 'Upgrade to Verified')} ›
        </button>
      </div>
    );
  })();

  // ---- roster ----
  const filters: [('all' | 'onshift' | Role), string][] = [
    ['all', L('Todos', 'All')], ['onshift', L('En turno', 'On shift')], ['manager', L('Gerentes', 'Managers')], ['staff', 'Staff'], ['driver', L('Repartidores', 'Drivers')],
  ];
  const capped = isFree ? roster.slice(0, 2) : roster;
  const visibleRoster = capped.filter((m) => {
    if (rfilter === 'all') return true;
    if (rfilter === 'onshift') return m.stEn.startsWith('On');
    return m.role === rfilter;
  });

  const rolesPreview: { role: Role; n: number; es: string; en: string }[] = [
    { role: 'owner', n: 1, es: 'Todo · pagos · banca · transferir', en: 'Everything · billing · banking · transfer' },
    { role: 'manager', n: 3, es: 'Todos los módulos · sin banca', en: 'All modules · no banking' },
    { role: 'staff', n: 5, es: 'Pedidos, reservas, clientes', en: 'Orders, bookings, customers' },
    { role: 'driver', n: 5, es: 'Solo entregas y ruta', en: 'Deliveries & route only' },
  ];
  const peopleN = (n: number) => `${n} ${n === 1 ? L('persona', 'person') : L('personas', 'people')}`;

  const inviteBtn = (
    <button
      onClick={() => setInviteOpen(true)}
      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm"
    >
      <Plus size={15} strokeWidth={2.6} />{L('Invitar', 'Invite')}
    </button>
  );

  const rosterView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="no-scrollbar -mx-1 flex flex-1 gap-2 min-w-0 overflow-x-auto px-1">
            {filters.map(([k, label]) => (
              <button key={k} onClick={() => setRfilter(k)} className={filterChip(rfilter === k)}>{label}</button>
            ))}
          </div>
          <div className="hidden flex-none xl:block">{inviteBtn}</div>
        </div>

        <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-3 xl:grid-cols-1">
          {visibleRoster.map((m) => (
            <button
              key={m.id}
              onClick={() => setViewing(m.id)}
              className={`${cardCls} flex cursor-pointer items-center gap-3 p-3 text-left`}
            >
              <span className="relative flex-none">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: m.c }}>{initialsOf(m.nm)}</span>
                <span className="absolute -bottom-px -right-px h-3 w-3 rounded-full border-2 border-white" style={{ background: m.dot }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold text-ink">{m.nm}</span>
                  {m.invited && <span className="rounded bg-amber-bg px-1.5 py-px text-[8px] font-extrabold text-amber-ink">{L('Invitado', 'Invited')}</span>}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-2">{L(m.titleEs, m.titleEn)} · {L(m.stEs, m.stEn)}</span>
              </span>
              <span className={`flex-none rounded-md px-2 py-1 text-[9.5px] font-extrabold ${ROLE_PILL[m.role]}`}>{roleLabel(m.role)}</span>
            </button>
          ))}

          {isFree && (
            <div className="rounded-card-sm border border-lilac-line bg-lilac-2 p-4 md:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-2 text-[13px] font-extrabold text-primary-dark">
                <Users size={15} strokeWidth={2.2} />{L('Equipo limitado a 2 en Free', 'Team capped at 2 on Free')}
              </div>
              <div className="mt-1 text-[11.5px] font-semibold leading-snug text-ink-3">
                {L('Mejora a Verified para agregar miembros ilimitados, roles y permisos por persona.', 'Upgrade to Verified to add unlimited members, roles and per-person permissions.')}
              </div>
              <button onClick={() => ctx.go('billing')} className="mt-2.5 cursor-pointer rounded-field bg-primary px-3.5 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
                {L('Agregar más miembros', 'Add more members')}
              </button>
            </div>
          )}
        </div>

        <div className="xl:hidden">{inviteBtn}</div>
      </div>

      {/* roles rail */}
      <div className={`${cardCls} p-4 xl:sticky xl:top-[74px]`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Shield size={14} strokeWidth={2.2} className="text-primary-dark" />{L('Roles y permisos', 'Roles & permissions')}</span>
          <button onClick={() => setStabStaff('roles')} className="cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Gestionar', 'Manage')} ›</button>
        </div>
        <div className="flex flex-col gap-2.5">
          {rolesPreview.map((r) => (
            <div key={r.role} className="rounded-btn-lg border border-hair bg-app p-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${ROLE_PILL[r.role]}`}>{roleLabel(r.role)}</span>
                <span className="text-[10.5px] font-semibold text-muted-2">{peopleN(r.n)}</span>
              </div>
              <div className="mt-1.5 text-[10.5px] font-medium leading-snug text-ink-3">{L(r.es, r.en)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- schedule (today gantt) ----
  const schedRaw: [string, string, number, number, string][] = [
    ['Marisa', L('Pan', 'Baker'), 5, 13, '#6D4DF6'],
    ['Elisabeth', L('Chef', 'Chef'), 7, 22, '#1E1B2E'],
    ['David', L('Barra', 'Bar'), 11, 23, '#9579FF'],
    ['Sofía', 'FOH', 11, 19, '#1F9D57'],
    ['Marco', L('Repart', 'Driver'), 11, 23, '#D6336C'],
    ['Carlos', L('Cocina', 'Cook'), 11, 21, '#E8954A'],
    ['Tomás', L('Postre', 'Pastry'), 5, 13, '#138A72'],
  ];
  const nowLeft = (14 / 24) * 100;

  const scheduleView = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className="flex cursor-pointer items-center rounded-field border border-hair bg-white px-2.5 py-2 text-ink-soft"><ChevronLeft size={14} strokeWidth={2.4} /></button>
        <button className="flex-1 cursor-pointer rounded-field border border-hair bg-white px-3 py-2 text-[11.5px] font-extrabold text-ink">{L('Semana del', 'Week of')} · 13 Oct</button>
        <button className="flex cursor-pointer items-center rounded-field border border-hair bg-white px-2.5 py-2 text-ink-soft"><ChevronRight size={14} strokeWidth={2.4} /></button>
      </div>
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Calendar size={14} strokeWidth={2.2} className="text-primary-dark" />{L('Horario de hoy', "Today's schedule")}</span>
          <span className="text-[10.5px] font-semibold text-muted-2">428 {L('hrs', 'hrs')} · $22.8k</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {schedRaw.map(([nm, role, a, b, c]) => (
            <div key={nm} className="grid grid-cols-[86px_1fr] items-center gap-2 md:grid-cols-[120px_1fr]">
              <div className="truncate text-[11px] font-bold text-ink">{nm}<span className="font-medium text-muted-2"> · {role}</span></div>
              <div className="relative h-[22px] overflow-hidden rounded-md" style={{ background: '#ECE8F4' }}>
                <div
                  className="absolute inset-y-0 flex items-center overflow-hidden rounded-md px-1.5 text-[8.5px] font-extrabold text-white"
                  style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%`, background: c }}
                >
                  {a}–{b}
                </div>
                <div className="absolute -inset-y-0.5" style={{ left: `${nowLeft}%`, width: '2px', background: '#D6336C' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-[86px_1fr] gap-2 md:grid-cols-[120px_1fr]">
          <span />
          <div className="flex justify-between text-[8.5px] font-bold text-muted-faint">
            <span>12a</span><span>6a</span><span>12p</span><span className="text-pink-dark">2p</span><span>6p</span><span>12a</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ---- time clock ----
  const timeStats = [
    { label: L('En turno', 'Clocked in'), value: '5', note: L('activos', 'on shift'), noteCls: 'text-green-dark', tone: cardCls },
    { label: L('Horas hoy', 'Hours today'), value: '62.4', note: L('▲ en ritmo', '▲ on pace'), noteCls: 'text-green-dark', tone: cardCls },
    { label: L('Cerca de extra', 'Near OT'), value: '1', note: '⚠ 48h', noteCls: 'text-amber-ink', tone: 'rounded-card-sm border border-amber bg-amber-bg' },
  ];
  const timeRaw: [string, string, string, string, number, number, string][] = [
    ['Elisabeth Rivera', '#1E1B2E', '6:52a', '—', 7.1, 48.2, '#1F9D57'],
    ['Marisa Díaz', '#6D4DF6', '4:58a', '1:04p', 7.6, 38.4, '#C0BBD0'],
    ['David Bao', '#138A72', '10:55a', '—', 3.1, 41.0, '#1F9D57'],
    ['Sofía Reyes', '#1F9D57', '10:58a', '—', 3.0, 36.5, '#1F9D57'],
    ['Carlos Méndez', '#E8954A', '11:02a', '—', 2.2, 39.1, '#F4B740'],
  ];

  const timeView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-3 gap-3">
          {timeStats.map((s) => (
            <div key={s.label} className={`${s.tone} p-3`}>
              <div className="text-[9px] font-bold text-muted">{s.label}</div>
              <div className="mt-0.5 text-[18px] font-extrabold text-ink">{s.value}</div>
              <div className={`text-[8.5px] font-extrabold ${s.noteCls}`}>{s.note}</div>
            </div>
          ))}
        </div>
        <div className={`${cardCls} px-4 py-1.5`}>
          <div className="flex items-center justify-between border-b border-hair py-3">
            <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Clock size={14} strokeWidth={2.2} className="text-primary-dark" />{L('Reloj · hoy', 'Time clock · today')}</span>
            <button onClick={() => flash(L('Exportando reporte…', 'Exporting report…'))} className="cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Exportar', 'Export')}</button>
          </div>
          {timeRaw.map(([nm, c, cin, out, today, week, dot], i) => (
            <div key={String(nm)} className={`flex items-center gap-3 py-2.5 ${i < timeRaw.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="relative flex-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10.5px] font-extrabold text-white" style={{ background: c as string }}>{initialsOf(nm as string)}</span>
                <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: dot as string }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-extrabold text-ink">{nm}</span>
                <span className="block text-[10px] font-medium text-muted-2">{L('Entró', 'In')} {cin} · {out === '—' ? L('en turno', 'on shift') : String(out)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[12px] font-extrabold text-ink">{Number(today).toFixed(1)}h</span>
                <span className={`block text-[9px] font-semibold ${Number(week) >= 44 ? 'text-amber-ink' : 'text-muted-2'}`}>{Number(week).toFixed(1)}h {L('sem', 'wk')}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className={`${cardCls} p-4 xl:sticky xl:top-[74px]`}>
        <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Resumen del día', "Today's summary")}</div>
        <div className="flex flex-col gap-2.5">
          {[
            { Icon: User, c: '#1F8A4C', bg: '#E3F5EA', t: L('En turno ahora', 'On shift now'), r: '5' },
            { Icon: Clock, c: '#B5791A', bg: '#FCEFD6', t: L('En descanso', 'On break'), r: '2' },
            { Icon: Award, c: '#6D4DF6', bg: '#F1EFFA', t: L('Puntualidad', 'On-time rate'), r: '96%' },
          ].map((s) => (
            <div key={s.t} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: s.bg }}>
                <s.Icon size={15} strokeWidth={2.2} style={{ color: s.c }} />
              </span>
              <span className="flex-1 text-[12px] font-extrabold text-ink">{s.t}</span>
              <span className="text-[13px] font-extrabold text-ink">{s.r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- payroll ----
  const payRaw: [string, string, string, number, number, string][] = [
    ['Marisa Díaz', '#6D4DF6', '$32', 38, 2, '$1,312'],
    ['David Bao', '#138A72', '$30', 40, 1, '$1,245'],
    ['Sofía Reyes', '#1F9D57', '$24', 36, 0, '$864'],
    ['Carlos Méndez', '#E8954A', '$23', 39, 0, '$897'],
    ['Marco P.', '#D6336C', '$18', 28, 0, '$504+'],
  ];
  const runPayroll = () => { setPayrollDone(true); flash(L('Nómina corrida · depósito en 2 días', 'Payroll run · deposit in 2 days')); };

  const payrollView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-3.5">
        <div className="rounded-card-sm border border-green bg-green-bg p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white">
              <Check size={16} strokeWidth={2.8} className="text-green" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold text-green-dark">{payrollDone ? L('Nómina corrida · 7–13 Oct', 'Payroll run · Oct 7–13') : L('Nómina lista · 7–13 Oct', 'Payroll ready · Oct 7–13')}</div>
              <div className="mt-0.5 text-[10.5px] font-medium leading-snug text-green-dark/80">{L('Horas sincronizadas del reloj. Revisa y corre — depósito en 2 días.', 'Hours synced from the clock. Review, then run — deposit in 2 days.')}</div>
            </div>
          </div>
          <button
            onClick={runPayroll}
            disabled={payrollDone}
            className={`mt-3 w-full rounded-btn py-3 text-[12.5px] font-extrabold text-white ${payrollDone ? 'cursor-not-allowed bg-muted-faint' : 'cursor-pointer bg-green shadow-cta-sm'}`}
          >
            {payrollDone ? `✓ ${L('Nómina corrida', 'Payroll run')}` : `${L('Correr nómina', 'Run payroll')} · $6,404`}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[[L('Bruto', 'Gross'), '$6,404'], [L('Reg/Extra', 'Reg/OT'), '215/3'], [L('Impuestos', 'Taxes & fees'), '$1,486']].map(([l, v]) => (
            <div key={l} className={`${cardCls} p-3`}>
              <div className="text-[9px] font-bold text-muted">{l}</div>
              <div className="mt-0.5 text-[16px] font-extrabold text-ink">{v}</div>
            </div>
          ))}
        </div>

        <div className={`${cardCls} px-4 py-1.5`}>
          <div className="border-b border-hair py-3 text-[12.5px] font-extrabold text-ink">{L('Periodo', 'Period')} · Oct 7–13</div>
          {payRaw.map(([nm, c, rate, reg, ot, gross], i) => (
            <div key={String(nm)} className={`flex items-center gap-3 py-2.5 ${i < payRaw.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[10.5px] font-extrabold text-white" style={{ background: c as string }}>{initialsOf(nm as string)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-extrabold text-ink">{nm}</span>
                <span className="block text-[10px] font-medium text-muted-2">{rate}/hr · {reg}h{Number(ot) > 0 ? ` · ${ot} OT` : ''}</span>
              </span>
              <span className="text-[12.5px] font-extrabold text-ink">{gross}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardCls} p-4 xl:sticky xl:top-[74px]`}>
        <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Depósito', 'Deposit')}</div>
        <div className="flex flex-col gap-2.5">
          {[
            { Icon: DollarSign, c: '#1F8A4C', bg: '#E3F5EA', t: L('Neto a pagar', 'Net to pay'), r: '$4,918' },
            { Icon: Calendar, c: '#6D4DF6', bg: '#F1EFFA', t: L('Fecha de depósito', 'Deposit date'), r: '15 Oct' },
            { Icon: Users, c: '#B5791A', bg: '#FCEFD6', t: L('Empleados', 'Employees'), r: '5' },
          ].map((s) => (
            <div key={s.t} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: s.bg }}>
                <s.Icon size={15} strokeWidth={2.2} style={{ color: s.c }} />
              </span>
              <span className="flex-1 text-[12px] font-extrabold text-ink">{s.t}</span>
              <span className="text-[13px] font-extrabold text-ink">{s.r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- roles + permission matrix ----
  const roleDefs: { role: Role; n: number; es: string[]; en: string[] }[] = [
    { role: 'owner', n: 1, es: ['Todo · todas las acciones', 'Pagos y banca', 'Transferir negocio'], en: ['All actions', 'Billing & banking', 'Transfer business'] },
    { role: 'manager', n: 3, es: ['Ver y editar todo', 'Sin banca', 'Invita staff'], en: ['View & edit all', 'No banking', 'Invite staff'] },
    { role: 'staff', n: 5, es: ['Pedidos y reservas', 'Notas de cliente', 'Sin precios'], en: ['Orders & bookings', 'Customer notes', 'No pricing'] },
    { role: 'driver', n: 5, es: ['Ver sus entregas', 'Actualizar ruta', 'Solo mensajes'], en: ['Own deliveries', 'Update route', 'Messaging only'] },
  ];
  const permModules = [L('Anuncio e info', 'Listing & info'), L('Menú y precios', 'Menu & pricing'), L('Pedidos', 'Orders'), L('Reservas', 'Bookings'), L('Clientes', 'Customers'), L('Pagos', 'Payouts'), L('Personal', 'Staff'), L('Facturación', 'Billing')];
  const permData = [[2, 2, 1, 0], [2, 2, 0, 0], [2, 2, 2, 1], [2, 2, 2, 0], [2, 2, 1, 0], [2, 1, 0, 0], [2, 2, 0, 0], [2, 0, 0, 0]];
  const permCell = (v: number) => {
    if (v === 2) return <span className="inline-flex h-[19px] w-[19px] items-center justify-center rounded-md bg-green-bg"><Check size={10} strokeWidth={3} className="text-green-dark" /></span>;
    if (v === 1) return <span className="inline-flex h-[19px] w-[19px] items-center justify-center rounded-md" style={{ background: '#E4ECFB' }}><Eye size={10} strokeWidth={2.6} style={{ color: '#2A5C8A' }} /></span>;
    return <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-faint" />;
  };

  const rolesView = (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-3 md:grid-cols-2">
        {roleDefs.map((r) => (
          <div key={r.role} className={`${cardCls} p-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[9.5px] font-extrabold ${ROLE_PILL[r.role]}`}>{roleLabel(r.role)}</span>
                <span className="text-[10.5px] font-semibold text-muted-2">{peopleN(r.n)}</span>
              </div>
              <button className="cursor-pointer text-muted-2" aria-label={L('Editar rol', 'Edit role')}><Pencil size={13} strokeWidth={2.2} /></button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(es ? r.es : r.en).map((c) => (
                <span key={c} className="rounded-md border border-hair bg-app px-2 py-0.5 text-[10px] font-semibold text-ink-soft">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Lock size={14} strokeWidth={2.2} className="text-primary-dark" />{L('Matriz de permisos', 'Permission matrix')}</span>
          <span className="flex gap-3">
            <span className="flex items-center gap-1 text-[9px] font-bold text-green-dark"><Pencil size={9} strokeWidth={2.4} />{L('Editar', 'Edit')}</span>
            <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: '#2A5C8A' }}><Eye size={9} strokeWidth={2.4} />{L('Ver', 'View')}</span>
          </span>
        </div>
        <div className="no-scrollbar min-w-0 overflow-x-auto">
          <div className="min-w-[360px]">
            <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] border-b border-hair pb-2.5">
              <span className="text-[8.5px] font-extrabold uppercase tracking-[.04em] text-muted-faint">{L('Módulo', 'Module')}</span>
              {[L('Dueño', 'Owner'), L('Gte', 'Mgr'), 'Staff', L('Repart', 'Driver')].map((h) => (
                <span key={h} className="text-center text-[8.5px] font-extrabold uppercase tracking-[.02em] text-muted-faint">{h}</span>
              ))}
            </div>
            {permModules.map((m, i) => (
              <div key={m} className={`grid grid-cols-[1.5fr_repeat(4,1fr)] items-center py-2.5 ${i < permModules.length - 1 ? 'border-b border-hair' : ''}`}>
                <span className="text-[11px] font-semibold text-ink">{m}</span>
                {permData[i].map((v, j) => (
                  <span key={j} className="flex justify-center">{permCell(v)}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================ EMPLEOS ============================
  const jobStats = [
    [L('Vacantes', 'Open'), String(jobs.length)],
    [L('Candidatos', 'Applicants'), String(applicantTotal)],
    [L('Vistas', 'Views'), '484'],
  ];
  const postJob = () => {
    const id = Date.now();
    setJobsExtra((j) => [
      { id, titleEs: 'Nueva vacante · borrador', titleEn: 'New position · draft', pay: '$20–$24/hr', typeEs: 'Tiempo completo', typeEn: 'Full-time', applied: 0, viewed: 0, whenEs: 'recién', whenEn: 'just now', tag: 'new' },
      ...j,
    ]);
    flash(L('Vacante publicada en tu anuncio', 'Job posted to your listing'));
  };
  const tagLabel = (t: Job['tag']) => ({ live: L('En vivo', 'Live'), new: L('Recién', 'Just posted'), paused: L('Pausada', 'Paused') }[t]);

  const jobsView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-3 gap-3">
          {jobStats.map(([l, v]) => (
            <div key={l} className={`${cardCls} p-3`}>
              <div className="text-[9px] font-bold text-muted">{l}</div>
              <div className="mt-0.5 text-[18px] font-extrabold text-ink">{v}</div>
            </div>
          ))}
        </div>
        <button onClick={postJob} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn-lg bg-primary py-3 text-[13px] font-extrabold text-white shadow-cta-sm">
          <Plus size={16} strokeWidth={2.6} />{L('Publicar vacante', 'Post a job')}
        </button>
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-1">
          {jobs.map((j) => (
            <div key={j.id} className={`${cardCls} p-4`}>
              <div className="mb-1.5 flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-[9px] font-extrabold ${TAG_PILL[j.tag]}`}>{tagLabel(j.tag)}</span>
                <span className="text-[10px] font-medium text-muted-2">{L(j.whenEs, j.whenEn)}</span>
              </div>
              <div className="text-[14.5px] font-extrabold tracking-[-.01em] text-ink">{L(j.titleEs, j.titleEn)}</div>
              <div className="mt-0.5 text-[12.5px] font-extrabold text-ink">{j.pay}</div>
              <div className="text-[11px] font-medium text-muted-2">{L(j.typeEs, j.typeEn)}</div>
              <div className="mt-3 flex items-center gap-4 border-t border-dashed border-hair pt-3 text-[11px] font-bold text-ink-soft">
                <span className="flex items-center gap-1"><Users size={13} strokeWidth={2.2} className="text-muted-2" />{j.applied}</span>
                <span className="flex items-center gap-1"><Eye size={13} strokeWidth={2.2} className="text-muted-2" />{j.viewed}</span>
                <button onClick={() => setStabJobs('pipeline')} className="ml-auto cursor-pointer text-primary-dark">{L('Ver candidatos', 'Open pipeline')} ›</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${cardCls} p-4 xl:sticky xl:top-[74px]`}>
        <div className="mb-3 text-[12.5px] font-extrabold text-ink">{L('Consejos para contratar', 'Hiring tips')}</div>
        <div className="flex flex-col gap-2.5">
          {[
            { Icon: Award, c: '#6D4DF6', bg: '#F1EFFA', t: L('Publica el rango de pago', 'Post a pay range'), s: L('3× más solicitudes', '3× more applicants') },
            { Icon: MapPin, c: '#1F8A4C', bg: '#E3F5EA', t: L('Local primero', 'Local first'), s: L('Aparece en Comunidad', 'Shows in Community') },
            { Icon: Inbox, c: '#B5791A', bg: '#FCEFD6', t: L('Responde en 24h', 'Reply within 24h'), s: L('Mejores candidatos', 'Keeps top talent') },
          ].map((s) => (
            <div key={s.t} className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[9px]" style={{ background: s.bg }}>
                <s.Icon size={15} strokeWidth={2.2} style={{ color: s.c }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-extrabold text-ink">{s.t}</span>
                <span className="block text-[10px] font-semibold text-muted-2">{s.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- pipeline ----
  const pipeline = [
    { label: L('Nuevos', 'New'), dot: '#D6336C', n: '4', cards: [['Ana F.', '#7B61FF', L('3 años exp.', '3 yrs exp')], ['Marcus T.', '#1F9D57', L('Disponible ya', 'Available now')], ['Sofía R.', '#E8954A', L('Recomendada', 'Referred')], ['Daniel K.', '#2A5C8A', L('Medio tiempo', 'Part-time')]] },
    { label: L('Entrevista', 'Phone screen'), dot: '#F4B740', n: '3', cards: [['Jordan L.', '#138A72', L('Mar/Jue 11–4', 'Tue/Thu 11–4')], ['María E.', '#9F1239', L('5 años exp.', '5 yrs exp')], ['Carlos D.', '#6D4DF6', L('Bilingüe', 'Bilingual')]] },
    { label: L('Prueba final', 'Trail · final'), dot: '#1F9D57', n: '2', cards: [['Sara P.', '#D6336C', L('Prueba vie 5p', 'Trail Fri 5p')], ['James K.', '#E8954A', L('Referencias OK', 'Refs cleared')]] },
  ];

  const pipelineView = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-btn-lg bg-lilac-2 p-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-primary"><Inbox size={15} strokeWidth={2.2} className="text-white" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-extrabold text-ink">{L('Candidatos', 'Pipeline')} · {L('Cocinero de línea', 'Line cook')}</div>
          <div className="text-[10px] font-medium text-ink-3">9 {L('candidatos', 'candidates')}</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {pipeline.map((col) => (
          <div key={col.label} className="rounded-btn-lg bg-app p-3">
            <div className="mb-2.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
              <span className="text-[12px] font-extrabold text-ink">{col.label}</span>
              <span className="text-[10px] font-bold text-muted-2">{col.n}</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.cards.map(([nm, c, meta]) => (
                <div key={nm} className="flex items-center gap-2.5 rounded-[10px] border border-hair bg-white p-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: c }}>{initialsOf(nm)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11.5px] font-extrabold text-ink">{nm}</span>
                    <span className="block text-[10px] font-medium text-muted-2">{meta}</span>
                  </span>
                  <span className="flex-none text-[13px] font-extrabold text-primary-dark">›</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- visibility ----
  const visDefs: [keyof typeof vis, string, string][] = [
    ['pub', L('Mostrar en mi anuncio', 'Show on public listing'), ''],
    ['board', L('Tablero de empleos', 'Post to job board'), L('Comunidad To’Latino', 'To’Latino community')],
    ['email', L('Email a clientes', 'Email past customers'), ''],
    ['boost', L('Impulso patrocinado', 'Sponsored boost'), `$20/${L('sem', 'wk')}`],
  ];

  const visibilityView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Eye size={15} strokeWidth={2.2} className="text-primary-dark" />{L('Visibilidad del anuncio', 'Listing visibility')}</div>
        <div className="flex flex-col gap-2.5">
          {visDefs.map(([key, label, sub]) => {
            const on = vis[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-btn-lg border border-hair bg-app p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-bold text-ink">{label}</div>
                  {sub && <div className="mt-0.5 text-[10px] font-medium text-muted-2">{sub}</div>}
                </div>
                <button
                  onClick={() => { setVis((v) => ({ ...v, [key]: !v[key] })); flash(label + (on ? L(' desactivado', ' off') : L(' activado', ' on'))); }}
                  className={`relative h-[25px] w-[42px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted-faint'}`}
                  role="switch"
                  aria-checked={on}
                >
                  <span className="absolute top-[3px] h-[19px] w-[19px] rounded-full bg-white shadow-cta-sm transition-all" style={{ left: on ? '20px' : '3px' }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-card-sm bg-ink p-5 text-white shadow-band xl:sticky xl:top-[74px]">
        <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full" style={{ background: 'rgba(244,183,64,.14)' }} />
        <div className="relative">
          <div className="text-[13.5px] font-extrabold">{L('Impulsa tu vacante', 'Boost your job post')}</div>
          <div className="mt-1.5 text-[11.5px] font-medium leading-relaxed text-white/70">{L('Aparece primero en el tablero de empleos de la comunidad por $20/semana.', 'Appear first on the community job board for $20/week.')}</div>
          <button onClick={() => flash(L('Impulso activado', 'Boost activated'))} className="mt-3 w-full cursor-pointer rounded-btn bg-amber py-2.5 text-[12px] font-extrabold text-ink">
            {L('Activar impulso', 'Activate boost')}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- member detail page ----------
  const vm = roster.find((m) => m.id === viewing) ?? null;
  const shiftRaw: [string, string][] = [['L', '7a–10p'], ['M', '7a–10p'], ['X', 'OFF'], ['J', '7a–10p'], ['V', '7a–11p'], ['S', '9a–4p'], ['D', 'OFF']];

  const memberPage = vm && (
    <ModulePage
      title={vm.nm}
      subtitle={`${L(vm.titleEs, vm.titleEn)} · ${L('desde', 'since')} ${vm.since}`}
      onBack={() => setViewing(null)}
      action={<span className={`rounded-md px-2 py-1 text-[9.5px] font-extrabold ${ROLE_PILL[vm.role]}`}>{roleLabel(vm.role)}</span>}
      footer={
        <button onClick={() => setViewing(null)} className="w-full cursor-pointer rounded-btn-lg border border-pink-bg bg-white py-3.5 text-[13px] font-extrabold text-pink-dark">
          {L('Remover del equipo', 'Remove from team')}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-2.5">
          <button onClick={() => flash(L('Chat abierto', 'Chat opened'))} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white"><MessageCircle size={14} strokeWidth={2.2} />{L('Mensaje', 'Message')}</button>
          <button onClick={() => setStabStaff('roles')} className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-hair-strong bg-white py-2.5 text-[12px] font-extrabold text-ink-soft"><Pencil size={14} strokeWidth={2.2} />{L('Editar rol', 'Edit role')}</button>
        </div>

        <div className={`${cardCls} p-3.5`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Estado ahora', 'Status now')}</div>
          <div className={`mt-2 flex items-center gap-1.5 text-[13px] font-bold ${dotColor(vm.dot)}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: vm.dot }} />{L(vm.stEs, vm.stEn)}
          </div>
        </div>

        <div className={`${cardCls} px-3.5 py-1.5`}>
          {[
            { Icon: Briefcase, c: '#6D4DF6', bg: '#F1EFFA', label: L('Empleo', 'Employment'), value: vm.hours },
            { Icon: Shield, c: '#1F8A4C', bg: '#E3F5EA', label: L('Permisos', 'Permissions'), value: L(vm.permsEs, vm.permsEn) },
            { Icon: Phone, c: '#B5791A', bg: '#FCEFD6', label: L('Contacto', 'Contact'), value: `(415) 555-0${vm.id}24` },
            { Icon: Mail, c: '#D6336C', bg: '#FDE7EF', label: 'Email', value: `${vm.nm.split(' ')[0].toLowerCase()}@mail.com` },
          ].map((r, i, arr) => (
            <div key={r.label} className={`flex items-center gap-3 py-2.5 ${i < arr.length - 1 ? 'border-b border-hair' : ''}`}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: r.bg }}>
                <r.Icon size={14} strokeWidth={2.2} style={{ color: r.c }} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-semibold text-muted-2">{r.label}</div>
                <div className="mt-0.5 truncate text-[12px] font-bold text-ink">{r.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={`${cardCls} p-3.5`}>
          <div className="mb-2.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Turnos de la semana', "This week's shifts")}</div>
          <div className="flex flex-col gap-2">
            {shiftRaw.map(([day, hrs]) => (
              <div key={day} className="grid grid-cols-[40px_1fr] items-center gap-2.5">
                <span className="text-[10.5px] font-bold text-muted-2">{day}</span>
                {hrs === 'OFF'
                  ? <span className="text-[10px] font-bold text-muted-faint">OFF</span>
                  : <span className="justify-self-start rounded-md px-2.5 py-1 text-[10px] font-extrabold text-white" style={{ background: vm.c }}>{hrs}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModulePage>
  );

  // ---------- invite member page ----------
  const invitePage = inviteOpen && (
    <ModulePage
      title={L('Invitar a un miembro', 'Invite a member')}
      onBack={() => setInviteOpen(false)}
      backLabel={L('Cerrar', 'Close')}
      footer={
        <button
          onClick={() => {
            const nm = { manager: L('Nuevo Gerente', 'New Manager'), staff: L('Nuevo Staff', 'New Staff'), driver: L('Nuevo Repartidor', 'New Driver') }[inviteRole];
            setExtra((e) => [
              { id: Date.now(), nm, c: '#7B61FF', role: inviteRole, titleEs: roleLabel(inviteRole), titleEn: roleLabel(inviteRole), hours: 'Part-time', dot: '#C0BBD0', stEs: 'Invitado', stEn: 'Invited', permsEs: '—', permsEn: '—', since: '2025', invited: true },
              ...e,
            ]);
            setInviteOpen(false);
            flash(L('Invitación enviada', 'Invitation sent'));
          }}
          className="w-full cursor-pointer rounded-btn-lg bg-primary py-3.5 text-[13.5px] font-extrabold text-white shadow-cta-sm"
        >
          {L('Enviar invitación', 'Send invitation')}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="text-[12px] font-medium leading-snug text-muted">{L('Te ayudan a manejar pedidos, reservas y más según su rol.', 'They help manage orders, bookings and more based on their role.')}</div>

        <div>
          <div className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{L('Correo o teléfono', 'Email or phone')}</div>
          <input
            type="text"
            placeholder="nombre@correo.com"
            className="w-full rounded-btn border-[1.5px] border-lilac-line bg-white px-3.5 py-3 text-[13px] font-semibold text-ink outline-none placeholder:text-muted-2 focus:border-primary"
          />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-extrabold text-ink-soft">{L('Asignar rol', 'Assign role')}</div>
          <div className="flex gap-2">
            {([['manager', L('Gerente', 'Manager')], ['staff', 'Staff'], ['driver', L('Repartidor', 'Driver')]] as const).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setInviteRole(r)}
                className={`flex-1 cursor-pointer rounded-btn py-2.5 text-[11.5px] font-extrabold ${inviteRole === r ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModulePage>
  );

  // ---------- sub-tab bars ----------
  const staffTabs: [StaffTab, string][] = [['roster', L('Equipo', 'Roster')], ['schedule', L('Horario', 'Schedule')], ['time', L('Asistencia', 'Time')], ['payroll', L('Nómina', 'Payroll')], ['roles', L('Roles', 'Roles')]];
  const jobTabs: [JobTab, string][] = [['jobs', L('Vacantes', 'Jobs')], ['pipeline', L('Candidatos', 'Pipeline')], ['visibility', L('Visibilidad', 'Visibility')]];
  const proTabs: Record<string, boolean> = { schedule: true, time: true, payroll: true };

  // Detail / invite flows take over the screen as full pages (no cramped sheets).
  if (invitePage) return <>{invitePage}<Toast msg={toast} /></>;
  if (memberPage) return <>{memberPage}<Toast msg={toast} /></>;

  return (
    <div className="relative pb-8">
      {/* mode toggle */}
      <div className="mb-3 flex gap-2">
        {([['staff', L('Personal', 'Staff'), String(onShiftCount), 'live'], ['jobs', L('Empleos', 'Jobs'), String(applicantTotal), 'warn']] as const).map(([k, label, n, kind]) => {
          const on = mode === k;
          return (
            <button key={k} onClick={() => setMode(k)} className={modeBtn(on)}>
              {label}
              <span className={`rounded px-1.5 py-px text-[9px] font-extrabold ${on ? 'bg-white/20 text-white' : kind === 'warn' ? 'bg-amber-bg text-amber-ink' : 'bg-green-bg text-green-dark'}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* sub-tabs */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 min-w-0 overflow-x-auto px-1">
        {(mode === 'staff' ? staffTabs : jobTabs).map(([k, label]) => {
          const active = mode === 'staff' ? stabStaff === k : stabJobs === k;
          const showPro = isFree && mode === 'staff' && proTabs[k];
          return (
            <button
              key={k}
              onClick={() => (mode === 'staff' ? setStabStaff(k as StaffTab) : setStabJobs(k as JobTab))}
              className={subChip(active)}
            >
              {label}
              {showPro && <span className={`ml-1.5 rounded px-1 py-px text-[8px] font-extrabold ${active ? 'bg-white/20 text-white' : 'bg-amber-bg text-amber-ink'}`}>PRO</span>}
            </button>
          );
        })}
      </div>

      {/* content */}
      {mode === 'staff' && (
        <div className="flex flex-col gap-4">
          {kpiRow}
          {staffLocked ? lockCard : (
            <>
              {stabStaff === 'roster' && rosterView}
              {stabStaff === 'schedule' && scheduleView}
              {stabStaff === 'time' && timeView}
              {stabStaff === 'payroll' && payrollView}
              {stabStaff === 'roles' && rolesView}
            </>
          )}
        </div>
      )}

      {mode === 'jobs' && (
        <div className="flex flex-col gap-4">
          {stabJobs === 'jobs' && jobsView}
          {stabJobs === 'pipeline' && pipelineView}
          {stabJobs === 'visibility' && visibilityView}
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}
