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

import { useEffect, useMemo, useState } from 'react';
import { IconAward as Award, IconBriefcase as Briefcase, IconCalendar as Calendar, IconCheck as Check, IconChevronLeft as ChevronLeft, IconChevronRight as ChevronRight, IconClock as Clock, IconCurrencyDollar as DollarSign, IconEye as Eye, IconInbox as Inbox, IconLock as Lock, IconMail as Mail, IconMapPin as MapPin, IconMessageCircle as MessageCircle, IconPencil as Pencil, IconPhone as Phone, IconPlus as Plus, IconShield as Shield, IconUser as User, IconUsers as Users } from '@tabler/icons-react';
import type { PanelCtx, TabKey } from '@/screens/negocio/tabs';
import { ModulePage, Toast } from '@/screens/negocio/modules/_page';
import { SectionTabs, type SectionTab } from '@/components/SectionTabs';
import { useBizAdmin } from '@/lib/bizAdmin';
import { supabase } from '@/lib/supabase';

type Mode = 'staff' | 'jobs';
type StaffTab = 'roster' | 'schedule' | 'time' | 'payroll' | 'roles';
type JobTab = 'jobs' | 'pipeline' | 'visibility';
type Role = 'owner' | 'manager' | 'staff' | 'driver';

type Member = {
  id: number; dbId?: string; nm: string; c: string; role: Role; titleEs: string; titleEn: string;
  hours: string; dot: string; stEs: string; stEn: string; permsEs: string; permsEn: string;
  since: string; invited?: boolean; email?: string | null;
};
type Job = {
  id: number; dbId?: string; titleEs: string; titleEn: string; pay: string; typeEs: string; typeEn: string;
  applied: number; viewed: number; whenEs: string; whenEn: string; tag: 'live' | 'new' | 'paused';
};

const cardCls = 'rounded-card-sm border border-line bg-white ';

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

// ---- Supabase row shapes + mappers (business_staff / business_jobs, mig. 0025) ----
// business_staff is PRIVATE (owner-only); business_jobs is PUBLIC read, owner write.
type DbRole = 'owner' | 'manager' | 'staff';
type StaffRow = {
  id: string; name: string; email: string | null; role: DbRole;
  title_es: string | null; title_en: string | null; invited: boolean; created_at: string;
};
type JobRow = {
  id: string; title_es: string; title_en: string | null; pay: string | null;
  type_es: string | null; type_en: string | null; status: Job['tag'];
  applied: number; viewed: number; created_at: string;
};

// Display-only fields the roster card needs, derived from role exactly the way
// the seed builds them (avatar color, permissions blurb, bilingual title fallback).
const ROLE_COLOR: Record<Role, string> = { owner: '#FF2D6F', manager: '#00A878', staff: '#E11D48', driver: '#C05702' };
const ROLE_PERMS: Record<Role, [string, string]> = {
  owner: ['Acceso total', 'All access'],
  manager: ['Todo menos pagos', 'All but billing'],
  staff: ['Pedidos y reservas', 'Orders & bookings'],
  driver: ['Pedidos y entregas', 'Orders & deliveries'],
};
const ROLE_TITLE: Record<Role, [string, string]> = {
  owner: ['Dueña', 'Owner'], manager: ['Gerente', 'Manager'], staff: ['Staff', 'Staff'], driver: ['Repartidor', 'Driver'],
};
// business_staff only stores owner/manager/staff — coerce the client-only 'driver'.
const toDbRole = (r: Role): DbRole => (r === 'driver' ? 'staff' : r);

const ROLES = new Set<Role>(['owner', 'manager', 'staff', 'driver']);
function rowToMember(r: StaffRow, idx: number): Member {
  const role = (ROLES.has(r.role as Role) ? r.role : 'staff') as Role;
  const invited = !!r.invited;
  const [pEs, pEn] = ROLE_PERMS[role];
  const [tEs, tEn] = ROLE_TITLE[role];
  return {
    id: idx + 1,
    dbId: r.id,
    nm: r.name,
    c: ROLE_COLOR[role],
    role,
    titleEs: r.title_es ?? tEs,
    titleEn: r.title_en ?? r.title_es ?? tEn,
    hours: invited ? 'Part-time' : 'Full-time',
    dot: invited ? '#B3ADC7' : '#00A878',
    stEs: invited ? 'Invitado' : 'En turno',
    stEn: invited ? 'Invited' : 'On shift',
    permsEs: invited ? '—' : pEs,
    permsEn: invited ? '—' : pEn,
    since: r.created_at ? String(new Date(r.created_at).getFullYear()) : '2025',
    invited,
    email: r.email,
  };
}

// Human "posted X ago" label for a job's created_at (Spanish-first).
function relWhen(iso: string): [string, string] {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(days) || days <= 0) return ['recién', 'just now'];
  if (days === 1) return ['ayer', 'yesterday'];
  return [`hace ${days} días`, `${days} days ago`];
}
const JOB_TAGS = new Set<Job['tag']>(['live', 'new', 'paused']);
function rowToJob(r: JobRow, idx: number): Job {
  const [wEs, wEn] = relWhen(r.created_at);
  return {
    id: idx + 1,
    dbId: r.id,
    titleEs: r.title_es,
    titleEn: r.title_en ?? r.title_es,
    pay: r.pay ?? '',
    typeEs: r.type_es ?? '',
    typeEn: r.type_en ?? r.type_es ?? '',
    applied: Number(r.applied ?? 0),
    viewed: Number(r.viewed ?? 0),
    whenEs: wEs,
    whenEn: wEn,
    tag: JOB_TAGS.has(r.status) ? r.status : 'live',
  };
}

export function StaffModule({ ctx, tab }: { ctx: PanelCtx; tab: TabKey }) {
  const { L, es, isFree, isPremium, ci } = ctx;
  void isPremium; void ci; // ctx destructured per module contract; not all fields used here
  const salon = ctx.rubro === 'beauty';

  const [falloEquipo, setFalloEquipo] = useState(false);

  const [mode, setMode] = useState<Mode>(tab === 'jobs' ? 'jobs' : 'staff');
  const [stabStaff, setStabStaff] = useState<StaffTab>('roster');
  const [stabJobs, setStabJobs] = useState<JobTab>('jobs');
  const [rfilter, setRfilter] = useState<'all' | 'onshift' | Role>('all');
  const [viewing, setViewing] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<Exclude<Role, 'owner'>>('staff');
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [vis, setVis] = useState({ pub: true, board: true, email: false, boost: false });
  const [payrollDone, setPayrollDone] = useState(false);
  const [toast, setToast] = useState('');

  const admin = useBizAdmin();
  const real = admin.active;
  const persistable = !admin.demo && !!real; // real signed-in business → persist to Supabase

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2000);
  };

  const roleLabel = (r: Role) => ({ owner: L('Dueña', 'Owner'), manager: L('Gerente', 'Manager'), staff: 'Staff', driver: L('Repartidor', 'Driver') }[r]);

  // baseRoster y seedJobs ELIMINADOS (2026-07-29): eran un equipo de 7 empleados
  // y unas vacantes FABRICADOS que se usaban como respaldo. Un dueño real podía
  // verlos si el backend fallaba un instante. Sin negocio real no se muestra nada.


  // Roster is state-driven: demo seeds from the fixture; a real business loads
  // its PRIVATE staff from Supabase (empty until the owner invites anyone).
  useEffect(() => {
    // Sin negocio real / sin backend → VACÍO, nunca el roster fabricado. Ese
    // respaldo mostraba un equipo de 7 personas inventadas (Elisabeth Rivera,
    // Marisa Díaz, Marco Pellegrino…) y podía alcanzar a un dueño REAL si el
    // backend fallaba un instante: vería empleados que no contrató (regla #8).
    if (!persistable || !real || !supabase) { setMembers([]); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('business_staff')
        .select('id,name,email,role,title_es,title_en,invited,created_at')
        .eq('business_id', real.id)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setFalloEquipo(!!error);
      const rows = error || !Array.isArray(data) ? [] : (data as unknown as StaffRow[]);
      setMembers(rows.map(rowToMember));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  // Job postings: demo seeds from fixtures; a real business loads its PUBLIC
  // postings from Supabase (newest first).
  useEffect(() => {
    if (!persistable || !real || !supabase) { setJobs([]); return; } // sin vacantes fabricadas
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase!
        .from('business_jobs')
        .select('id,title_es,title_en,pay,type_es,type_en,status,applied,viewed,created_at')
        .eq('business_id', real.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setFalloEquipo((f) => f || !!error);
      const rows = error || !Array.isArray(data) ? [] : (data as unknown as JobRow[]);
      setJobs(rows.map(rowToJob));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  const roster = members; // roster renders straight from state now

  // A real signed-in business shows ONLY real per-business data. Roster + jobs are
  // wired to Supabase; scheduling, time-clock, payroll and the applicant pipeline
  // are NOT yet — so for a real business those surfaces show an honest "próximamente"
  // state instead of fabricated numbers (rule #8). Demo/showcase keeps the rich fixtures.
  const isReal = persistable;
  const activeCount = roster.filter((m) => !m.invited).length;
  const roleCount = (r: Role) => roster.filter((m) => m.role === r).length;

  const soonCard = (titleEs: string, titleEn: string, subEs: string, subEn: string) => (
    <div className={`${cardCls} px-6 py-8 text-center`}>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-tile bg-lilac">
        <Clock size={24} stroke={2.2} className="text-primary" />
      </span>
      <div className="mt-3.5 text-[16px] font-extrabold text-ink">{L(titleEs, titleEn)}</div>
      <div className="mx-auto mt-2 max-w-[360px] text-[12.5px] font-medium leading-relaxed text-muted">{L(subEs, subEn)}</div>
      <div className="mx-auto mt-3 w-fit rounded-full bg-amber-bg px-3 py-1 text-[10px] font-extrabold text-amber-ink">{L('Próximamente', 'Coming soon')}</div>
    </div>
  );

  // ---- persistence (only when real; demo = local optimistic only) ----
  const persistNewMember = async (m: Member, email: string | null) => {
    if (!persistable || !real || !supabase) return;
    const { data, error } = await supabase
      .from('business_staff')
      .insert({ business_id: real.id, name: m.nm, email, role: toDbRole(m.role), title_es: m.titleEs, title_en: m.titleEn, invited: !!m.invited })
      .select('id')
      .single();
    if (!error && data) {
      const dbId = (data as { id: string }).id;
      setMembers((xs) => xs.map((x) => (x.id === m.id ? { ...x, dbId } : x)));
    }
  };
  const removeMember = (m: Member) => {
    setMembers((xs) => xs.filter((x) => x.id !== m.id));
    if (persistable && supabase && m.dbId) supabase.from('business_staff').delete().eq('id', m.dbId);
    setViewing(null);
    flash(L('Removido del equipo', 'Removed from team'));
  };
  const persistNewJob = async (j: Job) => {
    if (!persistable || !real || !supabase) return;
    const { data, error } = await supabase
      .from('business_jobs')
      .insert({ business_id: real.id, title_es: j.titleEs, title_en: j.titleEn, pay: j.pay, type_es: j.typeEs, type_en: j.typeEn, status: j.tag })
      .select('id')
      .single();
    if (!error && data) {
      const dbId = (data as { id: string }).id;
      setJobs((xs) => xs.map((x) => (x.id === j.id ? { ...x, dbId } : x)));
    }
  };

  const applicantTotal = jobs.reduce((a, j) => a + j.applied, 0);
  const onShiftCount = isReal ? activeCount : 5;

  // ---------- shared chip helpers ----------
  const modeBtn = (on: boolean) =>
    `tap-y tap-y relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-[12.5px] font-extrabold ${on ? 'bg-ink text-white' : 'bg-lilac-2 text-ink-2'}`;
  const filterChip = (on: boolean) =>
    `tap-y tap-y flex-none cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] ${on ? 'bg-primary font-extrabold text-white shadow-cta-sm' : 'border border-lilac-line bg-white font-bold text-ink-soft'}`;

  const dotColor = (dot: string) => (dot === '#00A878' ? 'text-green-dark' : dot === '#FFB020' ? 'text-amber-ink' : 'text-muted-2');

  // ============================ PERSONAL ============================
  const staffKpis = isReal
    ? [
        { Icon: Users, c: '#C4144C', bg: '#F1EEFA', label: L('Equipo', 'Team'), value: String(roster.length), delta: L(`${roleCount('manager')} gerentes · ${roleCount('staff')} staff`, `${roleCount('manager')} mgrs · ${roleCount('staff')} staff`), dCls: 'text-muted-2' },
        { Icon: User, c: '#007A57', bg: '#E6FAF3', label: L('Activos', 'Active'), value: String(activeCount), delta: L(`${roster.length - activeCount} invitados`, `${roster.length - activeCount} invited`), dCls: 'text-muted-2' },
        { Icon: Clock, c: '#8A5A00', bg: '#FFF6E3', label: L('Reloj', 'Time clock'), value: '—', delta: L('Pronto', 'Soon'), dCls: 'text-amber-ink' },
        { Icon: DollarSign, c: '#E11D48', bg: '#FFECF2', label: L('Nómina', 'Payroll'), value: '—', delta: L('Pronto', 'Soon'), dCls: 'text-amber-ink' },
      ]
    : isFree
    ? [
        { Icon: Users, c: '#C4144C', bg: '#F1EEFA', label: L('Equipo', 'Team'), value: '2', delta: L('límite Free', 'Free limit'), dCls: 'text-amber-ink' },
        { Icon: User, c: '#007A57', bg: '#E6FAF3', label: L('Activos', 'Active'), value: '2', delta: '—', dCls: 'text-muted-2' },
        { Icon: Clock, c: '#8A5A00', bg: '#FFF6E3', label: L('Reloj', 'Time clock'), value: '—', delta: 'Verified', dCls: 'text-amber-ink' },
        { Icon: DollarSign, c: '#E11D48', bg: '#FFECF2', label: L('Nómina', 'Payroll'), value: '—', delta: 'Verified', dCls: 'text-amber-ink' },
      ]
    : [
        { Icon: Users, c: '#C4144C', bg: '#F1EEFA', label: L('Total', 'Total staff'), value: '14', delta: L('3 gerentes · 11 staff', '3 mgrs · 11 staff'), dCls: 'text-muted-2' },
        { Icon: User, c: '#007A57', bg: '#E6FAF3', label: L('En turno', 'On shift now'), value: '5', delta: L('2 en descanso', '2 on break'), dCls: 'text-muted-2' },
        { Icon: Clock, c: '#8A5A00', bg: '#FFF6E3', label: L('Horas · sem', 'Hours · wk'), value: '428', delta: '▲ 12%', dCls: 'text-green-dark' },
        { Icon: DollarSign, c: '#E11D48', bg: '#FFECF2', label: L('Costo · 30d', 'Labor · 30d'), value: '$22.8k', delta: L('28% de ingresos', '28% of revenue'), dCls: 'text-muted-2' },
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
          <Lock size={24} stroke={2.2} className="text-amber" />
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
    { role: 'owner', n: isReal ? roleCount('owner') : 1, es: 'Todo · pagos · banca · transferir', en: 'Everything · billing · banking · transfer' },
    { role: 'manager', n: isReal ? roleCount('manager') : 3, es: 'Todos los módulos · sin banca', en: 'All modules · no banking' },
    { role: 'staff', n: isReal ? roleCount('staff') : 5, es: 'Pedidos, reservas, clientes', en: 'Orders, bookings, customers' },
    { role: 'driver', n: isReal ? roleCount('driver') : 5, es: 'Solo entregas y ruta', en: 'Deliveries & route only' },
  ];
  const peopleN = (n: number) => `${n} ${n === 1 ? L('persona', 'person') : L('personas', 'people')}`;

  const inviteBtn = (
    <button
      onClick={() => setInviteOpen(true)}
      className="tap-y flex cursor-pointer items-center justify-center gap-1.5 rounded-btn-lg bg-primary px-4 py-2.5 text-[12.5px] font-extrabold text-white shadow-cta-sm"
    >
      <Plus size={15} stroke={2.6} />{L('Invitar', 'Invite')}
    </button>
  );

  const rosterView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="-my-1.5 py-1.5 no-scrollbar -mx-1 flex flex-1 gap-2 min-w-0 overflow-x-auto px-1">
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
                <Users size={15} stroke={2.2} />{L('Equipo limitado a 2 en Free', 'Team capped at 2 on Free')}
              </div>
              <div className="mt-1 text-[11.5px] font-semibold leading-snug text-ink-3">
                {L('Mejora a Verified para agregar miembros ilimitados, roles y permisos por persona.', 'Upgrade to Verified to add unlimited members, roles and per-person permissions.')}
              </div>
              <button onClick={() => ctx.go('billing')} className="tap-y mt-2.5 cursor-pointer rounded-field bg-primary px-3.5 py-2 text-[11.5px] font-extrabold text-white shadow-cta-sm">
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
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Shield size={14} stroke={2.2} className="text-primary-dark" />{L('Roles y permisos', 'Roles & permissions')}</span>
          <button onClick={() => setStabStaff('roles')} className="tap-y cursor-pointer text-[11px] font-extrabold text-primary-dark">{L('Gestionar', 'Manage')} ›</button>
        </div>
        <div className="flex flex-col gap-2.5">
          {rolesPreview.map((r) => (
            <div key={r.role} className="rounded-btn-lg border border-line bg-app p-3">
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
  // schedRaw VACÍO (2026-07-29): traía un horario semanal con empleados fabricados. Vivía en la rama de
  // modo demo, que ya no se activa nunca — pero inalcanzable está a una regresión
  // de ser alcanzable, así que el guardián del build (scripts/verify-build.mjs) lo
  // rechaza. Al construir la feature de verdad, poblarlo desde la BD.
  const schedRaw: [string, string, number, number, string][] = [];
  const nowLeft = (14 / 24) * 100;

  const scheduleView = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button className="tap-y flex cursor-pointer items-center rounded-field border border-line bg-white px-2.5 py-2 text-ink-soft"><ChevronLeft size={14} stroke={2.4} /></button>
        <button className="tap-y flex-1 cursor-pointer rounded-field border border-line bg-white px-3 py-2 text-[11.5px] font-extrabold text-ink">{L('Semana del', 'Week of')} · 13 Oct</button>
        <button className="tap-y flex cursor-pointer items-center rounded-field border border-line bg-white px-2.5 py-2 text-ink-soft"><ChevronRight size={14} stroke={2.4} /></button>
      </div>
      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Calendar size={14} stroke={2.2} className="text-primary-dark" />{L('Horario de hoy', "Today's schedule")}</span>
          <span className="text-[10.5px] font-semibold text-muted-2">428 {L('hrs', 'hrs')} · $22.8k</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {schedRaw.map(([nm, role, a, b, c]) => (
            <div key={nm} className="grid grid-cols-[86px_1fr] items-center gap-2 md:grid-cols-[120px_1fr]">
              <div className="truncate text-[11px] font-bold text-ink">{nm}<span className="font-medium text-muted-2"> · {role}</span></div>
              <div className="relative h-[22px] overflow-hidden rounded-md" style={{ background: '#EAE6F5' }}>
                <div
                  className="absolute inset-y-0 flex items-center overflow-hidden rounded-md px-1.5 text-[8.5px] font-extrabold text-white"
                  style={{ left: `${(a / 24) * 100}%`, width: `${((b - a) / 24) * 100}%`, background: c }}
                >
                  {a}–{b}
                </div>
                <div className="absolute -inset-y-0.5" style={{ left: `${nowLeft}%`, width: '2px', background: '#E11D48' }} />
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
  // Reloj de asistencia: NO hay backend de fichaje todavía, así que no se inventan
  // cifras. Antes estas tarjetas decían "5 en turno · 62.4 horas hoy · 1 cerca de
  // extra" y la tabla listaba 5 empleados fichando (Elisabeth Rivera, Marisa Díaz…)
  // — todo fabricado y visible para un dueño REAL (regla #8). Queda anotado en
  // docs/LAUNCH-CHECKLIST.md para construirse de verdad.
  const timeStats = [
    { label: L('En turno', 'Clocked in'), value: '—', note: L('sin registros', 'no records'), noteCls: 'text-muted-2', tone: cardCls },
    { label: L('Horas hoy', 'Hours today'), value: '—', note: L('sin registros', 'no records'), noteCls: 'text-muted-2', tone: cardCls },
    { label: L('Cerca de extra', 'Near OT'), value: '—', note: L('sin registros', 'no records'), noteCls: 'text-muted-2', tone: cardCls },
  ];
  const timeRaw: [string, string, string, string, number, number, string][] = [];

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
            <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Clock size={14} stroke={2.2} className="text-primary-dark" />{L('Reloj · hoy', 'Time clock · today')}</span>
            <button onClick={() => flash(L('Exportando reporte…', 'Exporting report…'))} className="cursor-pointer text-[10.5px] font-extrabold text-primary-dark">{L('Exportar', 'Export')}</button>
          </div>
          {timeRaw.length === 0 && (
            <div className="py-6 text-center">
              <div className="text-[12.5px] font-extrabold text-ink">{falloEquipo ? L('No pudimos cargar los registros. Revisa tu conexión.', "We couldn't load the records. Check your connection.") : L('Aún no hay registros de asistencia', 'No attendance records yet')}</div>
              <div className="mt-1 text-[11px] font-semibold text-muted">
                {L('El fichaje de entrada y salida estará disponible pronto.', 'Clock in/out is coming soon.')}
              </div>
            </div>
          )}
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
            { Icon: User, c: '#007A57', bg: '#E6FAF3', t: L('En turno ahora', 'On shift now'), r: '5' },
            { Icon: Clock, c: '#8A5A00', bg: '#FFF6E3', t: L('En descanso', 'On break'), r: '2' },
            { Icon: Award, c: '#C4144C', bg: '#F1EEFA', t: L('Puntualidad', 'On-time rate'), r: '96%' },
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
  // payRaw VACÍO (2026-07-29): traía una nómina con sueldos y pagos fabricados. Vivía en la rama de
  // modo demo, que ya no se activa nunca — pero inalcanzable está a una regresión
  // de ser alcanzable, así que el guardián del build (scripts/verify-build.mjs) lo
  // rechaza. Al construir la feature de verdad, poblarlo desde la BD.
  const payRaw: [string, string, string, number, number, string][] = [];
  const runPayroll = () => { setPayrollDone(true); flash(L('Nómina corrida · depósito en 2 días', 'Payroll run · deposit in 2 days')); };

  const payrollView = (
    <div className="grid items-start gap-4 [&>*]:min-w-0 xl:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-3.5">
        <div className="rounded-card-sm border border-green bg-green-bg p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-white">
              <Check size={16} stroke={2.8} className="text-green" />
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
            { Icon: DollarSign, c: '#007A57', bg: '#E6FAF3', t: L('Neto a pagar', 'Net to pay'), r: '$4,918' },
            { Icon: Calendar, c: '#C4144C', bg: '#F1EEFA', t: L('Fecha de depósito', 'Deposit date'), r: '15 Oct' },
            { Icon: Users, c: '#8A5A00', bg: '#FFF6E3', t: L('Empleados', 'Employees'), r: '5' },
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
    { role: 'owner', n: isReal ? roleCount('owner') : 1, es: ['Todo · todas las acciones', 'Pagos y banca', 'Transferir negocio'], en: ['All actions', 'Billing & banking', 'Transfer business'] },
    { role: 'manager', n: isReal ? roleCount('manager') : 3, es: ['Ver y editar todo', 'Sin banca', 'Invita staff'], en: ['View & edit all', 'No banking', 'Invite staff'] },
    { role: 'staff', n: isReal ? roleCount('staff') : 5, es: ['Pedidos y reservas', 'Notas de cliente', 'Sin precios'], en: ['Orders & bookings', 'Customer notes', 'No pricing'] },
    { role: 'driver', n: isReal ? roleCount('driver') : 5, es: ['Ver sus entregas', 'Actualizar ruta', 'Solo mensajes'], en: ['Own deliveries', 'Update route', 'Messaging only'] },
  ];
  const permModules = [L('Anuncio e info', 'Listing & info'), L('Menú y precios', 'Menu & pricing'), L('Pedidos', 'Orders'), L('Reservas', 'Bookings'), L('Clientes', 'Customers'), L('Pagos', 'Payouts'), L('Personal', 'Staff'), L('Facturación', 'Billing')];
  const permData = [[2, 2, 1, 0], [2, 2, 0, 0], [2, 2, 2, 1], [2, 2, 2, 0], [2, 2, 1, 0], [2, 1, 0, 0], [2, 2, 0, 0], [2, 0, 0, 0]];
  const permCell = (v: number) => {
    if (v === 2) return <span className="inline-flex h-[19px] w-[19px] items-center justify-center rounded-md bg-green-bg"><Check size={10} stroke={3} className="text-green-dark" /></span>;
    if (v === 1) return <span className="inline-flex h-[19px] w-[19px] items-center justify-center rounded-md" style={{ background: '#DEF4FF' }}><Eye size={10} stroke={2.6} style={{ color: '#0369A1' }} /></span>;
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
              <button className="cursor-pointer text-muted-2" aria-label={L('Editar rol', 'Edit role')}><Pencil size={13} stroke={2.2} /></button>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-1 gap-y-[18px].5">
              {(es ? r.es : r.en).map((c) => (
                <span key={c} className="rounded-md border border-line bg-app px-2 py-0.5 text-[10px] font-semibold text-ink-soft">{c}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`${cardCls} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-[18px]">
          <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Lock size={14} stroke={2.2} className="text-primary-dark" />{L('Matriz de permisos', 'Permission matrix')}</span>
          <span className="flex gap-3">
            <span className="flex items-center gap-1 text-[9px] font-bold text-green-dark"><Pencil size={9} stroke={2.4} />{L('Editar', 'Edit')}</span>
            <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: '#0369A1' }}><Eye size={9} stroke={2.4} />{L('Ver', 'View')}</span>
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
    [L('Vistas', 'Views'), isReal ? String(jobs.reduce((a, j) => a + j.viewed, 0)) : '484'],
  ];
  const postJob = () => {
    const id = (jobs.length ? Math.max(...jobs.map((x) => x.id)) : 0) + 1;
    const job: Job = { id, titleEs: 'Nueva vacante · borrador', titleEn: 'New position · draft', pay: '$20–$24/hr', typeEs: 'Tiempo completo', typeEn: 'Full-time', applied: 0, viewed: 0, whenEs: 'recién', whenEn: 'just now', tag: 'new' };
    setJobs((j) => [job, ...j]);
    persistNewJob(job);
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
          <Plus size={16} stroke={2.6} />{L('Publicar vacante', 'Post a job')}
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
                <span className="flex items-center gap-1"><Users size={13} stroke={2.2} className="text-muted-2" />{j.applied}</span>
                <span className="flex items-center gap-1"><Eye size={13} stroke={2.2} className="text-muted-2" />{j.viewed}</span>
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
            { Icon: Award, c: '#C4144C', bg: '#F1EEFA', t: L('Publica el rango de pago', 'Post a pay range'), s: L('3× más solicitudes', '3× more applicants') },
            { Icon: MapPin, c: '#007A57', bg: '#E6FAF3', t: L('Local primero', 'Local first'), s: L('Aparece en Comunidad', 'Shows in Community') },
            { Icon: Inbox, c: '#8A5A00', bg: '#FFF6E3', t: L('Responde en 24h', 'Reply within 24h'), s: L('Mejores candidatos', 'Keeps top talent') },
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
    { label: L('Nuevos', 'New'), dot: '#E11D48', n: '4', cards: [['Ana F.', '#FF2D6F', L('3 años exp.', '3 yrs exp')], ['Marcus T.', '#00A878', L('Disponible ya', 'Available now')], ['Sofía R.', '#C05702', L('Recomendada', 'Referred')], ['Daniel K.', '#0369A1', L('Medio tiempo', 'Part-time')]] },
    { label: L('Entrevista', 'Phone screen'), dot: '#FFB020', n: '3', cards: [['Jordan L.', '#008754', L('Mar/Jue 11–4', 'Tue/Thu 11–4')], ['María E.', '#C4144C', L('5 años exp.', '5 yrs exp')], ['Carlos D.', '#C4144C', L('Bilingüe', 'Bilingual')]] },
    { label: L('Prueba final', 'Trail · final'), dot: '#00A878', n: '2', cards: [['Sara P.', '#E11D48', L('Prueba vie 5p', 'Trail Fri 5p')], ['James K.', '#C05702', L('Referencias OK', 'Refs cleared')]] },
  ];

  const pipelineView = (
    <div className="flex flex-col gap-4">
      {/* Estos candidatos son un EJEMPLO: no hay bolsa de trabajo conectada
          todavía. Sin este aviso, un dueño con una vacante creía que 9 personas
          se habían postulado de verdad. (Auditoría de Negocios, 2026-08-04.) */}
      {isReal && (
        <div role="note" className="flex items-start gap-2 rounded-field border border-[#F4DBBA] bg-amber-bg px-3 py-2.5">
          <span className="mt-px flex-none rounded-full bg-amber-ink/10 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[.04em] text-amber-ink">
            {L('Ejemplo', 'Sample')}
          </span>
          <span className="text-[11px] font-semibold leading-[1.5] text-amber-ink">
            {L('Así se verá tu bolsa de candidatos. Todavía no está conectada, así que estas personas no son postulaciones reales.',
               'This is how your candidate pipeline will look. It is not connected yet, so these are not real applicants.')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-btn-lg bg-lilac-2 p-3">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-primary"><Inbox size={15} stroke={2.2} className="text-white" /></span>
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
                <div key={nm} className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white p-2.5">
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
        <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink"><Eye size={15} stroke={2.2} className="text-primary-dark" />{L('Visibilidad del anuncio', 'Listing visibility')}</div>
        <div className="flex flex-col gap-2.5">
          {visDefs.map(([key, label, sub]) => {
            const on = vis[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 rounded-btn-lg border border-line bg-app p-3">
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
          <button onClick={() => flash(L('Impulso activado', 'Boost activated'))} className="tap-y mt-3 w-full cursor-pointer rounded-btn bg-amber py-2.5 text-[12px] font-extrabold text-ink">
            {L('Activar impulso', 'Activate boost')}
          </button>
        </div>
      </div>
    </div>
  );

  // ---------- member detail page ----------
  const vm = roster.find((m) => m.id === viewing) ?? null;
  // shiftRaw VACÍO (2026-07-29): traía turnos de la semana fabricados. Vivía en la rama de
  // modo demo, que ya no se activa nunca — pero inalcanzable está a una regresión
  // de ser alcanzable, así que el guardián del build (scripts/verify-build.mjs) lo
  // rechaza. Al construir la feature de verdad, poblarlo desde la BD.
  const shiftRaw: [string, string][] = [];

  const memberPage = vm && (
    <ModulePage
      title={vm.nm}
      subtitle={`${L(vm.titleEs, vm.titleEn)} · ${L('desde', 'since')} ${vm.since}`}
      onBack={() => setViewing(null)}
      action={<span className={`rounded-md px-2 py-1 text-[9.5px] font-extrabold ${ROLE_PILL[vm.role]}`}>{roleLabel(vm.role)}</span>}
      footer={
        <button onClick={() => removeMember(vm)} className="w-full cursor-pointer rounded-btn-lg border border-pink-bg bg-white py-3.5 text-[13px] font-extrabold text-pink-dark">
          {L('Remover del equipo', 'Remove from team')}
        </button>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex gap-2.5">
          <button onClick={() => flash(L('Chat abierto', 'Chat opened'))} className="tap-y flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn bg-primary py-2.5 text-[12px] font-extrabold text-white"><MessageCircle size={14} stroke={2.2} />{L('Mensaje', 'Message')}</button>
          <button onClick={() => setStabStaff('roles')} className="tap-y flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-btn border border-line-strong bg-white py-2.5 text-[12px] font-extrabold text-ink-soft"><Pencil size={14} stroke={2.2} />{L('Editar rol', 'Edit role')}</button>
        </div>

        <div className={`${cardCls} p-3.5`}>
          <div className="text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">{L('Estado ahora', 'Status now')}</div>
          <div className={`mt-2 flex items-center gap-1.5 text-[13px] font-bold ${dotColor(vm.dot)}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: vm.dot }} />{L(vm.stEs, vm.stEn)}
          </div>
        </div>

        <div className={`${cardCls} px-3.5 py-1.5`}>
          {([
            { Icon: Briefcase, c: '#C4144C', bg: '#F1EEFA', label: L('Empleo', 'Employment'), value: vm.hours },
            { Icon: Shield, c: '#007A57', bg: '#E6FAF3', label: L('Permisos', 'Permissions'), value: L(vm.permsEs, vm.permsEn) },
            // Phone isn't stored — show it only in showcase/demo, never invent one for a real member.
            ...(isReal ? [] : [{ Icon: Phone, c: '#8A5A00', bg: '#FFF6E3', label: L('Contacto', 'Contact'), value: `(415) 555-0${vm.id}24` }]),
            // Real members show their real invite email (if any); demo shows the fixture.
            ...(isReal
              ? (vm.email ? [{ Icon: Mail, c: '#E11D48', bg: '#FFECF2', label: 'Email', value: vm.email }] : [])
              : [{ Icon: Mail, c: '#E11D48', bg: '#FFECF2', label: 'Email', value: `${vm.nm.split(' ')[0].toLowerCase()}@mail.com` }]),
          ]).map((r, i, arr) => (
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

        {/* Weekly shifts come from scheduling, which isn't wired yet — showcase only. */}
        {!isReal && (
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
        )}
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
            const id = (members.length ? Math.max(...members.map((m) => m.id)) : 0) + 1;
            const member: Member = { id, nm, c: '#FF2D6F', role: inviteRole, titleEs: roleLabel(inviteRole), titleEn: roleLabel(inviteRole), hours: 'Part-time', dot: '#B3ADC7', stEs: 'Invitado', stEn: 'Invited', permsEs: '—', permsEn: '—', since: '2025', invited: true, email: inviteEmail.trim() || null };
            setMembers((e) => [member, ...e]);
            persistNewMember(member, inviteEmail.trim() || null);
            setInviteOpen(false);
            setInviteEmail('');
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
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
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
                className={`tap-y flex-1 cursor-pointer rounded-btn py-2.5 text-[11.5px] font-extrabold ${inviteRole === r ? 'bg-primary text-white' : 'border border-lilac-line bg-white text-ink-2'}`}
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

      {/* section tabs — configuration sections (distinct from the pill filters below) */}
      <SectionTabs
        className="mb-4"
        tabs={(mode === 'staff' ? staffTabs : jobTabs).map(([k, label]) => {
          const showPro = isFree && mode === 'staff' && proTabs[k];
          return [k, (
            <span className="inline-flex items-center gap-1.5">{label}{showPro && <span className="rounded px-1 py-px text-[8px] font-extrabold bg-amber-bg text-amber-ink">PRO</span>}</span>
          )] as SectionTab<string>;
        })}
        value={mode === 'staff' ? stabStaff : stabJobs}
        onChange={(k) => (mode === 'staff' ? setStabStaff(k as StaffTab) : setStabJobs(k as JobTab))}
      />

      {/* content */}
      {mode === 'staff' && (
        <div className="flex flex-col gap-4">
          {kpiRow}
          {staffLocked ? lockCard : (
            <>
              {stabStaff === 'roster' && rosterView}
              {stabStaff === 'schedule' && (isReal
                ? soonCard('Horarios de equipo', 'Team scheduling', 'Arma horarios semanales, copia turnos y avisa a tu equipo. Lo estamos terminando — muy pronto disponible.', 'Build weekly schedules, copy shifts and notify your team. We’re finishing it — available very soon.')
                : scheduleView)}
              {stabStaff === 'time' && (isReal
                ? soonCard('Reloj de asistencia', 'Time clock', 'Registra entradas, descansos y horas extra automáticamente. En camino.', 'Track clock-ins, breaks and overtime automatically. On the way.')
                : timeView)}
              {stabStaff === 'payroll' && (isReal
                ? soonCard('Nómina', 'Payroll', 'Corre la nómina con depósito directo e impuestos automáticos. Lo estamos integrando.', 'Run payroll with direct deposit and auto-filed taxes. We’re integrating it.')
                : payrollView)}
              {stabStaff === 'roles' && rolesView}
            </>
          )}
        </div>
      )}

      {mode === 'jobs' && (
        <div className="flex flex-col gap-4">
          {stabJobs === 'jobs' && jobsView}
          {stabJobs === 'pipeline' && (isReal
            ? soonCard('Candidatos', 'Applicant pipeline', 'Aquí verás y moverás a quienes apliquen a tus vacantes por etapas. Se activa junto con las postulaciones.', 'See and move applicants through stages here. It activates alongside job applications.')
            : pipelineView)}
          {stabJobs === 'visibility' && visibilityView}
        </div>
      )}

      <Toast msg={toast} />
    </div>
  );
}
