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
import { uploadPostImages, uploadImage, LOGO_MAX_EDGE } from '@/lib/image';
import type { PanelCtx } from '@/screens/negocio/tabs';
import { Toast } from '@/screens/negocio/modules/_page';

type Photo = { id: string; url: string; sort: number; is_cover: boolean };
// Gallery size by plan: Free = 1 photo, Pro (verified/premium) = 20.
const FREE_PHOTOS = 1;
const PRO_PHOTOS = 20;

export function PhotosModule({ ctx }: { ctx: PanelCtx }) {
  const { L, isFree, go } = ctx;
  const maxPhotos = isFree ? FREE_PHOTOS : PRO_PHOTOS;
  const admin = useBizAdmin();
  const { user } = useAuth();
  const router = useRouter();
  const real = admin.active;

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 1900);
  };

  // Logo: same compression protocol as every image (WebP client-side, small
  // edge — a logo never needs more than 512px), stored on businesses.logo_url.
  // Demo mode keeps it local (object URL) so the flow stays explorable.
  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files ?? [])[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/') || !real || logoBusy) return;
    setLogoBusy(true);
    try {
      const url = admin.demo || !user || !supabase
        ? URL.createObjectURL(file)
        : await uploadImage(file, user.id, LOGO_MAX_EDGE);
      const { error } = await admin.update({ logo_url: url });
      if (error) throw new Error(error);
      flash(L('Logo actualizado', 'Logo updated'));
    } catch {
      flash(L('No se pudo subir el logo.', "Couldn't upload the logo."));
    }
    setLogoBusy(false);
  };

  const removeLogo = async () => {
    if (!real || logoBusy) return;
    setLogoBusy(true);
    await admin.update({ logo_url: null });
    setLogoBusy(false);
    flash(L('Logo eliminado', 'Logo removed'));
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
    const room = maxPhotos - photos.length;
    if (room <= 0) {
      return flash(
        isFree
          ? L('El plan Gratis permite 1 foto. Mejora a Pro para subir más.', 'Free allows 1 photo. Upgrade to Pro to add more.')
          : L(`Máximo ${maxPhotos} fotos`, `Max ${maxPhotos} photos`),
      );
    }
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
      <input ref={logoInput} type="file" accept="image/*" onChange={onPickLogo} className="hidden" />

      {/* logo — the business identity image (cards + dashboard header) */}
      <div className="mb-4 flex items-center gap-3.5 rounded-card border border-hair bg-white p-4 shadow-card">
        {real.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={real.logo_url} alt={L('Logo del negocio', 'Business logo')} className="h-[68px] w-[68px] flex-none rounded-tile border border-hair object-cover" />
        ) : (
          <button
            onClick={() => logoInput.current?.click()}
            className="flex h-[68px] w-[68px] flex-none cursor-pointer items-center justify-center rounded-tile border-[1.5px] border-dashed border-lilac-line bg-lilac-3"
            aria-label={L('Subir logo', 'Upload logo')}
          >
            <ImagePlus size={20} strokeWidth={2} className="text-primary-dark" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-extrabold text-ink">{L('Logo del negocio', 'Business logo')}</div>
          <div className="mt-0.5 text-[11.5px] font-semibold leading-snug text-muted">
            {L('Se muestra en tu tarjeta y en tu panel. Se optimiza antes de subir.', 'Shown on your card and dashboard. Optimized before upload.')}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => logoInput.current?.click()}
              disabled={logoBusy}
              className="flex cursor-pointer items-center gap-1.5 rounded-btn bg-lilac-2 px-3 py-1.5 text-[11.5px] font-extrabold text-primary-dark disabled:opacity-50"
            >
              {logoBusy && <Loader2 size={12} className="animate-spin" />}
              {logoBusy ? L('Subiendo…', 'Uploading…') : real.logo_url ? L('Cambiar logo', 'Change logo') : L('Subir logo', 'Upload logo')}
            </button>
            {real.logo_url && (
              <button onClick={removeLogo} disabled={logoBusy} className="cursor-pointer rounded-btn px-3 py-1.5 text-[11.5px] font-extrabold text-pink-dark disabled:opacity-50">
                {L('Quitar', 'Remove')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-[12.5px] font-bold text-muted">
          {photos.length}/{maxPhotos} {L('fotos', 'photos')} · {L('se optimizan en tu teléfono antes de subir', 'optimized on your phone before upload')}
        </div>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading || photos.length >= maxPhotos}
          className="flex flex-none cursor-pointer items-center gap-2 rounded-btn bg-primary px-4 py-2 text-[12.5px] font-extrabold text-white shadow-cta-sm disabled:opacity-50"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} strokeWidth={2.4} />}
          {uploading ? L('Subiendo…', 'Uploading…') : L('Subir fotos', 'Upload photos')}
        </button>
      </div>

      {/* Free plan: 1 photo — nudge to Pro for the full gallery */}
      {isFree && (
        <button
          onClick={() => go('billing')}
          className="mb-4 flex w-full flex-wrap items-center gap-3 rounded-card-sm p-3.5 text-left text-white"
          style={{ background: 'linear-gradient(140deg,#1E1B2E,#3A2E6E)' }}
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-[rgba(244,183,64,.2)] text-[15px]">✦</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-extrabold">{L('Plan Gratis: 1 foto', 'Free plan: 1 photo')}</span>
            <span className="mt-0.5 block text-[11px] font-semibold leading-snug text-[rgba(255,255,255,.7)]">
              {L('Mejora a Pro para subir hasta 20 fotos y mostrar tu negocio completo.', 'Upgrade to Pro for up to 20 photos and show your whole business.')}
            </span>
          </span>
          <span className="flex-none rounded-btn bg-amber px-3.5 py-2 text-[11.5px] font-extrabold text-ink">{L('Mejorar a Pro', 'Upgrade to Pro')}</span>
        </button>
      )}

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
