'use client';

// Optional precise address (Phase 1). Sets the geo origin used for real
// distances in Negocios and, later, the delivery destination for orders.
//  • "Use my location" → GPS → reverse geocode to a full address (Nominatim).
//  • Type an address → live autocomplete (Photon), debounced.
// When no address is set, the app falls back to the city center. Free/OSS geo.

import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Overlay, OverlayTitle } from '@/components/ui';
import { getBrowserLocation, reverseAddress, searchAddress, type Address } from '@/lib/geo';

export function AddressModal() {
  const { L } = useLang();
  const app = useApp();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const close = () => {
    app.setAddressOpen(false);
    setQ('');
    setResults([]);
    setGeoError(null);
    setLocating(false);
  };

  const pick = (a: Address) => {
    app.setUserAddress(a.formatted, { lat: a.lat, lng: a.lng });
    close();
  };

  // Debounced address autocomplete (Photon). Cancels stale requests.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        setResults(await searchAddress(query, ctrl.signal));
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const detect = async () => {
    setGeoError(null);
    setLocating(true);
    try {
      const { lat, lng } = await getBrowserLocation();
      pick(await reverseAddress(lat, lng));
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      setGeoError(
        code === 1
          ? L('Permiso denegado. Actívalo o escribe tu dirección abajo.', 'Permission denied. Enable it or type your address below.')
          : L('No pudimos detectar tu ubicación. Escribe tu dirección abajo.', "Couldn't detect your location. Type your address below."),
      );
      setLocating(false);
    }
  };

  return (
    <Overlay open={app.addressOpen} onClose={close} width={460}>
      <OverlayTitle title={L('Tu dirección', 'Your address')} onClose={close} />
      <p className="-mt-1 mb-3 text-[12.5px] font-semibold text-muted">
        {L('Opcional · para distancias exactas y pedir a domicilio.', 'Optional · for exact distances and delivery.')}
      </p>

      <button
        onClick={detect}
        disabled={locating}
        className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-3 p-3 text-left disabled:cursor-wait"
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
            {locating ? L('Ubicando…', 'Locating…') : L('Usar mi ubicación actual', 'Use my current location')}
          </span>
          <span className="block text-[11.5px] font-semibold text-muted">{L('La forma más rápida y exacta', 'The fastest, most exact way')}</span>
        </span>
      </button>

      {geoError && <div className="mt-2 rounded-btn bg-pink-bg px-3 py-2 text-[11.5px] font-semibold text-pink-dark">{geoError}</div>}

      <div className="mt-3 flex items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px]">
        <Search size={15} className="flex-none text-primary" strokeWidth={2.2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L('Escribe tu dirección…', 'Type your address…')}
          className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted"
        />
        {searching && <span className="h-3.5 w-3.5 flex-none animate-[spin_.8s_linear_infinite] rounded-full border-2 border-primary border-t-transparent" />}
      </div>

      {app.address && q.trim().length < 3 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-tile bg-lilac-3 p-3">
          <MapPin size={16} className="flex-none text-primary" strokeWidth={2.4} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{app.address}</span>
          <button onClick={() => app.clearUserAddress()} className="flex-none cursor-pointer text-[11.5px] font-extrabold text-primary-dark">
            {L('Quitar', 'Remove')}
          </button>
        </div>
      )}

      <div className="mt-2 flex max-h-[300px] flex-col gap-0.5 overflow-y-auto">
        {results.map((a, i) => (
          <button
            key={`${a.formatted}-${i}`}
            onClick={() => pick(a)}
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] px-2 py-2.5 text-left hover:bg-app"
          >
            <MapPin size={15} className="mt-0.5 flex-none text-primary" strokeWidth={2.4} />
            <span className="text-[13px] font-bold text-ink-soft">{a.formatted}</span>
          </button>
        ))}
        {q.trim().length >= 3 && !searching && results.length === 0 && (
          <div className="px-2 py-6 text-center text-[12.5px] font-semibold text-muted">{L('Sin resultados', 'No results')}</div>
        )}
      </div>

      <button
        onClick={() => {
          app.clearUserAddress();
          close();
        }}
        className="mt-3 w-full cursor-pointer text-center text-[12.5px] font-extrabold text-muted"
      >
        {L(`Omitir · usar el centro de ${app.cityShort}`, `Skip · use ${app.cityShort} center`)}
      </button>
    </Overlay>
  );
}
