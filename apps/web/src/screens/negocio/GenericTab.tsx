'use client';

// Uniform module-page renderer for the business panel (banner, KPIs, tabs,
// compose, form, row list + summary side card) — the prototype's generic
// layout, shared by every module tab.

import { Avatar } from '@/components/ui';
import type { G, PanelCtx } from '@/screens/negocio/tabs';

export function GenericTab({ g, ctx }: { g: G; ctx: PanelCtx }) {
  const { L } = ctx;
  return (
    <div>
      {g.banner && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#6743E2,#8268FF)' }}>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[rgba(255,255,255,.18)]">
            <g.banner.Icon size={16} strokeWidth={2.2} className="text-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-extrabold">{g.banner.title}</span>
            <span className="block text-[11.5px] font-semibold text-[rgba(255,255,255,.8)]">{g.banner.sub}</span>
          </span>
          {g.banner.btn && (
            <button onClick={() => g.banner?.onBtn && ctx.go(g.banner.onBtn)} className="flex-none cursor-pointer rounded-[10px] bg-white px-3.5 py-2 text-[12px] font-extrabold text-primary-press">
              {g.banner.btn}
            </button>
          )}
        </div>
      )}

      {g.kpis && (
        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {g.kpis.map((k) => (
            <div key={k.label} className="rounded-card-sm border border-hair bg-white p-3.5 shadow-card">
              <span className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: k.bg }}>
                <k.Icon size={15} strokeWidth={2.2} style={{ color: k.c }} />
              </span>
              <div className="mt-2 text-[11px] font-bold text-muted">{k.label}</div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[19px] font-extrabold text-ink">{k.value}</span>
                <span className="text-[10.5px] font-extrabold" style={{ color: k.dC ?? '#1F8A4C' }}>{k.delta}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {g.tabs && (
        <div className="mb-4 inline-flex gap-1 rounded-[10px] bg-lilac-2 p-1">
          {g.tabs.map((t, i) => (
            <button key={t} className={`cursor-pointer rounded-[7px] px-3 py-1.5 text-[10.5px] font-extrabold ${i === 0 ? 'bg-white text-primary-dark shadow-sm' : 'text-muted-2'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {g.compose && (
        <div className="mb-4 rounded-card-sm border border-hair bg-white p-3.5 shadow-card">
          <input placeholder={g.compose} className="w-full rounded-field bg-app px-3.5 py-3 text-[13px] font-medium outline-none placeholder:text-muted" />
        </div>
      )}

      <div className={`grid items-start gap-4 ${g.side?.length ? 'lg:grid-cols-[1.6fr_1fr]' : ''}`}>
        <div className="rounded-card-sm border border-hair bg-white p-4 shadow-card md:p-5">
          <div className="mb-3 text-[14.5px] font-extrabold text-ink">{g.mainTitle}</div>

          {g.form && (
            <div className="flex flex-col gap-3.5">
              {g.form.map((f) => (
                <label key={f.label} className="block">
                  <span className="mb-1.5 block text-[11.5px] font-extrabold text-ink">{f.label}</span>
                  {f.area ? (
                    <textarea defaultValue={f.value} rows={3} className="w-full resize-none rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13px] font-medium text-ink outline-none focus:border-primary" />
                  ) : (
                    <input defaultValue={f.value} className="w-full rounded-field border-[1.5px] border-[#ECE9F6] bg-app px-3.5 py-3 text-[13px] font-medium text-ink outline-none focus:border-primary" />
                  )}
                </label>
              ))}
            </div>
          )}

          {g.rows && (
            <div className="flex flex-col">
              {g.rows.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 py-3 ${i < g.rows!.length - 1 ? 'border-b border-hair' : ''}`}>
                  {r.thumb && <span className="h-11 w-11 flex-none rounded-[10px]" style={{ background: `repeating-linear-gradient(135deg,${r.thumb})` }} />}
                  {r.avatar && <Avatar initials={r.avatar[0]} color={r.avatar[1]} size={38} />}
                  {r.Icon && (
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ background: r.iconBg }}>
                      <r.Icon size={16} strokeWidth={2.2} style={{ color: r.iconC }} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {r.title && <span className="truncate text-[13.5px] font-extrabold text-ink">{r.title}</span>}
                      {r.pill && (
                        <span className="flex-none rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[.03em]" style={{ background: r.pill[1], color: r.pill[2] }}>
                          {r.pill[0]}
                        </span>
                      )}
                    </span>
                    {r.sub && <span className="mt-0.5 block truncate text-[11.5px] font-semibold text-muted">{r.sub}</span>}
                    {r.body && <span className="mt-1 block text-[12.5px] font-medium leading-snug text-ink-soft">{r.body}</span>}
                  </span>
                  {r.right && <span className="flex-none text-[13px] font-extrabold text-ink">{r.right}</span>}
                  {r.action && (
                    <button className="flex-none cursor-pointer rounded-[9px] bg-lilac-2 px-3 py-1.5 text-[11px] font-extrabold text-primary-dark">{r.action}</button>
                  )}
                  {r.toggle !== undefined && (
                    <span className={`relative h-[24px] w-[42px] flex-none rounded-full ${r.toggle ? 'bg-primary' : 'bg-[#D8D2E6]'}`}>
                      <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${r.toggle ? 'left-[21px]' : 'left-[3px]'}`} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {g.side && g.side.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="rounded-card-sm border border-hair bg-white p-4 shadow-card">
              <div className="mb-2 text-[13px] font-extrabold text-ink">{g.sideTitle}</div>
              {g.side.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 py-2.5 ${i < g.side!.length - 1 ? 'border-b border-hair' : ''}`}>
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]" style={{ background: s.bg }}>
                    <s.Icon size={15} strokeWidth={2.2} style={{ color: s.c }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-extrabold text-ink">{s.title}</span>
                    {s.sub && <span className="block text-[11px] font-semibold text-muted">{s.sub}</span>}
                  </span>
                  {s.right && <span className="flex-none text-[12.5px] font-extrabold text-muted">{s.right}</span>}
                </div>
              ))}
            </div>
            {g.sideNote && (
              <div className="rounded-card-sm p-4 text-white shadow-band" style={{ background: 'linear-gradient(140deg,#6743E2,#8268FF)' }}>
                <div className="text-[13.5px] font-extrabold">{g.sideNote.title}</div>
                <div className="mt-1 text-[11.5px] font-semibold leading-snug text-[rgba(255,255,255,.85)]">{g.sideNote.sub}</div>
                <button onClick={() => ctx.go('billing')} className="mt-2.5 cursor-pointer rounded-[10px] bg-white px-3.5 py-2 text-[11.5px] font-extrabold text-primary-press">
                  {g.sideNote.btn}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="h-6" aria-hidden>{L('', '')}</div>
    </div>
  );
}
