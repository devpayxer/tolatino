'use client';

// Poner, cambiar y quitar la propia foto de perfil.
//
// Vive aquí, y no dentro de una pantalla, porque hay DOS sitios que hacen
// exactamente lo mismo — el alta ("¿Cómo te llamamos?") y Mi cuenta → Mi perfil
// — y son justo las cosas que se desincronizan cuando se copian: una borra el
// archivo viejo y la otra no, una revierte al fallar y la otra deja la foto
// puesta mintiendo. El aspecto lo pone cada pantalla; el comportamiento es este.
//
// Lo que hace, en orden:
//   1. Vista previa inmediata con el archivo local (nadie espera a la red para
//      ver su propia cara).
//   2. Comprime ANTES de subir — `uploadAvatar`: recorte cuadrado, 400 px, WebP,
//      sin EXIF. Una foto de teléfono de 6 MB acaba en ~20 KB, y de paso no
//      subimos las coordenadas GPS que las fotos llevan dentro.
//   3. Guarda la URL en el perfil, y solo ENTONCES borra el archivo anterior.
//   4. Si algo falla, revierte a la foto que había. Nunca deja creer que se
//      guardó algo que no se guardó.

import { useCallback, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { deleteStoredImage, uploadAvatar } from '@/lib/image';
import { setCachedAvatar } from '@/lib/avatars';
import { supabase } from '@/lib/supabase';

/** Más que cualquier foto de teléfono; por encima, algo va mal. */
const MAX_BYTES = 25 * 1024 * 1024;

export function useAvatarUpload() {
  const auth = useAuth();
  const { L } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /** La foto guardada. Fuente única: el perfil del contexto de auth. */
  const url = auth.profile?.avatar_url ?? null;
  /** Lo que se pinta: la vista previa local mientras sube, si no la guardada. */
  const shown = preview ?? url;

  /** Recién validado el código, la sesión tarda un instante en llegar al
   *  contexto. Se reintenta una vez antes de rendirse. */
  const save = useCallback(async (value: string | null) => {
    const r = await auth.updateProfile({ avatar_url: value });
    if (r.error !== 'no-user') return r;
    await new Promise((res) => setTimeout(res, 600));
    return auth.updateProfile({ avatar_url: value });
  }, [auth]);

  const uid = useCallback(async (): Promise<string | null> => {
    if (auth.user?.id) return auth.user.id;
    try { return (await supabase?.auth.getUser())?.data.user?.id ?? null; } catch { return null; }
  }, [auth.user?.id]);

  const pick = useCallback(async (file: File | undefined | null) => {
    if (!file || busy) return;
    setError(null);
    if (!file.type.startsWith('image/')) return setError(L('Eso no es una imagen.', "That's not an image."));
    if (file.size > MAX_BYTES) return setError(L('Esa foto es demasiado grande.', 'That photo is too large.'));

    const local = URL.createObjectURL(file);
    const previous = url;
    setPreview(local);
    setBusy(true);
    try {
      const id = await uid();
      if (!id) throw new Error('no-user');
      const next = await uploadAvatar(file, id);
      const r = await save(next);
      if (r.error) throw new Error(r.error);
      await deleteStoredImage(previous); // ya guardada la nueva: la vieja sobra
      setCachedAvatar(id, next);
      setPreview(null);
    } catch {
      setPreview(null);
      setError(L('No se pudo subir la foto. Inténtalo otra vez.', "Couldn't upload the photo. Try again."));
    } finally {
      URL.revokeObjectURL(local);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ''; // permite reelegir el mismo archivo
    }
  }, [busy, url, uid, save, L]);

  const remove = useCallback(async () => {
    if (busy || !url) return;
    setError(null);
    setBusy(true);
    const previous = url;
    const r = await save(null);
    if (r.error) {
      await save(previous); // revierte: la foto sigue ahí
      setError(L('No se pudo quitar la foto.', "Couldn't remove the photo."));
    } else {
      await deleteStoredImage(previous);
      const id = await uid();
      if (id) setCachedAvatar(id, null);
    }
    setBusy(false);
  }, [busy, url, save, uid, L]);

  /** Abre el selector del sistema (la cámara, en el teléfono). */
  const open = useCallback(() => inputRef.current?.click(), []);

  return { url, shown, preview, busy, error, inputRef, pick, remove, open };
}
