package com.tolatino.cascara;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

/* La red del teléfono, contada a la WebView (guardián senalHonesta). En Android, navigator.onLine y los eventos online/offline de la página
   NO salen solos del sistema: la WebView solo sigue la red por su cuenta si la app tiene ACCESS_NETWORK_STATE, y lo que manda es
   WebView.setNetworkAvailable(). Sin esto, en modo avión la página creía tener red (11 nov: la isla del Repartidor decía «Hay señal» y
   ofrecía «Abrir el Repartidor» en el emulador sin red).

   Aquí: la red por defecto del teléfono (registerDefaultNetworkCallback, en el hilo principal) → setNetworkAvailable. «Hay red» = la red por
   defecto dice INTERNET, no es un portal cautivo y la app no la tiene bloqueada (ahorro de datos, restricción de fondo). No se exige
   VALIDATED: una red que el sistema no pudo validar (el chequeo de Google bloqueado, una red de empresa) puede llegar a nuestro servidor; la
   web confirma «hay señal» con una prueba real a nuestro servidor (apps/web/lib/nativo/senal.ts). Lo que este archivo garantiza es que «sin
   red» sea verdad. Al llamar setNetworkAvailable la WebView apaga su propia detección (crbug 520088): desde aquí la red la cuenta solo esto.
   ACCESS_NETWORK_STATE es un permiso normal (sin aviso al usuario); sale de apps.json (androidComun) a los cuatro sabores. */
final class RedWebView {

    private final WebView web;
    private final ConnectivityManager cm;
    private ConnectivityManager.NetworkCallback escucha;
    private boolean util = false, bloqueada = false;

    RedWebView(Context ctx, WebView web) {
        this.web = web;
        this.cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
    }

    private static boolean sirve(NetworkCapabilities c) {
        return c != null
            && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            && !c.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL);
    }

    /* En onCreate (hilo principal): el estado de ahora y, después, cada cambio de la red por defecto. */
    void empezar() {
        if (cm == null) { Log.w("TLCascara", "sin ConnectivityManager: la WebView no sabe si hay red"); return; }
        try {
            Network n = cm.getActiveNetwork();
            util = n != null && sirve(cm.getNetworkCapabilities(n));
            informar();
            escucha = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onCapabilitiesChanged(Network red, NetworkCapabilities c) { util = sirve(c); informar(); }

                @Override
                public void onBlockedStatusChanged(Network red, boolean b) { bloqueada = b; informar(); }

                @Override
                public void onLost(Network red) { util = false; informar(); }
            };
            cm.registerDefaultNetworkCallback(escucha, new Handler(Looper.getMainLooper()));
        } catch (RuntimeException e) {
            // SecurityException si faltara ACCESS_NETWORK_STATE: la app sigue (la web prueba la señal contra el servidor de todos modos).
            escucha = null;
            Log.w("TLCascara", "no se pudo seguir la red: la WebView no sabe si hay red", e);
        }
    }

    /* En onDestroy. */
    void parar() {
        if (cm == null || escucha == null) return;
        try { cm.unregisterNetworkCallback(escucha); } catch (IllegalArgumentException e) { /* ya no estaba */ }
        escucha = null;
    }

    private void informar() {
        boolean hay = util && !bloqueada;
        web.setNetworkAvailable(hay);
        Log.i("TLCascara", "red para la WebView: " + (hay ? "sí" : "no"));
    }
}
