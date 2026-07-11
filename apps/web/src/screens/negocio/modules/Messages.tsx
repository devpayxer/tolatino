'use client';

// Clientes → Mensajes. Real customer messaging for the active business:
// conversations (business_conversations) + threads (business_messages), both
// owner-private (migration 0029). Mobile-first: a conversation list that opens a
// full thread; on desktop it's a two-pane inbox. Demo (not signed in) shows a
// sample inbox with local-only replies.

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconChevronLeft as ChevronLeft, IconLoader2 as Loader2, IconMessageCircle as MessageCircle, IconSend as Send, IconBuildingStore as Store } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBizAdmin } from '@/lib/bizAdmin';
import { subscribeInbox, sendChatMessage } from '@/lib/chat';
import type { PanelCtx } from '@/screens/negocio/tabs';

type Convo = { id: string; name: string; initials: string; color: string; last: string; unread: number; lastAt: string };
type Msg = { id: string; fromOwner: boolean; body: string; at: string };

// Demo inbox (not signed in) — mirrors the old fixture, now interactive.
const DEMO_CONVOS: Convo[] = [
  { id: 'd1', name: 'Sofía R.', initials: 'SR', color: '#7B61FF', last: '¿Hacen catering para 50?', unread: 2, lastAt: '2024-01-01T10:00:00Z' },
  { id: 'd2', name: 'Juan M.', initials: 'JM', color: '#1F9D57', last: '¿Tienen opción vegana?', unread: 0, lastAt: '2024-01-01T09:00:00Z' },
  { id: 'd3', name: 'Ana L.', initials: 'AL', color: '#E8954A', last: 'Gracias por el pedido 🙏', unread: 0, lastAt: '2024-01-01T08:00:00Z' },
];
const DEMO_MSGS: Record<string, Msg[]> = {
  d1: [
    { id: 'm1', fromOwner: false, body: 'Hola, ¿hacen catering para 50 personas?', at: '2024-01-01T09:58:00Z' },
    { id: 'm2', fromOwner: true, body: '¡Claro! Tenemos paquetes desde $12 por persona. ¿Para qué fecha?', at: '2024-01-01T09:59:00Z' },
    { id: 'm3', fromOwner: false, body: 'Para el sábado 27. ¿Incluye montaje?', at: '2024-01-01T10:00:00Z' },
  ],
  d2: [{ id: 'm4', fromOwner: false, body: '¿Tienen opción vegana?', at: '2024-01-01T09:00:00Z' }],
  d3: [{ id: 'm5', fromOwner: false, body: 'Gracias por el pedido 🙏', at: '2024-01-01T08:00:00Z' }],
};

export function MessagesModule({ ctx }: { ctx: PanelCtx }) {
  const { L } = ctx;
  const admin = useBizAdmin();
  const router = useRouter();
  const real = admin.active;
  const persistable = !admin.demo && !!real;

  const [convos, setConvos] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  // load conversations
  const reloadConvos = useCallback(async () => {
    if (!persistable || !real || !supabase) { setConvos(admin.demo ? DEMO_CONVOS : []); return; }
    const { data } = await supabase
      .from('business_conversations')
      .select('id,customer_name,customer_initials,customer_color,last_at,unread')
      .eq('business_id', real.id)
      .order('last_at', { ascending: false });
    setConvos(((data as Record<string, unknown>[]) ?? []).map((r) => ({
      id: String(r.id), name: String(r.customer_name), initials: String(r.customer_initials ?? ''),
      color: String(r.customer_color ?? '#7B61FF'), last: '', unread: Number(r.unread ?? 0), lastAt: String(r.last_at),
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, persistable, admin.demo]);

  useEffect(() => {
    setLoading(true);
    reloadConvos().finally(() => setLoading(false));
  }, [reloadConvos]);

  // realtime: new customer messages arrive live → update the open thread + list
  useEffect(() => {
    if (!persistable || !real) return;
    return subscribeInbox(({ conversationId, id, fromOwner, body, at }) => {
      if (conversationId === activeId) {
        setMsgs((m) => (m.some((x) => x.id === id) ? m : [...m, { id, fromOwner, body, at }]));
        if (!fromOwner && supabase) supabase.from('business_conversations').update({ unread: 0 }).eq('id', conversationId);
      }
      reloadConvos();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.id, activeId, persistable]);

  // load the active thread
  const loadThread = useCallback(
    async (id: string) => {
      if (!persistable || !supabase) {
        setMsgs(DEMO_MSGS[id] ?? []);
        return;
      }
      const { data } = await supabase
        .from('business_messages')
        .select('id,from_owner,body,created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      setMsgs(((data as Record<string, unknown>[]) ?? []).map((r) => ({ id: String(r.id), fromOwner: !!r.from_owner, body: String(r.body), at: String(r.created_at) })));
    },
    [persistable],
  );

  const openConvo = (id: string) => {
    setActiveId(id);
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    loadThread(id);
    if (persistable && supabase) supabase.from('business_conversations').update({ unread: 0 }).eq('id', id);
  };

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'end' });
  }, [msgs]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    const tempId = `local-${msgs.length}`;
    setMsgs((m) => [...m, { id: tempId, fromOwner: true, body, at: new Date().toISOString() }]);
    setDraft('');
    setConvos((cs) => cs.map((c) => (c.id === activeId ? { ...c, last: body } : c)));
    if (persistable && supabase) {
      const row = await sendChatMessage(activeId, true, body); // trigger bumps last_at
      if (row) setMsgs((m) => { const swapped = m.map((x) => (x.id === tempId ? row : x)); return swapped.filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i); });
    }
    setSending(false);
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
          <Store size={24} className="text-primary" stroke={2.2} />
        </span>
        <h3 className="mt-4 text-[17px] font-extrabold text-ink">{L('Conecta tu negocio', 'Connect your business')}</h3>
        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] font-semibold leading-relaxed text-muted">
          {L('Publica tu negocio para chatear con tus clientes aquí.', 'Publish your business to chat with your customers here.')}
        </p>
        <button onClick={() => router.push('/negocio/publicar')} className="mt-5 cursor-pointer rounded-btn bg-primary px-5 py-2.5 text-[13px] font-extrabold text-white shadow-cta-sm">
          {L('Publicar negocio', 'Publish business')}
        </button>
      </div>
    );
  }

  const active = convos.find((c) => c.id === activeId) ?? null;

  const list = (
    <div className="flex flex-col overflow-hidden rounded-card border border-hair bg-white shadow-card">
      {convos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-muted">
          <MessageCircle size={26} stroke={2} className="text-muted-faint" />
          <span className="text-[13px] font-extrabold text-ink">{L('Sin mensajes todavía', 'No messages yet')}</span>
          <span className="text-[11.5px] font-semibold">{L('Tus clientes te escribirán desde tu listado.', 'Customers will message you from your listing.')}</span>
        </div>
      ) : (
        convos.map((c) => (
          <button
            key={c.id}
            onClick={() => openConvo(c.id)}
            className={`flex items-center gap-3 border-b border-hair px-3.5 py-3 text-left last:border-0 ${c.id === activeId ? 'bg-lilac-3' : 'cursor-pointer hover:bg-app'}`}
          >
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[13px] font-extrabold text-white" style={{ background: c.color }}>
              {c.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-extrabold text-ink">{c.name}</span>
              <span className="block truncate text-[12px] font-semibold text-muted">{c.last || L('Toca para ver la conversación', 'Tap to open the thread')}</span>
            </span>
            {c.unread > 0 && (
              <span className="flex h-5 min-w-[20px] flex-none items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-extrabold text-white">{c.unread}</span>
            )}
          </button>
        ))
      )}
    </div>
  );

  const thread = active && (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-card border border-hair bg-white shadow-card lg:h-[calc(100vh-220px)]">
      <div className="flex flex-none items-center gap-2.5 border-b border-hair px-3.5 py-2.5">
        <button onClick={() => setActiveId(null)} className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-lilac-2 text-ink lg:hidden" aria-label={L('Volver', 'Back')}>
          <ChevronLeft size={17} stroke={2.4} />
        </button>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: active.color }}>
          {active.initials}
        </span>
        <span className="truncate text-[13.5px] font-extrabold text-ink">{active.name}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-app px-3.5 py-3">
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.fromOwner ? 'justify-end' : 'justify-start'}`}>
            <span className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] font-medium ${m.fromOwner ? 'bg-primary text-white' : 'bg-white text-ink shadow-card'}`}>
              {m.body}
            </span>
          </div>
        ))}
        <div ref={threadEnd} />
      </div>
      <div className="flex flex-none items-center gap-2 border-t border-hair px-3 py-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={L('Escribe un mensaje…', 'Type a message…')}
          className="min-w-0 flex-1 rounded-field border-[1.5px] border-lilac-line bg-app px-3.5 py-2.5 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary"
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          aria-label={L('Enviar', 'Send')}
          className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-cta-sm disabled:opacity-50"
        >
          <Send size={16} stroke={2.4} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* mobile: show thread OR list; desktop: both */}
      <div className={active ? 'hidden lg:block' : 'block'}>{list}</div>
      <div className={active ? 'block' : 'hidden lg:block'}>
        {active ? (
          thread
        ) : (
          <div className="hidden h-full items-center justify-center rounded-card border border-hair bg-white text-[12.5px] font-semibold text-muted shadow-card lg:flex">
            {L('Elige una conversación', 'Pick a conversation')}
          </div>
        )}
      </div>
    </div>
  );
}
