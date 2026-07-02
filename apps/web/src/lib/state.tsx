'use client';

// Global client state (Handoff v2 → "State Management"): city, session-lite
// toggles (saved/going/followed/recommended), committed search, notifications,
// publish flow, and posts the user creates. In production the toggles persist
// per-user in Supabase; the shapes stay the same.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CITY, NOTIFS, type Post, type PostType } from '@/data/fixtures';

type Toggles = Record<string, boolean>;

export type PubType = 'post' | 'negocio' | 'evento';

type AppCtx = {
  // geo
  city: string;
  cityShort: string;
  setCity: (c: string) => void;
  cityOpen: boolean;
  setCityOpen: (v: boolean) => void;

  // global search: `query` = live typing, `search` = committed
  query: string;
  setQuery: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;

  // toggles
  saved: Toggles;
  toggleSaved: (id: number) => void;
  savedCount: number;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [cityOpen, setCityOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<Toggles>({});
  const [savedPosts, setSavedPosts] = useState<Toggles>({});
  const [recd, setRecd] = useState<Toggles>({});
  const [going, setGoing] = useState<Toggles>({});
  const [followed, setFollowed] = useState<Toggles>({});
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [waitDone, setWaitDone] = useState<Toggles>({});
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState<Toggles>({});
  const [userOpen, setUserOpen] = useState(false);
  const [pubOpen, setPubOpen] = useState(false);
  const [pubType, setPubType] = useState<PubType | null>(null);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [postSeq, setPostSeq] = useState(0);
  const [biz, setBiz] = useState<BizProfile | null>(null);

  const unreadCount = NOTIFS.filter((n) => n.unread && !notifRead[n.id]).length;
  const savedCount = Object.values(saved).filter(Boolean).length;

  const value = useMemo<AppCtx>(
    () => ({
      city,
      cityShort: city.split(',')[0],
      setCity,
      cityOpen,
      setCityOpen,
      query,
      setQuery,
      search,
      setSearch,
      saved,
      toggleSaved: (id) => toggle(setSaved, id),
      savedCount,
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
    [city, cityOpen, query, search, saved, savedCount, savedPosts, recd, going, followed, pollVotes, waitDone, notifOpen, notifRead, unreadCount, userOpen, pubOpen, pubType, newPosts, postSeq, biz],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export type { PostType };
