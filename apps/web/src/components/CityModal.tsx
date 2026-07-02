'use client';

// City selector (Handoff v2): "use my location" (simulated detection for now;
// real geolocation + reverse-geocode via Nominatim later) + searchable list.
// Bottom sheet on mobile, dialog on desktop.

import { useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Overlay, OverlayTitle } from '@/components/ui';
import { CITIES, DEFAULT_CITY } from '@/data/fixtures';

export function CityModal() {
  const { L } = useLang();
  const app = useApp();
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);

  const close = () => {
    app.setCityOpen(false);
    setQ('');
    setLocating(false);
  };
  const pick = (name: string) => {
    app.setCity(name);
    close();
  };
  const detect = () => {
    setLocating(true);
    setTimeout(() => pick(DEFAULT_CITY), 1100);
  };

  const ql = q.trim().toLowerCase();
  const list = CITIES.map(([n, s]) => `${n}, ${s}`).filter((nm) => !ql || nm.toLowerCase().includes(ql));
  const hasCustom = ql.length > 0 && !CITIES.some(([n, s]) => `${n}, ${s}`.toLowerCase() === ql);

  return (
    <Overlay open={app.cityOpen} onClose={close} width={416}>
      <OverlayTitle title={L('Cambiar ciudad', 'Change city')} onClose={close} />

      <button
        onClick={detect}
        className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-3 p-3 text-left"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary">
          {locating ? (
            <span className="h-4 w-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <LocateFixed size={17} className="text-white" strokeWidth={2.2} />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-extrabold text-ink">
            {locating ? L('Detectando tu ubicación…', 'Detecting your location…') : L('Usar mi ubicación actual', 'Use my current location')}
          </span>
          <span className="block text-[11.5px] font-semibold text-muted">
            {L('Te mostramos lo que está cerca de ti', 'See what’s near you')}
          </span>
        </span>
      </button>

      <div className="mt-3 flex items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px]">
        <Search size={15} className="flex-none text-primary" strokeWidth={2.2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L('Escribe tu ciudad…', 'Type your city…')}
          className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted"
        />
      </div>

      <div className="mt-2 flex max-h-[290px] flex-col gap-0.5 overflow-y-auto">
        {list.map((nm) => (
          <button
            key={nm}
            onClick={() => pick(nm)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] px-2 py-2.5 text-left text-[13.5px] font-bold ${
              nm === app.city ? 'bg-lilac-3 text-ink' : 'text-ink-soft hover:bg-app'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <MapPin size={14} className="text-primary" strokeWidth={2.4} />
              {nm}
            </span>
            {nm === app.city && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
        {hasCustom && (
          <button
            onClick={() => pick(q.trim())}
            className="mt-1 w-full cursor-pointer rounded-btn bg-lilac-3 px-3.5 py-3 text-left text-[12.5px] font-extrabold text-primary-dark"
          >
            {L('Usar', 'Use')} “{q.trim()}”
          </button>
        )}
      </div>
    </Overlay>
  );
}
