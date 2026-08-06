import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Página no encontrada', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="text-[64px] font-extrabold leading-none text-primary">404</div>
      <h1 className="mt-3 text-[20px] font-extrabold text-ink">Esta página no existe</h1>
      <p className="mt-1.5 max-w-[320px] text-[13.5px] font-semibold text-muted">
        Puede que el enlace esté roto o que la página se haya movido.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-btn bg-primary px-5 py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
