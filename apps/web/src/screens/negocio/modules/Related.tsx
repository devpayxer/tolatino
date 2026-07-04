'use client';

// Listado → Listados relacionados. Real portfolio view: every business the
// signed-in owner manages (from bizAdmin). The active one is marked; tap another
// to switch the whole panel to it. Publishing another listing is one tap away.
// (Linking external/sister brands you don't own is a later, separate feature.)

import { useRouter } from 'next/navigation';
import { Check, Loader2, Plus, Store } from 'lucide-react';
import { useBizAdmin } from '@/lib/bizAdmin';
import { CAT, type CatKey } from '@/lib/tiles';
import { VerifiedBadge } from '@/components/ui';
import type { PanelCtx } from '@/screens/negocio/tabs';

export function RelatedModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();

  if (admin.loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!admin.hasReal) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Aún no tienes negocios', 'No businesses yet')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu primer negocio para administrarlo aquí. Puedes tener varios listados.', 'Publish your first business to manage it here. You can run several listings.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-3 text-[12.5px] font-bold text-muted">
        {admin.businesses.length} {admin.businesses.length === 1 ? L('listado', 'listing') : L('listados', 'listings')} · {L('toca uno para administrarlo', 'tap one to manage it')}
      </div>
      <div className="flex flex-col gap-2.5">
        {admin.businesses.map((b) => {
          const active = b.id === admin.activeId;
          const cat = CAT[b.category_id as CatKey];
          return (
            <button
              key={b.id}
              onClick={() => admin.setActive(b.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-tile border-[1.5px] bg-white p-3 text-left ${active ? 'border-primary' : 'border-hair hover:border-lilac-ring'}`}
            >
              <span
                className="h-11 w-11 flex-none rounded-btn"
                style={{ background: `repeating-linear-gradient(135deg,${b.tile_a ?? cat?.bg ?? '#EFEBFF'} 0 9px,${b.tile_b ?? cat?.dot ?? '#7B61FF'} 9px 18px)` }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-extrabold text-ink">{b.name}</span>
                  {b.tier !== 'free' && <VerifiedBadge size={13} />}
                </span>
                <span className="block truncate text-[11.5px] font-semibold text-muted">
                  {cat ? L(cat.es, cat.en) : b.category_id} · {b.city ?? ''}
                </span>
              </span>
              {active ? (
                <span className="flex flex-none items-center gap-1 rounded-full bg-lilac px-2.5 py-1 text-[10.5px] font-extrabold text-primary-dark">
                  <Check size={11} strokeWidth={3} />
                  {L('Activo', 'Active')}
                </span>
              ) : (
                <span className="flex-none text-[11px] font-extrabold text-muted-faint">{L('Administrar ›', 'Manage ›')}</span>
              )}
            </button>
          );
        })}

        <button
          onClick={() => router.push('/negocio/publicar')}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-tile border-[1.5px] border-dashed border-lilac-line bg-white py-3 text-[12.5px] font-extrabold text-primary-dark"
        >
          <Plus size={15} strokeWidth={2.6} />
          {L('Publicar otro negocio', 'Publish another business')}
        </button>
      </div>
    </div>
  );
}
