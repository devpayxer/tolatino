'use client';

// "Muy pronto" placeholder (Handoff v2): icon, badge, title, description and
// a working "¡Avísame!" waitlist form with success state.

import { useState } from 'react';
import { IconBriefcase as Briefcase, IconCar as Car, IconCheck as Check, IconHome as Home, IconTruck as Truck } from '@tabler/icons-react';
import { useLang } from '@/lib/i18n';
import { useApp } from '@/lib/state';
import { SOON } from '@/data/fixtures';

const ICONS = { truck: Truck, home: Home, car: Car, briefcase: Briefcase };

export function ComingSoonScreen({ view }: { view: keyof typeof SOON }) {
  const { L } = useLang();
  const app = useApp();
  const [email, setEmail] = useState('');
  const info = SOON[view];
  const Icon = ICONS[info.icon];
  const done = !!app.waitDone[view];

  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center px-2 py-5 text-center md:min-h-[540px] md:p-[30px]">
      <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[24px]" style={{ background: info.bg }}>
        <Icon size={34} strokeWidth={2} style={{ color: info.color }} />
      </span>
      <span className="mt-5 rounded-full bg-amber-bg px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.05em] text-amber-ink">
        {L('Muy pronto', 'Coming soon')}
      </span>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-[-.02em] text-ink text-balance md:text-[34px]">
        {L(info.titleEs, info.titleEn)}
      </h1>
      <p className="mt-2.5 max-w-[440px] text-[13.5px] font-medium leading-[1.55] text-ink-3 text-pretty md:text-[14.5px]">
        {L(info.subEs, info.subEn)}
      </p>

      {done ? (
        <div className="mt-6 flex items-center gap-2.5 rounded-btn-lg bg-green-bg px-5 py-3.5 text-[13.5px] font-extrabold text-green-dark">
          <Check size={17} stroke={3} />
          {L('¡Listo! Te avisamos cuando abra.', "Done! We'll let you know when it opens.")}
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              app.markWaitDone(view);
            }}
            className="mt-6 flex w-full max-w-[400px] gap-2"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={L('Tu correo electrónico', 'Your email')}
              className="min-w-0 flex-1 rounded-btn-lg border-[1.5px] border-[#ECE9F6] bg-white px-4 py-3 text-[13.5px] font-medium text-ink outline-none placeholder:text-muted focus:border-primary"
            />
            <button type="submit" className="flex-none cursor-pointer rounded-btn-lg bg-primary px-5 py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm">
              {L('¡Avísame!', 'Notify me')}
            </button>
          </form>
          <div className="mt-3 text-[11.5px] font-semibold text-muted-2">
            {L('Sé de los primeros en tu ciudad. Sin spam.', 'Be among the first in your city. No spam.')}
          </div>
        </>
      )}
    </div>
  );
}
