'use client';

// Follow graph + the current user's profile stats (following / followers /
// posts). Following/unfollowing persists to the `follows` table; guests are
// routed to sign in. Counts refresh when the signed-in user changes.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Ctx = {
  following: Set<string>;
  followingCount: number;
  followersCount: number;
  postsCount: number;
  configured: boolean;
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
  refresh: () => void;
};

const C = createContext<Ctx | null>(null);

export function FollowsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followersCount, setFollowersCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!supabase || !user) {
      setFollowing(new Set());
      setFollowersCount(0);
      setPostsCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const [fg, fr, ps] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      ]);
      if (cancelled) return;
      if (!fg.error && fg.data) setFollowing(new Set((fg.data as { following_id: string }[]).map((r) => r.following_id)));
      setFollowersCount(fr.count ?? 0);
      setPostsCount(ps.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, version]);

  const isFollowing = useCallback((id: string) => following.has(id), [following]);

  const toggleFollow = useCallback(
    (id: string) => {
      if (!supabase) return;
      if (!user) {
        router.push('/entrar');
        return;
      }
      if (id === user.id) return; // can't follow yourself
      const next = !following.has(id);
      setFollowing((prev) => {
        const n = new Set(prev);
        if (next) n.add(id);
        else n.delete(id);
        return n;
      });
      if (next) supabase.from('follows').insert({ follower_id: user.id, following_id: id }).then(() => {});
      else supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id).then(() => {});
    },
    [user, following, router],
  );

  return (
    <C.Provider
      value={{
        following,
        followingCount: following.size,
        followersCount,
        postsCount,
        configured: !!supabase,
        isFollowing,
        toggleFollow,
        refresh: () => setVersion((v) => v + 1),
      }}
    >
      {children}
    </C.Provider>
  );
}

export function useFollows(): Ctx {
  const ctx = useContext(C);
  if (!ctx) throw new Error('useFollows must be used inside <FollowsProvider>');
  return ctx;
}
