"use client";
/* 9m / 9t-2 · Buscar con la voz (L95), UNA sola lógica para la página de Buscar y el desplegable del encabezado en escritorio:
   - la primera vez, el aviso (el reconocimiento es el del teléfono o del navegador: Apple o Google lo procesan, no To'Latino);
   - con cuenta, la respuesta se guarda en Mi cuenta › Ajustes › Privacidad (users.voice_search, vozGuardar); sin cuenta, en este navegador;
   - apagado en Privacidad (false), no hay micrófono;
   - lo que se oye se busca como si se hubiera escrito (onTexto). */
import { useRef, useState } from "react";
import { vozGuardar } from "./acciones";

export type EstadoVoz = "no" | "escuchando" | "sin" | "aviso";
type SR = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onerror: () => void; onend: () => void };

export function useVoz(o: { lang: "es" | "en"; conSesion: boolean; inicial: boolean | null | undefined; onTexto: (x: string) => void }) {
  const [voz, setVoz] = useState<EstadoVoz>("no");
  // Lo que dijo en este rato (Activar) gana a lo que llegó del servidor (que en el desplegable llega después de abrir).
  const [acepto, setAcepto] = useState(false);
  const vozOk: boolean | null = acepto ? true : o.inicial ?? null;
  const recRef = useRef<{ stop: () => void } | null>(null);
  const onTexto = useRef(o.onTexto);
  onTexto.current = o.onTexto;
  const escuchar = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) { setVoz("sin"); return; }
    const r = new C();
    r.lang = o.lang === "es" ? "es-US" : "en-US";
    r.interimResults = false;
    r.onresult = (e) => { const x = e.results[0]?.[0]?.transcript ?? ""; setVoz("no"); if (x) onTexto.current(x); };
    r.onerror = () => setVoz("no");
    r.onend = () => setVoz((s) => (s === "escuchando" ? "no" : s));
    recRef.current = r;
    setVoz("escuchando");
    r.start();
  };
  const hablar = () => {
    let ok = vozOk;
    if (!o.conSesion && ok == null) { try { const x = localStorage.getItem("tl-voz-v1"); ok = x === "1" ? true : null; } catch { /* sin almacenamiento: se pregunta */ } }
    if (!ok) { setVoz("aviso"); return; }
    escuchar();
  };
  const aceptar = () => {
    setAcepto(true);
    if (o.conSesion) void vozGuardar(true).catch(() => undefined); else { try { localStorage.setItem("tl-voz-v1", "1"); } catch { /* se vuelve a preguntar */ } }
    escuchar();
  };
  const cancelar = () => { recRef.current?.stop(); setVoz("no"); };
  return { voz, mic: vozOk !== false, hablar, aceptar, cancelar };
}
