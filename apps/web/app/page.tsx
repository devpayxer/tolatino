import { ConsumerApp } from "@/ConsumerApp";

/**
 * Home route. Renders the consumer app shell (Inicio / Pedidos / Reservas /
 * Boletos / Perfil) inside the 392px phone frame, centered on the canvas.
 * Desktop reflow per DESIGN_SYSTEM.md §6 comes with later screens.
 */
export default function Page() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-6 md:py-10">
      <ConsumerApp />
    </main>
  );
}
