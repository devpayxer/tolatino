"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Salir() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  return (
    <div className="flex">
      <button
        type="button"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true);
          await fetch("/api/cuenta/salir", { method: "POST" });
          router.replace("/entrar");
        }}
        className="flex h-12 flex-1 items-center justify-center rounded-button border-[1.5px] border-line-strong bg-white text-[14.5px] font-bold text-ink disabled:opacity-50"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
