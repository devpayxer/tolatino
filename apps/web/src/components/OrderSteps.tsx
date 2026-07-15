'use client';

// Shared order-progress tracker (vertical) for the two post-order confirmations:
// PurchaseReturnToast (paid via Stripe) and BizDetail's cash sheet. ONE source of
// truth so both always agree with the Mi cuenta tracker: a just-placed order is
// 'new' → step 1 "Esperando confirmación" active (nothing checked); it only
// advances when the business accepts (step 1 relabels to "Confirmado" ✓).

import { IconCheck as Check } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';

// 0 Esperando confirmación · 1 Preparando/Empacando · 2 En camino/Listo ·
// 3 Entregado/Recogido. THE stage mapping — client tracker AND business surfaces
// derive from here so both sides always describe the order identically.
// A STORE order (fulfillment.kind === 'store' — every line is a product) speaks
// Amazon/Walmart ("Empacando tu pedido", "Listo para recoger en tienda"), not
// kitchen wording; the stage MACHINE is identical, only the voice changes.
type StageOrder = { status: string; channel?: string | null; fulfillment?: { dispatch?: string; kind?: string } | null };
export function orderStageIdx(o: StageOrder | undefined | null): number {
  if (!o) return 0;
  const d = o.fulfillment?.dispatch;
  if (o.status === 'completed' || d === 'delivered') return 3;
  const delivery = o.channel === 'delivery';
  if (delivery && (d === 'picked_up' || d === 'on_the_way')) return 2;
  if (!delivery && o.status === 'ready') return 2; // pickup: Listo para recoger
  if (o.status === 'preparing' || o.status === 'ready') return 1;
  return 0;
}

/** Is this a Tienda (retail) order? Stamped at checkout — every line a product. */
export const isStoreOrder = (o: StageOrder | undefined | null): boolean => o?.fulfillment?.kind === 'store';

// The stage label the CUSTOMER is seeing right now — shown in the business
// dashboard ("Tu cliente ve: …") so owner and client are always on the same page.
export function orderStageLabel(o: StageOrder | undefined | null): [string, string] {
  if (o?.status === 'cancelled') return ['Cancelado', 'Cancelled'];
  const store = isStoreOrder(o);
  const prep: [string, string] = store ? ['Empacando', 'Packing'] : ['Preparando', 'Preparing'];
  const del: [string, string][] = [['Esperando confirmación', 'Awaiting confirmation'], prep, ['En camino', 'On the way'], ['Entregado', 'Delivered']];
  const pick: [string, string][] = [['Esperando confirmación', 'Awaiting confirmation'], prep, ['Listo para recoger', 'Ready for pickup'], ['Recogido', 'Picked up']];
  return (o?.channel === 'delivery' ? del : pick)[orderStageIdx(o)];
}

export function OrderStepsVertical({ stageIdx, isDelivery, store = false }: { stageIdx: number; isDelivery: boolean; store?: boolean }) {
  const { L } = useLang();
  const prep = store ? L('Empacando tu pedido', 'Packing your order') : L('Preparando', 'Preparing');
  const labels = isDelivery
    ? [stageIdx > 0 ? L('Confirmado', 'Confirmed') : L('Esperando confirmación', 'Awaiting confirmation'), prep, L('En camino', 'On the way'), L('Entregado', 'Delivered')]
    : [stageIdx > 0 ? L('Confirmado', 'Confirmed') : L('Esperando confirmación', 'Awaiting confirmation'), prep, store ? L('Listo para recoger en tienda', 'Ready for store pickup') : L('Listo para recoger', 'Ready for pickup')];
  return (
    <div className="flex flex-col gap-0 rounded-card border border-hair bg-white p-4 shadow-card">
      {labels.map((label, i, arr) => {
        const done = i < stageIdx;
        const active = i === stageIdx;
        return (
          <div key={label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${done ? 'bg-green' : active ? 'bg-primary' : 'bg-lilac-line'}`}>
                {done ? <Check size={11} stroke={3.6} className="text-white" /> : <span className={`h-1.5 w-1.5 rounded-full ${active ? 'animate-pulse bg-white' : 'bg-white/70'}`} />}
              </span>
              {i < arr.length - 1 && <span className={`w-[2px] flex-1 ${done ? 'bg-green' : 'bg-lilac-line'}`} style={{ minHeight: 14 }} />}
            </div>
            <div className={`pb-2.5 text-[12px] ${done || active ? 'font-extrabold text-ink' : 'font-semibold text-muted'}`}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}
