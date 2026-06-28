import { Inicio } from "@/screens/Inicio";

/**
 * Home route. Renders the consumer app shell + Inicio tab.
 * Centered on the canvas so the 392px phone frame reads as the mobile source of
 * truth; desktop reflow per DESIGN_SYSTEM.md §6 comes with later screens.
 */
export default function Page() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-6 md:py-10">
      <Inicio />
    </main>
  );
}
