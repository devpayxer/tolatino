import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DominoMesaScreen } from '@/screens/DominoMesa';

export const metadata: Metadata = {
  title: 'Mesa de dominó',
  description: 'Partida de dominó con un vecino de tu ciudad.',
};

export default function Page() {
  // `useSearchParams` obliga a un límite de Suspense en el export estático.
  return (
    <Suspense fallback={null}>
      <DominoMesaScreen />
    </Suspense>
  );
}
