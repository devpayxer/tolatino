import type { ReactNode } from 'react';
import { BizAdminProvider } from '@/lib/bizAdmin';

// The business admin panel loads the signed-in owner's real business(es) and
// makes them editable. Everything under /negocio shares that context.
export default function NegocioLayout({ children }: { children: ReactNode }) {
  return <BizAdminProvider>{children}</BizAdminProvider>;
}
