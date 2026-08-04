'use client';

// Global client state (Handoff v2 → "State Management"): city, session-lite
// toggles (saved/going/followed/recommended), committed search, notifications,
// publish flow, and posts the user creates. In production the toggles persist
// per-user in Supabase; the shapes stay the same.

import { useCallback, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY, type Post, type PostType } from '@/data/fixtures';
import { DEFAULT_COORDS, getBrowserLocation, isCoordLabel, nearestCity } from '@/lib/geo';
import { guardarReciente } from '@/lib/recientes';

type Toggles = Record<string, boolean>;

export type Coords = { lat: number; lng: number };

export type PubType = 'post' | 'negocio' | 'evento';

// Which community feed the user is viewing (profile nav).
export type FeedView = 'home' | 'saved' | 'following';

type AppCtx = {
  // geo — the selected city label + its real coordinates (drive the geo query)
  city: string;
  cityShort: string;
  coords: Coords;
  setCity: (c: string) => void;
  setCityWithCoords: (label: string, coords: Coords) => void;
  /** ¿Está el buscador activo? El desplegable (recientes o sugerencias) solo se
   *  pinta cuando lo está. Vive aquí, y no dentro del buscador, porque la caja y
   *  el desplegable son hermanos y se pintan en DOS sitios (la fila de móvil y
   *  la barra de escritorio). */
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  cityOpen: boolean;
  setCityOpen: (v: boolean) => void;

  // optional precise address (real distances + delivery destination)
  address: string | null;
  addressId: string | null;
  // Setting an address can also switch the whole app to that address's city.
  setUserAddress: (formatted: string, coords: Coords, id?: string | null, city?: { label: string; lat: number; lng: number }) => void;
  clearUserAddress: () => void;
  addressOpen: boolean;
  setAddressOpen: (v: boolean) => void;
  // Address modal mode. 'global' = the usual "where I am on the platform" picker
  // (moves the app's city/origin). 'delivery' = the cart opens it JUST to attach
  // a delivery address to one order — it must NOT change the platform location.
  addressMode: 'global' | 'delivery';
  openDeliveryAddress: () => void;
  deliveryAddrId: string | null;
  setDeliveryAddr: (id: string | null) => void;

  // global search: `query` = live typing, `search` = committed
  query: string;
  setQuery: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;

  // toggles
  savedPosts: Toggles;
  toggleSavedPost: (id: string) => void;
  recd: Toggles;
  toggleRecd: (id: string) => void;
  going: Toggles;
  toggleGoing: (id: number) => void;
  followed: Toggles;
  toggleFollowed: (id: number) => void;
  pollVotes: Record<string, number>;
  votePoll: (postId: string, option: number) => void;
  waitDone: Toggles;
  markWaitDone: (view: string) => void;

  // notifications
  notifOpen: boolean;
  setNotifOpen: (v: boolean) => void;
  notifRead: Toggles;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;
  unreadCount: number;

  // community feed view (profile nav: Inicio / Guardados / Siguiendo)
  feedView: FeedView;
  setFeedView: (v: FeedView) => void;

  // user menu
  userOpen: boolean;
  setUserOpen: (v: boolean) => void;

  // publish flow
  pubOpen: boolean;
  pubType: PubType | null;
  /** Tipo de publicación preseleccionado ('ask' | 'rec' | …) cuando se abre el
   *  compositor desde un chip que ya dice cuál es. */
  pubSeed: PostType | null;
  openPub: (type?: PubType, seed?: PostType) => void;
  closePub: () => void;
  setPubType: (t: PubType | null) => void;
  newPosts: Post[];
  addPost: (p: Omit<Post, 'id'>) => void;

  // user comments/replies on community posts
  userComments: Record<string, Post[]>;

  // the founder's own business (set by onboarding) — session-lite for now
  biz: BizProfile | null;
  setBiz: (b: BizProfile | null) => void;
};

export type BizProfile = { name: string; plan: 'free' | 'pro'; cat: string; catLabel: [string, string] };

const Ctx = createContext<AppCtx | null>(null);

const toggle = (set: React.Dispatch<React.SetStateAction<Toggles>>, key: string | number) =>
  set((m) => ({ ...m, [key]: !m[key] }));

const CITY_KEY = 'tl.city';

export function AppProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [cityCoords, setCityCoords] = useState<Coords>(DEFAULT_COORDS);
  // Optional precise street address. When set, its coords become the geo origin
  // (real distances + delivery destination); otherwise we use the city center.
  const [address, setAddress] = useState<string | null>(null);
  const [addressCoords, setAddressCoords] = useState<Coords | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null); // saved-address id when the origin is a saved one
  const [searchOpen, setSearchOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressMode, setAddressMode] = useState<'global' | 'delivery'>('global');
  const [deliveryAddrId, setDeliveryAddrId] = useState<string | null>(null);

  const coords = addressCoords ?? cityCoords;

  // `auto` distingue la ciudad DETECTADA de la ELEGIDA. Es lo que permite
  // refrescar la primera cuando el usuario viaja, sin pisar nunca la segunda.
  const persistGeo = (label: string, cc: Coords, addr: string | null, ac: Coords | null, aid: string | null, auto = false) => {
    try {
      localStorage.setItem(CITY_KEY, JSON.stringify({ label, lat: cc.lat, lng: cc.lng, address: addr, alat: ac?.lat ?? null, alng: ac?.lng ?? null, addressId: aid, auto }));
    } catch {
      /* storage blocked (private mode) — keep working in-memory */
    }
  };

  // Rehidratar la ciudad guardada y, si no hay ninguna ELEGIDA, detectarla.
  //
  // Por qué importa: la portada es para gente que llega por primera vez y sin
  // cuenta. Enseñarle "Houston" a alguien de Los Ángeles no es un detalle
  // estético — es enseñarle negocios, eventos y publicaciones de otra ciudad,
  // o sea la app entera equivocada desde el primer segundo.
  //
  // Reglas, en este orden:
  //  1. Si el usuario ELIGIÓ ciudad (o entró con su cuenta), no se toca jamás.
  //  2. Si la ciudad guardada la detectamos nosotros y el permiso YA está
  //     concedido, se vuelve a detectar en silencio — sin preguntar nada — para
  //     que quien viaje vea su ciudad de verdad.
  //  3. Si no hay nada guardado, se pide la ubicación. Es lo que hacen Yelp y
  //     DoorDash al entrar por primera vez.
  //  4. Si el permiso ya estaba DENEGADO, ni se intenta: llamar solo produce un
  //     error y gasta una oportunidad. Se queda la ciudad por defecto y el
  //     usuario la cambia a mano cuando quiera.
  // Se corre una sola vez, en el cliente (el primer pintado usa el valor por
  // defecto y luego se sustituye, para no romper la hidratación).
  useEffect(() => {
    let cancelled = false;

    type Saved = { label?: string; lat?: number; lng?: number; address?: string | null; alat?: number | null; alng?: number | null; addressId?: string | null; auto?: boolean };
    let saved: Saved | null = null;
    try {
      const raw = localStorage.getItem(CITY_KEY);
      if (raw) saved = JSON.parse(raw) as Saved;
    } catch {
      /* ignore malformed/blocked storage */
    }

    const guardada = !!(saved && saved.label && typeof saved.lat === 'number' && typeof saved.lng === 'number');
    if (guardada && saved) {
      setCity(saved.label!);
      setCityCoords({ lat: saved.lat!, lng: saved.lng! });
      if (saved.address && typeof saved.alat === 'number' && typeof saved.alng === 'number') {
        setAddress(saved.address);
        setAddressCoords({ lat: saved.alat, lng: saved.alng });
        setAddressId(saved.addressId ?? null);
      }
    }

    // Regla 1: una ciudad elegida a mano manda siempre.
    if (guardada && saved?.auto !== true) return;
    // Una dirección exacta guardada ya define el origen: no la pisamos.
    if (guardada && saved?.address) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    (async () => {
      let permiso: PermissionState | null = null;
      try {
        permiso = (await navigator.permissions?.query({ name: 'geolocation' as PermissionName }))?.state ?? null;
      } catch {
        /* Safari viejo no tiene Permissions API — se sigue sin él */
      }
      if (cancelled) return;
      if (permiso === 'denied') return;                       // regla 4
      if (guardada && permiso !== 'granted') return;          // regla 2: sin permiso, se respeta lo detectado la vez anterior

      try {
        const { lat, lng } = await getBrowserLocation();
        if (cancelled) return;
        const place = await nearestCity(lat, lng);
        if (cancelled || !place?.label) return;
        // Si fallan los dos geocodificadores, `nearestCity` devuelve las
        // coordenadas como etiqueta. Sirven para calcular, pero "To'lo Latino de
        // 25.762, -80.192" parece la app rota: mejor dejar la ciudad por defecto.
        if (isCoordLabel(place.label)) return;
        setCity(place.label);
        setCityCoords({ lat: place.lat, lng: place.lng });
        persistGeo(place.label, { lat: place.lat, lng: place.lng }, null, null, null, true);
      } catch {
        /* denegado, sin señal o sin cobertura: se queda la ciudad por defecto */
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [query, setQuery] = useState('');
  const [search, setSearchRaw] = useState('');
  // El historial se guarda AQUÍ, donde una búsqueda se CONFIRMA — no en cada
  // botón que la confirma. `setSearch` se llama desde siete sitios (el buscador
  // de la cabecera, el de la portada, los resultados, los chips…) y solo dos
  // guardaban: escribir y dar a buscar, que es el camino normal, no se guardaba.
  // Lo reportó el fundador el 2026-08-04: «solo guardó cuando lo puse mal»,
  // porque en el estado sin-resultados lo único pulsable era un botón que sí
  // pasaba por ahí. Poniéndolo en el punto único de confirmación, ningún camino
  // nuevo puede volver a olvidarse. (§9: arreglar en la primitiva compartida.)
  const setSearch = useCallback((v: string) => {
    setSearchRaw(v);
    guardarReciente(v);   // ignora lo vacío y lo de menos de 2 letras
    // Confirmar una búsqueda CIERRA el buscador. Sin esto el desplegable se
    // quedaba abierto encima de los resultados que acabas de pedir — lo
    // reportó el fundador el 2026-08-04, y era mío: al añadir las recientes,
    // «sin texto» dejó de significar «no mostrar nada» y pasó a significar
    // «mostrar recientes», así que después de buscar reaparecía.
    setSearchOpen(false);
  }, []);
  const [savedPosts, setSavedPosts] = useState<Toggles>({});
  const [recd, setRecd] = useState<Toggles>({});
  const [going, setGoing] = useState<Toggles>({});
  const [followed, setFollowed] = useState<Toggles>({});
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [waitDone, setWaitDone] = useState<Toggles>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState<Toggles>({});
  const [feedView, setFeedView] = useState<FeedView>('home');
  const [userOpen, setUserOpen] = useState(false);
  const [pubOpen, setPubOpen] = useState(false);
  const [pubType, setPubType] = useState<PubType | null>(null);
  const [pubSeed, setPubSeed] = useState<PostType | null>(null);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [postSeq, setPostSeq] = useState(0);
  const [biz, setBiz] = useState<BizProfile | null>(null);

  // Contador de no leídas: SIEMPRE desde lib/notifications (filas reales). El
  // cálculo anterior salía de las NOTIFS de fixtures → insignia falsa. Se deja a 0
  // aquí para no reintroducirla; los consumidores usan useNotifications().
  const unreadCount = 0;

  const value = useMemo<AppCtx>(
    () => ({
      city,
      cityShort: city.split(',')[0],
      coords,
      setCity,
      setCityWithCoords: (label: string, c: Coords) => {
        // new city → drop any precise address (it belonged to the old city)
        setCity(label);
        setCityCoords(c);
        setAddress(null);
        setAddressCoords(null);
        setAddressId(null);
        persistGeo(label, c, null, null, null);
      },
      searchOpen,
      setSearchOpen,
      cityOpen,
      setCityOpen,
      address,
      addressId,
      setUserAddress: (formatted: string, c: Coords, id: string | null = null, cityCtx?: { label: string; lat: number; lng: number }) => {
        // an address in another city switches the whole app to that city
        const label = cityCtx?.label ?? city;
        const cc: Coords = cityCtx ? { lat: cityCtx.lat, lng: cityCtx.lng } : cityCoords;
        if (cityCtx) {
          setCity(label);
          setCityCoords(cc);
        }
        setAddress(formatted);
        setAddressCoords(c);
        setAddressId(id);
        persistGeo(label, cc, formatted, c, id);
      },
      clearUserAddress: () => {
        setAddress(null);
        setAddressCoords(null);
        setAddressId(null);
        persistGeo(city, cityCoords, null, null, null);
      },
      addressOpen,
      // closing the modal always drops back to the default global mode
      setAddressOpen: (v: boolean) => {
        setAddressOpen(v);
        if (!v) setAddressMode('global');
      },
      addressMode,
      openDeliveryAddress: () => {
        setAddressMode('delivery');
        setAddressOpen(true);
      },
      deliveryAddrId,
      setDeliveryAddr: (id: string | null) => setDeliveryAddrId(id),
      query,
      setQuery,
      search,
      setSearch,
      savedPosts,
      toggleSavedPost: (id) => toggle(setSavedPosts, id),
      recd,
      toggleRecd: (id) => toggle(setRecd, id),
      going,
      toggleGoing: (id) => toggle(setGoing, id),
      followed,
      toggleFollowed: (id) => toggle(setFollowed, id),
      pollVotes,
      votePoll: (postId, option) =>
        setPollVotes((m) => (m[postId] === undefined ? { ...m, [postId]: option } : m)),
      waitDone,
      markWaitDone: (view) => setWaitDone((m) => ({ ...m, [view]: true })),
      notifOpen,
      setNotifOpen,
      notifRead,
      markNotifRead: (id) => setNotifRead((m) => ({ ...m, [id]: true })),
      markAllNotifsRead: () =>
        setNotifRead({}), // las notificaciones reales se marcan en lib/notifications (markAllRead)
      unreadCount,
      feedView,
      setFeedView,
      userOpen,
      setUserOpen,
      pubOpen,
      pubType,
      pubSeed,
      openPub: (type, seed) => {
        setPubType(type ?? null);
        setPubSeed(seed ?? null);
        setPubOpen(true);
      },
      closePub: () => {
        setPubOpen(false);
        setPubType(null);
        setPubSeed(null);
      },
      setPubType,
      newPosts,
      addPost: (p) => {
        setNewPosts((list) => [{ ...p, id: `new${postSeq}` }, ...list]);
        setPostSeq((n) => n + 1);
      },
      userComments: {},
      biz,
      setBiz,
    }),
    [city, cityCoords, coords, address, addressCoords, addressId, searchOpen, cityOpen, addressOpen, addressMode, deliveryAddrId, query, search, savedPosts, recd, going, followed, pollVotes, waitDone, notifOpen, notifRead, unreadCount, feedView, userOpen, pubOpen, pubType, pubSeed, newPosts, postSeq, biz],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { PostType };
