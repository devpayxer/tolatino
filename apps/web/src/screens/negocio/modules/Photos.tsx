'use client';

// Listado → Fotos y media. Real photo gallery for the active business. Files are
// compressed to WebP client-side and uploaded to the public 'post-photos' bucket
// (reused; owner's own folder), with metadata rows in business_photos (migration
// 0019, RLS: public read + owner writes). Set a cover, delete, and see the count.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Loader2, Star, Store, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useBizAdmin } from '@/lib/bizAdmin';
import { uploadPostImages } from '@/lib/image';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

type Photo = { id: string; url: string; sort: number; is_cover: boolean };
const MAX_PHOTOS = 24;

export function PhotosModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const router = useRouter();
  const real = admin.active;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  const load = useCallback(async () => {
    if (!real || !supabase || admin.demo) {
      // demo (or not configured): skip the network, show the empty gallery
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('business_photos')
      .select('id,url,sort,is_cover')
      .eq('business_id', real.id)
      .order('sort', { ascending: true })
      .order('created_at', { ascending: true });
    setPhotos((data as Photo[]) ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, admin.demo]);

  useEffect(() => {
    load();
  }, [load]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length || !real || !user || !supabase) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return flash(L(`Máximo ${MAX_PHOTOS} fotos`, `Max ${MAX_PHOTOS} photos`));
    setUploading(true);
    try {
      const urls = await uploadPostImages(files.slice(0, room), user.id);
      const base = photos.length;
      const rows = urls.map((url, i) => ({ business_id: real.id, url, sort: base + i, is_cover: base === 0 && i === 0 }));
      const { error } = await supabase.from('business_photos').insert(rows);
      if (error) throw error;
      await load();
      flash(L('Fotos subidas', 'Photos uploaded'));
    } catch {
      flash(L('No se pudieron subir las fotos.', "Couldn't upload the photos."));
    }
    setUploading(false);
  };

  const setCover = async (id: string) => {
    if (!real || !supabase || busyId) return;
    setBusyId(id);
    // optimistic
    setPhotos((ps) => ps.map((p) => ({ ...p, is_cover: p.id === id })));
    await supabase.from('business_photos').update({ is_cover: false }).eq('business_id', real.id);
    await supabase.from('business_photos').update({ is_cover: true }).eq('id', id);
    setBusyId(null);
    flash(L('Portada actualizada', 'Cover updated'));
  };

  const remove = async (id: string) => {
    if (!supabase || busyId) return;
    setBusyId(id);
    setPhotos((ps) => ps.filter((p) => p.id !== id));
    await supabase.from('business_photos').delete().eq('id', id);
    setBusyId(null);
    flash(L('Foto eliminada', 'Photo removed'));
  };

  if (admin.loading || loading) {
    return (
      <div className="flex items-center justify-center rounded-card border border-hair bg-white py-16 text-muted shadow-card">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!real) {
    return (
      <div className="mx-auto max-w-[440px] rounded-card border border-hair bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lilac">
          <Store size={24} className="text-primary" strokeWidth={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para subir fotos de tu local, productos y equipo.', 'Publish your business to upload photos of your place, products and team.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={fileInput} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[12.5px] font-bold text-muted">
          {photos.length}/{MAX_PHOTOS} {L('fotos', 'photos')} · {L('se optimizan en tu teléfono antes de subir', 'optimized on your phone before upload')}
        </div>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="flex flex-none cursor-pointer items-center gap-2 rounded-btn bg-primary px-4 py-2 text-[12.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} strokeWidth={2.4} />}
          {uploading ? L('Subiendo…', 'Uploading…') : L('Subir fotos', 'Upload photos')}
        </button>
      </div>

      {photos.length === 0 ? (
        <button
          onClick={() => fileInput.current?.click()}
          className="flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-lilac-line bg-white text-muted"
        >
          <ImagePlus size={26} strokeWidth={2} className="text-primary-dark" />
          <span className="text-[13px] font-extrabold text-ink">{L('Sube tus primeras fotos', 'Upload your first photos')}</span>
          <span className="text-[11.5px] font-semibold">{L('La primera será tu portada', 'The first one becomes your cover')}</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square overflow-hidden rounded-tile border border-hair bg-app">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {p.is_cover && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-ink/85 px-2 py-0.5 text-[9.5px] font-extrabold text-white">
                  <Star size={10} strokeWidth={2.6} className="text-amber" />
                  {L('Portada', 'Cover')}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-ink/70 to-transparent p-1.5">
                {!p.is_cover && (
                  <button
                    onClick={() => setCover(p.id)}
                    disabled={!!busyId}
                    className="flex-1 cursor-pointer rounded-btn bg-white/90 py-1.5 text-[10.5px] font-extrabold text-ink"
                  >
                    {L('Portada', 'Cover')}
                  </button>
                )}
                <button
                  onClick={() => remove(p.id)}
                  disabled={!!busyId}
                  aria-label={L('Eliminar', 'Delete')}
                  className="flex h-7 flex-none cursor-pointer items-center justify-center rounded-btn bg-white/90 px-2 text-pink-dark"
                >
                  <Trash2 size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast msg={toast} />
    </>
  );
}
