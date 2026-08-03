'use client';

// Per-post "…" menu. Author sees Edit + Delete; everyone else sees Report.
// Only renders for real (persisted) posts with a backend — fixture/local posts
// have no uuid to act on. Edit/delete are enforced again by RLS in Postgres.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBan as Ban, IconFlag as Flag, IconDots as MoreHorizontal, IconPencil as Pencil, IconTrash as Trash2 } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { useLiveData } from '@/lib/live';
import { supabase } from '@/lib/supabase';
import { Overlay, PrimaryBtn } from '@/components/ui';
import { createReport } from '@/lib/admin';
import type { Post } from '@/data/fixtures';

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);

const REPORT_REASONS: [string, string][] = [
  ['Spam o engañoso', 'Spam or misleading'],
  ['Contenido inapropiado', 'Inappropriate content'],
  ['Acoso o discurso de odio', 'Harassment or hate speech'],
  ['Información falsa', 'False information'],
  ['Otro', 'Other'],
];

export function PostMenu({ post }: { post: Post }) {
  const { L } = useLang();
  const auth = useAuth();
  const live = useLiveData();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<null | 'edit' | 'delete' | 'report' | 'block'>(null);
  const [text, setText] = useState(post.es);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Only real posts (uuid) with a configured backend get a menu.
  if (!supabase || !isUuid(post.id)) return null;
  const sb = supabase;

  const isOwner = !!(auth.user && post.authorId && auth.user.id === post.authorId);

  const closeAll = () => {
    setOpen(false);
    setAction(null);
    setErr(null);
    setReason(null);
    setReported(false);
    setBusy(false);
  };

  const saveEdit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.from('posts').update({ body_es: body, body_en: body }).eq('id', post.id);
    setBusy(false);
    if (error) return setErr(L('No se pudo guardar. Intenta de nuevo.', "Couldn't save. Try again."));
    live.refresh();
    closeAll();
  };

  const doDelete = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.from('posts').delete().eq('id', post.id);
    setBusy(false);
    if (error) return setErr(L('No se pudo eliminar. Intenta de nuevo.', "Couldn't delete. Try again."));
    live.refresh();
    closeAll();
  };

  // Bloquear: silencioso y de una sola dirección — el otro no se entera. Va a la
  // tabla `user_blocks`, y a partir de ahí la propia política de RLS le quita de
  // TODOS los caminos de lectura (inicio, guardados, siguiendo, búsqueda,
  // comentarios), no solo del feed que estamos mirando.
  const doBlock = async () => {
    if (busy || !auth.user || !post.authorId) return;
    setBusy(true);
    setErr(null);
    const { error } = await sb.from('user_blocks').insert({ blocker_id: auth.user.id, blocked_id: post.authorId });
    setBusy(false);
    if (error) return setErr(L('No se pudo bloquear. Intenta de nuevo.', "Couldn't block. Try again."));
    live.refresh();
    closeAll();
  };

  const openReport = () => {
    if (!auth.user) {
      closeAll();
      router.push('/entrar');
      return;
    }
    setOpen(false);
    setAction('report');
  };

  const sendReport = async () => {
    if (!reason || busy || !auth.user) return;
    setBusy(true);
    setErr(null);
    // Cola UNIFICADA (`reports`, 0120/0122) — la misma que el admin modera en
    // /admin → Moderación. La tabla vieja `post_reports` ya no se escribe.
    const error = await createReport('post', post.id, reason);
    setBusy(false);
    if (error) return setErr(L('No se pudo enviar el reporte.', "Couldn't send the report."));
    setReported(true);
  };

  const itemCls = 'flex w-full cursor-pointer items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-bold';

  return (
    <div className="relative -mr-1 -mt-1 flex-none">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={L('Opciones', 'Options')}
        // El circulito se sigue viendo de 32px; el dedo aterriza en 44.
        className="tap flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-lilac-2"
      >
        <MoreHorizontal size={18} stroke={2.4} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-2xl border border-hair bg-white p-1 shadow-pop">
            {isOwner ? (
              <>
                <button
                  onClick={() => {
                    setText(post.es);
                    setOpen(false);
                    setAction('edit');
                  }}
                  className={`${itemCls} text-ink hover:bg-app`}
                >
                  <Pencil size={15} stroke={2.2} /> {L('Editar', 'Edit')}
                </button>
                <button onClick={() => { setOpen(false); setAction('delete'); }} className={`${itemCls} text-pink hover:bg-pink-bg`}>
                  <Trash2 size={15} stroke={2.2} /> {L('Eliminar', 'Delete')}
                </button>
              </>
            ) : (
              <>
                <button onClick={openReport} className={`${itemCls} text-ink hover:bg-app`}>
                  <Flag size={15} stroke={2.2} /> {L('Reportar', 'Report')}
                </button>
                {auth.user && post.authorId && (
                  <button onClick={() => { setOpen(false); setAction('block'); }} className={`${itemCls} text-ink hover:bg-app`}>
                    <Ban size={15} stroke={2.2} /> {L('Bloquear a', 'Block')} {post.name}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Edit */}
      <Overlay open={action === 'edit'} onClose={closeAll} width={460}>
        <div className="text-[16px] font-extrabold text-ink">{L('Editar publicación', 'Edit post')}</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="mt-3 w-full resize-none rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13.5px] font-medium text-ink outline-none focus:border-primary"
        />
        {err && <div className="mt-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
        <PrimaryBtn className="mt-4" disabled={busy || !text.trim()} onClick={saveEdit}>
          {busy ? L('Guardando…', 'Saving…') : L('Guardar cambios', 'Save changes')}
        </PrimaryBtn>
      </Overlay>

      {/* Delete confirm */}
      <Overlay open={action === 'delete'} onClose={closeAll} width={400}>
        <div className="text-[16px] font-extrabold text-ink">{L('¿Eliminar publicación?', 'Delete post?')}</div>
        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-muted">
          {L('Esta acción no se puede deshacer. También se borrarán sus comentarios.', "This can't be undone. Its comments will be removed too.")}
        </p>
        {err && <div className="mt-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={closeAll} className="flex-1 cursor-pointer rounded-btn bg-lilac-2 py-3 text-[13px] font-extrabold text-ink-2">
            {L('Cancelar', 'Cancel')}
          </button>
          <button onClick={doDelete} disabled={busy} className="flex-1 cursor-pointer rounded-btn bg-pink py-3 text-[13px] font-extrabold text-white disabled:opacity-60">
            {busy ? L('Eliminando…', 'Deleting…') : L('Eliminar', 'Delete')}
          </button>
        </div>
      </Overlay>

      {/* Bloquear */}
      <Overlay open={action === 'block'} onClose={closeAll} width={400}>
        <div className="text-[16px] font-extrabold text-ink">{L('¿Bloquear a', 'Block')} {post.name}?</div>
        <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-muted">
          {L('Dejarás de ver sus publicaciones y comentarios en toda la app. No se le avisa. Puedes deshacerlo desde Mi cuenta.',
             "You'll stop seeing their posts and comments everywhere. They are not notified. You can undo this from My account.")}
        </p>
        {err && <div className="mt-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
        <div className="mt-4 flex gap-2">
          <button onClick={closeAll} className="flex-1 cursor-pointer rounded-btn bg-lilac-2 py-3 text-[13px] font-extrabold text-ink-2">
            {L('Cancelar', 'Cancel')}
          </button>
          <button onClick={doBlock} disabled={busy} className="flex-1 cursor-pointer rounded-btn bg-ink py-3 text-[13px] font-extrabold text-white disabled:opacity-60">
            {busy ? L('Bloqueando…', 'Blocking…') : L('Bloquear', 'Block')}
          </button>
        </div>
      </Overlay>

      {/* Report */}
      <Overlay open={action === 'report'} onClose={closeAll} width={420}>
        {reported ? (
          <div className="py-4 text-center">
            <div className="text-[16px] font-extrabold text-ink">{L('¡Gracias!', 'Thanks!')}</div>
            <p className="mt-1.5 text-[13px] font-semibold text-muted">
              {L('Recibimos tu reporte y lo revisaremos.', 'We got your report and will review it.')}
            </p>
            <PrimaryBtn className="mt-4" onClick={closeAll}>
              {L('Listo', 'Done')}
            </PrimaryBtn>
          </div>
        ) : (
          <>
            <div className="text-[16px] font-extrabold text-ink">{L('Reportar publicación', 'Report post')}</div>
            <p className="mt-1 text-[12.5px] font-semibold text-muted">{L('¿Por qué reportas esto?', 'Why are you reporting this?')}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {REPORT_REASONS.map(([es, en]) => (
                <button
                  key={en}
                  onClick={() => setReason(es)}
                  className={`cursor-pointer rounded-field border-[1.5px] px-3.5 py-2.5 text-left text-[13px] font-bold ${
                    reason === es ? 'border-primary bg-[#FAF9FE] text-ink' : 'border-hair text-ink-soft'
                  }`}
                >
                  {L(es, en)}
                </button>
              ))}
            </div>
            {err && <div className="mt-2 text-[12px] font-semibold text-pink-dark">{err}</div>}
            <PrimaryBtn className="mt-4" disabled={!reason || busy} onClick={sendReport}>
              {busy ? L('Enviando…', 'Sending…') : L('Enviar reporte', 'Send report')}
            </PrimaryBtn>
          </>
        )}
      </Overlay>
    </div>
  );
}
