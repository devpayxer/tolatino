'use client';

// Global client state (Handoff v2 → "State Management"): city, session-lite
// toggles (saved/going/followed/recommended), committed search, notifications,
// publish flow, and posts the user creates. In production the toggles persist
// per-user in Supabase; the shapes stay the same.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY, NOTIFS, type Post, type PostType } from '@/data/fixtures';
import { DEFAULT_COORDS } from '@/lib/geo';

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
  openPub: (type?: PubType) => void;
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
  const [cityOpen, setCityOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

  const coords = addressCoords ?? cityCoords;

  const persistGeo = (label: string, cc: Coords, addr: string | null, ac: Coords | null, aid: string | null) => {
    try {
      localStorage.setItem(CITY_KEY, JSON.stringify({ label, lat: cc.lat, lng: cc.lng, address: addr, alat: ac?.lat ?? null, alng: ac?.lng ?? null, addressId: aid }));
    } catch {
      /* storage blocked (private mode) — keep working in-memory */
    }
  };

  // Rehydrate the chosen city + address once on mount (client-only, avoids
  // SSR/hydration mismatch: first paint is the default, then we swap in saved).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CITY_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { label?: string; lat?: number; lng?: number; address?: string | null; alat?: number | null; alng?: number | null; addressId?: string | null };
      if (saved.label && typeof saved.lat === 'number' && typeof saved.lng === 'number') {
        setCity(saved.label);
        setCityCoords({ lat: saved.lat, lng: saved.lng });
        if (saved.address && typeof saved.alat === 'number' && typeof saved.alng === 'number') {
          setAddress(saved.address);
          setAddressCoords({ lat: saved.alat, lng: saved.alng });
          setAddressId(saved.addressId ?? null);
        }
      }
    } catch {
      /* ignore malformed/blocked storage */
    }
  }, []);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
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
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [postSeq, setPostSeq] = useState(0);
  const [biz, setBiz] = useState<BizProfile | null>(null);

  const unreadCount = NOTIFS.filter((n) => n.unread && !notifRead[n.id]).length;

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
      setAddressOpen,
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
        setNotifRead(Object.fromEntries(NOTIFS.map((n) => [n.id, true]))),
      unreadCount,
      feedView,
      setFeedView,
      userOpen,
      setUserOpen,
      pubOpen,
      pubType,
      openPub: (type) => {
        setPubType(type ?? null);
        setPubOpen(true);
      },
      closePub: () => {
        setPubOpen(false);
        setPubType(null);
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
    [city, cityCoords, coords, address, addressCoords, addressId, cityOpen, addressOpen, query, search, savedPosts, recd, going, followed, pollVotes, waitDone, notifOpen, notifRead, unreadCount, feedView, userOpen, pubOpen, pubType, newPosts, postSeq, biz],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { PostType };
