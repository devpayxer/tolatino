'use client';

// City selector (Handoff v2) — REAL geolocation:
//  • "Use my location" → browser Geolocation API → reverse geocode (Nominatim).
//  • Type a city → live autocomplete against OpenStreetMap (Photon), debounced.
// The chosen place carries real coordinates that drive the geo query app-wide.
// Bottom sheet on mobile, dialog on desktop.

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, LocateFixed, MapPin, Search } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { POPULAR_CITIES, getBrowserLocation, nearestCity, searchCities, type Place } from '@/lib/geo';

export function CityModal() {
  const { L } = useLang();
  const app = useApp();
  const [q, setQ] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<Place | null>(null); // needs confirmation
  const [detected, setDetected] = useState(false); // pending came from GPS
  const abortRef = useRef<AbortController | null>(null);

  const close = () => {
    app.setCityOpen(false);
    setQ('');
    setLocating(false);
    setGeoError(null);
    setResults([]);
    setPending(null);
    setDetected(false);
  };

  // commit only after confirmation, then optionally prompt for a precise address
  const confirm = (p: Place) => {
    app.setCityWithCoords(p.label, { lat: p.lat, lng: p.lng });
    close();
    app.setAddressOpen(true);
  };
  const choose = (p: Place, fromGps = false) => {
    setDetected(fromGps);
    setPending(p);
  };

  // Debounced live autocomplete (Photon). Cancels stale requests.
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
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
        setResults(await searchCities(query, ctrl.signal));
      } catch {
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const detect = async () => {
    setGeoError(null);
    setLocating(true);
    try {
      const { lat, lng } = await getBrowserLocation();
      const place = await nearestCity(lat, lng);
      choose(place, true); // require confirmation before switching
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      setGeoError(
        code === 1
          ? L('Permiso denegado. Actívalo en tu navegador o elige tu ciudad abajo.', 'Permission denied. Enable it in your browser or pick your city below.')
          : L('No pudimos detectar tu ubicación. Elige tu ciudad abajo.', "Couldn't detect your location. Pick your city below."),
      );
    } finally {
      setLocating(false);
    }
  };

  const showPopular = q.trim().length < 2;
  const list = showPopular ? POPULAR_CITIES : results;

  // ── Confirmation gate: don't switch city without confirming ──
  if (app.cityOpen && pending) {
    return (
      <Overlay open onClose={close} width={416}>
        <OverlayTitle title={L('Confirma tu ciudad', 'Confirm your city')} onClose={close} onBack={() => { setPending(null); setDetected(false); }} />
        <div className="px-2 pb-2 pt-1 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
            <MapPin size={24} className="text-primary" strokeWidth={2.2} />
          </span>
          <div className="mt-4 text-[17px] font-extrabold text-ink">
            {detected ? L('¿Es esta tu ciudad?', 'Is this your city?') : L('¿Cambiar a esta ciudad?', 'Switch to this city?')}
          </div>
          <p className="mt-1 text-[12.5px] font-medium text-muted">
            {detected ? L('Te ubicamos aquí.', 'We located you here.') : L('Verás el contenido de esta zona.', 'You’ll see content from this area.')}
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-2.5 rounded-tile bg-app px-4 py-3.5">
            <MapPin size={18} className="text-primary" strokeWidth={2.4} />
            <span className="text-[16px] font-extrabold text-ink">{pending.label}</span>
          </div>
          <PrimaryBtn className="mt-5" onClick={() => confirm(pending)}>
            {detected ? L('Sí, esta es mi ciudad', 'Yes, this is my city') : L('Sí, cambiar', 'Yes, switch')}
          </PrimaryBtn>
          <button
            onClick={() => { setPending(null); setDetected(false); }}
            className="mt-3 w-full cursor-pointer text-center text-[13px] font-extrabold text-primary-dark"
          >
            {L('No, elegir otra', 'No, pick another')}
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay open={app.cityOpen} onClose={close} width={416}>
      <OverlayTitle title={L('Cambiar ciudad', 'Change city')} onClose={close} />

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
            {locating ? L('Detectando tu ubicación…', 'Detecting your location…') : L('Usar mi ubicación actual', 'Use my current location')}
          </span>
          <span className="block text-[11.5px] font-semibold text-muted">
            {L('Te mostramos lo que está cerca de ti', 'See what’s near you')}
          </span>
        </span>
      </button>

      {geoError && (
        <div className="mt-2 rounded-btn bg-pink-bg px-3 py-2 text-[11.5px] font-semibold text-pink-dark">{geoError}</div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px]">
        <Search size={15} className="flex-none text-primary" strokeWidth={2.2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L('Escribe tu ciudad…', 'Type your city…')}
          className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted"
        />
        {searching && <span className="h-3.5 w-3.5 flex-none animate-[spin_.8s_linear_infinite] rounded-full border-2 border-primary border-t-transparent" />}
      </div>

      {showPopular && (
        <div className="px-1 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-muted-2">
          {L('Ciudades populares', 'Popular cities')}
        </div>
      )}

      <div className="mt-1 flex max-h-[290px] flex-col gap-0.5 overflow-y-auto">
        {list.map((p) => {
          const current = p.label === app.city;
          return (
            <button
              key={`${p.label}-${p.lat}`}
              onClick={() => choose(p)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] px-2 py-2.5 text-left text-[13.5px] font-bold ${
                current ? 'bg-lilac-3 text-ink' : 'text-ink-soft hover:bg-app'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <MapPin size={14} className="text-primary" strokeWidth={2.4} />
                {p.label}
              </span>
              {current && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}

        {!showPopular && !searching && results.length === 0 && (
          <div className="px-2 py-6 text-center text-[12.5px] font-semibold text-muted">
            {L('Sin ciudades para tu búsqueda', 'No cities match your search')}
          </div>
        )}
      </div>

      {/* optional precise address → real distances + delivery */}
      <button
        onClick={() => {
          close();
          app.setAddressOpen(true);
        }}
        className="mt-3 flex w-full cursor-pointer items-center gap-2.5 rounded-tile border border-hair bg-app p-3 text-left hover:bg-lilac-2"
      >
        <MapPin size={16} className="flex-none text-primary" strokeWidth={2.4} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold text-ink">{L('Dirección exacta (opcional)', 'Exact address (optional)')}</span>
          <span className="block truncate text-[11.5px] font-semibold text-muted">
            {app.address ?? L(`Usando el centro de ${app.cityShort}`, `Using ${app.cityShort} center`)}
          </span>
        </span>
        <ChevronRight size={16} className="flex-none text-muted" strokeWidth={2.4} />
      </button>
    </Overlay>
  );
}
