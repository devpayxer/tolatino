'use client';

// Reportar — un solo botón para TODA la plataforma (reseñas, publicaciones,
// comentarios, negocios, eventos, propiedades, vehículos, novedades).
// Escribe en la tabla unificada `reports` vía `create_report` (0122), que es la
// misma cola que el admin modera en /admin → Moderación. Antes cada superficie
// tenía (o no tenía) su propio camino; ahora hay uno solo — si aparece aquí,
// el founder lo ve.
//
// Un reporte por usuario y entidad (upsert en el RPC): reportar dos veces
// actualiza el motivo en vez de inflar la cola.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconFlag as Flag } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { createReport } from '@/lib/admin';

/** Tipos que el admin sabe moderar (deben coincidir con `admin_reports_queue`). */
export type ReportableType =
  | 'post' | 'comment' | 'review' | 'event_review'
  | 'business' | 'event' | 'property' | 'vehicle' | 'update';

const TITLE: Record<ReportableType, [string, string]> = {
  post: ['Reportar publicación', 'Report post'],
  comment: ['Reportar comentario', 'Report comment'],
  review: ['Reportar reseña', 'Report review'],
  event_review: ['Reportar reseña', 'Report review'],
  business: ['Reportar negocio', 'Report business'],
  event: ['Reportar evento', 'Report event'],
  property: ['Reportar propiedad', 'Report listing'],
  vehicle: ['Reportar vehículo', 'Report vehicle'],
  update: ['Reportar novedad', 'Report update'],
};

/** Motivos por familia — los de contenido y los de negocio/anuncio no son iguales. */
const CONTENT_REASONS: [string, string][] = [
  ['Spam o engañoso', 'Spam or misleading'],
  ['Contenido inapropiado', 'Inappropriate content'],
  ['Acoso o discurso de odio', 'Harassment or hate speech'],
  ['Información falsa', 'False information'],
  ['Otro', 'Other'],
];
const LISTING_REASONS: [string, string][] = [
  ['Es una estafa', "It's a scam"],
  ['No existe o cerró', 'Does not exist or closed'],
  ['Información falsa o precio engañoso', 'False info or misleading price'],
  ['Fotos que no son suyas', 'Photos that are not theirs'],
  ['Contenido inapropiado', 'Inappropriate content'],
  ['Otro', 'Other'],
];
const LISTING_TYPES = new Set<ReportableType>(['business', 'event', 'property', 'vehicle', 'update']);

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

/** ¿Se puede reportar esto? Contenido de ejemplo (fixtures) no tiene fila en la
 *  base, así que no hay nada que reportar.
 *
 *  Negocios y eventos son el caso especial: sus RPCs públicos exponen el `slug`,
 *  nunca el UUID (el slug ES su identidad pública). `create_report` (0123)
 *  resuelve slug → UUID en el servidor, así que aquí basta con que venga algo. */
export const canReport = (id: string | null | undefined, type?: ReportableType): boolean => {
  if (!supabase || !id) return false;
  if (type === 'business' || type === 'event') return id.length > 0 && !id.includes('/');
  return isUuid(id);
};

/** La hoja sola, controlada por el padre — para abrirla desde un menú que ya es
 *  un Overlay (dos overlays anidados se pelean el z-index: cierra el primero y
 *  abre esta). */
export function ReportSheet({
  type, id, open, onClose,
}: { type: ReportableType; id: string; open: boolean; onClose: () => void }) {
  const { L } = useLang();

  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const close = () => { setReason(null); setDetail(''); setDone(false); setErr(null); onClose(); };

  const send = async () => {
    if (!reason || busy) return;
    setBusy(true); setErr(null);
    const e = await createReport(type, id, reason, detail.trim() || undefined);
    setBusy(false);
    if (e) { setErr(L('No se pudo enviar el reporte. Intenta de nuevo.', "Couldn't send the report. Try again.")); return; }
    setDone(true);
  };

  const reasons = LISTING_TYPES.has(type) ? LISTING_REASONS : CONTENT_REASONS;
  const [tEs, tEn] = TITLE[type];

  return (
    <Overlay open={open} onClose={close} width={420}>
      {done ? (
        <div className="py-4 text-center">
          <div className="text-[16px] font-extrabold text-ink">{L('¡Gracias!', 'Thanks!')}</div>
          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-muted">
            {L('Nuestro equipo lo revisa. Si rompe las reglas, lo quitamos — así cuidamos a la comunidad.',
               'Our team reviews it. If it breaks the rules, we take it down — that is how we protect the community.')}
          </p>
          <PrimaryBtn className="mt-4" onClick={close}>{L('Listo', 'Done')}</PrimaryBtn>
        </div>
      ) : (
        <>
          <OverlayTitle title={L(tEs, tEn)} onClose={close} />
          <p className="mb-3 text-[12.5px] font-semibold text-muted">{L('¿Por qué reportas esto?', 'Why are you reporting this?')}</p>
          <div className="flex flex-col gap-1.5">
            {reasons.map(([resEs, resEn]) => (
              <button key={resEn} onClick={() => setReason(resEs)}
                className={`min-h-[44px] cursor-pointer rounded-field border-[1.5px] px-3.5 py-2.5 text-left text-[13px] font-bold ${
                  reason === resEs ? 'border-primary bg-lilac-3 text-ink' : 'border-line text-ink-soft'}`}>
                {L(resEs, resEn)}
              </button>
            ))}
          </div>
          <div className="mb-1.5 mt-3 text-[12.5px] font-extrabold text-ink">
            {L('Cuéntanos más', 'Tell us more')} <span className="font-semibold text-muted">({L('opcional', 'optional')})</span>
          </div>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value.slice(0, 500))} rows={3}
            placeholder={L('Entre más nos digas, más rápido lo resolvemos.', 'The more you tell us, the faster we resolve it.')}
            className="w-full resize-none rounded-field border-[1.5px] border-lilac-line bg-white px-3 py-2.5 text-[13px] font-medium text-ink outline-none focus:border-primary" />
          {err && <div className="mt-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
          <PrimaryBtn className="mt-3" disabled={!reason || busy} onClick={send}>
            {busy ? L('Enviando…', 'Sending…') : L('Enviar reporte', 'Send report')}
          </PrimaryBtn>
        </>
      )}
    </Overlay>
  );
}

/** Disparador + hoja, para el caso normal (dentro de una tarjeta o cabecera). */
export function ReportButton({
  type, id, variant = 'link', className = '',
}: {
  type: ReportableType;
  id: string;
  /** `link` = texto discreto (dentro de una tarjeta) · `icon` = solo la banderita. */
  variant?: 'link' | 'icon';
  className?: string;
}) {
  const { L } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!canReport(id, type)) return null;

  const openSheet = () => {
    if (!user) { router.push('/entrar'); return; }
    setOpen(true);
  };
  const [tEs, tEn] = TITLE[type];

  return (
    <>
      {variant === 'icon' ? (
        <button onClick={openSheet} aria-label={L(tEs, tEn)}
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-2 hover:bg-lilac-2 ${className}`}>
          <Flag size={16} stroke={2.2} />
        </button>
      ) : (
        <button onClick={openSheet}
          className={`inline-flex min-h-[32px] cursor-pointer items-center gap-1 text-[11.5px] font-extrabold text-muted-2 hover:text-pink-dark ${className}`}>
          <Flag size={13} stroke={2.2} /> {L('Reportar', 'Report')}
        </button>
      )}
      <ReportSheet type={type} id={id} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
