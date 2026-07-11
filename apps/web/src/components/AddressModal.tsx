'use client';

// Saved addresses manager (Phase 2). Signed-in users keep multiple labeled
// addresses (Casa / Trabajo / …), pick the active one (geo origin), set a
// default, rename or delete. Guests get a single address stored locally, with a
// nudge to sign in. Add via GPS (reverse geocode) or Photon autocomplete —
// free/OSS, no Google billing.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck as Check, IconCurrentLocation as LocateFixed, IconMapPin as MapPin, IconPencil as Pencil, IconSearch as Search, IconStar as Star, IconTrash as Trash2 } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { useAuth } from '@/lib/auth';
import { useAddresses, type SavedAddress } from '@/lib/addresses';
import { Overlay, OverlayTitle, PrimaryBtn } from '@/components/ui';
import { censusGeocode, cityCenter, getBrowserLocation, nearestCity, reverseAddress, sameAddress, searchAddress, type Address } from '@/lib/geo';

export function AddressModal() {
  const { L } = useLang();
  const app = useApp();
  const auth = useAuth();
  const store = useAddresses();
  const router = useRouter();

  const saved = !!auth.user && store.configured; // logged-in → multi-address manager

  const [q, setQ] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [results, setResults] = useState<Address[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addErr, setAddErr] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Monotonic pick token: every pick/clear bumps it, and every async
  // continuation re-checks it before applying — a slow earlier pick can never
  // overwrite a newer choice.
  const pickSeq = useRef(0);

  const close = () => {
    app.setAddressOpen(false);
    abortRef.current?.abort(); // don't let an in-flight search resurrect results
    setQ('');
    setNewLabel('');
    setResults([]);
    setGeoError(null);
    setLocating(false);
    setEditId(null);
    setAddErr(null);
  };

  // Map a precise point to its nearest known city (for switching the app city).
  const cityOf = async (lat: number, lng: number) => {
    try {
      const c = await nearestCity(lat, lng);
      return { label: c.label, lat: c.lat, lng: c.lng };
    } catch {
      return undefined;
    }
  };

  // City context for an address: its OWN city name, but with the city's REAL
  // center (via the gazetteer) so "use the city center" never keeps the house
  // point; nearest-city only as a last resort.
  const cityCtxOf = async (a: Address | { city?: string | null; lat: number; lng: number }) =>
    a.city ? await cityCenter(a.city, { lat: a.lat, lng: a.lng }) : await cityOf(a.lat, a.lng);

  // Choose a resolved address. Apply it immediately as the active origin (instant
  // feedback + works even if the DB save fails), switch the whole app to that
  // address's city, then (signed-in) save it and swap in the real id.
  const choose = async (raw: Address) => {
    setAddErr(null);
    const seq = ++pickSeq.current;
    abortRef.current?.abort(); // kill any pending suggestion fetch
    // Instant feedback: apply the pick right away (street-level is fine for a
    // moment), then refine below.
    app.setUserAddress(raw.formatted, { lat: raw.lat, lng: raw.lng }, null, raw.city ? { label: raw.city, lat: raw.lat, lng: raw.lng } : undefined);
    setQ('');
    setResults([]);
    if (!saved) close(); // guests: pick → done; refinement continues in background

    // Synthesized house+street picks carry street coords — snap them to the
    // exact house point (+ correct ZIP) via the official US Census geocoder,
    // but only when Census matched the SAME house+street the user picked.
    let a = raw;
    if (raw.approx) {
      const exact = await censusGeocode(raw.formatted);
      if (exact && sameAddress(raw.formatted, exact.formatted)) a = exact;
    }
    if (seq !== pickSeq.current) return; // superseded by a newer pick/clear
    const coords = { lat: a.lat, lng: a.lng };
    const cityCtx = await cityCtxOf(a);
    if (seq !== pickSeq.current) return;
    app.setUserAddress(a.formatted, coords, null, cityCtx);
    if (!saved) return;

    const row = await store.add(newLabel.trim() || null, a.formatted, a.lat, a.lng, a.city || null);
    if (seq !== pickSeq.current) return;
    if (row) {
      app.setUserAddress(row.formatted, { lat: row.lat, lng: row.lng }, row.id, cityCtx);
      setNewLabel('');
    } else {
      setAddErr(
        L(
          'Dirección aplicada en este dispositivo, pero no se pudo guardar en tu cuenta. ¿Corriste la migración de direcciones?',
          "Address applied on this device, but we couldn't save it to your account. Did you run the addresses migration?",
        ),
      );
    }
  };

  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      abortRef.current?.abort(); // a cleared/shortened query must not resurrect
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
        setResults(await searchAddress(query, { lat: app.coords.lat, lng: app.coords.lng, city: app.city }, ctrl.signal));
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
      await choose(await reverseAddress(lat, lng));
    } catch (err: unknown) {
      const code = (err as GeolocationPositionError)?.code;
      setGeoError(
        code === 1
          ? L('Permiso denegado. Actívalo o escribe tu dirección abajo.', 'Permission denied. Enable it or type your address below.')
          : L('No pudimos detectar tu ubicación. Escribe tu dirección abajo.', "Couldn't detect your location. Type your address below."),
      );
    } finally {
      setLocating(false);
    }
  };

  const selectSaved = (a: SavedAddress) => {
    const seq = ++pickSeq.current;
    const coords = { lat: a.lat, lng: a.lng };
    app.setUserAddress(a.formatted, coords, a.id, a.city ? { label: a.city, lat: a.lat, lng: a.lng } : undefined); // instant
    close(); // pick → done (Uber-style)
    // refine in the background: real city center (and city for legacy rows)
    cityCtxOf(a).then((c) => {
      if (c && seq === pickSeq.current) app.setUserAddress(a.formatted, coords, a.id, c);
    });
  };

  const del = async (id: string) => {
    await store.remove(id);
    if (app.addressId === id) {
      pickSeq.current++; // cancel any in-flight refinement of the removed pick
      app.clearUserAddress();
    }
  };

  const saveEdit = async (id: string) => {
    await store.setLabel(id, editText.trim() || null);
    setEditId(null);
  };

  return (
    <Overlay open={app.addressOpen} onClose={close} width={460}>
      <OverlayTitle title={L('Tus direcciones', 'Your addresses')} onClose={close} />
      <p className="-mt-1 mb-3 text-[12.5px] font-semibold text-muted">
        {L('Para distancias exactas y pedir a domicilio.', 'For exact distances and delivery.')}
      </p>

      {/* add: GPS */}
      <button
        onClick={detect}
        disabled={locating}
        className="flex w-full cursor-pointer items-center gap-3 rounded-tile bg-lilac-3 p-3 text-left disabled:cursor-wait"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary">
          {locating ? (
            <span className="h-4 w-4 animate-[spin_.8s_linear_infinite] rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <LocateFixed size={17} className="text-white" stroke={2.2} />
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

      {/* add: optional label (saved users) + address search */}
      {saved && (
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={L('Etiqueta: Casa, Trabajo… (opcional)', 'Label: Home, Work… (optional)')}
          className="mt-3 w-full rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px] text-[13px] font-medium text-ink outline-none placeholder:text-muted"
        />
      )}
      <div className="mt-2 flex items-center gap-2 rounded-btn border-[1.5px] border-[#ECE9F6] bg-app px-3 py-[10px]">
        <Search size={15} className="flex-none text-primary" stroke={2.2} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L('Escribe tu dirección…', 'Type your address…')}
          className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-muted"
        />
        {searching && <span className="h-3.5 w-3.5 flex-none animate-[spin_.8s_linear_infinite] rounded-full border-2 border-primary border-t-transparent" />}
      </div>

      {/* autocomplete results */}
      {results.length > 0 && (
        <div className="mt-1 flex max-h-[210px] flex-col gap-0.5 overflow-y-auto">
          {results.map((a, i) => (
            <button
              key={`${a.formatted}-${i}`}
              onClick={() => choose(a)}
              className="flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] px-2 py-2.5 text-left hover:bg-app"
            >
              <MapPin size={15} className="mt-0.5 flex-none text-primary" stroke={2.4} />
              <span className="min-w-0 text-[13px] font-bold text-ink-soft">
                {a.formatted}
                {a.verified && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-[6px] bg-green-bg px-1.5 py-0.5 align-middle text-[9.5px] font-extrabold uppercase tracking-[.03em] text-green-dark">
                    <Check size={9} stroke={3.4} />
                    {L('Verificada', 'Verified')}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
      {q.trim().length >= 3 && !searching && results.length === 0 && (
        <div className="px-2 py-4 text-center text-[12.5px] font-semibold text-muted">{L('Sin resultados', 'No results')}</div>
      )}

      {addErr && <div className="mt-2 rounded-btn bg-pink-bg px-3 py-2 text-[11.5px] font-semibold text-pink-dark">{addErr}</div>}

      {/* saved list (logged in) */}
      {saved ? (
        <div className="mt-3 border-t border-hair pt-3">
          {store.addresses.length === 0 ? (
            <div className="px-2 py-4 text-center text-[12.5px] font-semibold text-muted">
              {L('Aún no tienes direcciones guardadas.', 'No saved addresses yet.')}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {store.addresses.map((a) => {
                const active = app.addressId === a.id;
                return (
                  <div key={a.id} className="flex items-start gap-2.5 rounded-tile px-1 py-2">
                    <button onClick={() => selectSaved(a)} className="mt-0.5 flex-none cursor-pointer" aria-label={L('Seleccionar', 'Select')}>
                      <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${active ? 'border-primary' : 'border-[#CFC8E6]'}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </span>
                    </button>
                    <button onClick={() => selectSaved(a)} className="min-w-0 flex-1 cursor-pointer text-left">
                      <span className="flex items-center gap-1.5">
                        {a.label && (
                          <span className="rounded-[6px] bg-lilac-2 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[.03em] text-primary-dark">{a.label}</span>
                        )}
                        {a.is_default && (
                          <span className="text-[10px] font-extrabold uppercase tracking-[.03em] text-green-dark">{L('Predet.', 'Default')}</span>
                        )}
                      </span>
                      {editId === a.id ? (
                        <input
                          autoFocus
                          value={editText}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit(a.id)}
                          onBlur={() => saveEdit(a.id)}
                          placeholder={L('Etiqueta', 'Label')}
                          className="mt-1 w-full rounded-[8px] border border-hair-strong bg-white px-2 py-1 text-[12.5px] font-bold outline-none"
                        />
                      ) : (
                        <span className="mt-0.5 block text-[12.5px] font-bold text-ink-body">{a.formatted}</span>
                      )}
                    </button>
                    <div className="flex flex-none items-center gap-0.5">
                      {!a.is_default && (
                        <button onClick={() => store.setDefault(a.id)} className="cursor-pointer p-1.5 text-muted hover:text-amber" aria-label={L('Predeterminada', 'Set default')}>
                          <Star size={15} stroke={2.2} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditId(a.id);
                          setEditText(a.label ?? '');
                        }}
                        className="cursor-pointer p-1.5 text-muted hover:text-primary"
                        aria-label={L('Editar etiqueta', 'Edit label')}
                      >
                        <Pencil size={14} stroke={2.2} />
                      </button>
                      <button onClick={() => del(a.id)} className="cursor-pointer p-1.5 text-muted hover:text-pink" aria-label={L('Eliminar', 'Delete')}>
                        <Trash2 size={14} stroke={2.2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <PrimaryBtn className="mt-3" onClick={close}>
            {L('Hecho', 'Done')}
          </PrimaryBtn>
          <button
            onClick={() => {
              pickSeq.current++; // cancel in-flight refinements
              app.clearUserAddress();
              close();
            }}
            className="mt-2 w-full cursor-pointer text-center text-[12px] font-extrabold text-muted"
          >
            {L(`Usar el centro de ${app.cityShort}`, `Use ${app.cityShort} center`)}
          </button>
        </div>
      ) : (
        <>
          {app.address && q.trim().length < 3 && (
            <div className="mt-3 flex items-center gap-2.5 rounded-tile bg-lilac-3 p-3">
              <Check size={16} className="flex-none text-primary" stroke={2.6} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-extrabold text-ink">{app.address}</span>
              <button
                onClick={() => {
                  pickSeq.current++; // cancel in-flight refinements
                  app.clearUserAddress();
                }}
                className="flex-none cursor-pointer text-[11.5px] font-extrabold text-primary-dark"
              >
                {L('Quitar', 'Remove')}
              </button>
            </div>
          )}
          {auth.configured && (
            <button
              onClick={() => {
                close();
                router.push('/entrar');
              }}
              className="mt-3 w-full cursor-pointer rounded-btn bg-lilac-2 py-2.5 text-[12px] font-extrabold text-primary-dark"
            >
              {L('Inicia sesión para guardar varias direcciones', 'Sign in to save multiple addresses')}
            </button>
          )}
        </>
      )}
    </Overlay>
  );
}
