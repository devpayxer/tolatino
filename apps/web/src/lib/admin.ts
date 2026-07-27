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

// ═══════════════════════════ FASE 2 (migración 0122) ═════════════════════════

// ── Moderación ───────────────────────────────────────────────────────────────
export type ReportRow = {
  id: string; entity_type: string; entity_id: string; reason: string; detail: string | null;
  status: string; reporter_email: string | null; created_at: string;
  content_preview: string | null; content_author: string | null; content_author_id: string | null;
  content_hidden: boolean | null; report_count: number; total_count: number;
};
export type ReportAction = 'hide' | 'unhide' | 'delete' | 'dismiss' | 'reviewed';

/** Tipos reportables → etiqueta y si se pueden borrar (UGC) o solo ocultar. */
export const ENTITY_LABEL: Record<string, { es: string; en: string }> = {
  post: { es: 'Publicación', en: 'Post' },
  comment: { es: 'Comentario', en: 'Comment' },
  review: { es: 'Reseña', en: 'Review' },
  event_review: { es: 'Reseña de evento', en: 'Event review' },
  business: { es: 'Negocio', en: 'Business' },
  event: { es: 'Evento', en: 'Event' },
  property: { es: 'Propiedad', en: 'Property' },
  vehicle: { es: 'Vehículo', en: 'Vehicle' },
  update: { es: 'Novedad', en: 'Update' },
};
export const DELETABLE = new Set(['post', 'comment', 'review', 'event_review']);

export async function fetchReports(status: string, type: string, limit = 50, offset = 0): Promise<ReportRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_reports_queue', {
    in_status: status || 'pendiente', in_type: type || 'all', max_results: limit, in_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as ReportRow[];
}
export async function adminHandleReport(id: string, action: ReportAction, reason?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_report_handle', { in_id: id, in_action: action, in_reason: reason ?? null });
  return error ? error.message : null;
}

/** Lado usuario: reportar cualquier entidad. Un reporte por usuario (upsert). */
export async function createReport(entityType: string, entityId: string, reason: string, detail?: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('create_report', {
    in_type: entityType, in_entity_id: entityId, in_reason: reason, in_detail: detail || null,
  });
  return error ? error.message : null;
}

// ── Reclamos ─────────────────────────────────────────────────────────────────
export type ClaimMsg = { at: string; side: 'cliente' | 'negocio' | 'admin'; user_id: string; text: string };
export type ClaimRow = {
  id: string; kind: string; ref_code: string | null; reason: string; status: string;
  business_name: string | null; business_id: string | null; claimant_email: string | null; claimant_id: string;
  assigned_email: string | null; messages: ClaimMsg[]; created_at: string; updated_at: string;
  resolution: string | null; hours_open: number; total_count: number;
};
export type MyClaim = {
  id: string; kind: string; ref_code: string | null; business_name: string | null; reason: string;
  status: string; messages: ClaimMsg[]; created_at: string; resolved_at: string | null; resolution: string | null;
};
export const CLAIM_STATUS: Record<string, { es: string; en: string; cls: string }> = {
  abierto: { es: 'Abierto', en: 'Open', cls: 'bg-amber-bg text-amber-ink' },
  en_revision: { es: 'En revisión', en: 'In review', cls: 'bg-lilac-2 text-primary-dark' },
  resuelto: { es: 'Resuelto', en: 'Resolved', cls: 'bg-green-bg text-green-dark' },
  rechazado: { es: 'Rechazado', en: 'Rejected', cls: 'bg-pink-bg text-pink-dark' },
};
export const CLAIM_KIND: Record<string, { es: string; en: string }> = {
  orden: { es: 'Pedido', en: 'Order' }, reserva: { es: 'Reserva', en: 'Booking' },
  renta: { es: 'Renta', en: 'Rental' }, boleto: { es: 'Boleto', en: 'Ticket' },
  otro: { es: 'Otro', en: 'Other' },
};

export async function fetchAdminClaims(status: string, limit = 50, offset = 0): Promise<ClaimRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_claims_list', {
    in_status: status && status !== 'all' ? status : null, max_results: limit, in_offset: offset,
  });
  if (error || !Array.isArray(data)) return [];
  return data as ClaimRow[];
}
export async function adminUpdateClaim(p: { id: string; status?: string; assignMe?: boolean; resolution?: string }): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_claim_update', {
    in_id: p.id, in_status: p.status ?? null, in_assign_me: p.assignMe ?? false, in_resolution: p.resolution || null,
  });
  return error ? error.message : null;
}
export async function claimAddMessage(id: string, text: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('claim_add_message', { in_id: id, in_text: text });
  return error ? error.message : null;
}
/** Lado usuario — Mi Cuenta. */
export async function fetchMyClaims(): Promise<MyClaim[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_claims');
  if (error || !Array.isArray(data)) return [];
  return data as MyClaim[];
}
/** `businessId` es opcional: con `refId`, el servidor (0124) deduce el negocio
 *  de la compra — y de paso comprueba que la compra sea del que reclama. Los
 *  boletos NO exponen el negocio al cliente, así que ese camino es el único. */
export async function createClaim(p: {
  kind: string; refId?: string | null; refCode?: string | null; businessId?: string | null; reason: string; detail?: string;
}): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('create_claim', {
    in_kind: p.kind, in_ref_id: p.refId ?? null, in_ref_code: p.refCode ?? null,
    in_business: p.businessId ?? null, in_reason: p.reason, in_detail: p.detail || null,
  });
  return error ? error.message : null;
}

// ── Dinero ───────────────────────────────────────────────────────────────────
export type PaymentRow = {
  id: string; kind: string; status: string; amount: number; fee: number; ref: string | null;
  business_name: string | null; business_id: string | null; buyer_email: string | null;
  intent: string | null; created_at: string; total_count: number; sum_amount: number;
};
export type PendingRow = {
  id: string; kind: string; status: string; ref: string | null; amount: number;
  business_name: string | null; buyer_email: string | null; intent: string | null;
  created_at: string; updated_at: string; minutes_stuck: number; error: string | null;
};
export async function fetchPayments(p: { q?: string; kind?: string; status?: string; limit?: number; offset?: number }): Promise<PaymentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_payments_list', {
    in_q: p.q || null, in_kind: p.kind || 'all', in_status: p.status || 'all',
    max_results: p.limit ?? 40, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as PaymentRow[];
}
export async function fetchPendingMonitor(): Promise<PendingRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_pending_monitor', { max_results: 50 });
  if (error || !Array.isArray(data)) return [];
  return data as PendingRow[];
}
export async function adminRetryPending(id: string): Promise<{ msg: string; ok: boolean }> {
  if (!supabase) return { msg: 'offline', ok: false };
  const { data, error } = await supabase.rpc('admin_pending_retry', { in_id: id });
  if (error) return { msg: error.message, ok: false };
  const msg = String(data ?? '');
  return { msg, ok: /entregad|ok|listo/i.test(msg) };
}

/** Reembolso manual: Stripe corre en la edge function; la autorización la exige
 *  `admin_refund_ctx` bajo NUESTRO JWT, no el cliente. */
export async function adminRefundPayment(paymentId: string, reason: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return 'sin sesión';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return 'offline';
  try {
    const res = await fetch(`${url}/functions/v1/refund-purchase`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'payment', id: paymentId, reason }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) return String(j?.error ?? 'no se pudo reembolsar');
    if (j?.refunded !== true) return j?.reason === 'not_paid_online' ? 'no fue pago en línea' : 'no se pudo reembolsar';
    return null;
  } catch (e) {
    return String((e as Error)?.message ?? e);
  }
}

// ── Pedidos (vista global de las 4 superficies) ──────────────────────────────
export type GlobalTxRow = {
  kind: string; id: string; code: string | null; status: string; total: number;
  business_name: string | null; business_id: string | null; buyer_email: string | null;
  created_at: string; total_count: number;
};
export async function fetchGlobalOrders(p: { q?: string; kind?: string; status?: string; limit?: number; offset?: number }): Promise<GlobalTxRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('admin_orders_global', {
    in_q: p.q || null, in_kind: p.kind || 'all', in_status: p.status || 'all',
    max_results: p.limit ?? 40, in_offset: p.offset ?? 0,
  });
  if (error || !Array.isArray(data)) return [];
  return data as GlobalTxRow[];
}
export async function adminSetOrderStatus(kind: string, id: string, status: string, reason: string): Promise<string | null> {
  if (!supabase) return 'offline';
  const { error } = await supabase.rpc('admin_order_set_status', { in_kind: kind, in_id: id, in_status: status, in_reason: reason });
  return error ? error.message : null;
}

/** Estados válidos por superficie — copiados de los CHECK reales de la tabla.
 *  Si no coinciden, el UPDATE del RPC revienta contra la restricción. */
export const TX_STATUSES: Record<string, string[]> = {
  orden: ['new', 'preparing', 'ready', 'completed', 'cancelled'],
  reserva: ['pending', 'confirmed', 'seated', 'done', 'cancelled', 'no_show'],
  renta: ['pending', 'confirmed', 'out', 'returned', 'cancelled'],
  boleto: ['confirmed', 'used', 'refunded'],
};
export const TX_STATUS_LABEL: Record<string, { es: string; en: string }> = {
  new: { es: 'Nuevo', en: 'New' }, preparing: { es: 'Preparando', en: 'Preparing' },
  ready: { es: 'Listo', en: 'Ready' }, completed: { es: 'Completado', en: 'Completed' },
  cancelled: { es: 'Cancelado', en: 'Cancelled' }, pending: { es: 'Pendiente', en: 'Pending' },
  confirmed: { es: 'Confirmado', en: 'Confirmed' }, seated: { es: 'Atendido', en: 'Seated' },
  done: { es: 'Terminado', en: 'Done' }, no_show: { es: 'No llegó', en: 'No show' },
  out: { es: 'Entregado', en: 'Out' }, returned: { es: 'Devuelto', en: 'Returned' },
  used: { es: 'Usado', en: 'Used' }, refunded: { es: 'Reembolsado', en: 'Refunded' },
};
export const TX_KIND: Record<string, { es: string; en: string }> = {
  orden: { es: 'Pedido', en: 'Order' }, reserva: { es: 'Reserva', en: 'Booking' },
  renta: { es: 'Renta', en: 'Rental' }, boleto: { es: 'Boleto', en: 'Ticket' },
};

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
