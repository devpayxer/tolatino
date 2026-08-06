'use client';

// App-level error boundary — a render crash shows a branded Spanish recovery
// screen with a retry, instead of a blank white page.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-bg text-[28px]">⚠️</div>
      <h1 className="mt-4 text-[20px] font-extrabold text-ink">Algo salió mal</h1>
      <p className="mt-1.5 max-w-[320px] text-[13.5px] font-semibold text-muted">
        Tuvimos un problema al cargar esta pantalla. Intenta de nuevo.
      </p>
      <button
        onClick={reset}
        className="mt-6 cursor-pointer rounded-btn bg-primary px-5 py-3 text-[13.5px] font-extrabold text-white shadow-cta-sm"
      >
        Reintentar
      </button>
    </div>
  );
}
