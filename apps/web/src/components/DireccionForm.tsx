'use client';

// El formulario de dirección de un negocio: calle, suite, ciudad, estado y ZIP —
// con autocompletado sobre NUESTRA geo-dirección, y con la coordenada real.
//
// ════════════════════════════════════════════════════════════════════════════
// DE DÓNDE SALE (fundador, 2026-08-05)
// ════════════════════════════════════════════════════════════════════════════
// «La dirección debe usar nuestra geo-dirección para que ayude a la
// automatización, y debe ser un formulario completo profesional: dirección,
// ciudad, estado, zipcode, etc.»
//
// Lo que había era UNA caja de texto libre, y el fallo de fondo no se veía: la
// coordenada que se guardaba NO era la de la dirección escrita, sino la de la
// ciudad que el dueño tuviera elegida en el selector de la app. El pin de cada
// negocio caía en el centro de su ciudad. Todo lo que mide distancia —«cerca de
// mí», el radio de entrega, ordenar por cercanía— trabajaba sobre eso.
//
// ════════════════════════════════════════════════════════════════════════════
// CÓMO FUNCIONA, Y POR QUÉ ASÍ
// ════════════════════════════════════════════════════════════════════════════
// Se escribe en UNA caja (como en Google o DoorDash: nadie rellena cinco campos
// a mano en un teléfono) y al elegir una sugerencia se reparten las piezas en
// sus campos. **Los campos quedan editables**: el geocodificador acierta casi
// siempre, pero «casi» no es «siempre», y un negocio en un local nuevo puede no
// existir todavía en ningún mapa. Nunca se bloquea a alguien por no estar en
// OpenStreetMap.
//
// La sugerencia trae la COORDENADA. Escribir a mano, no: por eso, si el texto se
// toca después de elegir, la coordenada se marca como perdida y se vuelve a
// geocodificar al salir del campo. Es preferible tardar medio segundo a guardar
// un punto que no corresponde — que es exactamente el fallo que veníamos a
// arreglar.
//
// Sin conexión con el geocodificador se puede seguir a mano: se guarda la
// dirección con la coordenada de la ciudad y se avisa de que el mapa será
// aproximado. Honesto y desbloqueado, en vez de un formulario que no deja pasar.

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { searchAddress, censusGeocode, type Address } from '@/lib/geo';

/** Lo que el formulario produce. `lat`/`lng` a null = no se pudo geocodificar. */
export type DireccionNegocio = {
  line1: string;
  line2: string;
  city: string;      // «Hazleton, PA» — el formato que usa el resto de la app
  state: string;
  postal: string;
  lat: number | null;
  lng: number | null;
};

export const DIRECCION_VACIA: DireccionNegocio = {
  line1: '', line2: '', city: '', state: '', postal: '', lat: null, lng: null,
};

/** ¿Está lo mínimo para poder guardar? Calle y ciudad; el resto ayuda. */
export function direccionCompleta(d: DireccionNegocio): boolean {
  return d.line1.trim().length > 2 && d.city.trim().length > 1;
}

const ESTADOS = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export function DireccionForm({
  valor, onChange, cerca, inputCls, disabled,
}: {
  valor: DireccionNegocio;
  onChange: (d: DireccionNegocio) => void;
  /** Ciudad actual de la app: sesga las sugerencias al área correcta. */
  cerca?: { lat: number; lng: number; city?: string } | null;
  inputCls: string;
  disabled?: boolean;
}) {
  const { L } = useLang();
  const [sugerencias, setSugerencias] = useState<Address[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const aborto = useRef<AbortController | null>(null);
  const acabaDeElegir = useRef(false);
  const enFoco = useRef(false);

  const set = (parche: Partial<DireccionNegocio>) => onChange({ ...valor, ...parche });

  // Autocompletado con freno: se espera a que deje de escribir. Sin esto se
  // dispararía una petición por tecla contra un servicio gratuito ajeno.
  //
  // DOS REGLAS QUE NO SON ADORNO (fundador, 2026-08-05: «el popup vuelve y se
  // abre» después de elegir):
  //  1. Las dependencias son PRIMITIVAS (lat/lng/city sueltos), nunca el objeto
  //     `cerca`: el padre lo recreaba en cada render, así que CUALQUIER estado
  //     que cambiara en la pantalla —escribir el teléfono, un toast— relanzaba
  //     esta búsqueda y reabría la lista sobre una dirección ya elegida.
  //  2. La lista solo se abre si el campo TIENE EL FOCO: una respuesta que
  //     llega tarde, cuando ya se está en otro campo, no tiene derecho a
  //     plantarse encima.
  useEffect(() => {
    const q = valor.line1.trim();
    if (acabaDeElegir.current) { acabaDeElegir.current = false; return; }
    if (q.length < 4) { setSugerencias([]); setAbierto(false); return; }
    const t = setTimeout(() => {
      aborto.current?.abort();
      const ac = new AbortController();
      aborto.current = ac;
      setBuscando(true);
      searchAddress(q, cerca ?? null, ac.signal)
        .then((r) => { if (!ac.signal.aborted) { setSugerencias(r); setAbierto(r.length > 0 && enFoco.current); } })
        .catch(() => { /* sin red: se sigue a mano */ })
        .finally(() => { if (!ac.signal.aborted) setBuscando(false); });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cerca` va desarmado en primitivas: ver la regla 1 de arriba
  }, [valor.line1, cerca?.lat, cerca?.lng, cerca?.city]);

  const elegir = (a: Address) => {
    acabaDeElegir.current = true;
    setSugerencias([]);
    setAbierto(false);
    onChange({
      ...valor,
      line1: a.line1 || a.formatted,
      city: a.city || valor.city,
      state: a.state || valor.state,
      postal: a.postal || valor.postal,
      lat: a.lat,
      lng: a.lng,
    });
  };

  // Si se escribió a mano y quedó sin coordenada, se intenta resolver al salir
  // del campo. El censo de EE. UU. es la fuente precisa y no cuesta nada.
  const alSalir = () => {
    if (valor.lat != null || !direccionCompleta(valor) || disabled) return;
    const linea = [valor.line1, valor.city, valor.postal].filter(Boolean).join(', ');
    setGeocodificando(true);
    censusGeocode(linea)
      .then((a) => {
        if (!a) return;
        onChange({
          ...valor,
          lat: a.lat, lng: a.lng,
          city: valor.city || a.city,
          state: valor.state || a.state || '',
          postal: valor.postal || a.postal || '',
        });
      })
      .catch(() => { /* se guarda sin punto exacto; abajo se avisa */ })
      .finally(() => setGeocodificando(false));
  };

  const etiqueta = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-2';

  return (
    <div className="flex flex-col gap-3">
      {/* Calle y número — con autocompletado */}
      <div className="relative">
        <label className={etiqueta} htmlFor="dir-line1">{L('Dirección', 'Street address')}</label>
        <input
          id="dir-line1"
          value={valor.line1}
          disabled={disabled}
          autoComplete="street-address"
          onChange={(e) => set({ line1: e.target.value, lat: null, lng: null })}
          onFocus={() => { enFoco.current = true; setAbierto(sugerencias.length > 0); }}
          onBlur={() => { enFoco.current = false; setTimeout(() => setAbierto(false), 150); alSalir(); }}
          placeholder={L('Ej. 762 McNair St', 'e.g. 762 McNair St')}
          className={inputCls}
        />
        {buscando && (
          <span className="absolute right-3 top-[30px] text-[11px] font-semibold text-muted-2">
            {L('Buscando…', 'Searching…')}
          </span>
        )}
        {abierto && sugerencias.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-[13px] border border-line bg-white shadow-pop">
            {sugerencias.map((a) => (
              <li key={`${a.formatted}-${a.lat}`}>
                <button
                  type="button"
                  // `onMouseDown` y no `onClick`: el `blur` del campo se dispara
                  // antes y cerraría la lista sin que el clic llegue nunca.
                  onMouseDown={(e) => { e.preventDefault(); elegir(a); }}
                  className="tap flex w-full items-start gap-2 px-3.5 py-2.5 text-left hover:bg-lilac-3"
                >
                  <span className="mt-[3px] h-2 w-2 flex-none rounded-full" style={{ background: a.verified ? '#2E9E5B' : '#B9B2D6' }} />
                  <span className="text-[13px] font-semibold leading-snug text-ink">{a.formatted}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Suite / local */}
      <div>
        <label className={etiqueta} htmlFor="dir-line2">
          {L('Suite, local o piso', 'Suite, unit or floor')}{' '}
          <span className="font-semibold normal-case tracking-normal text-muted-2">({L('opcional', 'optional')})</span>
        </label>
        <input
          id="dir-line2" value={valor.line2} disabled={disabled}
          autoComplete="address-line2"
          onChange={(e) => set({ line2: e.target.value })}
          placeholder={L('Ej. Local 3', 'e.g. Unit 3')}
          className={inputCls}
        />
      </div>

      {/* Ciudad */}
      <div>
        <label className={etiqueta} htmlFor="dir-city">{L('Ciudad', 'City')}</label>
        <input
          id="dir-city" value={valor.city} disabled={disabled}
          autoComplete="address-level2"
          onChange={(e) => set({ city: e.target.value })}
          placeholder={L('Ej. Hazleton, PA', 'e.g. Hazleton, PA')}
          className={inputCls}
        />
      </div>

      {/* Estado y ZIP, en una fila: los dos son cortos y así se llenan de un
          vistazo en el teléfono en vez de ocupar dos pantallazos. */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={etiqueta} htmlFor="dir-state">{L('Estado', 'State')}</label>
          <select
            id="dir-state" value={valor.state} disabled={disabled}
            autoComplete="address-level1"
            onChange={(e) => set({ state: e.target.value })}
            className={inputCls}
          >
            <option value="">{L('Elige…', 'Select…')}</option>
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={etiqueta} htmlFor="dir-zip">{L('Código postal', 'ZIP code')}</label>
          <input
            id="dir-zip" value={valor.postal} disabled={disabled}
            autoComplete="postal-code" inputMode="numeric" maxLength={10}
            onChange={(e) => set({ postal: e.target.value.replace(/[^\d-]/g, '') })}
            placeholder="18201"
            className={inputCls}
          />
        </div>
      </div>

      {/* Estado del punto. Se dice siempre, en cristiano: de esto depende que a
          este negocio lo encuentren por cercanía. */}
      {geocodificando ? (
        <p className="text-[11.5px] font-semibold text-muted-2">{L('Ubicando la dirección…', 'Locating the address…')}</p>
      ) : valor.lat != null ? (
        <p className="text-[11.5px] font-semibold text-green-ink">
          ✓ {L('Ubicación confirmada — tu negocio aparecerá en las búsquedas cercanas.',
                'Location confirmed — your business will show up in nearby searches.')}
        </p>
      ) : direccionCompleta(valor) ? (
        <p className="text-[11.5px] font-semibold text-muted-2">
          {L('No pudimos ubicar esa dirección en el mapa. Puedes seguir: usaremos el centro de tu ciudad y podrás corregirla después.',
              "We couldn't locate that address on the map. You can continue: we'll use your city center and you can fix it later.")}
        </p>
      ) : null}
    </div>
  );
}
