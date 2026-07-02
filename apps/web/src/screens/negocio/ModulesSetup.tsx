'use client';

// "Configurar módulos" — toggle only what the business needs. Free tier sees
// everything locked behind Verified.

import { Bike, Lock, Megaphone, Package, Ticket, Utensils } from 'lucide-react';
import type { Mods, PanelCtx } from '@/screens/negocio/tabs';

export function ModulesSetup({ ctx, onToggle }: { ctx: PanelCtx; onToggle: (k: keyof Mods) => void }) {
  const { L, ci, isFree, mods } = ctx;
  const defs = [
    { key: 'services' as const, Icon: ci.svc, bg: '#F1EFFA', label: L('Servicios', 'Services'), desc: L('Lista de servicios con precios y reservas.', 'Service list with prices and bookings.'), dep: L('Reservas activado', 'Bookings on') },
    { key: 'products' as const, Icon: Package, bg: '#E4ECFB', label: L('Productos', 'Products'), desc: L('Vende en línea o muestra un catálogo.', 'Sell online or show a catalog.'), dep: L('Envío y repartidores activado', 'Shipping & drivers on') },
    { key: 'menu' as const, Icon: Utensils, bg: '#FCEFD6', label: L('Menú de comida', 'Food menu'), desc: L('Menú por secciones con entrega.', 'Sectioned menu with delivery.'), dep: L('Entrega local activado', 'Local delivery on') },
    { key: 'rental' as const, Icon: Bike, bg: '#E3F5EA', label: L('Renta', 'Rental'), desc: L('Renta equipo, bicis, mobiliario.', 'Rent equipment, bikes, furniture.'), dep: '' },
    { key: 'events' as const, Icon: Ticket, bg: '#FDE7EF', label: L('Eventos y boletos', 'Events & tickets'), desc: L('Crea eventos y vende boletos.', 'Create events and sell tickets.'), dep: '' },
    { key: 'updates' as const, Icon: Megaphone, bg: '#F1EFFA', label: L('Novedades', 'Updates'), desc: L('Publica ofertas y avisos en tu stream.', 'Post offers and news to your stream.'), dep: '' },
  ];

  return (
    <div className="grid gap-3 pb-8 md:grid-cols-2 xl:grid-cols-3">
      {defs.map((m) => {
        const on = !isFree && mods[m.key];
        return (
          <div key={m.key} className={`rounded-card-sm border bg-white p-4 shadow-card ${on ? 'border-[rgba(123,97,255,.3)]' : 'border-hair'}`}>
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-btn" style={{ background: m.bg }}>
                <m.Icon size={21} strokeWidth={2.2} className="text-primary-dark" />
              </span>
              {isFree ? (
                <span className="flex items-center gap-1 rounded-full bg-lilac-2 px-2.5 py-1 text-[10px] font-extrabold text-muted">
                  <Lock size={10} strokeWidth={2.6} />
                  Verified
                </span>
              ) : (
                <button
                  onClick={() => onToggle(m.key)}
                  className={`relative h-[24px] w-[42px] flex-none cursor-pointer rounded-full transition-colors ${on ? 'bg-primary' : 'bg-[#D8D2E6]'}`}
                  aria-label={m.label}
                >
                  <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${on ? 'left-[21px]' : 'left-[3px]'}`} />
                </button>
              )}
            </div>
            <div className="mt-3 text-[14px] font-extrabold text-ink">{m.label}</div>
            <div className="mt-0.5 text-[12px] font-semibold leading-snug text-muted">{m.desc}</div>
            {on && m.dep && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-green-bg px-2.5 py-1 text-[10.5px] font-extrabold text-green-dark">
                ✓ {m.dep}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
