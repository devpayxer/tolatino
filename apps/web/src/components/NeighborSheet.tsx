'use client';

// Perfil de un vecino. Se abre tocando su nombre o su foto en cualquier
// publicación o comentario — el gesto que la gente ya intenta por costumbre y
// que hasta hoy no hacía nada.
//
// POR QUÉ UNA HOJA Y NO UNA PÁGINA. Se mira el perfil de alguien EN MEDIO de
// leer el feed, para decidir en dos segundos si seguirle o no. Sacar al usuario
// de su sitio en el feed para eso, y obligarle a volver, es peor: al cerrar
// sigue justo donde estaba. Es el mismo patrón de hoja que ya usan el hilo de
// comentarios y la ficha de negocio.
//
// LO QUE NO ENSEÑA, A PROPÓSITO: nada que no sea ya público en sus
// publicaciones. Ni coordenadas, ni correo, ni teléfono. `profiles` sigue
// cerrado por RLS; todo esto viene de `neighbor_profile` (migración 0138).

import { useEffect, useState } from 'react';
import { IconBan as Ban, IconCalendar as Calendar, IconMapPin as MapPin } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useFollows } from '@/lib/follows';
import { supabase } from '@/lib/supabase';
import { Avatar, EmptyState, Overlay, SkeletonList } from '@/components/ui';
import { PostCard } from '@/components/PostCard';
import type { Post } from '@/data/fixtures';

type Perfil = {
  id: string; name: string; initials: string; color: string;
  avatar_url: string | null; city: string | null; bio: string | null;
  joined_at: string; posts_count: number; followers_count: number;
  i_follow: boolean; i_blocked: boolean;
};

export function NeighborSheet({
  userId, onClose, mapPost, onOpenThread,
}: {
  userId: string | null;
  onClose: () => void;
  /** El mapeo de filas a publicaciones vive en Comunidad; se reutiliza aquí. */
  mapPost: (r: Record<string, unknown>) => Post;
  onOpenThread: (postId: string) => void;
}) {
  const { L } = useLang();
  const auth = useAuth();
  const follows = useFollows();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (!userId || !supabase) { setPerfil(null); setPosts(null); return; }
    let cancelado = false;
    setLoading(true);
    setPerfil(null);
    setPosts(null);
    (async () => {
      const [pf, ps] = await Promise.all([
        supabase!.rpc('neighbor_profile', { in_id: userId }),
        supabase!.rpc('neighbor_posts', { in_id: userId, max_results: 30 }),
      ]);
      if (cancelado) return;
      setPerfil(Array.isArray(pf.data) && pf.data.length ? (pf.data[0] as Perfil) : null);
      setPosts(Array.isArray(ps.data) ? (ps.data as Record<string, unknown>[]).map(mapPost) : []);
      setLoading(false);
    })();
    return () => { cancelado = true; };
  }, [userId, mapPost]);

  const esMio = !!userId && userId === auth.user?.id;
  const siguiendo = !!userId && follows.isFollowing(userId);

  const bloquear = async () => {
    if (!userId || !auth.user || !supabase || blocking) return;
    setBlocking(true);
    await supabase.from('user_blocks').insert({ blocker_id: auth.user.id, blocked_id: userId });
    setBlocking(false);
    onClose();
    // La política de RLS ya le saca de todas las listas; recargar la página es
    // la forma más honesta de que el feed refleje eso sin estados a medias.
    if (typeof window !== 'undefined') window.location.reload();
  };

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString(L('es', 'en') === 'es' ? 'es-US' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <Overlay open={!!userId} onClose={onClose} width={520} fullHeightSheet>
      {loading && !perfil ? (
        <SkeletonList variant="post" count={3} className="flex flex-col gap-3.5" />
      ) : !perfil ? (
        <EmptyState
          title={L('No encontramos a este vecino', "We couldn't find this neighbor")}
          sub={L('Puede que su cuenta ya no esté activa.', 'Their account may no longer be active.')}
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3.5 pb-4">
            <Avatar initials={perfil.initials} color={perfil.color} src={perfil.avatar_url} size={62} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[18px] font-extrabold text-ink">{perfil.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold text-muted-2">
                {perfil.city && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} stroke={2.4} className="text-primary" />{perfil.city}</span>
                )}
                <span className="inline-flex items-center gap-1"><Calendar size={12} stroke={2.4} />{L('Aquí desde ', 'Here since ')}{fecha(perfil.joined_at)}</span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-[12px] font-bold text-ink-2">
                <span><b className="text-[13.5px] font-extrabold text-ink">{perfil.posts_count}</b> {L('publicaciones', 'posts')}</span>
                <span><b className="text-[13.5px] font-extrabold text-ink">{perfil.followers_count}</b> {L('seguidores', 'followers')}</span>
              </div>
            </div>
          </div>

          {perfil.bio && (
            <p className="mb-3.5 text-[13px] font-medium leading-[1.6] text-ink-body">{perfil.bio}</p>
          )}

          {!esMio && auth.user && (
            <div className="mb-4 flex items-center gap-2">
              <button
                onClick={() => follows.toggleFollow(perfil.id)}
                className={`flex-1 cursor-pointer rounded-btn py-2.5 text-[13px] font-extrabold ${
                  siguiendo ? 'bg-lilac-2 text-primary-dark' : 'bg-primary text-white shadow-cta-sm'
                }`}
              >
                {siguiendo ? L('Siguiendo', 'Following') : L('Seguir', 'Follow')}
              </button>
              <button
                onClick={bloquear}
                disabled={blocking}
                aria-label={L('Bloquear', 'Block')}
                className="flex h-[42px] w-[42px] flex-none cursor-pointer items-center justify-center rounded-btn bg-app text-muted disabled:opacity-60"
              >
                <Ban size={17} stroke={2.2} />
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {posts === null ? (
              <SkeletonList variant="post" count={2} className="flex flex-col gap-3.5" />
            ) : posts.length === 0 ? (
              <EmptyState title={L('Todavía no ha publicado nada', 'Nothing posted yet')} />
            ) : (
              <div className="flex flex-col gap-3.5 pb-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} onOpenThread={() => { onClose(); onOpenThread(p.id); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Overlay>
  );
}
