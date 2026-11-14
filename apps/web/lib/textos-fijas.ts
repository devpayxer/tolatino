/* 9f · Las líneas fijas de §1c (fase9-apertura.md), tal cual. NO se editan desde el Super Admin (Textos y páginas › Cadenas las muestra con candado):
   solo cambian con el código, en un commit. Las usa quien las necesita (hoy «Descargar mis datos»); las demás esperan a su pantalla
   (la landing, la página de mantenimiento, la doble verificación del equipo) y ya están protegidas. */
export const FIJAS = {
  es: {
    landing: "Alguien cerca de ti hace justo lo que buscas. Encontrarlo es lo difícil.",
    landingTel: "Te avisamos por mensaje de texto cuando abra tu zona. Nada más.",
    exportar: "Te armamos un archivo con lo tuyo: perfil, pedidos, citas, reseñas, publicaciones y mensajes. Tarda unos minutos y lo bajas aquí durante 24 horas.",
    borrar: "Si borras tu cuenta tienes 30 días para arrepentirte; después se borra todo. Los cobros quedan en Stripe como pide la ley.",
    mantenimiento: "Estamos haciendo un cambio. Volvemos en unos minutos.",
    equipoDosPasos: "Tu cuenta del equipo necesita tu llave de acceso o tu app de códigos. El SMS solo no alcanza.",
  },
  en: {
    landing: "Someone near you does exactly what you need. Finding them is the hard part.",
    landingTel: "We will text you when your area opens. Nothing else.",
    exportar: "We put together a file with your data: profile, orders, appointments, reviews, posts and messages. It takes a few minutes and you can download it here for 24 hours.",
    borrar: "If you delete your account you have 30 days to change your mind; after that everything is deleted. Charges stay in Stripe as the law requires.",
    mantenimiento: "We are making a change. Back in a few minutes.",
    equipoDosPasos: "Your team account needs your passkey or your code app. SMS alone is not enough.",
  },
} as const;
