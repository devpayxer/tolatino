// Super Admin — client lib (migraciones 0120/0121, plan docs/ADMIN-DASHBOARD-PLAN.md).
// TODO acceso pasa por RPCs SECURITY DEFINER que verifican rol en el servidor y
// auditan. Este archivo no contiene secretos: sin fila en `admins`, cada llamada
// devuelve `forbidden` y la UI muestra 404.

import { supabase } from '@/lib/supabase';

export type AdminRole = 'superadmin' | 'finanzas' | 'moderador' | 'soporte';
export type AdminMe = { role: AdminRole; email: string };

export const ROLE_LABEL: Record<AdminRole, { es: string; en: string }> = {
  superadmin: { es: 'Superadmin', en: 'Superadmin' },
  finanzas: { es: 'Finanzas', en: 'Finance' },
  moderador: { es: 'Moderador', en: 'Moderator' },
  soporte: { es: 'Soporte', en: 'Support' },
};

/** null = no eres admin (o no hay sesión) → la ruta debe 404. */
export async function fetchAdminMe(): Promise<AdminMe | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_whoami');
  if (error || !Array.isArray(data) || !data.length) return null;
  const r = data[0] as { role: string; email: string };
  return { role: r.role as AdminRole, email: r.email };
}

// ── Inicio ───────────────────────────────────────────────────────────────────
export type AdminDash = {
  users: { total: number; new7: number; new30: number; suspended: number };
  businesses: { total: number; free: number; verified: number; premium: number; suspended: number; connect: number; new7: number };
  money: { gmv_today: number; gmv_7: number; gmv_30: number; fees_30: number; tx_30: number; refunded_30: number };
  tx: { orders_today: number; bookings_today: number; rentals_today: number; tickets_today: number };
  content: { posts7: number; events_upcoming: number; properties: number; vehicles: number; reviews7: number };
  alerts: { stuck_fulfilling: number; reports_pending: number; claims_open: number; licenses_pending: number; businesses_suspended: number; users_suspended: number };
  recent_payments: { id: string; kind: string; status: string; amount: number; fee: number; business: string | null; created_at: string }[];
};
export async function fetchAdminDashboard(): Promise<AdminDash | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_dashboard');
  if (error || !data) return null;
  return data as AdminDash;
}

// ── Usuarios ─────────────────────────────────────────────────────────────────
export type AdminUserRow = {
  id: string; email: string; display_name: string | null; initials: string | null;
  avatar_color: string | null; city_label: string | null; created_at: string;
  last_sign_in_at: string | null; suspended_until: string | null; suspended_reason: string | null;
  businesses: number; orders: number; total_count: number;
};
export async function fetchAdminUsers(q: string, state: string, limit = 30, offset = 0): Promise<AdminUserRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_users_list', {
    in_q: q || null, in_state: state || 'all', max_results: limit, in_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as AdminUserRow[];
}
export type AdminUserDetail = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean;
  profile: Record<string, unknown> | null;
  admin_role: AdminRole | null;
  counts: Record<string, number>;
  businesses: { id: string; slug: string; name: string; tier: string; category: string; city: string; suspended: boolean }[];
  payments: { id: string; kind: string; status: string; amount: number; created_at: string }[];
};
export async function fetchAdminUser(id: string): Promise<AdminUserDetail | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_user_detail', { in_id: id });
  if (error || !data) return null;
  return data as AdminUserDetail;
}
export async function adminSuspendUser(id: string, days: number, reason: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_user_suspend', { in_id: id, in_days: days, in_reason: reason });
  return error ? error.message : null;
}
export async function adminUnsuspendUser(id: string, reason?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_user_unsuspend', { in_id: id, in_reason: reason ?? null });
  return error ? error.message : null;
}

// ── Negocios ─────────────────────────────────────────────────────────────────
export type AdminBizRow = {
  id: string; slug: string; name: string; category_id: string; city: string | null; tier: string;
  suspended: boolean; verified_license: boolean; connect: boolean;
  rating: number | null; reviews_count: number | null; owner_email: string | null;
  created_at: string; license: string | null; total_count: number;
};
export async function fetchAdminBusinesses(p: {
  q?: string; cat?: string; city?: string; tier?: string; state?: string; limit?: number; offset?: number;
}): Promise<AdminBizRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_businesses_list', {
    in_q: p.q || null, in_cat: p.cat || 'all', in_city: p.city || null,
    in_tier: p.tier || 'all', in_state: p.state || 'all',
    max_results: p.limit ?? 30, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as AdminBizRow[];
}
export type AdminBizDetail = {
  business: Record<string, unknown>;
  owner: { id: string | null; email: string | null; name: string | null };
  counts: Record<string, number>;
  money: { gross_30: number; fees_30: number; tx_30: number };
  subscription: Record<string, unknown> | null;
};
export async function fetchAdminBusiness(id: string): Promise<AdminBizDetail | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_business_detail', { in_id: id });
  if (error || !data) return null;
  return data as AdminBizDetail;
}
export async function adminSuspendBusiness(id: string, suspend: boolean, reason: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_business_suspend', { in_id: id, in_suspend: suspend, in_reason: reason });
  return error ? error.message : null;
}
export async function adminSetTier(id: string, tier: string, reason: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_business_set_tier', { in_id: id, in_tier: tier, in_reason: reason });
  return error ? error.message : null;
}

// ── Licencias ────────────────────────────────────────────────────────────────
export type AdminLicenseRow = {
  id: string; slug: string; name: string; category_id: string; city: string | null; tier: string;
  license: string | null; seller_type: string | null; langs: string | null;
  owner_email: string | null; verified_license: boolean; created_at: string;
};
export async function fetchLicenseQueue(): Promise<AdminLicenseRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_license_queue', { max_results: 100 });
  if (error || !Array.isArray(data)) return [];
  return data as AdminLicenseRow[];
}
export async function adminVerifyLicense(id: string, approve: boolean, reason?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_license_verify', { in_id: id, in_approve: approve, in_reason: reason ?? null });
  return error ? error.message : null;
}

// ── Bitácora ─────────────────────────────────────────────────────────────────
export type AdminAuditRow = {
  id: number; actor_email: string | null; action: string; entity_type: string | null;
  entity_id: string | null; before: unknown; after: unknown; reason: string | null;
  created_at: string; total_count: number;
};
export async function fetchAdminAudit(p: { entityType?: string; entityId?: string; action?: string; limit?: number; offset?: number } = {}): Promise<AdminAuditRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_audit_list', {
    in_entity_type: p.entityType ?? null, in_entity_id: p.entityId ?? null,
    in_action: p.action ?? null, max_results: p.limit ?? 50, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as AdminAuditRow[];
}

// ── formatos ─────────────────────────────────────────────────────────────────
export const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const compact = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
export function timeAgo(iso: string, es: boolean): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return es ? 'ahora' : 'now';
  const m = Math.floor(s / 60); if (m < 60) return es ? `hace ${m} min` : `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return es ? `hace ${h} h` : `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return es ? `hace ${d} d` : `${d}d ago`;
  return new Date(iso).toLocaleDateString(es ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
